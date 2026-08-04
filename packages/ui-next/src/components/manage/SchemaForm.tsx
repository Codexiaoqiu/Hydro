import { createSchemasteryReact } from 'schemastery-react';
import 'schemastery-react/lib/schemastery-react.css';
import { useMemo } from 'react';

export interface SchemaFormProps {
  schema: import('schemastery').Schema;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}

// schemastery-react requires a Markdown renderer component (per its type
// signature). Provide a minimal no-op so consumers don't have to wire one.
const NoopMarkdown = ({ source }: { source: string }) => <>{source}</>;

export function SchemaForm({ schema, value, onChange }: SchemaFormProps) {
  // Use schemastery-react to build a self-managed form; wrap onChange so
  // consumers always see a flat Record (matching YAML form semantics).
  const Form = useMemo(
    () => createSchemasteryReact({ Markdown: NoopMarkdown, locale: 'en-US' }),
    [],
  );
  return (
    <Form
      schema={schema}
      initial={value}
      value={value}
      onChange={(v: unknown) => onChange((v ?? {}) as Record<string, unknown>)}
    />
  );
}