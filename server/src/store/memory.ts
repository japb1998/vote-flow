import { Session, Vote } from '../types';
import { SessionStore, UserInfo } from './interface';

export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>();
  private sessionUsers = new Map<string, Map<string, UserInfo>>();
  private ipSessionCount = new Map<string, number>();

  async initialize(): Promise<void> {}

  async createSession(session: Session): Promise<void> {
    this.sessions.set(session.id, { ...session });
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
    return users?.get(userId) ?? null;
  }

  async getUsers(sessionId: string): Promise<Map<string, UserInfo>> {
    return this.sessionUsers.get(sessionId) ?? new Map();
  }

  async getUserCount(sessionId: string): Promise<number> {
    return this.sessionUsers.get(sessionId)?.size ?? 0;
  }

  async updateUser(sessionId: string, userId: string, updates: Partial<UserInfo>): Promise<void> {
    const users = this.sessionUsers.get(sessionId);
    const user = users?.get(userId);
    if (user) Object.assign(user, updates);
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
      session.votes[idx] = vote;
    } else {
      session.votes.push(vote);
    }
  }

  async getVotes(sessionId: string): Promise<Vote[]> {
    return this.sessions.get(sessionId)?.votes ?? [];
  }

  async getIpSessionCount(ip: string): Promise<number> {
    return this.ipSessionCount.get(ip) ?? 0;
  }

  async incrementIpSessionCount(ip: string): Promise<void> {
    this.ipSessionCount.set(ip, (this.ipSessionCount.get(ip) ?? 0) + 1);
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
    return cleaned;
  }

  async close(): Promise<void> {}
}
