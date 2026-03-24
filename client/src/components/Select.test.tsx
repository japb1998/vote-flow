import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const options = [
  { value: 'single', label: 'Single Choice' },
  { value: 'approval', label: 'Approval Voting' },
  { value: 'ranked', label: 'Ranked Choice' },
];

describe('Select', () => {
  it('renders a select element', () => {
    render(<Select options={options} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select options={options} />);
    expect(screen.getByRole('option', { name: 'Single Choice' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Approval Voting' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ranked Choice' })).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Select options={options} label="Voting Method" />);
    expect(screen.getByText('Voting Method')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<Select options={options} />);
    expect(screen.queryByText('label')).not.toBeInTheDocument();
  });

  it('calls onChange when a different option is selected', async () => {
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'approval');
    expect(handleChange).toHaveBeenCalled();
  });

  it('reflects selected value via value prop', () => {
    render(
      <Select
        options={options}
        value="approval"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toHaveValue('approval');
  });

  it('passes additional className', () => {
    render(<Select options={options} className="custom-select" />);
    expect(screen.getByRole('combobox').className).toContain('custom-select');
  });

  it('forwards other HTML attributes', () => {
    render(<Select options={options} data-testid="my-select" />);
    expect(screen.getByTestId('my-select')).toBeInTheDocument();
  });

  it('renders correct option values', () => {
    render(<Select options={options} />);
    const opts = screen.getAllByRole('option');
    expect(opts[0]).toHaveValue('single');
    expect(opts[1]).toHaveValue('approval');
    expect(opts[2]).toHaveValue('ranked');
  });
});
