import { Link } from '../link';
import { Card } from '../primitives/Card';
import styles from './DiscussionNodesWidget.module.css';

export interface Vnode {
  docId: string;
  title: string;
  content?: string;
  type?: number;
}

export interface DiscussionNodesWidgetProps {
  vnodes: Vnode[];
  buildHref: (name: string, params?: Record<string, unknown>) => string;
}

function groupBy<T extends Record<string, unknown>, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = String(item[key] ?? '');
    (out[k] ||= []).push(item);
  }
  return out;
}

export function DiscussionNodesWidget({ vnodes, buildHref }: DiscussionNodesWidgetProps) {
  if (!vnodes || vnodes.length === 0) {
    return (
      <div className={styles.wrap}>
        <Card>
          <p className={styles.empty}>暂无节点</p>
        </Card>
      </div>
    );
  }
  const groups = groupBy(vnodes as any, 'content');
  return (
    <div className={styles.wrap}>
      <Card header={<h3 className={styles.header}>讨论节点</h3>}>
        {Object.entries(groups).map(([category, items]) => (
          <section key={category} className={styles.group}>
            <h4 className={styles.groupTitle}>{category}</h4>
            <ol className={styles.chipList}>
              {items.map((n) => (
                <li key={n.docId} className={styles.chip}>
                  <Link href={buildHref('discussion_node', { type: 'node', name: n.docId })}>
                    {n.docId}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </Card>
    </div>
  );
}
