import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<Input />);
    expect(screen.queryByText('label')).not.toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('does not render error element when error not provided', () => {
    render(<Input />);
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('applies error style class when error is provided', () => {
    render(<Input error="Required" />);
    expect(screen.getByRole('textbox').className).toContain('hasError');
  });

  it('does not apply error style class without error', () => {
    render(<Input />);
    expect(screen.getByRole('textbox').className).not.toContain('hasError');
  });

  it('accepts user input', async () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello');
    expect(input).toHaveValue('Hello');
  });

  it('calls onChange handler', async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('passes placeholder prop', () => {
    render(<Input placeholder="Enter text here" />);
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
  });

  it('passes additional className', () => {
    render(<Input className="custom" />);
    expect(screen.getByRole('textbox').className).toContain('custom');
  });

  it('forwards other HTML attributes', () => {
    render(<Input type="email" data-testid="email-input" />);
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
