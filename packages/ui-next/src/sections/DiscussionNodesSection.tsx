import { Card } from '../components/primitives/Card';
import { Link } from '../components/link';
import type { SectionProps } from './types';
import styles from './DiscussionNodesSection.module.css';

interface NodeLite {
  _id: string;
  title: string;
  content?: string;
  parentId?: string;
}

export function DiscussionNodesSection({ payload }: SectionProps): JSX.Element | null {
  const vnodes: NodeLite[] = Array.isArray(payload) ? payload : [];
  if (!vnodes.length) return null;
  const groups = new Map<string, NodeLite[]>();
  for (const n of vnodes) {
    const key = n.content || 'default';
    const list = groups.get(key) ?? [];
    list.push(n);
    groups.set(key, list);
  }
  return (
    <Card variant="default" header={<h3 className={styles.title}>讨论节点</h3>}>
      <div className={styles.groups}>
        {[...groups.entries()].map(([cat, items]) => (
          <div key={cat} className={styles.group}>
            <div className={styles.label}>{cat}</div>
            <ul className={styles.list}>
              {items.map((it) => (
                <li key={it._id}>
                  <Link to="discussion_main" className={styles.link}>{it.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
