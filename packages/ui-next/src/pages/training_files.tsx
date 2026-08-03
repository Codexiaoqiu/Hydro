import { useRef, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { formatFileSize } from '../lib/format';
import { own } from '../lib/perms';
import styles from './training_files.module.css';

// Response body from `TrainingFilesHandler.get`
// (packages/hydrooj/src/handler/training.ts:237-259).
// - `files` is sorted via `sortFiles(tdoc.files)` (filename ascending).
// - `urlForFile(name)` returns the download route URL the same way the
//   handler injects it (a function from `this.url('training_file_download', ...)`).
// - `tdoc` carries the training docId for the download route.
// - `tsdoc` is the per-user status doc; we don't need to read it for the
//   file-management surface but keep the field for parity.
interface FileEntry {
  _id?: string;
  name: string;
  size: number;
  lastModified?: string | number | Date;
  etag?: string;
}

interface Tdoc {
  docId: string;
  title?: string;
  owner?: number;
  maintainer?: number[];
}

interface Args {
  tdoc?: Tdoc;
  files?: FileEntry[];
  urlForFile?: (filename: string) => string;
  UserContext?: { _id?: number };
}

export default function TrainingFiles() {
  const pageData = usePageData() as unknown as { args: Args };
  const args = pageData.args ?? ({} as Args);
  const tdoc = args.tdoc;
  const initialUrlForFile = args.urlForFile ?? ((name: string) => `/training/${tdoc?.docId}/file/${encodeURIComponent(name)}`);
  const [files, setFiles] = useState<FileEntry[]>(args.files ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mirrors ui-default: only the owner (with PERM_EDIT_TRAINING_SELF) or a
  // user with PERM_EDIT_TRAINING can mutate files. We check both gates.
  const canEdit = !!tdoc && !!(
    (args.UserContext?._id && own(args.UserContext as never, tdoc, 1n << 49n))
    || (args.UserContext as { hasPerm?: (b: bigint) => boolean } | undefined)?.hasPerm?.(1n << 48n)
  );

  const upload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        const form = new FormData();
        form.set('operation', 'upload_file');
        form.set('filename', file.name);
        form.set('file', file);
        await request.postFile(`/training/${tdoc?.docId}/file`, form);
        setFiles((current) => current.some((entry) => entry.name === file.name)
          ? current
          : [...current, { _id: file.name, name: file.name, size: file.size }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (targets: string[]) => {
    setBusy(true);
    setError(null);
    try {
      await request.post(`/training/${tdoc?.docId}/file`, { operation: 'delete_files', files: targets });
      setFiles((current) => current.filter((file) => !targets.includes(file.name)));
      setSelected((current) => new Set([...current].filter((name) => !targets.includes(name))));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleSelected = (name: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const allSelected = files.length > 0 && selected.size === files.length;

  if (!tdoc) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>训练计划不存在。</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <a href={`/training/${tdoc.docId}`} className={styles.backLink}>
            ← 返回训练详情
          </a>
          <h1 className={styles.title}>训练文件 {tdoc.title ? `· ${tdoc.title}` : ''}</h1>
          <p className={styles.subtitle}>
            上传训练计划附加资料(讲义、PDF 等)。
          </p>
        </div>
        {canEdit && (
          <div className={styles.tools}>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? '处理中…' : '上传文件'}
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              disabled={busy}
              aria-label="选择要上传的文件"
              onChange={(event) => upload(event.currentTarget.files)}
            />
          </div>
        )}
      </header>

      {error ? (
        <div className={styles.alert} role="alert" data-testid="files-error">
          <span>{error}</span>
          <Button variant="ghost" type="button" onClick={() => setError(null)} aria-label="忽略错误">
            忽略
          </Button>
        </div>
      ) : null}

      <section className={styles.tableWrap}>
        {files.length === 0 ? (
          <p className={styles.empty}>暂无文件。</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {canEdit && (
                  <th className={styles.colCheckbox}>
                    <input
                      type="checkbox"
                      aria-label="全选"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(files.map((f) => f.name)))}
                    />
                  </th>
                )}
                <th className={styles.colName}>文件名</th>
                <th className={styles.colSize}>大小</th>
                <th className={styles.colOp}>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const href = initialUrlForFile(file.name);
                return (
                  <tr key={file.name} data-filename={file.name} data-size={file.size}>
                    {canEdit && (
                      <td className={styles.colCheckbox}>
                        <input
                          type="checkbox"
                          aria-label={`选择 ${file.name}`}
                          checked={selected.has(file.name)}
                          onChange={() => toggleSelected(file.name)}
                        />
                      </td>
                    )}
                    <td className={styles.colName}>
                      <a href={href}>{file.name}</a>
                    </td>
                    <td className={styles.colSize}>{formatFileSize(file.size)}</td>
                    <td className={styles.colOp}>
                      <a href={href} download={file.name} aria-label={`下载 ${file.name}`}>下载</a>
                      {canEdit && (
                        <>
                          {' '}
                          <Button
                            variant="danger"
                            type="button"
                            disabled={busy}
                            aria-label={`删除 ${file.name}`}
                            onClick={() => {
                              // eslint-disable-next-line no-alert
                              if (window.confirm('确认删除该文件?')) remove([file.name]);
                            }}
                          >
                            删除
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {canEdit && files.length > 0 && (
        <div className={styles.footer}>
          <Button
            variant="ghost"
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => {
              // eslint-disable-next-line no-alert
              if (window.confirm('确认删除所选文件?')) remove([...selected]);
            }}
          >
            删除所选
          </Button>
        </div>
      )}
    </div>
  );
}
