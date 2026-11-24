import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useSocket } from '../contexts/SocketContext';
import { VotingMethodInfo, VotingMethodInfoStandalone } from '../components/VotingMethodInfo';
import { BulkOptionInput } from '../components/BulkOptionInput';
import { HeroLogo } from '../components/HeroLogo';
import { VotingMethod, SessionConfig } from '../types';
import type { ParsedOption, ParsedSession } from '../utils/optionParsers';
import styles from './HomePage.module.css';

const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const VALID_METHODS: VotingMethod[] = ['single', 'approval', 'ranked', 'score', 'poker', 'dot', 'roman', 'fist-of-five'];
const NO_OPTIONS_METHODS: VotingMethod[] = ['poker', 'roman', 'fist-of-five'];
const MAX_OPTIONS = 20;

interface OptionInput {
  name: string;
  description: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const { currentSession, error, createSession, joinSession } = useSocket();
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
  const [pokerMin, setPokerMin] = useState(1);
  const [pokerMax, setPokerMax] = useState(89);
  const [dotsPerVoter, setDotsPerVoter] = useState(3);
  const pendingNavRef = useRef(false);

  const needsOptions = !NO_OPTIONS_METHODS.includes(votingMethod);
  const trimmedJoinId = joinSessionId.trim();
  const trimmedUserName = userName.trim();

  const handleCreate = () => {
    const trimmedTitle = sessionTitle.trim();
    if (!trimmedTitle) return;
    const validOptions = options
      .filter(o => o.name.trim())
      .slice(0, MAX_OPTIONS)
      .map(o => ({ name: o.name.trim(), description: o.description.trim() }));
    if (needsOptions && validOptions.length < 2) return;

    let config: SessionConfig | undefined;
    if (votingMethod === 'poker') {
      config = { pokerMin, pokerMax };
    } else if (votingMethod === 'dot') {
      config = { dotsPerVoter };
    }

    pendingNavRef.current = true;
    createSession(trimmedTitle, votingMethod, needsOptions ? validOptions : [], config);
  };

  const handleJoin = () => {
    const normalizedId = joinSessionId.trim().toUpperCase();
    const cleanName = userName.trim();
    if (normalizedId.length !== 6 || !cleanName) return;
    pendingNavRef.current = true;
    joinSession(normalizedId, cleanName);
  };

  useEffect(() => {
    if (currentSession && pendingNavRef.current) {
      pendingNavRef.current = false;
      navigate(`/session/${currentSession.id}`);
    }
  }, [currentSession, navigate]);

  useEffect(() => {
    if (error) {
      pendingNavRef.current = false;
    }
  }, [error]);

