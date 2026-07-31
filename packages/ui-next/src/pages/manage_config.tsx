import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { Input } from '../components/primitives/Input';
import { usePageData } from '../context/page-data';

interface SchemaNode {
  name: string;
  type: 'string' | 'number' | 'boolean';
  label?: string;
  description?: string;
  default?: unknown;
}

interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  schema?: SchemaNode[];
  value?: Record<string, unknown>;
}

function initialValue(node: SchemaNode, value?: Record<string, unknown>): string {
  const raw = value?.[node.name] ?? node.default ?? '';
  return String(raw);
}

export default function ManageConfigPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const schema = args?.schema ?? [];
  const value = args?.value ?? {};

  if (schema.length === 0) {
    return (
      <div className="manage-config">
        <p className="manage-config__empty" role="status">
          No configuration available.
        </p>
      </div>
    );
  }

  return (
    <div className="manage-config">
      <Card
        variant="default"
        header={<h1 className="manage-config__title">System Configuration</h1>}
      >
        <form
          className="manage-config__form"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="manage-config__fields">
            {schema.map((node) => (
              <div key={node.name} className="manage-config__field">
                {node.type === 'boolean' ? (
                  <label className="manage-config__bool">
                    <input
                      type="checkbox"
                      name={node.name}
                      defaultChecked={Boolean(value?.[node.name] ?? node.default)}
                      aria-label={node.label ?? node.name}
                    />
                    <span>{node.label ?? node.name}</span>
                    {node.description && (
                      <span className="manage-config__hint">{node.description}</span>
                    )}
                  </label>
                ) : (
                  <Input
                    label={node.label ?? node.name}
                    type={node.type === 'number' ? 'number' : 'text'}
                    defaultValue={initialValue(node, value)}
                    name={node.name}
                    hint={node.description}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="manage-config__actions">
            <Button
              variant="primary"
              type="submit"
              onClick={() => {
                // Persistence is wired in a follow-up task; the button is
                // intentionally a no-op placeholder so the form structure is
                // visible here without an oversized stub.
              }}
            >
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
