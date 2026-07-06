import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeToggle', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    it('renders a button with aria-label', () => {
        render(<Wrapper><ThemeToggle /></Wrapper>);
        expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
    });

    it('toggles data-theme on html between dark and light', async () => {
        const user = userEvent.setup();
        render(<Wrapper><ThemeToggle /></Wrapper>);
        const btn = screen.getByRole('button', { name: /toggle theme/i });
        const before = document.documentElement.getAttribute('data-theme');
        await user.click(btn);
        const after = document.documentElement.getAttribute('data-theme');
        expect(before).not.toBe(after);
        expect(['dark', 'light']).toContain(after);
    });

    it('persists choice to localStorage', async () => {
        const user = userEvent.setup();
        render(<Wrapper><ThemeToggle /></Wrapper>);
        await user.click(screen.getByRole('button', { name: /toggle theme/i }));
        expect(localStorage.getItem('hydro.theme')).toMatch(/^(dark|light)$/);
    });
});