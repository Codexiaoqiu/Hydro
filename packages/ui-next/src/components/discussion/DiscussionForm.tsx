import { useState } from 'react';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import styles from './DiscussionForm.module.css';

export interface DiscussionFormValues {
  title: string;
  content: string;
  highlight: boolean;
  pin: boolean;
}

export interface DiscussionFormProps {
  initial?: Partial<DiscussionFormValues>;
  showHighlightPin: boolean;
  onSubmit: (values: DiscussionFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitText?: string;
}

export function DiscussionForm({
  initial = {},
  showHighlightPin,
  onSubmit,
  onCancel,
  submitText = '发布',
}: DiscussionFormProps) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [content, setContent] = useState(initial.content ?? '');
  const [highlight, setHighlight] = useState(initial.highlight ?? false);
  const [pin, setPin] = useState(initial.pin ?? false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title, content, highlight, pin });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className={styles.titleRow}>
        <Input
          aria-label="标题"
          placeholder="标题"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className={styles.titleInput}
        />
        {showHighlightPin && (
          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                aria-label="高亮"
                checked={highlight}
                onChange={(e) => setHighlight(e.target.checked)}
              />
              <span>高亮</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                aria-label="置顶"
                checked={pin}
                onChange={(e) => setPin(e.target.checked)}
              />
              <span>置顶</span>
            </label>
          </div>
        )}
      </div>
      <MarkdownEditor
        aria-label="content"
        value={content}
        onChange={setContent}
        onSubmit={submit}
      />
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
        )}
        <Button type="submit" variant="primary" disabled={!title.trim() || !content.trim() || submitting}>
          {submitting ? '...' : submitText}
        </Button>
      </div>
    </form>
  );
}