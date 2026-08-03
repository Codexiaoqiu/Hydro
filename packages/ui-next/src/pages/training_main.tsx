import { useState } from 'react';
import { Link } from '../components/link';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { Paginator } from '../components/primitives/Paginator';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useBuildUrl } from '../hooks/use-build-url';
import { hasPerm } from '../lib/perms';
import styles from './training_main.module.css';

// Response shape from `TrainingMainHandler.get`
// (packages/hydrooj/src/handler/training.ts:60-95). `tsdict` and `tdict` are
// keyed by `tdoc.docId.toHexString()`. `nsdict` is not injected for this
// endpoint — progress is derived from `tsdict[docId].donePids.length` instead.
interface Tdoc {
  _id?: string;
  docId: string;
  title: string;
  content?: string;
  dag?: Array<{ _id: number, pids: number[] }>;
  attend?: number;
  pin?: number;
}

interface Tsdoc {
  _id?: string;
  docId?: string;
  enroll?: 0 | 1;
  done?: boolean;
  donePids?: string[];
  doneNids?: number[];
}

interface Args {
  tdocs?: Tdoc[];
  page?: number;
  tpcount?: number;
  tsdict?: Record<string, Tsdoc>;
  tdict?: Record<string, Tdoc>;
  q?: string;
  UserContext?: Record<string, unknown>;
}

function totalPids(tdoc: Tdoc | undefined): number {
  if (!tdoc?.dag?.length) return 0;
  const all = new Set<number>();
  for (const node of tdoc.dag) for (const pid of node.pids || []) all.add(pid);
  return all.size;
}

export default function TrainingMain() {
  const pageData = usePageData() as unknown as { args: Args };
  const { args } = pageData;
  const tdocs = args?.tdocs ?? [];
  const tsdict = args?.tsdict ?? {};
  const tdict = args?.tdict ?? {};
  const page = Math.max(1, args?.page ?? 1);
  const tpcount = Math.max(0, args?.tpcount ?? 0);
  const initialQuery = args?.q ?? '';
  const user = args?.UserContext as { _id?: number, priv?: number } | undefined;
  const isLoggedIn = !!user?._id;

  const [query, setQuery] = useState(initialQuery);
  const buildUrl = useBuildUrl();
  const navigate = useNavigate();

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params: Record<string, string> = {};
    const trimmed = query.trim();
    if (trimmed) params.q = trimmed;
    navigate(buildUrl('training_main', {}, params));
  };

  const buildPageHref = (p: number) => {
    const params: Record<string, string> = { page: String(p) };
    if (initialQuery) params.q = initialQuery;
    return buildUrl('training_main', {}, params);
  };

  // Mirrors ui-default's sidebar gate: only users with PERM_CREATE_TRAINING
  // see the "New Training Plan" entry point. PERM_CREATE_TRAINING is the
  // bit at 1n<<47 (packages/common/permission.ts:81). We compare the parsed
  // bitmask against the user perm string.
  const canCreate = hasPerm(user as never, 1n << 47n);

  return (
    <div className={styles.shell}>
      <main>
        <Card
          variant="default"
          header={
            <h1 className={styles.title}>
              {tpcount > 0
                ? `训练计划 (${tpcount})`
                : '训练计划'}
            </h1>
          }
        >
          <form className={styles.toolbar} onSubmit={submitSearch}>
            <label className={styles.search}>
              <span className={styles.searchIcon} aria-hidden="true">🔍</span>
              <input
                type="text"
                name="q"
                placeholder="搜索训练计划…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="搜索训练计划"
              />
            </label>
            <Button type="submit" variant="primary" aria-label="搜索">搜索</Button>
          </form>

          {tdocs.length === 0 ? (
            <div className={styles.empty} data-testid="training-empty">
              暂无训练计划。
            </div>
          ) : (
            <ol className={styles.list}>
              {tdocs.map((tdoc) => {
                const tid = tdoc.docId;
                const fullTdoc = tdict[tid] ?? tdoc;
                const ts = tsdict[tid];
                const problems = totalPids(fullTdoc);
                const sections = fullTdoc.dag?.length ?? 0;
                const doneCount = (ts?.donePids ?? []).length;
                const progress = problems > 0
                  ? Math.round((doneCount / problems) * 100)
                  : 0;
                const enrolled = !!ts?.enroll;
                const completed = !!ts?.done;
                return (
                  <li key={tid} className={styles.item} data-tid={tid}>
                    <div className={styles.attend}>
                      <div className={styles.attendNum}>
                        {fullTdoc.attend ?? 0}
                      </div>
                      <div className={styles.attendLabel}>已报名</div>
                    </div>
                    <div className={styles.body}>
                      <h2 className={styles.itemTitle}>
                        <Link to="training_detail" params={{ tid }} className={styles.titleLink}>
                          {fullTdoc.title}
                        </Link>
                      </h2>
                      {fullTdoc.content && (
                        <p className={styles.intro}>{fullTdoc.content}</p>
                      )}
                      <ul className={styles.meta}>
                        <li>
                          <span className={styles.metaIcon} aria-hidden>🚩</span>
                          {sections} 章节，{problems} 题目
                        </li>
                        <li>
                          {enrolled ? (
                            completed ? (
                              <>
                                <span className={styles.metaIcon} aria-hidden>✓</span>
                                已完成 100%
                              </>
                            ) : (
                              <>
                                <span className={styles.metaIcon} aria-hidden>◐</span>
                                进行中 {progress}%
                              </>
                            )
                          ) : isLoggedIn ? (
                            <>
                              <span className={styles.metaIcon} aria-hidden>○</span>
                              未报名
                            </>
                          ) : null}
                        </li>
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <Paginator current={page} total={tpcount} buildHref={buildPageHref} ariaLabel="训练分页" />
        </Card>
      </main>

      {canCreate ? (
        <aside className={styles.sidebar}>
          <Card variant="side">
            <h2 className={styles.sideTitle}>创建训练计划</h2>
            <Link to="training_create" className={styles.createLink}>
              <span aria-hidden>＋</span> 新建训练计划
            </Link>
            <p className={styles.sideHint}>
              你可以创建自己的训练计划并分享给其他人。
            </p>
          </Card>
        </aside>
      ) : null}
    </div>
  );
}
