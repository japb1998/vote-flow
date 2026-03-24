import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders as a <span> element', () => {
    render(<Badge>Status</Badge>);
    expect(screen.getByText('Status').tagName).toBe('SPAN');
  });

  it('applies default variant class', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('default');
  });

  it('applies success variant class', () => {
    render(<Badge variant="success">Done</Badge>);
    expect(screen.getByText('Done').className).toContain('success');
  });

  it('applies warning variant class', () => {
    render(<Badge variant="warning">Caution</Badge>);
    expect(screen.getByText('Caution').className).toContain('warning');
  });

  it('applies danger variant class', () => {
    render(<Badge variant="danger">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('danger');
  });

  it('applies info variant class', () => {
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info').className).toContain('info');
  });

  it('applies badge base class', () => {
    render(<Badge>Test</Badge>);
    expect(screen.getByText('Test').className).toContain('badge');
  });
});
