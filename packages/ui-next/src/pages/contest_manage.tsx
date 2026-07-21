import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { Link } from '../components/link';
import { useToast } from '../components/primitives/Toast';
import { request } from '../hooks/use-api';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import type { SerializedPdoc, SerializedTdoc } from '../sections/types';
import styles from './contest_manage.module.css';

export type ContestManagePageArgs = {
  tdoc?: SerializedTdoc & { owner?: number; score?: Record<string, number> };
  pdict?: Record<string, SerializedPdoc>;
  files?: Array<{ name: string; size: number }>;
  privateFiles?: Array<{ name: string; size: number }>;
};

export type ContestManagePageProps = {
  _pageData?: { name: string; template: string; url: string; args?: ContestManagePageArgs };
};

const DEFAULT_SCORE = 100;

export default function ContestManagePage({ _pageData }: ContestManagePageProps = {}) {
  const t = useTranslate();
  const toast = useToast();
  const ctxPageData = usePageData() as { args?: ContestManagePageArgs } | null;
  const pageData = _pageData ?? ctxPageData;
  const args = pageData?.args;
  const tdoc = args?.tdoc;
  const pdict = args?.pdict ?? {};

  if (!args || !tdoc) {
    return (
      <div className={styles.page} data-page="contest_manage">
        <p className={styles.empty}>{t('Common.Loading')}</p>
      </div>
    );
  }

  const pids = tdoc.pids ?? [];
  const scoreMap: Record<string, number> = { ...(tdoc.score ?? {}) };
  pids.forEach((pid) => {
    if (scoreMap[String(pid)] == null) scoreMap[String(pid)] = DEFAULT_SCORE;
  });

  return (
    <div className={styles.page} data-page="contest_manage">
      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('ContestManage.ScoreSection')}</h2>
            <div className={styles.sectionBody}>
              <table className={styles.scoreTable}>
                <colgroup>
                  <col className={styles.colId} />
                  <col className={styles.colProblem} />
                  <col className={styles.colScore} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={styles.colId}>{t('Common.ID')}</th>
                    <th className={styles.colProblem}>{t('Common.Problems')}</th>
                    <th className={styles.colScore}>{t('Common.Score')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pids.length === 0 ? (
                    <tr>
                      <td colSpan={3} className={styles.empty}>
                        {t('ContestManage.NoProblems')}
                      </td>
                    </tr>
                  ) : (
                    pids.map((pid) => {
                      const pdoc = pdict[String(pid)];
                      const currentScore = scoreMap[String(pid)];
                      return (
                        <ScoreRow
                          key={pid}
                          pid={pid}
                          title={pdoc?.title}
                          initialScore={currentScore}
                          onSaved={(next) => { scoreMap[String(pid)] = next; }}
                          onError={(msg) => toast.error(msg)}
                          onSuccess={(msg) => toast.success(msg)}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <FilePanel
            title={t('ContestManage.PublicFiles')}
            type="public"
            files={args.files ?? []}
          />
          <FilePanel
            title={t('ContestManage.PrivateFiles')}
            type="private"
            files={args.privateFiles ?? []}
          />
        </main>

        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>{tdoc.title}</h3>
          <p className={styles.sidebarMeta}>{t('ContestManage.ManageHint')}</p>
        </aside>
      </div>
    </div>
  );
}

interface ScoreRowProps {
  pid: number;
  title?: string;
  initialScore: number;
  onSaved: (next: number) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

function ScoreRow({ pid, title, initialScore, onSaved, onError, onSuccess }: ScoreRowProps) {
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialScore);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const submit = useCallback(async () => {
    const value = Number(draft);
    if (!Number.isFinite(value) || value <= 0) {
      onError(t('ContestManage.InvalidScore'));
      return;
    }
    setPending(true);
    try {
      await request.post(window.location.pathname, { operation: 'set_score', pid, score: value });
      onSaved(value);
      onSuccess(t('ContestManage.ScoreUpdated'));
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      onError(msg);
    } finally {
      setPending(false);
    }
  }, [draft, pid, t, onSaved, onError, onSuccess]);

  return (
    <tr>
      <td className={styles.colId}>{pid}</td>
      <td className={styles.colProblem}>
        {title ? (
          <Link to="problem_detail" params={{ pid: String(pid) }}>
            {title}
          </Link>
        ) : (
          <span>Problem #{pid}</span>
        )}
      </td>
      <td className={styles.colScore}>
        <button
          type="button"
          className={styles.scoreBtn}
          data-pid={pid}
          data-score={initialScore}
          onClick={() => { setDraft(initialScore); setOpen(true); }}
          title={t('ContestManage.SetScoreTitle')}
        >
          {initialScore}
        </button>
        {open && (
          <div className={styles.dialog} role="dialog" aria-modal="true">
            <div className={styles.dialogBackdrop} onClick={() => !pending && setOpen(false)} />
            <div className={styles.dialogBody}>
              <h3 className={styles.dialogTitle}>{t('ContestManage.SetScoreTitle')}</h3>
              <label className={styles.dialogLabel}>
                {t('Common.Score')}
                <input
                  ref={inputRef}
                  type="number"
                  step="1"
                  min="1"
                  className={styles.dialogInput}
                  value={draft}
                  onChange={(e) => setDraft(Number(e.target.value))}
                  disabled={pending}
                />
              </label>
              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  {t('Common.Cancel')}
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={submit}
                  disabled={pending}
                >
                  {pending ? t('Common.Loading') : t('Common.Save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

interface FilePanelProps {
  title: string;
  type: 'public' | 'private';
  files: Array<{ name: string; size: number }>;
}

function FilePanel({ title, type, files }: FilePanelProps) {
  const t = useTranslate();
  const [busy, setBusy] = useState(false);

  const onUpload = useCallback(async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = ev.target.files;
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', type);
        await request.postFile(window.location.pathname, fd);
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }, [type]);

  const onRemove = useCallback(async (names: string[]) => {
    setBusy(true);
    try {
      await request.post(window.location.pathname, { operation: 'delete_files', files: names, type });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }, [type]);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <div className={styles.sectionTools}>
          <label className={styles.btnPrimary}>
            {busy ? t('Common.Loading') : t('ContestManage.UploadFile')}
            <input
              type="file"
              multiple
              className={styles.fileInput}
              onChange={onUpload}
              disabled={busy}
            />
          </label>
        </div>
      </div>
      <div className={styles.sectionBody}>
        {files.length === 0 ? (
          <p className={styles.empty}>{t('ContestManage.NoFiles')}</p>
        ) : (
          <ul className={styles.fileList}>
            {files.map((f) => (
              <li key={f.name} className={styles.fileItem}>
                <span className={styles.fileName}>{f.name}</span>
                <span className={styles.fileSize}>{(f.size / 1024).toFixed(1)} KB</span>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={() => onRemove([f.name])}
                  disabled={busy}
                >
                  {t('Common.Delete')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {files.length > 0 && (
          <button
            type="button"
            className={styles.btnDanger}
            onClick={() => onRemove(files.map((f) => f.name))}
            disabled={busy}
          >
            {t('ContestManage.RemoveSelected')}
          </button>
        )}
      </div>
    </section>
  );
}