import { Server, Socket } from 'socket.io';
import { setupSocketHandlers } from '../src/socket';
import { SessionStore } from '../src/store';

// Minimal mock socket
function makeMockSocket(overrides: Partial<Socket> = {}): jest.Mocked<Pick<Socket, 'id' | 'on' | 'emit' | 'join' | 'to' | 'handshake'>> {
  const handlers: Record<string, Function> = {};
  return {
    id: 'test-socket-id',
    handshake: { headers: {}, address: '127.0.0.1' } as any,
    on: jest.fn((event: string, handler: Function) => {
      handlers[event] = handler;
      return { handlers };
    }) as any,
    emit: jest.fn(),
    join: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    ...overrides,
    _handlers: handlers,
  } as any;
}

// Capture the 'connection' callback and return a helper to simulate a new socket connecting
function setupHandlers(store: Partial<SessionStore>) {
  const connectionHandlers: Function[] = [];
  const mockIo = {
    on: jest.fn((event: string, handler: Function) => {
      if (event === 'connection') connectionHandlers.push(handler);
    }),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  } as unknown as Server;

  setupSocketHandlers(mockIo, store as SessionStore);

  return {
    connect: () => {
      const socket = makeMockSocket();
      // Trigger the connection handler
      connectionHandlers[0](socket);
      // Expose a helper to fire socket events
      const fire = (event: string, payload: unknown) => {
        const handler = (socket as any)._handlers[event];
        if (!handler) throw new Error(`No handler registered for '${event}'`);
        return handler(payload);
      };
      return { socket, fire };
    },
  };
}

function makeStore(overrides: Partial<SessionStore> = {}): Partial<SessionStore> {
  return {
    getSession: jest.fn().mockResolvedValue(null),
    getActiveSessionCount: jest.fn().mockResolvedValue(0),
    getIpSessionCount: jest.fn().mockResolvedValue(0),
    incrementIpSessionCount: jest.fn().mockResolvedValue(undefined),
    createSession: jest.fn().mockResolvedValue(undefined),
    addUser: jest.fn().mockResolvedValue(undefined),
    getUser: jest.fn().mockResolvedValue(null),
    getUsers: jest.fn().mockResolvedValue(new Map()),
    getUserCount: jest.fn().mockResolvedValue(0),
    updateUser: jest.fn().mockResolvedValue(undefined),
    removeUserBySocketId: jest.fn().mockResolvedValue([]),
    findUserSessions: jest.fn().mockResolvedValue([]),
    upsertVote: jest.fn().mockResolvedValue(undefined),
    getVotes: jest.fn().mockResolvedValue([]),
    updateSession: jest.fn().mockResolvedValue(undefined),
    deleteSession: jest.fn().mockResolvedValue(undefined),
    cleanupExpiredSessions: jest.fn().mockResolvedValue(0),
    initialize: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('join-session: session not found', () => {
  it('emits SESSION_NOT_FOUND error when session does not exist', async () => {
    const store = makeStore({ getSession: jest.fn().mockResolvedValue(null) });
    const { connect } = setupHandlers(store);
    const { socket, fire } = connect();

    await fire('join-session', { sessionId: 'XXXXXX', userName: 'Alice' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Session not found',
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('emits SESSION_NOT_FOUND error for a deleted/expired session', async () => {
    const store = makeStore({ getSession: jest.fn().mockResolvedValue(null) });
    const { connect } = setupHandlers(store);
    const { socket, fire } = connect();

    await fire('join-session', { sessionId: 'DEAD01', userName: 'Bob' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Session not found',
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('does NOT emit SESSION_NOT_FOUND when session exists', async () => {
    const session = {
      id: 'ABC123',
      title: 'Test',
      createdAt: Date.now(),
      status: 'active' as const,
      votingMethod: 'single' as const,
      options: [{ id: 'o1', name: 'A' }, { id: 'o2', name: 'B' }],
      votes: [],
      creatorId: 'creator-id',
    };
    const store = makeStore({
      getSession: jest.fn().mockResolvedValue(session),
      getUsers: jest.fn().mockResolvedValue(new Map()),
      getUserCount: jest.fn().mockResolvedValue(0),
    });
    const { connect } = setupHandlers(store);
    const { socket, fire } = connect();

    await fire('join-session', { sessionId: 'ABC123', userName: 'Charlie' });

    const errorCalls = (socket.emit as jest.Mock).mock.calls.filter(
      ([event, payload]) => event === 'error' && payload?.code === 'SESSION_NOT_FOUND'
    );
    expect(errorCalls).toHaveLength(0);
    expect(socket.emit).toHaveBeenCalledWith('session-joined', expect.objectContaining({ session }));
  });

  it('emits error for invalid session ID format (not 6 chars)', async () => {
    const store = makeStore();
    const { connect } = setupHandlers(store);
    const { socket, fire } = connect();

    await fire('join-session', { sessionId: 'SHORT', userName: 'Dave' });

    expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Invalid session ID' });
  });

  it('emits SESSION_NOT_FOUND when reconnecting with userId to nonexistent session', async () => {
    const store = makeStore({ getSession: jest.fn().mockResolvedValue(null) });
    const { connect } = setupHandlers(store);
    const { socket, fire } = connect();

    await fire('join-session', { sessionId: 'DEAD02', userName: '', userId: 'existing-user-id' });

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Session not found',
      code: 'SESSION_NOT_FOUND',
    });
  });
});
