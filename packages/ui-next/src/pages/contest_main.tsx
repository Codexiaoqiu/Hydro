import { useMemo, useState } from 'react';
import { Chip } from '../components/primitives/Chip';
import { Card } from '../components/primitives/Card';
import { Eyebrow } from '../components/primitives/Eyebrow';
import { Select } from '../components/primitives/Select';
import { CtaCard } from '../components/sidebar/CtaCard';
import { Link } from '../components/link';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useBuildUrl } from '../hooks/use-build-url';
import { isDone, isOngoing, isUpcoming, renderDuration } from '../lib/contest-status';
import { KNOWN_RULES, rulesFromTdocs } from '../lib/contest-flags';
import { formatDateTime } from '../lib/datetime';
import { useTranslate } from '../lib/i18n';
import { canCreateContest } from '../lib/perms';
import { ruleText } from '../lib/rule-text';
import type { SerializedContestStatusDoc, SerializedTdoc } from '../sections/types';
import styles from './contest_main.module.css';

const PAGE_SIZE = 20;

type Translate = ReturnType<typeof useTranslate>;
type BuildUrl = ReturnType<typeof useBuildUrl>;

interface ContestArgs {
  UserContext?: Record<string, any>;
  UiContext?: Record<string, any>;
  page?: number;
  tpcount?: number;
  qs?: string;
  rule?: string;
  group?: string;
  q?: string;
  groups?: string[];
  tdocs?: SerializedTdoc[];
  tsdict?: Record<string, SerializedContestStatusDoc>;
}

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function HeaderRow({ t }: { t: Translate }) {
  return (
    <div className={styles.headerRow}>
      <div className={styles.crumbs}>
        <Eyebrow dot={false}>{t('ContestMain.Crumbs')}</Eyebrow>
      </div>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-xl)',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        margin: 0,
      }}
      >
        {t('ContestMain.Title')}
      </h3>
    </div>
  );
}

interface ToolbarProps {
  initialQ: string;
  rule: string;
  group: string;
  groups: string[];
  rulesOptions: typeof KNOWN_RULES;
}

function Toolbar({ initialQ, rule, group, groups, rulesOptions }: ToolbarProps) {
  const t = useTranslate();
  const navigate = useNavigate();
  const buildUrl = useBuildUrl();
  const [query, setQuery] = useState(initialQ);

  const goWith = (next: { q?: string; rule?: string; group?: string }) => {
    const finalQ = next.q !== undefined ? next.q : query;
    const finalRule = next.rule !== undefined ? next.rule : rule;
    const finalGroup = next.group !== undefined ? next.group : group;
    const params: Record<string, string> = {};
    if (finalQ) params.q = finalQ;
    if (finalRule) params.rule = finalRule;
    if (finalGroup) params.group = finalGroup;
    void navigate(buildUrl('contest_main', {}, params));
  };

  return (
    <div className={styles.toolbar}>
      <form
        className={styles.toolbarRow}
        onSubmit={(event) => {
          event.preventDefault();
          goWith({});
        }}
      >
        <label className={styles.search}>
          <SearchIcon />
          <input
            type="text"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('ContestMain.SearchPlaceholder')}
            aria-label={t('ContestMain.SearchAria')}
          />
        </label>
        <Select
          value={rule}
          onChange={(value) => goWith({ rule: value })}
          ariaLabel={t('ContestMain.RuleAria')}
          options={[
            { value: '', label: t('ContestMain.AllRules') },
            ...rulesOptions.map((item) => ({ value: item.key, label: item.label })),
          ]}
        />
        <Select
          value={group}
          onChange={(value) => goWith({ group: value })}
          ariaLabel={t('ContestMain.GroupAria')}
          options={[
            { value: '', label: t('ContestMain.AllGroups') },
            ...groups.map((item) => ({ value: item, label: item })),
          ]}
        />
      </form>
    </div>
  );
}

function EmptyState({ t }: { t: Translate }) {
  return <div className={styles.empty}>{t('ContestMain.NoContests')}</div>;
}

function contestDay(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', { day: 'numeric' }).format(new Date(iso));
}

interface HeroBannerProps {
  tdoc: SerializedTdoc;
  tsdoc?: SerializedContestStatusDoc;
  variant: 'live' | 'ready';
}

