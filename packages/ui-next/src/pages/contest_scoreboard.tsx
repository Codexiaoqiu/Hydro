import { getScoreColor } from '@hydrooj/common';
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { Link } from '../components/link';
import { Select } from '../components/primitives/Select';
import { useBuildUrl } from '../hooks/use-build-url';
import { usePageData } from '../context/page-data';
import { useJsonPoll } from '../hooks/use-json-poll';
import { useTranslate } from '../lib/i18n';
import type { SerializedPdoc, SerializedTdoc, SerializedUser, SerializedUserDict } from '../sections/types';
import styles from './contest_scoreboard.module.css';

export interface ScoreboardCell {
  type: string;
  value: string | number;
  raw?: number | string;
  score?: number;
  hover?: string;
  style?: string;
}

export interface ScoreboardGroup {
  name: string;
  uids: number[];
}

/**
 * Server sends `availableViews` as a plain object: `{ [id: string]: displayName }`
 * (see `scoreboard.getAvailableViews` in `packages/hydrojudge/src/scoreboard*` and the
 * `view, name` shape in `packages/hydrooj/src/handler/contest.ts`). It is *not* an array.
 */
export type ScoreboardAvailableViews = Record<string, string>;

export type ContestScoreboardPageArgs = {
  tdoc?: SerializedTdoc & { owner?: number; unlocked?: boolean };
  tsdoc?: { attend?: 0 | 1 } | null;
  rows?: ScoreboardCell[][];
  udict?: SerializedUserDict;
  pdict?: Record<string, SerializedPdoc>;
  page_name?: 'contest_scoreboard' | 'homework_scoreboard';
  groups?: ScoreboardGroup[];
  availableViews?: ScoreboardAvailableViews;
  scoreboardUrl?: string;
  /**
   * Whether the current viewer is allowed to follow record links in the
   * scoreboard. Mirrors the server-side guard in
   * `packages/hydrooj/src/handler/contest.ts:317` — `canViewRecord` —
   * which is `false` while the contest is still live and not configured to
   * show self records. When false, record cells render as plain text to
   * avoid leaking record ids that the viewer cannot open.
   */
  canViewRecord?: boolean;
};

export type ContestScoreboardPageProps = {
  _pageData?: { name: string; template: string; url: string; args?: ContestScoreboardPageArgs };
};

type FilterKey = 'all' | 'star' | 'rank' | string;

function openStarDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hydro');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readStars(db: IDBDatabase, id: string): Promise<number[]> {
  return new Promise((resolve) => {
    const tx = db.transaction('scoreboard-star', 'readonly');
    const store = tx.objectStore('scoreboard-star');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result?.data ?? []);
    req.onerror = () => resolve([]);
  });
}

async function writeStars(db: IDBDatabase, id: string, data: number[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scoreboard-star', 'readwrite');
    const store = tx.objectStore('scoreboard-star');
    const req = store.put({ id, data });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function readHashFilter(): FilterKey | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('filter=')) return hash.slice(7);
  return null;
}

function writeHashFilter(filter: FilterKey) {
  if (typeof window === 'undefined') return;
  const target = `#filter=${filter}`;
  if (window.location.hash !== target) {
    window.history.replaceState(null, '', target);
  }
}

