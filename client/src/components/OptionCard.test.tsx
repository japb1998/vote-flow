import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionCard } from './OptionCard';
import { Option } from '../types';

const option: Option = {
  id: 'opt1',
  name: 'Option A',
  description: 'A great choice',
};

const optionNoDesc: Option = {
  id: 'opt2',
  name: 'Option B',
};

describe('OptionCard', () => {
  // ─── Basic Rendering ───────────────────────────────────────────────────────

  it('renders option name', () => {
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('Option A')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('A great choice')).toBeInTheDocument();
  });

  it('does not render description when absent', () => {
    render(
      <OptionCard
        option={optionNoDesc}
        isSelected={false}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByText('A great choice')).not.toBeInTheDocument();
  });

  // ─── Click Handler ─────────────────────────────────────────────────────────

  it('calls onSelect when card is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="single"
        onSelect={onSelect}
      />
    );
    await userEvent.click(screen.getByText('Option A'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  // ─── Single / Multiple Mode (checkbox) ────────────────────────────────────

  it('shows checkmark when selected in single mode', () => {
    render(
      <OptionCard
        option={option}
        isSelected={true}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('does not show checkmark when not selected in single mode', () => {
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('shows checkmark when selected in multiple mode', () => {
    render(
      <OptionCard
        option={option}
        isSelected={true}
        selectionMode="multiple"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  // ─── Rank Mode ─────────────────────────────────────────────────────────────

  it('shows rank badge with 1-based rank in rank mode', () => {
    render(
      <OptionCard
        option={option}
        isSelected={true}
        selectionMode="rank"
        rank={0}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('shows correct rank number', () => {
    render(
      <OptionCard
        option={option}
        isSelected={true}
        selectionMode="rank"
        rank={2}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('does not show rank badge when rank is undefined', () => {
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="rank"
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByText(/#\d/)).not.toBeInTheDocument();
  });

  // ─── Score Mode ─────────────────────────────────────────────────────────────

  it('shows score buttons (1-5) in score mode', () => {
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="score"
        onSelect={vi.fn()}
      />
    );
    for (const s of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: String(s) })).toBeInTheDocument();
    }
  });

  it('calls onScoreChange with clicked score value', async () => {
    const onScoreChange = vi.fn();
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="score"
        onSelect={vi.fn()}
        onScoreChange={onScoreChange}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onScoreChange).toHaveBeenCalledWith(3);
  });

  it('score button click does not trigger onSelect', async () => {
    const onSelect = vi.fn();
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="score"
        onSelect={onSelect}
        onScoreChange={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: '5' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows score badge with current score in score mode', () => {
    const { container } = render(
      <OptionCard
        option={option}
        isSelected={true}
        selectionMode="score"
        score={4}
        onSelect={vi.fn()}
      />
    );
    // Score badge (div) shows the score value; the button also shows it
    // Use querySelectorAll to find the badge div specifically
    const scoreBadge = container.querySelector('[class*="scoreBadge"]');
    expect(scoreBadge).not.toBeNull();
    expect(scoreBadge?.textContent).toBe('4');
  });

  it('does not render score buttons in non-score modes', () => {
    render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    // Score buttons (1-5 as standalone buttons) should not exist
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
  });

  // ─── Selected styling ──────────────────────────────────────────────────────

  it('applies selected class when isSelected', () => {
    const { container } = render(
      <OptionCard
        option={option}
        isSelected={true}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('selected');
  });

  it('does not apply selected class when not isSelected', () => {
    const { container } = render(
      <OptionCard
        option={option}
        isSelected={false}
        selectionMode="single"
        onSelect={vi.fn()}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain('selected');
  });
});
