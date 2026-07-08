import { Card } from '../components/primitives/Card';
import { Link } from '../components/link';
import type { SectionProps, SerializedPdoc } from './types';
import styles from './StarredProblemsSection.module.css';

export function StarredProblemsSection({ payload }: SectionProps): JSX.Element | null {
  const t = Array.isArray(payload) ? payload : [];
  const pdocs: SerializedPdoc[] = t[0] ?? [];
  if (!pdocs.length) return null;
  return (
    <Card variant="default" header={<h3 className={styles.title}>精选题目</h3>}>
      <ol className={styles.list}>
        {pdocs.map((p) => (
          <li key={p.docId} className={styles.item}>
            <Link to="problem_detail" params={{ pid: p.pid }} className={styles.link}>
              <span className={styles.pid}>{p.pid}</span>
              <span className={styles.label}>{p.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
