import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrendBars } from './TrendBars';

describe('trendBars', () => {
  it('renders one bar per value', () => {
    const { container } = render(<TrendBars values={[0.2, 0.5, 0.8]} />);
    const bars = container.querySelectorAll('[data-trend-bar]');
    expect(bars.length).toBe(3);
  });

  it('applies height as percentage of value', () => {
    const { container } = render(<TrendBars values={[0.5]} />);
    const bar = container.querySelector('[data-trend-bar]') as HTMLElement;
    expect(bar.style.height).toBe('50%');
  });

  it('clamps values to [0, 1]', () => {
    const { container } = render(<TrendBars values={[-0.1, 1.5, 0.5]} />);
    const bars = container.querySelectorAll('[data-trend-bar]');
    expect((bars[0] as HTMLElement).style.height).toBe('0%');
    expect((bars[1] as HTMLElement).style.height).toBe('100%');
    expect((bars[2] as HTMLElement).style.height).toBe('50%');
  });

  it('renders nothing when values is empty', () => {
    const { container } = render(<TrendBars values={[]} />);
    expect(container.querySelectorAll('[data-trend-bar]').length).toBe(0);
  });
});
