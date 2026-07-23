import { useRef, useState } from 'react';
import { Button } from '../primitives/Button';
import { useTranslate } from '../../lib/i18n';
import { useToast } from '../primitives/Toast';
import styles from './ContestBalloonTable.module.css';

/**
 * Real wire shape for one balloon document. The Mongo collection uses
 * `pid` / `uid` / `sent` / `sentAt`; this type is what the backend hands
 * to the page via `args.bdocs`.
 */
export interface BalloonDoc {
  _id: string;
  pid: number;
  uid: number;
  first?: boolean;
  sent?: number;
  sentAt?: number;
}

export interface PdocLite {
  docId: number;
  title: string;
}

export interface UdicLite {
  _id: number;
  uname: string;
}

export interface BalloonColor {
  color: string;
  name: string;
}

export interface ContestBalloonTableProps {
  bdocs: BalloonDoc[];
  /** Order of problems in the contest, used to derive alphabetic ids. */
  pids: number[];
  pdict: Record<number, PdocLite>;
  udict: Record<number, UdicLite>;
  /** Per-problem balloon color/name config (keyed by `pid`). */
  balloon: Record<number, BalloonColor>;
  /** Async so the parent can trigger a poll after a successful Send. */
  onSend: (bid: string) => Promise<void> | void;
}

const COLOR_DEFAULT = '#fbbd23';

function pidToLetters(index: number): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function formatSentAt(ts: number): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

export function ContestBalloonTable({
  bdocs, pids, pdict, udict, balloon, onSend,
}: ContestBalloonTableProps) {
  const toast = useToast();
  const t = useTranslate();
  const [pendingBid, setPendingBid] = useState<string | null>(null);
  const pendingRef = useRef(false);

  const send = async (bid: string) => {
    // Guard against a same-tick double click: `pendingBid` state won't
    // re-render before a second synchronous click, so a ref is the reliable
    // latch that prevents a double POST.
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPendingBid(bid);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'done');
      fd.set('balloon', bid);
      await fetch(window.location.pathname, {
        method: 'POST',
        body: fd.toString(),
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      await onSend(bid);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      pendingRef.current = false;
      setPendingBid((current) => (current === bid ? null : current));
    }
  };

  return (
    <table className={styles.table}>
      <colgroup>
        <col className={styles.colPid} />
        <col className={styles.colTitle} />
        <col className={styles.colColor} />
        <col className={styles.colSubmitter} />
        <col className={styles.colFirst} />
        <col className={styles.colSent} />
        <col className={styles.colAction} />
      </colgroup>
      <thead>
        <tr>
          <th>{t('ContestBalloon.Pid')}</th>
          <th>{t('ContestBalloon.Title')}</th>
          <th>{t('ContestBalloon.Color')}</th>
          <th>{t('ContestBalloon.Submitter')}</th>
          <th>{t('ContestBalloon.First')}</th>
          <th>{t('ContestBalloon.Sent')}</th>
          <th>{t('ContestBalloon.Action')}</th>
        </tr>
      </thead>
      <tbody>
        {bdocs.length === 0 && (
          <tr>
            <td colSpan={7} className={styles.empty}>{t('ContestBalloon.Empty')}</td>
          </tr>
        )}
        {bdocs.map((bdoc) => {
          const idx = pids.indexOf(bdoc.pid);
          const pidLabel = idx >= 0 ? pidToLetters(idx) : '?';
          const pdoc = pdict[bdoc.pid];
          const udoc = udict[bdoc.uid];
          const sentBy = bdoc.sent != null ? udict[bdoc.sent] : null;
          const cfg = balloon[bdoc.pid];
          const color = cfg?.color ?? COLOR_DEFAULT;
          const isPending = pendingBid !== null;
          const rowPending = pendingBid === bdoc._id;
          const isSent = bdoc.sent != null;
          return (
            <tr key={bdoc._id} data-status={isSent ? 'done' : 'pending'}>
              <td>
                <span className={styles.pidTag} aria-label={`Problem ${pidLabel}`}>{pidLabel}</span>
              </td>
              <td>{pdoc?.title ?? `#${bdoc.pid}`}</td>
              <td>
                <span className={styles.colorCell}>
                  <span className={styles.swatch} style={{ background: color }} aria-hidden />
                  <span className={styles.colorName}>{cfg?.name ?? pidLabel}</span>
                </span>
              </td>
              <td>{udoc?.uname ?? `#${bdoc.uid}`}</td>
              <td>{bdoc.first ? <span className={styles.first}>{t('ContestBalloon.First')}</span> : null}</td>
              <td>
                {isSent ? (
                  <span className={styles.sent}>
                    {sentBy?.uname ?? `#${bdoc.sent}`}
                    {bdoc.sentAt ? ` · ${formatSentAt(bdoc.sentAt)}` : ''}
                  </span>
                ) : (
                  <span className={styles.colorName}>—</span>
                )}
              </td>
              <td>
                {isSent ? (
                  <span className={styles.sent}>{t('ContestBalloon.Done')}</span>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => { void send(bdoc._id); }}
                  >
                    {rowPending ? t('ContestBalloon.Sending') : t('ContestBalloon.Send')}
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}