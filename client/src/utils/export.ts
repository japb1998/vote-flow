import { Session, Results, VotingMethod } from '../types';

const ROMAN_LABELS: Record<string, string> = {
  up: 'Support',
  down: 'Oppose',
  sideways: 'Neutral',
};

const FIST_LABELS: Record<string, string> = {
  '1': '1 - Blocking concern',
  '2': '2 - Serious reservations',
  '3': '3 - Can live with it',
  '4': '4 - Good idea',
  '5': '5 - Strong support',
};

function getOptionlessLabel(method: VotingMethod, key: string): string {
  if (method === 'roman') return ROMAN_LABELS[key] || key;
  if (method === 'fist-of-five') return FIST_LABELS[key] || key;
  return key;
}

/**
 * Escapes a value for RFC 4180 CSV output and neutralizes spreadsheet formula injection.
 */
export function escapeCsvCell(value: string | number): string {
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToJson(session: Session, results: Results): string {
  const data = {
    session: {
      id: session.id,
      title: session.title,
      votingMethod: session.votingMethod,
      status: session.status,
      createdAt: session.createdAt,
      closedAt: session.closedAt,
      config: session.config,
    },
    options: session.options,
    results: {
      method: results.method,
      totals: results.totals,
      percentages: results.percentages,
      winner: results.winner,
      averageScores: results.averageScores,
      roundInfo: results.roundInfo,
      average: results.average,
      median: results.median,
      consensus: results.consensus,
      passed: results.passed,
    },
    votes: session.votes.map(v => ({
      userId: v.userId,
      userName: v.userName,
      selection: v.selection,
      timestamp: v.timestamp,
    })),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function exportToCsv(session: Session, results: Results): string {
  const lines: string[] = [];

  lines.push(`Session,${escapeCsvCell(session.title)}`);
  lines.push(`Session ID,${escapeCsvCell(session.id)}`);
  lines.push(`Voting Method,${escapeCsvCell(session.votingMethod)}`);
  lines.push(`Status,${escapeCsvCell(session.status)}`);
  lines.push('');

  lines.push('Results');
  lines.push('Option,Votes,Percentage,Winner');

  if (session.options.length > 0) {
    session.options.forEach(option => {
      const votes = results.totals[option.id] || 0;
      const percentage = `${(results.percentages[option.id] || 0).toFixed(1)}%`;
      const isWinner = results.winner === option.id ? 'Yes' : 'No';
      lines.push(`${escapeCsvCell(option.name)},${escapeCsvCell(votes)},${escapeCsvCell(percentage)},${escapeCsvCell(isWinner)}`);
    });
  } else {
    Object.keys(results.totals).forEach(key => {
      const label = getOptionlessLabel(session.votingMethod, key);
      const votes = results.totals[key] || 0;
      const percentage = `${(results.percentages[key] || 0).toFixed(1)}%`;
      const isWinner = results.winner === key ? 'Yes' : 'No';
      lines.push(`${escapeCsvCell(label)},${escapeCsvCell(votes)},${escapeCsvCell(percentage)},${escapeCsvCell(isWinner)}`);
    });
  }

  const summaryRows: [string, string][] = [];
  if (results.average !== undefined) {
    summaryRows.push(['Average', results.average.toFixed(2)]);
  }
  if (results.median !== undefined) {
    summaryRows.push(['Median', String(results.median)]);
  }
  if (results.consensus !== undefined) {
    summaryRows.push(['Consensus', results.consensus ? 'Yes' : 'No']);
  }
  if (results.passed !== undefined) {
    summaryRows.push(['Passed', results.passed ? 'Yes' : 'No']);
  }

  if (summaryRows.length > 0) {
    lines.push('');
    lines.push('Summary');
    lines.push('Metric,Value');
    summaryRows.forEach(([metric, value]) => {
      lines.push(`${escapeCsvCell(metric)},${escapeCsvCell(value)}`);
    });
  }

  if (results.averageScores) {
    lines.push('');
    lines.push('Average Scores');
    lines.push('Option,Average Score');
    session.options.forEach(option => {
      const avg = (results.averageScores?.[option.id] || 0).toFixed(2);
      lines.push(`${escapeCsvCell(option.name)},${escapeCsvCell(avg)}`);
    });
  }

  lines.push('');
  lines.push('Votes');
  lines.push('User,Vote,Timestamp');

  session.votes.forEach(vote => {
    let voteStr = '';
    const sel = vote.selection;
    switch (sel.type) {
      case 'single': {
        const opt = session.options.find(o => o.id === sel.optionId);
        voteStr = opt?.name || sel.optionId;
        break;
      }
      case 'approval': {
        voteStr = sel.optionIds.map(id => {
          const opt = session.options.find(o => o.id === id);
          return opt?.name || id;
        }).join('; ');
        break;
      }
      case 'ranked': {
        voteStr = sel.rankings.map((id, i) => {
          const opt = session.options.find(o => o.id === id);
          return `${i + 1}. ${opt?.name || id}`;
        }).join('; ');
        break;
      }
      case 'score': {
        voteStr = Object.entries(sel.scores).map(([id, score]) => {
          const opt = session.options.find(o => o.id === id);
          return `${opt?.name || id}: ${score}`;
        }).join('; ');
        break;
      }
      case 'poker': {
        voteStr = sel.value;
        break;
      }
      case 'dot': {
        voteStr = Object.entries(sel.allocations)
          .filter(([, dots]) => dots > 0)
          .map(([id, dots]) => {
            const opt = session.options.find(o => o.id === id);
            return `${opt?.name || id}: ${dots}`;
          })
          .join('; ');
        break;
      }
      case 'roman': {
        voteStr = ROMAN_LABELS[sel.vote] || sel.vote;
        break;
      }
      case 'fist-of-five': {
        voteStr = `${sel.value}/5`;
        break;
      }
    }

    lines.push(`${escapeCsvCell(vote.userName)},${escapeCsvCell(voteStr)},${escapeCsvCell(new Date(vote.timestamp).toISOString())}`);
  });

  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
