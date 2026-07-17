import { Card } from '../components/primitives/Card';
import { Markdown } from '../lib/markdown';
import styles from './BulletinSection.module.css';
import type { SectionProps } from './types';

export function BulletinSection({ domain, payload }: SectionProps): JSX.Element | null {
  const source = (payload && typeof payload === 'string' ? payload : domain.bulletin) ?? '';
  if (!source.trim()) return null;
  return (
    <Card variant="default" header={<h3 className={styles.title}>公告</h3>}>
      <div className={styles.body}>
        <Markdown source={source} />
      </div>
    </Card>
  );
}
