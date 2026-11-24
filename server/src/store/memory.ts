import { Session, Vote } from '../types';
import { SessionStore, UserInfo } from './interface';

const IP_WINDOW_MS = 3600000; // 1 hour

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>();
  private sessionUsers = new Map<string, Map<string, UserInfo>>();
  private ipSessionCount = new Map<string, { count: number; lastCreatedAt: number }>();

  async initialize(): Promise<void> {}

  async createSession(session: Session): Promise<void> {
    this.sessions.set(session.id, { ...session, votes: [...session.votes] });
    this.sessionUsers.set(session.id, new Map());
  }

  async getSession(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    if (!session) return null;

    // Lazy TTL: treat expired sessions as non-existent
    if (Date.now() > session.expiresAt) {
      return null;
    }

    return { ...session, votes: [...session.votes] };
  }

  async updateSession(id: string, updates: Partial<Pick<Session, 'status' | 'closedAt' | 'expiresAt'>>): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;
    Object.assign(session, updates);
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
    this.sessionUsers.delete(id);
  }

  async getActiveSessionCount(): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.status === 'active' && now <= session.expiresAt) count++;
    }
    return count;
  }

  async addUser(sessionId: string, user: UserInfo): Promise<void> {
    const users = this.sessionUsers.get(sessionId);
    if (users) users.set(user.id, { ...user });
  }

  async getUser(sessionId: string, userId: string): Promise<UserInfo | null> {
    const users = this.sessionUsers.get(sessionId);
    const user = users?.get(userId);
    return user ? { ...user } : null;
  }

  async getUsers(sessionId: string): Promise<Map<string, UserInfo>> {
    const users = this.sessionUsers.get(sessionId);
    if (!users) return new Map();
    const copy = new Map<string, UserInfo>();
    for (const [id, user] of users) {
      copy.set(id, { ...user });
    }
    return copy;
  }

  async getUserCount(sessionId: string): Promise<number> {
    return this.sessionUsers.get(sessionId)?.size ?? 0;
  }

  async updateUser(sessionId: string, userId: string, updates: Partial<UserInfo>): Promise<void> {
    const users = this.sessionUsers.get(sessionId);
    const user = users?.get(userId);
    if (user) {
      Object.assign(user, updates);
    }
    if (updates.name !== undefined) {
      const session = this.sessions.get(sessionId);
      if (session) {
        for (const vote of session.votes) {
          if (vote.userId === userId) {
            vote.userName = updates.name;
          }
        }
      }
    }
  }

  async removeUserBySocketId(socketId: string): Promise<{ sessionId: string; userId: string }[]> {
    const removed: { sessionId: string; userId: string }[] = [];
    for (const [sessionId, users] of this.sessionUsers) {
      for (const [userId, user] of users) {
        if (user.socketId === socketId) {
          user.socketId = null;
          removed.push({ sessionId, userId });
        }
      }
    }
    return removed;
  }

  async findUserSessions(userId: string): Promise<string[]> {
    const sessions: string[] = [];
    for (const [sessionId, users] of this.sessionUsers) {
      if (users.has(userId)) sessions.push(sessionId);
    }
    return sessions;
  }

  async upsertVote(sessionId: string, vote: Vote): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const idx = session.votes.findIndex(v => v.userId === vote.userId);
    if (idx >= 0) {
      session.votes[idx] = { ...vote };
    } else {
      session.votes.push({ ...vote });
    }
  }

  async getVotes(sessionId: string): Promise<Vote[]> {
    const votes = this.sessions.get(sessionId)?.votes ?? [];
    return votes.map(v => ({ ...v }));
  }

  async getIpSessionCount(ip: string): Promise<number> {
    const entry = this.ipSessionCount.get(ip);
    if (!entry) return 0;
    if (entry.lastCreatedAt < Date.now() - IP_WINDOW_MS) {
      this.ipSessionCount.delete(ip);
      return 0;
    }
    return entry.count;
  }

  async incrementIpSessionCount(ip: string): Promise<void> {
    const now = Date.now();
    const entry = this.ipSessionCount.get(ip);
    if (!entry || entry.lastCreatedAt < now - IP_WINDOW_MS) {
      this.ipSessionCount.set(ip, { count: 1, lastCreatedAt: now });
    } else {
      this.ipSessionCount.set(ip, { count: entry.count + 1, lastCreatedAt: now });
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
        this.sessionUsers.delete(id);
        cleaned++;
      }
    }

    // Clean up stale IP counters (older than 1 hour)
    const ipCutoff = now - IP_WINDOW_MS;
    for (const [ip, entry] of this.ipSessionCount) {
      if (entry.lastCreatedAt < ipCutoff) {
        this.ipSessionCount.delete(ip);
      }
    }

    return cleaned;
  }

  async close(): Promise<void> {}
}
