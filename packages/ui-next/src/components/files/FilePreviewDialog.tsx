import {
  type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef,
} from 'react';
import { useTranslate } from '../../lib/i18n';
import { Button } from '../primitives/Button';
import { Modal } from '../primitives/Modal';
import { useToast } from '../primitives/Toast';
import { MonacoEditor } from '../problem/MonacoEditor';
import styles from './FilePreviewDialog.module.css';

export type PreviewKind = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'download';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico']);
// `ogg` is intentionally treated as video to match ui-default's preview.page.ts.
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'mkv']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'flac', 'aac', 'm4a', 'oga']);
const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'xz', 'bz2']);

/** Files larger than this can't be previewed inline and fall back to download. */
const MAX_PREVIEW_SIZE = 8 * 1024 * 1024;

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot < 0 ? '' : filename.slice(dot + 1).toLowerCase();
}

/**
 * Classifies a file into a preview strategy from its name (and optional size).
 * Archives and oversized files are `download`-only; everything unrecognised
 * defaults to `text` so source / data files open in the editor.
 */
export function previewKind(filename: string, size = 0): PreviewKind {
  const ext = extOf(filename);
  if (ARCHIVE_EXTS.has(ext) || size > MAX_PREVIEW_SIZE) return 'download';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  return 'text';
}

function editorLanguage(filename: string): string {
  const ext = extOf(filename);
  if (['yaml', 'yml'].includes(ext)) return 'yaml';
  if (['c', 'cc', 'cpp', 'h', 'hpp', 'cxx'].includes(ext)) return 'cpp';
  if (ext === 'json') return 'json';
  if (ext === 'py') return 'python';
  return 'plaintext';
}

export interface FilePreviewDialogProps {
  open: boolean;
  /** Name shown in the header and used for the `file://` reference link. */
  filename: string;
  /** URL the file is fetched from (also the download target). */
  url: string;
  /** Endpoint for the `upload_file` operation when saving edited text. Defaults to `url`. */
  uploadUrl?: string;
  /** File category passed as `type` in the upload FormData. */
  type?: string;
  size?: number;
  /** When true the Save button is hidden and edits are inert. Used when the
   *  current viewer lacks edit permission (e.g. cross-domain references). */
  readOnly?: boolean;
  onClose: () => void;
  /** Called after an edited text file is saved back via `upload_file`. */
  onSaved?: () => void;
}

interface PreviewState {
  value: string;
  objectUrl: string | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}
type PreviewAction =
  | { type: 'reset' }
  | { type: 'loaded-text', text: string }
  | { type: 'loaded-blob', url: string }
  | { type: 'loading-done' }
  | { type: 'error', message: string }
  | { type: 'saving' }
  | { type: 'saved' }
  | { type: 'save-failed', message: string };

const INITIAL_PREVIEW_STATE: PreviewState = {
  value: '', objectUrl: null, loading: false, error: null, saving: false,
};

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'reset':
      return { ...INITIAL_PREVIEW_STATE, loading: true };
    case 'loaded-text':
      return { ...state, value: action.text, loading: false, error: null };
    case 'loaded-blob':
      return { ...state, objectUrl: action.url, loading: false, error: null };
    case 'loading-done':
      return { ...state, loading: false };
    case 'error':
      return { ...state, error: action.message, loading: false };
    case 'saving':
      return { ...state, saving: true, error: null };
    case 'saved':
      return { ...state, saving: false };
    case 'save-failed':
      return { ...state, saving: false, error: action.message };
    default:
      return state;
  }
}

