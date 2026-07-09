import { useEffect, useMemo } from 'react';
import { STATUS } from '@hydrooj/common';
import {
  usePageData, useSetUiContext,
} from '../context/page-data';
import { Link } from '../components/link';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Alert, Chip, Eyebrow } from '../components/primitives';
import { Article } from '../components/article/Article';
import { Menu, type MenuItem } from '../components/sidebar/Menu';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import styles from './problem_detail.module.css';

// ===== Types ===============================================================

interface Pdoc {
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
  reference?: { domainId: string; pid: string | number };
  data?: unknown[];
  additional_file?: Array<{ name: string; size: number }>;
}

interface Rdoc { _id?: string; status?: number; score?: number; }
interface Psdoc { star?: boolean; status?: number; }
interface Tdoc { _id?: string; docId?: string; pids?: Array<number | string>; rule?: string; owner?: number; }
interface Tsdoc { detail?: Record<string, { status?: number }>; attend?: boolean; startAt?: number; }
interface Udoc { _id?: number; uname?: string; avatar?: string; }
interface Args {
  pdoc: Pdoc;
  rdoc?: Rdoc;
  psdoc?: Psdoc;
  udoc?: Udoc;
  tdoc?: Tdoc;
  tsdoc?: Tsdoc;
  owner_udoc?: Udoc;
  tdocs?: Array<{ docId: string; title: string }>;
  ctdocs?: Array<{ docId: string; title: string }>;
  htdocs?: Array<{ docId: string; title: string }>;
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

type Mode = NonNullable<Args['mode']>;

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

function readContentText(content: Pdoc['content'] | undefined, preferredLang: string): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content !== 'object') return '';
  const map = content as Record<string, unknown>;
  const pickFromMap = (m: Record<string, unknown>): string => {
    const direct = m[preferredLang];
    if (typeof direct === 'string') return direct;
    // Fallback: backend may have wrapped the per-language map as a JSON string.
    const directStr = String(direct ?? '');
    if (directStr.trimStart().startsWith('{')) {
      try {
        const parsed = JSON.parse(directStr);
        if (parsed && typeof parsed === 'object') {
          const parsedMap = parsed as Record<string, unknown>;
          if (typeof parsedMap[preferredLang] === 'string') return parsedMap[preferredLang] as string;
          const first = Object.values(parsedMap).find((v) => typeof v === 'string');
          if (typeof first === 'string') return first;
        }
      } catch {
        /* fall through */
      }
    }
    const firstAny = Object.values(m).find((v) => typeof v === 'string');
    return typeof firstAny === 'string' ? firstAny : '';
  };
  return pickFromMap(map);
}

// ===========================================================================
// Sidebar helpers (Bug #8) — three views that mirror ui-default's
// problem_sidebar_{normal,contest,homework}.html so we don't lose context-
// specific gating when switching modes.
// ===========================================================================

interface SidebarCtx {
  pdoc: Pdoc;
  tdoc?: Tdoc;
  UserContext?: Args['UserContext'];
  buildUrl: ReturnType<typeof useBuildUrl>;
  discussionCount: number;
  solutionCount: number;
  psdoc?: Psdoc;
}

function getTidQuery(tdoc?: Tdoc): Record<string, string> {
  return tdoc && tdoc.docId != null ? { tid: String(tdoc.docId) } : {};
}

