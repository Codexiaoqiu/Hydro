import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import styles from './Button.module.css';

describe('button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies primary variant class', () => {
    const { container } = render(<Button variant="primary">Go</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className.split(' ')).toContain(styles.primary);
  });

  it('defaults to ghost variant class', () => {
    const { container } = render(<Button>Default</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className.split(' ')).toContain(styles.ghost);
  });

  it('respects type="submit"', () => {
    const { container } = render(<Button type="submit">Send</Button>);
    expect(container.querySelector('button')?.getAttribute('type')).toBe('submit');
  });

  it('applies danger variant class', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className.split(' ')).toContain(styles.danger);
  });

  it('keeps primary intact', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    const btn = container.querySelector('button');
    expect(btn?.className.split(' ')).toContain(styles.primary);
  });
});
