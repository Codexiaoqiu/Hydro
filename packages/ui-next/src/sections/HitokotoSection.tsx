import { useMemo } from 'react';
import { Card } from '../components/primitives/Card';
import styles from './HitokotoSection.module.css';
import type { SectionProps } from './types';

const HITOKOTO = [
  '代码是写给人看的，顺便让机器执行。—— Harold Abelson',
  '衡量一个程序员的，不是他写代码的速度，而是他删代码的速度。',
  '过早优化是万恶之源。—— Donald Knuth',
  '做正确的事，比把事情做正确更重要。',
  '保持简单。—— Brian Kernighan',
];

export function HitokotoSection(_props: SectionProps): JSX.Element {
  const line = useMemo(() => HITOKOTO[Math.floor(Math.random() * HITOKOTO.length)], []);
  return (
    <Card variant="default">
      <blockquote className={styles.quote}>
        {line}
        <footer className={styles.attr}>—— hitokoto</footer>
      </blockquote>
    </Card>
  );
}
