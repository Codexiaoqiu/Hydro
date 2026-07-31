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

interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  preview?: PreviewSummary;
  progress?: ProgressInfo;
}

function countNonEmptyLines(value: string): number {
  return value.split('\n').filter((line) => line.trim().length > 0).length;
}

export default function ManageUserImportPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const preview = args?.preview;
  const progress = args?.progress;

  const [users, setUsers] = useState<string>('');
  const [localPreview, setLocalPreview] = useState<LocalPreview | null>(null);

  const handlePreview = () => {
    const total = countNonEmptyLines(users);
    setLocalPreview({ count: total });
  };

  const handleSubmit = () => {
    // Submission flow is not wired in this view; backend handles import via SystemUserImportHandler.post.
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
        <form
          className="manage-user-import__form"
          onSubmit={(e) => e.preventDefault()}
        >
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
              type="button"
              onClick={handleSubmit}
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
        <pre className="manage-user-import__messages" name="messages" aria-label="Status messages" />
      </Card>
    </div>
  );
}
