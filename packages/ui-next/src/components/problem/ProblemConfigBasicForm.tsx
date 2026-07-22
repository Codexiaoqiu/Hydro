import { Input } from '../primitives/Input';
import { useTranslate } from '../../lib/i18n';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigBasicForm.module.css';

export interface ProblemConfigBasicFormProps {
  config: ProblemConfigYaml;
  onChange: (next: ProblemConfigYaml) => void;
}

// `count` and `subLimit` are UI-specific fields that the YAML schema does not
// declare but the basic form still edits (they were carried over from the
// earlier hand-rolled type). They are passed through opaquely.
type BasicFormExtensions = { count?: number; subLimit?: number };

export function ProblemConfigBasicForm({ config, onChange }: ProblemConfigBasicFormProps) {
  const t = useTranslate();
  const TYPE_OPTIONS = [
    { value: 'default', labelKey: 'ProblemConfig.BasicFormStandard' },
    { value: 'objective', labelKey: 'ProblemConfig.BasicFormObjective' },
    { value: 'submit_answer', labelKey: 'ProblemConfig.BasicFormSubmitAnswer' },
    { value: 'interactive', labelKey: 'ProblemConfig.BasicFormInteractive' },
    { value: 'communication', labelKey: 'ProblemConfig.BasicFormCommunication' },
  ];
  const cfg = config as ProblemConfigYaml & BasicFormExtensions;
  const set = <K extends keyof ProblemConfigYaml>(k: K, v: ProblemConfigYaml[K]) =>
    onChange({ ...config, [k]: v });
  const setExt = (patch: BasicFormExtensions) =>
    onChange({ ...config, ...patch } as ProblemConfigYaml);

  return (
    <div className={styles.grid}>
      <label className={styles.field}>
        <span className={styles.label}>{t('ProblemConfig.BasicFormType')}</span>
        <select
          className={styles.select}
          value={config.type ?? 'default'}
          onChange={(e) => set('type', e.currentTarget.value as ProblemConfigYaml['type'])}
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
      </label>
      <Input
        label={t('ProblemConfig.BasicFormCount')}
        type="number"
        min={1}
        value={cfg.count ?? 10}
        onChange={(e) => setExt({ count: Number(e.currentTarget.value) })}
      />
      <Input
        label={t('ProblemConfig.BasicFormSubLimit')}
        type="number"
        min={0}
        value={cfg.subLimit ?? 0}
        onChange={(e) => setExt({ subLimit: Number(e.currentTarget.value) })}
      />
    </div>
  );
}
