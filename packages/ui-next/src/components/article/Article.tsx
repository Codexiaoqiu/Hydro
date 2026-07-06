import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Article.module.css';

interface Props { langTabs?: ReactNode; }

export function Article({ langTabs, children }: PropsWithChildren<Props>) {
  return (
    <>
      {langTabs}
      <div className={styles.article}>{children}</div>
    </>
  );
}