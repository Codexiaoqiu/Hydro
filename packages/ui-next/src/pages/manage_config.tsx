import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import Editor from '@monaco-editor/react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import yaml from 'js-yaml';
import Schema from 'schemastery';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { SchemaForm } from '../components/manage/SchemaForm';
import { apiClient } from '../lib/api-client';
import { usePageData } from '../context/page-data';

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

export default function ManageConfigPage() {
  const { args, url } = usePageData();
  const value = args?.value ?? {};
  const [yamlText, setYamlText] = useState(() => initialYaml(value));
  const [submitting, setSubmitting] = useState(false);

  const schemaObj = useMemo(
    () => (args?.schema ? new Schema(args.schema as never) : null),
    [args?.schema],
  );

  const handleFormChange = useCallback((v: Record<string, unknown>) => {
    setYamlText(yaml.dump(v));
  }, []);

  const handleYamlChange = useCallback((v: string | undefined) => {
    if (v) setYamlText(v);
  }, []);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    try {
      await apiClient.post(url, { value: yamlText });
      window.location.reload();
    } catch (e) {
      setSubmitting(false);
      // TODO: replace with a proper toast component
      window.alert(`Save failed: ${(e as Error).message}`);
    }
  }, [url, yamlText]);

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
          </Allotment.Pane>
          <Allotment.Pane>
            <div className="manage-config__form">
              <SchemaForm
                schema={schemaObj}
                value={value}
                onChange={handleFormChange}
              />
            </div>
          </Allotment.Pane>
        </Allotment>
        <div className="manage-config__actions">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
