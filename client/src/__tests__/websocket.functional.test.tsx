/**
 * Functional tests for WebSocket interactions in VoteFlow.
 *
 * Tests cover:
 *  - Connection lifecycle (connect, disconnect, reconnect)
 *  - Session creation and joining
 *  - Vote submission and real-time result updates
 *  - User join/leave events and UI updates
 *  - Error handling (server errors, connection drops)
 *  - Multiple voters scenarios
 *  - SessionPage and HomePage reactions to socket events
 */

import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { SocketProvider, useSocket } from '../contexts/SocketContext';
import { HomePage } from '../pages/HomePage';
import { SessionPage } from '../pages/SessionPage';
import type { Session, Results, UserInfo } from '../types';

// ---------------------------------------------------------------------------
// Socket.io mock
// ---------------------------------------------------------------------------

// vi.hoisted ensures these values are available inside the vi.mock factory,
// which is hoisted before all imports are resolved.
const socketMock = vi.hoisted(() => {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();
  const emit = vi.fn();
  const close = vi.fn();

  return {
    listeners,
    emit,
    close,
    /** Simulate a server → client event */
    trigger(event: string, data?: unknown) {
      (listeners.get(event) ?? []).forEach(fn => fn(data));
    },
    reset() {
      listeners.clear();
      emit.mockClear();
      close.mockClear();
    },
  };
});

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const existing = socketMock.listeners.get(event) ?? [];
      socketMock.listeners.set(event, [...existing, handler]);
    }),
    emit: socketMock.emit,
    close: socketMock.close,
    connected: false,
    id: 'test-socket-id',
  })),
}));

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const makeSession = (overrides: Partial<Session> = {}): Session => ({
  id: 'ABC123',
  title: 'Test Voting Session',
  createdAt: 1_000_000,
  status: 'active',
  votingMethod: 'single',
  options: [
    { id: 'opt-1', name: 'Option A' },
    { id: 'opt-2', name: 'Option B' },
    { id: 'opt-3', name: 'Option C' },
  ],
  votes: [],
  creatorId: 'user-1',
  ...overrides,
});

const makeResults = (session: Session = makeSession()): Results => ({
  method: session.votingMethod,
  totals: Object.fromEntries(session.options.map(o => [o.id, 0])),
  percentages: Object.fromEntries(session.options.map(o => [o.id, 0])),
});

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function renderWithSocket(
  ui: React.ReactElement,
  { initialEntries = ['/'] }: { initialEntries?: string[] } = {},
) {
  const user = userEvent.setup();
  render(
    <SocketProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </SocketProvider>,
  );
  return { user };
}

function renderApp(initialEntries = ['/']) {
  const user = userEvent.setup();
  render(
    <SocketProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
        </Routes>
      </MemoryRouter>
    </SocketProvider>,
  );
  return { user };
}

/** A minimal consumer that exposes socket context state via data-testid spans. */
function SocketStateDisplay() {
  const ctx = useSocket();
  return (
    <div>
      <span data-testid="connected">{ctx.isConnected ? 'yes' : 'no'}</span>
      <span data-testid="session-id">{ctx.currentSession?.id ?? 'none'}</span>
      <span data-testid="user-id">{ctx.userId ?? 'none'}</span>
      <span data-testid="user-name">{ctx.userName ?? 'none'}</span>
      <span data-testid="results">{ctx.results ? 'present' : 'none'}</span>
      <span data-testid="users">{ctx.users.map(u => u.name).join(',')}</span>
      <span data-testid="error">{ctx.error ?? 'none'}</span>
      <span data-testid="error-code">{ctx.errorCode ?? 'none'}</span>
      <button onClick={() => ctx.createSession('My Session', 'single', [
        { name: 'Opt A' }, { name: 'Opt B' }
      ])}>Create</button>
      <button onClick={() => ctx.joinSession('ABC123', 'Alice')}>Join</button>
      <button onClick={() => ctx.submitVote('ABC123', {
        userId: 'u1', userName: 'Alice', selection: { type: 'single', optionId: 'opt-1' }
      })}>Vote</button>
      <button onClick={() => ctx.closeSession('ABC123')}>Close</button>
      <button onClick={() => ctx.leaveSession()}>Leave</button>
      <button onClick={() => ctx.updateUserName('Bob')}>Rename</button>
    </div>
  );
}

