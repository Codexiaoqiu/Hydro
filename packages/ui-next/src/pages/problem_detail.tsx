import { useEffect, useMemo } from 'react';
import { STATUS } from '@hydrooj/common';
import { usePageData, useSetPageData, useUiContext } from '../context/page-data';
import { Link } from '../components/link';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Alert, Chip, Eyebrow } from '../components/primitives';
import { Article } from '../components/article/Article';
import { Menu, type MenuItem } from '../components/sidebar/Menu';
import { useBuildUrl } from '../hooks/use-build-url';
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
  config?: { type?: string; subType?: string; timeMin?: number; timeMax?: number; memoryMin?: number; memoryMax?: number; langs?: string[]; [k: string]: unknown } | string;
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

export default function ProblemDetailPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { pdoc, rdoc, psdoc, tdoc, tsdoc, owner_udoc, tdocs = [], ctdocs = [], htdocs = [],
    discussionCount = 0, solutionCount = 0, mode = 'normal', UserContext } = args;
  const buildUrl = useBuildUrl();
  const ui = useUiContext();

  // Mirror UiContext fields so Section 4 hooks can read them.
  useEffect(() => {
    Object.assign(ui as Record<string, unknown>, {
      problemId: pdoc.pid ?? pdoc.docId,
      problemNumId: pdoc.docId,
      codeLang: (UserContext as unknown as { codeLang?: string })?.codeLang,
      codeTemplate: (UserContext as unknown as { codeTemplate?: string })?.codeTemplate,
      pdoc,
      tdoc, tsdoc,
      canViewRecord: !tdoc || true,
      postSubmitUrl: buildUrl('problem_submit', { pid: String(pdoc.docId) }, tdoc ? { tid: String(tdoc.docId ?? '') } : {}),
      getSubmissionsUrl: buildUrl('record_main', {}, { pid: String(pdoc.docId), fullStatus: 'true', ...(tdoc ? { tid: String(tdoc.docId ?? '') } : {}) }),
      getRecordDetailUrl: buildUrl('record_detail', { rid: '{rid}' }, tdoc ? { tid: String(tdoc.docId ?? '') } : {}),
      pretestConnUrl: `record-conn?pretest=1&uidOrName=${UserContext?._id ?? ''}&pid=${pdoc.docId}${tdoc ? `&tid=${tdoc.docId}` : ''}`,
    });
  }, [pdoc, tdoc, tsdoc, UserContext, buildUrl, ui]);

  const preferredLang = (() => {
    if (typeof window === 'undefined') return 'zh_CN';
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get('lang');
    return fromQuery || (UserContext as unknown as { viewLang?: string })?.viewLang || 'zh_CN';
  })();

  const contentText = useMemo(() => {
    if (typeof pdoc.content === 'string') return pdoc.content;
    if (pdoc.content && typeof pdoc.content === 'object') {
      return pdoc.content[preferredLang] ?? Object.values(pdoc.content)[0] ?? '';
    }
    return '';
  }, [pdoc.content, preferredLang]);

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
  const isLoggedIn = !!UserContext?._id;
  const canSubmit = UserContext?.hasPerm?.(8) ?? false;
  const canRejudge = UserContext?.hasPerm?.(4096) ?? false;
  const canViewDiscussion = UserContext?.hasPerm?.(256) ?? false;
  const canEditProblem =
    (pdoc && UserContext?.own?.(pdoc as unknown as { owner?: number }, 16)) ||
    UserContext?.hasPerm?.(16);
  const psdocAccepted = psdoc?.status === 0;
  const canViewSolution =
    UserContext?.hasPerm?.(1) ||
    (UserContext?.hasPerm?.(2) && psdocAccepted);

  return (
    <>
      <TopNav brand="Hydro" currentRoute="problem_detail">
        <NavLink to="homepage">Home</NavLink>
        <NavLink to="problem_main">Problems</NavLink>
        <NavLink to="contest_main">Contests</NavLink>
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
                <button type="submit" className={`${styles.star} ${psdoc?.star ? styles.starOn : ''}`} aria-label="Star">
                  {psdoc?.star ? '★' : '☆'}
                </button>
              </form>
            )}
            <span className={styles.prefix}>{headerPrefix}</span>
            <span>{pdoc.title}</span>
          </h1>

          {tdoc && (tdoc.pids?.length ?? 0) > 1 && (tdoc.pids?.length ?? 0) <= 26 && (
            <nav className={styles.contestNav}>
              {tdoc.pids?.map((pid, i) => {
                const status = tsdoc?.detail?.[String(pid)]?.status;
                const pass = status === 0;
                const fail = status !== undefined && !pass;
                return (
                  <Link
                    key={String(pid)}
                    to="problem_detail"
                    params={{ pid: String(pid) }}
                    className={`${styles.contestNavItem} ${pass ? styles.contestNavPass : fail ? styles.contestNavFail : ''}`}
                  >
                    {getAlphabeticId(i)}
                  </Link>
                );
              })}
            </nav>
          )}
        </header>

        <ProblemTagRow pdoc={pdoc} mode={mode} />

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
            <Menu
              items={[
                canSubmit && {
                  key: 'submit',
                  title: isLoggedIn ? 'Submit' : 'Login to submit',
                  href: buildUrl('problem_submit', { pid: String(pdoc.docId) }),
                },
                canRejudge && {
                  key: 'rejudge',
                  title: 'Rejudge all submissions',
                  form: true,
                  action: '',
                  postBody: { operation: 'rejudge' },
                },
                (canViewDiscussion || canViewSolution) && { key: 'sep-1', separator: true },
                canViewDiscussion && {
                  key: 'discussions',
                  title: `Discussions (${discussionCount})`,
                  href: buildUrl('discussion_main'),
                },
                canViewSolution && {
                  key: 'solutions',
                  title: `Solutions (${solutionCount})`,
                  href: buildUrl('problem_solution', { pid: String(pdoc.docId) }),
                },
                { key: 'files', title: 'Files', href: buildUrl('problem_files', { pid: String(pdoc.docId) }) },
                { key: 'statistics', title: 'Statistics', href: buildUrl('problem_statistics', { pid: String(pdoc.docId) }) },
                canEditProblem && { key: 'sep-2', separator: true },
                canEditProblem && {
                  key: 'edit',
                  title: 'Edit',
                  href: buildUrl('problem_edit', { pid: String(pdoc.docId) }),
                },
                canEditProblem && !pdoc.reference && {
                  key: 'judge-config',
                  title: 'Judge config',
                  href: buildUrl('problem_config', { pid: String(pdoc.docId) }),
                },
              ].filter(Boolean) as never}
            />
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

