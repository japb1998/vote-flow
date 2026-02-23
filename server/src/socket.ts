import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  Vote,
  CreateSessionPayload,
  JoinSessionPayload,
  SubmitVotePayload,
  VotingMethod,
  Option
} from './types';
import { generateSessionId, sanitizeInput, sanitizeOptionName, sanitizeOptionDescription, validateSessionPayload, canCreateSession, canJoinSession } from './utils/helpers';
import { calculateResults } from './voting/calculate';

const sessions = new Map<string, Session>();

interface UserInfo {
  id: string;
  name: string;
  socketId: string;
}

const sessionUsers = new Map<string, Map<string, UserInfo>>();

const ipSessionCount = new Map<string, number>();

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    const clientIp = socket.handshake.address || socket.conn.remoteAddress || 'unknown';
    console.log(`Client connected: ${socket.id} from ${clientIp}`);

    socket.on('create-session', (payload: CreateSessionPayload) => {
      try {
        if (!validateSessionPayload(payload).valid) {
          socket.emit('error', { message: validateSessionPayload(payload).error || 'Invalid payload' });
          return;
        }

        if (!canCreateSession(sessions.size)) {
          socket.emit('error', { message: 'Server is at maximum capacity' });
          return;
        }

        const ipCount = ipSessionCount.get(clientIp) || 0;
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
          votingMethod: votingMethod as VotingMethod,
          options: sanitizedOptions,
          votes: [],
          creatorId
        };

        sessions.set(sessionId, session);
        sessionUsers.set(sessionId, new Map());

        socket.join(sessionId);
        const userInfo: UserInfo = { id: creatorId, name: 'Creator', socketId: socket.id };
        sessionUsers.get(sessionId)!.set(creatorId, userInfo);

        socket.emit('session-created', { session, userId: creatorId });
        console.log(`Session created: ${sessionId}`);
      } catch (error) {
        console.error('Error creating session:', error);
        socket.emit('error', { message: 'Failed to create session' });
      }
    });

    socket.on('join-session', (payload: JoinSessionPayload) => {
      try {
        const { sessionId, userName } = payload;

        if (!sessionId || typeof sessionId !== 'string' || sessionId.length !== 6) {
          socket.emit('error', { message: 'Invalid session ID' });
          return;
        }

        const session = sessions.get(sessionId.toUpperCase());
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
          socket.emit('error', { message: 'User name is required' });
          return;
        }

        const currentUsers = sessionUsers.get(sessionId)?.size || 0;
        if (!canJoinSession(currentUsers)) {
          socket.emit('error', { message: 'Session is full' });
          return;
        }

        const userId = uuidv4();
        socket.join(sessionId);

        const sanitizedName = sanitizeInput(userName);
        const userInfo: UserInfo = { id: userId, name: sanitizedName, socketId: socket.id };
        sessionUsers.get(sessionId)!.set(userId, userInfo);

        const results = calculateResults(
          session.votes,
          session.options.map(o => o.id),
          session.votingMethod
        );

        socket.emit('session-joined', { session, userId, userName: sanitizedName, results });
        socket.to(sessionId).emit('user-joined', { userId, userName: sanitizedName });
        
        console.log(`User ${sanitizedName} joined session ${sessionId}`);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    socket.on('submit-vote', (payload: SubmitVotePayload) => {
      try {
        const { sessionId, vote } = payload;

        if (!sessionId || !vote || typeof vote !== 'object') {
          socket.emit('error', { message: 'Invalid vote payload' });
          return;
        }

        const session = sessions.get(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
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

        const existingVoteIndex = session.votes.findIndex(v => v.userId === vote.userId);
        if (existingVoteIndex !== -1) {
          session.votes[existingVoteIndex] = {
            ...vote,
            id: uuidv4(),
            timestamp: Date.now()
          };
        } else {
          const newVote: Vote = {
            ...vote,
            id: uuidv4(),
            timestamp: Date.now()
          };
          session.votes.push(newVote);
        }

        const results = calculateResults(
          session.votes,
          session.options.map(o => o.id),
          session.votingMethod
        );

        io.to(sessionId).emit('vote-submitted', { 
          sessionId, 
          vote: session.votes[session.votes.length - 1] 
        });
        io.to(sessionId).emit('results-updated', { sessionId, results });
        
        console.log(`Vote submitted in session ${sessionId}`);
      } catch (error) {
        console.error('Error submitting vote:', error);
        socket.emit('error', { message: 'Failed to submit vote' });
      }
    });

    socket.on('close-session', (payload: { sessionId: string; userId: string }) => {
      try {
        const { sessionId, userId } = payload;

        const session = sessions.get(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        if (session.creatorId !== userId) {
          socket.emit('error', { message: 'Only the creator can close the session' });
          return;
        }

        session.status = 'closed';
        session.closedAt = Date.now();

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

    socket.on('update-user-name', (payload: { userId: string; userName: string }) => {
      try {
        const { userId, userName } = payload;
        
        sessionUsers.forEach((users, sessionId) => {
          const userInfo = users.get(userId);
          if (userInfo) {
            userInfo.name = sanitizeInput(userName);
            users.set(userId, userInfo);
            socket.to(sessionId).emit('user-name-updated', { userId, userName: sanitizeInput(userName) });
          }
        });
      } catch (error) {
        console.error('Error updating user name:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      sessionUsers.forEach((users, sessionId) => {
        users.forEach((userInfo, odId) => {
          if (userInfo.socketId === socket.id) {
            users.delete(odId);
            socket.to(sessionId).emit('user-left', { userId: odId });
          }
        });
      });
    });
  });

  const CLOSED_SESSION_TTL = 30 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    sessions.forEach((session, sessionId) => {
      if (session.status === 'closed' && session.closedAt) {
        if (now - session.closedAt > CLOSED_SESSION_TTL) {
          sessions.delete(sessionId);
          sessionUsers.delete(sessionId);
          console.log(`Session ${sessionId} expired and removed`);
        }
      }
    });
  }, 60 * 1000);
}
