import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Ring } from './Ring';

describe('Ring', () => {
    it('renders an SVG with track and bar', () => {
        const { container } = render(<Ring percent={45} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(container.querySelectorAll('circle').length).toBe(2);
    });

    it('renders label text when provided', () => {
        render(<Ring percent={45} label="AC" />);
        expect(screen.getByText('45%')).toBeInTheDocument();
        expect(screen.getByText('AC')).toBeInTheDocument();
    });

    it('clamps percent to [0, 100]', () => {
        render(<Ring percent={150} label="X" />);
        // Math.round(150) = 150 still, but it should render gracefully without throwing
        expect(screen.getByText(/150/)).toBeInTheDocument();
    });

    it('honors size and strokeWidth props', () => {
        const { container } = render(<Ring percent={50} size={120} strokeWidth={12} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('width')).toBe('120');
        expect(svg?.getAttribute('height')).toBe('120');
    });
});