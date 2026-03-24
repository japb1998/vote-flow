import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySessionStore } from './memory';
import { Session, Vote } from '../types';

function makeSession(id: string, status: 'active' | 'closed' = 'active'): Session {
  return {
    id,
    title: `Session ${id}`,
    createdAt: Date.now(),
    status,
    votingMethod: 'single',
    options: [{ id: 'opt1', name: 'Option 1' }, { id: 'opt2', name: 'Option 2' }],
    votes: [],
    creatorId: 'creator-1',
  };
}

function makeVote(id: string, userId: string): Vote {
  return {
    id,
    userId,
    userName: `User ${userId}`,
    selection: { type: 'single', optionId: 'opt1' },
    timestamp: Date.now(),
  };
}

describe('MemorySessionStore', () => {
  let store: MemorySessionStore;

  beforeEach(async () => {
    store = new MemorySessionStore();
    await store.initialize();
  });

  // ─── Session CRUD ──────────────────────────────────────────────────────────

  describe('createSession / getSession', () => {
    it('creates and retrieves a session', async () => {
      const session = makeSession('ABC123');
      await store.createSession(session);
      const retrieved = await store.getSession('ABC123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('ABC123');
      expect(retrieved?.title).toBe('Session ABC123');
    });

    it('returns null for non-existent session', async () => {
      const result = await store.getSession('NOPE99');
      expect(result).toBeNull();
    });

    it('returns a copy (mutations do not affect stored data)', async () => {
      const session = makeSession('S1');
      await store.createSession(session);
      const copy = await store.getSession('S1');
      copy!.title = 'Mutated';
      const original = await store.getSession('S1');
      expect(original?.title).toBe('Session S1');
    });
  });

  describe('updateSession', () => {
    it('updates session status', async () => {
      await store.createSession(makeSession('S2'));
      await store.updateSession('S2', { status: 'closed', closedAt: 9999 });
      const s = await store.getSession('S2');
      expect(s?.status).toBe('closed');
      expect(s?.closedAt).toBe(9999);
    });

    it('does nothing for non-existent session', async () => {
      await expect(store.updateSession('GHOST', { status: 'closed' })).resolves.toBeUndefined();
    });
  });

  describe('deleteSession', () => {
    it('removes a session', async () => {
      await store.createSession(makeSession('S3'));
      await store.deleteSession('S3');
      expect(await store.getSession('S3')).toBeNull();
    });

    it('does nothing for non-existent session', async () => {
      await expect(store.deleteSession('NOPE')).resolves.toBeUndefined();
    });
  });

  describe('getActiveSessionCount', () => {
    it('returns 0 with no sessions', async () => {
      expect(await store.getActiveSessionCount()).toBe(0);
    });

    it('counts only active sessions', async () => {
      await store.createSession(makeSession('A1', 'active'));
      await store.createSession(makeSession('A2', 'active'));
      const closed = makeSession('C1', 'closed');
      closed.closedAt = Date.now();
      await store.createSession(closed);
      expect(await store.getActiveSessionCount()).toBe(2);
    });
  });

  // ─── User Management ───────────────────────────────────────────────────────

  describe('addUser / getUser', () => {
    it('adds and retrieves a user', async () => {
      await store.createSession(makeSession('S4'));
      await store.addUser('S4', { id: 'u1', name: 'Alice', socketId: 'sock1' });
      const user = await store.getUser('S4', 'u1');
      expect(user).not.toBeNull();
      expect(user?.name).toBe('Alice');
    });

    it('returns null for non-existent user', async () => {
      await store.createSession(makeSession('S5'));
      expect(await store.getUser('S5', 'ghost')).toBeNull();
    });

    it('returns null for non-existent session', async () => {
      expect(await store.getUser('NOPE', 'u1')).toBeNull();
    });
  });

  describe('getUsers', () => {
    it('returns all users in a session', async () => {
      await store.createSession(makeSession('S6'));
      await store.addUser('S6', { id: 'u1', name: 'Alice', socketId: 'sock1' });
      await store.addUser('S6', { id: 'u2', name: 'Bob', socketId: 'sock2' });
      const users = await store.getUsers('S6');
      expect(users.size).toBe(2);
    });

    it('returns empty map for non-existent session', async () => {
      const users = await store.getUsers('NOPE');
      expect(users.size).toBe(0);
    });
  });

  describe('getUserCount', () => {
    it('returns correct count', async () => {
      await store.createSession(makeSession('S7'));
      expect(await store.getUserCount('S7')).toBe(0);
      await store.addUser('S7', { id: 'u1', name: 'Alice', socketId: 'sock1' });
      expect(await store.getUserCount('S7')).toBe(1);
      await store.addUser('S7', { id: 'u2', name: 'Bob', socketId: 'sock2' });
      expect(await store.getUserCount('S7')).toBe(2);
    });

    it('returns 0 for non-existent session', async () => {
      expect(await store.getUserCount('NOPE')).toBe(0);
    });
  });

  describe('updateUser', () => {
    it('updates user name', async () => {
      await store.createSession(makeSession('S8'));
      await store.addUser('S8', { id: 'u1', name: 'Alice', socketId: 'sock1' });
      await store.updateUser('S8', 'u1', { name: 'Alice Updated' });
      const user = await store.getUser('S8', 'u1');
      expect(user?.name).toBe('Alice Updated');
    });

    it('updates socketId', async () => {
      await store.createSession(makeSession('S9'));
      await store.addUser('S9', { id: 'u1', name: 'Alice', socketId: 'sock1' });
      await store.updateUser('S9', 'u1', { socketId: 'sock-new' });
      const user = await store.getUser('S9', 'u1');
      expect(user?.socketId).toBe('sock-new');
    });

    it('does nothing for non-existent user', async () => {
      await store.createSession(makeSession('S10'));
      await expect(store.updateUser('S10', 'ghost', { name: 'Ghost' })).resolves.toBeUndefined();
    });
  });

  describe('removeUserBySocketId', () => {
    it('sets socketId to null for matching users', async () => {
      await store.createSession(makeSession('S11'));
      await store.addUser('S11', { id: 'u1', name: 'Alice', socketId: 'sock1' });
      await store.addUser('S11', { id: 'u2', name: 'Bob', socketId: 'sock2' });

      const removed = await store.removeUserBySocketId('sock1');
      expect(removed).toHaveLength(1);
      expect(removed[0]).toEqual({ sessionId: 'S11', userId: 'u1' });

      const user = await store.getUser('S11', 'u1');
      expect(user?.socketId).toBeNull();
      // Bob still has his socket
      const bob = await store.getUser('S11', 'u2');
      expect(bob?.socketId).toBe('sock2');
    });

    it('returns empty array when no socket matches', async () => {
      await store.createSession(makeSession('S12'));
      const removed = await store.removeUserBySocketId('nonexistent');
      expect(removed).toEqual([]);
    });

    it('handles user in multiple sessions', async () => {
      await store.createSession(makeSession('SA'));
      await store.createSession(makeSession('SB'));
      await store.addUser('SA', { id: 'u1', name: 'Alice', socketId: 'sock-shared' });
      await store.addUser('SB', { id: 'u2', name: 'Bob', socketId: 'sock-shared' });

      const removed = await store.removeUserBySocketId('sock-shared');
      expect(removed).toHaveLength(2);
    });
  });

  describe('findUserSessions', () => {
    it('returns session IDs containing the user', async () => {
      await store.createSession(makeSession('SC'));
      await store.createSession(makeSession('SD'));
      await store.addUser('SC', { id: 'u1', name: 'Alice', socketId: 'sock1' });
      await store.addUser('SD', { id: 'u1', name: 'Alice', socketId: 'sock1' });

      const sessions = await store.findUserSessions('u1');
      expect(sessions).toContain('SC');
      expect(sessions).toContain('SD');
      expect(sessions).toHaveLength(2);
    });

    it('returns empty array when user not in any session', async () => {
      const sessions = await store.findUserSessions('nobody');
      expect(sessions).toEqual([]);
    });
  });

  // ─── Votes ─────────────────────────────────────────────────────────────────

  describe('upsertVote / getVotes', () => {
    it('adds a vote', async () => {
      await store.createSession(makeSession('SE'));
      await store.upsertVote('SE', makeVote('v1', 'u1'));
      const votes = await store.getVotes('SE');
      expect(votes).toHaveLength(1);
      expect(votes[0].userId).toBe('u1');
    });

    it('upserts (replaces) existing vote from same user', async () => {
      await store.createSession(makeSession('SF'));
      await store.upsertVote('SF', makeVote('v1', 'u1'));
      const updated: Vote = {
        id: 'v2',
        userId: 'u1',
        userName: 'User u1',
        selection: { type: 'single', optionId: 'opt2' },
        timestamp: Date.now(),
      };
      await store.upsertVote('SF', updated);
      const votes = await store.getVotes('SF');
      expect(votes).toHaveLength(1);
      expect(votes[0].selection).toEqual({ type: 'single', optionId: 'opt2' });
    });

    it('allows different users to each submit a vote', async () => {
      await store.createSession(makeSession('SG'));
      await store.upsertVote('SG', makeVote('v1', 'u1'));
      await store.upsertVote('SG', makeVote('v2', 'u2'));
      const votes = await store.getVotes('SG');
      expect(votes).toHaveLength(2);
    });

    it('returns empty array for non-existent session', async () => {
      const votes = await store.getVotes('NOPE');
      expect(votes).toEqual([]);
    });

    it('does nothing for upsert on non-existent session', async () => {
      await expect(store.upsertVote('NOPE', makeVote('v1', 'u1'))).resolves.toBeUndefined();
    });
  });

  // ─── IP Rate Limiting ──────────────────────────────────────────────────────

  describe('getIpSessionCount / incrementIpSessionCount', () => {
    it('returns 0 for unknown IP', async () => {
      expect(await store.getIpSessionCount('1.2.3.4')).toBe(0);
    });

    it('increments count correctly', async () => {
      await store.incrementIpSessionCount('1.2.3.4');
      expect(await store.getIpSessionCount('1.2.3.4')).toBe(1);
      await store.incrementIpSessionCount('1.2.3.4');
      expect(await store.getIpSessionCount('1.2.3.4')).toBe(2);
    });

    it('tracks counts per IP independently', async () => {
      await store.incrementIpSessionCount('1.2.3.4');
      await store.incrementIpSessionCount('5.6.7.8');
      await store.incrementIpSessionCount('5.6.7.8');
      expect(await store.getIpSessionCount('1.2.3.4')).toBe(1);
      expect(await store.getIpSessionCount('5.6.7.8')).toBe(2);
    });
  });

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  describe('cleanupExpiredSessions', () => {
    it('removes closed sessions past TTL', async () => {
      const session = makeSession('OLD');
      session.status = 'closed';
      session.closedAt = Date.now() - 60 * 60 * 1000; // 1 hour ago
      await store.createSession(session);

      const cleaned = await store.cleanupExpiredSessions(30 * 60 * 1000); // 30 min TTL
      expect(cleaned).toBe(1);
      expect(await store.getSession('OLD')).toBeNull();
    });

    it('keeps closed sessions within TTL', async () => {
      const session = makeSession('RECENT');
      session.status = 'closed';
      session.closedAt = Date.now() - 5 * 60 * 1000; // 5 min ago
      await store.createSession(session);

      const cleaned = await store.cleanupExpiredSessions(30 * 60 * 1000); // 30 min TTL
      expect(cleaned).toBe(0);
      expect(await store.getSession('RECENT')).not.toBeNull();
    });

    it('keeps active sessions regardless of age', async () => {
      const session = makeSession('ACTIVE');
      session.createdAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago, still active
      await store.createSession(session);

      const cleaned = await store.cleanupExpiredSessions(30 * 60 * 1000);
      expect(cleaned).toBe(0);
      expect(await store.getSession('ACTIVE')).not.toBeNull();
    });

    it('returns 0 when nothing to clean', async () => {
      const cleaned = await store.cleanupExpiredSessions(30 * 60 * 1000);
      expect(cleaned).toBe(0);
    });
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  describe('initialize / close', () => {
    it('initializes without error', async () => {
      await expect(store.initialize()).resolves.toBeUndefined();
    });

    it('closes without error', async () => {
      await expect(store.close()).resolves.toBeUndefined();
    });
  });
});
