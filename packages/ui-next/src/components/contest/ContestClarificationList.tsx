import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import { useTranslate } from '../../lib/i18n';
import { formatDateTime, objectIdTime } from '../../lib/datetime';
import styles from './ContestClarificationList.module.css';

export interface ClarItem {
  _id: string;
  subject: number;
  owner: number;
  content: string;
  reply?: Array<{ owner: number; content: string }>;
}

export interface ContestClarificationListProps {
  items: ClarItem[];
  pids: number[];
  pdict: Record<number, { docId?: number; title?: string }>;
  udict: Record<string, { _id: number; uname: string }>;
  /** Viewer's uid; Reply is hidden on items owned by this user. Defaults to 0. */
  currentUid?: number;
  onReply: (did: string) => void;
}

// Server serialises subjects as integer codes — keep the lookup keyed on a
// stable string form so `0` and `-1` never collide by accident.
const SUBJECT_KEYS: Record<string, string> = {
  '-1': 'ContestClarification.SubjectTechnical',
  '0': 'ContestClarification.SubjectGeneral',
};

// Port of `getAlphabeticId` from ui-default: 0 -> A, 25 -> Z, 26 -> AA, 27 -> AB, ...
function pidToLetters(index: number): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function renderSubject(
  it: ClarItem,
  pids: number[],
  pdict: Record<number, { docId?: number; title?: string }>,
  t: (key: string, args?: Record<string, unknown>) => string,
): string {
  // Problem subject (idx>=1): show "A. <title>" using alphabetic id.
  if (it.subject > 0) {
    const idx = pids.indexOf(it.subject);
    if (idx >= 0) {
      const title = pdict[it.subject]?.title;
      if (title) return `${pidToLetters(idx)}. ${title}`;
    }
    return t('ContestClarification.FormProblem', { pid: it.subject });
  }
  // Special subjects -1 / 0 use the dedicated labels.
  const key = SUBJECT_KEYS[String(it.subject)];
  if (key) return t(key);
  return t('ContestClarification.Problem', { pid: it.subject });
}

export function ContestClarificationList({ items, pids, pdict, udict, currentUid = 0, onReply }: ContestClarificationListProps) {
  const t = useTranslate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <ol className={styles.list}>
      {items.length === 0 && <p className={styles.empty}>{t('ContestClarification.Empty')}</p>}
      {items.map((it) => {
        const udoc = udict[String(it.owner)];
        const sub = renderSubject(it, pids, pdict, t);
        const open = expanded[it._id] ?? true;
        // Reply is hidden on jury broadcasts (owner === 0), on viewer-owned
        // items (owner === currentUid), and once any reply already exists.
        // (last matches ui-default `{% if doc.owner %}` semantics where the
        // reply link disappears once the jury has answered.)
        const isBroadcast = it.owner === 0;
        const isMine = it.owner !== 0 && it.owner === currentUid;
        const hasReply = !!(it.reply && it.reply.length > 0);
        const ts = objectIdTime(it._id);
        const tsLabel = ts ? formatDateTime(new Date(ts).toISOString()) : '';
        return (
          <li key={it._id} className={styles.item} data-did={it._id} data-testid={`clar-item-${it._id}`}>
            <header className={styles.header}>
              <span className={styles.subject}>{sub}</span>
              <span className={styles.author}>
                {isBroadcast
                  ? <b className={styles.jury} data-testid="jury-badge">{t('ContestClarification.Jury')}</b>
                  : <>{udoc?.uname ?? `#${it.owner}`}</>}
              </span>
              {tsLabel && <span className={styles.timestamp} data-testid="clar-timestamp">{tsLabel}</span>}
              {!isBroadcast && !isMine && !hasReply && (
                <Button variant="ghost" onClick={() => onReply(it._id)}>
                  <span data-testid="reply-button">{t('ContestClarification.Reply')}</span>
                </Button>
              )}
              <Button variant="ghost" onClick={() => setExpanded((m) => ({ ...m, [it._id]: !open }))}>
                {open ? '−' : '+'}
              </Button>
            </header>
            {open && (
              <>
                <MarkdownPreview source={it.content} />
                {it.reply && it.reply.length > 0 && (
                  <ol className={styles.replies}>
                    {it.reply.map((r, i) => (
                      <li key={i} className={styles.reply}>
                        <span className={styles.replyAuthor}>
                          <b className={styles.jury}>{t('ContestClarification.Jury')}</b>
                        </span>
                        <MarkdownPreview source={r.content} />
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
