/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestPrivateFiles } from './ContestPrivateFiles';

describe('ContestPrivateFiles', () => {
  it('renders nothing when no files', () => {
    const { container } = render(<ContestPrivateFiles files={[]} urlForFile={(n) => `/f/${n}`} />);
    expect(container.querySelector('[data-testid="contest-private-files"]')).toBeNull();
  });

  it('renders one row per file linking via urlForFile', () => {
    const urlForFile = vi.fn((n: string) => `/file/${n}`);
    const files = [
      { _id: 'a1', name: 'material.txt', size: 1024 },
      { _id: 'a2', name: 'rules.pdf', size: 2048 },
    ];
    render(<ContestPrivateFiles files={files} urlForFile={urlForFile} />);
    const list = screen.getByTestId('contest-private-files');
    expect(list.textContent).toContain('material.txt');
    expect(list.textContent).toContain('rules.pdf');
    expect(screen.getByText('material.txt').getAttribute('href')).toBe('/file/material.txt');
    expect(screen.getByText('rules.pdf').getAttribute('href')).toBe('/file/rules.pdf');
    expect(urlForFile).toHaveBeenCalledWith('material.txt');
    expect(urlForFile).toHaveBeenCalledWith('rules.pdf');
  });

  it('formats file size with units', () => {
    render(
      <ContestPrivateFiles
        files={[
          { name: 'a.txt', size: 512 },
          { name: 'b.bin', size: 1536 },
          { name: 'c.bin', size: 1024 * 1024 * 2 },
        ]}
        urlForFile={(n) => `/f/${n}`}
      />,
    );
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('1.5 KB')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });
});
