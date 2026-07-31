/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeFilesPage from './home_files';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'home_files',
    template: 'home_files.html',
    url: '/home/files',
    args: {
      UserContext: {},
      UiContext: {},
      files: [],
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>;
}

describe('home_files', () => {
  it('renders file list with names and sizes', () => {
    render(
      <Providers args={{
        files: [
          { name: 'a.txt', size: 1024, mtime: 1700000000 },
          { name: 'b.png', size: 2048, mtime: 1700000001 },
        ],
      }}
      >
        <HomeFilesPage />
      </Providers>,
    );
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(
      <Providers args={{ files: [] }}>
        <HomeFilesPage />
      </Providers>,
    );
    expect(screen.getByText(/no files|empty/i)).toBeInTheDocument();
  });

  it('shows upload button', () => {
    render(
      <Providers args={{ files: [] }}>
        <HomeFilesPage />
      </Providers>,
    );
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });
});
