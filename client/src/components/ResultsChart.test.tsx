import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsChart } from './ResultsChart';
import { Results, Option } from '../types';

const options: Option[] = [
  { id: 'opt1', name: 'Option A' },
  { id: 'opt2', name: 'Option B' },
  { id: 'opt3', name: 'Option C' },
];

const singleResults: Results = {
  method: 'single',
  totals: { opt1: 5, opt2: 3, opt3: 2 },
  percentages: { opt1: 50, opt2: 30, opt3: 20 },
  winner: 'opt1',
};

const approvalResults: Results = {
  method: 'approval',
  totals: { opt1: 8, opt2: 6, opt3: 4 },
  percentages: { opt1: 80, opt2: 60, opt3: 40 },
  winner: 'opt1',
};

describe('ResultsChart', () => {
  // ─── Option names ──────────────────────────────────────────────────────────

  it('renders all option names', () => {
    render(<ResultsChart results={singleResults} options={options} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  // ─── Vote counts & percentages ─────────────────────────────────────────────

  it('renders vote counts for each option', () => {
    render(<ResultsChart results={singleResults} options={options} />);
    expect(screen.getByText('5 votes')).toBeInTheDocument();
    expect(screen.getByText('3 votes')).toBeInTheDocument();
    expect(screen.getByText('2 votes')).toBeInTheDocument();
  });

  it('renders percentage for each option', () => {
    render(<ResultsChart results={singleResults} options={options} />);
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
  });

  // ─── Winner badge ──────────────────────────────────────────────────────────

  it('shows Winner badge for the winning option', () => {
    render(<ResultsChart results={singleResults} options={options} />);
    expect(screen.getByText('Winner')).toBeInTheDocument();
  });

  it('does not show Winner badge when there is no winner', () => {
    const noWinner: Results = { ...singleResults, winner: undefined };
    render(<ResultsChart results={noWinner} options={options} />);
    expect(screen.queryByText('Winner')).not.toBeInTheDocument();
  });

  it('applies winner class only to the winning option bar', () => {
    const { container } = render(<ResultsChart results={singleResults} options={options} />);
    const bars = container.querySelectorAll('[class*="bar"]');
    const winnerBars = Array.from(bars).filter(b => b.className.includes('winner'));
    expect(winnerBars).toHaveLength(1);
  });

  // ─── Score voting (averages) ───────────────────────────────────────────────

  it('shows avg label instead of votes for score method', () => {
    const scoreResults: Results = {
      method: 'score',
      totals: { opt1: 18, opt2: 12, opt3: 8 },
      percentages: { opt1: 60, opt2: 40, opt3: 26.7 },
      winner: 'opt1',
      averageScores: { opt1: 4.5, opt2: 3.0, opt3: 2.0 },
    };
    render(<ResultsChart results={scoreResults} options={options} />);
    expect(screen.getByText('4.5 avg')).toBeInTheDocument();
    expect(screen.getByText('3.0 avg')).toBeInTheDocument();
    expect(screen.getByText('2.0 avg')).toBeInTheDocument();
    // Should NOT show "votes"
    expect(screen.queryByText(/votes/)).not.toBeInTheDocument();
  });

  // ─── Ranked choice round info ──────────────────────────────────────────────

  it('renders round info section when present', () => {
    const rankedResults: Results = {
      method: 'ranked',
      totals: { opt1: 5, opt2: 3, opt3: 0 },
      percentages: { opt1: 50, opt2: 30, opt3: 0 },
      winner: 'opt1',
      roundInfo: { round: 2, eliminated: 'opt3', counts: { opt1: 5, opt2: 3 } },
    };
    render(<ResultsChart results={rankedResults} options={options} />);
    expect(screen.getByText('Round 2')).toBeInTheDocument();
    // "Option C" appears in both the bar list and round info — use getAllByText
    expect(screen.getAllByText(/Option C/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows eliminated option name in round info', () => {
    const rankedResults: Results = {
      method: 'ranked',
      totals: { opt1: 5, opt2: 3, opt3: 0 },
      percentages: { opt1: 50, opt2: 30, opt3: 0 },
      winner: 'opt1',
      roundInfo: { round: 1, eliminated: 'opt3', counts: { opt1: 5, opt2: 3 } },
    };
    render(<ResultsChart results={rankedResults} options={options} />);
    // The paragraph reads "Eliminated: Option C"
    expect(screen.getByText(/Eliminated:/)).toBeInTheDocument();
    expect(screen.getByText(/Eliminated:/).textContent).toContain('Option C');
  });

  it('does not render round info section when absent', () => {
    render(<ResultsChart results={singleResults} options={options} />);
    expect(screen.queryByText(/Round \d/)).not.toBeInTheDocument();
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  it('handles zero totals gracefully', () => {
    const zeroResults: Results = {
      method: 'single',
      totals: { opt1: 0, opt2: 0, opt3: 0 },
      percentages: { opt1: 0, opt2: 0, opt3: 0 },
    };
    render(<ResultsChart results={zeroResults} options={options} />);
    expect(screen.getAllByText('0 votes')).toHaveLength(3);
    expect(screen.getAllByText('0.0%')).toHaveLength(3);
  });

  it('handles empty options list', () => {
    const { container } = render(<ResultsChart results={singleResults} options={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
