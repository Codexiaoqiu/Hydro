import { useRef, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { formatFileSize } from '../lib/format';
import { PERM } from '../lib/perm-constants';
import { own } from '../lib/perms';
import styles from './homework_files.module.css';
interface FileEntry { name: string, size: number }
interface Tdoc { docId: string, title?: string, owner?: number, maintainer?: number[] }
interface Args { tdoc?: Tdoc, files?: FileEntry[], urlForFile?: (name: string) => string, UserContext?: Record<string, unknown> }
export default function HomeworkFiles() {
  const args = usePageData().args as unknown as Args; const tdoc = args?.tdoc; const [files, setFiles] = useState(args?.files ?? []); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const inputRef = useRef<HTMLInputElement>(null);
  if (!tdoc) return <div className={styles.page}><p>作业不存在。</p></div>;
  const canEdit = own(args.UserContext as never, tdoc, PERM.PERM_EDIT_HOMEWORK_SELF) || !!(args.UserContext as { perm?: string } | undefined)?.perm;
  const url = (name: string) => args.urlForFile?.(name) ?? `/homework/${tdoc.docId}/file/public/${encodeURIComponent(name)}`;
  const upload = async (list: FileList | null) => { if (!list?.length) return; setBusy(true); setError(null); try { for (const file of Array.from(list)) { const fd = new FormData(); fd.set('operation', 'upload_file'); fd.set('filename', file.name); fd.set('file', file); await request.postFile(`/homework/${tdoc.docId}/file`, fd); setFiles((x) => x.some((f) => f.name === file.name) ? x : [...x, { name: file.name, size: file.size }]); } } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); if (inputRef.current)inputRef.current.value = ''; } };
  const remove = async (name: string) => { setBusy(true); try { await request.post(`/homework/${tdoc.docId}/file`, { operation: 'delete_files', files: [name] }); setFiles((x) => x.filter((f) => f.name !== name)); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  return <div className={styles.page}><header><h1>作业文件{tdoc.title ? ` · ${tdoc.title}` : ''}</h1>{canEdit && <><Button variant="primary" disabled={busy} onClick={() => inputRef.current?.click()}>上传文件</Button><input ref={inputRef} type="file" hidden onChange={(e) => upload(e.currentTarget.files)} /></>}</header>{error && <div role="alert">{error}</div>}{files.length === 0 ? <p className={styles.empty}>暂无文件。</p> : <table className={styles.table}><thead><tr><th>文件名</th><th>大小</th><th>操作</th></tr></thead><tbody>{files.map((f) => <tr key={f.name}><td><a href={url(f.name)}>{f.name}</a></td><td>{formatFileSize(f.size)}</td><td><a href={url(f.name)} download={f.name}>下载</a>{canEdit && <Button variant="danger" type="button" disabled={busy} onClick={() => { if (window.confirm('确认删除该文件?'))remove(f.name); }}>删除</Button>}</td></tr>)}</tbody></table>}</div>;
}
