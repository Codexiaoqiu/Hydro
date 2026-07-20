/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubmitHint from './SubmitHint';

describe('submitHint', () => {
  beforeEach(() => localStorage.clear());

  it('shows by default and Dismiss only hides the current instance', () => {
    render(<SubmitHint />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(localStorage.getItem('submit-hint')).toBeNull();
  });

  it("don't show again stores the legacy dismiss value", () => {
    render(<SubmitHint />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(localStorage.getItem('submit-hint')).toBe('dismiss');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('starts hidden when the legacy key is already dismissed', () => {
    localStorage.setItem('submit-hint', 'dismiss');
    render(<SubmitHint />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('still dismisses when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('blocked'); });
    render(<SubmitHint />);
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
