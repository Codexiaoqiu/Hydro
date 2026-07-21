import { getScoreColor } from '@hydrooj/common';
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Link } from '../components/link';
import { Select } from '../components/primitives/Select';
import { useBuildUrl } from '../hooks/use-build-url';
import { usePageData } from '../context/page-data';
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
  tdoc?: SerializedTdoc & { owner?: number };
  tsdoc?: { attend?: 0 | 1 } | null;
  rows?: ScoreboardCell[][];
  udict?: SerializedUserDict;
  pdict?: Record<string, SerializedPdoc>;
  page_name?: 'contest_scoreboard' | 'homework_scoreboard';
  groups?: ScoreboardGroup[];
  availableViews?: ScoreboardAvailableViews;
  scoreboardUrl?: string;
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
  const rows = args?.rows ?? [];
  const tsdoc = args?.tsdoc ?? null;
  const udict = args?.udict ?? {};
  const pdict = args?.pdict ?? {};
  const groups = args?.groups ?? [];
  const availableViews = args?.availableViews ?? [];
  const pageName = args?.page_name ?? 'contest_scoreboard';
  const scoreboardUrl = args?.scoreboardUrl ?? '';

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

  useEffect(() => {
    if (!tdoc || !scoreboardUrl) return;
    const begin = new Date(tdoc.beginAt).getTime();
    const end = new Date(tdoc.endAt).getTime();
    const tick = () => {
      const now = Date.now();
      if (begin <= now && now <= end) {
        window.location.reload();
      }
    };
    const id = window.setInterval(tick, 180_000);
    return () => window.clearInterval(id);
  }, [tdoc, scoreboardUrl]);

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
    const lock = new Date(tdoc.lockAt).getTime();
    return Date.now() >= lock;
  }, [tdoc.lockAt]);

  const typePrefix = pageName === 'homework_scoreboard' ? 'homework' : 'contest';

  return (
    <div className={styles.page} data-page="contest_scoreboard">
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <Link to="contest_detail" params={{ tid: tdoc.docId }} className={styles.backLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t('ContestScoreboard.BackToContest')}</span>
          </Link>
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
                        return (
                          <td key={ci} className={tdCls}>
                            {rid ? (
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
                              return (
                                <span key={k}>
                                  {k > 0 ? '/' : ''}
                                  {r.raw ? (
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