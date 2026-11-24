import React, { useRef, createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Session, SessionConfig, Results, Vote, UserInfo } from '../types';

function getAuthStorageKey(sessionId: string, userId: string): string {
  return `vf-auth-${sessionId.toUpperCase()}-${userId}`;
}

function saveAuthToken(sessionId: string, userId: string, token: string): void {
  try {
    localStorage.setItem(getAuthStorageKey(sessionId, userId), token);
  } catch {
    // Ignore storage errors (e.g. private browsing or quota exceeded)
  }
}

function getAuthToken(sessionId: string, userId: string): string | null {
  try {
    return localStorage.getItem(getAuthStorageKey(sessionId, userId));
  } catch {
    return null;
  }
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentSession: Session | null;
  userId: string | null;
  userName: string | null;
  results: Results | null;
  users: UserInfo[];
  createSession: (title: string, votingMethod: string, options: { name: string; description?: string }[], config?: SessionConfig) => void;
  joinSession: (sessionId: string, userName: string, userId?: string) => void;
  submitVote: (sessionId: string, vote: Omit<Vote, 'id' | 'timestamp'>) => void;
  closeSession: (sessionId: string) => void;
  leaveSession: () => void;
  updateUserName: (newName: string) => void;
  error: string | null;
  errorCode: string | null;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);
  const sessionRef = useRef(currentSession);
  const authTokenRef = useRef<string | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);

  const clearErrorState = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setError(null);
    setErrorCode(null);
  }, []);

  useEffect(() => {
    const serverUrl = window.location.origin;
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');

      // handle reconnection logic
      if (userIdRef.current && sessionRef.current) {
        const storedToken =
          authTokenRef.current ||
          getAuthToken(sessionRef.current.id, userIdRef.current) ||
          undefined;
        newSocket.emit('join-session', {
          sessionId: sessionRef.current.id,
          userName: userNameRef.current || 'Reconnected User',
          userId: userIdRef.current,
          authToken: storedToken,
        });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('session-created', ({ session, userId: createdUserId, authToken, results: sessionResults, users: sessionUsers }) => {
      clearErrorState();
      if (authToken) {
        authTokenRef.current = authToken;
        saveAuthToken(session.id, createdUserId, authToken);
      } else {
        authTokenRef.current = null;
      }
      sessionRef.current = session;
      userIdRef.current = createdUserId;
      userNameRef.current = 'Creator';
      setCurrentSession(session);
      setUserId(createdUserId);
      setUserName('Creator');
      setResults(sessionResults ?? null);
      setUsers(sessionUsers ?? [{ id: createdUserId, name: 'Creator' }]);
    });

    newSocket.on('session-joined', ({ session, userId: joinedUserId, userName: joinedUserName, authToken, results: sessionResults, users: sessionUsers }) => {
      clearErrorState();
      if (authToken) {
        authTokenRef.current = authToken;
        saveAuthToken(session.id, joinedUserId, authToken);
      } else {
        authTokenRef.current = getAuthToken(session.id, joinedUserId);
      }
      sessionRef.current = session;
      userIdRef.current = joinedUserId;
      userNameRef.current = joinedUserName;
      setCurrentSession(session);
      setUserId(joinedUserId);
      setUserName(joinedUserName);
      setResults(sessionResults ?? null);
      setUsers(sessionUsers ?? session.votes.map((v: Vote) => ({ id: v.userId, name: v.userName })));
    });

    newSocket.on('vote-submitted', ({ sessionId, vote }) => {
      if (!sessionRef.current || sessionRef.current.id !== sessionId) return;

      setCurrentSession(prev => {
        if (!prev || prev.id !== sessionId) return prev;
        const existingIndex = prev.votes.findIndex((v: Vote) => v.userId === vote.userId);
        if (existingIndex !== -1) {
          const newVotes = [...prev.votes];
          newVotes[existingIndex] = vote;
          return { ...prev, votes: newVotes };
        }
        return { ...prev, votes: [...prev.votes, vote] };
      });

      // Update or add user in participants list
      setUsers(prev => {
        const existingUser = prev.find(u => u.id === vote.userId);
        if (existingUser) {
          return prev.map(u => u.id === vote.userId ? { ...u, name: vote.userName } : u);
        }
        return [...prev, { id: vote.userId, name: vote.userName }];
      });
    });

    newSocket.on('results-updated', ({ sessionId, results: newResults }) => {
      if (!sessionRef.current || sessionRef.current.id !== sessionId) return;
      setResults(newResults);
    });

    newSocket.on('session-updated', ({ session, results: sessionResults }) => {
      if (!sessionRef.current || sessionRef.current.id !== session.id) return;
      sessionRef.current = session;
      setCurrentSession(session);
      setResults(sessionResults);
    });

    newSocket.on('user-joined', ({ sessionId, userId: joinedUserId, userName: joinedUserName }) => {
      if (!sessionRef.current || (sessionId && sessionRef.current.id !== sessionId)) return;
      setUsers(prev => [...prev.filter(u => u.id !== joinedUserId), { id: joinedUserId, name: joinedUserName }]);
    });

    newSocket.on('user-name-updated', ({ sessionId, userId: updatedUserId, userName: updatedUserName }) => {
      if (!sessionRef.current || (sessionId && sessionRef.current.id !== sessionId)) return;

      setUsers(prev => prev.map(u => u.id === updatedUserId ? { ...u, name: updatedUserName } : u));
      setCurrentSession(prev => {
        if (!prev || (sessionId && prev.id !== sessionId)) return prev;
        if (!prev.votes.some(v => v.userId === updatedUserId && v.userName !== updatedUserName)) return prev;
        return {
          ...prev,
          votes: prev.votes.map(v => v.userId === updatedUserId ? { ...v, userName: updatedUserName } : v),
        };
      });
      if (updatedUserId === userIdRef.current) {
        userNameRef.current = updatedUserName;
        setUserName(updatedUserName);
      }
    });

    newSocket.on('error', ({ message, code }) => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      setError(message);
      setErrorCode(code || null);
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        setErrorCode(null);
        errorTimeoutRef.current = null;
      }, 5000);
    });

    setSocket(newSocket);

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      newSocket.close();
    };
  }, [clearErrorState]);

  const createSession = useCallback((title: string, votingMethod: string, options: { name: string; description?: string }[], config?: SessionConfig) => {
    socket?.emit('create-session', { title, votingMethod, options, config });
  }, [socket]);

  const joinSession = useCallback((sessionId: string, userName: string, existingUserId?: string) => {
    const authToken = existingUserId ? (getAuthToken(sessionId, existingUserId) ?? undefined) : undefined;
    if (authToken) {
      authTokenRef.current = authToken;
    }
    socket?.emit('join-session', { sessionId, userName, userId: existingUserId, authToken });
  }, [socket]);

  const submitVote = useCallback((sessionId: string, vote: Omit<Vote, 'id' | 'timestamp'>) => {
    socket?.emit('submit-vote', { sessionId, vote });
  }, [socket]);

  const closeSession = useCallback((sessionId: string) => {
    if (userId) {
      socket?.emit('close-session', { sessionId, userId });
    }
  }, [socket, userId]);

  const leaveSession = useCallback(() => {
    if (sessionRef.current?.id) {
      socket?.emit('leave-session', { sessionId: sessionRef.current.id });
    }
    sessionRef.current = null;
    userIdRef.current = null;
    userNameRef.current = null;
    authTokenRef.current = null;
    clearErrorState();
    setCurrentSession(null);
    setUserId(null);
    setUserName(null);
    setResults(null);
    setUsers([]);
  }, [socket, clearErrorState]);

  const updateUserName = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    userNameRef.current = trimmed;
    setUserName(trimmed);
    if (userId) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, name: trimmed } : u));
      setCurrentSession(prev => {
        if (!prev) return prev;
        if (!prev.votes.some(v => v.userId === userId && v.userName !== trimmed)) return prev;
        return {
          ...prev,
          votes: prev.votes.map(v => v.userId === userId ? { ...v, userName: trimmed } : v),
        };
      });
      socket?.emit('update-user-name', { userId, userName: trimmed });
    }
  }, [socket, userId]);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      currentSession,
      userId,
      userName,
      results,
      users,
      createSession,
      joinSession,
      submitVote,
      closeSession,
      leaveSession,
      updateUserName,
      error,
      errorCode
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
