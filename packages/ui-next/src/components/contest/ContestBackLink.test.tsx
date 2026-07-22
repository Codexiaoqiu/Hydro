/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestBackLink } from './ContestBackLink';

vi.mock('../link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a {...rest} data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`}>
      {children}
    </a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

describe('ContestBackLink', () => {
  it('renders a link to contest_detail with the resolved tid', () => {
    render(<ContestBackLink tdoc={{ docId: 42 }} />);
    const link = screen.getByTestId('link-contest_detail');
    expect(link.getAttribute('href')).toBe('/contest_detail/42');
    expect(link.textContent).toMatch(/返回比赛|Back to contest/);
  });

  it('renders nothing when targeting contest_detail without a docId', () => {
    const { container } = render(<ContestBackLink tdoc={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('routes to contest_main when no contest id is known', () => {
    render(<ContestBackLink tdoc={null} to="contest_main" labelKey="Common.Back" />);
    const link = screen.getByTestId('link-contest_main');
    expect(link.getAttribute('href')).toBe('/contest_main/');
    expect(link.textContent).toMatch(/返回|Back/);
  });

  it('supports custom label keys', () => {
    render(<ContestBackLink tdoc={{ docId: 1 }} labelKey="Common.Back" />);
    expect(screen.getByTestId('link-contest_detail').textContent).toMatch(/返回|Back/);
  });
});