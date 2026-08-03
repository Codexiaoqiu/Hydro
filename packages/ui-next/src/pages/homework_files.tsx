import { useRef, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { formatFileSize } from '../lib/format';
import { PERM } from '../lib/perm-constants';
import { hasPerm, own, type UserContextShape } from '../lib/perms';
import styles from './homework_files.module.css';

interface FileEntry {
  name: string;
  size: number;
}

interface Tdoc {
  docId: string;
  title?: string;
  owner?: number;
  maintainer?: number[];
}

export interface Args {
  tdoc?: Tdoc;
  files?: FileEntry[];
  urlForFile?: (name: string) => string;
  UserContext?: Record<string, unknown>;
}

export default function HomeworkFiles() {
  const { args } = usePageData();
  const tdoc = args?.tdoc;
  const [files, setFiles] = useState(args?.files ?? []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!tdoc) return <div className={styles.page}><p>作业不存在。</p></div>;

  const user = args.UserContext as UserContextShape | undefined;
  const canEdit = own(user, tdoc, PERM.PERM_EDIT_HOMEWORK_SELF)
    || hasPerm(user, PERM.PERM_EDIT_HOMEWORK);
  const url = (name: string) => args.urlForFile?.(name)
    ?? `/homework/${tdoc.docId}/file/public/${encodeURIComponent(name)}`;
  const toggleSelected = (name: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(list)) {
        const formData = new FormData();
        formData.set('operation', 'upload_file');
        formData.set('filename', file.name);
        formData.set('file', file);
        await request.postFile(`/homework/${tdoc.docId}/file`, formData);
        setFiles((current) => current.some((item) => item.name === file.name)
          ? current
          : [...current, { name: file.name, size: file.size }]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const remove = async (names: string[]) => {
    setBusy(true);
    setError(null);
    try {
      await request.post(`/homework/${tdoc.docId}/file`, {
        operation: 'delete_files',
        files: names,
      });
      setFiles((current) => current.filter((item) => !names.includes(item.name)));
      setSelected(new Set());
      setPendingDelete([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <header>
        <h1>作业文件{tdoc.title ? ` · ${tdoc.title}` : ''}</h1>
        {canEdit && (
          <>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              上传文件
            </Button>
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(event) => upload(event.currentTarget.files)}
            />
            <Button
              variant="danger"
              type="button"
              disabled={busy || selected.size === 0}
              onClick={() => setPendingDelete([...selected])}
            >
              删除所选文件
            </Button>
          </>
        )}
      </header>
      {error && (
        <div role="alert">
          <span>{error}</span>
          <Button type="button" variant="ghost" onClick={() => setError(null)}>
            忽略错误
          </Button>
        </div>
      )}
      {pendingDelete.length > 0 && (
        <div role="alert">
          <span>确认删除所选的 {pendingDelete.length} 个文件？</span>
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={() => remove(pendingDelete)}
          >
            确认删除
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPendingDelete([])}>
            取消
          </Button>
        </div>
      )}
      {files.length === 0 ? (
        <p className={styles.empty}>暂无文件。</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              {canEdit && <th>选择</th>}
              <th>文件名</th>
              <th>大小</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.name}>
                {canEdit && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`选择 ${file.name}`}
                      checked={selected.has(file.name)}
                      onChange={() => toggleSelected(file.name)}
                    />
                  </td>
                )}
                <td><a href={url(file.name)}>{file.name}</a></td>
                <td>{formatFileSize(file.size)}</td>
                <td>
                  <a href={url(file.name)} download={file.name}>下载</a>
                  {canEdit && (
                    <Button
                      variant="danger"
                      type="button"
                      disabled={busy}
                      onClick={() => setPendingDelete([file.name])}
                    >
                      删除
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