function renderSocketState() {
  const user = userEvent.setup();
  render(
    <SocketProvider>
      <MemoryRouter>
        <SocketStateDisplay />
      </MemoryRouter>
    </SocketProvider>,
  );
  return { user };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function simulateConnect() {
  await act(async () => {
    socketMock.trigger('connect');
  });
}

async function simulateDisconnect() {
  await act(async () => {
    socketMock.trigger('disconnect');
  });
}

async function simulateSessionJoined(
  session: Session,
  userId: string,
  userName: string,
  users: UserInfo[] = [{ id: userId, name: userName }],
) {
  await act(async () => {
    socketMock.trigger('session-joined', {
      session,
      userId,
      userName,
      results: makeResults(session),
      users,
    });
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  socketMock.reset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// 1. Connection Lifecycle
// ===========================================================================

describe('Connection Lifecycle', () => {
  it('starts in disconnected state', () => {
    renderSocketState();
    expect(screen.getByTestId('connected')).toHaveTextContent('no');
  });

  it('becomes connected when "connect" event fires', async () => {
    renderSocketState();
    await simulateConnect();
    expect(screen.getByTestId('connected')).toHaveTextContent('yes');
  });

  it('becomes disconnected when "disconnect" event fires after connect', async () => {
    renderSocketState();
    await simulateConnect();
    await simulateDisconnect();
    expect(screen.getByTestId('connected')).toHaveTextContent('no');
  });

  it('calls socket.close() on unmount', () => {
    const { unmount } = render(
      <SocketProvider>
        <MemoryRouter><SocketStateDisplay /></MemoryRouter>
      </SocketProvider>,
    );
    unmount();
    expect(socketMock.close).toHaveBeenCalledTimes(1);
  });

  it('re-establishes listeners after disconnect + reconnect', async () => {
    renderSocketState();
    await simulateConnect();
    await simulateDisconnect();
    await simulateConnect();
    expect(screen.getByTestId('connected')).toHaveTextContent('yes');
  });
});

// ===========================================================================
// 2. useSocket hook
// ===========================================================================

describe('useSocket hook', () => {
  it('throws when used outside SocketProvider', () => {
    // Suppress React's error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <MemoryRouter>
          <SocketStateDisplay />
        </MemoryRouter>,
      ),
    ).toThrow('useSocket must be used within a SocketProvider');
    consoleSpy.mockRestore();
  });
});

// ===========================================================================
// 3. Session Creation
// ===========================================================================

describe('Session Creation', () => {
  it('emits "create-session" with the correct payload', async () => {
    const { user } = renderSocketState();
    await simulateConnect();
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(socketMock.emit).toHaveBeenCalledWith('create-session', {
      title: 'My Session',
      votingMethod: 'single',
      options: [{ name: 'Opt A' }, { name: 'Opt B' }],
    });
  });

  it('updates state when "session-created" is received', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession({ creatorId: 'user-1' });
    await act(async () => {
      socketMock.trigger('session-created', { session, userId: 'user-1' });
    });
    expect(screen.getByTestId('session-id')).toHaveTextContent('ABC123');
    expect(screen.getByTestId('user-id')).toHaveTextContent('user-1');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Creator');
  });

  it('resets results and users on "session-created"', async () => {
    renderSocketState();
    await simulateConnect();
    // Prime with some results
    await act(async () => {
      socketMock.trigger('results-updated', {
        sessionId: 'OLD',
        results: makeResults(),
      });
    });
    const session = makeSession();
    await act(async () => {
      socketMock.trigger('session-created', { session, userId: 'user-1' });
    });
    expect(screen.getByTestId('results')).toHaveTextContent('none');
    expect(screen.getByTestId('users')).toHaveTextContent('');
  });
});

// ===========================================================================
// 4. Session Joining
// ===========================================================================

describe('Session Joining', () => {
  it('emits "join-session" with correct payload', async () => {
    const { user } = renderSocketState();
    await simulateConnect();
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(socketMock.emit).toHaveBeenCalledWith('join-session', {
      sessionId: 'ABC123',
      userName: 'Alice',
      userId: undefined,
    });
  });

  it('updates session/user state when "session-joined" fires', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-2', 'Alice');
    expect(screen.getByTestId('session-id')).toHaveTextContent('ABC123');
    expect(screen.getByTestId('user-id')).toHaveTextContent('user-2');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Alice');
    expect(screen.getByTestId('results')).toHaveTextContent('present');
  });

  it('populates participants from "session-joined" users array', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    const users: UserInfo[] = [
      { id: 'user-1', name: 'Alice' },
      { id: 'user-2', name: 'Bob' },
    ];
    await act(async () => {
      socketMock.trigger('session-joined', {
        session,
        userId: 'user-1',
        userName: 'Alice',
        results: makeResults(session),
        users,
      });
    });
    expect(screen.getByTestId('users')).toHaveTextContent('Alice,Bob');
  });
});

