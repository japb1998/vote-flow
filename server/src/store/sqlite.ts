import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { Session, Vote, Option, Selection, VotingMethod } from '../types';
import { SessionStore, UserInfo } from './interface';

export class SqliteSessionStore implements SessionStore {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'voteflow.db');
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    const fs = await import('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec('PRAGMA journal_mode = WAL');
    await this.db.exec('PRAGMA foreign_keys = ON');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        voting_method TEXT NOT NULL,
        options TEXT NOT NULL,
        creator_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        closed_at INTEGER,
        expires_at INTEGER NOT NULL,
        config TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        socket_id TEXT,
        PRIMARY KEY (id, session_id),
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        selection TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
        UNIQUE (session_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS ip_sessions (
        ip TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        last_created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_session_id ON users (session_id);
      CREATE INDEX IF NOT EXISTS idx_users_socket_id ON users (socket_id);
      CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes (session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions (status);
      CREATE INDEX IF NOT EXISTS idx_sessions_closed_at ON sessions (closed_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
    `);

    // Migration: add expires_at column to existing databases
    const columns = await this.db.all("PRAGMA table_info(sessions)");
    const hasExpiresAt = columns.some((col: { name: string }) => col.name === 'expires_at');
    if (!hasExpiresAt) {
      await this.db.exec(`ALTER TABLE sessions ADD COLUMN expires_at INTEGER`);
      await this.db.run(
        `UPDATE sessions SET expires_at = CASE
           WHEN closed_at IS NOT NULL THEN closed_at + 1800000
           ELSE created_at + 86400000
         END`
      );
      await this.db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at)`);
    }

    // Migration: add config column to existing databases
    if (!columns.some((col: { name: string }) => col.name === 'config')) {
      await this.db.exec('ALTER TABLE sessions ADD COLUMN config TEXT');
    }
  }

  private getDb(): Database {
    if (!this.db) throw new Error('Store not initialized. Call initialize() first.');
    return this.db;
  }

  async createSession(session: Session): Promise<void> {
    const db = this.getDb();
    await db.run(
      `INSERT INTO sessions (id, title, status, voting_method, options, creator_id, created_at, expires_at, config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.title, session.status, session.votingMethod,
       JSON.stringify(session.options), session.creatorId, session.createdAt,
       session.expiresAt, session.config ? JSON.stringify(session.config) : null]
    );
  }

  async getSession(id: string): Promise<Session | null> {
    const db = this.getDb();
    const row = await db.get('SELECT * FROM sessions WHERE id = ?', id);
    if (!row) return null;

    // Lazy TTL: treat expired sessions as non-existent
    if (row.expires_at && Date.now() > row.expires_at) {
      return null;
    }

    const votes = await this.getVotes(id);

    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      status: row.status as 'active' | 'closed',
      votingMethod: row.voting_method as VotingMethod,
      options: JSON.parse(row.options) as Option[],
      votes,
      creatorId: row.creator_id,
      closedAt: row.closed_at ?? undefined,
      expiresAt: row.expires_at,
      config: row.config ? JSON.parse(row.config) : undefined
    };
  }

  async updateSession(id: string, updates: Partial<Pick<Session, 'status' | 'closedAt' | 'expiresAt'>>): Promise<void> {
    const db = this.getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
    }
    if (updates.closedAt !== undefined) {
      sets.push('closed_at = ?');
      values.push(updates.closedAt);
    }
    if (updates.expiresAt !== undefined) {
      sets.push('expires_at = ?');
      values.push(updates.expiresAt);
    }

    if (sets.length === 0) return;
    values.push(id);
    await db.run(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`, values);
  }

  async deleteSession(id: string): Promise<void> {
    const db = this.getDb();
    // CASCADE handles users and votes
    await db.run('DELETE FROM sessions WHERE id = ?', id);
  }

  async getActiveSessionCount(): Promise<number> {
    const db = this.getDb();
    const row = await db.get(
      "SELECT COUNT(*) as count FROM sessions WHERE status = 'active' AND expires_at > ?",
      [Date.now()]
    );
    return row?.count ?? 0;
  }

  async addUser(sessionId: string, user: UserInfo): Promise<void> {
    const db = this.getDb();
    await db.run(
      'INSERT OR REPLACE INTO users (id, session_id, name, socket_id) VALUES (?, ?, ?, ?)',
      [user.id, sessionId, user.name, user.socketId]
    );
  }

  async getUser(sessionId: string, userId: string): Promise<UserInfo | null> {
    const db = this.getDb();
    const row = await db.get(
      'SELECT id, name, socket_id FROM users WHERE id = ? AND session_id = ?',
      [userId, sessionId]
    );
    if (!row) return null;
    return { id: row.id, name: row.name, socketId: row.socket_id };
  }

  async getUsers(sessionId: string): Promise<Map<string, UserInfo>> {
    const db = this.getDb();
    const rows = await db.all('SELECT id, name, socket_id FROM users WHERE session_id = ?', sessionId);
    const map = new Map<string, UserInfo>();
    for (const row of rows) {
      map.set(row.id, { id: row.id, name: row.name, socketId: row.socket_id });
    }
    return map;
  }

  async getUserCount(sessionId: string): Promise<number> {
    const db = this.getDb();
    const row = await db.get('SELECT COUNT(*) as count FROM users WHERE session_id = ?', sessionId);
    return row?.count ?? 0;
  }

  async updateUser(sessionId: string, userId: string, updates: Partial<UserInfo>): Promise<void> {
    const db = this.getDb();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name);
    }
    if (updates.socketId !== undefined) {
      sets.push('socket_id = ?');
      values.push(updates.socketId);
    }

    if (sets.length === 0) return;
    values.push(userId, sessionId);
    await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ? AND session_id = ?`, values);
  }

  async removeUserBySocketId(socketId: string): Promise<{ sessionId: string; userId: string }[]> {
    const db = this.getDb();
    const rows = await db.all(
      'SELECT id, session_id FROM users WHERE socket_id = ?',
      socketId
    );
    if (rows.length > 0) {
      await db.run('UPDATE users SET socket_id = NULL WHERE socket_id = ?', socketId);
    }
    return rows.map(r => ({ sessionId: r.session_id, userId: r.id }));
  }

  async findUserSessions(userId: string): Promise<string[]> {
    const db = this.getDb();
    const rows = await db.all('SELECT session_id FROM users WHERE id = ?', userId);
    return rows.map(r => r.session_id);
  }

  async upsertVote(sessionId: string, vote: Vote): Promise<void> {
    const db = this.getDb();
    await db.run(
      `INSERT INTO votes (id, session_id, user_id, user_name, selection, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (session_id, user_id) DO UPDATE SET
         id = excluded.id,
         selection = excluded.selection,
         timestamp = excluded.timestamp,
         user_name = excluded.user_name`,
      [vote.id, sessionId, vote.userId, vote.userName,
       JSON.stringify(vote.selection), vote.timestamp]
    );
  }

  async getVotes(sessionId: string): Promise<Vote[]> {
    const db = this.getDb();
    const rows = await db.all('SELECT * FROM votes WHERE session_id = ?', sessionId);
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      selection: JSON.parse(r.selection) as Selection,
      timestamp: r.timestamp
    }));
  }

  async getIpSessionCount(ip: string): Promise<number> {
    const db = this.getDb();
    const row = await db.get('SELECT count FROM ip_sessions WHERE ip = ?', ip);
    return row?.count ?? 0;
  }

  async incrementIpSessionCount(ip: string): Promise<void> {
    const db = this.getDb();
    await db.run(
      `INSERT INTO ip_sessions (ip, count, last_created_at) VALUES (?, 1, ?)
       ON CONFLICT (ip) DO UPDATE SET count = count + 1, last_created_at = ?`,
      [ip, Date.now(), Date.now()]
    );
  }

  async cleanupExpiredSessions(): Promise<number> {
    const db = this.getDb();
    const now = Date.now();
    // With foreign_keys ON and CASCADE, deleting sessions auto-deletes users and votes
    const result = await db.run(
      'DELETE FROM sessions WHERE expires_at < ?',
      [now]
    );

    // Clean up stale IP counters (older than 1 hour)
    await db.run('DELETE FROM ip_sessions WHERE last_created_at < ?', [now - 3600000]);

    return result.changes ?? 0;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
