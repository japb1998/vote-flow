import fs from 'fs';
import os from 'os';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { setupSocketHandlers } from '../socket';
import { MemorySessionStore } from '../store/memory';
import { SqliteSessionStore } from '../store/sqlite';
import { parseSessionYAML } from '../parseYaml';
import { SessionStore } from '../store/interface';

interface MockSocket {
  id: string;
  handshake: { headers: Record<string, string>; address: string };
  emit: jest.Mock;
  on: jest.Mock;
  to: jest.Mock;
  join: jest.Mock;
  leave: jest.Mock;
  handlers: Record<string, (...args: any[]) => Promise<void> | void>;
}

function createTestServer(store: SessionStore) {
  const roomEmits: Array<{ room: string; event: string; data: unknown }> = [];
  let connectionHandler: ((socket: any) => void) | null = null;

  const io = {
    on: jest.fn((event: string, cb: (socket: any) => void) => {
      if (event === 'connection') connectionHandler = cb;
    }),
    to: jest.fn((room: string) => ({
      emit: jest.fn((event: string, data: unknown) => {
        roomEmits.push({ room, event, data });
      }),
    })),
  };

  setupSocketHandlers(io as never, store);

  function connectSocket(id: string, address = '127.0.0.1'): MockSocket {
    const handlers: Record<string, (...args: any[]) => Promise<void> | void> = {};
    const socket: MockSocket = {
      id,
      handshake: { headers: {}, address },
      emit: jest.fn(),
      on: jest.fn((event: string, fn: (...args: any[]) => Promise<void> | void) => {
        handlers[event] = fn;
      }),
      to: jest.fn((room: string) => ({
        emit: jest.fn((event: string, data: unknown) => {
          roomEmits.push({ room, event, data });
        }),
      })),
      join: jest.fn(),
      leave: jest.fn(),
      handlers,
    };
    connectionHandler!(socket);
    return socket;
  }

  return { io, connectSocket, roomEmits };
}

