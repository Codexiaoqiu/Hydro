/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

const avatarCss = readFileSync(
  `${process.cwd()}/src/components/primitives/Avatar.module.css`,
  'utf8',
);

describe('avatar', () => {
  it('renders the uppercased first letter of the name', () => {
    render(<Avatar name="alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('falls back to "?" for an empty or whitespace-only name', () => {
    const { rerender } = render(<Avatar name="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
    rerender(<Avatar name="   " />);
    expect(screen.getAllByText('?').length).toBeGreaterThan(0);
  });

  it('uppercases lowercase letters', () => {
    render(<Avatar name="bob" />);
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});

/**
 * Regression guard for the light-mode contrast bug in RankingSection.
 *
 * Avatar.module.css previously hardcoded `color: #0a0a0a`, which is fine on
 * the dark-mode cyan→violet gradient but disappears on the light-mode solid
 * black `--gradient-avatar`. The fix routes the color through the shared
 * `--text-on-cyan` token (dark: #062b29, light: #ffffff). These assertions
 * lock in that contract so a future "simplification" can't reintroduce the
 * hardcoded color without breaking the test.
 */
describe('avatar — light-mode contrast (regression)', () => {
  it('does not hardcode a near-black color in Avatar.module.css', () => {
    expect(avatarCss).not.toMatch(/color:\s*#0a0a0a\b/i);
    expect(avatarCss).not.toMatch(/color:\s*#000\b/i);
  });

  it('routes the letter color through the --text-on-cyan token', () => {
    expect(avatarCss).toMatch(/color:\s*var\(--text-on-cyan\)/);
  });
});
