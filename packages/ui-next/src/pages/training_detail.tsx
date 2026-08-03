import { useState } from 'react';
import { Link } from '../components/link';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { request } from '../hooks/use-api';
import { own } from '../lib/perms';
import styles from './training_detail.module.css';

interface DagNode {
  _id: number;
  title: string;
  requireNids?: number[];
  pids: number[];
  content?: string;
}

interface Tdoc {
  _id?: string;
  docId: string;
  title: string;
  content?: string;
  description?: string;
  dag: DagNode[];
  attend?: number;
  owner?: number;
  maintainer?: number[];
}

interface Tsdoc {
  _id?: string;
  docId?: string;
  enroll?: 0 | 1;
  done?: boolean;
  donePids?: string[];
  doneNids?: number[];
}

interface Nsdoc {
  progress: number;
  isDone: boolean;
  isProgress: boolean;
  isOpen: boolean;
  isInvalid: boolean;
}

interface Pdoc {
  docId: number;
  pid?: string;
  title?: string;
  hidden?: boolean;
  nSubmit?: number;
  nAccept?: number;
  difficulty?: number;
}

interface Psdoc {
  rid?: string | null;
  status?: number;
  star?: string | string[];
}

interface Udoc {
  _id: number;
  uname?: string;
  displayName?: string;
  avatar?: string;
}

interface Args {
  tdoc?: Tdoc;
  tsdoc?: Tsdoc;
  ndict?: Record<string, DagNode>;
  nsdict?: Record<string, Nsdoc>;
  pdict?: Record<string, Pdoc>;
  psdict?: Record<string, Psdoc>;
  udoc?: Udoc;
  udict?: Record<string, Udoc>;
  pids?: number[];
  missing?: number[];
  selfPsdict?: Record<string, Psdoc>;
  UserContext?: { _id?: number, priv?: number, hasPerm?: (b: bigint) => boolean };
}

function statusLabel(node: Nsdoc): string {
  if (node.isDone) return '已完成';
  if (node.isProgress) return '进行中';
  if (node.isOpen) return '可挑战';
  return '未解锁';
}

function statusClass(node: Nsdoc): string {
  if (node.isDone) return styles.statusDone;
  if (node.isProgress) return styles.statusProgress;
  if (node.isOpen) return styles.statusOpen;
  return styles.statusInvalid;
}

