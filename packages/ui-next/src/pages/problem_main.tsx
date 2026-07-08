import { useMemo, useState } from 'react';
import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { CtaCard } from '../components/sidebar/CtaCard';
import { Eyebrow } from '../components/primitives/Eyebrow';
import { LangPill } from '../components/nav/LangPill';
import { Link } from '../components/link';
import { NavLink } from '../components/nav/NavLink';
import { Select } from '../components/primitives/Select';
import { TagCloud } from '../components/primitives/TagCloud';
import { ThemeToggle } from '../components/ThemeToggle';
import { TopNav } from '../components/nav/TopNav';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useBuildUrl } from '../hooks/use-build-url';
import { difficultyAlgorithm } from '../lib/difficulty';
import styles from './problem_main.module.css';

interface Pdoc {
  docId: number;
  pid?: string;
  domainId: string;
  title: string;
  tag?: string[];
  hidden?: boolean;
  nSubmit: number;
  nAccept: number;
  difficulty?: number;
}

interface Psdoc {
  rid?: string | null;
  status?: number;
  star?: string | string[];
}

interface ProblemArgs {
  page?: number;
  pcount?: number;
  ppcount?: number;
  pcountRelation?: string;
  pdocs?: Pdoc[];
  psdict?: Record<string, Psdoc>;
  qs?: string;
  sort?: 'default' | 'recent';
}

interface ProblemCategory {
  [k: string]: string[] | undefined;
}

const difficultyLabel = (d: number | undefined): string => {
  if (typeof d !== 'number' || !Number.isFinite(d)) return '—';
  if (d <= 0) return '入门';
  if (d === 1) return '★';
  if (d === 2) return '★★';
  if (d === 3) return '★★★';
  if (d === 4) return '★★★★';
  return `★${Math.min(d, 10)}`;
};

const formatPid = (pdoc: Pdoc): string => {
  const id = pdoc.pid || String(pdoc.docId);
  return id.includes('-') ? id.split('-').join('#') : id;
};

const statusClass = (status: number | undefined): string => {
  if (status === undefined) return styles.statusIgnore;
  if (status === STATUS.STATUS_ACCEPTED) return styles.statusPass;
  if (status === STATUS.STATUS_CANCELED || status === STATUS.STATUS_IGNORED) return styles.statusIgnore;
  return styles.statusFail;
};

