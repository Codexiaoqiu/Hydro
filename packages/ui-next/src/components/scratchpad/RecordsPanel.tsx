import { useEffect, useState } from 'react';
import { Link } from '../link';
import { useTranslate } from '../../lib/i18n';
import { statusText } from './status';

export interface RecordRow {
  _id: string;
  status: number;
  lang: string;
  time: number;
}

export function RecordsPanel({ submissionsUrl }: { submissionsUrl: string }) {
  const t = useTranslate();
  const [records, setRecords] = useState<RecordRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(submissionsUrl)
      .then((res) => res.json())
      .then((data: { rdocs?: RecordRow[] }) => {
        if (!cancelled) setRecords((data.rdocs ?? []).slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionsUrl]);

  if (records === null) {
    return <p style={{ color: 'var(--text-mute)' }}>…</p>;
  }
  if (records.length === 0) {
    return <p style={{ color: 'var(--text-mute)' }}>{t('Scratchpad.NoRecords')}</p>;
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {records.map((r) => (
        <li key={r._id}>
          <Link to="record_detail" params={{ rid: r._id }} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span aria-label={statusText(r.status)} data-status={r.status} style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)' }} />
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>{r._id}</span>
            <span style={{ color: 'var(--text-mute)' }}>{r.lang}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
