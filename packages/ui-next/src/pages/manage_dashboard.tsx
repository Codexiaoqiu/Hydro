import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { timeAgo } from '../lib/datetime';

interface Message {
  id: string;
  content: string;
  level?: 'info' | 'warn' | 'error';
}

interface Activity {
  id: string;
  type: string;
  content: string;
  time: string | number;
}

interface Stats {
  users?: number;
  domains?: number;
  problems?: number;
  submissions?: number;
}

interface Domain {
  _id: string;
  name: string;
  avatar?: string;
}

export interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  domain?: Domain;
  messages?: Message[];
  activities?: Activity[];
  stats?: Stats;
}

const STAT_CARDS: Array<{ key: keyof Stats, label: string }> = [
  { key: 'users', label: 'Users' },
  { key: 'domains', label: 'Domains' },
  { key: 'problems', label: 'Problems' },
  { key: 'submissions', label: 'Submissions' },
];

function toIsoString(time: string | number): string {
  if (typeof time === 'number') {
    const ms = time < 1e12 ? time * 1000 : time;
    return new Date(ms).toISOString();
  }
  return time;
}

export default function ManageDashboardPage() {
  const { args } = usePageData();
  const domain = args?.domain;
  const messages = args?.messages ?? [];
  const activities = args?.activities ?? [];
  const stats = args?.stats;

  return (
    <div className="manage-dashboard">
      <section className="manage-dashboard__stats" aria-label="System statistics">
        {stats ? (
          STAT_CARDS.map(({ key, label }) => (
            <Card key={key} variant="stat" header={<span className="manage-dashboard__card-label">{label}</span>}>
              <div className="manage-dashboard__card" role="group" aria-label={label}>
                <p className="manage-dashboard__card-value">{stats[key] ?? 0}</p>
              </div>
            </Card>
          ))
        ) : (
          <p className="manage-dashboard__empty" role="status">
            No stats available.
          </p>
        )}
      </section>

      <section className="manage-dashboard__messages" aria-label="System messages">
        <h1 className="manage-dashboard__heading">Messages</h1>
        {messages.length === 0 ? (
          <p className="manage-dashboard__empty" role="status">
            No messages at this time.
          </p>
        ) : (
          <ul className="manage-dashboard__message-list">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`manage-dashboard__message manage-dashboard__message--${m.level ?? 'info'}`}
                data-level={m.level ?? 'info'}
              >
                {m.content}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="manage-dashboard__activities" aria-label="Recent activities">
        <h1 className="manage-dashboard__heading">Recent Activities</h1>
        {activities.length === 0 ? (
          <p className="manage-dashboard__empty" role="status">
            No recent activity to show.
          </p>
        ) : (
          <ul className="manage-dashboard__activity-list">
            {activities.map((a) => (
              <li key={a.id} className="manage-dashboard__activity">
                <time className="manage-dashboard__activity-time" dateTime={toIsoString(a.time)}>
                  {timeAgo(toIsoString(a.time))}
                </time>
                <span className="manage-dashboard__activity-type">{a.type}</span>
                <span className="manage-dashboard__activity-content">{a.content}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="manage-dashboard__info" aria-label="System information">
        <header className="manage-dashboard__info-header">
          <h1 className="manage-dashboard__heading">Information</h1>
          <form
            className="manage-dashboard__restart-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <Button variant="primary" type="submit">
              Restart
            </Button>
          </form>
        </header>
        {domain ? (
          <dl className="manage-dashboard__details">
            <dt>Avatar</dt>
            <dd>
              {domain.avatar ? (
                <img
                  className="manage-dashboard__avatar"
                  src={domain.avatar}
                  width={32}
                  height={32}
                  alt={`${domain.name} avatar`}
                />
              ) : (
                <span className="manage-dashboard__avatar manage-dashboard__avatar--placeholder" aria-label="No avatar" />
              )}
            </dd>
            <dt>Name</dt>
            <dd>{domain.name}</dd>
          </dl>
        ) : (
          <p className="manage-dashboard__empty" role="status">
            No domain information available.
          </p>
        )}
      </section>
    </div>
  );
}
