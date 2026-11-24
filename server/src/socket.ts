import crypto from 'crypto';
import { Server, Socket } from 'socket.io';
import {
  Session,
  Vote,
  CreateSessionPayload,
  JoinSessionPayload,
  LeaveSessionPayload,
  SubmitVotePayload,
  Option
} from './types';
import {
  NO_OPTIONS_METHODS,
  generateSessionId,
  sanitizeInput,
  sanitizeOptionName,
  sanitizeOptionDescription,
  validateSessionPayload,
  validateVoteSelection,
  canCreateSession,
  canJoinSession
} from './utils/helpers';
import { calculateResults } from './voting';
import { SessionStore } from './store';

const ACTIVE_SESSION_TTL = parseInt(process.env.ACTIVE_SESSION_TTL ?? '', 10) || 24 * 60 * 60 * 1000; // 24 hours
const CLOSED_SESSION_TTL = parseInt(process.env.CLOSED_SESSION_TTL ?? '', 10) || 30 * 60 * 1000;     // 30 minutes
const MAX_SESSION_ID_ATTEMPTS = 10;

function tokensMatch(provided: string | undefined, expected: string): boolean {
  if (typeof provided !== 'string') return false;
  const bufA = Buffer.from(provided);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function resolveClientIp(socket: Socket): string {
  const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
  if (trustProxy) {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]?.split(',')[0]?.trim()
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    if (forwardedIp) {
      return forwardedIp;
    }
  }
  return socket.handshake.address;
}

