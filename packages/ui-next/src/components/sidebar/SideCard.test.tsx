// SideCard.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SideCard } from './SideCard';

describe('sideCard', () => {
  it('renders title and children', () => {
    const { container } = render(
      <SideCard title="出题人">
        <span data-testid="child">child</span>
      </SideCard>,
    );
    expect(container.textContent).toContain('出题人');
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it('shows accent dot by default', () => {
    const { container } = render(<SideCard title="x">content</SideCard>);
    expect(container.querySelector('[data-accent-dot]')).toBeTruthy();
  });

  it('hides accent dot when accent=false', () => {
    const { container } = render(
      <SideCard title="x" accent={false}>content</SideCard>,
    );
    expect(container.querySelector('[data-accent-dot]')).toBeNull();
  });
});
