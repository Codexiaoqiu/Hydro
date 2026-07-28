import { useState } from 'react';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import { Link } from '../link';
import styles from './ProfileTabs.module.css';

export interface ProfileTabsProps {
  bio?: string;
  acceptedProblems?: Array<{ docId: number, title: string, pid?: string }>;
  pluginTabs?: Array<{ key: string, label: string, render: () => React.ReactNode }>;
  buildHref?: (name: string, params?: Record<string, unknown>) => string;
}

export function ProfileTabs({ bio, acceptedProblems = [], pluginTabs = [], buildHref }: ProfileTabsProps) {
  const [active, setActive] = useState<'bio' | 'accepted' | string>('bio');
  const tabs = [
    { key: 'bio', label: '简介' },
    ...(acceptedProblems.length ? [{ key: 'accepted', label: '通过的题目' }] : []),
    ...pluginTabs.map((t) => ({ key: t.key, label: t.label })),
  ];
  return (
    <div className={styles.tabs}>
      <nav className={styles.tabBar} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={active === t.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActive(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className={styles.tabPanel} role="tabpanel">
        {active === 'bio' && (
          bio ? <MarkdownPreview source={bio} /> : <p className={styles.empty}>该用户很懒,什么也没写。</p>
        )}
        {active === 'accepted' && (
          <ul className={styles.problemList}>
            {acceptedProblems.map((p) => (
              <li key={p.docId}>
                <Link href={buildHref?.('problem_detail', { pid: String(p.docId) }) ?? `/p/${p.docId}`}>
                  {p.pid ?? p.docId}. {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {pluginTabs.map((t) => active === t.key ? (
          <div key={t.key}>{t.render()}</div>
        ) : null)}
      </div>
    </div>
  );
}