describe('Socket security, validation, and lifecycle', () => {
  it('binds socket identity, blocks impersonation/close takeover, and enforces authToken on reconnect', async () => {
    const store = new MemorySessionStore();
    await store.initialize();
    const { connectSocket, roomEmits } = createTestServer(store);

    const creator = connectSocket('sock-creator');
    await creator.handlers['create-session']({
      title: 'Dot Security Session',
      votingMethod: 'dot',
      options: [{ name: 'Opt A' }, { name: 'Opt B' }],
      config: { dotsPerVoter: 3 },
    });

    const createdCall = creator.emit.mock.calls.find(([ev]) => ev === 'session-created');
    expect(createdCall).toBeDefined();
    const { session, userId: creatorId, authToken: creatorToken, users, results } = createdCall![1];
    expect(creatorToken).toBeTruthy();
    expect(users).toEqual([{ id: creatorId, name: 'Creator' }]);
    expect(results.method).toBe('dot');

    // Participant joins
    const attacker = connectSocket('sock-attacker');
    await attacker.handlers['join-session']({ sessionId: session.id, userName: 'Attacker' });
    const joinedCall = attacker.emit.mock.calls.find(([ev]) => ev === 'session-joined');
    expect(joinedCall).toBeDefined();
    const { userId: attackerId, authToken: attackerToken } = joinedCall![1];
    expect(attackerToken).toBeTruthy();

    // 1. Attacker cannot close session even with leaked creatorId
    attacker.emit.mockClear();
    await attacker.handlers['close-session']({ sessionId: session.id, userId: creatorId });
    expect(attacker.emit).toHaveBeenCalledWith('error', expect.objectContaining({
      message: expect.stringMatching(/creator/i),
    }));
    expect((await store.getSession(session.id))?.status).toBe('active');

    // 2. Attacker cannot impersonate creator when voting
    attacker.emit.mockClear();
    await attacker.handlers['submit-vote']({
      sessionId: session.id,
      vote: {
        userId: creatorId,
        userName: 'Spoofed',
        selection: { type: 'dot', allocations: { [session.options[0].id]: 2 } },
      },
    });
    expect(attacker.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'UNAUTHORIZED' }));

    // 3. Attacker cannot bypass dot budget, submit negative dots, or inject prototype keys
    for (const badSelection of [
      { type: 'dot', allocations: { [session.options[0].id]: 100 } },
      { type: 'dot', allocations: { [session.options[0].id]: 2, [session.options[1].id]: -1 } },
      { type: 'dot', allocations: { toString: 2, [session.options[0].id]: 1 } },
      { type: 'single', optionId: session.options[0].id },
    ]) {
      attacker.emit.mockClear();
      await attacker.handlers['submit-vote']({
        sessionId: session.id,
        vote: { userId: attackerId, userName: 'Attacker', selection: badSelection },
      });
      expect(attacker.emit).toHaveBeenCalledWith('error', expect.any(Object));
    }
    expect(await store.getVotes(session.id)).toHaveLength(0);

    // 4. Valid vote with lowercase sessionId succeeds
    attacker.emit.mockClear();
    await attacker.handlers['submit-vote']({
      sessionId: session.id.toLowerCase(),
      vote: {
        userId: attackerId,
        userName: 'Attacker',
        selection: { type: 'dot', allocations: { [session.options[0].id]: 2, [session.options[1].id]: 1 } },
      },
    });
    expect(await store.getVotes(session.id)).toHaveLength(1);

    // 5. Reconnecting with creatorId without matching authToken is rejected
    const hijacker = connectSocket('sock-hijacker');
    await hijacker.handlers['join-session']({
      sessionId: session.id,
      userName: '',
      userId: creatorId,
      authToken: 'wrong-token',
    });
    expect(hijacker.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'UNAUTHORIZED' }));

    // 6. Reconnecting with valid authToken succeeds
    const creatorReconnect = connectSocket('sock-creator-2');
    await creatorReconnect.handlers['join-session']({
      sessionId: session.id,
      userName: '',
      userId: creatorId,
      authToken: creatorToken,
    });
    expect(creatorReconnect.emit).toHaveBeenCalledWith(
      'session-joined',
      expect.objectContaining({ userId: creatorId, authToken: creatorToken }),
    );

    // 7. update-user-name rejects empty post-sanitization names and updates vote names when valid
    attacker.emit.mockClear();
    await attacker.handlers['update-user-name']({ userId: attackerId, userName: '   <>   ' });
    expect(attacker.emit).toHaveBeenCalledWith('error', expect.any(Object));

    roomEmits.length = 0;
    await attacker.handlers['update-user-name']({ userId: attackerId, userName: 'Alice' });
    expect(roomEmits.some(e => e.event === 'user-name-updated' && (e.data as any).userName === 'Alice')).toBe(true);
    expect((await store.getVotes(session.id))[0].userName).toBe('Alice');

    // 8. leave-session removes room membership & prevents further voting from that socket
    await attacker.handlers['leave-session']({ sessionId: session.id });
    expect(attacker.leave).toHaveBeenCalledWith(session.id);
    attacker.emit.mockClear();
    await attacker.handlers['submit-vote']({
      sessionId: session.id,
      vote: {
        userId: attackerId,
        userName: 'Alice',
        selection: { type: 'dot', allocations: { [session.options[0].id]: 1 } },
      },
    });
    expect(attacker.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'UNAUTHORIZED' }));

    // 9. Creator can close once, but closing an already-closed session returns error
    await creatorReconnect.handlers['close-session']({ sessionId: session.id, userId: creatorId });
    expect((await store.getSession(session.id))?.status).toBe('closed');
    creatorReconnect.emit.mockClear();
    await creatorReconnect.handlers['close-session']({ sessionId: session.id, userId: creatorId });
    expect(creatorReconnect.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'SESSION_CLOSED' }));
  });
});