function HeroBanner({ tdoc, tsdoc, variant }: HeroBannerProps) {
  const t = useTranslate();
  const start = tsdoc?.startAt ?? tdoc.beginAt;
  const attended = tsdoc?.attend === 1;

  return (
    <Link
      to="contest_detail"
      params={{ tid: tdoc.docId }}
      className={`${styles.hero} ${variant === 'live' ? styles.heroLive : styles.heroReady}`}
    >
      <div>
        <div className={styles.heroBadge}>
          {variant === 'live' ? t('ContestMain.LiveBadge') : t('ContestMain.ReadyBadge')}
        </div>
        <h3 className={styles.heroTitle}>{tdoc.title}</h3>
        <ul className={styles.heroMeta}>
          <li><span className={styles.heroMetaLabel}>{t('ContestMain.RuleLabel')}</span>{ruleText(tdoc.rule)}</li>
          <li><span className={styles.heroMetaLabel}>{t('ContestMain.StartLabel')}</span>{formatDateTime(start)}</li>
          <li><span className={styles.heroMetaLabel}>{t('ContestMain.DurationLabel')}</span>{renderDuration(tdoc)} {t('ContestMain.HoursUnit')}</li>
          <li><span className={styles.heroMetaLabel}>{t('ContestMain.ParticipantsLabel')}</span>{tdoc.attend ?? 0}</li>
        </ul>
      </div>
      <div className={styles.heroRight}>
        <span className={`${styles.heroBtn} ${variant === 'live' ? styles.heroBtnLive : styles.heroBtnReady}`}>
          {t('ContestMain.ViewDetails')}
        </span>
        <div className={styles.heroStatus}>
          {attended
            ? <><span aria-hidden="true">✓</span> {t('ContestMain.Attended')}</>
            : <><span aria-hidden="true">○</span> {t('ContestMain.NotAttended')}</>}
        </div>
      </div>
    </Link>
  );
}

interface ContestRowProps {
  tdoc: SerializedTdoc;
  tsdoc?: SerializedContestStatusDoc;
  now: number;
}

function ContestRow({ tdoc, tsdoc, now }: ContestRowProps) {
  const t = useTranslate();
  const ongoing = isOngoing(tdoc, now);
  const upcoming = isUpcoming(tdoc, 7, now);
  const done = !ongoing && !upcoming && isDone(tdoc, now);
  const attended = tsdoc?.attend === 1;
  const ruleClass = (styles as Record<string, string | undefined>)[`rule_${tdoc.rule}`] ?? '';

  return (
    <div className={`${styles.row} ${ruleClass}`} data-rule={tdoc.rule}>
      <div className={styles.dateBlock}>
        <div className={styles.dateDay}>{contestDay(tdoc.beginAt)}</div>
      </div>
      <div className={styles.body}>
        <Link to="contest_detail" params={{ tid: tdoc.docId }} className={styles.titleLink}>
          {tdoc.title}
        </Link>
        <ul className={styles.meta}>
          <li><Chip variant="tag">{ruleText(tdoc.rule)}</Chip></li>
          {tdoc.rated && <li><Chip variant="diff">Rated</Chip></li>}
          <li className={styles.divider} aria-hidden="true" />
          <li className={styles.text}>{renderDuration(tdoc)} {t('ContestMain.HoursUnit')}</li>
          <li className={styles.text}>{tdoc.attend ?? 0} {t('ContestMain.ParticipantsShort')}</li>
          {ongoing && <li><Chip variant="ongoing">{t('ContestMain.Ongoing')}</Chip></li>}
          {upcoming && <li><Chip variant="upcoming">{t('ContestMain.Upcoming')}</Chip></li>}
          {done && <li><Chip variant="ended">{t('ContestMain.Ended')}</Chip></li>}
          {attended && <li><Chip variant="diff">{t('ContestMain.Attended')}</Chip></li>}
        </ul>
      </div>
    </div>
  );
}

interface PagerProps {
  page: number;
  tpcount: number;
  qs: string;
  rule: string;
  group: string;
  q: string;
  buildUrl: BuildUrl;
}

