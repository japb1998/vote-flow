import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { ResultsChart } from '../components/ResultsChart';
import { Selection, VotingMethod } from '../types';
import { exportToJson, exportToCsv, downloadFile } from '../utils/export';
import styles from './SessionPage.module.css';

const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const FIST_LABELS: Record<number, string> = {
  1: 'Blocking concern',
  2: 'Serious reservations',
  3: 'Can live with it',
  4: 'Good idea',
  5: 'Strong support',
};

const methodLabels: Record<VotingMethod, string> = {
  single: 'Single Choice',
  approval: 'Approval',
  ranked: 'Ranked Choice',
  score: 'Score',
  poker: 'Planning Poker',
  dot: 'Dot Voting',
  roman: 'Roman Voting',
  'fist-of-five': 'Fist of Five',
};

const methodColors: Record<VotingMethod, 'info' | 'default'> = {
  single: 'info',
  approval: 'default',
  ranked: 'info',
  score: 'default',
  poker: 'info',
  dot: 'default',
  roman: 'info',
  'fist-of-five': 'default',
};

async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentSession, userId, userName, results, users, joinSession, submitVote, closeSession, leaveSession, updateUserName, error, errorCode, isConnected } = useSocket();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showResults, setShowResults] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [tempName, setTempName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionNotFound, setSessionNotFound] = useState(false);
  const [invalidSessionId, setInvalidSessionId] = useState(false);

  const rejoinAttempted = useRef(false);
  const hydratedVoteKeyRef = useRef<string | null>(null);
  const prevUrlSessionIdRef = useRef<string | undefined>(sessionId);
  const prevCurrentSessionIdRef = useRef<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveSessionRef = useRef(leaveSession);
  leaveSessionRef.current = leaveSession;
  const isUnmountingRef = useRef(false);
  const explicitlyLeftRef = useRef(false);

  const normalizedUrlSessionId = sessionId?.toUpperCase();
  const isSessionMatched = Boolean(
    currentSession && (!normalizedUrlSessionId || currentSession.id === normalizedUrlSessionId)
  );
  const activeSession = isSessionMatched ? currentSession : null;

  // Derive hasVoted from server-confirmed votes rather than optimistic local state
  const hasVoted = Boolean(
    activeSession && userId && activeSession.votes.some(v => v.userId === userId)
  );

  // Leave session cleanly on unmount (e.g. Browser Back or navigating away)
  useEffect(() => {
    isUnmountingRef.current = false;
    explicitlyLeftRef.current = false;
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      isUnmountingRef.current = true;
      queueMicrotask(() => {
        if (isUnmountingRef.current && !explicitlyLeftRef.current) {
          leaveSessionRef.current();
        }
      });
    };
  }, []);

  // Reset local state when navigating to a different session URL
  useEffect(() => {
    if (prevUrlSessionIdRef.current !== sessionId) {
      prevUrlSessionIdRef.current = sessionId;
      setSelection(null);
      hydratedVoteKeyRef.current = null;
      setSessionEnded(false);
      setSessionNotFound(false);
      setInvalidSessionId(false);
      setShowNameModal(false);
      setShowNameEdit(false);
      setIsJoining(false);
      rejoinAttempted.current = false;
    }
  }, [sessionId]);

  // If the URL points to a different session than the one in context, leave the old one
  useEffect(() => {
    if (currentSession && normalizedUrlSessionId && currentSession.id !== normalizedUrlSessionId) {
      leaveSession();
    }
  }, [currentSession, normalizedUrlSessionId, leaveSession]);

  // Auto-rejoin if userId is in URL params (wait for socket connection)
  useEffect(() => {
    if (!currentSession && sessionId && isConnected && !rejoinAttempted.current && !sessionNotFound && !invalidSessionId && !sessionEnded) {
      const urlUserId = searchParams.get('userId');
      if (urlUserId) {
        rejoinAttempted.current = true;
        joinSession(sessionId.toUpperCase(), '', urlUserId);
      } else {
        setShowNameModal(true);
      }
    }
  }, [sessionId, currentSession, searchParams, joinSession, isConnected, sessionNotFound, invalidSessionId, sessionEnded]);

  // Close join modal once session is joined
  useEffect(() => {
    if (activeSession) {
      setShowNameModal(false);
      setIsJoining(false);
    }
  }, [activeSession]);

  // Reset joining flag when an error arrives so the user can retry or see the error
  useEffect(() => {
    if (error) {
      setIsJoining(false);
    }
  }, [error]);

  // If rejoin failed (user not found or missing/invalid auth token), clear stale userId and show name modal for fresh join
  useEffect(() => {
    if ((errorCode === 'USER_NOT_FOUND' || errorCode === 'UNAUTHORIZED') && !activeSession) {
      if (searchParams.has('userId')) {
        setSearchParams({}, { replace: true });
      }
      setShowNameModal(true);
    }
  }, [errorCode, activeSession, searchParams, setSearchParams]);

  // Capture terminal session errors permanently so they persist after auto-clear
  useEffect(() => {
    if (errorCode === 'SESSION_CLOSED') {
      setSessionEnded(true);
      setShowNameModal(false);
    }
    if (errorCode === 'SESSION_NOT_FOUND') {
      setSessionNotFound(true);
      setShowNameModal(false);
    }
    if (errorCode === 'INVALID_SESSION_ID') {
      setInvalidSessionId(true);
      setShowNameModal(false);
    }
  }, [errorCode]);

  // Persist userId in URL after successful join to the matching session
  useEffect(() => {
    if (activeSession && userId && sessionId) {
      const currentUrlUserId = searchParams.get('userId');
      if (currentUrlUserId !== userId) {
        setSearchParams({ userId }, { replace: true });
      }
    }
  }, [activeSession, userId, sessionId, searchParams, setSearchParams]);

  // Hydrate selection only when session changes or the current user's OWN vote changes
  useEffect(() => {
    if (!activeSession || !userId) {
      if (prevCurrentSessionIdRef.current !== null) {
        prevCurrentSessionIdRef.current = null;
        hydratedVoteKeyRef.current = null;
        setSelection(null);
      }
      return;
    }

    if (prevCurrentSessionIdRef.current && prevCurrentSessionIdRef.current !== activeSession.id) {
      setSelection(null);
      hydratedVoteKeyRef.current = null;
    }
    prevCurrentSessionIdRef.current = activeSession.id;

    const existingVote = activeSession.votes.find(v => v.userId === userId);
    const voteKey = `${activeSession.id}:${existingVote ? `${existingVote.id}:${existingVote.timestamp}` : 'none'}`;

    if (hydratedVoteKeyRef.current !== voteKey) {
      hydratedVoteKeyRef.current = voteKey;
      if (existingVote) {
        setSelection(existingVote.selection);
      }
    }
  }, [activeSession, userId]);

  const markCopied = () => {
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!activeSession) return;
    // Share a clean URL without userId so recipients join as new users
    const url = `${window.location.origin}/session/${activeSession.id}`;
    const ok = await copyText(url);
    if (ok) {
      markCopied();
    }
  };

  const handleCopyId = async () => {
    if (!activeSession) return;
    const ok = await copyText(activeSession.id);
    if (ok) {
      markCopied();
    }
  };

  const handleJoinWithName = () => {
    const cleanName = tempName.trim();
    if (cleanName && sessionId && !isJoining) {
      setIsJoining(true);
      joinSession(sessionId.toUpperCase(), cleanName);
    }
  };

  const handleNameChange = () => {
    if (tempName.trim()) {
      updateUserName(tempName.trim());
      setShowNameEdit(false);
    }
  };

  const handleBack = () => {
    explicitlyLeftRef.current = true;
    leaveSession();
    navigate('/');
  };

  const handleVote = () => {
    if (!selection || !activeSession || !userId) return;

    const vote = {
      userId,
      userName: users.find(u => u.id === userId)?.name || userName || 'Anonymous',
      selection
    };

    submitVote(activeSession.id, vote);
  };

  const handleSingleSelect = (optionId: string) => {
    setSelection({ type: 'single', optionId });
  };

  const handleApprovalToggle = (optionId: string) => {
    const current = (selection?.type === 'approval' ? selection.optionIds : []) as string[];
    const newSelection = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    setSelection({ type: 'approval', optionIds: newSelection });
  };

  const handleRankSelect = (optionId: string) => {
    const current = (selection?.type === 'ranked' ? selection.rankings : []) as string[];
    const newRankings = current.includes(optionId)
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    setSelection({ type: 'ranked', rankings: newRankings });
  };

  const getRankPosition = (optionId: string): number => {
    const rankings = (selection?.type === 'ranked' ? selection.rankings : []) as string[];
    return rankings.indexOf(optionId);
  };

  const handleScoreChange = (optionId: string, score: number) => {
    const current = (selection?.type === 'score' ? selection.scores : {}) as Record<string, number>;
    setSelection({
      type: 'score',
      scores: { ...current, [optionId]: score }
    });
  };

  const getScore = (optionId: string): number => {
    return (selection?.type === 'score' ? selection.scores[optionId] : 0) as number || 0;
  };

  const pokerMin = activeSession?.config?.pokerMin ?? 1;
  const pokerMax = activeSession?.config?.pokerMax ?? 89;
  const POKER_CARDS = FIBONACCI_SEQUENCE.filter(n => n >= pokerMin && n <= pokerMax).map(String);
  const DOTS_PER_VOTER = activeSession?.config?.dotsPerVoter ?? 3;

  const handlePokerSelect = (value: string) => {
    setSelection({ type: 'poker', value });
  };

  const handleRomanSelect = (vote: 'up' | 'down' | 'sideways') => {
    setSelection({ type: 'roman', vote });
  };

  const handleFistSelect = (value: 1 | 2 | 3 | 4 | 5) => {
    setSelection({ type: 'fist-of-five', value });
  };

  const handleDotChange = (optionId: string, delta: number) => {
    const current = (selection?.type === 'dot' ? selection.allocations : {}) as Record<string, number>;
    const currentDots = current[optionId] || 0;
    const totalUsed = Object.values(current).reduce((sum, v) => sum + v, 0);
    const newDots = Math.max(0, currentDots + delta);

    if (delta > 0 && totalUsed >= DOTS_PER_VOTER) return;

    setSelection({
      type: 'dot',
      allocations: { ...current, [optionId]: newDots }
    });
  };

  const getDotCount = (optionId: string): number => {
    return (selection?.type === 'dot' ? selection.allocations[optionId] : 0) || 0;
  };

  const getTotalDotsUsed = (): number => {
    if (selection?.type !== 'dot') return 0;
    return Object.values(selection.allocations).reduce((sum, v) => sum + v, 0);
  };

  const isSelected = (optionId: string): boolean => {
    if (!selection) return false;
    switch (selection.type) {
      case 'single':
        return selection.optionId === optionId;
      case 'approval':
        return selection.optionIds.includes(optionId);
      case 'ranked':
        return selection.rankings.includes(optionId);
      case 'score':
        return (selection.scores[optionId] || 0) > 0;
      default:
        return false;
    }
  };

  const canSubmit = (): boolean => {
    if (!selection) return false;
    switch (selection.type) {
      case 'single':
        return !!selection.optionId;
      case 'approval':
        return selection.optionIds.length > 0;
      case 'ranked':
        return selection.rankings.length === (activeSession?.options.length || 0);
      case 'score':
        return Object.keys(selection.scores).length === (activeSession?.options.length || 0);
      case 'poker':
        return !!selection.value;
      case 'roman':
        return !!selection.vote;
      case 'fist-of-five':
        return !!selection.value;
      case 'dot':
        return Object.values(selection.allocations).reduce((sum, v) => sum + v, 0) > 0;
      default:
        return false;
    }
  };

  if (!activeSession) {
    if (invalidSessionId || sessionNotFound) {
      return (
        <div className={styles.container}>
          <div className={styles.errorState}>
            <Card className={styles.errorCard}>
              <h2>{invalidSessionId ? 'Invalid Session ID' : 'Session Not Found'}</h2>
              <p>
                {invalidSessionId
                  ? 'The session ID in the URL is invalid. Session IDs must be 6 characters long.'
                  : 'The session you are looking for does not exist. Please check the session ID and try again.'}
              </p>
              <Button type="button" onClick={handleBack}>Back to Home</Button>
            </Card>
          </div>
        </div>
      );
    }

    if (sessionEnded) {
      return (
        <div className={styles.container}>
          <div className={styles.errorState}>
            <Card className={styles.errorCard}>
              <h2>Session Ended</h2>
              <p>This voting session has ended and is no longer accepting new participants.</p>
              <Button type="button" onClick={handleBack}>Back to Home</Button>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        {showNameModal && (
          <div className={styles.modalOverlay}>
            <Card className={styles.modal}>
              <h2>Join Session</h2>
              <p className={styles.modalDesc}>Enter your name to join the voting session</p>
              {error && <div className={styles.error}>{error}</div>}
              <form
                className={styles.modalForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoinWithName();
                }}
              >
                <Input
                  label="Your Name"
                  placeholder="Enter your name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={!tempName.trim() || isJoining}
                  size="lg"
                >
                  {isJoining ? 'Joining...' : 'Join Session'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleBack}
                >
                  Back to Home
                </Button>
              </form>
            </Card>
          </div>
        )}
        <div className={styles.loading}>
          {error && <div className={styles.error}>{error}</div>}
          <p>{isConnected ? 'Loading session...' : 'Connecting to server...'}</p>
          <Button type="button" variant="secondary" onClick={handleBack}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const isCreator = activeSession.creatorId === userId;
  const isActive = activeSession.status === 'active';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button type="button" variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{activeSession.title}</h1>
          <div className={styles.meta}>
            <span className={styles.sessionId}>ID: {activeSession.id}</span>
            <button type="button" className={styles.shareBtn} onClick={handleCopyId} title="Copy Session ID">
              📋
            </button>
            <button type="button" className={styles.shareBtn} onClick={handleShare} title="Copy Session Link">
              {copied ? '✓' : 'Share'}
            </button>
            <Badge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Active' : 'Closed'}
            </Badge>
            <Badge variant={methodColors[activeSession.votingMethod]}>
              {methodLabels[activeSession.votingMethod]}
            </Badge>
          </div>
        </div>
        {isCreator && isActive && (
          <Button
            type="button"
            variant="danger"
            onClick={() => closeSession(activeSession.id)}
          >
            Close Voting
          </Button>
        )}
      </header>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.votingSection}>
          <Card>
            <h2 className={styles.sectionTitle}>
              {hasVoted ? 'Your Vote' : 'Cast Your Vote'}
              {hasVoted && <Badge variant="success">Submitted</Badge>}
            </h2>

            {activeSession.votingMethod === 'single' && (
              <p className={styles.instruction}>Select one option</p>
            )}
            {activeSession.votingMethod === 'approval' && (
              <p className={styles.instruction}>Select all options you approve</p>
            )}
            {activeSession.votingMethod === 'ranked' && (
              <p className={styles.instruction}>Rank all options by preference (click to order)</p>
            )}
            {activeSession.votingMethod === 'score' && (
              <p className={styles.instruction}>Rate each option from 1-5</p>
            )}
            {activeSession.votingMethod === 'poker' && (
              <p className={styles.instruction}>Pick a card to estimate effort</p>
            )}
            {activeSession.votingMethod === 'dot' && (
              <p className={styles.instruction}>Distribute {DOTS_PER_VOTER} dots across options ({DOTS_PER_VOTER - getTotalDotsUsed()} remaining)</p>
            )}
            {activeSession.votingMethod === 'roman' && (
              <p className={styles.instruction}>Vote thumbs up, down, or sideways</p>
            )}
            {activeSession.votingMethod === 'fist-of-five' && (
              <p className={styles.instruction}>Hold up 1-5 fingers to show your support level</p>
            )}

            {/* Planning Poker cards */}
            {activeSession.votingMethod === 'poker' && (
              <div className={styles.pokerCards}>
                {POKER_CARDS.map(card => (
                  <button
                    key={card}
                    type="button"
                    className={`${styles.pokerCard} ${selection?.type === 'poker' && selection.value === card ? styles.pokerCardSelected : ''}`}
                    onClick={() => isActive && handlePokerSelect(card)}
                    disabled={!isActive}
                  >
                    {card}
                  </button>
                ))}
              </div>
            )}

            {/* Roman Voting buttons */}
            {activeSession.votingMethod === 'roman' && (
              <div className={styles.romanButtons}>
                {([['up', '👍', 'Support'], ['sideways', '👊', 'Neutral'], ['down', '👎', 'Oppose']] as const).map(([vote, emoji, label]) => (
                  <button
                    key={vote}
                    type="button"
                    className={`${styles.romanBtn} ${selection?.type === 'roman' && selection.vote === vote ? styles.romanBtnSelected : ''}`}
                    onClick={() => isActive && handleRomanSelect(vote)}
                    disabled={!isActive}
                  >
                    <span className={styles.romanEmoji}>{emoji}</span>
                    <span className={styles.romanLabel}>{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Fist of Five buttons */}
            {activeSession.votingMethod === 'fist-of-five' && (
              <div className={styles.fistButtons}>
                {([1, 2, 3, 4, 5] as const).map(value => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.fistBtn} ${selection?.type === 'fist-of-five' && selection.value === value ? styles.fistBtnSelected : ''}`}
                    onClick={() => isActive && handleFistSelect(value)}
                    disabled={!isActive}
                  >
                    <span className={styles.fistNumber}>{value}</span>
                    <span className={styles.fistLabel}>{FIST_LABELS[value]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Dot Voting — standalone row interface */}
            {activeSession.votingMethod === 'dot' && activeSession.options.length > 0 && (
              <div className={styles.dotRows}>
                {activeSession.options.map(option => (
                  <div key={option.id} className={styles.dotRow}>
                    <div className={styles.dotRowInfo}>
                      <span className={styles.dotRowName}>{option.name}</span>
                      {option.description && (
                        <span className={styles.optionDesc}>{option.description}</span>
                      )}
                    </div>
                    <div className={styles.dotControls}>
                      <button
                        type="button"
                        className={styles.dotBtn}
                        onClick={() => handleDotChange(option.id, -1)}
                        disabled={!isActive || getDotCount(option.id) === 0}
                      >
                        −
                      </button>
                      <span className={`${styles.dotCount} ${getDotCount(option.id) > 0 ? styles.dotCountActive : ''}`}>
                        {getDotCount(option.id)}
                      </span>
                      <button
                        type="button"
                        className={styles.dotBtn}
                        onClick={() => handleDotChange(option.id, 1)}
                        disabled={!isActive || getTotalDotsUsed() >= DOTS_PER_VOTER}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Option-based methods (single, approval, ranked, score) */}
            {activeSession.votingMethod !== 'dot' && activeSession.options.length > 0 && (
              <div className={styles.options}>
                {activeSession.options.map(option => {
                  const rankPos = getRankPosition(option.id);
                  const isRanked = rankPos !== -1;

                  return (
                    <div
                      key={option.id}
                      className={`${styles.option} ${isSelected(option.id) ? styles.selected : ''}`}
                      onClick={() => {
                        if (!isActive) return;
                        if (activeSession.votingMethod === 'single') handleSingleSelect(option.id);
                        else if (activeSession.votingMethod === 'approval') handleApprovalToggle(option.id);
                        else if (activeSession.votingMethod === 'ranked') handleRankSelect(option.id);
                      }}
                    >
                      {activeSession.votingMethod === 'ranked' ? (
                        <span className={`${styles.rankNumber} ${!isRanked ? styles.rankNumberUnranked : ''}`}>
                          {isRanked ? `#${rankPos + 1}` : '—'}
                        </span>
                      ) : activeSession.votingMethod === 'score' ? (
                        <span className={styles.scoreNumber}>{getScore(option.id) || '-'}</span>
                      ) : (
                        <span className={`${styles.checkbox} ${isSelected(option.id) ? styles.checked : ''}`}>
                          {isSelected(option.id) && '✓'}
                        </span>
                      )}
                      <div className={styles.optionText}>
                        <span className={styles.optionName}>{option.name}</span>
                        {option.description && (
                          <span className={styles.optionDesc}>{option.description}</span>
                        )}
                      </div>
                      {activeSession.votingMethod === 'score' && isActive && (
                        <div className={styles.scoreButtons}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <button
                              key={s}
                              type="button"
                              className={`${styles.scoreBtn} ${getScore(option.id) === s ? styles.activeScore : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScoreChange(option.id, s);
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isActive && !hasVoted && (
              <Button
                type="button"
                className={styles.submitBtn}
                onClick={handleVote}
                disabled={!canSubmit()}
                size="lg"
              >
                Submit Vote
              </Button>
            )}

            {hasVoted && isActive && (
              <Button
                type="button"
                className={styles.submitBtn}
                onClick={handleVote}
                disabled={!canSubmit()}
                size="lg"
              >
                Update Vote
              </Button>
            )}
          </Card>

          <Card>
            <div className={styles.participantsHeader}>
              <h3>Participants ({users.length})</h3>
            </div>
            <div className={styles.participants}>
              {users.map(user => (
                <div key={user.id} className={styles.participant}>
                  {showNameEdit && user.id === userId ? (
                    <div className={styles.nameEdit}>
                      <Input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameChange()}
                        autoFocus
                      />
                      <Button type="button" size="sm" onClick={handleNameChange}>Save</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setShowNameEdit(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <span className={styles.participantName}>{user.name}</span>
                      {user.id === userId && (
                        <button
                          type="button"
                          className={styles.nameEditBtn}
                          onClick={() => { setTempName(userName || ''); setShowNameEdit(true); }}
                        >
                          ✏️
                        </button>
                      )}
                      {user.id === userId && <Badge variant="info">You</Badge>}
                      {user.id === activeSession.creatorId && <Badge>Creator</Badge>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className={styles.resultsSection}>
          <Card>
            <div className={styles.resultsHeader}>
              <h2>Live Results</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowResults(!showResults)}
              >
                {showResults ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showResults && results && (
              <>
                <ResultsChart results={results} options={activeSession.options} />
                <div className={styles.exportButtons}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const json = exportToJson(activeSession, results);
                      downloadFile(json, `vote-${activeSession.id}.json`, 'application/json');
                    }}
                  >
                    Download JSON
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const csv = exportToCsv(activeSession, results);
                      downloadFile(csv, `vote-${activeSession.id}.csv`, 'text/csv');
                    }}
                  >
                    Download CSV
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