function ProblemTagRow({ pdoc, mode }: { pdoc: Pdoc; mode: string }) {
  const buildUrl = useBuildUrl();
  const items: React.ReactNode[] = [];

  if (mode === 'normal') {
    items.push(<span key="docId"><Eyebrow>ID</Eyebrow> {pdoc.docId}</span>);
  }
  if (pdoc.config && typeof pdoc.config === 'object' && pdoc.config.type) {
    items.push(<span key="type"><Eyebrow>Type</Eyebrow> {pdoc.config.type}{pdoc.config.subType ? ` · ${pdoc.config.subType}` : ''}</span>);
  }
  if (pdoc.config && typeof pdoc.config === 'object' && pdoc.config.type === 'default' && pdoc.config.subType) {
    items.push(<span key="fileio"><Eyebrow>File IO</Eyebrow> {String(pdoc.config.subType)}</span>);
  }
  const cfg = (typeof pdoc.config === 'object' ? pdoc.config : null) as { timeMin?: number; timeMax?: number; memoryMin?: number; memoryMax?: number; langs?: string[]; type?: string } | null;
  if (cfg && cfg.type !== 'objective' && cfg.type !== 'submit_answer') {
    if (cfg.timeMin !== undefined && cfg.timeMax !== undefined) {
      items.push(<span key="time"><Eyebrow>Time</Eyebrow> {cfg.timeMin === cfg.timeMax ? `${cfg.timeMin}ms` : `${cfg.timeMin}~${cfg.timeMax}ms`}</span>);
    }
    if (cfg.memoryMin !== undefined && cfg.memoryMax !== undefined) {
      items.push(<span key="mem"><Eyebrow>Memory</Eyebrow> {cfg.memoryMin === cfg.memoryMax ? `${cfg.memoryMin}MB` : `${cfg.memoryMin}~${cfg.memoryMax}MB`}</span>);
    }
  }
  if (mode === 'normal') {
    items.push(<Link key="tried" to="record_main" searchParams={{ pid: String(pdoc.docId) }}><Eyebrow>Tried</Eyebrow> {pdoc.nSubmit ?? '?'}</Link>);
    items.push(<span key="acc"><Eyebrow>Accepted</Eyebrow> {pdoc.nAccept ?? '?'}</span>);
  }
  if (pdoc.difficulty !== undefined) {
    items.push(<span key="diff"><Eyebrow>Difficulty</Eyebrow> {pdoc.difficulty}</span>);
  }
  if (pdoc.tag && pdoc.tag.length > 0) {
    items.push(...pdoc.tag.map((t) => <Chip key={t} variant="tag">{t}</Chip>));
  }
  return <div className={styles.tagRow}>{items}</div>;
}

