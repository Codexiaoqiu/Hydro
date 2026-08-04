import 'allotment/dist/style.css';

import { Allotment } from 'allotment';
import yaml from 'js-yaml';
import { lazy, Suspense, useCallback, useState } from 'react';
import Schema from 'schemastery';
import { SchemaForm } from '../components/manage/SchemaForm';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { apiClient } from '../lib/api-client';

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.Editor })),
);

export interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  schema?: unknown; // schemastery JSON-serialized schema
  value?: Record<string, unknown>;
}

/**
 * Serialize the initial config object into a YAML string for the editor.
 * Exported for unit testing the seeding contract independently of the
 * Monaco runtime (which is stubbed in happy-dom).
 */
export function initialYaml(value: Record<string, unknown>): string {
  return yaml.dump(value);
}

/**
 * Parse a YAML string into a config object. Returns `null` on parse failure
 * (non-null input that is not valid YAML) so the caller can distinguish a
 * real value of `null`/etc. from an empty editor. Exported for unit testing
 * the sync contract independently of Monaco.
 */
export function parseYaml(text: string): Record<string, unknown> | null {
  const parsed = yaml.load(text);
  if (parsed === undefined || parsed === null) return {};
  if (typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed as Record<string, unknown>;
}

export default function ManageConfigPage() {
  const { args, url } = usePageData();
  const value = args?.value ?? {};
  // Single source of truth: the parsed configuration object. The YAML text
  // is just a serialization of this. Both panes observe this state, so a
  // change in one updates the other.
  const [parsedValue, setParsedValue] = useState<Record<string, unknown>>(
    () => value,
  );
  const [yamlText, setYamlText] = useState(() => initialYaml(value));
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Contract: `args.schema === undefined` or `=== null` means "no schema
  // supplied by the handler" and the page falls back to its empty state.
  // `[]` is a valid (no-field) schema and MUST be accepted as such — using
  // a plain truthiness check (`args?.schema ? ...`) would incorrectly
  // route `[]` into the empty state, which is the bug Finding 6 calls out.
  const schemaObj = args?.schema !== undefined && args?.schema !== null
    ? new Schema(args.schema as never)
    : null;

  const handleFormChange = useCallback((v: Record<string, unknown>) => {
    setParsedValue(v);
    setYamlText(yaml.dump(v));
    setYamlError(null);
  }, []);

  const handleYamlChange = useCallback((v: string | undefined) => {
    const text = v ?? '';
    setYamlText(text);
    const parsed = parseYaml(text);
    if (parsed === null) {
      setYamlError('Invalid YAML: must be a YAML object.');
      return;
    }
    setYamlError(null);
    setParsedValue(parsed);
  }, []);

  const handleSave = useCallback(async () => {
    if (yamlError) return;
    setSubmitting(true);
    try {
      await apiClient.post(url, { value: yamlText });
      window.location.reload();
    } catch (e) {
      setSubmitting(false);
      // TODO: replace with a proper toast component
      // eslint-disable-next-line no-alert
      window.alert(`Save failed: ${(e as Error).message}`);
    }
  }, [url, yamlText, yamlError]);

  if (!schemaObj) {
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
        <Allotment defaultSizes={[1, 1]}>
          <Allotment.Pane>
            <Suspense fallback={<div>Loading editor…</div>}>
              <MonacoEditor
                height="80vh"
                defaultLanguage="yaml"
                value={yamlText}
                onChange={handleYamlChange}
              />
            </Suspense>
            {yamlError && (
              <p
                className="manage-config__error"
                role="alert"
                style={{ color: 'var(--color-error, #c00)', marginTop: 8 }}
              >
                {yamlError}
              </p>
            )}
          </Allotment.Pane>
          <Allotment.Pane>
            <div className="manage-config__form">
              <SchemaForm
                schema={schemaObj}
                value={parsedValue}
                onChange={handleFormChange}
              />
            </div>
          </Allotment.Pane>
        </Allotment>
        <div className="manage-config__actions">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={submitting || !!yamlError}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