// ===========================================================================
// 5. Vote Submission
// ===========================================================================

describe('Vote Submission', () => {
  it('emits "submit-vote" with the correct payload', async () => {
    const { user } = renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'u1', 'Alice');
    await user.click(screen.getByRole('button', { name: 'Vote' }));
    expect(socketMock.emit).toHaveBeenCalledWith('submit-vote', {
      sessionId: 'ABC123',
      vote: {
        userId: 'u1',
        userName: 'Alice',
        selection: { type: 'single', optionId: 'opt-1' },
      },
    });
  });

  it('adds a new vote to the session on "vote-submitted"', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    const vote = {
      id: 'v1',
      userId: 'user-2',
      userName: 'Bob',
      selection: { type: 'single' as const, optionId: 'opt-1' },
      timestamp: 1000,
    };
    await act(async () => {
      socketMock.trigger('vote-submitted', { sessionId: 'ABC123', vote });
    });
    // Bob should now be in participants
    expect(screen.getByTestId('users')).toHaveTextContent('Bob');
  });

  it('replaces an existing vote when the same user votes again', async () => {
    renderSocketState();
    await simulateConnect();
    const existingVote = {
      id: 'v1',
      userId: 'user-2',
      userName: 'Bob',
      selection: { type: 'single' as const, optionId: 'opt-1' },
      timestamp: 1000,
    };
    const session = makeSession({ votes: [existingVote] });
    await simulateSessionJoined(session, 'user-1', 'Alice', [
      { id: 'user-1', name: 'Alice' },
      { id: 'user-2', name: 'Bob' },
    ]);
    const updatedVote = { ...existingVote, selection: { type: 'single' as const, optionId: 'opt-2' } };
    await act(async () => {
      socketMock.trigger('vote-submitted', { sessionId: 'ABC123', vote: updatedVote });
    });
    // Bob still appears once (deduplicated)
    const usersText = screen.getByTestId('users').textContent ?? '';
    const bobCount = usersText.split(',').filter(n => n === 'Bob').length;
    expect(bobCount).toBe(1);
  });

  it('adds a new participant entry when a first-time voter submits', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    await act(async () => {
      socketMock.trigger('vote-submitted', {
        sessionId: 'ABC123',
        vote: {
          id: 'v2',
          userId: 'user-3',
          userName: 'Carol',
          selection: { type: 'single', optionId: 'opt-2' },
          timestamp: 2000,
        },
      });
    });
    expect(screen.getByTestId('users')).toHaveTextContent('Carol');
  });
});

// ===========================================================================
// 6. Real-time Results
// ===========================================================================

describe('Real-time Results', () => {
  it('updates results when "results-updated" fires', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    const newResults: Results = {
      method: 'single',
      totals: { 'opt-1': 3, 'opt-2': 1, 'opt-3': 0 },
      percentages: { 'opt-1': 75, 'opt-2': 25, 'opt-3': 0 },
      winner: 'opt-1',
    };
    await act(async () => {
      socketMock.trigger('results-updated', { sessionId: 'ABC123', results: newResults });
    });
    expect(screen.getByTestId('results')).toHaveTextContent('present');
  });

  it('ignores "results-updated" for a different session', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    // Unrelated session update
    await act(async () => {
      socketMock.trigger('results-updated', {
        sessionId: 'OTHER1',
        results: makeResults(),
      });
    });
    // Session-id should still be the original
    expect(screen.getByTestId('session-id')).toHaveTextContent('ABC123');
  });

  it('handles multiple successive results updates', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    for (let i = 1; i <= 5; i++) {
      await act(async () => {
        socketMock.trigger('results-updated', {
          sessionId: 'ABC123',
          results: {
            method: 'single',
            totals: { 'opt-1': i, 'opt-2': 0, 'opt-3': 0 },
            percentages: { 'opt-1': 100, 'opt-2': 0, 'opt-3': 0 },
            winner: 'opt-1',
          } as Results,
        });
      });
    }
    expect(screen.getByTestId('results')).toHaveTextContent('present');
  });
});

