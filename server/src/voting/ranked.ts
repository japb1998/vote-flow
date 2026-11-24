import { Vote, Results, RankedRoundInfo } from '../types';

/**
 * Calculate Instant-Runoff Voting (Ranked Choice) results with deterministic
 * Borda tie-breaking and proper handling of exhausted ballots and symmetric ties.
 */
export function calculateRankedChoice(votes: Vote[], optionIds: string[]): Results {
  const validIds = new Set(optionIds);

  // Extract valid, deduplicated ranked ballots containing only known option IDs
  const validBallots: string[][] = [];
  votes.forEach(vote => {
    if (vote.selection.type === 'ranked' && Array.isArray(vote.selection.rankings)) {
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const optionId of vote.selection.rankings) {
        if (typeof optionId === 'string' && validIds.has(optionId) && !seen.has(optionId)) {
          seen.add(optionId);
          cleaned.push(optionId);
        }
      }
      if (cleaned.length > 0) {
        validBallots.push(cleaned);
      }
    }
  });

  const zeroTotals: Record<string, number> = {};
  const zeroPercentages: Record<string, number> = {};
  validIds.forEach(id => {
    zeroTotals[id] = 0;
    zeroPercentages[id] = 0;
  });

  if (validBallots.length === 0 || validIds.size === 0) {
    return {
      method: 'ranked',
      totals: zeroTotals,
      percentages: zeroPercentages,
      winner: undefined,
      roundInfo: undefined,
    };
  }

  const activeOptions = new Set(validIds);
  let round = 1;
  let roundInfo: RankedRoundInfo | undefined;
  let winner: string | undefined;

  while (!winner && activeOptions.size > 0) {
    const roundCounts: Record<string, number> = {};
    activeOptions.forEach(id => {
      roundCounts[id] = 0;
    });

    validBallots.forEach(rankings => {
      for (const optionId of rankings) {
        if (
          activeOptions.has(optionId) &&
          Object.prototype.hasOwnProperty.call(roundCounts, optionId)
        ) {
          roundCounts[optionId]++;
          break;
        }
      }
    });

    const activeBallots = Object.values(roundCounts).reduce((sum, c) => sum + c, 0);
    if (activeBallots === 0) {
      break;
    }

    let minVotes = Infinity;
    let maxVotes = -1;
    let minOptions: string[] = [];
    let maxOption: string | undefined;

    activeOptions.forEach(id => {
      const count = roundCounts[id];
      if (count < minVotes) {
        minVotes = count;
        minOptions = [id];
      } else if (count === minVotes) {
        minOptions.push(id);
      }
      if (count > maxVotes) {
        maxVotes = count;
        maxOption = id;
      }
    });

    // Strict majority of active (non-exhausted) ballots wins
    if (maxVotes > activeBallots / 2) {
      winner = maxOption;
      roundInfo = { round, counts: roundCounts };
      break;
    }

    let eliminated: string;
    if (minOptions.length === 1) {
      eliminated = minOptions[0];
    } else {
      // Deterministic Borda tie-breaker across valid ballots restricted to activeOptions
      const minOptionSet = new Set(minOptions);
      const bordaScores: Record<string, number> = {};
      minOptions.forEach(id => {
        bordaScores[id] = 0;
      });

      validBallots.forEach(rankings => {
        const activeRanking = rankings.filter(id => activeOptions.has(id));
        for (let i = 0; i < activeRanking.length; i++) {
          const id = activeRanking[i];
          if (
            minOptionSet.has(id) &&
            Object.prototype.hasOwnProperty.call(bordaScores, id)
          ) {
            bordaScores[id] += activeOptions.size - 1 - i;
          }
        }
      });

      let minBorda = Infinity;
      let bordaMinOptions: string[] = [];
      minOptions.forEach(id => {
        const score = bordaScores[id];
        if (score < minBorda) {
          minBorda = score;
          bordaMinOptions = [id];
        } else if (score === minBorda) {
          bordaMinOptions.push(id);
        }
      });

      // Completely symmetric tie: all active options tied on both first-choice and Borda
      if (bordaMinOptions.length === activeOptions.size) {
        winner = undefined;
        roundInfo = { round, counts: roundCounts };
        break;
      }

      // Deterministic selection: unique Borda loser, or last tied loser in optionIds order
      eliminated = bordaMinOptions[bordaMinOptions.length - 1];
    }

    activeOptions.delete(eliminated);
    roundInfo = { round, eliminated, counts: roundCounts };
    round++;
  }

  const totalsResult: Record<string, number> = {};
  validIds.forEach(id => {
    totalsResult[id] =
      roundInfo && Object.prototype.hasOwnProperty.call(roundInfo.counts, id)
        ? roundInfo.counts[id]
        : 0;
  });

  const finalActiveBallots = Object.values(totalsResult).reduce((sum, c) => sum + c, 0);
  const percentages: Record<string, number> = {};
  validIds.forEach(id => {
    percentages[id] = finalActiveBallots > 0 ? (totalsResult[id] / finalActiveBallots) * 100 : 0;
  });

  return {
    method: 'ranked',
    totals: totalsResult,
    percentages,
    winner,
    roundInfo,
  };
}
