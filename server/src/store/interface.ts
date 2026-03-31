import { Session, Vote, VotingMethod, Option } from '../types';

export interface UserInfo {
  id: string;
  name: string;
  socketId: string | null;
}

export interface SessionStore {
  // Sessions
  createSession(session: Session): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  updateSession(id: string, updates: Partial<Pick<Session, 'status' | 'closedAt' | 'expiresAt'>>): Promise<void>;
  deleteSession(id: string): Promise<void>;
  getActiveSessionCount(): Promise<number>;

  // Users
  addUser(sessionId: string, user: UserInfo): Promise<void>;
  getUser(sessionId: string, userId: string): Promise<UserInfo | null>;
  getUsers(sessionId: string): Promise<Map<string, UserInfo>>;
  getUserCount(sessionId: string): Promise<number>;
  updateUser(sessionId: string, userId: string, updates: Partial<UserInfo>): Promise<void>;
  removeUserBySocketId(socketId: string): Promise<{ sessionId: string; userId: string }[]>;
  findUserSessions(userId: string): Promise<string[]>;

  // Votes
  upsertVote(sessionId: string, vote: Vote): Promise<void>;
  getVotes(sessionId: string): Promise<Vote[]>;

  // IP rate limiting
  getIpSessionCount(ip: string): Promise<number>;
  incrementIpSessionCount(ip: string): Promise<void>;

  // Cleanup
  cleanupExpiredSessions(): Promise<number>;

  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;
}