const statusLabel = (status: number | undefined): string => {
  if (status === undefined) return '—';
  return STATUS_SHORT_TEXTS[status as STATUS] || '…';
};

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function Pager({ page, ppcount, qs, sort, buildUrl }: {
  page: number;
  ppcount: number;
  qs: string;
  sort: string;
  buildUrl: ReturnType<typeof useBuildUrl>;
}) {
  if (!ppcount || ppcount <= 1) return null;

  const buildHref = (p: number) => {
    const params: Record<string, string> = { page: String(p) };
    if (qs) params.q = qs;
    if (sort && sort !== 'default') params.sort = sort;
    return buildUrl('problem_main', {}, params);
  };

  const items: Array<number | 'gap'> = [];
  const window = 1;
  if (ppcount <= 7) {
    for (let i = 1; i <= ppcount; i++) items.push(i);
  } else {
    items.push(1);
    if (page - window > 2) items.push('gap');
    for (let i = Math.max(2, page - window); i <= Math.min(ppcount - 1, page + window); i++) items.push(i);
    if (page + window < ppcount - 1) items.push('gap');
    items.push(ppcount);
  }

  return (
    <nav className={styles.pager} aria-label="pagination">
      {items.map((it, idx) => {
        if (it === 'gap') {
          return <span key={`g-${idx}`} className={styles.pagerGap}>…</span>;
        }
        const active = it === page;
        return (
          <Link
            key={it}
            href={buildHref(it)}
            className={`${styles.pagerItem} ${active ? styles.pagerActive : ''}`}
          >
            {it}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ProblemMain() {
  const pageData = usePageData() as any;
  const { UserContext, UiContext } = pageData.args;
  const args: ProblemArgs = pageData.args;
  const buildUrl = useBuildUrl();
  const navigate = useNavigate();

  const pdocs = args.pdocs || [];
  const psdict = args.psdict || {};
  const page = Math.max(1, args.page || 1);
  const ppcount = Math.max(0, args.ppcount || 0);
  const pcount = Math.max(0, args.pcount || 0);
  const qs = args.qs || '';
  const sort = args.sort || 'default';

  const [query, setQuery] = useState(qs);

  const categorySetting = (UiContext?.problemCategories || {}) as ProblemCategory;

  const flatTags = useMemo(() => {
    const tags = new Set<string>();
    for (const p of pdocs) (p.tag || []).forEach((t) => tags.add(t));
    return Array.from(tags).slice(0, 16);
  }, [pdocs]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (sort && sort !== 'default') params.sort = sort;
    const href = buildUrl('problem_main', {}, params);
    navigate(href);
  };

  const sortChange = (value: string) => {
    const params: Record<string, string> = {};
    if (qs) params.q = qs;
    if (value && value !== 'default') params.sort = value;
    navigate(buildUrl('problem_main', {}, params));
  };

  const extraTitle = UiContext?.extraTitleContent as string | undefined;
  const statText = pcount > 0
    ? (args.pcountRelation === 'eq' ? `${pcount} 道题目` : `${pcount}+ 道题目`)
    : '暂无题目';

  const tagQuery = (tag: string) => `category:${tag.includes(' ') ? `"${tag}"` : tag}`;

  return (
    <>
      <TopNav
        brand="Hydro"
        currentRoute="problem_main"
        right={
          <>
            <LangPill label={UserContext?.viewLangName || '中文'} />
            <ThemeToggle />
            <Button variant="ghost" onClick={() => { navigate('/login'); }}>
              登录
            </Button>
            <Button variant="primary" onClick={() => { navigate('/register'); }}>
              注册
            </Button>
          </>
        }
      >
        <NavLink to="homepage">首页</NavLink>
        <NavLink to="problem_main">题库</NavLink>
        <NavLink to="contest_main">比赛</NavLink>
        <NavLink to="discussion_main">讨论</NavLink>
      </TopNav>

      <div className={styles.shell}>
        <main>
          <Card
            variant="default"
            header={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div className={styles.crumbs}>
                  <Eyebrow dot={false}>题库 / Problems</Eyebrow>
                  {extraTitle && <span className={styles.crumb}>· {extraTitle}</span>}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-xl)',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
                >
                  题目列表
                </h3>
              </div>
            }
          >
            <div className={styles.toolbar}>
              <form className={styles.toolbarRow} onSubmit={submitSearch}>
                <label className={styles.search}>
                  <SearchIcon />
                  <input
                    type="text"
                    name="q"
                    placeholder="搜索题目 ID / 标题 / 标签…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="搜索题目"
                  />
                </label>
                <Select
                  value={sort}
                  onChange={sortChange}
                  ariaLabel="排序方式"
                  options={[
                    { value: 'default', label: '默认排序' },
                    { value: 'recent', label: '最新优先' },
                  ]}
                />
              </form>
              <div className={styles.stat}>{statText}</div>
            </div>

            {pdocs.length === 0 ? (
              <div className={styles.empty}>
                当前筛选下没有题目。试试清空搜索,或者从侧边栏的分类开始浏览。
              </div>
            ) : (
              <>
                <div className={styles.list}>
                  {pdocs.map((p) => {
                    const ps = psdict[String(p.docId)];
                    const acRate = p.nSubmit > 0 ? Math.round((p.nAccept / p.nSubmit) * 100) : 0;
                    const status = ps?.status;
                    const hasStatus = status !== undefined && ps?.rid;
                    // The server does not pre-compute `difficulty` (see q.md:
                    // pdocs lack that field), so we run the same algorithm
                    // client-side when it's missing. The algorithm returns
                    // null when nSubmit is 0; treat that as "no signal".
                    const difficulty = p.difficulty ?? difficultyAlgorithm(p.nSubmit, p.nAccept) ?? undefined;
                    return (
                      <div key={p.docId} className={styles.row}>
                        <div className={styles.id}>{formatPid(p)}</div>

                        <div className={styles.title}>
                          <Link
                            to="problem_detail"
                            params={{ pid: p.pid || String(p.docId) }}
                            className={styles.titleLink}
                            title={p.title}
                          >
                            {p.title}
                            {p.hidden && <span className={styles.hidden}> · Hidden</span>}
                          </Link>
                          {p.tag && p.tag.length > 0 && (
                            <div className={styles.tags}>
                              {p.tag.slice(0, 5).map((t) => (
                                <Link
                                  key={t}
                                  href={buildUrl('problem_main', {}, { q: tagQuery(t) })}
                                  className={styles.tagLink}
                                >
                                  {t}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className={styles.ac}>
                          <strong>{p.nAccept}</strong>
                          <span>/ {p.nSubmit}</span>
                        </div>

                        <div className={styles.ac} title={`通过率 ${acRate}%`}>
                          <strong>{acRate}%</strong>
                          <span style={{ fontSize: 'var(--text-xs)' }}>通过率</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {hasStatus ? (
                            <span className={`${styles.status} ${statusClass(status)}`}>
                              {statusLabel(status)}
                            </span>
                          ) : (
                            <span className={`${styles.diff} ${!difficulty ? styles.diffNone : ''}`}>
                              {difficultyLabel(difficulty)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pager page={page} ppcount={ppcount} qs={qs} sort={sort} buildUrl={buildUrl} />
              </>
            )}
          </Card>
        </main>

        <aside className={styles.sidebar}>
          <Card variant="side">
            <CtaCard
              title="准备好开刷了?"
              subtitle="登录后即可提交代码、查看状态"
              actionLabel="登录"
              onAction={() => { navigate('/login'); }}
            />
          </Card>

          {Object.keys(categorySetting).length > 0 && (
            <Card variant="side">
              <h4 className={styles.sideTitle}>分类</h4>
              <div className={styles.catList}>
                {Object.entries(categorySetting).map(([cat, subs]) => (
                  <div key={cat}>
                    <Link
                      href={buildUrl('problem_main', {}, { q: tagQuery(cat) })}
                      className={styles.catItem}
                    >
                      <span>{cat}</span>
                    </Link>
                    {Array.isArray(subs) && subs.length > 0 && subs.map((sub) => (
                      <Link
                        key={sub}
                        href={buildUrl('problem_main', {}, { q: tagQuery(sub) })}
                        className={`${styles.catItem} ${styles.subCat}`}
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card variant="side">
            <h4 className={styles.sideTitle}>手气不错</h4>
            <Link
              href={qs ? buildUrl('problem_random', {}, { q: qs }) : buildUrl('problem_random')}
              className={styles.lucky}
              target="_blank"
              rel="noopener"
            >
              <span aria-hidden>🎲</span> 随机一题
            </Link>
            <p className={styles.luckyHint}>
              根据当前筛选条件随机抽一道题目;清空搜索可以扩展到全题库。
            </p>
          </Card>

          {flatTags.length > 0 && (
            <Card variant="side">
              <h4 className={styles.sideTitle}>本页热门标签</h4>
              <TagCloud tags={flatTags} />
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}