  const addOption = () => {
    if (options.length >= MAX_OPTIONS) return;
    setOptions([...options, { name: '', description: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: 'name' | 'description', value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleBulkApply = (parsed: ParsedOption[]) => {
    const limited = parsed
      .slice(0, MAX_OPTIONS)
      .map(p => ({ name: p.name, description: p.description }));
    while (limited.length < 2) {
      limited.push({ name: '', description: '' });
    }
    setOptions(limited);
    setInputMode('manual');
  };

  const handleSessionImport = (session: ParsedSession) => {
    if (session.title) setSessionTitle(session.title);
    if (session.votingMethod && VALID_METHODS.includes(session.votingMethod as VotingMethod)) {
      setVotingMethod(session.votingMethod as VotingMethod);
    }
    if (session.config) {
      const hasValidMin =
        session.config.pokerMin !== undefined &&
        FIBONACCI_SEQUENCE.includes(session.config.pokerMin);
      const hasValidMax =
        session.config.pokerMax !== undefined &&
        FIBONACCI_SEQUENCE.includes(session.config.pokerMax);

      const nextMin = hasValidMin ? session.config.pokerMin! : pokerMin;
      const nextMax = hasValidMax ? session.config.pokerMax! : pokerMax;

      if (nextMin <= nextMax) {
        if (hasValidMin) setPokerMin(nextMin);
        if (hasValidMax) setPokerMax(nextMax);
      }

      if (
        session.config.dotsPerVoter !== undefined &&
        Number.isInteger(session.config.dotsPerVoter) &&
        session.config.dotsPerVoter >= 1 &&
        session.config.dotsPerVoter <= 10
      ) {
        setDotsPerVoter(session.config.dotsPerVoter);
      }
    }
    if (session.options.length > 0) {
      const imported = session.options
        .slice(0, MAX_OPTIONS)
        .map(p => ({ name: p.name, description: p.description }));
      while (imported.length < 2) {
        imported.push({ name: '', description: '' });
      }
      setOptions(imported);
    }
    setInputMode('manual');
  };

  const votingMethods = [
    { value: 'single', label: 'Single Choice (Plurality)' },
    { value: 'approval', label: 'Approval Voting' },
    { value: 'ranked', label: 'Ranked Choice (IRV)' },
    { value: 'score', label: 'Score Voting (1-5)' },
    { value: 'poker', label: 'Planning Poker' },
    { value: 'dot', label: 'Dot Voting' },
    { value: 'roman', label: 'Roman Voting' },
    { value: 'fist-of-five', label: 'Fist of Five' },
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
              <Button type="button" onClick={() => setShowCreate(true)} size="lg">
                Create New Session
              </Button>
            </Card>

            <Card className={styles.card}>
              <h2>Join Session</h2>
              <p className={styles.cardDesc}>Enter a session code to join</p>
              <form
                className={styles.joinForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoin();
                }}
              >
                <Input
                  placeholder="Session ID (6 characters)"
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
                  type="submit"
                  disabled={trimmedJoinId.length !== 6 || !trimmedUserName}
                  size="lg"
                >
                  Join
                </Button>
              </form>
            </Card>
          </div>

          <VotingMethodInfoStandalone />
        </>
      ) : (
        <Card className={styles.createCard}>
          <h2>Create Voting Session</h2>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
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

            {votingMethod === 'poker' && (
              <div className={styles.configSection}>
                <label className={styles.label}>Fibonacci Range</label>
                <div className={styles.configRow}>
                  <Select
                    label="Min"
                    options={FIBONACCI_SEQUENCE.filter(n => n <= pokerMax).map(n => ({ value: String(n), label: String(n) }))}
                    value={String(pokerMin)}
                    onChange={(e) => setPokerMin(Number(e.target.value))}
                  />
                  <Select
                    label="Max"
                    options={FIBONACCI_SEQUENCE.filter(n => n >= pokerMin).map(n => ({ value: String(n), label: String(n) }))}
                    value={String(pokerMax)}
                    onChange={(e) => setPokerMax(Number(e.target.value))}
                  />
                </div>
                <p className={styles.configHint}>
                  Cards: {FIBONACCI_SEQUENCE.filter(n => n >= pokerMin && n <= pokerMax).join(', ')}
                </p>
              </div>
            )}

            {votingMethod === 'dot' && (
              <div className={styles.configSection}>
                <Select
                  label="Dots per voter"
                  options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                  value={String(dotsPerVoter)}
                  onChange={(e) => setDotsPerVoter(Number(e.target.value))}
                />
              </div>
            )}

            {needsOptions ? (
              <div className={styles.optionsSection}>
                <div className={styles.optionsHeader}>
                  <label className={styles.label}>Options ({options.length}/{MAX_OPTIONS})</label>
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
                            type="button"
                            variant="ghost"
                            onClick={() => removeOption(index)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addOption}
                      disabled={options.length >= MAX_OPTIONS}
                    >
                      + Add Option
                    </Button>
                  </>
                ) : (
                  <BulkOptionInput onParse={handleBulkApply} onSessionImport={handleSessionImport} votingMethod={votingMethod} />
                )}
              </div>
            ) : (
              <div className={styles.optionsSection}>
                <div className={styles.optionsHeader}>
                  <label className={styles.label}>Session Import</label>
                  <button
                    type="button"
                    className={`${styles.importToggleBtn} ${inputMode === 'bulk' ? styles.importToggleBtnActive : ''}`}
                    onClick={() => setInputMode(inputMode === 'bulk' ? 'manual' : 'bulk')}
                  >
                    {inputMode === 'bulk' ? 'Hide Import' : 'Import from JSON / YAML'}
                  </button>
                </div>

                {inputMode === 'bulk' && (
                  <BulkOptionInput onParse={handleBulkApply} onSessionImport={handleSessionImport} votingMethod={votingMethod} />
                )}
              </div>
            )}

            <div className={styles.createActions}>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!sessionTitle.trim() || (needsOptions && options.filter(o => o.name.trim()).length < 2)}
              >
                Create Session
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
