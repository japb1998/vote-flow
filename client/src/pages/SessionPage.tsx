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

const methodLabels: Record<VotingMethod, string> = {
  single: 'Single Choice',
  approval: 'Approval',
  ranked: 'Ranked Choice',
  score: 'Score'
};

const methodColors: Record<VotingMethod, 'info' | 'default'> = {
  single: 'info',
  approval: 'default',
  ranked: 'info',
  score: 'default'
};

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentSession, userId, userName, results, users, joinSession, submitVote, closeSession, leaveSession, updateUserName, error, errorCode, isConnected } = useSocket();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [tempName, setTempName] = useState('');
  const [copied, setCopied] = useState(false);
  const [sessionNotFound, setSessionNotFound] = useState(false);
  const rejoinAttempted = useRef(false);

  // Auto-rejoin if userId is in URL params (wait for socket connection)
  useEffect(() => {
    if (!currentSession && sessionId && isConnected && !rejoinAttempted.current) {
      const urlUserId = searchParams.get('userId');
      if (urlUserId) {
        rejoinAttempted.current = true;
        joinSession(sessionId.toUpperCase(), '', urlUserId);
      } else {
        setShowNameModal(true);
      }
    }
  }, [sessionId, currentSession, searchParams, joinSession, isConnected]);

  // If rejoin failed (user not found), show name modal for fresh join
  useEffect(() => {
    if (errorCode === 'USER_NOT_FOUND' && !currentSession) {
      setShowNameModal(true);
    }
    if (errorCode === 'SESSION_NOT_FOUND') {
      setSessionNotFound(true);
      setShowNameModal(false);
    }
  }, [errorCode, currentSession]);

  // Persist userId in URL after successful join
  useEffect(() => {
    if (userId && sessionId) {
      const currentUrlUserId = searchParams.get('userId');
      if (currentUrlUserId !== userId) {
        setSearchParams({ userId }, { replace: true });
      }
    }
  }, [userId, sessionId, searchParams, setSearchParams]);

  const handleShare = async () => {
    // Share a clean URL without userId so recipients join as new users
    const url = `${window.location.origin}/session/${currentSession?.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(currentSession?.id || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(currentSession?.id || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleJoinWithName = () => {
    if (tempName.trim() && sessionId) {
      joinSession(sessionId.toUpperCase(), tempName.trim());
      setShowNameModal(false);
    }
  };

  const handleNameChange = () => {
    if (tempName.trim()) {
      updateUserName(tempName.trim());
      setShowNameEdit(false);
    }
  };

  useEffect(() => {
    if (currentSession && userId) {
      const existingVote = currentSession.votes.find(v => v.userId === userId);
      if (existingVote) {
        setSelection(existingVote.selection);
        setHasVoted(true);
      }
    }
  }, [currentSession, userId]);

  const handleBack = () => {
    leaveSession();
    navigate('/');
  };

  const handleVote = () => {
    if (!selection || !currentSession || !userId) return;

    const vote = {
      userId,
      userName: users.find(u => u.id === userId)?.name || 'Anonymous',
      selection
    };

    submitVote(currentSession.id, vote);
    setHasVoted(true);
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
    let newRankings: string[];
    
    if (current.includes(optionId)) {
      newRankings = current.filter(id => id !== optionId);
    } else {
      newRankings = [...current, optionId];
    }
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

  const getSelectionMode = (): 'single' | 'multiple' | 'rank' | 'score' => {
    if (!currentSession) return 'single';
    switch (currentSession.votingMethod) {
      case 'single': return 'single';
      case 'approval': return 'multiple';
      case 'ranked': return 'rank';
      case 'score': return 'score';
      default: return 'single';
    }
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
        return selection.rankings.length === (currentSession?.options.length || 0);
      case 'score':
        return Object.keys(selection.scores).length === (currentSession?.options.length || 0);
      default:
        return false;
    }
  };

  if (!currentSession) {
    if (sessionNotFound) {
      return (
        <div className={styles.container}>
          <div className={styles.loading} style={{ flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>Session not found</p>
            <p style={{ color: 'var(--color-text-muted)' }}>
              The session <strong>{sessionId}</strong> does not exist or has expired.
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
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
              {error && <p className={styles.error} style={{ marginBottom: '1rem' }}>{error}</p>}
              <div className={styles.modalForm}>
                <Input
                  label="Your Name"
                  placeholder="Enter your name"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinWithName()}
                  autoFocus
                />
                <Button
                  onClick={handleJoinWithName}
                  disabled={!tempName.trim()}
                  size="lg"
                >
                  Join Session
                </Button>
              </div>
            </Card>
          </div>
        )}
        <div className={styles.loading}>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  const isCreator = currentSession.creatorId === userId;
  const isActive = currentSession.status === 'active';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{currentSession.title}</h1>
          <div className={styles.meta}>
            <span className={styles.sessionId}>ID: {currentSession.id}</span>
            <button className={styles.shareBtn} onClick={handleCopyId} title="Copy Session ID">
              📋
            </button>
            <button className={styles.shareBtn} onClick={handleShare} title="Copy Session Link">
              {copied ? '✓' : 'Share'}
            </button>
            <Badge variant={isActive ? 'success' : 'danger'}>
              {isActive ? 'Active' : 'Closed'}
            </Badge>
            <Badge variant={methodColors[currentSession.votingMethod]}>
              {methodLabels[currentSession.votingMethod]}
            </Badge>
          </div>
        </div>
        {isCreator && isActive && (
          <Button
            variant="danger"
            onClick={() => closeSession(currentSession.id)}
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

            {currentSession.votingMethod === 'single' && (
              <p className={styles.instruction}>Select one option</p>
            )}
            {currentSession.votingMethod === 'approval' && (
              <p className={styles.instruction}>Select all options you approve</p>
            )}
            {currentSession.votingMethod === 'ranked' && (
              <p className={styles.instruction}>Rank all options by preference (click to order)</p>
            )}
            {currentSession.votingMethod === 'score' && (
              <p className={styles.instruction}>Rate each option from 1-5</p>
            )}

            <div className={styles.options}>
              {currentSession.options.map((option, index) => (
                <div
                  key={option.id}
                  className={`${styles.option} ${isSelected(option.id) ? styles.selected : ''}`}
                  onClick={() => {
                    if (!isActive) return;
                    if (currentSession.votingMethod === 'single') handleSingleSelect(option.id);
                    else if (currentSession.votingMethod === 'approval') handleApprovalToggle(option.id);
                    else if (currentSession.votingMethod === 'ranked') handleRankSelect(option.id);
                  }}
                >
                  {currentSession.votingMethod === 'ranked' ? (
                    <span className={styles.rankNumber}>
                      {getRankPosition(option.id) !== -1 ? `#${getRankPosition(option.id) + 1}` : `#${index + 1}`}
                    </span>
                  ) : currentSession.votingMethod === 'score' ? (
                    <span className={styles.scoreNumber}>{getScore(option.id) || '-'}</span>
                  ) : (
                    <span className={`${styles.checkbox} ${isSelected(option.id) ? styles.checked : ''}`}>
                      {isSelected(option.id) && '✓'}
                    </span>
                  )}
                  <span className={styles.optionName}>{option.name}</span>
                  {currentSession.votingMethod === 'score' && isActive && (
                    <div className={styles.scoreButtons}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
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
              ))}
            </div>

            {isActive && !hasVoted && (
              <Button
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
                      <Button size="sm" onClick={handleNameChange}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNameEdit(false)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <span className={styles.participantName}>{user.name}</span>
                      {user.id === userId && (
                        <button 
                          className={styles.nameEditBtn}
                          onClick={() => { setTempName(userName || ''); setShowNameEdit(true); }}
                        >
                          ✏️
                        </button>
                      )}
                      {user.id === userId && <Badge variant="info">You</Badge>}
                      {user.id === currentSession.creatorId && <Badge>Creator</Badge>}
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
                variant="ghost"
                size="sm"
                onClick={() => setShowResults(!showResults)}
              >
                {showResults ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showResults && results && (
              <>
                <ResultsChart results={results} options={currentSession.options} />
                <div className={styles.exportButtons}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const json = exportToJson(currentSession, results);
                      downloadFile(json, `vote-${currentSession.id}.json`, 'application/json');
                    }}
                  >
                    Download JSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const csv = exportToCsv(currentSession, results);
                      downloadFile(csv, `vote-${currentSession.id}.csv`, 'text/csv');
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
