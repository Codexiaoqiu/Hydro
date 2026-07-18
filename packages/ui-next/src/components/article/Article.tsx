import type { PropsWithChildren, ReactNode } from 'react';
import { useMemo } from 'react';
import { renderArticleBlocks } from '../../lib/markdown/plugins';
import styles from './Article.module.css';

interface Props {
  langTabs?: ReactNode;
  /**
   * Raw markdown source. Rendered through react-markdown (XSS-safe by default —
   * HTML in the source is escaped). May also be passed as a string child.
   */
  content?: string;
}

export function Article({ langTabs, content, children }: PropsWithChildren<Props>) {
  const source = typeof content === 'string'
    ? content
    : typeof children === 'string'
      ? children
      : null;

  const blocks = useMemo<ReactNode[] | null>(() => {
    if (source === null) return null;
    return renderArticleBlocks(source);
  }, [source]);

  let body: ReactNode;
  if (blocks !== null) {
    body = blocks;
  } else {
    body = children;
  }

  return (
    <>
      {langTabs}
      <div className={styles.article}>{body}</div>
    </>
  );
}
