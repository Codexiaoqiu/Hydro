import { usePageData } from '../context/page-data';

export interface Domain { _id: string, name: string, displayName: string, owner: number }
export interface Stats { userCount: number, groupCount: number, problemCount: number, contestCount: number }
export interface Activity { time: number, message: string }
export interface Args { domain: Domain, stats: Stats, recentActivities: Activity[] }

export default function DomainDashboardPage() {
  const { args } = usePageData();
  const cards = [
    { label: 'Users', value: args.stats.userCount },
    { label: 'Groups', value: args.stats.groupCount },
    { label: 'Problems', value: args.stats.problemCount },
    { label: 'Contests', value: args.stats.contestCount },
  ];
  return (
    <div className="domain-dashboard">
      <h1>{args.domain.displayName}</h1>
      <section className="stats-cards">
        {cards.map((c) => (
          <div key={c.label} className="stats-card">
            <h2>{c.label}</h2>
            <p className="value">{c.value}</p>
          </div>
        ))}
      </section>
      <section className="recent-activities">
        <h2>Recent Activities</h2>
        {args.recentActivities.length === 0 ? (
          <p className="empty">No activity — empty.</p>
        ) : (
          <ul>
            {args.recentActivities.map((a, i) => (
              <li key={i}>
                <time>{new Date(a.time * 1000).toISOString()}</time>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
