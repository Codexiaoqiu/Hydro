import { Button } from '../primitives';
import { useFileSelection } from '../../hooks/use-file-selection';
import { useTranslate } from '../../lib/i18n';
import styles from './FileSelectionToolbar.module.css';

export interface FileSelectionToolbarProps {
  available: string[];
  primaryAction?: { label: string; onSelect: (selected: string[]) => void };
}

/**
 * Toolbar that surfaces multi-selection helpers (count, select all, invert,
 * clear) on top of `useFileSelection`. A single optional `primaryAction` is
 * rendered as a button that hands the current selection back to the caller
 * — used by the additional-files list to open the batch-rename dialog.
 */
export function FileSelectionToolbar({ available, primaryAction }: FileSelectionToolbarProps) {
  const t = useTranslate();
  const { selected, selectAll, invert, clear } = useFileSelection(available);
  const disabled = available.length === 0;
  const noSelection = selected.size === 0;

  return (
    <div className={styles.bar} role="toolbar" aria-label={t('FileSelectionToolbar.Label')}>
      <span className={styles.count} data-testid="file-selection-toolbar-count">
        {t('FileSelectionToolbar.SelectedCount', {
          selected: selected.size, total: available.length,
        })}
      </span>
      <div className={styles.actions}>
        <Button type="button" onClick={selectAll} disabled={disabled}>
          {t('FileSelectionToolbar.SelectAll')}
        </Button>
        <Button type="button" onClick={invert} disabled={disabled}>
          {t('FileSelectionToolbar.Invert')}
        </Button>
        <Button type="button" onClick={clear} disabled={disabled || noSelection}>
          {t('FileSelectionToolbar.Clear')}
        </Button>
        {primaryAction && (
          <Button type="button" onClick={() => primaryAction.onSelect([...selected])} disabled={noSelection}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
