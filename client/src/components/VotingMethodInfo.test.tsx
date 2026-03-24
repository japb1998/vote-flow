import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VotingMethodInfo, VotingMethodInfoStandalone } from './VotingMethodInfo';

describe('VotingMethodInfo', () => {
  it('renders the toggle button with method name', () => {
    render(<VotingMethodInfo selectedMethod="single" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText(/Single Choice/)).toBeInTheDocument();
  });

  it('does not show method details initially', () => {
    render(<VotingMethodInfo selectedMethod="single" />);
    expect(screen.queryByText(/Each voter selects/)).not.toBeInTheDocument();
  });

  it('shows method details when toggle button is clicked', async () => {
    render(<VotingMethodInfo selectedMethod="single" />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/Each voter selects exactly one option/)).toBeInTheDocument();
  });

  it('hides method details when toggled again', async () => {
    render(<VotingMethodInfo selectedMethod="single" />);
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button'));
    expect(screen.queryByText(/Each voter selects/)).not.toBeInTheDocument();
  });

  it('shows up arrow when expanded, down arrow when collapsed', async () => {
    render(<VotingMethodInfo selectedMethod="approval" />);
    expect(screen.getByText('▼')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('shows approval voting info when selectedMethod is approval', async () => {
    render(<VotingMethodInfo selectedMethod="approval" />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/Voters can approve of multiple options/)).toBeInTheDocument();
  });

  it('shows ranked choice info when selectedMethod is ranked', async () => {
    render(<VotingMethodInfo selectedMethod="ranked" />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/Rank all options by preference/)).toBeInTheDocument();
  });

  it('shows score voting info when selectedMethod is score', async () => {
    render(<VotingMethodInfo selectedMethod="score" />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/Rate each option from 1-5/)).toBeInTheDocument();
  });

  it('shows example text when expanded', async () => {
    render(<VotingMethodInfo selectedMethod="single" />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/Example:/)).toBeInTheDocument();
  });
});

describe('VotingMethodInfoStandalone', () => {
  it('renders a section title', () => {
    render(<VotingMethodInfoStandalone />);
    expect(screen.getByText('Voting Methods Explained')).toBeInTheDocument();
  });

  it('renders all four voting method buttons', () => {
    render(<VotingMethodInfoStandalone />);
    expect(screen.getByText(/Single Choice/)).toBeInTheDocument();
    expect(screen.getByText(/Approval Voting/)).toBeInTheDocument();
    expect(screen.getByText(/Ranked Choice/)).toBeInTheDocument();
    expect(screen.getByText(/Score Voting/)).toBeInTheDocument();
  });

  it('expands a method when its button is clicked', async () => {
    render(<VotingMethodInfoStandalone />);
    const approvalBtn = screen.getByText(/Approval Voting/).closest('button')!;
    await userEvent.click(approvalBtn);
    expect(screen.getByText(/Voters can approve of multiple options/)).toBeInTheDocument();
  });

  it('collapses a method when its button is clicked again', async () => {
    render(<VotingMethodInfoStandalone />);
    const approvalBtn = screen.getByText(/Approval Voting/).closest('button')!;
    await userEvent.click(approvalBtn);
    await userEvent.click(approvalBtn);
    expect(screen.queryByText(/Voters can approve/)).not.toBeInTheDocument();
  });

  it('only shows one method at a time (accordion behaviour)', async () => {
    render(<VotingMethodInfoStandalone />);
    const singleBtn = screen.getByText(/Single Choice/).closest('button')!;
    const approvalBtn = screen.getByText(/Approval Voting/).closest('button')!;

    await userEvent.click(singleBtn);
    expect(screen.getByText(/Each voter selects/)).toBeInTheDocument();

    await userEvent.click(approvalBtn);
    // Single content should be gone
    expect(screen.queryByText(/Each voter selects/)).not.toBeInTheDocument();
    // Approval content should be shown
    expect(screen.getByText(/Voters can approve/)).toBeInTheDocument();
  });

  it('shows down arrow for all methods initially', () => {
    render(<VotingMethodInfoStandalone />);
    const arrows = screen.getAllByText('▼');
    expect(arrows).toHaveLength(4);
  });

  it('shows up arrow for expanded method', async () => {
    render(<VotingMethodInfoStandalone />);
    const btn = screen.getByText(/Ranked Choice/).closest('button')!;
    await userEvent.click(btn);
    expect(screen.getByText('▲')).toBeInTheDocument();
  });
});