export default function TrainingDetail() {
  const args = usePageData().args as unknown as Args;
  const tdoc = args?.tdoc;
  const tsdoc = args?.tsdoc;
  const ndict = args?.ndict ?? {};
  const nsdict = args?.nsdict ?? {};
  const pdict = args?.pdict ?? {};
  const udoc = args?.udoc;
  const missing = args?.missing ?? [];
  const user = args?.UserContext as
    { _id?: number, priv?: number, hasPerm?: (b: bigint) => boolean } | undefined;
  const isLoggedIn = !!user?._id;
  const isEnrolled = !!tsdoc?.enroll;
  const buildUrl = useBuildUrl();
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  if (!tdoc) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>训练计划不存在。</div>
      </div>
    );
  }

  const canEdit = !!(
    (user?._id && own(user as never, tdoc, 1n << 49n))
    || user?.hasPerm?.(1n << 48n)
  );

  const enroll = async () => {
    if (!tdoc || enrolling) return;
    setEnrollError(null);
    setEnrolling(true);
    try {
      await request.post(`/training/${tdoc.docId}`, { operation: 'enroll' });
      if (typeof window !== 'undefined') {
        window.location.href = `/training/${tdoc.docId}`;
      }
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : String(err));
      setEnrolling(false);
    }
  };

  const totalPids = tdoc.dag.reduce(
    (acc, node) => acc + new Set(node.pids || []).size,
    0,
  );
  const completedPids = new Set((tsdoc?.donePids ?? []).map((p) => Number(p))).size;
  const progressPct = totalPids > 0
    ? Math.round((completedPids / totalPids) * 100)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <main className={styles.main}>
          <Card variant="default" header={<h1 className={styles.title}>{tdoc.title}</h1>}>
            {tdoc.content && (
              <div className={styles.content}>{tdoc.content}</div>
            )}
            {tdoc.description && (
              <div className={styles.description}>{tdoc.description}</div>
            )}

            {missing.length > 0 && (
              <div className={styles.warn} role="alert" data-testid="missing-warning">
                部分题目缺失或你无权访问：{missing.join('、')}
              </div>
            )}

            {!isLoggedIn ? (
              <div className={styles.note}>
                登录后即可加入训练计划。
              </div>
            ) : !isEnrolled ? (
              <div className={styles.note}>
                你还没有加入此训练计划。
              </div>
            ) : null}

            {enrollError ? (
              <div className={styles.error} role="alert" data-testid="enroll-error">
                {enrollError}
              </div>
            ) : null}
          </Card>

          <div className={styles.dag}>
            {tdoc.dag.map((node) => {
              const ns = nsdict[String(node._id)] ?? {
                progress: 0, isDone: false, isProgress: false, isOpen: false, isInvalid: true,
              };
              const locked = ns.isInvalid;
              return (
                <section
                  key={node._id}
                  className={`${styles.node} ${locked ? styles.nodeLocked : ''}`}
                  data-node-id={node._id}
                  data-node-state={
                    ns.isDone ? 'done'
                      : ns.isProgress ? 'progress'
                        : ns.isOpen ? 'open'
                          : 'invalid'
                  }
                >
                  <header className={styles.nodeHeader}>
                    <div>
                      <h2 className={styles.nodeTitle}>
                        章节 {node._id}. {node.title.split('\n')[0]}
                      </h2>
                      {node.title.split('\n')[1] && (
                        <p className={styles.nodeSubtitle}>{node.title.split('\n')[1]}</p>
                      )}
                    </div>
                    <div className={`${styles.status} ${statusClass(ns)}`}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      {statusLabel(ns)}
                    </div>
                  </header>

                  {locked ? (
                    <div className={styles.lockedMsg}>
                      本章节当前无法挑战，请先完成依赖章节：
                      <ul>
                        {(node.requireNids || []).map((nid) => {
                          const dn = ndict[String(nid)];
                          const dns = nsdict[String(nid)];
                          return (
                            <li key={nid}>
                              章节 {nid}. {dn?.title?.split('\n')[0] ?? nid}
                              {dns ? ` (完成 ${dns.progress}%)` : ''}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {node.content ? (
                    <div className={styles.nodeContent}>{node.content}</div>
                  ) : null}

                  <table className={styles.problemTable}>
                    <thead>
                      <tr>
                        <th className={styles.colName}>题目</th>
                        <th className={styles.colTried}>提交</th>
                        <th className={styles.colAc}>通过</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(node.pids || []).map((pid) => {
                        const pdoc = pdict[String(pid)] || pdict[pid as unknown as string];
                        const invalid = locked || !isEnrolled;
                        const title = pdoc?.title ?? `题目 #${pid}`;
                        const displayPid = pdoc?.pid || String(pid);
                        return (
                          <tr key={pid} data-pid={pid}>
                            <td className={styles.colName}>
                              {invalid || !pdoc ? (
                                <span className={styles.problemNameLocked}>{title}</span>
                              ) : (
                                <Link
                                  to="problem_detail"
                                  params={{ pid: pdoc.pid || String(pdoc.docId) }}
                                  className={styles.problemName}
                                >
                                  <span className={styles.problemPid}>{displayPid}</span>
                                  {pdoc.title ?? title}
                                </Link>
                              )}
                            </td>
                            <td className={styles.colTried}>{pdoc?.nSubmit ?? 0}</td>
                            <td className={styles.colAc}>{pdoc?.nAccept ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>
        </main>

        <aside className={styles.side}>
          <Card variant="side">
            <ol className={styles.menu}>
              {!isEnrolled && isLoggedIn && (
                <li className={styles.menuItem}>
                  <form action="" method="post" onSubmit={(e) => { e.preventDefault(); enroll(); }}>
                    <input type="hidden" name="operation" value="enroll" />
                    <button
                      type="submit"
                      className={styles.menuLink}
                      disabled={enrolling}
                      data-testid="enroll-button"
                    >
                      <span aria-hidden>＋</span> {enrolling ? '加入中…' : '加入训练计划'}
                    </button>
                  </form>
                </li>
              )}
              {canEdit && (
                <>
                  <li className={styles.menuItem}>
                    <Link to="training_edit" params={{ tid: tdoc.docId }} className={styles.menuLink}>
                      <span aria-hidden>✎</span> 编辑
                    </Link>
                  </li>
                  <li className={styles.menuItem}>
                    <Link to="training_files" params={{ tid: tdoc.docId }} className={styles.menuLink}>
                      <span aria-hidden>📎</span> 文件
                    </Link>
                  </li>
                </>
              )}
              <li className={styles.menuItem}>
                <a href={buildUrl('wiki_help', {}, { anchor: 'training' })} className={styles.menuLink}>
                  <span aria-hidden>?</span> 帮助
                </a>
              </li>
            </ol>
          </Card>

          <Card variant="side">
            <h2 className={styles.sideTitle}>状态</h2>
            <dl className={styles.statusList}>
              {isLoggedIn ? (
                <>
                  <dt>状态</dt>
                  <dd>
                    {isEnrolled
                      ? (tsdoc?.done ? '已完成' : '进行中')
                      : '未加入'}
                  </dd>
                  {isEnrolled && (
                    <>
                      <dt>进度</dt>
                      <dd>完成 {progressPct}%</dd>
                    </>
                  )}
                </>
              ) : null}
              <dt>参与人数</dt>
              <dd>{tdoc.attend ?? 0}</dd>
              <dt>创建者</dt>
              <dd>{udoc?.uname ?? `#${tdoc.owner}`}</dd>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}
