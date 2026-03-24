import { setupSocketHandlers } from '../socket';
import { SessionStore, UserInfo } from '../store/interface';
import { Session } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'ABC123',
    title: 'Test Session',
    createdAt: Date.now() - 60_000,
    status: 'active',
    votingMethod: 'single',
    options: [
      { id: 'opt1', name: 'Option A' },
      { id: 'opt2', name: 'Option B' },
    ],
    votes: [],
    creatorId: 'creator-uuid',
    ...overrides,
  };
}

function makeUser(overrides: Partial<UserInfo> = {}): UserInfo {
  return { id: 'user-uuid', name: 'Alice', socketId: 'old-socket-id', ...overrides };
}

/** Build a minimal mock store */
function makeStore(
  session: Session | null,
  user: UserInfo | null = null,
  userCount = 1,
): jest.Mocked<SessionStore> {
  return {
    createSession: jest.fn(),
    getSession: jest.fn().mockResolvedValue(session),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
    getActiveSessionCount: jest.fn().mockResolvedValue(1),
    addUser: jest.fn(),
    getUser: jest.fn().mockResolvedValue(user),
    getUsers: jest.fn().mockResolvedValue(new Map()),
    getUserCount: jest.fn().mockResolvedValue(userCount),
    updateUser: jest.fn(),
    removeUserBySocketId: jest.fn().mockResolvedValue([]),
    findUserSessions: jest.fn().mockResolvedValue([]),
    upsertVote: jest.fn(),
    getVotes: jest.fn().mockResolvedValue([]),
    getIpSessionCount: jest.fn().mockResolvedValue(0),
    incrementIpSessionCount: jest.fn(),
    cleanupExpiredSessions: jest.fn().mockResolvedValue(0),
    initialize: jest.fn(),
    close: jest.fn(),
  } as unknown as jest.Mocked<SessionStore>;
}

/** Build mock socket + io and wire up the handlers, returning the socket mock */
function setupHandlers(store: SessionStore) {
  const emittedEvents: Array<{ event: string; data: unknown }> = [];

  const socket = {
    id: 'socket-id-123',
    handshake: { headers: {}, address: '127.0.0.1' },
    emit: jest.fn((event: string, data: unknown) => {
      emittedEvents.push({ event, data });
    }),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
  };

  const io = {
    on: jest.fn((event: string, cb: (socket: unknown) => void) => {
      if (event === 'connection') cb(socket);
    }),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  setupSocketHandlers(io as never, store);

  // Extract the registered 'join-session' handler
  const handlers: Record<string, Function> = {};
  (socket.on as jest.Mock).mock.calls.forEach(([event, fn]: [string, Function]) => {
    handlers[event] = fn;
  });

  return { socket, handlers, emittedEvents };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('join-session handler — closed sessions', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('rejects a brand-new user trying to join a closed session', async () => {
    const closedSession = makeSession({ status: 'closed' });
    const store = makeStore(closedSession, null);
    const { handlers, socket } = setupHandlers(store);

    await handlers['join-session']({ sessionId: 'ABC123', userName: 'Bob' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'This session has ended',
      code: 'SESSION_CLOSED',
    });
    expect(store.addUser).not.toHaveBeenCalled();
  });

  it('rejects an unknown userId trying to join a closed session', async () => {
    const closedSession = makeSession({ status: 'closed' });
    // getUser returns null → user not in session
    const store = makeStore(closedSession, null);
    const { handlers, socket } = setupHandlers(store);

    await handlers['join-session']({
      sessionId: 'ABC123',
      userName: 'Bob',
      userId: 'unknown-uuid',
    });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'This session has ended',
      code: 'SESSION_CLOSED',
    });
    expect(store.addUser).not.toHaveBeenCalled();
  });

  it('allows a known user to reconnect to a closed session', async () => {
    const closedSession = makeSession({ status: 'closed' });
    const existingUser = makeUser({ id: 'user-uuid', name: 'Alice', socketId: 'old-socket' });
    const store = makeStore(closedSession, existingUser);
    const { handlers, socket } = setupHandlers(store);

    await handlers['join-session']({
      sessionId: 'ABC123',
      userName: '',
      userId: 'user-uuid',
    });

    expect(socket.emit).toHaveBeenCalledWith(
      'session-joined',
      expect.objectContaining({ userId: 'user-uuid' }),
    );
    expect(store.addUser).not.toHaveBeenCalled();
    expect(store.updateUser).toHaveBeenCalledWith(
      'ABC123',
      'user-uuid',
      expect.objectContaining({ socketId: 'socket-id-123' }),
    );
  });

  it('allows a new user to join an active session normally', async () => {
    const activeSession = makeSession({ status: 'active' });
    const store = makeStore(activeSession, null);
    const { handlers, socket } = setupHandlers(store);

    await handlers['join-session']({ sessionId: 'ABC123', userName: 'Charlie' });

    expect(socket.emit).toHaveBeenCalledWith(
      'session-joined',
      expect.objectContaining({ userName: 'Charlie' }),
    );
    expect(store.addUser).toHaveBeenCalled();
  });

  it('returns SESSION_NOT_FOUND when the session does not exist', async () => {
    const store = makeStore(null);
    const { handlers, socket } = setupHandlers(store);

    await handlers['join-session']({ sessionId: 'XXXXXX', userName: 'Dave' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Session not found' });
  });

  it('returns USER_NOT_FOUND when reconnecting user is missing from an active session', async () => {
    const activeSession = makeSession({ status: 'active' });
    const store = makeStore(activeSession, null);
    const { handlers, socket } = setupHandlers(store);

    // No userName provided, userId not in store → USER_NOT_FOUND
    await handlers['join-session']({
      sessionId: 'ABC123',
      userName: '',
      userId: 'ghost-uuid',
    });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'User not found in session',
      code: 'USER_NOT_FOUND',
    });
  });
});
