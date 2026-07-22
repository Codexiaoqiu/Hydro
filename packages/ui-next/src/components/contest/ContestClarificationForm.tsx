import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
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

const SUBJECT_OPTIONS = [
  { value: '-1', label: 'Technical' },
  { value: '0', label: 'General' },
];

export function ContestClarificationForm({ mode, tdoc, did, onSubmitted }: ContestClarificationFormProps) {
  const [subject, setSubject] = useState('-1');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!content.trim()) { toast.error('Content is required'); return; }
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'clarification');
      fd.set('content', content);
      if (mode === 'reply' && did) fd.set('did', did);
      if (mode === 'broadcast') fd.set('subject', subject);
      await request.post(window.location.pathname, fd);
      toast.success('Clarification submitted');
      setContent('');
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <form className={styles.root} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <h3 className={styles.title}>{mode === 'reply' ? 'Reply' : 'Broadcast'}</h3>
      {mode === 'broadcast' && (
        <div className={styles.field}>
          <label htmlFor="clar-subject" className={styles.label}>Subject</label>
          <select
            id="clar-subject"
            className={styles.select}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Subject"
          >
            {SUBJECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
            {tdoc.pids.map((p) => (
              <option key={p} value={String(p)}>Problem {p}</option>
            ))}
          </select>
        </div>
      )}
      <MarkdownEditor value={content} onChange={setContent} height={160} aria-label="content" />
      <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>
    </form>
  );
}
