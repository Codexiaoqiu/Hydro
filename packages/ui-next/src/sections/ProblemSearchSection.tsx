import { Card } from '../components/primitives/Card';
import type { SectionProps } from './types';
import styles from './ProblemSearchSection.module.css';

export function ProblemSearchSection(_props: SectionProps): JSX.Element {
  return (
    <Card variant="default" header={<h3 className={styles.title}>题目搜索</h3>}>
      <form method="get" action="/p" className={styles.form}>
        <input
          type="search"
          name="q"
          placeholder="题号、标题、标签…"
          className={styles.input}
          aria-label="搜索题目"
        />
        <button type="submit" className={styles.submit}>搜索</button>
      </form>
    </Card>
  );
}
