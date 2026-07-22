import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
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

const SUBJECT_TEXT: Record<number, string> = { '-1': 'Technical', 0: 'General' } as any;

export function ContestClarificationList({ items, udict, onReply }: ContestClarificationListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <ol className={styles.list}>
      {items.length === 0 && <p className={styles.empty}>No clarifications yet.</p>}
      {items.map((it) => {
        const udoc = udict[String(it.owner)];
        const sub = SUBJECT_TEXT[it.subject] ?? `Problem ${it.subject}`;
        const open = expanded[it._id] ?? true;
        return (
          <li key={it._id} className={styles.item}>
            <header className={styles.header}>
              <span className={styles.subject}>{sub}</span>
              <span className={styles.author}>
                {udoc?.uname ?? `#${it.owner}`} {udoc ? '' : '(Jury)'}
              </span>
              <Button variant="ghost" onClick={() => onReply(it._id)}>Reply</Button>
              <Button variant="ghost" onClick={() => setExpanded((m) => ({ ...m, [it._id]: !open }))}>{open ? '−' : '+'}</Button>
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
