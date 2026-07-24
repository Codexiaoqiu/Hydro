import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../components/link';
import { ProblemSelectionDisplay } from '../components/problem/ProblemSelectionDisplay';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { Eyebrow } from '../components/primitives/Eyebrow';
import { Select } from '../components/primitives/Select';
import { TagCloud } from '../components/primitives/TagCloud';
import { CtaCard } from '../components/sidebar/CtaCard';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useBuildUrl } from '../hooks/use-build-url';
import { Avatar } from '../lib/avatar';
import { difficultyAlgorithm, formatN } from '../lib/difficulty';
import { detectLocale, useTranslate } from '../lib/i18n';
import { canCreateProblem, canEditProblem, isLoggedIn } from '../lib/perms';
import { stringifySearchQuery } from '../lib/search-query';
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
  // Optional uploader info — when present we render an avatar next to the
  // row. Kept separate from `owner` (an id) so future backend payloads can
  // pre-fill the avatar spec without breaking the page.
  uploadedBy?: { _id?: number, uname?: string, avatar?: string };
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

const tagQuery = (tag: string): string => `category:${tag.includes(' ') ? `"${tag}"` : tag}`;

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function TagRow({ tags, buildUrl }: { tags: string[], buildUrl: ReturnType<typeof useBuildUrl> }) {
  // Limit to 5 tags per row by default — beyond that the row gets crowded
  // and the chip strip wraps onto a second line. A "Show all" button expands
  // to reveal every tag, which is more discoverable than horizontal scroll.
  const COLLAPSED_LIMIT = 5;
  const [expanded, setExpanded] = useState(false);
  const t = useTranslate();
  const visible = expanded ? tags : tags.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = tags.length - visible.length;

  return (
    <div className={styles.tags}>
      {visible.map((tagName) => (
        <Link
          key={tagName}
          href={buildUrl('problem_main', {}, { q: tagQuery(tagName) })}
          className={styles.tagLink}
        >
          {tagName}
        </Link>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          className={styles.tagToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t('Problem.TagToggleHide') : `${t('Problem.TagToggleShow')} (+${hiddenCount})`}
        </button>
      )}
    </div>
  );
}

function Pager({ page, ppcount, qs, sort, buildUrl }: {
  page: number;
  ppcount: number;
  qs: string;
  sort: string;
  buildUrl: ReturnType<typeof useBuildUrl>;
}) {
  const t = useTranslate();
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
    <nav className={styles.pager} aria-label={t('ProblemMain.PagerAria')}>
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
  const t = useTranslate();
  const [locale] = useState(() => (typeof window === 'undefined' ? 'en' : detectLocale()));

  const pdocs = args.pdocs || [];
  const psdict = args.psdict || {};
  const page = Math.max(1, args.page || 1);
  const ppcount = Math.max(0, args.ppcount || 0);
  const pcount = Math.max(0, args.pcount || 0);
  const qs = args.qs || '';
  const sort = args.sort || 'default';

  const [query, setQuery] = useState(qs);
  const requestedEditMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('mode') === 'edit';
  }, []);
  const [editMode, setEditMode] = useState(requestedEditMode);
  const [selectedPids, setSelectedPids] = useState<number[]>([]);

  useEffect(() => {
    if (requestedEditMode) setEditMode(true);
  }, [requestedEditMode]);

  const categorySetting = (UiContext?.problemCategories || {}) as ProblemCategory;

  const flatTags = useMemo(() => {
    const tags = new Set<string>();
    for (const p of pdocs) (p.tag || []).forEach((t) => tags.add(t));
    return Array.from(tags).slice(0, 16);
  }, [pdocs]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params: Record<string, string> = {};
    const normalised = stringifySearchQuery({ text: query });
    if (normalised) params.q = normalised;
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
  const loggedIn = isLoggedIn(UserContext);
  const canCreate = canCreateProblem(UserContext);
  const canDeleteAny = !!pdocs.length && pdocs.every((p) => canEditProblem(UserContext, p));
  const canEditAny = !!pdocs.length && pdocs.some((p) => canEditProblem(UserContext, p));
  const statText = pcount > 0
    ? (args.pcountRelation === 'eq' ? `${pcount}${t('ProblemMain.ProblemCount')}` : `${pcount}${t('ProblemMain.ProblemCountRelation')}`)
    : t('ProblemMain.NoProblems');

  const togglePid = (docId: number, checked: boolean) => {
    setSelectedPids((prev) => {
      if (checked) return prev.includes(docId) ? prev : [...prev, docId];
      return prev.filter((id) => id !== docId);
    });
  };
  const selectAllChecked = !!pdocs.length && selectedPids.length === pdocs.length;
  const toggleAll = (checked: boolean) => {
    setSelectedPids(checked ? pdocs.map((p) => p.docId) : []);
  };
  const afterAction = () => {
    setSelectedPids([]);
    navigate(pageData.url || window.location.pathname + window.location.search);
  };

  return (
    <>
      <div className={styles.shell}>
        <main>
          <Card
            variant="default"
            header={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div className={styles.crumbs}>
                  <Eyebrow dot={false}>{t('ProblemMain.Crumbs')}</Eyebrow>
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
                  {t('ProblemMain.Title')}
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
                    placeholder={t('ProblemMain.SearchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t('ProblemMain.SearchAria')}
                  />
                </label>
                <Select
                  value={sort}
                  onChange={sortChange}
                  ariaLabel={t('ProblemMain.SortAria')}
                  options={[
                    { value: 'default', label: t('ProblemMain.SortDefault') },
                    { value: 'recent', label: t('ProblemMain.SortRecent') },
                  ]}
                />
                {canEditAny && (
                  <Button
                    type="button"
                    onClick={() => setEditMode((v) => !v)}
                    data-testid="edit-mode-toggle"
                    variant={editMode ? 'primary' : 'ghost'}
                  >
                    {editMode
                      ? (locale === 'zh_CN' ? '退出编辑模式' : 'Exit edit mode')
                      : (locale === 'zh_CN' ? '进入编辑模式' : 'Enter edit mode')}
                  </Button>
                )}
              </form>
              <div className={styles.stat}>{statText}</div>
            </div>

            {pdocs.length === 0 ? (
              <div className={styles.empty}>
                {t('ProblemMain.NoProblemsHint')}
              </div>
            ) : (
              <>
                {editMode && (
                  <div className={styles.selectAll}>
                    <label>
                      <input
                        type="checkbox"
                        data-select-all="problem"
                        checked={selectAllChecked}
                        onChange={(e) => toggleAll(e.currentTarget.checked)}
                      />
                      <span>{locale === 'zh_CN' ? '全选' : 'Select all'}</span>
                    </label>
                  </div>
                )}
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
                    const uploader = p.uploadedBy;
                    const hasUploader = !!uploader && (!!uploader.uname || !!uploader.avatar || uploader._id !== undefined);
                    const checked = selectedPids.includes(p.docId);
                    return (
                      <div key={p.docId} className={`${styles.row} ${editMode ? styles.rowEditing : ''}`}>
                        {editMode && (
                          <div className={styles.checkbox}>
                            <input
                              type="checkbox"
                              data-pid={p.docId}
                              checked={checked}
                              onChange={(e) => togglePid(p.docId, e.currentTarget.checked)}
                            />
                          </div>
                        )}
                        <div className={styles.id}>{formatPid(p)}</div>

                        <div className={styles.title}>
                          <Link
                            to="problem_detail"
                            params={{ pid: p.pid || String(p.docId) }}
                            className={styles.titleLink}
                            title={p.title}
                          >
                            {p.title}
                            {p.hidden && <span className={styles.hidden}>{t('ProblemMain.Hidden')}</span>}
                          </Link>
                          {p.tag && p.tag.length > 0 && (
                            <TagRow tags={p.tag} buildUrl={buildUrl} />
                          )}
                          {hasUploader && (
                            <div className={styles.uploadedBy}>
                              <Avatar
                                spec={uploader!.avatar}
                                name={uploader!.uname ?? `#${uploader!._id}`}
                                size={20}
                                title={uploader!.uname}
                              />
                              <span className={styles.uploadedByName}>
                                {uploader!.uname ?? `#${uploader!._id}`}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className={styles.ac}>
                          <strong>{p.nAccept}</strong>
                          <span>/ {formatN(p.nSubmit)}</span>
                        </div>

                        <div className={styles.ac} title={`${t('ProblemMain.AcRateTitle')}${acRate}%`}>
                          <strong>{acRate}%</strong>
                          <span style={{ fontSize: 'var(--text-xs)' }}>{t('ProblemMain.AcRateLabel')}</span>
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
                {editMode && selectedPids.length > 0 && (
                  <ProblemSelectionDisplay
                    pids={selectedPids}
                    onAfterAction={afterAction}
                    canDelete={canDeleteAny}
                    canCopy={canCreate}
                    canEdit={canEditAny}
                    domainId={UiContext?.domainId}
                  />
                )}
              </>
            )}
          </Card>
        </main>

        <aside className={styles.sidebar}>
          <Card variant="side">
            {!loggedIn ? (
              <CtaCard
                title={t('ProblemMain.SideCtaTitle')}
                subtitle={t('ProblemMain.SideCtaSubtitle')}
                actionLabel={t('ProblemMain.SideCtaAction')}
                onAction={() => { navigate('/login'); }}
              />
            ) : canCreate ? (
              <CtaCard
                title={t('ProblemMain.SideCreateTitle')}
                subtitle={t('ProblemMain.SideCreateSubtitle')}
                actionLabel={t('ProblemMain.SideCreateAction')}
                onAction={() => { navigate('/problem/create'); }}
              />
            ) : null}
          </Card>

          {Object.keys(categorySetting).length > 0 && (
            <Card variant="side">
              <h4 className={styles.sideTitle}>{t('ProblemMain.SideCategoryTitle')}</h4>
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
            <h4 className={styles.sideTitle}>{t('ProblemMain.SideLuckyTitle')}</h4>
            <Link
              href={qs ? buildUrl('problem_random', {}, { q: qs }) : buildUrl('problem_random')}
              className={styles.lucky}
              target="_blank"
              rel="noopener"
            >
              <span aria-hidden>🎲</span> {t('ProblemMain.SideLucky')}
            </Link>
            <p className={styles.luckyHint}>
              {t('ProblemMain.SideLuckyHint')}
            </p>
          </Card>

          {flatTags.length > 0 && (
            <Card variant="side">
              <h4 className={styles.sideTitle}>{t('ProblemMain.SideTagsTitle')}</h4>
              <TagCloud tags={flatTags} />
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
