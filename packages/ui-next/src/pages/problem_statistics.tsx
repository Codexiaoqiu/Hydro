import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import { SubmissionScoreChart } from '../components/charts/SubmissionScoreChart';
import { SubmissionStatusChart } from '../components/charts/SubmissionStatusChart';
import { Link } from '../components/link';
import { Paginator } from '../components/primitives/Paginator';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { usePageData, useUserContext } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useBuildUrl } from '../hooks/use-build-url';
import { formatMemoryMB } from '../lib/memory';
import styles from './problem_statistics.module.css';

export interface Rsdoc { _id: string, uid: number, time?: number, memory?: number, status: number, lang: string, length: number }
export interface Args {
  rsdocs: Rsdoc[];
  page: number;
  pcount: number;
  rscount: number;
  sort: string;
  direction: 1 | -1;
  pdoc: { docId: number, pid?: string, owner: number, title?: string };
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  types: string[];
  udoc: { _id: number, uname: string };
}

const STATUS_OVERFLOW = new Set([STATUS.STATUS_TIME_LIMIT_EXCEEDED, STATUS.STATUS_MEMORY_LIMIT_EXCEEDED, STATUS.STATUS_OUTPUT_LIMIT_EXCEEDED]);

export default function ProblemStatistics() {
  const { args } = usePageData();
  const { rsdocs, page, pcount, sort, direction, pdoc, udict, types } = args;
  const buildUrl = useBuildUrl();
  const navigate = useNavigate();
  const user = useUserContext();

  const handleSortSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nextSort = String(formData.get('sort') || sort);
    const nextDirection = String(formData.get('direction') || direction);
    const url = buildUrl(
      'problem_statistics',
      { pid: String(pdoc.docId) },
      { sort: nextSort, direction: nextDirection, page: '1' },
    );
    navigate(url);
  };

  const statusCounts = rsdocs.reduce<Record<number, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const scores = rsdocs.map((r) => Math.min(100, Math.max(0, (r.time || 0) > 0 ? 100 : 0)));

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <section className={styles.chartRow}>
          <div className={styles.chartCell}>
            <h3>提交状态</h3>
            <SubmissionStatusChart counts={statusCounts} />
          </div>
          <div className={styles.chartCell}>
            <h3>分数分布</h3>
            <SubmissionScoreChart scores={scores} />
          </div>
        </section>

        <section className={styles.filterRow}>
          <form className={styles.filterForm} method="get" onSubmit={handleSortSubmit}>
            <label>
              排序:
              <select
                className={styles.sortSelect}
                name="sort"
                aria-label="sort"
                defaultValue={sort}
              >
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <input type="hidden" name="direction" value={direction} />
            <button type="submit" className={styles.submit}>搜索</button>
          </form>
        </section>

        <section className={styles.table}>
          {rsdocs.length === 0 ? (
            <p className={styles.empty} data-testid="empty-state">暂无任何提交</p>
          ) : (
            <table className={styles.tableEl}>
              <thead>
                <tr>
                  <th>状态</th>
                  <th>提交者</th>
                  <th>时间</th>
                  <th>内存</th>
                  <th>语言</th>
                  <th>代码</th>
                </tr>
              </thead>
              <tbody>
                {rsdocs.map((r) => (
                  <tr key={r._id}>
                    <td><Link href={buildUrl('record_detail', { rid: r._id })}>{STATUS_SHORT_TEXTS[r.status as STATUS]}</Link></td>
                    <td>{udict[r.uid]?.uname}</td>
                    <td>{r.time ? `${STATUS_OVERFLOW.has(r.status) ? '>=' : ''}${r.time}ms` : '-'}</td>
                    <td>{r.memory ? `${STATUS_OVERFLOW.has(r.status) ? '>=' : ''}${formatMemoryMB(r.memory)}` : '-'}</td>
                    <td>{r.lang}</td>
                    <td>{formatMemoryMB(r.length)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Paginator
            current={page}
            total={pcount}
            buildHref={(p) => buildUrl('problem_statistics', { pid: String(pdoc.docId) }, { page: String(p), sort, direction: String(direction) })}
          />
        </section>
      </main>
      <aside className={styles.side}>
        <ProblemSidebar
          context={{
            pdoc: { docId: pdoc.docId, pid: pdoc.pid, title: pdoc.title ?? '', owner: pdoc.owner },
            UserContext: user,
            buildUrl,
            discussionCount: 0,
            solutionCount: 0,
            tdoc: undefined,
          }}
          mode="normal"
        />
      </aside>
    </div>
  );
}