function Pager({ page, tpcount, qs, rule, group, q, buildUrl }: PagerProps) {
  const t = useTranslate();
  const pageCount = Math.ceil(tpcount / PAGE_SIZE);
  if (pageCount <= 1) return null;

  const paramsFor = (targetPage: number): Record<string, string> => {
    const params: Record<string, string> = {};
    if (qs) {
      for (const [key, value] of new URLSearchParams(qs).entries()) {
        if (key !== 'page' && value) params[key] = value;
      }
    }
    if (q) params.q = q;
    if (rule) params.rule = rule;
    if (group) params.group = group;
    params.page = String(targetPage);
    return params;
  };

  const items: Array<number | 'gap'> = [];
  const window = 1;
  if (pageCount <= 7) {
    for (let current = 1; current <= pageCount; current++) items.push(current);
  } else {
    items.push(1);
    if (page - window > 2) items.push('gap');
    for (let current = Math.max(2, page - window); current <= Math.min(pageCount - 1, page + window); current++) {
      items.push(current);
    }
    if (page + window < pageCount - 1) items.push('gap');
    items.push(pageCount);
  }

  return (
    <nav className={styles.pager} aria-label={t('ContestMain.PagerAria')}>
      {items.map((item, index) => {
        if (item === 'gap') return <span key={`gap-${index}`} className={styles.pagerGap}>…</span>;
        return (
          <Link
            key={item}
            href={buildUrl('contest_main', {}, paramsFor(item))}
            className={`${styles.pagerItem} ${item === page ? styles.pagerActive : ''}`}
          >
            {item}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ContestMain() {
  const pageData = usePageData() as any;
  const args = (pageData?.args ?? {}) as ContestArgs;
  const t = useTranslate();
  const buildUrl = useBuildUrl();
  const navigate = useNavigate();

  const tdocs = Array.isArray(args.tdocs) ? args.tdocs : [];
  const tsdict = (args.tsdict ?? {}) as Record<string, SerializedContestStatusDoc>;
  const page = Math.max(1, Number(args.page) || 1);
  const tpcount = Math.max(0, Number(args.tpcount) || 0);
  const qs = String(args.qs ?? '');
  const rule = String(args.rule ?? '');
  const group = String(args.group ?? '');
  const q = String(args.q ?? '');
  const groups = Array.isArray(args.groups) ? args.groups : [];
  const now = useMemo(() => Date.now(), []);

  const ongoing = useMemo(() => tdocs.filter((tdoc) => isOngoing(tdoc, now)), [tdocs, now]);
  const upcoming = useMemo(
    () => tdocs.filter((tdoc) => isUpcoming(tdoc, 7, now) && !isOngoing(tdoc, now)),
    [tdocs, now],
  );
  const rulesOptions = useMemo(() => rulesFromTdocs(tdocs), [tdocs]);
  const createHref = buildUrl('contest_create', {});

  return (
    <div className={styles.shell}>
      <main style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {ongoing.slice(0, 1).map((tdoc) => (
          <HeroBanner key={`live-${tdoc.docId}`} tdoc={tdoc} tsdoc={tsdict[tdoc.docId]} variant="live" />
        ))}
        {upcoming.slice(0, 1).map((tdoc) => (
          <HeroBanner key={`ready-${tdoc.docId}`} tdoc={tdoc} tsdoc={tsdict[tdoc.docId]} variant="ready" />
        ))}

        <Card variant="default" header={<HeaderRow t={t} />}>
          <Toolbar
            initialQ={q}
            rule={rule}
            group={group}
            groups={groups}
            rulesOptions={rulesOptions}
          />
          {tdocs.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <>
              <div className={styles.list}>
                {tdocs.map((tdoc) => (
                  <ContestRow key={tdoc.docId} tdoc={tdoc} tsdoc={tsdict[tdoc.docId]} now={now} />
                ))}
              </div>
              <Pager page={page} tpcount={tpcount} qs={qs} rule={rule} group={group} q={q} buildUrl={buildUrl} />
            </>
          )}
        </Card>
      </main>

      <aside className={styles.sidebar}>
        {canCreateContest(args.UserContext) && (
          <Card variant="side">
            <CtaCard
              title={t('ContestMain.SidebarCreateTitle')}
              subtitle={t('ContestMain.SidebarCreateSubtitle')}
              actionLabel={t('ContestMain.SidebarCreateAction')}
              onAction={() => void navigate(createHref !== '#' ? createHref : '/contest/create')}
            />
          </Card>
        )}
      </aside>
    </div>
  );
}
