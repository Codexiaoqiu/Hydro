import { act, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function Demo({ message }: { message: string }) {
  const toast = useToast();
  return <button onClick={() => toast.info(message)}>show</button>;
}

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test('renders toast when info() called', () => {
    render(<ToastProvider><Demo message="hello" /></ToastProvider>);
    act(() => { screen.getByText('show').click(); });
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  test('auto-dismisses after 4s', () => {
    render(<ToastProvider><Demo message="bye" /></ToastProvider>);
    act(() => { screen.getByText('show').click(); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('bye')).not.toBeInTheDocument();
  });

  test('throws when useToast called outside Provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() { useToast(); return null; }
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});