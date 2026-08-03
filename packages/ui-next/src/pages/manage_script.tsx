import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { timeAgo } from '../lib/datetime';

interface Script {
  description?: string;
  hidden?: boolean;
  modified?: string | number;
}

interface ScriptEntry {
  id: string;
  description?: string;
  hidden?: boolean;
  modified?: string | number;
}

// Args documents the shape of the backend-injected page-data payload.
// eslint-disable-next-line ts/no-unused-vars
interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  scripts?: Record<string, Script> | ScriptEntry[];
}

function toEntries(scripts: Record<string, Script> | ScriptEntry[] | undefined): ScriptEntry[] {
  if (!scripts) return [];
  if (Array.isArray(scripts)) {
    return scripts
      .filter((s) => !s.hidden)
      .map((s, idx) => ({ id: s.id ?? String(idx), description: s.description, hidden: s.hidden, modified: s.modified }));
  }
  return Object.entries(scripts)
    .filter(([, s]) => !s.hidden)
    .map(([id, s]) => ({ id, description: s.description, hidden: s.hidden, modified: s.modified }));
}

function toIso(value: string | number): string {
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  return value;
}

function formatModified(modified: string | number | undefined): string | undefined {
  if (modified === undefined || modified === null || modified === '') return undefined;
  return toIso(modified);
}

export default function ManageScriptPage() {
  const { args } = usePageData();
  const entries = toEntries(args?.scripts);

  if (entries.length === 0) {
    return (
      <div className="manage-script">
        <Card variant="default" header={<h1 className="manage-script__title">Scripts</h1>}>
          <p className="manage-script__empty" role="status">
            No scripts available.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="manage-script">
      <Card variant="default" header={<h1 className="manage-script__title">Scripts</h1>}>
        <table className="manage-script__table data-table">
          <colgroup>
            <col className="manage-script__col-id" />
            <col className="manage-script__col-desc" />
            <col className="manage-script__col-modified" />
            <col className="manage-script__col-action" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="manage-script__header">ID</th>
              <th scope="col" className="manage-script__header">Description</th>
              <th scope="col" className="manage-script__header">Modified</th>
              <th scope="col" className="manage-script__header">Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="manage-script__row">
                <td className="manage-script__cell manage-script__cell--id">{entry.id}</td>
                <td className="manage-script__cell manage-script__cell--desc">
                  {entry.description || 'None'}
                </td>
                <td className="manage-script__cell manage-script__cell--modified">
                  {(() => {
                    const iso = formatModified(entry.modified);
                    return iso ? (
                      <time dateTime={iso}>{timeAgo(iso)}</time>
                    ) : '—';
                  })()}
                </td>
                <td className="manage-script__cell manage-script__cell--action">
                  {/*
                    Native form submission: `SystemScriptHandler.post` consumes
                    `id` + `args` (a JSON-encoded argument blob; empty `{}`
                    is fine for parameter-less scripts) and redirects to the
                    resulting `/record/<rid>`.
                  */}
                  <form
                    method="post"
                    action="/manage/script"
                    style={{ display: 'inline' }}
                  >
                    <input type="hidden" name="id" value={entry.id} />
                    <input type="hidden" name="args" value="{}" />
                    <Button
                      variant="primary"
                      type="submit"
                      aria-label={`Run ${entry.id}`}
                    >
                      Run
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
