// @vitest-environment happy-dom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ring } from './Ring';

describe('Ring', () => {
  it('renders SVG with two circles', () => {
    const { container } = render(<Ring percent={50} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('clamps percent to 0', () => {
    const { container } = render(<Ring percent={-10} />);
    const bar = container.querySelectorAll('circle')[1];
    expect(bar?.getAttribute('style')).toContain('stroke-dashoffset: 251');
  });

  it('clamps percent to 100', () => {
    const { container } = render(<Ring percent={150} />);
    const bar = container.querySelectorAll('circle')[1];
    expect(bar?.getAttribute('style')).toContain('stroke-dashoffset: 0');
  });

  it('renders mid value correctly', () => {
    const { container } = render(<Ring percent={50} />);
    const bar = container.querySelectorAll('circle')[1];
    expect(bar?.getAttribute('style')).toContain('stroke-dashoffset: 125');
  });

  it('uses custom size when provided', () => {
    const { container } = render(<Ring percent={50} size={100} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('100');
  });
});
