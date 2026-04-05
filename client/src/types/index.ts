export type VotingMethod = 'single' | 'approval' | 'ranked' | 'score' | 'poker' | 'dot' | 'roman' | 'fist-of-five';

export interface Option {
  id: string;
  name: string;
  description?: string;
}

export type Selection =
  | { type: 'single'; optionId: string }
  | { type: 'approval'; optionIds: string[] }
  | { type: 'ranked'; rankings: string[] }
  | { type: 'score'; scores: Record<string, number> }
  | { type: 'poker'; value: string }
  | { type: 'dot'; allocations: Record<string, number> }
  | { type: 'roman'; vote: 'up' | 'down' | 'sideways' }
  | { type: 'fist-of-five'; value: 1 | 2 | 3 | 4 | 5 };

export interface Vote {
  id: string;
  userId: string;
  userName: string;
  selection: Selection;
  timestamp: number;
}

export interface SessionConfig {
  pokerMin?: number;
  pokerMax?: number;
  dotsPerVoter?: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  status: 'active' | 'closed';
  votingMethod: VotingMethod;
  options: Option[];
  votes: Vote[];
  creatorId: string;
  closedAt?: number;
  expiresAt: number;
  config?: SessionConfig;
}

export interface Results {
  method: VotingMethod;
  totals: Record<string, number>;
  percentages: Record<string, number>;
  winner?: string;
  roundInfo?: RankedRoundInfo;
  averageScores?: Record<string, number>;
  average?: number;
  median?: number;
  consensus?: boolean;
  passed?: boolean;
}

export interface RankedRoundInfo {
  round: number;
  eliminated?: string;
  counts: Record<string, number>;
}

export interface CreateSessionPayload {
  title: string;
  votingMethod: VotingMethod;
  options: { name: string; description?: string }[];
  config?: SessionConfig;
}

export interface JoinSessionPayload {
  sessionId: string;
  userName: string;
  userId?: string;
}

export interface SubmitVotePayload {
  sessionId: string;
  vote: Omit<Vote, 'id' | 'timestamp'>;
}

export interface UserInfo {
  id: string;
  name: string;
}
