import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import { useTranslate } from '../../lib/i18n';
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
  pdict: Record<string, unknown>;
  udict: Record<string, { _id: number; uname: string }>;
  onReply: (did: string) => void;
}

// Server serialises subjects as integer codes — keep the lookup keyed on a
// stable string form so `0` and `-1` never collide by accident.
const SUBJECT_KEYS: Record<string, string> = {
  '-1': 'ContestClarification.SubjectTechnical',
  '0': 'ContestClarification.SubjectGeneral',
};

export function ContestClarificationList({ items, udict, onReply }: ContestClarificationListProps) {
  const t = useTranslate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <ol className={styles.list}>
      {items.length === 0 && <p className={styles.empty}>{t('ContestClarification.Empty')}</p>}
      {items.map((it) => {
        const udoc = udict[String(it.owner)];
        // Backend stores both the broadcast subject *number* (e.g. -1 / 0)
        // and a problem pid (>=1) in the same column. We can't tell which
        // without a `mode` flag from the server, so re-use the same label
        // for both — only the meaning differs based on context.
        const subjectKey = SUBJECT_KEYS[String(it.subject)];
        const sub = subjectKey ? t(subjectKey) : t('ContestClarification.Problem', { pid: it.subject });
        const open = expanded[it._id] ?? true;
        return (
          <li key={it._id} className={styles.item}>
            <header className={styles.header}>
              <span className={styles.subject}>{sub}</span>
              <span className={styles.author}>
                {udoc?.uname ?? `#${it.owner}`}{udoc ? '' : ` ${t('ContestClarification.Jury')}`}
              </span>
              <Button variant="ghost" onClick={() => onReply(it._id)}>{t('ContestClarification.Reply')}</Button>
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