function getNormalMenu(ctx: SidebarCtx, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const {
    pdoc, tdoc, UserContext, buildUrl, discussionCount, solutionCount, psdoc,
  } = ctx;

  const items: MenuItem[] = [];
  const isLoggedIn = !!UserContext?._id;
  const canSubmit = UserContext?.hasPerm?.(8) ?? false;
  const canRejudge = UserContext?.hasPerm?.(4096) ?? false;
  const canViewDiscussion = UserContext?.hasPerm?.(256) ?? false;
  const psdocAccepted = psdoc?.status === STATUS.STATUS_ACCEPTED;
  const canViewSolution =
    UserContext?.hasPerm?.(1) ||
    (UserContext?.hasPerm?.(2) && psdocAccepted);
  const canEditProblem =
    (pdoc && UserContext?.own?.(pdoc as unknown as { owner?: number }, 16)) ||
    UserContext?.hasPerm?.(16);
  // PERM_REJUDGE_PROBLEM = 4096; the original problem is preferred, but if it's
  // a hack-style reference problem we don't show rejudge either.
  const showRejudge = canRejudge && !pdoc.reference;

  // --- Submit (4 states) ---------------------------------------------------
  if (canSubmit) {
    items.push({
      key: 'submit',
      title: t('Problem.Submit'),
      href: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  } else if (isLoggedIn) {
    items.push({
      key: 'submit',
      title: t('Problem.NoPermissionToSubmit'),
      href: '#',
      onClick: () => {/* TODO: show permission hint */},
    });
  } else {
    items.push({
      key: 'submit',
      title: t('Problem.LoginToSubmit'),
      href: '#',
      onClick: () => {/* TODO: open sign-in dialog */},
    });
  }

  // --- Rejudge --------------------------------------------------------------
  if (showRejudge) {
    items.push({
      key: 'rejudge',
      title: t('Problem.Rejudge'),
      form: true,
      action: '',
      postBody: { operation: 'rejudge' },
    });
  }

  // --- Separator before Discussions/Solutions ------------------------------
  if (canViewDiscussion || canViewSolution) {
    items.push({ key: 'sep-1', separator: true });
  }
  if (canViewDiscussion) {
    items.push({
      key: 'discussions',
      title: `${t('Problem.Discussions')} (${discussionCount})`,
      href: buildUrl('discussion_node', { type: 'problem', name: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }
  if (canViewSolution) {
    items.push({
      key: 'solutions',
      title: `${t('Problem.Solutions')} (${solutionCount})`,
      href: buildUrl('problem_solution', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }
  items.push({
    key: 'files',
    title: t('Problem.Files'),
    href: buildUrl('problem_files', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
  });
  items.push({
    key: 'statistics',
    title: t('Problem.Statistics'),
    href: buildUrl('problem_statistics', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
  });

  // --- Edit / Judge Config -------------------------------------------------
  if (canEditProblem) {
    items.push({ key: 'sep-2', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
    if (!pdoc.reference) {
      items.push({
        key: 'judge-config',
        title: t('Problem.JudgeConfig'),
        href: buildUrl('problem_config', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      });
    }
  }

  // --- Download / Copy intentionally omitted in ui-next phase 1 --------------
  // These used to be empty onClick stubs in this helper. They are now provided
  // through slots (defineSlot('problem:sidebar:download' | 'problem:sidebar:copy', ...))
  // by future addons; keeping unimplemented entries here would render menu
  // items that do nothing when clicked.

  // Scratchpad slot intentionally skipped — ui-next phase 1 does not implement
  // the Monaco scratchpad panel. See TODO: 接入 scratchpad slot.
  void pdoc;

  return items;
}

function getContestMenu(ctx: SidebarCtx, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const { pdoc, tdoc, UserContext, buildUrl } = ctx;
  if (!tdoc) return getNormalMenu(ctx, t);
  const items: MenuItem[] = [];

  // mode === 'normal' here means: opened from /problem/<pid>; contest-mode
  // routes inside a contest call this with mode='contest' | 'view' | 'correction'.
  if (mode === 'view' || mode === 'correction') {
    // ui-default's contest sidebar shows "Open in Problem Set" when the
    // contest is done for both correction and post-end viewing.
    items.push({
      key: 'open-in-problem-set',
      title: t('Problem.OpenInProblemSet'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }),
    });
  } else {
    items.push({
      key: 'view-problem',
      title: t('Problem.ViewProblem'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }

  // Submit remains reachable while the contest is ongoing; after it ends we
  // only show "Open in Problem Set" instead.
  if (mode === 'contest' || (mode !== 'view' && mode !== 'correction')) {
    const isLoggedIn = !!UserContext?._id;
    const canSubmit = UserContext?.hasPerm?.(8) ?? false;
    if (canSubmit) {
      items.push({
        key: 'submit',
        title: t('Problem.Submit'),
        href: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      });
    } else if (isLoggedIn) {
      items.push({
        key: 'submit',
        title: t('Problem.NoPermissionToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    } else {
      items.push({
        key: 'submit',
        title: t('Problem.LoginToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    }
  }

  // Edit-only sidebar in contest mode (ui-default behavior).
  const canEditProblem =
    (pdoc && UserContext?.own?.(pdoc as unknown as { owner?: number }, 16)) ||
    UserContext?.hasPerm?.(16);
  if (canEditProblem) {
    items.push({ key: 'sep-1', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }),
    });
    items.push({
      key: 'files',
      title: t('Problem.Files'),
      href: buildUrl('problem_files', { pid: String(pdoc.docId) }),
    });
  }

  return items;
}

function getHomeworkMenu(ctx: SidebarCtx, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const { pdoc, tdoc, UserContext, buildUrl } = ctx;
  if (!tdoc) return getNormalMenu(ctx, t);
  const items: MenuItem[] = [];

  // ui-default: hide Discussions / Solutions / Files / Statistics for homework
  // rule; only show View Problem + Submit (or "Open in Problem Set" once done).
  const showSubmitArea = mode === 'contest' || mode === 'correction' || mode === 'normal';

  if (showSubmitArea) {
    items.push({
      key: 'view-problem',
      title: t('Problem.ViewProblem'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
    const isLoggedIn = !!UserContext?._id;
    const canSubmit = UserContext?.hasPerm?.(8) ?? false;
    if (canSubmit) {
      items.push({
        key: 'submit',
        title: t('Problem.Submit'),
        href: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      });
    } else if (isLoggedIn) {
      items.push({
        key: 'submit',
        title: t('Problem.NoPermissionToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    } else {
      items.push({
        key: 'submit',
        title: t('Problem.LoginToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    }
  } else {
    // view / done: replace the contest submit block with a single link out.
    items.push({
      key: 'open-in-problem-set',
      title: t('Problem.OpenInProblemSet'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }),
    });
  }

  const canEditProblem =
    (pdoc && UserContext?.own?.(pdoc as unknown as { owner?: number }, 16)) ||
    UserContext?.hasPerm?.(16);
  if (canEditProblem) {
    items.push({ key: 'sep-1', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }),
    });
    items.push({
      key: 'files',
      title: t('Problem.Files'),
      href: buildUrl('problem_files', { pid: String(pdoc.docId) }),
    });
  }

  return items;
}

function pickSidebarItems(ctx: SidebarCtx, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  if (!ctx.tdoc) return getNormalMenu(ctx, t);
  if (ctx.tdoc.rule === 'homework') return getHomeworkMenu(ctx, mode, t);
  return getContestMenu(ctx, mode, t);
}

// ===========================================================================
// Page
// ===========================================================================

export default function ProblemDetailPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const {
    pdoc, rdoc, psdoc, tdoc, tsdoc, owner_udoc,
    tdocs = [], ctdocs = [], htdocs = [],
    discussionCount = 0, solutionCount = 0,
    mode = 'normal', UserContext,
  } = args;
  const buildUrl = useBuildUrl();
  const setUiContext = useSetUiContext();
  const t = useTranslate();

  // --- Bug #10: push problem/t/contest context fields into UiContext using
  // the reactive setter. Downstream slot panels read these via useUiContext().
  useEffect(() => {
    const userCtx = UserContext as unknown as {
      viewLang?: string;
      codeLang?: string;
      codeTemplate?: string;
      canViewRecord?: boolean;
    };
    const canViewRecord = !!(userCtx?.canViewRecord) || !tdoc;
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
      pretestConnUrl: `record-conn?pretest=1&uidOrName=${UserContext?._id ?? ''}&pid=${pdoc.docId}${tdoc ? `&tid=${tdoc.docId}` : ''}`,
    });
  }, [pdoc, tdoc, tsdoc, UserContext, buildUrl, setUiContext]);

  // --- Bug #6: preferred language fallback that respects the available keys
  // in pdoc.content. Mirrors ui-default's i18n lookup chain:
  //   ?lang= → viewLang → viewLang's prefix ('zh' matches 'zh_CN') → first key.
  const preferredLang = useMemo(() => {
    const userLang = (UserContext as unknown as { viewLang?: string })?.viewLang;
    const baseLang = userLang?.split(/[-_]/)[0];
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
    const matchesBase = (lang: string) =>
      !!baseLang && (lang === baseLang || lang.startsWith(`${baseLang}_`));
    return (
      (fromQuery && contentLangs.includes(fromQuery) ? fromQuery : null) ||
      (userLang && contentLangs.includes(userLang) ? userLang : null) ||
      contentLangs.find(matchesBase) ||
      contentLangs[0] ||
      'zh_CN'
    );
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

  const canStar = !tdoc && UserContext?.hasPriv?.(1);
  const sidebarItems = pickSidebarItems(
    {
      pdoc, tdoc, UserContext, buildUrl, discussionCount, solutionCount, psdoc,
    } as SidebarCtx,
    mode,
    t,
  );

  return (
    <>
      <TopNav brand="Hydro" currentRoute="problem_detail">
        <NavLink to="homepage">{t('ProblemDetail.Home')}</NavLink>
        <NavLink to="problem_main">{t('ProblemDetail.Problems')}</NavLink>
        <NavLink to="contest_main">{t('ProblemDetail.Contests')}</NavLink>
      </TopNav>

      <main className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            {rdoc && rdoc.status !== undefined && (
              <Link to="record_detail" params={{ rid: String(rdoc._id) }} className={styles.statusBadge}>
                <span className={`${styles.statusIcon} ${styles[statusClassName(rdoc.status)]}`} />
                <span>{rdoc.score}</span>
              </Link>
            )}
            {canStar && (
              <form action="" method="post" className={styles.starForm}>
                <input type="hidden" name="star" value={psdoc?.star ? 'false' : 'true'} />
                <input type="hidden" name="operation" value="star" />
                <button type="submit" className={`${styles.star} ${psdoc?.star ? styles.starOn : ''}`} aria-label={t('Problem.Star')}>
                  {psdoc?.star ? '★' : '☆'}
                </button>
              </form>
            )}
            <span className={styles.prefix}>{headerPrefix}</span>
            <span>{pdoc.title}</span>
          </h1>

          {tdoc && (tdoc.pids?.length ?? 0) > 1 && (tdoc.pids?.length ?? 0) <= 26 && (
            // > 26: alphabet runs out (Z, AA-...); ui-default同样skip
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

        <ProblemTagRow pdoc={pdoc} mode={mode} tdoc={tdoc} />

        <div className={styles.layout}>
          <article className={styles.content}>
            {contentLangs.length > 1 && (
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
            )}

            <ProblemContent pdoc={pdoc} contentText={contentText} mode={mode} />
            <Article content={contentText} />
          </article>

          <aside className={styles.sidebar}>
            <Menu items={sidebarItems} />
            <InformationCard pdoc={pdoc} owner_udoc={owner_udoc} />
            {(tdocs.length > 0 || ctdocs.length > 0 || htdocs.length > 0) && (
              <RelatedCard tdocs={tdocs} ctdocs={ctdocs} htdocs={htdocs} />
            )}
          </aside>
        </div>
      </main>
    </>
  );
}

function ProblemTagRow({ pdoc, mode, tdoc }: { pdoc: Pdoc; mode: string; tdoc?: Tdoc }) {
  const buildUrl = useBuildUrl();
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

function ProblemContent({ pdoc, contentText, mode }: { pdoc: Pdoc; contentText: string; mode: string }) {
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

function InformationCard({ pdoc, owner_udoc }: { pdoc: Pdoc; owner_udoc?: Udoc }) {
  const t = useTranslate();
  return (
    <div className={styles.infoCard}>
      <h3 className={styles.cardTitle}>{t('Problem.Information')}</h3>
      <dl className={styles.dl}>
        <dt>{t('Common.ID')}</dt><dd>{pdoc.docId}</dd>
        {typeof pdoc.config === 'object' && pdoc.config && (
          <>
            <dt>{t('Common.Time')}</dt>
            <dd>
              {pdoc.config.timeMin === pdoc.config.timeMax
                ? `${pdoc.config.timeMin}ms`
                : `${pdoc.config.timeMin}~${pdoc.config.timeMax}ms`}
            </dd>
            <dt>{t('Problem.Memory')}</dt>
            <dd>
              {pdoc.config.memoryMin === pdoc.config.memoryMax
                ? `${pdoc.config.memoryMin}MB`
                : `${pdoc.config.memoryMin}~${pdoc.config.memoryMax}MB`}
            </dd>
          </>
        )}
        {pdoc.difficulty !== undefined && <><dt>{t('Problem.Difficulty')}</dt><dd>{pdoc.difficulty}</dd></>}
        {pdoc.tag && pdoc.tag.length > 0 && (
          <>
            <dt>{t('Common.Tags')}</dt><dd>{pdoc.tag.join(', ')}</dd>
          </>
        )}
        <dt>{t('Problem.Submissions')}</dt><dd>{pdoc.nSubmit ?? '?'}</dd>
        <dt>{t('Problem.Accepted')}</dt><dd>{pdoc.nAccept ?? '?'}</dd>
        {owner_udoc && <><dt>{t('Problem.UploadedBy')}</dt><dd>{owner_udoc.uname ?? owner_udoc._id}</dd></>}
      </dl>
    </div>
  );
}

function RelatedCard({ tdocs, ctdocs, htdocs }: {
  tdocs: Array<{ docId: string; title: string }>;
  ctdocs: Array<{ docId: string; title: string }>;
  htdocs: Array<{ docId: string; title: string }>;
}) {
  const t = useTranslate();
  return (
    <div className={styles.infoCard}>
      <h3 className={styles.cardTitle}>{t('Problem.Related')}</h3>
      <ul className={styles.relatedList}>
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
