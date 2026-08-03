import { usePageData } from '../context/page-data';

export interface Journal { time: number, level: 'info' | 'warn' | 'error' | string, message: string }
export interface Args { journals: Journal[] }

export default function StatusPage() {
  const { args } = usePageData();
  const sorted = [...args.journals].sort((a, b) => b.time - a.time);
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">System Status</h1>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">No journal entries.</p>
      ) : (
        <ul className="journal">
          {sorted.map((j, i) => (
            <li key={i} data-level={j.level} className={`journal__item journal__item--${j.level}`}>
              <time>{new Date(j.time * 1000).toISOString()}</time>
              <span className="journal__message">{j.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
