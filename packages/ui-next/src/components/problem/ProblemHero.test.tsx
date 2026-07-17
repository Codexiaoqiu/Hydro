import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
