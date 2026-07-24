import type { ReactElement } from 'react';
import { useState } from 'react';
import { request } from '../../hooks/use-api';
import { detectLocale, useTranslate } from '../../lib/i18n';
import { Button } from '../primitives/Button';
import { Modal } from '../primitives/Modal';
import { useToast } from '../primitives/Toast';
import { CopyToDomainDialog } from './CopyToDomainDialog';
import styles from './ProblemSelectionDisplay.module.css';

export interface ProblemSelectionDisplayProps {
  pids: number[];
  onAfterAction: () => void;
  canDelete?: boolean;
  canCopy?: boolean;
  canEdit?: boolean;
  domainId?: string;
}

type BatchOp = 'hide' | 'unhide' | 'delete';

interface OpAction {
  op: BatchOp;
  successKey: 'Hidden' | 'Unhidden' | 'Deleted';
  confirm: string | null;
}

function buildOpAction(locale: string, op: BatchOp, count: number): OpAction {
  const isZh = locale === 'zh_CN';
  const isEn = !isZh;
  const labels = {
    Hidden: isZh ? `已隐藏 ${count} 道题目` : `Hid ${count} problems`,
    Unhidden: isZh ? `已取消隐藏 ${count} 道题目` : `Unhid ${count} problems`,
    Deleted: isZh ? `已删除 ${count} 道题目` : `Deleted ${count} problems`,
  } as const;
  if (op === 'delete') {
    return {
      op,
      successKey: 'Deleted',
      confirm: isZh ? `确认删除选中的 ${count} 道题目？` : `Delete the ${count} selected problems?`,
    };
  }
  return { op, successKey: op === 'hide' ? 'Hidden' : 'Unhidden', confirm: null };
}

function successMessage(locale: string, key: OpAction['successKey'], count: number): string {
  if (key === 'Hidden') return locale === 'zh_CN' ? `已隐藏 ${count} 道题目` : `Hid ${count} problems`;
  if (key === 'Unhidden') return locale === 'zh_CN' ? `已取消隐藏 ${count} 道题目` : `Unhid ${count} problems`;
  return locale === 'zh_CN' ? `已删除 ${count} 道题目` : `Deleted ${count} problems`;
}

function errorMessage(locale: string, err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (locale === 'zh_CN') return `操作失败: ${raw}`;
  return `Operation failed: ${raw}`;
}

async function postBatchOperation(op: BatchOp, pids: number[]): Promise<void> {
  const fd = new URLSearchParams();
  fd.set('operation', op);
  for (const pid of pids) fd.append('pids', String(pid));
  await request.post('/p', fd);
}

export function ProblemSelectionDisplay(props: ProblemSelectionDisplayProps): ReactElement | null {
  const { pids, onAfterAction, canDelete, canCopy, canEdit, domainId } = props;
  const t = useTranslate();
  const toast = useToast();
  const [locale] = useState(() => (typeof window === 'undefined' ? 'en' : detectLocale()));
  const [busy, setBusy] = useState<BatchOp | 'copy' | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  if (!pids.length) return null;

  const showHide = !!canEdit;
  const showUnhide = !!canEdit;
  const showDelete = !!canDelete;
  const showCopy = !!canCopy;
  const showDownload = true;

  const runBatch = async (op: BatchOp) => {
    if (!pids.length) return;
    const action = buildOpAction(locale, op, pids.length);
    if (action.confirm && !window.confirm(action.confirm)) return;
    setBusy(op);
    try {
      await postBatchOperation(op, pids);
      toast.success(successMessage(locale, action.successKey, pids.length));
      onAfterAction();
    } catch (e) {
      toast.error(errorMessage(locale, e));
    } finally {
      setBusy(null);
    }
  };

  const downloadZip = async () => {
    setBusy('copy');
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'download');
      for (const pid of pids) fd.append('pids', String(pid));
      const res = await fetch('/p', { method: 'POST', body: fd, credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `problems-${domainId || 'system'}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(locale === 'zh_CN' ? '已生成打包下载' : 'Download ready');
    } catch (e) {
      toast.error(errorMessage(locale, e));
    } finally {
      setBusy(null);
    }
  };

  const isZh = locale === 'zh_CN';
  const summary = isZh ? `已选 ${pids.length} 道题目` : `${pids.length} problem(s) selected`;

  return (
    <div className={styles.bar} role="region" aria-label={summary} data-testid="problem-selection">
      <span className={styles.count}>{summary}</span>
      <div className={styles.actions}>
        {showHide && (
          <Button
            type="button"
            onClick={() => runBatch('hide')}
            disabled={busy !== null}
            data-op="hide"
          >
            {isZh ? '隐藏' : 'Hide'}
          </Button>
        )}
        {showUnhide && (
          <Button
            type="button"
            onClick={() => runBatch('unhide')}
            disabled={busy !== null}
            data-op="unhide"
          >
            {isZh ? '取消隐藏' : 'Unhide'}
          </Button>
        )}
        {showDelete && (
          <Button
            type="button"
            onClick={() => runBatch('delete')}
            disabled={busy !== null}
            data-op="delete"
          >
            {t('Common.Delete')}
          </Button>
        )}
        {showCopy && (
          <Button
            type="button"
            onClick={() => setCopyOpen(true)}
            disabled={busy !== null}
            data-op="copy"
          >
            {isZh ? '复制到域' : 'Copy to domain'}
          </Button>
        )}
        {showDownload && (
          <Button
            type="button"
            onClick={downloadZip}
            disabled={busy !== null}
            data-op="download"
          >
            {isZh ? '打包下载' : 'Download zip'}
          </Button>
        )}
      </div>
      {showCopy && (
        <CopyToDomainDialog
          open={copyOpen}
          onClose={() => setCopyOpen(false)}
          onCopied={() => { onAfterAction(); setCopyOpen(false); }}
          pids={pids}
          domainId={domainId}
        />
      )}
    </div>
  );
}
