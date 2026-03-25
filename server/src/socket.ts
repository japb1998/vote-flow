import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  Vote,
  CreateSessionPayload,
  JoinSessionPayload,
  SubmitVotePayload,
  Option
} from './types';
import { generateSessionId, sanitizeInput, sanitizeOptionName, sanitizeOptionDescription, validateSessionPayload, canCreateSession, canJoinSession } from './utils/helpers';
import { calculateResults } from './voting/calculate';
import { SessionStore } from './store';

const CLOSED_SESSION_TTL = 30 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 1000;

export function setupSocketHandlers(io: Server, store: SessionStore): void {
  io.on('connection', (socket: Socket) => {
    const clientIp = (socket.handshake.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? socket.handshake.address;
    console.log(`Client connected: ${socket.id}`);

    socket.on('create-session', async (payload: CreateSessionPayload) => {
      try {
        if (!validateSessionPayload(payload).valid) {
          socket.emit('error', { message: validateSessionPayload(payload).error || 'Invalid payload' });
          return;
        }

        const activeCount = await store.getActiveSessionCount();
        if (!canCreateSession(activeCount)) {
          socket.emit('error', { message: 'Server is at maximum capacity' });
          return;
        }

        const ipCount = await store.getIpSessionCount(clientIp);
        if (ipCount >= 5) {
          socket.emit('error', { message: 'Too many sessions created from this IP' });
          return;
        }

        const { title, votingMethod, options } = payload;
        const sessionId = generateSessionId();
        const creatorId = uuidv4();

        const sanitizedOptions: Option[] = options.map(opt => ({
          id: uuidv4(),
          name: sanitizeOptionName(opt.name),
          description: sanitizeOptionDescription(opt.description)
        }));

        const session: Session = {
          id: sessionId,
          title: sanitizeInput(title),
          createdAt: Date.now(),
          status: 'active',
          votingMethod,
          options: sanitizedOptions,
          votes: [],
          creatorId
        };

        await store.createSession(session);
        await store.addUser(sessionId, { id: creatorId, name: 'Creator', socketId: socket.id });
        await store.incrementIpSessionCount(clientIp);

        socket.join(sessionId);
        socket.emit('session-created', { session, userId: creatorId });
        console.log(`Session created: ${sessionId}`);
      } catch (error) {
        console.error('Error creating session:', error);
        socket.emit('error', { message: 'Failed to create session' });
      }
    });

    socket.on('join-session', async (payload: JoinSessionPayload) => {
      try {
        const { sessionId, userName, userId: existingUserId } = payload;

        if (!sessionId || typeof sessionId !== 'string' || sessionId.length !== 6) {
          socket.emit('error', { message: 'Invalid session ID', code: 'INVALID_SESSION_ID' });
          return;
        }

        const normalizedId = sessionId.toUpperCase();
        const session = await store.getSession(normalizedId);
        if (!session) {
          socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
          return;
        }

        let userId = existingUserId;
        let resolvedName: string;

        // Try to reconnect with existing userId
        if (userId) {
          const existingUser = await store.getUser(session.id, userId);
          if (existingUser) {
            // Reconnect: update socket, optionally update name
            resolvedName = userName?.trim() ? sanitizeInput(userName) : existingUser.name;
            await store.updateUser(session.id, userId, { name: resolvedName, socketId: socket.id });
          } else {
            // userId not found in this session — closed sessions don't accept new participants
            if (session.status === 'closed') {
              socket.emit('error', { message: 'This session has ended', code: 'SESSION_CLOSED' });
              return;
            }
            // treat as new user
            if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
              socket.emit('error', { message: 'User not found in session', code: 'USER_NOT_FOUND' });
              return;
            }
            const userCount = await store.getUserCount(session.id);
            if (!canJoinSession(userCount)) {
              socket.emit('error', { message: 'Session is full' });
              return;
            }
            userId = uuidv4();
            resolvedName = sanitizeInput(userName);
            await store.addUser(session.id, { id: userId, name: resolvedName, socketId: socket.id });
          }
        } else {
          // No userId — new user; closed sessions don't accept new participants
          if (session.status === 'closed') {
            socket.emit('error', { message: 'This session has ended', code: 'SESSION_CLOSED' });
            return;
          }
          if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
            socket.emit('error', { message: 'User name is required' });
            return;
          }
          const userCount = await store.getUserCount(session.id);
          if (!canJoinSession(userCount)) {
            socket.emit('error', { message: 'Session is full' });
            return;
          }
          userId = uuidv4();
          resolvedName = sanitizeInput(userName);
          await store.addUser(session.id, { id: userId, name: resolvedName, socketId: socket.id });
        }

        socket.join(session.id);

        const results = calculateResults(
          session.votes,
          session.options.map(o => o.id),
          session.votingMethod
        );

        const usersMap = await store.getUsers(session.id);
        const usersList = Array.from(usersMap.values()).map(u => ({ id: u.id, name: u.name }));

        socket.emit('session-joined', { session, userId, userName: resolvedName, results, users: usersList });
        socket.to(session.id).emit('user-joined', { userId, userName: resolvedName });
        console.log(`User ${resolvedName} joined session ${session.id}`);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    socket.on('submit-vote', async (payload: SubmitVotePayload) => {
      try {
        const { sessionId, vote } = payload;

        if (!sessionId || !vote || typeof vote !== 'object') {
          socket.emit('error', { message: 'Invalid vote payload' });
          return;
        }

        const session = await store.getSession(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
          return;
        }

        if (session.status !== 'active') {
          socket.emit('error', { message: 'Voting is closed' });
          return;
        }

        if (!vote.userId || typeof vote.userId !== 'string' || !vote.selection) {
          socket.emit('error', { message: 'Invalid vote data' });
          return;
        }

        const user = await store.getUser(sessionId, vote.userId);
        if (!user) {
          socket.emit('error', { message: 'User not found in session' });
          return;
        }

        const voteId = uuidv4();
        const savedVote: Vote = {
          id: voteId,
          userId: vote.userId,
          userName: user.name,
          selection: vote.selection,
          timestamp: Date.now()
        };

        await store.upsertVote(sessionId, savedVote);

        const votes = await store.getVotes(sessionId);
        const results = calculateResults(
          votes,
          session.options.map(o => o.id),
          session.votingMethod
        );

        io.to(sessionId).emit('vote-submitted', { sessionId, vote: savedVote });
        io.to(sessionId).emit('results-updated', { sessionId, results });
        console.log(`Vote submitted in session ${sessionId}`);
      } catch (error) {
        console.error('Error submitting vote:', error);
        socket.emit('error', { message: 'Failed to submit vote' });
      }
    });

    socket.on('close-session', async (payload: { sessionId: string; userId: string }) => {
      try {
        const { sessionId, userId } = payload;

        const session = await store.getSession(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
          return;
        }

        if (session.creatorId !== userId) {
          socket.emit('error', { message: 'Only the creator can close the session' });
          return;
        }

        const now = Date.now();
        await store.updateSession(sessionId, { status: 'closed', closedAt: now });

        session.status = 'closed';
        session.closedAt = now;

        const results = calculateResults(
          session.votes,
          session.options.map(o => o.id),
          session.votingMethod
        );

        io.to(sessionId).emit('session-updated', { session, results });
        console.log(`Session ${sessionId} closed`);
      } catch (error) {
        console.error('Error closing session:', error);
        socket.emit('error', { message: 'Failed to close session' });
      }
    });

    socket.on('update-user-name', async (payload: { userId: string; userName: string }) => {
      try {
        const { userId, userName } = payload;
        const sanitizedName = sanitizeInput(userName);

        const sessionIds = await store.findUserSessions(userId);
        for (const sessionId of sessionIds) {
          await store.updateUser(sessionId, userId, { name: sanitizedName });
          socket.to(sessionId).emit('user-name-updated', { userId, userName: sanitizedName });
        }
      } catch (error) {
        console.error('Error updating user name:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      try {
        // Clear the socketId but keep the user in the session — they can rejoin
        await store.removeUserBySocketId(socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  // Periodic cleanup of expired sessions
  setInterval(async () => {
    try {
      const cleaned = await store.cleanupExpiredSessions(CLOSED_SESSION_TTL);
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired sessions`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }, CLEANUP_INTERVAL);
}