export function setupSocketHandlers(io: Server, store: SessionStore): void {
  io.on('connection', (socket: Socket) => {
    const clientIp = resolveClientIp(socket);
    // Maps normalized sessionId -> authenticated userId bound to this socket
    const joinedSessions = new Map<string, string>();
    console.log(`Client connected: ${socket.id}`);

    socket.on('create-session', async (payload: CreateSessionPayload) => {
      try {
        const validation = validateSessionPayload(payload);
        if (!validation.valid) {
          socket.emit('error', { message: validation.error || 'Invalid payload' });
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

        let sessionId: string | null = null;
        for (let attempt = 0; attempt < MAX_SESSION_ID_ATTEMPTS; attempt++) {
          const candidate = generateSessionId();
          const existing = await store.getSession(candidate);
          if (!existing) {
            sessionId = candidate;
            break;
          }
        }
        if (!sessionId) {
          socket.emit('error', { message: 'Failed to generate unique session ID' });
          return;
        }

        const { title, votingMethod, options, config } = payload;
        const creatorId = crypto.randomUUID();
        const authToken = crypto.randomUUID();

        const sanitizedOptions: Option[] = NO_OPTIONS_METHODS.includes(votingMethod)
          ? []
          : (Array.isArray(options) ? options : []).map(opt => ({
              id: crypto.randomUUID(),
              name: sanitizeOptionName(opt.name),
              description: sanitizeOptionDescription(opt.description)
            }));

        const now = Date.now();
        const session: Session = {
          id: sessionId,
          title: sanitizeInput(title),
          createdAt: now,
          status: 'active',
          votingMethod,
          options: sanitizedOptions,
          votes: [],
          creatorId,
          expiresAt: now + ACTIVE_SESSION_TTL,
          config: config && typeof config === 'object' && !Array.isArray(config) ? config : undefined
        };

        await store.createSession(session);
        await store.addUser(sessionId, {
          id: creatorId,
          name: 'Creator',
          socketId: socket.id,
          authToken
        });
        await store.incrementIpSessionCount(clientIp);

        socket.join(sessionId);
        joinedSessions.set(sessionId, creatorId);

        const results = calculateResults(
          [],
          session.options.map(o => o.id),
          session.votingMethod,
          session.config
        );
        const users = [{ id: creatorId, name: 'Creator' }];

        socket.emit('session-created', { session, userId: creatorId, authToken, results, users });
        console.log(`Session created: ${sessionId}`);
      } catch (error) {
        console.error('Error creating session:', error);
        socket.emit('error', { message: 'Failed to create session' });
      }
    });

    socket.on('join-session', async (payload: JoinSessionPayload) => {
      try {
        if (!payload || typeof payload !== 'object') {
          socket.emit('error', { message: 'Invalid session ID', code: 'INVALID_SESSION_ID' });
          return;
        }

        const { sessionId, userName, userId: existingUserId, authToken: providedAuthToken } = payload;

        if (!sessionId || typeof sessionId !== 'string') {
          socket.emit('error', { message: 'Invalid session ID', code: 'INVALID_SESSION_ID' });
          return;
        }

        const normalizedId = sessionId.trim().toUpperCase();
        if (normalizedId.length !== 6) {
          socket.emit('error', { message: 'Invalid session ID', code: 'INVALID_SESSION_ID' });
          return;
        }

        const session = await store.getSession(normalizedId);
        if (!session) {
          socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
          return;
        }

        let userId = existingUserId;
        let resolvedName: string;
        let resolvedAuthToken: string | undefined;

        // Try to reconnect with existing userId
        if (userId) {
          if (typeof userId !== 'string') {
            socket.emit('error', { message: 'Invalid user ID' });
            return;
          }

          const existingUser = await store.getUser(session.id, userId);
          if (existingUser) {
            if (existingUser.authToken !== undefined && !tokensMatch(providedAuthToken, existingUser.authToken)) {
              socket.emit('error', { message: 'Invalid session credentials', code: 'UNAUTHORIZED' });
              return;
            }
            // Reconnect: update socket, optionally update name if non-empty after sanitization
            const sanitizedCandidate = typeof userName === 'string' ? sanitizeInput(userName) : '';
            resolvedName = sanitizedCandidate.length > 0 ? sanitizedCandidate : existingUser.name;
            resolvedAuthToken = existingUser.authToken;
            await store.updateUser(session.id, userId, { name: resolvedName, socketId: socket.id });
            if (resolvedName !== existingUser.name) {
              session.votes = session.votes.map(v =>
                v.userId === userId ? { ...v, userName: resolvedName } : v
              );
            }
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
            const sanitizedName = sanitizeInput(userName);
            if (sanitizedName.length === 0) {
              socket.emit('error', { message: 'User name is required' });
              return;
            }
            const userCount = await store.getUserCount(session.id);
            if (!canJoinSession(userCount)) {
              socket.emit('error', { message: 'Session is full' });
              return;
            }
            userId = crypto.randomUUID();
            resolvedName = sanitizedName;
            resolvedAuthToken = crypto.randomUUID();
            await store.addUser(session.id, {
              id: userId,
              name: resolvedName,
              socketId: socket.id,
              authToken: resolvedAuthToken
            });
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
          const sanitizedName = sanitizeInput(userName);
          if (sanitizedName.length === 0) {
            socket.emit('error', { message: 'User name is required' });
            return;
          }
          const userCount = await store.getUserCount(session.id);
          if (!canJoinSession(userCount)) {
            socket.emit('error', { message: 'Session is full' });
            return;
          }
          userId = crypto.randomUUID();
          resolvedName = sanitizedName;
          resolvedAuthToken = crypto.randomUUID();
          await store.addUser(session.id, {
            id: userId,
            name: resolvedName,
            socketId: socket.id,
            authToken: resolvedAuthToken
          });
        }

        socket.join(session.id);
        joinedSessions.set(session.id, userId);

        const results = calculateResults(
          session.votes,
          session.options.map(o => o.id),
          session.votingMethod,
          session.config
        );

        const usersMap = await store.getUsers(session.id);
        const usersList = Array.from(usersMap.values()).map(u => ({ id: u.id, name: u.name }));

        socket.emit('session-joined', {
          session,
          userId,
          userName: resolvedName,
          authToken: resolvedAuthToken,
          results,
          users: usersList
        });
        socket.to(session.id).emit('user-joined', {
          sessionId: session.id,
          userId,
          userName: resolvedName
        });
        console.log(`User ${resolvedName} joined session ${session.id}`);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    socket.on('leave-session', async (payload: LeaveSessionPayload) => {
      try {
        if (!payload || typeof payload !== 'object' || typeof payload.sessionId !== 'string') {
          return;
        }

        const normalizedId = payload.sessionId.trim().toUpperCase();
        if (!normalizedId) return;

        const boundUserId = joinedSessions.get(normalizedId);
        socket.leave?.(normalizedId);
        joinedSessions.delete(normalizedId);

        if (boundUserId) {
          await store.updateUser(normalizedId, boundUserId, { socketId: null });
        }
      } catch (error) {
        console.error('Error leaving session:', error);
      }
    });

    socket.on('submit-vote', async (payload: SubmitVotePayload) => {
      try {
        if (!payload || typeof payload !== 'object') {
          socket.emit('error', { message: 'Invalid vote payload' });
          return;
        }

        const { sessionId, vote } = payload;

        if (!sessionId || typeof sessionId !== 'string' || !vote || typeof vote !== 'object') {
          socket.emit('error', { message: 'Invalid vote payload' });
          return;
        }

        const normalizedId = sessionId.trim().toUpperCase();
        if (!normalizedId) {
          socket.emit('error', { message: 'Invalid vote payload' });
          return;
        }

        const boundUserId = joinedSessions.get(normalizedId);
        if (!boundUserId || (vote.userId !== undefined && vote.userId !== boundUserId)) {
          socket.emit('error', { message: 'Unauthorized vote submission', code: 'UNAUTHORIZED' });
          return;
        }

        const session = await store.getSession(normalizedId);
        if (!session) {
          socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
          return;
        }

        if (session.status !== 'active') {
          socket.emit('error', { message: 'Voting is closed' });
          return;
        }

        const user = await store.getUser(normalizedId, boundUserId);
        if (!user || user.socketId !== socket.id) {
          socket.emit('error', { message: 'Unauthorized vote submission', code: 'UNAUTHORIZED' });
          return;
        }

        const selectionValidation = validateVoteSelection(vote.selection, session);
        if (!selectionValidation.valid) {
          socket.emit('error', { message: selectionValidation.error || 'Invalid vote selection' });
          return;
        }

        const voteId = crypto.randomUUID();
        const savedVote: Vote = {
          id: voteId,
          userId: boundUserId,
          userName: user.name,
          selection: vote.selection,
          timestamp: Date.now()
        };

        await store.upsertVote(normalizedId, savedVote);

        const votes = await store.getVotes(normalizedId);
        const results = calculateResults(
          votes,
          session.options.map(o => o.id),
          session.votingMethod,
          session.config
        );

        io.to(normalizedId).emit('vote-submitted', { sessionId: normalizedId, vote: savedVote });
        io.to(normalizedId).emit('results-updated', { sessionId: normalizedId, results });
        console.log(`Vote submitted in session ${normalizedId}`);
      } catch (error) {
        console.error('Error submitting vote:', error);
        socket.emit('error', { message: 'Failed to submit vote' });
      }
    });

    socket.on('close-session', async (payload: { sessionId: string; userId?: string }) => {
      try {
        if (!payload || typeof payload !== 'object' || typeof payload.sessionId !== 'string') {
          socket.emit('error', { message: 'Invalid session ID', code: 'INVALID_SESSION_ID' });
          return;
        }

        const normalizedId = payload.sessionId.trim().toUpperCase();
        if (!normalizedId) {
          socket.emit('error', { message: 'Invalid session ID', code: 'INVALID_SESSION_ID' });
          return;
        }

        const boundUserId = joinedSessions.get(normalizedId);
        if (!boundUserId) {
          socket.emit('error', { message: 'Only the creator can close the session', code: 'UNAUTHORIZED' });
          return;
        }

        const session = await store.getSession(normalizedId);
        if (!session) {
          socket.emit('error', { message: 'Session not found', code: 'SESSION_NOT_FOUND' });
          return;
        }

        if (session.creatorId !== boundUserId) {
          socket.emit('error', { message: 'Only the creator can close the session', code: 'UNAUTHORIZED' });
          return;
        }

        if (session.status === 'closed') {
          socket.emit('error', { message: 'Session is already closed', code: 'SESSION_CLOSED' });
          return;
        }

        const now = Date.now();
        const expiresAt = now + CLOSED_SESSION_TTL;
        await store.updateSession(normalizedId, { status: 'closed', closedAt: now, expiresAt });

        session.status = 'closed';
        session.closedAt = now;
        session.expiresAt = expiresAt;

        const results = calculateResults(
          session.votes,
          session.options.map(o => o.id),
          session.votingMethod,
          session.config
        );

        io.to(normalizedId).emit('session-updated', { session, results });
        console.log(`Session ${normalizedId} closed`);
      } catch (error) {
        console.error('Error closing session:', error);
        socket.emit('error', { message: 'Failed to close session' });
      }
    });

    socket.on('update-user-name', async (payload: { userId?: string; userName: string }) => {
      try {
        if (!payload || typeof payload !== 'object' || typeof payload.userName !== 'string') {
          socket.emit('error', { message: 'User name cannot be empty' });
          return;
        }

        const sanitizedName = sanitizeInput(payload.userName);
        if (sanitizedName.length === 0) {
          socket.emit('error', { message: 'User name cannot be empty' });
          return;
        }

        let updatedCount = 0;
        for (const [sessionId, boundUserId] of joinedSessions.entries()) {
          if (payload.userId !== undefined && payload.userId !== boundUserId) {
            continue;
          }
          await store.updateUser(sessionId, boundUserId, { name: sanitizedName });
          io.to(sessionId).emit('user-name-updated', {
            sessionId,
            userId: boundUserId,
            userName: sanitizedName
          });
          updatedCount++;
        }

        if (updatedCount === 0 && payload.userId !== undefined) {
          socket.emit('error', { message: 'Unauthorized user name update', code: 'UNAUTHORIZED' });
        }
      } catch (error) {
        console.error('Error updating user name:', error);
        socket.emit('error', { message: 'Failed to update user name' });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      joinedSessions.clear();
      try {
        // Clear the socketId but keep the user in the session — they can rejoin
        await store.removeUserBySocketId(socket.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
}
