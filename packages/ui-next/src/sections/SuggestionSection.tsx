import { Card } from '../components/primitives/Card';
import { Link } from '../components/link';
import type { SectionProps } from './types';
import styles from './SuggestionSection.module.css';

const GROUPS: ReadonlyArray<{ title: string; items: ReadonlyArray<{ label: string; to: string }> }> = [
  {
    title: '中文',
    items: [
      { label: '洛谷', to: 'https://www.luogu.com.cn/' },
      { label: 'AcWing', to: 'https://www.acwing.com/' },
      { label: 'LibreOJ', to: 'https://loj.ac/' },
    ],
  },
  {
    title: 'English',
    items: [
      { label: 'Codeforces', to: 'https://codeforces.com/' },
      { label: 'AtCoder', to: 'https://atcoder.jp/' },
      { label: 'TopCoder', to: 'https://www.topcoder.com/' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'cppreference', to: 'https://en.cppreference.com/' },
      { label: 'MDN', to: 'https://developer.mozilla.org/' },
    ],
  },
];

export function SuggestionSection(_props: SectionProps): JSX.Element {
  return (
    <Card variant="default" header={<h3 className={styles.title}>友情链接</h3>}>
      {GROUPS.map((g) => (
        <div key={g.title} className={styles.group}>
          <div className={styles.groupTitle}>{g.title}</div>
          <ul className={styles.list}>
            {g.items.map((it) => (
              <li key={it.to}>
                <Link href={it.to} className={styles.link}>{it.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}