export function FilePreviewDialog({
  open, filename, url, uploadUrl, type, size = 0, readOnly, onClose, onSaved,
}: FilePreviewDialogProps) {
  const t = useTranslate();
  const toast = useToast();
  const kind = useMemo(() => previewKind(filename, size), [filename, size]);

  const [state, dispatch] = useReducer(previewReducer, INITIAL_PREVIEW_STATE);
  const { value, objectUrl, loading, error, saving } = state;

  // Object URLs created during this component's lifetime, tracked in a ref so
  // they can be revoked even after the component has been unmounted (when
  // the `objectUrl` state is gone). Without this, an unmount that races with
  // an in-flight blob response leaks the URL forever — see I3.
  const urlHolderRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || kind === 'download') return undefined;
    const controller = new AbortController();
    let disposed = false;
    dispatch({ type: 'reset' });
    urlHolderRef.current = null;
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (kind === 'text') {
          const text = await res.text();
          if (!disposed) dispatch({ type: 'loaded-text', text });
          else dispatch({ type: 'loading-done' });
        } else {
          const blob = await res.blob();
          if (disposed) {
            // Effect torn down between await and now: revoke immediately
            // so we don't leak (I3).
            const tmp = URL.createObjectURL(blob);
            URL.revokeObjectURL(tmp);
            return;
          }
          const created = URL.createObjectURL(blob);
          urlHolderRef.current = created;
          dispatch({ type: 'loaded-blob', url: created });
        }
      } catch (e) {
        if (!disposed && (e as Error).name !== 'AbortError') {
          dispatch({ type: 'error', message: (e as Error).message || String(e) });
        } else if (!disposed) {
          dispatch({ type: 'loading-done' });
        }
      }
    })();
    return () => {
      disposed = true;
      controller.abort();
      const held = urlHolderRef.current;
      urlHolderRef.current = null;
      if (held) URL.revokeObjectURL(held);
    };
  }, [open, kind, url, filename]);

  const copyLink = useCallback(async () => {
    const link = `file://${filename}`;
    try {
      await navigator.clipboard?.writeText(link);
      toast.success(t('FilePreview.LinkCopied'));
    } catch (e) {
      toast.error(t('FilePreview.CopyError', { message: (e as Error).message || String(e) }));
    }
  }, [filename, t, toast]);

  const download = useCallback(() => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [url, filename]);

  const save = useCallback(async () => {
    dispatch({ type: 'saving' });
    try {
      const file = new File([value], filename, { type: 'text/plain' });
      const fd = new FormData();
      fd.append('operation', 'upload_file');
      fd.append('type', type ?? '');
      fd.append('filename', filename);
      fd.append('file', file);
      // credentials:'same-origin' so the upload_file operation gets the
      // session cookie; the upload endpoint sits on the same origin.
      const res = await fetch(uploadUrl ?? url, {
        method: 'POST', body: fd, credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      dispatch({ type: 'saved' });
      onSaved?.();
      onClose();
    } catch (e) {
      dispatch({ type: 'save-failed', message: t('FilePreview.SaveError', { message: (e as Error).message || String(e) }) });
    }
  }, [value, filename, type, uploadUrl, url, onSaved, onClose, t]);

  const footer = (
    <div className={styles.footer}>
      <Button variant="ghost" onClick={copyLink}>{t('FilePreview.CopyLink')}</Button>
      <Button variant="ghost" onClick={download}>{t('FilePreview.Download')}</Button>
      {kind === 'text' && !readOnly && (
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? t('FilePreview.Saving') : t('FilePreview.Save')}
        </Button>
      )}
    </div>
  );

  let content: ReactNode = null;
  if (kind === 'download') {
    content = <p className={styles.status}>{t('FilePreview.CannotPreview')}</p>;
  } else if (loading) {
    content = <p className={styles.status}>{t('FilePreview.Loading')}</p>;
  } else if (kind === 'text') {
    content = (
      <MonacoEditor
        value={value}
        onChange={(v) => dispatch({ type: 'loaded-text', text: v })}
        language={editorLanguage(filename)}
        readOnly={readOnly}
        aria-label={filename}
      />
    );
  } else if (kind === 'image' && objectUrl) {
    content = <img className={styles.media} src={objectUrl} alt={filename} />;
  } else if (kind === 'video' && objectUrl) {
    content = <video className={styles.media} src={objectUrl} controls />;
  } else if (kind === 'audio' && objectUrl) {
    content = <audio className={styles.audio} src={objectUrl} controls />;
  } else if (kind === 'pdf' && objectUrl) {
    content = <embed className={styles.embed} src={objectUrl} type="application/pdf" />;
  }

  return (
    <Modal open={open} onClose={onClose} title={filename} width={860} footer={footer}>
      <div className={styles.body}>
        {error && <p className={styles.error}>{error}</p>}
        {content}
      </div>
    </Modal>
  );
}
