import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card Content</Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('renders as a div', () => {
    const { container } = render(<Card>Content</Card>);
    expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
  });

  it('applies base card class', () => {
    const { container } = render(<Card>Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('card');
  });

  it('does not apply hoverable class by default', () => {
    const { container } = render(<Card>Content</Card>);
    expect((container.firstChild as HTMLElement).className).not.toContain('hoverable');
  });

  it('applies hoverable class when hoverable prop is true', () => {
    const { container } = render(<Card hoverable>Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('hoverable');
  });

  it('applies additional className', () => {
    const { container } = render(<Card className="custom">Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('custom');
  });

  it('renders multiple children', () => {
    render(
      <Card>
        <span>First</span>
        <span>Second</span>
      </Card>
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
