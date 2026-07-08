import { useMemo } from 'react';
import { marked } from 'marked';
import styles from './markdown.module.css';

interface MarkdownProps {
  /** Raw markdown source. Admin-authored for BulletinSection. */
  source: string;
}

/** Render markdown as HTML. No sanitization — `source` must be trusted (admin-only). */
export function Markdown({ source }: MarkdownProps): JSX.Element {
  const html = useMemo(
    () => marked.parse(source, { async: false, breaks: true }) as string,
    [source],
  );
  return <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />;
}