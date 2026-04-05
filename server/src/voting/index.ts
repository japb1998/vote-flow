import { Vote, Results, VotingMethod, SessionConfig } from '../types';
import { calculateSingleChoice } from './single';
import { calculateApproval } from './approval';
import { calculateRankedChoice } from './ranked';
import { calculateScore } from './score';
import { calculatePoker } from './poker';
import { calculateDot } from './dot';
import { calculateRoman } from './roman';
import { calculateFistOfFive } from './fist-of-five';

export function calculateResults(
  votes: Vote[],
  optionIds: string[],
  method: VotingMethod,
  config?: SessionConfig
): Results {
  switch (method) {
    case 'single':
      return calculateSingleChoice(votes, optionIds);
    case 'approval':
      return calculateApproval(votes, optionIds);
    case 'ranked':
      return calculateRankedChoice(votes, optionIds);
    case 'score':
      return calculateScore(votes, optionIds);
    case 'poker':
      return calculatePoker(votes, config);
    case 'dot':
      return calculateDot(votes, optionIds);
    case 'roman':
      return calculateRoman(votes);
    case 'fist-of-five':
      return calculateFistOfFive(votes);
    default:
      return { method, totals: {}, percentages: {} };
  }
}

export {
  calculateSingleChoice,
  calculateApproval,
  calculateRankedChoice,
  calculateScore,
  calculatePoker,
  calculateDot,
  calculateRoman,
  calculateFistOfFive,
};
