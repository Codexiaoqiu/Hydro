/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as yaml from 'js-yaml';
import { ToastProvider } from '../primitives/Toast';
import { ContestBalloonSetColor } from './ContestBalloonSetColor';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({}),
  });
});

describe('ContestBalloonSetColor', () => {
  it('renders one editor row per pid when open', () => {
    render(
      <ToastProvider>
        <ContestBalloonSetColor
          open
          onClose={() => {}}
          onSaved={() => {}}
          pids={[1, 2, 3]}
        />
      </ToastProvider>,
    );
    // One hex input per pid.
    const inputs = screen.getAllByRole('textbox', { name: /hex/i });
    expect(inputs).toHaveLength(3);
  });

  it('submits complete YAML { [pid]: { color, name } } covering every pid', async () => {
    const onSaved = vi.fn();
    render(
      <ToastProvider>
        <ContestBalloonSetColor
          open
          onClose={() => {}}
          onSaved={onSaved}
          pids={[1, 2]}
        />
      </ToastProvider>,
    );
    const inputs = screen.getAllByRole('textbox', { name: /hex/i });
    fireEvent.change(inputs[0], { target: { value: '#ff8800' } });
    fireEvent.change(inputs[1], { target: { value: '#00aaff' } });
    // Names can be edited via dedicated inputs/textboxes.
    const nameInputs = screen.getAllByRole('textbox').filter((el) => el !== inputs[0] && el !== inputs[1]);
    fireEvent.change(nameInputs[0], { target: { value: 'Orange' } });
    fireEvent.change(nameInputs[1], { target: { value: 'Sky' } });
    fireEvent.click(screen.getByRole('button', { name: /保存|Save/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toEqual(expect.stringContaining(window.location.pathname));
    expect(calledInit.method).toBe('POST');
    // The body must include the YAML for every pid and have the right shape.
    const bodyStr: string = typeof calledInit.body === 'string' ? calledInit.body : '';
    expect(bodyStr).toEqual(expect.stringContaining('operation=set_color'));
    const parsed = new URLSearchParams(bodyStr);
    const colorYaml = parsed.get('color') ?? '';
    const decoded = yaml.load(colorYaml) as Record<string, { color: string, name: string }>;
    expect(decoded['1']).toEqual({ color: '#ff8800', name: 'Orange' });
    expect(decoded['2']).toEqual({ color: '#00aaff', name: 'Sky' });
  });

  it('does not POST when any pid is missing a value (validation)', async () => {
    const onSaved = vi.fn();
    render(
      <ToastProvider>
        <ContestBalloonSetColor
          open
          onClose={() => {}}
          onSaved={onSaved}
          pids={[1, 2]}
        />
      </ToastProvider>,
    );
    const inputs = screen.getAllByRole('textbox', { name: /hex/i });
    fireEvent.change(inputs[0], { target: { value: '#ff8800' } });
    // Intentionally leave inputs[1] and second name blank.
    fireEvent.click(screen.getByRole('button', { name: /保存|Save/i }));
    // Allow any synchronous rejection/validation to settle.
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not POST when any color is not a 6-digit hex', async () => {
    const onSaved = vi.fn();
    render(
      <ToastProvider>
        <ContestBalloonSetColor
          open
          onClose={() => {}}
          onSaved={onSaved}
          pids={[1, 2]}
        />
      </ToastProvider>,
    );
    const inputs = screen.getAllByRole('textbox', { name: /hex/i });
    fireEvent.change(inputs[0], { target: { value: 'not-a-hex' } });
    fireEvent.click(screen.getByRole('button', { name: /保存|Save/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});