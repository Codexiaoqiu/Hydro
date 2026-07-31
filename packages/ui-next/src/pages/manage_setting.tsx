import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';

interface SystemSetting {
  key: string;
  name?: string;
  desc?: string;
  value?: string | number | boolean;
  type?: 'text' | 'number' | 'boolean' | 'select' | 'password' | 'float' | 'radio' | 'textarea' | 'markdown';
  family?: string;
  flag?: number;
  range?: string[];
}

interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  settings?: SystemSetting[];
  current?: Record<string, string | number | boolean>;
}

function displayValue(raw: string | number | boolean | undefined, type: SystemSetting['type']): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  if (type === 'boolean') return raw ? 'Yes' : 'No';
  return String(raw);
}

export default function ManageSettingPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const settings = args?.settings ?? [];
  const current = args?.current ?? {};

  if (settings.length === 0) {
    return (
      <div className="manage-setting">
        <Card variant="default" header={<h1 className="manage-setting__title">Settings</h1>}>
          <p className="manage-setting__empty" role="status">
            No settings available.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="manage-setting">
      <Card variant="default" header={<h1 className="manage-setting__title">Settings</h1>}>
        <table className="manage-setting__table data-table">
          <colgroup>
            <col className="manage-setting__col-key" />
            <col className="manage-setting__col-value" />
            <col className="manage-setting__col-action" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="manage-setting__header">Key</th>
              <th scope="col" className="manage-setting__header">Value</th>
              <th scope="col" className="manage-setting__header">Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => {
              const raw = current[s.key] !== undefined ? current[s.key] : s.value;
              return (
                <tr key={s.key} className="manage-setting__row">
                  <td className="manage-setting__cell manage-setting__cell--key">{s.key}</td>
                  <td className="manage-setting__cell manage-setting__cell--value">
                    {displayValue(raw, s.type)}
                  </td>
                  <td className="manage-setting__cell manage-setting__cell--action">
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => { /* inline edit is not wired in this view */ }}
                      aria-label={`Edit ${s.key}`}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
