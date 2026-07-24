import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../../hooks/use-api';
import { useTranslate } from '../../lib/i18n';
import { Button } from '../primitives/Button';
import { ConfirmDialog } from '../primitives/ConfirmDialog';
import { useToast } from '../primitives/Toast';
import styles from './PrintKiosk.module.css';

export interface PrintTask {
  _id: string;
  owner: number;
  title: string;
  status: string;
  /** Backend payload — admin/kiosk allocate needs the body; `get_print_task` projection intentionally omits it. */
  content?: string;
  createAt?: string;
  uid?: number;
}

export interface PrintUserDict {
  [id: number]: { uname: string; school?: string; displayName?: string };
}

export interface PrintKioskProps {
  tdoc: { docId: string | number, title?: string, allowPrint?: boolean } | null | undefined;
  isAdmin: boolean;
  /** Override the endpoint URL — defaults to `window.location.pathname` in browser. */
  endpoint?: string;
  /** Interval (ms) for kiosk allocate polling; defaults to 5 s, matching ui-default. */
  pollIntervalMs?: number;
}

/** Cap the printable content to 300 lines of 100 columns, matching ui-default. */
const MAX_LINES = 300;
const MAX_LINE_WIDTH = 100;

/**
 * Truncate content so that the highlight pipeline never produces an
 * unbounded printable payload. Mirrors `pages/contest_print.page.tsx` in
 * ui-default so a 30 MB source file still fits in the kiosk print window.
 */
export function truncatePrintContent(content: string): string {
  const finalContent: string[] = [];
  let cnt = 0;
  for (const line of content.split('\n')) {
    cnt += Math.ceil(line.length / MAX_LINE_WIDTH);
    if (cnt > MAX_LINES) break;
    finalContent.push(line);
  }
  return finalContent.join('\n');
}

function languageFromFilename(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'plaintext';
}

/** Build a self-contained HTML document for the popup print window. */
function buildPrintHtml(title: string, content: string, ownerLabel: string, headerRight: string): string {
  const ext = languageFromFilename(title);
  const safeContent = content.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
  return `<!DOCTYPE html>
<html>
<head>
  <title>Print Page</title>
  <style>
    body { font-family: ui-monospace, monospace; margin: 10px; font-size: 14px; line-height: 1.2; }
    .header { border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; }
    pre { margin: 0; white-space: pre-wrap !important; }
  </style>
</head>
<body>
  <div class="header">
    [${ownerLabel}] ${headerRight}
    <br />
    Filename: ${title}
    <span style="float: right;">By Hydro</span>
  </div>
  <pre class="content"><code class="language-${ext}">${safeContent}</code></pre>
</body>
</html>`;
}