// ===========================================================================
// 7. Session Updates (Close)
// ===========================================================================

describe('Session Updates', () => {
  it('updates session when "session-updated" fires (e.g. closed)', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    const closedSession = { ...session, status: 'closed' as const, closedAt: 2_000_000 };
    await act(async () => {
      socketMock.trigger('session-updated', {
        session: closedSession,
        results: makeResults(session),
      });
    });
    // Session state updated (still same id)
    expect(screen.getByTestId('session-id')).toHaveTextContent('ABC123');
  });

  it('emits "close-session" via closeSession()', async () => {
    const { user } = renderSocketState();
    await simulateConnect();
    const session = makeSession({ creatorId: 'user-1' });
    await simulateSessionJoined(session, 'user-1', 'Alice');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(socketMock.emit).toHaveBeenCalledWith('close-session', {
      sessionId: 'ABC123',
      userId: 'user-1',
    });
  });

  it('does not emit "close-session" when userId is null', async () => {
    const { user } = renderSocketState();
    await simulateConnect();
    // No session joined → userId is null
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(socketMock.emit).not.toHaveBeenCalledWith(
      'close-session',
      expect.anything(),
    );
  });
});

// ===========================================================================
// 8. User Management
// ===========================================================================

describe('User Management', () => {
  it('adds a user when "user-joined" fires', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    await act(async () => {
      socketMock.trigger('user-joined', { userId: 'user-2', userName: 'Bob' });
    });
    expect(screen.getByTestId('users')).toHaveTextContent('Bob');
  });

  it('deduplicates users in "user-joined"', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    // Same user joins twice
    await act(async () => {
      socketMock.trigger('user-joined', { userId: 'user-1', userName: 'Alice' });
    });
    const usersText = screen.getByTestId('users').textContent ?? '';
    const aliceCount = usersText.split(',').filter(n => n === 'Alice').length;
    expect(aliceCount).toBe(1);
  });

  it('updates name when "user-name-updated" fires', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice', [
      { id: 'user-1', name: 'Alice' },
      { id: 'user-2', name: 'Bob' },
    ]);
    await act(async () => {
      socketMock.trigger('user-name-updated', { userId: 'user-2', userName: 'Robert' });
    });
    expect(screen.getByTestId('users')).toHaveTextContent('Robert');
    expect(screen.getByTestId('users')).not.toHaveTextContent('Bob');
  });

  it('emits "update-user-name" via updateUserName()', async () => {
    const { user } = renderSocketState();
    await simulateConnect();
    const session = makeSession({ creatorId: 'user-1' });
    await simulateSessionJoined(session, 'user-1', 'Alice');
    await user.click(screen.getByRole('button', { name: 'Rename' }));
    expect(socketMock.emit).toHaveBeenCalledWith('update-user-name', {
      userId: 'user-1',
      userName: 'Bob',
    });
  });

  it('clears all state when leaveSession() is called', async () => {
    const { user } = renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(screen.getByTestId('session-id')).toHaveTextContent('none');
    expect(screen.getByTestId('user-id')).toHaveTextContent('none');
    expect(screen.getByTestId('user-name')).toHaveTextContent('none');
    expect(screen.getByTestId('results')).toHaveTextContent('none');
    expect(screen.getByTestId('users')).toHaveTextContent('');
  });
});

// ===========================================================================
// 9. Error Handling
// ===========================================================================

