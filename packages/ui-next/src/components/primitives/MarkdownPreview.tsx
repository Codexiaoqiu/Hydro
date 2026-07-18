import { useEffect, useRef, useState, type ReactNode } from 'react';
import { renderArticleBlocks } from '../../lib/markdown/plugins';
import libMarkdownStyles from '../../lib/markdown.module.css';
import styles from './MarkdownPreview.module.css';

export interface MarkdownPreviewProps {
  /** Raw markdown source. Debounced 150ms before render. */
  source: string;
}

const PLACEHOLDER_TEXT = '在左侧编辑题目描述，预览会实时显示。';

export function MarkdownPreview({ source }: MarkdownPreviewProps): ReactNode {
  const [displayed, setDisplayed] = useState(source);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDisplayed(source);
      timerRef.current = null;
    }, 150);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [source]);

  if (displayed.trim() === '') {
    return (
      <div
        className={styles.preview}
        data-testid="markdown-preview-placeholder"
        aria-label="Rendered preview"
        aria-live="polite"
      >
        <p className={styles.placeholder}>{PLACEHOLDER_TEXT}</p>
      </div>
    );
  }

  let body: ReactNode;
  try {
    body = renderArticleBlocks(displayed);
  } catch (err) {
    // Render failures should never break the form.
    body = <pre className={styles.fallback}>{displayed}</pre>;
  }

  return (
    <div
      className={`${styles.preview} ${libMarkdownStyles.markdown}`}
      data-testid="markdown-preview"
      aria-label="Rendered preview"
      aria-live="polite"
    >
      {body}
    </div>
  );
}
