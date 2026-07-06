import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip', () => {
    it('renders children', () => {
        render(<Chip>tag</Chip>);
        expect(screen.getByText('tag')).toBeInTheDocument();
    });

    it('renders default variant without modifier class', () => {
        const { container } = render(<Chip>plain</Chip>);
        const span = container.querySelector('span');
        expect(span?.className).not.toMatch(/\bdiff\b/);
        expect(span?.className).not.toMatch(/\btag\b/);
    });

    it('applies diff variant class for difficulty', () => {
        const { container } = render(<Chip variant="diff">hard</Chip>);
        expect(container.querySelector('span')?.className).toMatch(/diff/);
    });

    it('applies tag variant class for category', () => {
        const { container } = render(<Chip variant="tag">math</Chip>);
        expect(container.querySelector('span')?.className).toMatch(/tag/);
    });

    it('renders an icon when provided', () => {
        render(<Chip icon={<span data-testid="icon" />}>x</Chip>);
        expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
});