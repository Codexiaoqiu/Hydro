import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './Article.module.css';

interface Props {
  langTabs?: ReactNode;
  /**
   * Raw markdown source. Rendered through react-markdown (XSS-safe by default —
   * HTML in the source is escaped). May also be passed as a string child.
   */
  content?: string;
}

function renderMarkdown(source: string): ReactElement {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>;
}

export function Article({ langTabs, content, children }: PropsWithChildren<Props>) {
  let body: ReactNode;
  if (typeof content === 'string') {
    body = renderMarkdown(content);
  } else if (typeof children === 'string') {
    body = renderMarkdown(children);
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