/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestForm } from './ContestForm';

// Mock the router/i18n/api hooks and the autocomplete primitives so the
// heavy form can be rendered without a real router/i18n context.
vi.mock('../../context/router', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('../../hooks/use-api', () => ({
  HydroClientError: class HydroClientError extends Error {
    code: number;
    message: string;
    constructor({ code, message }: { code: number, message: string }) {
      super(message);
      this.code = code;
      this.message = message;
    }
  },
  request: { post: vi.fn() },
}));
vi.mock('../../hooks/use-build-url', () => ({
  useBuildUrl: () => (name: string) => `/${name}`,
}));
vi.mock('../../lib/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));
vi.mock('../../lib/perms', () => ({
  canEditSystem: () => false,
}));
vi.mock('../primitives', async () => {
  return {
    Alert: ({ message }: { message: string }) => <div role="alert">{message}</div>,
    Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
    Checkbox: ({ label, checked, onChange, disabled }: any) => (
      <label>
        <input
          type="checkbox"
          checked={!!checked}
          onChange={onChange}
          disabled={disabled}
          aria-label={label}
        />
        {label}
      </label>
    ),
    ConfirmDialog: () => null,
    Input: ({ label, value, onChange, type, ...rest }: any) => (
      <label>
        <span>{label}</span>
        <input
          type={type || 'text'}
          value={value ?? ''}
          onChange={onChange}
          {...rest}
        />
      </label>
    ),
    LanguageOption: {},
    LanguageSelectAutoComplete: () => <div data-testid="lang-select" />,
    MarkdownEditor: ({ value, onChange }: any) => (
      <textarea data-testid="md-editor" value={value ?? ''} onChange={(e) => onChange?.(e.target.value)} />
    ),
    ProblemSelectAutoComplete: () => <div data-testid="problem-select" />,
    RateLimitAlert: () => null,
  };
});

describe('contestForm', () => {
  // Fix the clock so duration-derived assertions stay stable.
  const fixedNow = Date.parse('2026-07-20T00:00:00Z');
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(fixedNow));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders duration and computed end time from ISO-string beginAt/endAt', () => {
    // Mirrors the wire shape from ContestEditHandler: tdoc.endAt/beginAt are
    // ISO strings (because JSON.stringify turns MongoDB Date -> ISO). Before
    // the toMs() fix the duration arithmetic produced NaN and the EndAt
    // field showed the begin time (or NaN-NaN-NaN).
    render(
      <ContestForm
        pageName="contest_edit"
        tid="6916ce868baf48be1624b9a7"
        tdoc={{
          docId: '6916ce868baf48be1624b9a7',
          title: 'text',
          rule: 'acm',
          beginAt: '2026-07-21T08:30:00.000Z',
          endAt: '2026-07-22T08:30:00.000Z',
          pids: [5, 3, 1],
          rated: true,
          autoHide: true,
          allowViewCode: true,
          allowPrint: false,
          keepScoreboardHidden: false,
          langs: ['cc.cc17', 'py.py3'],
          maintainer: [2],
        }}
      />,
    );

    // Duration (number input) should be 24, not "NaN" / empty.
    const durationInput = screen.getByLabelText(/ContestForm\.Duration/i) as HTMLInputElement;
    expect(durationInput.value).toBe('24');

    // EndAt (read-only) should be a parseable date that matches beginAt + 24h.
    const endAtInput = screen.getByLabelText(/ContestForm\.EndAt/i) as HTMLInputElement;
    expect(endAtInput.value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    const parsed = new Date(`${endAtInput.value.replace(' ', 'T')}:00`).getTime();
    expect(Number.isFinite(parsed)).toBe(true);
    // End must be strictly after begin, not equal to it.
    const beginMs = new Date('2026-07-21T08:30:00.000Z').getTime();
    expect(parsed).toBeGreaterThan(beginMs);
    expect(parsed - beginMs).toBe(24 * 3600 * 1000);
  });

  it('falls back to 2h default duration when tdoc is missing (contest_create)', () => {
    render(
      <ContestForm pageName="contest_create" languages={[]} />,
    );

    const durationInput = screen.getByLabelText(/ContestForm\.Duration/i) as HTMLInputElement;
    expect(durationInput.value).toBe('2');

    const endAtInput = screen.getByLabelText(/ContestForm\.EndAt/i) as HTMLInputElement;
    expect(endAtInput.value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    // EndAt should be 2h ahead of beginAt.
    const beginAtDate = screen.getByLabelText(/ContestForm\.BeginDate/i) as HTMLInputElement;
    const beginAtTime = screen.getByLabelText(/ContestForm\.BeginTime/i) as HTMLInputElement;
    const beginMs = new Date(`${beginAtDate.value}T${beginAtTime.value}:00`).getTime();
    const endMs = new Date(`${endAtInput.value.replace(' ', 'T')}:00`).getTime();
    expect(endMs - beginMs).toBe(2 * 3600 * 1000);
  });
});
