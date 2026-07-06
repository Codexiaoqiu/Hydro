import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
    it('renders children inside a container', () => {
        render(<Card>content</Card>);
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('renders header when provided', () => {
        render(<Card header={<h3>Title</h3>}>body</Card>);
        expect(screen.getByRole('heading', { name: /title/i })).toBeInTheDocument();
    });

    it('omits header when not provided', () => {
        const { container } = render(<Card>body</Card>);
        // No header div
        expect(container.querySelectorAll('div').length).toBe(1);
    });

    it('honors variant="side" class', () => {
        const { container } = render(<Card variant="side">x</Card>);
        expect(container.querySelector('div')?.className).toMatch(/side/);
    });

    it('honors variant="stat" class', () => {
        const { container } = render(<Card variant="stat">x</Card>);
        expect(container.querySelector('div')?.className).toMatch(/stat/);
    });
});