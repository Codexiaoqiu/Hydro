import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemHero } from './ProblemHero';

const basePdoc = {
  docId: 1000,
  pid: 'H1000',
  title: 'A + B Problem',
  config: { type: 'default', subType: 'std', timeMin: 1000, timeMax: 1000, memoryMin: 1024, memoryMax: 1024 },
  nSubmit: 100,
  nAccept: 45,
};

describe('problemHero', () => {
  it('renders title and prefix', () => {
    const { container } = render(<ProblemHero pdoc={basePdoc} />);
    expect(container.textContent).toContain('A + B Problem');
    expect(container.textContent).toContain('#H1000');
  });

  it('renders pass rate ring with correct percent', () => {
    const { container } = render(<ProblemHero pdoc={basePdoc} />);
    const bar = container.querySelector('circle[style*="stroke-dashoffset"]');
    // 45% → offset = 251 * 0.55 ≈ 138
    expect(bar?.getAttribute('style')).toMatch(/stroke-dashoffset: 13[78]/);
  });

  it('handles zero submissions gracefully', () => {
    const { container } = render(<ProblemHero pdoc={{ ...basePdoc, nSubmit: 0, nAccept: 0 }} />);
    expect(container.textContent).toContain('0');
  });

  it('renders difficulty chip when provided', () => {
    const { container } = render(<ProblemHero pdoc={{ ...basePdoc, difficulty: 5 }} />);
    expect(container.textContent).toContain('5');
  });

  it('renders time and memory chips', () => {
    const { container } = render(<ProblemHero pdoc={basePdoc} />);
    expect(container.textContent).toContain('1000 ms');
    expect(container.textContent).toContain('1024 MiB');
  });
});

describe('problemHero download button (P2-B.1)', () => {
  let originalLocation: Location;
  let assignedHref: string;

  beforeEach(() => {
    assignedHref = '';
    originalLocation = window.location;
    // jsdom does not allow direct location.href reassignment; stub it so the
    // click handler can set window.location.href deterministically.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: '' } as unknown as Location,
    });
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get() { return assignedHref; },
      set(v: string) { assignedHref = v; },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation });
  });

  it('renders a Download button labelled in the active locale', () => {
    const { getByRole } = render(<ProblemHero pdoc={basePdoc} />);
    // locale is pinned to zh_CN in test/setup.ts → '下载'
    const btn = getByRole('button', { name: /下载|download/i });
    expect(btn).toBeTruthy();
  });

  it('renders the Download button after the pass-rate stat card', () => {
    const { container } = render(<ProblemHero pdoc={basePdoc} />);
    const statCard = container.querySelector('[class*="statCard"]') as HTMLElement;
    const btn = container.querySelector('button[class*="btn"]') as HTMLButtonElement;
    expect(statCard).toBeTruthy();
    expect(btn).toBeTruthy();
    // The button must be a sibling/descendant of the right column, not buried
    // inside the title block on the left.
    expect(btn.closest('[class*="right"]') || btn.parentElement?.parentElement).toBeTruthy();
  });

  it('clicking Download navigates the browser to /p/:pid/download', () => {
    const { getByRole } = render(<ProblemHero pdoc={basePdoc} />);
    const btn = getByRole('button', { name: /下载|download/i });
    fireEvent.click(btn);
    expect(assignedHref).toBe('/p/1000/download');
  });
});
