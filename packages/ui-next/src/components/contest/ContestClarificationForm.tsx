import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ContestClarificationForm.module.css';

/**
 * Jury reply / broadcast form mounted on the dedicated
 * `/contest/:tid/clarification` page. Mirrors
 * `packages/ui-default/templates/contest_clarification.html:64-104`.
 *
 * Backend (`ContestClarificationHandler.postClarification`,
 * `handler/contest.ts:690`) hard-codes `owner=0` (jury) for both branches:
 *   - `mode='reply'` with `did=<doc._id>` → `addClarificationReply`
 *   - `mode='broadcast'` without `did`    → `addClarification` (subject required)
 *
 * The `ask` mode was removed: ui-default has no ask-mode form on this page.
 * Contestants submit new questions via the inline form on
 * `/contest/:tid/problems` (ContestProblemListHandler, see
 * `ContestClarificationInlineForm`), which records owner = this.user._id.
 */
export interface ContestClarificationFormProps {
  mode: 'reply' | 'broadcast';
  tdoc: { docId: number; pids: number[]; title?: string };
  /** Required when mode === 'reply'. */
  did?: string;
  onSubmitted: (payload?: { did?: string; subject?: number; content?: string }) => void;
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
      const payload = mode === 'broadcast'
        ? { subject: Number(subject), content }
        : { did, content };
      onSubmitted(payload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const titleKey = mode === 'reply'
    ? 'ContestClarification.Reply'
    : 'ContestClarification.Broadcast';

  return (
    <form className={styles.root} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <h3 className={styles.title}>{t(titleKey)}</h3>
      {mode === 'broadcast' && (
        <div className={styles.field}>
          <label htmlFor="clar-subject" className={styles.label}>{t('ContestClarification.Subject')}</label>
          <select
            id="clar-subject"
            data-testid="clar-subject-select"
            className={styles.select}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label={t('ContestClarification.SubjectLabel')}
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
        aria-label={t('ContestClarification.Content')}
      />
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? t('ContestClarification.Submitting') : t('ContestClarification.Submit')}
      </Button>
    </form>
  );
}