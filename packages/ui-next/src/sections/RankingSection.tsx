import { Card } from '../components/primitives/Card';
import { Author } from '../components/sidebar/Author';
import styles from './RankingSection.module.css';
import type { SectionProps, SerializedUser } from './types';

export function RankingSection({ payload, udict }: SectionProps): JSX.Element | null {
  const uids: number[] = Array.isArray(payload) ? payload : [];
  if (!uids.length) return null;
  return (
    <Card variant="default" header={<h3 className={styles.header}>排行榜</h3>}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.rank}>#</th>
            <th>用户</th>
            <th className={styles.rp}>RP</th>
          </tr>
        </thead>
        <tbody>
          {uids.map((uid, idx) => {
            const u = udict[uid] as SerializedUser | undefined;
            if (!u) return null;
            return (
              <tr key={uid} className={styles.row}>
                <td className={styles.rank}>{idx + 1}</td>
                <td className={styles.user}><Author name={u.uname} contribution={u.bio} /></td>
                <td className={styles.rp}>{u.rp ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
