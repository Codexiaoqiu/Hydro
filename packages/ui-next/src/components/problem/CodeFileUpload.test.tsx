/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CodeFileUpload from './CodeFileUpload';

function makeFile(name: string, size: number, type = 'text/plain'): File {
  // The File constructor in happy-dom does not reliably accept the third
  // argument, so build a stand-in that satisfies our component's reads
  // (name, size, type) and the input.files API.
  const blob = new Blob([new Uint8Array(size)], { type });
  const file = new File([blob], name, { type });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
}

describe('codeFileUpload', () => {
  it('renders a hidden file input with the legacy name and a trigger button', () => {
    render(<CodeFileUpload />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"][name="file"]');
    expect(input).toBeTruthy();
    expect(input?.className).toContain('hiddenInput');
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('opens the native file picker when the button is clicked', () => {
    render(<CodeFileUpload />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"][name="file"]')!;
    const clickSpy = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the selected file name and size after a file is chosen', () => {
    render(<CodeFileUpload />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"][name="file"]')!;
    const file = makeFile('solution.zip', 2048);
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    expect(screen.getByText('solution.zip')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();
  });

  it('clears the file when the remove button is clicked', () => {
    render(<CodeFileUpload />);
    const input = document.querySelector<HTMLInputElement>('input[type="file"][name="file"]')!;
    const file = makeFile('a.txt', 100);
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove a\.txt/i }));
    expect(screen.queryByText('a.txt')).not.toBeInTheDocument();
  });

  it('updates the file chip when a file is dropped onto the dropzone', () => {
    render(<CodeFileUpload />);
    const file = makeFile('dropped.bin', 4096);
    const dropzone = document.querySelector<HTMLDivElement>('div.dropzone, [class*="dropzone"]')!;
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    expect(screen.getByText('dropped.bin')).toBeInTheDocument();
    expect(screen.getByText('4.0 KB')).toBeInTheDocument();
  });
});