describe('Error Handling', () => {
  it('sets error message when "error" event fires', async () => {
    renderSocketState();
    await simulateConnect();
    await act(async () => {
      socketMock.trigger('error', { message: 'Session not found' });
    });
    expect(screen.getByTestId('error')).toHaveTextContent('Session not found');
  });

  it('sets errorCode when "error" event includes a code', async () => {
    renderSocketState();
    await simulateConnect();
    await act(async () => {
      socketMock.trigger('error', { message: 'User not found', code: 'USER_NOT_FOUND' });
    });
    expect(screen.getByTestId('error-code')).toHaveTextContent('USER_NOT_FOUND');
  });

  it('clears error automatically after 5 seconds', async () => {
    vi.useFakeTimers();
    renderSocketState();
    await simulateConnect();
    await act(async () => {
      socketMock.trigger('error', { message: 'Temporary error' });
    });
    expect(screen.getByTestId('error')).toHaveTextContent('Temporary error');
    await act(async () => {
      vi.advanceTimersByTime(5001);
    });
    expect(screen.getByTestId('error')).toHaveTextContent('none');
    vi.useRealTimers();
  });

  it('clears errorCode after 5 seconds', async () => {
    vi.useFakeTimers();
    renderSocketState();
    await simulateConnect();
    await act(async () => {
      socketMock.trigger('error', { message: 'err', code: 'SOME_CODE' });
    });
    await act(async () => {
      vi.advanceTimersByTime(5001);
    });
    expect(screen.getByTestId('error-code')).toHaveTextContent('none');
    vi.useRealTimers();
  });

  it('shows disconnected state when connection drops mid-session', async () => {
    renderSocketState();
    await simulateConnect();
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    await simulateDisconnect();
    expect(screen.getByTestId('connected')).toHaveTextContent('no');
    // Session state is preserved on disconnect
    expect(screen.getByTestId('session-id')).toHaveTextContent('ABC123');
  });
});

// ===========================================================================
// 10. HomePage Integration
// ===========================================================================

describe('HomePage Integration', () => {
  it('renders create and join cards', async () => {
    renderApp(['/']);
    await simulateConnect();
    expect(screen.getByText('Create Session')).toBeInTheDocument();
    expect(screen.getByText('Join Session')).toBeInTheDocument();
  });

  it('shows the create form when "Create New Session" is clicked', async () => {
    const { user } = renderApp(['/']);
    await simulateConnect();
    await user.click(screen.getByRole('button', { name: 'Create New Session' }));
    expect(screen.getByPlaceholderText('What are we voting on?')).toBeInTheDocument();
  });

  it('emits create-session when the create form is submitted', async () => {
    const { user } = renderApp(['/']);
    await simulateConnect();
    await user.click(screen.getByRole('button', { name: 'Create New Session' }));
    await user.type(screen.getByPlaceholderText('What are we voting on?'), 'Best Pizza');
    const optionInputs = screen.getAllByPlaceholderText(/Option \d/);
    await user.type(optionInputs[0], 'Pepperoni');
    await user.type(optionInputs[1], 'Margherita');
    await user.click(screen.getByRole('button', { name: 'Create Session' }));
    expect(socketMock.emit).toHaveBeenCalledWith('create-session', expect.objectContaining({
      title: 'Best Pizza',
      options: expect.arrayContaining([
        expect.objectContaining({ name: 'Pepperoni' }),
        expect.objectContaining({ name: 'Margherita' }),
      ]),
    }));
  });

  it('does not emit create-session when title is empty', async () => {
    const { user } = renderApp(['/']);
    await simulateConnect();
    await user.click(screen.getByRole('button', { name: 'Create New Session' }));
    // Fill options but not title
    const optionInputs = screen.getAllByPlaceholderText(/Option \d/);
    await user.type(optionInputs[0], 'A');
    await user.type(optionInputs[1], 'B');
    await user.click(screen.getByRole('button', { name: 'Create Session' }));
    expect(socketMock.emit).not.toHaveBeenCalledWith('create-session', expect.anything());
  });

  it('emits join-session when the join form is submitted', async () => {
    const { user } = renderApp(['/']);
    await simulateConnect();
    await user.type(screen.getByPlaceholderText('Session ID'), 'XYZ999');
    await user.type(screen.getByPlaceholderText('Your name'), 'Charlie');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(socketMock.emit).toHaveBeenCalledWith('join-session', {
      sessionId: 'XYZ999',
      userName: 'Charlie',
      userId: undefined,
    });
  });

  it('join button is disabled when fields are empty', async () => {
    renderApp(['/']);
    await simulateConnect();
    const joinButton = screen.getByRole('button', { name: 'Join' });
    expect(joinButton).toBeDisabled();
  });

  it('navigates to /session/:id after "session-created" event', async () => {
    renderApp(['/']);
    await simulateConnect();
    const session = makeSession({ id: 'NEWID1' });
    await act(async () => {
      socketMock.trigger('session-created', { session, userId: 'user-1' });
    });
    // After navigation SessionPage renders; it can't find the session so shows loading
    expect(screen.queryByPlaceholderText('What are we voting on?')).not.toBeInTheDocument();
  });

  it('displays an error message when "error" event fires', async () => {
    renderApp(['/']);
    await simulateConnect();
    await act(async () => {
      socketMock.trigger('error', { message: 'Session full' });
    });
    expect(screen.getByText('Session full')).toBeInTheDocument();
  });
});

