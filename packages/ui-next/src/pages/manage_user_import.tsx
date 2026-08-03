import { useRef, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';

interface PreviewSummary {
  count: number;
  valid: number;
  invalid: number;
}

interface ProgressInfo {
  current: number;
  total: number;
  status?: string;
}

interface Message {
  level?: 'info' | 'warn' | 'error';
  content: string;
}

interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  preview?: PreviewSummary;
  progress?: ProgressInfo;
  // Server populates these after a POST round-trip on `SystemUserImportHandler.post`.
  // Each entry is the parsed user payload; the validation messages are
  // rendered in the Messages card below.
  users?: Array<{
    email?: string;
    username?: string;
    password?: string;
    displayName?: string;
  }>;
  messages?: Message[];
}

export default function ManageUserImportPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const preview = args?.preview;
  const progress = args?.progress;
  const messages = args?.messages ?? [];

  const [users, setUsers] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);

  // Submit the import form with a given `draft` value.
  //   - `draft=true`  → server parses + validates each row but does NOT
  //     create users (mirrors the legacy `pages/manage_user_import.page.js`
  //     Preview button). The page re-renders with validation messages.
  //   - `draft=false` → server actually creates users.
  //
  // We mutate the hidden input directly + call `form.submit()` to bypass
  // React's async state-update cycle. Using two separate `<button>`s with
  // the same `name="draft"` would leave the field ambiguous when the user
  // types into the textarea and hits Enter, so a single hidden + imperative
  // toggle is the cleanest way to drive this two-mode submit.
  const submitAs = (draft: 'true' | 'false') => {
    const form = formRef.current;
    if (!form) return;
    const draftInput = form.querySelector<HTMLInputElement>('input[name="draft"]');
    if (draftInput) draftInput.value = draft;
    form.submit();
  };

  const previewCount = preview?.count ?? 0;
  const previewValid = preview?.valid ?? 0;
  const previewInvalid = preview?.invalid ?? 0;

  return (
    <div className="manage-user-import">
      <Card
        variant="default"
        header={<h1 className="manage-user-import__title">Import User</h1>}
      >
        {/*
          Native form submission: `SystemUserImportHandler.post` consumes
          `users` (TSV/CSV) and `draft`, then re-renders `manage_user_import.html`
          with the parsed payload and validation messages.

          The two action buttons (Preview / Submit) both call
          `submitAs(...)`, which mutates the `draft` hidden input in place
          and then triggers a native form POST:
            Preview → draft=true   → server validates only, no creation.
            Submit  → draft=false  → server actually creates the users.
          This restores the parity that `pages/manage_user_import.page.js`
          had with its two buttons (the previous native-form fix had a
          single Submit that always set draft=false, silently dropping the
          Preview-only path).
        */}
        <form
          ref={formRef}
          className="manage-user-import__form"
          method="post"
          action="/manage/userimport"
        >
          <input type="hidden" name="draft" value="false" />
          <label className="manage-user-import__label" htmlFor="manage-user-import-users">
            Users
          </label>
          <textarea
            id="manage-user-import-users"
            className="manage-user-import__textarea"
            name="users"
            rows={10}
            spellCheck={false}
            value={users}
            onChange={(e) => setUsers(e.target.value)}
            aria-label="Users"
          />
          <div className="manage-user-import__actions">
            <Button
              variant="primary"
              type="button"
              onClick={() => submitAs('true')}
              aria-label="Preview"
            >
              Preview
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => submitAs('false')}
              aria-label="Submit"
            >
              Submit
            </Button>
          </div>
        </form>
      </Card>

      <Card variant="default" header={<h2 className="manage-user-import__subtitle">Preview</h2>}>
        <section className="manage-user-import__preview" aria-label="Import preview">
          {preview ? (
            <dl className="manage-user-import__preview-list">
              <div className="manage-user-import__preview-row">
                <dt className="manage-user-import__preview-key">Total</dt>
                <dd className="manage-user-import__preview-value">{previewCount}</dd>
              </div>
              <div className="manage-user-import__preview-row">
                <dt className="manage-user-import__preview-key">Valid</dt>
                <dd className="manage-user-import__preview-value">{previewValid}</dd>
              </div>
              <div className="manage-user-import__preview-row">
                <dt className="manage-user-import__preview-key">Invalid</dt>
                <dd className="manage-user-import__preview-value">{previewInvalid}</dd>
              </div>
            </dl>
          ) : (
            <p className="manage-user-import__preview-empty" role="status">
              No preview available.
            </p>
          )}
        </section>
      </Card>

      <Card variant="default" header={<h2 className="manage-user-import__subtitle">Progress</h2>}>
        <section className="manage-user-import__progress" aria-label="Import progress">
          {progress ? (
            <div className="manage-user-import__progress-body">
              <p className="manage-user-import__progress-text">
                {progress.status ?? 'Importing'} {progress.current} / {progress.total}
              </p>
              <progress
                className="manage-user-import__progress-bar"
                value={progress.current}
                max={progress.total}
              >
                {progress.current} / {progress.total}
              </progress>
            </div>
          ) : (
            <p className="manage-user-import__progress-empty" role="status">
              No import in progress.
            </p>
          )}
        </section>
      </Card>

      <Card variant="default" header={<h2 className="manage-user-import__subtitle">Messages</h2>}>
        {messages.length > 0 ? (
          <ul className="manage-user-import__message-list" aria-label="Status messages">
            {messages.map((m, i) => (
              // `level + index` is stable across renders for the same server
              // payload; using `i` alone would shift React keys if any
              // message were ever prepended (e.g. live progress messages).
              <li
                key={`${m.level ?? 'info'}-${i}`}
                className={`manage-user-import__message manage-user-import__message--${m.level ?? 'info'}`}
                data-level={m.level ?? 'info'}
              >
                {m.content}
              </li>
            ))}
          </ul>
        ) : (
          <pre className="manage-user-import__messages" name="messages" aria-label="Status messages" />
        )}
      </Card>
    </div>
  );
}
