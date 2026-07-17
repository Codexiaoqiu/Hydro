import type { JSX } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './markdown.module.css';

interface MarkdownProps {
  /**
   * Raw markdown source. Rendered through react-markdown (XSS-safe by
   *  default — raw HTML in the source is escaped rather than injected).
   */
  source: string;
}

/**
 * Render markdown as React elements. Sanitization is handled by react-markdown
 *  escaping any inline HTML; we never pass `dangerouslySetInnerHTML`.
 */
export function Markdown({ source }: MarkdownProps): JSX.Element {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
