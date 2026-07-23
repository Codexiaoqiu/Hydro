/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProblemHackPage from './problem_hack';
import { type PageData, PageDataProvider } from '../context/page-data';
import { ToastProvider } from '../components/primitives';

Object.defineProperty(window, 'location', {
  value: new URL('http://localhost/p/42/hack/sourceRid?tid=tid1'),
  writable: true,
});

vi.mock('../context/router', () => ({
  RouterProvider: ({ children }: { children: React.ReactNode }) => children,
  useNavigate: () => () => {},
}));

vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

const postMock = vi.fn();
const postFileMock = vi.fn();
vi.mock('../hooks/use-api', () => ({
  request: {
    post: (...args: unknown[]) => postMock(...args),
    postFile: (...args: unknown[]) => postFileMock(...args),
  },
  HydroClientError: class extends Error {
    code: number;
    constructor(opts: { code: number, message: string }) {
      super(opts.message);
      this.code = opts.code;
    }
  },
}));

const mockArgs = {
  pdoc: { docId: 42, pid: 'p1', title: 'Sample' },
  rdoc: { _id: 'sourceRid' },
  tid: 'tid1',
};

function renderHack() {
  const pageData: PageData = {
    name: 'problem_hack',
    template: 'problem_hack.html',
    url: '/p/42/hack/sourceRid?tid=tid1',
    args: { ...mockArgs, UserContext: {}, UiContext: {} } as never,
  };
  return render(
    <PageDataProvider initial={pageData}>
      <ToastProvider>
        <ProblemHackPage />
      </ToastProvider>
    </PageDataProvider>,
  );
}

describe('problem_hack submit', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    postMock.mockReset();
    postFileMock.mockReset();
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('redirects to the new hack rid returned by the server (not the source rdoc)', async () => {
    // Server contract: `ProblemHackHandler.post` returns `{ rid }` for the
    // *new* hack record. The page must redirect the user to that submission,
    // not the original `rdoc._id` they were hacking against.
    postMock.mockResolvedValueOnce({ rid: 'newHackRid' });
    renderHack();
    fireEvent.click(screen.getByRole('button', { name: /hack/i }));
    await waitFor(() => expect(window.location.href).toBe('/record/newHackRid'));
    expect(postMock).toHaveBeenCalledWith(
      '/p/42/hack/sourceRid?tid=tid1',
      expect.any(URLSearchParams),
    );
  });

  it('falls back to the source rdoc if the server omits rid (defensive)', async () => {
    postMock.mockResolvedValueOnce({});
    renderHack();
    fireEvent.click(screen.getByRole('button', { name: /hack/i }));
    await waitFor(() => expect(window.location.href).toBe('/record/sourceRid'));
  });

  it('routes file uploads through postFile and honours the response rid', async () => {
    postFileMock.mockResolvedValueOnce({ rid: 'fileSubmitRid' });
    renderHack();
    const fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement;
    const file = new File(['hack-body'], 'hack.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);
    fireEvent.click(screen.getByRole('button', { name: /hack/i }));
    await waitFor(() => expect(window.location.href).toBe('/record/fileSubmitRid'));
    expect(postFileMock).toHaveBeenCalledWith(
      '/p/42/hack/sourceRid?tid=tid1',
      expect.any(FormData),
    );
  });
});
