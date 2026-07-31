/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageUserImportPage from './manage_user_import';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'manage_user_import', template: 'manage_user_import.html', url: '/manage/user_import',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ManageUserImportPage />
    </PageDataProvider>,
  );
}

describe('manage_user_import', () => {
  it('renders a textarea for user input', () => {
    renderPage();
    const textareas = screen.getAllByRole('textbox');
    // The user textarea is the one with name="users" and aria-label="Users".
    const usersTextarea = textareas.find((el) => el.getAttribute('name') === 'users');
    expect(usersTextarea).toBeDefined();
    expect(usersTextarea).toHaveAttribute('aria-label', 'Users');
  });

  it('renders Preview and Submit buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('pins the count of Preview and Submit buttons', () => {
    renderPage();
    expect(screen.getAllByRole('button', { name: /preview/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /submit/i })).toHaveLength(1);
  });

  it('renders an empty-state for the preview when no preview is provided', () => {
    renderPage();
    expect(screen.getByText(/no preview/i)).toBeInTheDocument();
  });

  it('renders preview counts when args.preview is provided', () => {
    renderPage({
      preview: { count: 5, valid: 4, invalid: 1 },
    });
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('computes a local preview count from the textarea when Preview is clicked', () => {
    renderPage();
    const textarea = screen.getAllByRole('textbox').find((el) => el.getAttribute('name') === 'users');
    expect(textarea).toBeDefined();
    fireEvent.change(textarea as HTMLElement, { target: { value: 'a@b.c\nd@e.f\n\ng@h.i' } });
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    // Local preview is honest: only the detected line count is shown.
    // No Valid/Invalid breakdown since the page never validates anything client-side.
    expect(screen.getByText(/detected: 3 lines/i)).toBeInTheDocument();
    expect(screen.queryByText('Valid')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalid')).not.toBeInTheDocument();
  });

  it('renders a progress placeholder when no progress is provided', () => {
    renderPage();
    expect(screen.getByText(/no import in progress/i)).toBeInTheDocument();
  });

  it('renders progress details when args.progress is provided', () => {
    renderPage({
      progress: { current: 3, total: 10, status: 'Importing' },
    });
    // Progress summary appears in both the status paragraph and the progressbar fallback.
    expect(screen.getAllByText(/3 \/ 10/)).toHaveLength(2);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('value', '3');
    expect(bar).toHaveAttribute('max', '10');
  });

  it('renders a status messages area', () => {
    renderPage();
    const messages = document.querySelector('[name="messages"]');
    expect(messages).toBeInTheDocument();
  });
});
