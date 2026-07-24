import { useCallback, useEffect, useState } from 'react';
import { Link } from '../link';
import { useTranslate } from '../../lib/i18n';
import { STATUS_TEXTS } from '@hydrooj/common';
import { useRecordStream } from '../../hooks/use-record-stream';
import type { RecordStreamRow } from '../../hooks/use-record-stream';

export type RecordRow = RecordStreamRow;

export function RecordsPanel({ submissionsUrl, wsUrl, canViewRecord = true }: { submissionsUrl: string; wsUrl?: string; canViewRecord?: boolean }) {
  const t = useTranslate();
  const [records, setRecords] = useState<RecordRow[] | null>(null);
  const appendRecord = useCallback((record: RecordRow) => {
    setRecords((current) => [record, ...(current ?? [])]
      .filter((r, i, all) => all.findIndex((x) => x._id === r._id) === i).slice(0, 5));
  }, []);
  useRecordStream({ url: wsUrl, enabled: canViewRecord, onRecord: appendRecord });
  useEffect(() => {
    if (!canViewRecord) return undefined;
    let cancelled = false;
    fetch(submissionsUrl).then((res) => res.json()).then((data: { rdocs?: RecordRow[] }) => {
      if (!cancelled) {
        setRecords((current) => [...(current ?? []), ...(data.rdocs ?? [])]
          .filter((record, index, all) => all.findIndex((item) => item._id === record._id) === index)
          .slice(0, 5));
      }
    }).catch(() => { if (!cancelled) setRecords((current) => current ?? []); });
    return () => { cancelled = true; };
  }, [submissionsUrl, canViewRecord]);
  if (!canViewRecord) {
    const unavailable = t('Scratchpad.RecordsUnavailable');
    return <p style={{ color: 'var(--text-mute)' }}>{unavailable === 'Scratchpad.RecordsUnavailable' ? 'Records are not available.' : unavailable}</p>;
  }
  if (records === null) return <p style={{ color: 'var(--text-mute)' }}>…</p>;
  if (records.length === 0) return <p style={{ color: 'var(--text-mute)' }}>{t('Scratchpad.NoRecords')}</p>;
  return <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
    {records.map((r) => <li key={r._id}><Link to="record_detail" params={{ rid: r._id }} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}><span aria-label={STATUS_TEXTS[r.status] ?? `Status ${r.status}`} data-status={r.status} style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)' }} /><span style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>{r._id}</span><span style={{ color: 'var(--text-mute)' }}>{r.lang}</span></Link></li>)}
  </ul>;
}
