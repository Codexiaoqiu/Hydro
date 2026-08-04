/* eslint-disable max-len */
import { STATUS } from '@hydrooj/common';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Article } from '../components/article/Article';
import { Link } from '../components/link';
import { Alert, Chip, Eyebrow } from '../components/primitives';
import { TagCloud } from '../components/primitives/TagCloud';
import { ProblemHero } from '../components/problem/ProblemHero';
import { ProblemOpenGraph } from '../components/problem/ProblemOpenGraph';
import type { ScratchpadPanelProps } from '../components/scratchpad/ScratchpadPanel';
import { ScratchpadPanel } from '../components/scratchpad/ScratchpadPanel';
import { Author } from '../components/sidebar/Author';
import { type ContestItem, ContestList } from '../components/sidebar/ContestList';
import { getTidQuery, type ProblemSidebarContext } from '../components/sidebar/problem-sidebar-items';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { SideCard } from '../components/sidebar/SideCard';
import { usePageData, useSetUiContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import {
  canSubmitProblem,
  isLoggedIn,
} from '../lib/perms';
import { toWebSocketUrl } from '../lib/ws-url';
import styles from './problem_detail.module.css';
import { pickPreferredLang, readContentText } from './problem-detail-helpers';

// ===== Types (unchanged from existing) =====================================
export interface Pdoc {
  docId: number;
  pid?: string;
  title: string;
  hidden?: boolean;
  tag?: string[];
  difficulty?: number;
  nSubmit?: number;
  nAccept?: number;
  content?: string | Record<string, string>;
  config?: {
    type?: string;
    subType?: string;
    timeMin?: number;
    timeMax?: number;
    memoryMin?: number;
    memoryMax?: number;
    langs?: string[];
    [k: string]: unknown;
  } | string;
  reference?: { domainId: string, pid: string | number };
  data?: unknown[];
  additional_file?: Array<{ name: string, size: number }>;
}

export interface Rdoc { _id?: string, status?: number, score?: number }
export interface Psdoc { star?: boolean, status?: number }
export interface Tdoc { _id?: string, docId?: string, pids?: Array<number | string>, rule?: string, owner?: number }
export interface Tsdoc { detail?: Record<string, { status?: number }>, attend?: boolean, startAt?: number }
export interface Udoc { _id?: number, uname?: string, avatar?: string }
export interface Args {
  pdoc: Pdoc;
  rdoc?: Rdoc;
  psdoc?: Psdoc;
  udoc?: Udoc;
  tdoc?: Tdoc;
  tsdoc?: Tsdoc;
  ownerUdoc?: Udoc;
  tdocs?: Array<{ docId: string, title: string }>;
  ctdocs?: Array<{ docId: string, title: string }>;
  htdocs?: Array<{ docId: string, title: string }>;
  discussionCount?: number;
  solutionCount?: number;
  mode?: 'normal' | 'contest' | 'view' | 'correction';
  UserContext?: {
    _id?: number;
    uname?: string;
    avatar?: string;
    hasPerm?: (p: number) => boolean;
    hasPriv?: (p: number) => boolean;
    own?: (p: { owner?: number }, perm: number) => boolean;
    viewLang?: string;
    codeLang?: string;
    codeTemplate?: string;
    canViewRecord?: boolean;
  };
}

function getAlphabeticId(idx: number): string {
  let s = '';
  let n = idx;
  while (true) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

function statusClassName(status?: number): string {
  if (status === undefined) return '';
  switch (status) {
    case STATUS.STATUS_ACCEPTED: return 'ac';
    case STATUS.STATUS_WRONG_ANSWER: return 'wa';
    case STATUS.STATUS_TIME_LIMIT_EXCEEDED: return 'tle';
    case STATUS.STATUS_MEMORY_LIMIT_EXCEEDED: return 'mle';
    case STATUS.STATUS_RUNTIME_ERROR: return 're';
    case STATUS.STATUS_SYSTEM_ERROR: return 'se';
    case STATUS.STATUS_COMPILE_ERROR: return 'ce';
    case STATUS.STATUS_OUTPUT_LIMIT_EXCEEDED: return 'pe';
    default: return '';
  }
}

// ===== Page ================================================================
export default function ProblemDetailPage() {
  const { args } = usePageData();
  const {
    pdoc, rdoc, psdoc, tdoc, tsdoc, ownerUdoc,
    tdocs = [], ctdocs = [], htdocs = [],
    discussionCount = 0, solutionCount = 0,
    mode = 'normal', UserContext,
  } = args;
  const injectedUiContext = useMemo(
    () => (args as { UiContext?: { ws_prefix?: string } }).UiContext,
    [args],
  );
  const wsPrefix = injectedUiContext?.ws_prefix;
  const buildUrl = useBuildUrl();
  const setUiContext = useSetUiContext();
  const t = useTranslate();

  useEffect(() => {
    const userCtx = UserContext as unknown as {
      viewLang?: string;
      codeLang?: string;
      codeTemplate?: string;
      canViewRecord?: boolean;
    };
    const canViewRecord = !!(userCtx?.canViewRecord) || !tdoc;
    // The native `WebSocket` constructor rejects relative URLs; the server
    // emits a relative `record-conn?pretest=1&...` plus a `ws_prefix` path
    // (e.g. `/`). Join them into an absolute ws:// / wss:// URL so the scratchpad
    // can establish the pretest stream. The helper short-circuits during SSR.
    const pretestRelative = `record-conn?pretest=1&uidOrName=${UserContext?._id ?? ''}&pid=${pdoc.docId}${tdoc ? `&tid=${tdoc.docId}` : ''}`;
    const pretestConnUrl = toWebSocketUrl(pretestRelative, { wsPrefix }) ?? pretestRelative;
    setUiContext({
      problemId: pdoc.pid ?? pdoc.docId,
      problemNumId: pdoc.docId,
      codeLang: userCtx?.codeLang,
      codeTemplate: userCtx?.codeTemplate,
      pdoc,
      tdoc,
      tsdoc,
      canViewRecord,
      postSubmitUrl: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      getSubmissionsUrl: buildUrl(
        'record_main',
        {},
        { pid: String(pdoc.docId), fullStatus: 'true', ...getTidQuery(tdoc) },
      ),
      getRecordDetailUrl: buildUrl(
        'record_detail',
        { rid: '{rid}' },
        getTidQuery(tdoc),
      ),
      pretestConnUrl,
    });
  }, [pdoc, tdoc, tsdoc, UserContext, buildUrl, setUiContext, wsPrefix]);

  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const isScratchpad = searchParams.get('mode') === 'scratchpad';

  const handleExitScratchpad = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const preferredLang = useMemo(() => {
    const userLang = (UserContext as unknown as { viewLang?: string })?.viewLang;
    const contentLangs: string[] =
      pdoc.content && typeof pdoc.content === 'object'
        ? Object.keys(pdoc.content)
        : [];
    let fromQuery: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        fromQuery = new URL(window.location.href).searchParams.get('lang');
      } catch {
        fromQuery = null;
      }
    }
    const injectedLocale = typeof window !== 'undefined'
      ? (window as unknown as { __hydro_locale?: string }).__hydro_locale
      : undefined;
    const navigatorLanguage = typeof navigator !== 'undefined'
      ? (navigator.language || '')
      : '';
    return pickPreferredLang(contentLangs, {
      userLang,
      fromQuery,
      injectedLocale,
      navigatorLanguage,
    });
  }, [pdoc.content, UserContext]);

  const contentText = useMemo(
    () => readContentText(pdoc.content, preferredLang),
    [pdoc.content, preferredLang],
  );

  const contentLangs = useMemo(() => {
    if (pdoc.content && typeof pdoc.content === 'object') return Object.keys(pdoc.content);
    return [];
  }, [pdoc.content]);

  const headerPrefix = useMemo(() => {
    if (tdoc && (tdoc.pids?.length ?? 0) > 1) {
      const idx = tdoc.pids?.indexOf(pdoc.docId) ?? -1;
      if (idx >= 0) return `${getAlphabeticId(idx)}.`;
    }
    if (pdoc.pid?.includes('-')) return pdoc.pid.split('-').join('#');
    return `#${pdoc.pid ?? pdoc.docId}`;
  }, [pdoc, tdoc]);

  const canSubmit = canSubmitProblem(UserContext);
  const canStar = !tdoc && isLoggedIn(UserContext);

  const contestItems: ContestItem[] = useMemo(() => [
    ...ctdocs.map((c) => ({ title: c.title, emoji: '🏆', date: '' })),
    ...tdocs.map((tt) => ({ title: tt.title, emoji: '📚', date: '' })),
    ...htdocs.map((h) => ({ title: h.title, emoji: '📝', date: '' })),
  ], [ctdocs, tdocs, htdocs]);

  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const categories = pdoc.tag ?? [];
  const showCategories = useCallback(() => setCategoriesVisible((visible) => !visible), []);
  const onCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
    }
  }, []);

  if (isScratchpad && canSubmit) {
    // Mirror the same ws:// / wss:// promotion as the UiContext path so the
    // scratchpad `<ScratchpadPanel>` can open the pretest stream directly.
    const pretestRelativeDirect = `record-conn?pretest=1&uidOrName=${UserContext?._id ?? ''}&pid=${pdoc.docId}${tdoc ? `&tid=${tdoc.docId}` : ''}`;
    const pretestConnUrlDirect = toWebSocketUrl(pretestRelativeDirect, { wsPrefix }) ?? pretestRelativeDirect;
    return (
      <ScratchpadPanel
        pdoc={pdoc}
        tdoc={tdoc}
        UserContext={UserContext as unknown as ScratchpadPanelProps['UserContext']}
        pretestConnUrl={pretestConnUrlDirect}
        postSubmitUrl={buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc))}
        getSubmissionsUrl={buildUrl('record_main', {}, { pid: String(pdoc.docId), fullStatus: 'true', ...getTidQuery(tdoc) })}
        contentText={contentText}
        contentLangs={contentLangs}
        preferredLang={preferredLang}
        mode={mode}
        problemId={pdoc.docId}
        onExit={handleExitScratchpad}
      />
    );
  }

  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const categories = pdoc.tag ?? [];
  const showCategories = useCallback(() => setCategoriesVisible((visible) => !visible), []);
  const onCopy = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(window.location.href);
    }
  }, []);
  const sidebarContext = {
    pdoc,
    tdoc,
    psdoc,
    UserContext,
    buildUrl,
    discussionCount,
    solutionCount,
    categories,
    showCategories,
    onCopy,
  } as ProblemSidebarContext;

  const loggedIn = isLoggedIn(UserContext);

  // === Normal mode: new hero + content + sidebar layout ===
  if (mode === 'normal') {
    return (
      <main className={styles.page}>
        <ProblemOpenGraph pdoc={pdoc} />
        <ProblemHero pdoc={pdoc} />

        <div className={styles.layout}>
          <article className={styles.content}>
            <div className={styles.sidebarCard}>
              {contentLangs.length > 1 && (
                <div className={styles.cardHead}>
                  <h3>{t('Problem.Statement')}</h3>
                  <div className={styles.langTabs}>
                    {contentLangs.map((l) => (
                      <Link
                        key={l}
                        to="problem_detail"
                        params={{ pid: pdoc.pid ?? String(pdoc.docId) }}
                        searchParams={l === preferredLang ? {} : { lang: l }}
                        className={l === preferredLang ? styles.langTabActive : styles.langTab}
                      >
                        {l}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {/* eslint-disable-next-line ts/no-use-before-define */}
              <ProblemContent pdoc={pdoc} contentText={contentText} mode={mode} />
              <Article content={contentText} />
            </div>
          </article>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              {canSubmit ? (
                <Link
                  to="problem_submit"
                  params={{ pid: String(pdoc.docId) }}
                  className={styles.ctaBlock}
                  style={{ display: 'flex' }}
                >
                  <div className={styles.ctaBlockText}>
                    <b>{t('Problem.ReadyToSubmit') ?? '准备好开题了?'}</b>
                    <small>{t('Problem.SubmitHint') ?? '提交你的答案'}</small>
                  </div>
                  <button type="button" className={styles.ctaBlockBtn}>{t('Problem.Submit')}</button>
                </Link>
              ) : (
                <div className={styles.ctaBlock}>
                  <div className={styles.ctaBlockText}>
                    <b>{loggedIn ? t('Problem.NoPermissionToSubmit') : t('Problem.LoginToSubmit')}</b>
                    <small>{t('Problem.SubmitHint') ?? '提交你的答案'}</small>
                  </div>
                  <button type="button" className={styles.ctaBlockBtn} disabled>{t('Problem.Submit')}</button>
                </div>
              )}
              <ProblemSidebar context={sidebarContext} mode={mode} />
              {categories.length > 0 && (
                <details open={categoriesVisible} onToggle={(event) => {
                  setCategoriesVisible((event.currentTarget as HTMLDetailsElement).open);
                }}>
                  <summary>{t('Problem.Categories') || 'Categories'}</summary>
                  <ul>{categories.map((category) => <li key={category}>{category}</li>)}</ul>
                </details>
              )}
            </div>

            {ownerUdoc && (
              <SideCard title={t('Problem.Uploader') ?? '出题人'}>
                <Author name={ownerUdoc.uname ?? `User ${ownerUdoc._id}`} contribution={t('Problem.UploaderContribution') ?? '题目贡献者'} />
              </SideCard>
            )}

            {contestItems.length > 0 && (
              <SideCard title={t('Problem.RelatedEvents') ?? '出现于比赛'}>
                <ContestList items={contestItems} />
              </SideCard>
            )}

            {pdoc.tag && pdoc.tag.length > 0 && (
              <SideCard title={t('Problem.RelatedTags') ?? '相关标签'}>
                <TagCloud tags={pdoc.tag} />
              </SideCard>
            )}

            {/* eslint-disable-next-line ts/no-use-before-define */}
            <InformationCard pdoc={pdoc} ownerUdoc={ownerUdoc} />
          </aside>
        </div>
      </main>
    );
  }

  // === Contest / view / correction mode: fallback ===
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.titleFallback}>
          {rdoc && rdoc.status !== undefined && (
            <Link to="record_detail" params={{ rid: String(rdoc._id) }} className={styles.statusBadge}>
              <span className={`${styles.statusIcon} ${styles[statusClassName(rdoc.status)]}`} />
              <span>{rdoc.score}</span>
            </Link>
          )}
          {canStar && (
            <form action="" method="post">
              <input type="hidden" name="star" value={psdoc?.star ? 'false' : 'true'} />
              <input type="hidden" name="operation" value="star" />
              <button type="submit" aria-label={t('Problem.Star')}>
                {psdoc?.star ? '★' : '☆'}
              </button>
            </form>
          )}
          <span className={styles.prefixFallback}>{headerPrefix}</span>
          <span>{pdoc.title}</span>
        </h1>
        {tdoc && (tdoc.pids?.length ?? 0) > 1 && (tdoc.pids?.length ?? 0) <= 26 && (
          <nav className={styles.contestNav}>
            {tdoc.pids?.map((pid, i) => {
              const status = tsdoc?.detail?.[String(pid)]?.status;
              const pass = status === STATUS.STATUS_ACCEPTED;
              const fail = status !== undefined && !pass;
              return (
                <Link
                  key={String(pid)}
                  to="problem_detail"
                  params={{ pid: String(pid) }}
                  searchParams={getTidQuery(tdoc)}
                  className={`${styles.contestNavItem} ${pass ? styles.contestNavPass : fail ? styles.contestNavFail : ''}`}
                >
                  {getAlphabeticId(i)}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* eslint-disable-next-line ts/no-use-before-define */}
      <ProblemTagRow pdoc={pdoc} mode={mode} tdoc={tdoc} />

      <div className={styles.layout}>
        <article className={styles.content}>
          <div className={styles.sidebarCard}>
            {contentLangs.length > 1 && (
              <div className={styles.cardHead}>
                <h3>{t('Problem.Statement')}</h3>
                <div className={styles.langTabs}>
                  {contentLangs.map((l) => (
                    <Link
                      key={l}
                      to="problem_detail"
                      params={{ pid: pdoc.pid ?? String(pdoc.docId) }}
                      searchParams={l === preferredLang ? {} : { lang: l }}
                      className={l === preferredLang ? styles.langTabActive : styles.langTab}
                    >
                      {l}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* eslint-disable-next-line ts/no-use-before-define */}
            <ProblemContent pdoc={pdoc} contentText={contentText} mode={mode} />
            <Article content={contentText} />
          </div>
        </article>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <ProblemSidebar context={sidebarContext} mode={mode} />
            {categories.length > 0 && (
              <details open={categoriesVisible} onToggle={(event) => {
                setCategoriesVisible((event.currentTarget as HTMLDetailsElement).open);
              }}>
                <summary>{t('Problem.Categories') || 'Categories'}</summary>
                <ul>{categories.map((category) => <li key={category}>{category}</li>)}</ul>
              </details>
            )}
          </div>
          {(tdocs.length > 0 || ctdocs.length > 0 || htdocs.length > 0) && (
            // eslint-disable-next-line ts/no-use-before-define
            <RelatedCard tdocs={tdocs} ctdocs={ctdocs} htdocs={htdocs} />
          )}
        </aside>
      </div>
    </main>
  );
}

// === Sub-components (unchanged from existing) ===
function ProblemTagRow({ pdoc, mode, tdoc }: { pdoc: Pdoc, mode: string, tdoc?: Tdoc }) {
  const t = useTranslate();
  const items: React.ReactNode[] = [];

  if (mode === 'normal') {
    items.push(<span key="docId"><Eyebrow>{t('Common.ID')}</Eyebrow> {pdoc.docId}</span>);
  }
  if (pdoc.config && typeof pdoc.config === 'object' && pdoc.config.type) {
    items.push(<span key="type"><Eyebrow>{t('Problem.Type')}</Eyebrow> {pdoc.config.type}{pdoc.config.subType ? ` · ${pdoc.config.subType}` : ''}</span>);
  }
  if (pdoc.config && typeof pdoc.config === 'object' && pdoc.config.type === 'default' && pdoc.config.subType) {
    items.push(<span key="fileio"><Eyebrow>{t('Problem.FileIO')}</Eyebrow> {String(pdoc.config.subType)}</span>);
  }
  const cfg = (typeof pdoc.config === 'object' ? pdoc.config : null) as {
    timeMin?: number; timeMax?: number; memoryMin?: number; memoryMax?: number; langs?: string[]; type?: string;
  } | null;
  if (cfg && cfg.type !== 'objective' && cfg.type !== 'submit_answer') {
    if (cfg.timeMin !== undefined && cfg.timeMax !== undefined) {
      items.push(<span key="time"><Eyebrow>{t('Common.Time')}</Eyebrow> {cfg.timeMin === cfg.timeMax ? `${cfg.timeMin}ms` : `${cfg.timeMin}~${cfg.timeMax}ms`}</span>);
    }
    if (cfg.memoryMin !== undefined && cfg.memoryMax !== undefined) {
      items.push(<span key="mem"><Eyebrow>{t('Problem.Memory')}</Eyebrow> {cfg.memoryMin === cfg.memoryMax ? `${cfg.memoryMin}MB` : `${cfg.memoryMin}~${cfg.memoryMax}MB`}</span>);
    }
  }
  if (mode === 'normal') {
    items.push(<Link key="tried" to="record_main" searchParams={{ pid: String(pdoc.docId), ...getTidQuery(tdoc) }}><Eyebrow>{t('Problem.Tried')}</Eyebrow> {pdoc.nSubmit ?? '?'}</Link>);
    items.push(<span key="acc"><Eyebrow>{t('Problem.Accepted')}</Eyebrow> {pdoc.nAccept ?? '?'}</span>);
  }
  if (pdoc.difficulty !== undefined) {
    items.push(<span key="diff"><Eyebrow>{t('Problem.Difficulty')}</Eyebrow> {pdoc.difficulty}</span>);
  }
  if (pdoc.tag && pdoc.tag.length > 0) {
    items.push(...pdoc.tag.map((tagName) => <Chip key={tagName} variant="tag">{tagName}</Chip>));
  }
  return <div className={styles.tagRow}>{items}</div>;
}

function ProblemContent({ pdoc, contentText, mode }: { pdoc: Pdoc, contentText: string, mode: string }) {
  const t = useTranslate();
  const cfg = (typeof pdoc.config === 'object' ? pdoc.config : null) as { langs?: string[] } | null;
  const configError = typeof pdoc.config === 'string';
  const noData = !pdoc.data || (Array.isArray(pdoc.data) && pdoc.data.length === 0);
  const noLangs = !!cfg && Array.isArray(cfg.langs) && cfg.langs.length === 0;
  return (
    <>
      {noData && !pdoc.reference && (
        <Alert variant="warn" title={t('Problem.NoTestdata')} message={t('Problem.NoTestdataMessage')} />
      )}
      {configError && (
        <Alert variant="error" title={t('Problem.ConfigurationError')} message={String(pdoc.config)} />
      )}
      {noLangs && (
        <Alert variant="warn" title={t('Problem.NoSubmissionLanguage')} message={t('Problem.NoSubmissionLanguageMessage')} />
      )}
      {mode === 'view' && (
        <Alert variant="info" title={t('Problem.ContestEnded')} message={t('Problem.ContestEndedMessage')} />
      )}
      {mode === 'correction' && (
        <Alert variant="info" title={t('Problem.CorrectionSubmissions')} message={t('Problem.CorrectionSubmissionsMessage')} />
      )}
      {!contentText && !configError && (
        <Alert variant="info" title={t('Problem.StatementPending')} message={t('Problem.StatementPendingMessage')} />
      )}
    </>
  );
}

function InformationCard({ pdoc, ownerUdoc }: { pdoc: Pdoc, ownerUdoc?: Udoc }) {
  const t = useTranslate();
  return (
    <div className={styles.sidebarCard}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: '0 0 14px', color: 'var(--text)' }}>
        {t('Problem.Information')}
      </h4>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', fontSize: 13 }}>
        <dt style={{ color: 'var(--text-mute)' }}>{t('Common.ID')}</dt><dd style={{ margin: 0 }}>{pdoc.docId}</dd>
        {typeof pdoc.config === 'object' && pdoc.config && (
          <>
            <dt style={{ color: 'var(--text-mute)' }}>{t('Common.Time')}</dt>
            <dd style={{ margin: 0 }}>
              {pdoc.config.timeMin === pdoc.config.timeMax
                ? `${pdoc.config.timeMin}ms`
                : `${pdoc.config.timeMin}~${pdoc.config.timeMax}ms`}
            </dd>
            <dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Memory')}</dt>
            <dd style={{ margin: 0 }}>
              {pdoc.config.memoryMin === pdoc.config.memoryMax
                ? `${pdoc.config.memoryMin}MB`
                : `${pdoc.config.memoryMin}~${pdoc.config.memoryMax}MB`}
            </dd>
          </>
        )}
        {pdoc.difficulty !== undefined && <><dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Difficulty')}</dt><dd style={{ margin: 0 }}>{pdoc.difficulty}</dd></>}
        {pdoc.tag && pdoc.tag.length > 0 && (
          <>
            <dt style={{ color: 'var(--text-mute)' }}>{t('Common.Tags')}</dt><dd style={{ margin: 0 }}>{pdoc.tag.join(', ')}</dd>
          </>
        )}
        <dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Submissions')}</dt><dd style={{ margin: 0 }}>{pdoc.nSubmit ?? '?'}</dd>
        <dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Accepted')}</dt><dd style={{ margin: 0 }}>{pdoc.nAccept ?? '?'}</dd>
        {ownerUdoc && <><dt style={{ color: 'var(--text-mute)' }}>{t('Problem.UploadedBy')}</dt><dd style={{ margin: 0 }}>{ownerUdoc.uname ?? ownerUdoc._id}</dd></>}
      </dl>
    </div>
  );
}

function RelatedCard({ tdocs, ctdocs, htdocs }: {
  tdocs: Array<{ docId: string, title: string }>;
  ctdocs: Array<{ docId: string, title: string }>;
  htdocs: Array<{ docId: string, title: string }>;
}) {
  const t = useTranslate();
  return (
    <div className={styles.sidebarCard}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: '0 0 14px', color: 'var(--text)' }}>
        {t('Problem.Related')}
      </h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tdocs.map((tt) => (
          <li key={tt.docId}><Link to="training_detail" params={{ tid: tt.docId }}>{tt.title}</Link></li>
        ))}
        {ctdocs.map((c) => (
          <li key={c.docId}><Link to="contest_detail" params={{ tid: c.docId }}>{c.title}</Link></li>
        ))}
        {htdocs.map((h) => (
          <li key={h.docId}><Link to="homework_detail" params={{ tid: h.docId }}>{h.title}</Link></li>
        ))}
      </ul>
    </div>
  );
}