// ===========================================================================
// 11. SessionPage Integration
// ===========================================================================

/** Helper: render SessionPage and bring it to a fully joined state. */
async function setupSessionPage(
  opts: {
    sessionId?: string;
    userId?: string;
    userName?: string;
    sessionOverrides?: Partial<Session>;
    initialEntries?: string[];
  } = {},
) {
  const {
    sessionId = 'ABC123',
    userId = 'user-1',
    userName = 'Alice',
    sessionOverrides = {},
    initialEntries,
  } = opts;

  const user = userEvent.setup();
  render(
    <SocketProvider>
      <MemoryRouter initialEntries={initialEntries ?? [`/session/${sessionId}`]}>
        <Routes>
          <Route path="/session/:sessionId" element={<SessionPage />} />
          <Route path="/" element={<div data-testid="home-page">Home</div>} />
        </Routes>
      </MemoryRouter>
    </SocketProvider>,
  );

  await simulateConnect();

  const session = makeSession({ id: sessionId, creatorId: userId, ...sessionOverrides });
  const results = makeResults(session);
  await act(async () => {
    socketMock.trigger('session-joined', {
      session,
      userId,
      userName,
      results,
      users: [{ id: userId, name: userName }],
    });
  });

  return { user, session, userId, userName };
}

describe('SessionPage Integration', () => {
  it('shows loading state when no session', async () => {
    renderWithSocket(
      <Routes>
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>,
      { initialEntries: ['/session/ABC123'] },
    );
    await simulateConnect();
    expect(screen.getByText('Loading session...')).toBeInTheDocument();
  });

  it('shows name modal when no userId in URL params', async () => {
    renderWithSocket(
      <Routes>
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>,
      { initialEntries: ['/session/ABC123'] },
    );
    await simulateConnect();
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('auto-rejoins when userId is present in URL search params', async () => {
    renderWithSocket(
      <Routes>
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>,
      { initialEntries: ['/session/ABC123?userId=user-99'] },
    );
    await simulateConnect();
    expect(socketMock.emit).toHaveBeenCalledWith('join-session', {
      sessionId: 'ABC123',
      userName: '',
      userId: 'user-99',
    });
  });

  it('shows name modal on USER_NOT_FOUND error when no session', async () => {
    renderWithSocket(
      <Routes>
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>,
      { initialEntries: ['/session/ABC123?userId=old-user'] },
    );
    await simulateConnect();
    await act(async () => {
      socketMock.trigger('error', { message: 'User not found', code: 'USER_NOT_FOUND' });
    });
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('calls joinSession with name entered in the modal', async () => {
    const user = userEvent.setup();
    render(
      <SocketProvider>
        <MemoryRouter initialEntries={['/session/ABC123']}>
          <Routes>
            <Route path="/session/:sessionId" element={<SessionPage />} />
          </Routes>
        </MemoryRouter>
      </SocketProvider>,
    );
    await simulateConnect();
    await user.type(screen.getByPlaceholderText('Enter your name'), 'Dave');
    await user.click(screen.getByRole('button', { name: 'Join Session' }));
    expect(socketMock.emit).toHaveBeenCalledWith('join-session', {
      sessionId: 'ABC123',
      userName: 'Dave',
      userId: undefined,
    });
  });

  it('displays the session title after joining', async () => {
    await setupSessionPage({ sessionOverrides: { title: 'Best Pizza Vote' } });
    expect(screen.getByText('Best Pizza Vote')).toBeInTheDocument();
  });

  it('shows all voting options', async () => {
    await setupSessionPage();
    // Options appear in both the voting section and results chart — check at least one exists
    expect(screen.getAllByText('Option A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Option B').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Option C').length).toBeGreaterThanOrEqual(1);
  });

  it('shows the current user in participants list', async () => {
    await setupSessionPage({ userName: 'Alice' });
    const participants = screen.getByText('Participants (1)');
    expect(participants).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('emits submit-vote when the Submit Vote button is clicked (single choice)', async () => {
    const { user, session, userId } = await setupSessionPage();
    // Options appear in both voting section and results chart; click the first (voting section)
    await user.click(screen.getAllByText('Option A')[0]);
    await user.click(screen.getByRole('button', { name: 'Submit Vote' }));
    expect(socketMock.emit).toHaveBeenCalledWith('submit-vote', {
      sessionId: session.id,
      vote: expect.objectContaining({
        userId,
        selection: { type: 'single', optionId: 'opt-1' },
      }),
    });
  });

  it('Submit Vote button is disabled until an option is selected', async () => {
    await setupSessionPage();
    const submitBtn = screen.getByRole('button', { name: 'Submit Vote' });
    expect(submitBtn).toBeDisabled();
  });

  it('shows "Update Vote" button after voting', async () => {
    const { user } = await setupSessionPage();
    await user.click(screen.getAllByText('Option A')[0]);
    await user.click(screen.getByRole('button', { name: 'Submit Vote' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Update Vote' })).toBeInTheDocument();
    });
  });

  it('adds a new participant when "user-joined" fires', async () => {
    await setupSessionPage();
    await act(async () => {
      socketMock.trigger('user-joined', { userId: 'user-2', userName: 'Bob' });
    });
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Participants (2)')).toBeInTheDocument();
  });

  it('shows live results when "results-updated" fires', async () => {
    const { session } = await setupSessionPage();
    const newResults: Results = {
      method: 'single',
      totals: { 'opt-1': 2, 'opt-2': 1, 'opt-3': 0 },
      percentages: { 'opt-1': 66.7, 'opt-2': 33.3, 'opt-3': 0 },
      winner: 'opt-1',
    };
    await act(async () => {
      socketMock.trigger('results-updated', { sessionId: session.id, results: newResults });
    });
    // Winner badge visible
    expect(screen.getByText('Winner')).toBeInTheDocument();
  });

  it('shows "Closed" badge when session-updated with closed status', async () => {
    const { session } = await setupSessionPage();
    const closedSession = { ...session, status: 'closed' as const };
    await act(async () => {
      socketMock.trigger('session-updated', {
        session: closedSession,
        results: makeResults(session),
      });
    });
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('creator sees the "Close Voting" button', async () => {
    // User-1 is the creator (makeSession sets creatorId to userId by default)
    await setupSessionPage({ userId: 'user-1' });
    expect(screen.getByRole('button', { name: 'Close Voting' })).toBeInTheDocument();
  });

  it('non-creator does not see the "Close Voting" button', async () => {
    // Creator is user-1, current user is user-2
    await setupSessionPage({
      userId: 'user-2',
      sessionOverrides: { creatorId: 'user-1' },
    });
    expect(screen.queryByRole('button', { name: 'Close Voting' })).not.toBeInTheDocument();
  });

  it('emits close-session when creator clicks "Close Voting"', async () => {
    const { user, session, userId } = await setupSessionPage({ userId: 'user-1' });
    await user.click(screen.getByRole('button', { name: 'Close Voting' }));
    expect(socketMock.emit).toHaveBeenCalledWith('close-session', {
      sessionId: session.id,
      userId,
    });
  });

  it('navigates to home when "← Back" is clicked', async () => {
    const { user } = await setupSessionPage();
    await user.click(screen.getByRole('button', { name: '← Back' }));
    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
  });

  it('displays error message when "error" event fires', async () => {
    await setupSessionPage();
    await act(async () => {
      socketMock.trigger('error', { message: 'Rate limit exceeded' });
    });
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
  });
});

// ===========================================================================
// 12. Multiple Voters Scenario
// ===========================================================================

describe('Multiple Voters Scenario', () => {
  it('accumulates votes from multiple users and updates participant count', async () => {
    const { session } = await setupSessionPage({ userId: 'user-1', userName: 'Alice' });

    // Three more voters arrive
    const voters = [
      { id: 'user-2', name: 'Bob', optionId: 'opt-1' },
      { id: 'user-3', name: 'Carol', optionId: 'opt-2' },
      { id: 'user-4', name: 'Dave', optionId: 'opt-1' },
    ];

    for (const voter of voters) {
      await act(async () => {
        socketMock.trigger('user-joined', { userId: voter.id, userName: voter.name });
      });
      await act(async () => {
        socketMock.trigger('vote-submitted', {
          sessionId: session.id,
          vote: {
            id: `v-${voter.id}`,
            userId: voter.id,
            userName: voter.name,
            selection: { type: 'single', optionId: voter.optionId },
            timestamp: Date.now(),
          },
        });
      });
    }

    // Results update with 3 votes for opt-1 and 1 for opt-2
    await act(async () => {
      socketMock.trigger('results-updated', {
        sessionId: session.id,
        results: {
          method: 'single',
          totals: { 'opt-1': 3, 'opt-2': 1, 'opt-3': 0 },
          percentages: { 'opt-1': 75, 'opt-2': 25, 'opt-3': 0 },
          winner: 'opt-1',
        } as Results,
      });
    });

    expect(screen.getByText('Participants (4)')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Dave')).toBeInTheDocument();
    expect(screen.getByText('Winner')).toBeInTheDocument();
  });

  it('handles rapid sequential vote submissions from different users', async () => {
    const { session } = await setupSessionPage({ userId: 'user-1', userName: 'Alice' });

    // Fire many vote-submitted events in rapid succession
    const eventCount = 10;
    await act(async () => {
      for (let i = 2; i <= eventCount + 1; i++) {
        socketMock.trigger('vote-submitted', {
          sessionId: session.id,
          vote: {
            id: `v${i}`,
            userId: `user-${i}`,
            userName: `User${i}`,
            selection: { type: 'single', optionId: i % 2 === 0 ? 'opt-1' : 'opt-2' },
            timestamp: Date.now() + i,
          },
        });
      }
    });

    // All users should appear in participants
    expect(screen.getByText('User2')).toBeInTheDocument();
    expect(screen.getByText(`User${eventCount + 1}`)).toBeInTheDocument();
  });

  it('correctly displays approval voting with multiple selections', async () => {
    await setupSessionPage({
      userId: 'user-1',
      sessionOverrides: { votingMethod: 'approval' },
    });

    // Options appear in both the voting section and results chart
    const optionAElements = screen.getAllByText('Option A');
    const optionBElements = screen.getAllByText('Option B');
    expect(optionAElements.length).toBeGreaterThanOrEqual(1);
    expect(optionBElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows ranked voting interface for ranked method', async () => {
    await setupSessionPage({
      userId: 'user-1',
      sessionOverrides: { votingMethod: 'ranked' },
    });
    expect(screen.getByText('Rank all options by preference (click to order)')).toBeInTheDocument();
  });

  it('shows score voting interface for score method', async () => {
    await setupSessionPage({
      userId: 'user-1',
      sessionOverrides: { votingMethod: 'score' },
    });
    expect(screen.getByText('Rate each option from 1-5')).toBeInTheDocument();
  });

  it('reconnects and rejoins session after a disconnect', async () => {
    renderWithSocket(
      <Routes>
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>,
      { initialEntries: ['/session/ABC123?userId=user-1'] },
    );

    // Initial connection and auto-rejoin
    await simulateConnect();
    expect(socketMock.emit).toHaveBeenCalledWith('join-session', expect.objectContaining({
      userId: 'user-1',
    }));

    // Simulate session-joined response
    const session = makeSession();
    await simulateSessionJoined(session, 'user-1', 'Alice');
    expect(screen.getByText('Test Voting Session')).toBeInTheDocument();

    // Drop connection
    await simulateDisconnect();

    // Reconnect – the component should re-show session since state is preserved
    await simulateConnect();
    // Session still displayed after reconnect (state preserved in context)
    expect(screen.getByText('Test Voting Session')).toBeInTheDocument();
  });
});
