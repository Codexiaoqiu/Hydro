import { useState } from 'react';
import { Link } from '../components/link';
import { Card } from '../components/primitives/Card';
import { Paginator } from '../components/primitives/Paginator';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { useBuildUrl } from '../hooks/use-build-url';
import { PERM } from '../lib/perm-constants';
import { own } from '../lib/perms';
import styles from './homework_detail.module.css';

interface Tdoc { docId: string, title: string, content?: string, pids?: number[], owner?: number, maintainer?: number[], attend?: number, beginAt?: string, endAt?: string, penaltySince?: string }
interface Pdoc { docId?: number, pid?: string, title?: string }
interface Ddoc { _id?: string, docId?: string, title?: string, content?: string, owner?: number, nReply?: number, updateAt?: string | number }
interface Udoc { _id: number, uname?: string }
interface Args { tdoc?: Tdoc, tsdoc?: { attend?: number, startAt?: string }, udict?: Record<string, Udoc>, ddocs?: Ddoc[], page?: number, dpcount?: number, dcount?: number, pdict?: Record<string, Pdoc>, psdict?: Record<string, unknown>, rdict?: Record<string, unknown>, UserContext?: Record<string, unknown> }

export default function HomeworkDetail() {
  const args = usePageData().args as unknown as Args;
  const tdoc = args?.tdoc;
  const buildUrl = useBuildUrl();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!tdoc) return <div className={styles.page}><div className={styles.empty}>作业不存在。</div></div>;
  const user = args.UserContext as never;
  const canEdit = own(user, tdoc, PERM.PERM_EDIT_HOMEWORK_SELF) || ((args.UserContext as { perm?: string } | undefined)?.perm ?? '').includes('BigInt');
  const canAttend = !!args.UserContext?._id && !args.tsdoc?.attend;
  const attend = async () => { setBusy(true); setError(null); try { await request.post(`/homework/${tdoc.docId}`, { operation: 'attend' }); window.location.reload(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); } };
  const ddocs = args.ddocs ?? [];
  const pdict = args.pdict ?? {};
  return <div className={styles.page}><div className={styles.layout}><main className={styles.main}><Card header={<h1 className={styles.title}>{tdoc.title}</h1>}><div className={styles.content} dangerouslySetInnerHTML={{ __html: tdoc.content ?? '' }} /></Card><Card><h2>题目</h2>{Object.keys(pdict).length === 0 ? <p className={styles.empty}>题目列表暂不可见。</p> : <ol className={styles.problems}>{(tdoc.pids ?? []).map((pid) => { const p = pdict[String(pid)] ?? pdict[pid as unknown as string]; return <li key={pid}>{p ? <Link to="problem_detail" params={{ pid: String(p.docId ?? pid) }}>{p.pid ? `${p.pid} ` : ''}{p.title ?? `题目 #${pid}`}</Link> : `题目 #${pid}`}</li>; })}</ol>}</Card><Card><h2>讨论 ({args.dcount ?? ddocs.length})</h2>{ddocs.length === 0 ? <p className={styles.empty}>暂无讨论。</p> : <ol className={styles.discussions}>{ddocs.map((d) => <li key={d._id ?? d.docId}><Link to="discussion_detail" params={{ did: String(d.docId ?? d._id) }}>{d.title ?? d.content}</Link>{d.owner != null && <small> · {args.udict?.[String(d.owner)]?.uname ?? `#${d.owner}`}</small>}</li>)}</ol>}<Paginator current={args.page ?? 1} total={args.dpcount ?? 0} buildHref={(p) => buildUrl('homework_detail', { tid: tdoc.docId }, { page: String(p) })} /></Card></main><aside className={styles.side}>{error && <div role="alert">{error}</div>}{canAttend && <button type="button" onClick={attend} disabled={busy} data-testid="attend">{busy ? '提交中…' : '参加作业'}</button>}{canEdit && <><Link to="homework_edit" params={{ tid: tdoc.docId }}>编辑</Link><Link to="homework_files" params={{ tid: tdoc.docId }}>文件</Link></>}</aside></div></div>;
}
