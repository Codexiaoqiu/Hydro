import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ContestClarificationForm.module.css';

export interface ContestClarificationFormProps {
  mode: 'reply' | 'broadcast';
  tdoc: { docId: number; pids: number[]; title?: string };
  /** Required when mode === 'reply'. */
  did?: string;
  onSubmitted: () => void;
}

export function ContestClarificationForm({ mode, tdoc, did, onSubmitted }: ContestClarificationFormProps) {
  const t = useTranslate();
  const SUBJECT_KEYS = ['-1', '0'];
  const SUBJECT_LABEL_KEYS: Record<string, string> = {
    '-1': 'ContestClarification.SubjectTechnical',
    '0': 'ContestClarification.SubjectGeneral',
  };
  const [subject, setSubject] = useState('-1');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!content.trim()) { toast.error(t('ContestClarification.ContentRequired')); return; }
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'clarification');
      fd.set('content', content);
      if (mode === 'reply' && did) fd.set('did', did);
      if (mode === 'broadcast') fd.set('subject', subject);
      await request.post(window.location.pathname, fd);
      toast.success(t('ContestClarification.Submitted'));
      setContent('');
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <form className={styles.root} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <h3 className={styles.title}>
        {mode === 'reply' ? t('ContestClarification.Reply') : t('ContestClarification.Broadcast')}
      </h3>
      {mode === 'broadcast' && (
        <div className={styles.field}>
          <label htmlFor="clar-subject" className={styles.label}>{t('ContestClarification.Subject')}</label>
          <select
            id="clar-subject"
            className={styles.select}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label={t('ContestClarification.Subject')}
          >
            {SUBJECT_KEYS.map((k) => (
              <option key={k} value={k}>{t(SUBJECT_LABEL_KEYS[k])}</option>
            ))}
            {tdoc.pids.map((p) => (
              <option key={p} value={String(p)}>{t('ContestClarification.FormProblem', { pid: p })}</option>
            ))}
          </select>
        </div>
      )}
      <MarkdownEditor
        value={content}
        onChange={setContent}
        height={160}
        aria-label={t('ContestClarification.Subject')}
      />
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? t('ContestClarification.Submitting') : t('ContestClarification.Submit')}
      </Button>
    </form>
  );
}