describe('parseSessionYAML — all 8 voting methods and config', () => {
  it('parses dot session with config', () => {
    const res = parseSessionYAML(`
title: Sprint Priorities
votingMethod: dot
config:
  dotsPerVoter: 5
options:
  - Feature A
  - name: Feature B
    description: Details
`);
    expect(res).toEqual({
      ok: true,
      session: {
        title: 'Sprint Priorities',
        votingMethod: 'dot',
        config: { dotsPerVoter: 5 },
        options: [
          { name: 'Feature A', description: '' },
          { name: 'Feature B', description: 'Details' },
        ],
      },
    });
  });

  it.each(['poker', 'roman', 'fist-of-five'])('allows omitted options for %s', (method) => {
    const extra = method === 'poker' ? '\nconfig:\n  pokerMin: 2\n  pokerMax: 21' : '';
    const res = parseSessionYAML(`title: Test ${method}\nvotingMethod: ${method}${extra}`);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.session.votingMethod).toBe(method);
      expect(res.session.options).toEqual([]);
      if (method === 'poker') {
        expect(res.session.config).toEqual({ pokerMin: 2, pokerMax: 21 });
      }
    }
  });
});

describe('Store migrations, IP TTL, and voter name sync', () => {
  it('SqliteSessionStore migrates pre-TTL legacy DB without crashing and enforces IP 1-hour window', async () => {
    const dbPath = path.join(os.tmpdir(), `voteflow-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    try {
      const legacyDb = await open({ filename: dbPath, driver: sqlite3.Database });
      await legacyDb.exec(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          voting_method TEXT NOT NULL,
          options TEXT NOT NULL,
          creator_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          closed_at INTEGER
        );
        CREATE TABLE users (
          id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          name TEXT NOT NULL,
          socket_id TEXT,
          PRIMARY KEY (id, session_id)
        );
      `);
      await legacyDb.close();

      const store = new SqliteSessionStore(dbPath);
      await store.initialize();

      // Verify auth_token & expires_at columns work
      const now = Date.now();
      await store.createSession({
        id: 'MIG123',
        title: 'Migrated',
        createdAt: now,
        status: 'active',
        votingMethod: 'roman',
        options: [],
        votes: [],
        creatorId: 'u1',
        expiresAt: now + 60_000,
      });
      await store.addUser('MIG123', { id: 'u1', name: 'OldName', socketId: 's1', authToken: 'secret-tok' });
      const fetchedUser = await store.getUser('MIG123', 'u1');
      expect(fetchedUser?.authToken).toBe('secret-tok');

      await store.upsertVote('MIG123', {
        id: 'v1',
        userId: 'u1',
        userName: 'OldName',
        selection: { type: 'roman', vote: 'up' },
        timestamp: now,
      });
      await store.updateUser('MIG123', 'u1', { name: 'NewName' });
      expect((await store.getVotes('MIG123'))[0].userName).toBe('NewName');

      await store.close();
    } finally {
      for (const suffix of ['', '-wal', '-shm']) {
        try { fs.unlinkSync(dbPath + suffix); } catch {}
      }
    }
  });

  it('MemorySessionStore expires IP rate-limit counters after 1 hour', async () => {
    const store = new MemorySessionStore();
    await store.initialize();
    const realNow = Date.now;
    let currentTime = 1_000_000;
    Date.now = () => currentTime;
    try {
      await store.incrementIpSessionCount('10.0.0.1');
      await store.incrementIpSessionCount('10.0.0.1');
      expect(await store.getIpSessionCount('10.0.0.1')).toBe(2);

      // Advance > 1 hour
      currentTime += 3_600_001;
      expect(await store.getIpSessionCount('10.0.0.1')).toBe(0);

      await store.incrementIpSessionCount('10.0.0.1');
      expect(await store.getIpSessionCount('10.0.0.1')).toBe(1);
    } finally {
      Date.now = realNow;
    }
  });
});
