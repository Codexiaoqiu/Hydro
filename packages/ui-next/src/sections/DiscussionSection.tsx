import { Link } from '../components/link';
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Avatar } from '../lib/avatar';
import { timeAgo } from '../lib/datetime';
import styles from './DiscussionSection.module.css';
import type { SectionProps, SerializedDdoc, SerializedUser } from './types';

interface VNodeLite {
  _id: string;
  title: string;
  content?: string;
}

export function DiscussionSection({ payload, udict }: SectionProps): JSX.Element | null {
  const [ddocs = [], vndict = {}] = Array.isArray(payload) ? payload : [[], {}];
  if (!ddocs.length) return null;
  const vmap = vndict as Record<string, VNodeLite>;
  return (
    <Card variant="default" header={<h3 className={styles.header}>最新讨论</h3>}>
      <ol className={styles.list}>
        {ddocs.map((d: SerializedDdoc) => {
          const owner = udict[d.owner] as SerializedUser | undefined;
          const node = vmap[d.parentId as string];
          return (
            <li key={d.docId} className={styles.item}>
              <Avatar spec={owner?.avatar} name={owner?.uname ?? '?'} size={32} />
              <div className={styles.body}>
                <Link to="discussion_detail" params={{ did: d.docId }} className={styles.title}>
                  {d.title}
                </Link>
                <ul className={styles.meta}>
                  <li className={styles.author}>{owner?.uname ?? `#${d.owner}`}</li>
                  {node && <li><Chip variant="tag">{node.title}</Chip></li>}
                  <li className={styles.time}>{timeAgo(d.updateAt)}</li>
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <Link to="discussion_main" className={styles.more}>更多 →</Link>
      </div>
    </Card>
  );
}
