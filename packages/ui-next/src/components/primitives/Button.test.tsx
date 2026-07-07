import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
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
        expect(btn?.className).toMatch(/primary/i);
    });

    it('defaults to ghost variant class', () => {
        const { container } = render(<Button>Default</Button>);
        const btn = container.querySelector('button');
        expect(btn?.className).toMatch(/ghost/i);
    });

    it('respects type="submit"', () => {
        const { container } = render(<Button type="submit">Send</Button>);
        const btn = container.querySelector('button');
        expect(btn?.getAttribute('type')).toBe('submit');
    });
});