export function PrintKiosk({ tdoc, isAdmin, endpoint, pollIntervalMs = 5000 }: PrintKioskProps) {
  const t = useTranslate();
  const toast = useToast();
  const apiUrl = endpoint ?? (typeof window !== 'undefined' ? window.location.pathname : '');

  const [tasks, setTasks] = useState<PrintTask[]>([]);
  const [udict, setUdict] = useState<PrintUserDict>({});
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ file: File; text: string } | null>(null);
  const [printingTaskId, setPrintingTaskId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const fd = new URLSearchParams({ operation: 'get_print_task' });
      const resp = await request.post<{ tasks?: PrintTask[], udict?: PrintUserDict }>(apiUrl, fd);
      setTasks(resp?.tasks ?? []);
      setUdict(resp?.udict ?? {});
    } catch {
      // Silent on background poll — user-initiated surfaces via toast.
    }
  }, [apiUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Kiosk loop: while admin has kiosk mode on, keep allocating + printing.
   * Mirrors ui-default `pages/contest_print.page.tsx`: re-allocate every
   * `pollIntervalMs` and run the inline print job on each non-empty result.
   */
  useEffect(() => {
    if (!isKioskActive || !isAdmin) return undefined;
    let active = true;
    (async () => {
      while (active) {
        try {
          const fd = new URLSearchParams({ operation: 'allocate_print_task' });
          const resp = await request.post<{ task?: PrintTask, udoc?: any }>(apiUrl, fd);
          if (!resp?.task) {
            await new Promise((r) => setTimeout(r, pollIntervalMs));
          } else {
            await doPrint(resp.task, resp.udoc);
            await refresh();
          }
        } catch {
          await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
      }
    })();
    return () => {
      active = false;
    };
    // doPrint is defined below with the latest closure; safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKioskActive, isAdmin, apiUrl, pollIntervalMs]);

  const doPrint = async (task: PrintTask, udoc: any) => {
    setPrintingTaskId(task._id);
    try {
      const truncated = truncatePrintContent(task.content ?? '');
      const ownerLabel = udoc?.uname ?? String(task.owner);
      const headerRight = `${udoc?.school ?? ''} ${udoc?.displayName ?? ''}`.trim();
      const html = buildPrintHtml(task.title, truncated, ownerLabel, headerRight);
      const printWindow = typeof window !== 'undefined' ? window.open('', '_blank', 'width=800,height=600,popup=1') : null;
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // delay to let layout settle, like ui-default.
        await new Promise((r) => setTimeout(r, 500));
        // printWindow.print();
        // printWindow.close();
      }
      const fd = new URLSearchParams({
        operation: 'update_print_task',
        taskId: task._id,
        status: 'printed',
      });
      await request.post(apiUrl, fd);
      await refresh();
    } finally {
      setPrintingTaskId(null);
    }
  };

  const onReprint = async (task: PrintTask) => {
    try {
      const fd = new URLSearchParams({
        operation: 'update_print_task',
        taskId: task._id,
        status: 'pending',
      });
      await request.post(apiUrl, fd);
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Print task update failed');
    }
  };

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset input so picking the same file twice still fires onChange.
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    setPendingUpload({ file, text });
  };

  const onConfirmUpload = async () => {
    if (!pendingUpload) return;
    const { file } = pendingUpload;
    setPendingUpload(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('operation', 'print');
      await request.postFile(apiUrl, fd);
      // Match legacy behaviour: reload on success.
      if (typeof window !== 'undefined') window.location.reload();
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    }
  };

  const onCancelUpload = () => {
    setPendingUpload(null);
  };

  return (
    <div className={styles.shell} data-testid="print-kiosk">
      <header className={styles.header}>
        <h1 className={styles.title}>{tdoc?.title ?? 'Print Request'}</h1>
        <div className={styles.actions}>
          {isAdmin && (
            <Button
              variant="ghost"
              onClick={() => setIsKioskActive((v) => !v)}
              data-testid="btn-enable-kiosk"
            >
              {isKioskActive ? '关闭打印服务' : '启用打印服务'}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onPickFile}
            data-testid="btn-print-new"
            name="add_print_task"
          >
            打印新文件
          </Button>
        </div>
      </header>

      {isKioskActive && isAdmin && (
        <div className={styles.kioskBanner} data-testid="kiosk-banner">
          打印服务已启用，收到新任务将自动打印。
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        name="file"
        className={styles.fileInput}
        onChange={onFileChange}
      />

      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="print-task-table">
          <thead>
            <tr>
              <th>{t('Common.User')}</th>
              <th>标题</th>
              <th>时间</th>
              <th>状态</th>
              {isAdmin && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className={styles.empty} data-testid="print-empty">
                  暂无打印任务。
                </td>
              </tr>
            )}
            {tasks.map((task) => (
              <tr key={task._id} data-status={task.status}>
                <td>
                  <a href={`/user/${task.owner}`}>{udict[task.owner]?.uname ?? `#${task.owner}`}</a>
                </td>
                <td>{task.title}</td>
                <td>{new Date(parseInt(task._id.slice(0, 8), 16) * 1000).toLocaleString()}</td>
                <td>{task.status}</td>
                {isAdmin && (
                  <td>
                    <button
                      type="button"
                      className={styles.reprintBtn}
                      onClick={() => void onReprint(task)}
                      disabled={printingTaskId === task._id}
                      data-testid="btn-reprint"
                    >
                      重新打印
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!pendingUpload}
        title="确认打印这个文件吗？"
        confirmLabel={t('Common.Yes')}
        cancelLabel={t('Common.Cancel')}
        onConfirm={() => void onConfirmUpload()}
        onCancel={onCancelUpload}
      >
        {pendingUpload && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <strong>文件名：{pendingUpload.file.name}</strong>
            </div>
            <pre className={styles.preview}>
              <code className={`language-${languageFromFilename(pendingUpload.file.name)}`}>
                {truncatePrintContent(pendingUpload.text)}
              </code>
            </pre>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
