import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal } from '../primitives';
import { useTranslate } from '../../lib/i18n';
import { type RenameChange, type RenamePreview, previewRename } from '../../lib/file-rename';
import styles from './BatchRenameDialog.module.css';

export interface BatchRenameDialogProps {
  open: boolean;
  selected: string[];
  existing: string[];
  onClose(): void;
  onConfirm(changes: RenameChange[]): Promise<void>;
  /** Optional initial form values. Only re-seeded on a fresh open (false -> true). */
  prefix?: string;
  suffix?: string;
  find?: string;
  replace?: string;
  flags?: string;
}

function computePreview(
  selected: string[],
  existing: string[],
  options: { prefix: string; suffix: string; find: string; replace: string; flags: string },
): RenamePreview {
  const find = options.find.trim();
  const flags = options.flags.trim();
  return previewRename(
    selected,
    {
      prefix: options.prefix,
      suffix: options.suffix,
      ...(find ? {
        find,
        replace: options.replace,
        ...(flags ? { flags } : {}),
      } : {}),
    },
    existing,
  );
}

/**
 * Dialog that previews a batch rename over `selected`, computed live by the
 * pure `previewRename` helper on every render. The Confirm button stays
 * disabled while the helper reports any error/invalid/duplicates/collisions
 * OR the last `onConfirm` rejected (the dialog stays open so the user can
 * retry after fixing the underlying issue).
 */
export function BatchRenameDialog({
  open, selected, existing, onClose, onConfirm,
  prefix: initialPrefix = '', suffix: initialSuffix = '',
  find: initialFind = '', replace: initialReplace = '', flags: initialFlags = '',
}: BatchRenameDialogProps) {
  const t = useTranslate();
  const [prefix, setPrefix] = useState(initialPrefix);
  const [suffix, setSuffix] = useState(initialSuffix);
  const [find, setFind] = useState(initialFind);
  const [replace, setReplace] = useState(initialReplace);
  const [flags, setFlags] = useState(initialFlags);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const prevOpenRef = useRef(open);

  // Re-seed form values only on the open false -> true transition so a parent
  // re-render with a stable `selected` identity does NOT clobber in-progress
  // edits; re-seed also runs once when the dialog first mounts in `open`.
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;
    if (!open) return;
    if (wasOpen) return;
    setPrefix(initialPrefix);
    setSuffix(initialSuffix);
    setFind(initialFind);
    setReplace(initialReplace);
    setFlags(initialFlags);
    setSubmitError(null);
    setSubmitting(false);
  }, [open, initialPrefix, initialSuffix, initialFind, initialReplace, initialFlags]);

  // Focus the first input on a fresh open so keyboard users land inside the form.
  // autoFocus={open} on the prefix Input is the simplest way to express this
  // without expanding the Modal primitive's focus-management API.
  const autoFocus = open;

  // Preview is derived, never stored: every keystroke reflects in the table
  // and feeds the blocking flag, so users can never submit with a stale preview.
  const preview = useMemo(
    () => computePreview(selected, existing, { prefix, suffix, find, replace, flags }),
    [selected, existing, prefix, suffix, find, replace, flags],
  );

  const newNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const { oldName, newName } of preview.changes) map.set(oldName, newName);
    return map;
  }, [preview]);

  const blocking = !!preview.error
    || preview.invalid.length > 0
    || preview.duplicates.length > 0
    || preview.collisions.length > 0
    || selected.length === 0
    || submitting;

  const confirm = async () => {
    if (blocking) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm(preview.changes);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('BatchRenameDialog.Title')}
      width={520}
      closeLabel={t('Common.Close')}
      footer={(
        <div className={styles.footer}>
          <Button type="button" onClick={onClose} data-testid="batch-rename-cancel">
            {t('BatchRenameDialog.Cancel')}
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={blocking}
            data-testid="batch-rename-confirm"
          >
            {t('BatchRenameDialog.Confirm')}
          </Button>
        </div>
      )}
    >
      <div className={styles.form}>
        <Input
          label={t('BatchRenameDialog.Prefix')}
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          data-testid="batch-rename-prefix"
          // autoFocus on a fresh open keeps focus on the form without
          // expanding the Modal primitive's focus-management API.
          autoFocus={autoFocus}
        />
        <Input
          label={t('BatchRenameDialog.Find')}
          value={find}
          onChange={(e) => setFind(e.target.value)}
          data-testid="batch-rename-find"
          aria-invalid={preview.error ? 'true' : undefined}
        />
        <Input
          label={t('BatchRenameDialog.Replace')}
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          data-testid="batch-rename-replace"
        />
      </div>

      {preview.error && (
        <p className={styles.error} data-testid="batch-rename-error" role="alert">
          {preview.error}
        </p>
      )}
      {submitError && (
        <p className={styles.error} data-testid="batch-rename-submit-error" role="alert">
          {submitError}
        </p>
      )}

      <ul className={styles.preview} aria-label={t('BatchRenameDialog.PreviewList')}>
        {selected.map((name) => (
          <li
            key={name}
            className={styles.row}
            data-testid={`batch-rename-row-${name}`}
          >
            <span className={styles.old}>{name}</span>
            <span className={styles.arrow} aria-hidden="true">→</span>
            <span className={styles.new} data-testid={`batch-rename-new-${name}`}>
              {newNames.get(name) ?? name}
            </span>
          </li>
        ))}
      </ul>

      {preview.invalid.length > 0 && (
        <div className={styles.issues}>
          <h4 className={styles.issuesTitle}>{t('BatchRenameDialog.Invalid')}</h4>
          <ul className={styles.issueList}>
            {preview.invalid.map(({ name, reason }) => (
              <li key={name}>{name}: {reason}</li>
            ))}
          </ul>
        </div>
      )}
      {preview.duplicates.length > 0 && (
        <div className={styles.issues} data-testid="batch-rename-duplicates">
          <h4 className={styles.issuesTitle}>{t('BatchRenameDialog.Duplicates')}</h4>
          <ul className={styles.issueList}>
            {preview.duplicates.map((name) => <li key={name}>{name}</li>)}
          </ul>
        </div>
      )}
      {preview.collisions.length > 0 && (
        <div className={styles.issues} data-testid="batch-rename-collisions">
          <h4 className={styles.issuesTitle}>{t('BatchRenameDialog.Collisions')}</h4>
          <ul className={styles.issueList}>
            {preview.collisions.map((name) => <li key={name}>{name}</li>)}
          </ul>
        </div>
      )}
    </Modal>
  );
}
