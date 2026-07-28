import { useState } from 'react';
import { Button } from '../primitives/Button';
import styles from './CommentEditor.module.css';

export interface CommentEditorProps {
  placeholder?: string;
  initialValue?: string;
  submitText?: string;
  onSubmit: (content: string) => void | Promise<void>;
  onCancel?: () => void;
}

export function CommentEditor({
  placeholder = '写下你的回复…',
  initialValue = '',
  submitText = '发布',
  onSubmit,
  onCancel,
}: CommentEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(value);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className={styles.editor}>
      <textarea
        className={styles.textarea}
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={placeholder}
      />
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={!value.trim() || submitting}
        >
          {submitting ? '...' : submitText}
        </Button>
      </div>
    </div>
  );
}
