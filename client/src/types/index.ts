export type VotingMethod = 'single' | 'approval' | 'ranked' | 'score';

export interface Option {
  id: string;
  name: string;
  description?: string;
}

export type Selection =
  | { type: 'single'; optionId: string }
  | { type: 'approval'; optionIds: string[] }
  | { type: 'ranked'; rankings: string[] }
  | { type: 'score'; scores: Record<string, number> };

export interface Vote {
  id: string;
  userId: string;
  userName: string;
  selection: Selection;
  timestamp: number;
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
}

export interface Results {
  method: VotingMethod;
  totals: Record<string, number>;
  percentages: Record<string, number>;
  winner?: string;
  roundInfo?: RankedRoundInfo;
  averageScores?: Record<string, number>;
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

export interface SessionSummary {
  id: string;
  title: string;
  status: 'active' | 'closed';
  votingMethod: VotingMethod;
  createdAt: number;
  role: 'creator' | 'voter';
  voteCount: number;
  userCount: number;
}
