import { Input } from '../primitives/Input';
import { useTranslate } from '../../lib/i18n';
import { dumpProblemConfigYaml, parseProblemConfigYaml, type ProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigBasicForm.module.css';

export interface ProblemConfigBasicFormProps {
  config: ProblemConfigYaml;
  onChange: (next: ProblemConfigYaml) => void;
}

// `BasicForm` renders the canonical ProblemConfigFile fields that the
// BasicFormTab exposes per problem type. The previous implementation used
// `count` / `subLimit` which are NOT in the schema; they have been removed.
//
// I18n key namespace divergence: ui-default uses bare keys (e.g. "Basic")
// while ui-next uses `ProblemConfig.*`. Adding new keys is blocked by
// q.md, so the following keys fall back to the literal key string. This is
// documented as a known divergence in the SDD round.
const TYPE_OPTIONS = [
  { value: 'default', labelKey: 'ProblemConfig.BasicFormStandard' },
  { value: 'objective', labelKey: 'ProblemConfig.BasicFormObjective' },
  { value: 'submit_answer', labelKey: 'ProblemConfig.BasicFormSubmitAnswer' },
  { value: 'interactive', labelKey: 'ProblemConfig.BasicFormInteractive' },
  { value: 'communication', labelKey: 'ProblemConfig.BasicFormCommunication' },
];

const CHECKER_TYPE_OPTIONS = [
  'default', 'lemon', 'syzoj', 'hustoj', 'testlib', 'strict', 'qduoj', 'kattis',
];

export function ProblemConfigBasicForm({ config, onChange }: ProblemConfigBasicFormProps) {
  const t = useTranslate();
  const set = <K extends keyof ProblemConfigYaml>(k: K, v: ProblemConfigYaml[K] | undefined) => {
    const next = { ...config };
    if (v === undefined || v === '') delete next[k];
    else next[k] = v;
    onChange(next);
  };

  // When switching problem type, strip fields that don't apply. This is a
  // minimal port of ui-default's `configYamlFormat` filtering so the form
  // stays consistent with the YAML it produces.
  const setType = (next: ProblemConfigYaml['type']) => {
    const cleaned = dumpProblemConfigYaml({ ...config, type: next });
    onChange(parseProblemConfigYaml(cleaned));
  };

  const type = config.type ?? 'default';
  const isDefault = type === 'default';
  const isInteractive = type === 'interactive';
  const isComm = type === 'communication';
  const isSubmit = type === 'submit_answer';

  return (
    <div className={styles.grid}>
      <label className={styles.field}>
        <span className={styles.label}>{t('ProblemConfig.BasicFormType')}</span>
        <select
          className={styles.select}
          value={type}
          onChange={(e) => setType(e.currentTarget.value as ProblemConfigYaml['type'])}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
          ))}
        </select>
      </label>

      {/* FileIO prefix / template: applies to default, interactive, communication, submit_answer */}
      {!['objective'].includes(type) && (
        <Input
          label={isSubmit ? 'Template (e.g. #.txt)' : 'FileIO prefix (filename)'}
          type="text"
          value={typeof config.filename === 'string' ? config.filename : ''}
          onChange={(e) => set('filename', e.currentTarget.value)}
        />
      )}

      {/* Checker config: default + interactive + communication */}
      {(isDefault || isInteractive || isComm) && (
        <>
          <label className={styles.field}>
            <span className={styles.label}>Checker type</span>
            <select
              className={styles.select}
              value={typeof config.checker_type === 'string' ? config.checker_type : 'default'}
              onChange={(e) => set('checker_type', e.currentTarget.value)}
            >
              {CHECKER_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <Input
            label="Checker (file or testlib name)"
            type="text"
            value={typeof config.checker === 'string' ? config.checker : ''}
            onChange={(e) => set('checker', e.currentTarget.value)}
          />
        </>
      )}

      {/* Interactive: needs interactor */}
      {isInteractive && (
        <Input
          label="Interactor (file)"
          type="text"
          value={typeof config.interactor === 'string' ? config.interactor : ''}
          onChange={(e) => set('interactor', e.currentTarget.value)}
        />
      )}

      {/* Communication: needs manager + num_processes */}
      {isComm && (
        <>
          <Input
            label="Manager (file)"
            type="text"
            value={typeof config.manager === 'string' ? config.manager : ''}
            onChange={(e) => set('manager', e.currentTarget.value)}
          />
          <Input
            label="Num processes (1-5)"
            type="number"
            min={1}
            max={5}
            value={typeof config.num_processes === 'number' ? config.num_processes : 2}
            onChange={(e) => set('num_processes', Number(e.currentTarget.value))}
          />
        </>
      )}

      {/* Multi-pass: default + interactive only */}
      {(isDefault || isInteractive) && (
        <Input
          label="Multi-pass (2-20)"
          type="number"
          min={2}
          max={20}
          value={typeof config.multi_pass === 'number' ? config.multi_pass : ''}
          onChange={(e) => set('multi_pass', e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
        />
      )}

      {/* SubType: submit_answer only */}
      {isSubmit && (
        <Input
          label="Subtype (single/multi)"
          type="text"
          value={typeof config.subType === 'string' ? config.subType : ''}
          onChange={(e) => set('subType', e.currentTarget.value)}
        />
      )}

      {/* Future work: objective problem type would render answers editor here. */}
    </div>
  );
}
