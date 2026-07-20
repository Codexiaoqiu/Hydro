/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContestFiles } from './ContestFiles';

const urlForFile = (name: string) => `/d/contest/123/file/private/${name}`;

describe('ContestFiles', () => {
  it('renders empty state when files is empty', () => {
    render(<ContestFiles files={[]} urlForFile={urlForFile} />);
    expect(screen.getByText(/暂无附件|No files attached/i)).toBeInTheDocument();
  });

  it('renders one row per file with name link', () => {
    const files = [
      { name: 'a.pdf', size: 1024 },
      { name: 'b.zip', size: 2048 },
    ];
    render(<ContestFiles files={files} urlForFile={urlForFile} />);
    const linkA = screen.getByRole('link', { name: 'a.pdf' });
    expect(linkA).toHaveAttribute('href', '/d/contest/123/file/private/a.pdf');
    const linkB = screen.getByRole('link', { name: 'b.zip' });
    expect(linkB).toHaveAttribute('href', '/d/contest/123/file/private/b.zip');
  });

  it('renders size in human readable form (bytes when small)', () => {
    render(<ContestFiles files={[{ name: 'tiny.txt', size: 500 }]} urlForFile={urlForFile} />);
    expect(screen.getByText('500 B')).toBeInTheDocument();
  });
});
