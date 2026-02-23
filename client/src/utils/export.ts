import { Session, Results } from '../types';

export function exportToJson(session: Session, results: Results): string {
  const data = {
    session: {
      id: session.id,
      title: session.title,
      votingMethod: session.votingMethod,
      status: session.status,
      createdAt: session.createdAt,
    },
    options: session.options,
    results: {
      totals: results.totals,
      percentages: results.percentages,
      winner: results.winner,
      averageScores: results.averageScores,
      roundInfo: results.roundInfo,
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
  
  lines.push(`Session: ${session.title}`);
  lines.push(`Session ID: ${session.id}`);
  lines.push(`Voting Method: ${session.votingMethod}`);
  lines.push(`Status: ${session.status}`);
  lines.push('');
  
  lines.push('Results');
  lines.push('Option,Votes,Percentage,Winner');
  
  session.options.forEach(option => {
    const votes = results.totals[option.id] || 0;
    const percentage = (results.percentages[option.id] || 0).toFixed(1);
    const isWinner = results.winner === option.id ? 'Yes' : 'No';
    lines.push(`"${option.name}",${votes},${percentage}%,${isWinner}`);
  });
  
  if (results.averageScores) {
    lines.push('');
    lines.push('Average Scores');
    lines.push('Option,Average Score');
    session.options.forEach(option => {
      const avg = (results.averageScores?.[option.id] || 0).toFixed(2);
      lines.push(`"${option.name}",${avg}`);
    });
  }
  
  lines.push('');
  lines.push('Votes');
  lines.push('User,Vote,Timestamp');
  
  session.votes.forEach(vote => {
    let voteStr = '';
    if (vote.selection.type === 'single') {
      const sel = vote.selection as { type: 'single'; optionId: string };
      const opt = session.options.find(o => o.id === sel.optionId);
      voteStr = opt?.name || sel.optionId;
    } else if (vote.selection.type === 'approval') {
      const sel = vote.selection as { type: 'approval'; optionIds: string[] };
      voteStr = sel.optionIds.map(id => {
        const opt = session.options.find(o => o.id === id);
        return opt?.name || id;
      }).join('; ');
    } else if (vote.selection.type === 'ranked') {
      const sel = vote.selection as { type: 'ranked'; rankings: string[] };
      voteStr = sel.rankings.map((id, i) => {
        const opt = session.options.find(o => o.id === id);
        return `${i + 1}. ${opt?.name || id}`;
      }).join('; ');
    } else if (vote.selection.type === 'score') {
      const sel = vote.selection as { type: 'score'; scores: Record<string, number> };
      voteStr = Object.entries(sel.scores).map(([id, score]) => {
        const opt = session.options.find(o => o.id === id);
        return `${opt?.name || id}: ${score}`;
      }).join('; ');
    }
    
    lines.push(`"${vote.userName}","${voteStr}",${new Date(vote.timestamp).toISOString()}`);
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
