import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Badge } from '../components/Badge';
import { useSocket } from '../contexts/SocketContext';
import { VotingMethodInfo, VotingMethodInfoStandalone } from '../components/VotingMethodInfo';
import { BulkOptionInput } from '../components/BulkOptionInput';
import { HeroLogo } from '../components/HeroLogo';
import { VotingMethod } from '../types';
import type { ParsedOption } from '../utils/optionParsers';
import styles from './HomePage.module.css';

interface OptionInput {
  name: string;
  description: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const { currentSession, error, userSessions } = useSocket();
  const [joinSessionId, setJoinSessionId] = useState('');
  const [userName, setUserName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [votingMethod, setVotingMethod] = useState<VotingMethod>('single');
  const [options, setOptions] = useState<OptionInput[]>([
    { name: '', description: '' },
    { name: '', description: '' }
  ]);
  const [inputMode, setInputMode] = useState<'manual' | 'bulk'>('manual');

  const { createSession, joinSession } = useSocket();

  const handleCreate = () => {
    if (!sessionTitle.trim()) return;
    const validOptions = options.filter(o => o.name.trim());
    if (validOptions.length < 2) return;
    
    createSession(sessionTitle, votingMethod, validOptions);
  };

  const handleJoin = () => {
    if (!joinSessionId.trim() || !userName.trim()) return;
    joinSession(joinSessionId.toUpperCase(), userName);
  };

  React.useEffect(() => {
    if (currentSession) {
      navigate(`/session/${currentSession.id}`);
    }
  }, [currentSession, navigate]);

  const addOption = () => {
    setOptions([...options, { name: '', description: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: 'name' | 'description', value: string) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const handleBulkApply = (parsed: ParsedOption[]) => {
    setOptions(parsed.map(p => ({ name: p.name, description: p.description })));
    setInputMode('manual');
  };

  const handleSessionImport = (session: { title?: string; votingMethod?: string; options: ParsedOption[] }) => {
    if (session.title) setSessionTitle(session.title);
    if (session.votingMethod && ['single', 'approval', 'ranked', 'score'].includes(session.votingMethod)) {
      setVotingMethod(session.votingMethod as VotingMethod);
    }
    setOptions(session.options.map(p => ({ name: p.name, description: p.description })));
    setInputMode('manual');
  };

  const votingMethods = [
    { value: 'single', label: 'Single Choice (Plurality)' },
    { value: 'approval', label: 'Approval Voting' },
    { value: 'ranked', label: 'Ranked Choice (IRV)' },
    { value: 'score', label: 'Score Voting (1-5)' }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <HeroLogo />
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {!showCreate ? (
        <>
          <div className={styles.actions}>
            <Card className={styles.card}>
              <h2>Create Session</h2>
              <p className={styles.cardDesc}>Start a new voting session</p>
              <Button onClick={() => setShowCreate(true)} size="lg">
                Create New Session
              </Button>
            </Card>

            <Card className={styles.card}>
              <h2>Join Session</h2>
              <p className={styles.cardDesc}>Enter a session code to join</p>
              <div className={styles.joinForm}>
                <Input
                  placeholder="Session ID"
                  value={joinSessionId}
                  onChange={(e) => setJoinSessionId(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <Input
                  placeholder="Your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <Button
                  onClick={handleJoin}
                  disabled={!joinSessionId.trim() || !userName.trim()}
                  size="lg"
                >
                  Join
                </Button>
              </div>
            </Card>
          </div>

          {userSessions.length > 0 && (
            <div className={styles.sessionsSection}>
              <h2 className={styles.sessionsTitle}>Your Sessions</h2>
              <div className={styles.sessionsList}>
                {userSessions.map(session => (
                  <Card
                    key={session.id}
                    className={styles.sessionItem}
                    hoverable
                    onClick={() => {
                      const persistentId = localStorage.getItem('vf-user-id');
                      navigate(`/session/${session.id}${persistentId ? `?userId=${persistentId}` : ''}`);
                    }}
                  >
                    <div className={styles.sessionHeader}>
                      <span className={styles.sessionName}>{session.title}</span>
                      <div className={styles.sessionBadges}>
                        {session.role === 'creator' ? (
                          <Badge variant="info">Creator</Badge>
                        ) : (
                          <Badge variant="default">Voted</Badge>
                        )}
                        <Badge variant={session.status === 'active' ? 'success' : 'warning'}>
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                    <div className={styles.sessionMeta}>
                      <span>{session.votingMethod}</span>
                      <span>{session.voteCount} vote{session.voteCount !== 1 ? 's' : ''}</span>
                      <span>{session.userCount} participant{session.userCount !== 1 ? 's' : ''}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <VotingMethodInfoStandalone />
        </>
      ) : (
        <Card className={styles.createCard}>
          <h2>Create Voting Session</h2>
          
          <div className={styles.form}>
            <Input
              label="Session Title"
              placeholder="What are we voting on?"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
            />

            <Select
              label="Voting Method"
              options={votingMethods}
              value={votingMethod}
              onChange={(e) => setVotingMethod(e.target.value as VotingMethod)}
            />

            <VotingMethodInfo selectedMethod={votingMethod} />

            <div className={styles.optionsSection}>
              <div className={styles.optionsHeader}>
                <label className={styles.label}>Options</label>
                <div className={styles.modeSwitcher}>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${inputMode === 'manual' ? styles.modeBtnActive : ''}`}
                    onClick={() => setInputMode('manual')}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${inputMode === 'bulk' ? styles.modeBtnActive : ''}`}
                    onClick={() => setInputMode('bulk')}
                  >
                    Bulk / Import
                  </button>
                </div>
              </div>

              {inputMode === 'manual' ? (
                <>
                  {options.map((option, index) => (
                    <div key={index} className={styles.optionRow}>
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option.name}
                        onChange={(e) => updateOption(index, 'name', e.target.value)}
                      />
                      <Input
                        placeholder="Description (optional)"
                        value={option.description}
                        onChange={(e) => updateOption(index, 'description', e.target.value)}
                      />
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          onClick={() => removeOption(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="secondary" onClick={addOption}>
                    + Add Option
                  </Button>
                </>
              ) : (
                <BulkOptionInput onParse={handleBulkApply} onSessionImport={handleSessionImport} />
              )}
            </div>

            <div className={styles.createActions}>
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!sessionTitle.trim() || options.filter(o => o.name.trim()).length < 2}
              >
                Create Session
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