function ProblemContent({ pdoc, contentText, mode }: { pdoc: Pdoc; contentText: string; mode: string }) {
  const cfg = (typeof pdoc.config === 'object' ? pdoc.config : null) as { langs?: string[] } | null;
  const configError = typeof pdoc.config === 'string';
  const noData = !pdoc.data || (Array.isArray(pdoc.data) && pdoc.data.length === 0);
  const noLangs = !!cfg && Array.isArray(cfg.langs) && cfg.langs.length === 0;
  return (
    <>
      {noData && !pdoc.reference && (
        <Alert variant="warn" title="No testdata" message="This problem has no testdata uploaded yet, so submissions cannot be judged." />
      )}
      {configError && (
        <Alert variant="error" title="Configuration error" message={String(pdoc.config)} />
      )}
      {noLangs && (
        <Alert variant="warn" title="No submission language" message="No submission language is available for this problem." />
      )}
      {mode === 'view' && (
        <Alert variant="info" title="Contest ended" message="You cannot submit for this problem because the contest is ended. Open it in the problem set instead." />
      )}
      {mode === 'correction' && (
        <Alert variant="info" title="Correction submissions" message="The contest is ended. New submissions will be treated as correction submissions and will not be counted in the contest." />
      )}
      {!contentText && !configError && (
        <Alert variant="info" title="Statement pending" message="The problem statement has not been written yet." />
      )}
    </>
  );
}

function InformationCard({ pdoc, owner_udoc }: { pdoc: Pdoc; owner_udoc?: Udoc }) {
  return (
    <div className={styles.infoCard}>
      <h3 className={styles.cardTitle}>Information</h3>
      <dl className={styles.dl}>
        <dt>ID</dt><dd>{pdoc.docId}</dd>
        {typeof pdoc.config === 'object' && pdoc.config && (
          <>
            <dt>Time</dt>
            <dd>
              {pdoc.config.timeMin === pdoc.config.timeMax
                ? `${pdoc.config.timeMin}ms`
                : `${pdoc.config.timeMin}~${pdoc.config.timeMax}ms`}
            </dd>
            <dt>Memory</dt>
            <dd>
              {pdoc.config.memoryMin === pdoc.config.memoryMax
                ? `${pdoc.config.memoryMin}MB`
                : `${pdoc.config.memoryMin}~${pdoc.config.memoryMax}MB`}
            </dd>
          </>
        )}
        {pdoc.difficulty !== undefined && <><dt>Difficulty</dt><dd>{pdoc.difficulty}</dd></>}
        {pdoc.tag && pdoc.tag.length > 0 && (
          <>
            <dt>Tags</dt><dd>{pdoc.tag.join(', ')}</dd>
          </>
        )}
        <dt>Submissions</dt><dd>{pdoc.nSubmit ?? '?'}</dd>
        <dt>Accepted</dt><dd>{pdoc.nAccept ?? '?'}</dd>
        {owner_udoc && <><dt>Uploaded By</dt><dd>{owner_udoc.uname ?? owner_udoc._id}</dd></>}
      </dl>
    </div>
  );
}

function RelatedCard({ tdocs, ctdocs, htdocs }: { tdocs: Array<{ docId: string; title: string }>; ctdocs: Array<{ docId: string; title: string }>; htdocs: Array<{ docId: string; title: string }> }) {
  return (
    <div className={styles.infoCard}>
      <h3 className={styles.cardTitle}>Related</h3>
      <ul className={styles.relatedList}>
        {tdocs.map((t) => (
          <li key={t.docId}><Link to="training_detail" params={{ tid: t.docId }}>{t.title}</Link></li>
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