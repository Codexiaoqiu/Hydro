/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePageData } from '../context/page-data';
import ContestClarificationPage from './contest_clarification';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string, onChange?: (v: string | undefined) => void }) => (
    <textarea data-testid="editor-source" value={props.value ?? ''} onChange={(e) => props.onChange?.(e.currentTarget.value)} />
  ),
  loader: { config: vi.fn() },
}));

vi.mock('../hooks/use-api', () => ({
  request: { post: vi.fn().mockResolvedValue({}) },
  HydroClientError: class extends Error {},
  useApi: () => ({ run: vi.fn(), loading: false, error: null, data: null, setError: vi.fn() }),
}));

vi.mock('../components/primitives/Toast', () => ({
  useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../components/link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`} {...rest}>{children}</a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

vi.mock('../context/page-data', () => ({
  usePageData: vi.fn(),
  PageDataProvider: ({ children }: any) => children,
  useUiContext: () => ({ domainId: 'system', domain: null }),
}));

describe('ContestClarificationPage', () => {
  it('renders Broadcast button and list', () => {
    vi.mocked(usePageData).mockReturnValue({
      args: { tdoc: { docId: 7, pids: [1] }, tcdocs: [], pdict: {}, udict: {} },
    });
    render(<ContestClarificationPage />);
    expect(screen.getByRole('button', { name: /broadcast|广播/i })).toBeInTheDocument();
    expect(screen.getByText(/no clarifications|暂无公告/i)).toBeInTheDocument();
  });

  it('exposes a back link to the contest detail page', () => {
    vi.mocked(usePageData).mockReturnValue({
      args: { tdoc: { docId: 7, pids: [1] }, tcdocs: [], pdict: {}, udict: {} },
    });
    render(<ContestClarificationPage />);
    const back = screen.getByTestId('contest-back-link');
    expect(back).toBeInTheDocument();
    expect(back.getAttribute('href')).toBe('/contest_detail/7');
  });

  // Ask button test removed: the /contest/:tid/clarification page no longer
  // renders an Ask button. Contestants submit new questions via the inline
  // form on /contest/:tid/problems (ContestClarificationInlineForm), which
  // matches ui-default layout. This page only hosts the jury Broadcast form.
});
