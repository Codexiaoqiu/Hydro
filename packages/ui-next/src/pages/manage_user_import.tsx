import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';

interface PreviewSummary {
  count: number;
  valid: number;
  invalid: number;
}

interface LocalPreview {
  count: number;
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
  // Each entry is the parsed user payload; we surface the validation messages
  // alongside the local preview rather than running validation client-side.
  users?: Array<{
    email?: string;
    username?: string;
    password?: string;
    displayName?: string;
  }>;
  messages?: Message[];
}

function countNonEmptyLines(value: string): number {
  return value.split('\n').filter((line) => line.trim().length > 0).length;
}

export default function ManageUserImportPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const preview = args?.preview;
  const progress = args?.progress;
  const messages = args?.messages ?? [];

  const [users, setUsers] = useState<string>('');
  const [localPreview, setLocalPreview] = useState<LocalPreview | null>(null);

  const handlePreview = () => {
    const total = countNonEmptyLines(users);
    setLocalPreview({ count: total });
  };

  const isServerPreview = Boolean(preview);
  const visiblePreview = preview ?? localPreview;
  const previewCount = visiblePreview?.count ?? 0;
  const previewValid = (preview && preview.valid) ?? 0;
  const previewInvalid = (preview && preview.invalid) ?? 0;

  return (
    <div className="manage-user-import">
      <Card
        variant="default"
        header={<h1 className="manage-user-import__title">Import User</h1>}
      >
        {/*
          Native form submission: `SystemUserImportHandler.post` consumes
          `users` (TSV/CSV) and `draft`, then re-renders `manage_user_import.html`
          with the parsed payload and validation messages. The Preview button
          is intentionally `type="button"` so it never triggers a navigation.
        */}
        <form
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
              onClick={handlePreview}
              aria-label="Preview"
            >
              Preview
            </Button>
            <Button
              variant="ghost"
              type="submit"
              aria-label="Submit"
            >
              Submit
            </Button>
          </div>
        </form>
      </Card>

      <Card variant="default" header={<h2 className="manage-user-import__subtitle">Preview</h2>}>
        <section className="manage-user-import__preview" aria-label="Import preview">
          {visiblePreview ? (
            isServerPreview ? (
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
              <p
                className="manage-user-import__preview-local"
                role="status"
              >
                Detected: {previewCount} line{previewCount === 1 ? '' : 's'} (validation requires server preview).
              </p>
            )
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
              <li key={i} className={`manage-user-import__message manage-user-import__message--${m.level ?? 'info'}`} data-level={m.level ?? 'info'}>
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