export default function ContestScoreboardPage({ _pageData }: ContestScoreboardPageProps = {}) {
  const t = useTranslate();
  const buildUrl = useBuildUrl();
  const ctxPageData = usePageData() as { args?: ContestScoreboardPageArgs } | null;
  const pageData = _pageData ?? ctxPageData;
  const args = pageData?.args;

  const [filter, setFilter] = useState<FilterKey>(() => readHashFilter() ?? 'all');
  const [stars, setStars] = useState<number[]>([]);
  const dbRef = useRef<IDBDatabase | null>(null);

  const tdoc = args?.tdoc;
  const initialRows = args?.rows ?? [];
  const tsdoc = args?.tsdoc ?? null;
  const udict = args?.udict ?? {};
  const pdict = args?.pdict ?? {};
  const initialGroups = args?.groups ?? [];
  const initialAvailableViews = args?.availableViews ?? [];
  const pageName = args?.page_name ?? 'contest_scoreboard';
  const scoreboardUrl = args?.scoreboardUrl ?? '';
  // Server-side permission gate for clickable record cells. Default to true
  // so payloads that don't include the field (older tests, simple viewers)
  // don't suddenly hide every link.
  const canViewRecord = args?.canViewRecord !== false;

  const colIndex = useMemo(() => {
    const map: Record<string, number> = {};
    const header = rows[0];
    if (!header) return map;
    header.forEach((c, i) => { if (c.type) map[c.type] = i; });
    return map;
  }, [rows]);

  const userColIdx = colIndex.user;
  const rankColIdx = colIndex.rank;

  const userCtx = (args as Record<string, unknown>)?.UserContext as
    | { _id?: number; own?: (d: { owner?: number | string }) => boolean }
    | undefined;
  const currentUid = userCtx?._id ?? 0;

  const storageId = useMemo(() => {
    if (!tdoc) return '';
    return `${(tdoc as unknown as { domainId?: string }).domainId ?? ''}/${tdoc._id}`;
  }, [tdoc]);

  useEffect(() => {
    if (!storageId || typeof indexedDB === 'undefined') return;
    let cancelled = false;
    (async () => {
      try {
        if (!dbRef.current) dbRef.current = await openStarDb();
        const data = await readStars(dbRef.current, storageId);
        if (!cancelled) setStars(data);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [storageId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHash = () => {
      const next = readHashFilter();
      if (next && next !== filter) setFilter(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [filter]);

  const toggleStar = useCallback(async (uid: number) => {
    setStars((prev) => {
      const next = prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid];
      if (dbRef.current && storageId) {
        writeStars(dbRef.current, storageId, next).catch(() => { /* ignore */ });
      }
      return next;
    });
  }, [storageId]);

  const changeFilter = useCallback((next: FilterKey) => {
    setFilter(next);
    writeHashFilter(next);
  }, []);

  // While the contest is in progress, refetch the scoreboard JSON on a slow
  // cadence so the table keeps ticking without losing the viewer's filter,
  // stars, scroll position, or open dropdown. The legacy implementation
  // called `window.location.reload()` every 3 minutes, which wiped
  // IndexedDB-backed star state and the `#filter=` hash. Use `useJsonPoll`
  // so each tick is a lightweight JSON round-trip and React re-renders the
  // existing rows in place.
  const ongoing = tdoc
    ? (() => {
      const begin = new Date(tdoc.beginAt).getTime();
      const end = new Date(tdoc.endAt).getTime();
      const now = Date.now();
      return begin <= now && now <= end;
    })()
    : false;
  const pollUrl = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}`
    : '';
  const { data: polled, refresh: refreshScoreboard } = useJsonPoll<{
    rows?: ScoreboardCell[][];
    groups?: ScoreboardGroup[];
    availableViews?: ScoreboardAvailableViews;
  }>({
    url: pollUrl,
    enabled: ongoing && !!scoreboardUrl,
    intervalMs: 180_000,
  });
  // Polled data supersedes the SSR snapshot when present; we keep the
  // initial args as the fallback so the very first paint never flickers.
  const rows = polled?.rows ?? initialRows;
  const groups = polled?.groups ?? initialGroups;
  const availableViews = polled?.availableViews ?? initialAvailableViews;

  if (!args || !tdoc || rows.length === 0) {
    return (
      <div className={styles.page} data-page="contest_scoreboard">
        <p className={styles.empty}>{t('Common.Loading')}</p>
      </div>
    );
  }

  const header = rows[0];
  const dataRows = rows.slice(1);
  const dataRowCount = dataRows.length;
  const starSet = new Set(stars);
  const isOwner = !!userCtx?.own?.({ owner: tdoc.owner });

  const visibleRows = useMemo(() => {
    if (filter === 'all') return dataRows;
    if (filter === 'star') {
      return dataRows.filter((row) => {
        const userCell = userColIdx != null ? row[userColIdx] : undefined;
        return userCell?.raw != null && starSet.has(Number(userCell.raw));
      });
    }
    if (filter === 'rank') {
      return dataRows.filter((row) => {
        const rankCell = rankColIdx != null ? row[rankColIdx] : undefined;
        return rankCell?.value !== '0';
      });
    }
    const uids = filter.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
    if (uids.length === 0) return [];
    const uidSet = new Set(uids);
    return dataRows.filter((row) => {
      const userCell = userColIdx != null ? row[userColIdx] : undefined;
      return userCell?.raw != null && uidSet.has(Number(userCell.raw));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, dataRows, userColIdx, rankColIdx, stars]);

  const isLocked = useMemo(() => {
    if (!tdoc.lockAt) return false;
    // Honor `tdoc.unlocked`: once the owner clicks "Unlock" on the scoreboard
    // (`ContestScoreboardHandler.post('unlock')` in handler/contest.ts:989),
    // the server stamps `unlocked=true` and the freeze banner must disappear
    // even though `lockAt` is still in the past. Without this gate the ui
    // side would keep showing the banner and the unlock button stacked on
    // top of each other indefinitely.
    if (tdoc.unlocked) return false;
    const lock = new Date(tdoc.lockAt).getTime();
    return Date.now() >= lock;
  }, [tdoc.lockAt, tdoc.unlocked]);

  const typePrefix = pageName === 'homework_scoreboard' ? 'homework' : 'contest';

  return (
    <div className={styles.page} data-page="contest_scoreboard">
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <ContestBackLink tdoc={tdoc} />
          <h1 className={styles.title}>{tdoc.title}</h1>
        </div>
        <div className={styles.tools}>
          <Select
            value={filter}
            onChange={(value) => changeFilter(value)}
            ariaLabel={t('Common.All')}
            options={[
              { value: 'all', label: t('ContestScoreboard.FilterAll') },
              { value: 'star', label: t('ContestScoreboard.FilterStar') },
              { value: 'rank', label: t('ContestScoreboard.FilterRanked') },
              ...groups.map((g) => ({ value: g.uids.join(','), label: g.name })),
            ]}
          />
        </div>
      </div>

      <div className={styles.exports}>
        {(['HTML', 'CSV', 'Ghost'] as const).map((ext) => (
          <a
            key={ext}
            className={styles.exportBtn}
            href={buildUrl(`${typePrefix}_scoreboard_view`, { tid: tdoc.docId, view: ext.toLowerCase() })}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('ContestScoreboard.ExportAs').replace('{0}', ext)}
          </a>
        ))}
        {Object.entries(availableViews ?? {})
          .filter(([id]) => !['html', 'csv', 'default', 'ghost'].includes(id))
          .map(([id, name]) => (
            <a
              key={id}
              className={styles.exportBtn}
              href={buildUrl(`${typePrefix}_scoreboard_view`, { tid: tdoc.docId, view: id })}
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
            </a>
          ))}
        {isLocked && isOwner && (
          <form method="POST" className={styles.unlockForm}>
            <input type="hidden" name="operation" value="unlock" />
            <button type="submit" className={styles.unlockBtn}>
              {t('ContestScoreboard.Unlock')}
            </button>
          </form>
        )}
      </div>

      {isLocked && (
        <div className={styles.lockBanner}>
          {t('ContestScoreboard.WaitUnfreeze')}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            {header.map((c, i) => (
              <col key={i} className={styles[`col_${c.type}`] ?? styles.colDefault} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {header.map((c, i) => {
                if (c.type === 'problem' && c.raw != null) {
                  const pdoc = pdict[String(c.raw)];
                  return (
                    <th key={i} className={styles[`col_${c.type}`]}>
                      <Link
                        to="problem_detail"
                        params={{ pid: String(c.raw) }}
                        searchParams={{ tid: tdoc.docId }}
                        data-tooltip={pdoc?.title}
                        className={styles.problemHead}
                      >
                        {String(c.value)}
                        <br />
                        <span className={styles.problemStats}>
                          {pdoc?.nAccept ?? 0}/{pdoc?.nSubmit ?? 0}
                        </span>
                      </Link>
                    </th>
                  );
                }
                return (
                  <th key={i} className={styles[`col_${c.type}`]}>
                    {String(c.value)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={header.length} className={styles.empty}>
                  {t('ContestScoreboard.NoRows')}
                </td>
              </tr>
            ) : (
              visibleRows.map((row, ri) => {
                const userCell = userColIdx != null ? row[userColIdx] : undefined;
                const uid = userCell?.raw != null ? Number(userCell.raw) : 0;
                const starred = starSet.has(uid);
                const ownerRow = currentUid === uid;
                const rowCls = `${styles.dataRow} ${starred ? styles.starredRow : ''} ${ownerRow ? styles.ownerRow : ''}`.trim();
                return (
                  <tr key={ri} className={rowCls}>
                    {row.map((cell, ci) => {
                      const tdCls = `${styles[`col_${cell.type}`] ?? styles.colDefault} ${cell.style ? styles.styled : ''}`.trim();
                      if (cell.type === 'rank') {
                        const unrank = cell.value === '0';
                        return (
                          <td key={ci} className={tdCls}>
                            <span className={unrank ? styles.rankUnrank : styles.rankNormal}>
                              {unrank ? '*' : String(cell.value)}
                            </span>
                          </td>
                        );
                      }
                      if (cell.type === 'user') {
                        const u = udict[uid] ?? null;
                        return (
                          <td key={ci} className={tdCls}>
                            <button
                              type="button"
                              className={`${styles.star} ${starred ? styles.starActive : ''}`}
                              data-uid={uid}
                              onClick={() => toggleStar(uid)}
                              aria-label={starred ? t('ContestScoreboard.Unstar') : t('ContestScoreboard.Star')}
                            >
                              <span aria-hidden="true">{starred ? '★' : '☆'}</span>
                            </button>
                            {u ? <UserInline user={u} /> : <span>—</span>}
                          </td>
                        );
                      }
                      if (cell.type === 'record') {
                        const rid = cell.raw;
                        const color = getScoreColor(cell.score ?? Number(cell.value));
                        const content = (
                          <span style={{ color, fontWeight: 600 }}>{String(cell.value)}</span>
                        );
                        // Match `UiHandler.canViewRecord` (handler/contest.ts:317):
                        // when the server says the viewer cannot open record
                        // links, never emit the `<Link>` — otherwise the URL
                        // would deep-link into a record the user cannot read,
                        // and the id leaks through the DOM.
                        const mayLink = canViewRecord && rid;
                        return (
                          <td key={ci} className={tdCls}>
                            {mayLink ? (
                              <Link to="record_detail" params={{ rid: String(rid) }}>{content}</Link>
                            ) : (
                              content
                            )}
                          </td>
                        );
                      }
                      if (cell.type === 'records' && Array.isArray(cell.raw)) {
                        return (
                          <td key={ci} className={tdCls}>
                            {(cell.raw as Array<{ raw?: string; value: string | number; score?: number }>).map((r, k) => {
                              const color = getScoreColor(r.score ?? Number(r.value));
                              const inner = (
                                <span style={{ color, fontWeight: 600 }}>{String(r.value)}</span>
                              );
                              // Apply the same canViewRecord gate to the
                              // multi-record cell so a partial reveal does
                              // not leak a single rid.
                              const mayLink = canViewRecord && r.raw;
                              return (
                                <span key={k}>
                                  {k > 0 ? '/' : ''}
                                  {mayLink ? (
                                    <Link to="record_detail" params={{ rid: String(r.raw) }}>{inner}</Link>
                                  ) : (
                                    inner
                                  )}
                                </span>
                              );
                            })}
                          </td>
                        );
                      }
                      return (
                        <td key={ci} className={tdCls}>
                          {cell.hover ? (
                            <span title={cell.hover}>{String(cell.value)}</span>
                          ) : (
                            String(cell.value)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.summary}>
        {t('ContestScoreboard.RowSummary')
          .replace('{visible}', String(visibleRows.length))
          .replace('{total}', String(dataRowCount))}
      </p>
    </div>
  );
}

function UserInline({ user }: { user: SerializedUser }) {
  return (
    <span className={styles.userInline}>
      {user.avatarUrl && (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img src={user.avatarUrl} alt="" className={styles.userAvatar} />
      )}
      <a className={styles.userLink} href={`/user/${user.uname}`}>
        {user.displayName || user.uname}
      </a>
    </span>
  );
}