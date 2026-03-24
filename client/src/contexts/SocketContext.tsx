import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Session, Results, Vote, UserInfo } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentSession: Session | null;
  userId: string | null;
  userName: string | null;
  results: Results | null;
  users: UserInfo[];
  createSession: (title: string, votingMethod: string, options: { name: string; description?: string }[]) => void;
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

  useEffect(() => {
    const serverUrl = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('session-created', ({ session, userId }) => {
      setCurrentSession(session);
      setUserId(userId);
      setUserName('Creator');
      setResults(null);
      setUsers([]);
    });

    newSocket.on('session-joined', ({ session, userId: joinedUserId, userName: joinedUserName, results: sessionResults, users: sessionUsers }) => {
      setCurrentSession(session);
      setUserId(joinedUserId);
      setUserName(joinedUserName);
      setResults(sessionResults);
      setUsers(sessionUsers ?? session.votes.map((v: Vote) => ({ id: v.userId, name: v.userName })));
    });

    newSocket.on('vote-submitted', ({ sessionId, vote }) => {
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
      setCurrentSession(prev => {
        if (!prev || prev.id !== sessionId) return prev;
        return { ...prev, votes: prev.votes };
      });
      setResults(newResults);
    });

    newSocket.on('session-updated', ({ session, results: sessionResults }) => {
      setCurrentSession(session);
      setResults(sessionResults);
    });

    newSocket.on('user-joined', ({ userId, userName }) => {
      setUsers(prev => [...prev.filter(u => u.id !== userId), { id: userId, name: userName }]);
    });

    newSocket.on('user-name-updated', ({ userId, userName }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, name: userName } : u));
      if (userId === userId) {
        setUserName(userName);
      }
    });

    newSocket.on('error', ({ message, code }) => {
      setError(message);
      setErrorCode(code || null);
      setTimeout(() => { setError(null); setErrorCode(null); }, 5000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const createSession = useCallback((title: string, votingMethod: string, options: { name: string; description?: string }[]) => {
    socket?.emit('create-session', { title, votingMethod, options });
  }, [socket]);

  const joinSession = useCallback((sessionId: string, userName: string, existingUserId?: string) => {
    socket?.emit('join-session', { sessionId, userName, userId: existingUserId });
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
    setCurrentSession(null);
    setUserId(null);
    setUserName(null);
    setResults(null);
    setUsers([]);
  }, []);

  const updateUserName = useCallback((newName: string) => {
    setUserName(newName);
    if (userId) {
      socket?.emit('update-user-name', { userId, userName: newName });
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
