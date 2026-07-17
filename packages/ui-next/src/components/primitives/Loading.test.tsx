import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Loading } from './Loading';

describe('loading', () => {
  it('renders block variant by default with role=status and an svg ring', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-label', 'Loading');
    expect(status.querySelector('svg')).toBeTruthy();
  });

  it('uses inline-flex layout when size="inline"', () => {
    const { container } = render(<Loading size="inline" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/inline/);
  });
});
