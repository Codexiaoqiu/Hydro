import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Loading } from './Loading';

describe('loading', () => {
  it('renders block variant by default with role=status and an svg ring', () => {
    render(<Loading style={{ marginTop: '12px' }} />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-label', 'Loading');
    expect(status.className).toMatch(/block/);
    expect(status).toHaveStyle({ marginTop: '12px' });
    expect(status.querySelectorAll('svg').length).toBe(1);
  });

  it('uses inline-flex layout when size="inline"', () => {
    const { container } = render(<Loading size="inline" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/inline/);
  });

  it('renders the label text inside a span when provided', () => {
    render(<Loading label="加载中…" />);
    const text = screen.getByText('加载中…');
    expect(text).toBeInTheDocument();
    expect(text.tagName.toLowerCase()).toBe('span');
    expect(text.className).toMatch(/label/);
  });

  it('renders no span when label is omitted', () => {
    const { container } = render(<Loading />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.querySelector('span')).toBeNull();
  });

  it('uses ariaLabel when provided and label as fallback otherwise', () => {
    const { rerender } = render(<Loading ariaLabel="Custom" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Custom');

    rerender(<Loading label="加载中…" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '加载中…');
  });
});
