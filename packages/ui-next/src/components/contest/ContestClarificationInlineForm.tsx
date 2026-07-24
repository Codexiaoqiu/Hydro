import { useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { Button } from '../primitives/Button';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import { useToast } from '../primitives/Toast';
import styles from './ContestClarificationInlineForm.module.css';

/**
 * Inline "ask jury" form mounted on the contest problem list page.
 *
 * Mirrors `packages/ui-default/templates/contest_problemlist.html:180-208`:
 * a contestant submits a new question to the jury. The body is
 *   operation=clarification
 *   subject=<int: -1 technical | 0 general | pid>
 *   content=<markdown>
 * Backend (`ContestProblemListHandler.postClarification`, handler/contest.ts:346)
 * records owner = this.user._id, so no `owner` or `did` is sent from the client.
 *
 * `reply` mode was removed: in ui-default the reply/broadcast forms live on
 * the `contest_clarification` page (ContestClarificationHandler.postClarification),
 * not inline on the problem list. Contestants never reply to their own thread
 * via this page; the jury replies from the dedicated `/contest/:tid/clarification`
 * page (ContestClarificationForm, separate component).
 */
export interface ContestClarificationInlineFormProps {
  /** The contest document (only `docId` and `pids` are needed). */
  tdoc: { docId: number | string; pids: number[]; title?: string };
  onSubmitted?: () => void;
}

export function ContestClarificationInlineForm({
  tdoc,
  onSubmitted,
}: ContestClarificationInlineFormProps) {
  const t = useTranslate();
  const [subject, setSubject] = useState('-1');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) {
      toast.error(t('ContestClarification.ContentRequired'));
      return;
    }
    setBusy(true);
    try {
      // Match ui-default `templates/contest_problemlist.html:180-208` exactly:
      // only `operation`, `subject`, `content` are sent. Backend infers the
      // owner from the session — sending `owner` would be ignored at best,
      // rejected at worst.
      const fd = new URLSearchParams();
      fd.set('operation', 'clarification');
      fd.set('subject', subject);
      fd.set('content', content);
      await request.post(window.location.pathname, fd);
      toast.success(t('ContestClarification.Submitted'));
      setContent('');
      onSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={onSubmit}
      data-testid="clar-inline-ask"
    >
      <h3 className={styles.title}>{t('ContestClarification.Ask')}</h3>
      <div className={styles.field}>
        <label htmlFor="clar-inline-subject" className={styles.label}>
          {t('ContestClarification.Subject')}
        </label>
        <select
          id="clar-inline-subject"
          data-testid="clar-inline-subject"
          className={styles.select}
          value={subject}
          onChange={(e) => setSubject(e.currentTarget.value)}
        >
          <option value="-1">{t('ContestClarification.SubjectTechnical')}</option>
          <option value="0">{t('ContestClarification.SubjectGeneral')}</option>
          {tdoc.pids.map((p) => (
            <option key={p} value={String(p)}>
              {t('ContestClarification.FormProblem', { pid: p })}
            </option>
          ))}
        </select>
      </div>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        height={120}
        aria-label={t('ContestClarification.Content')}
      />
      <Button type="submit" variant="primary" disabled={busy} data-testid="clar-inline-submit">
        {busy ? t('ContestClarification.Submitting') : t('ContestClarification.Submit')}
      </Button>
    </form>
  );
}