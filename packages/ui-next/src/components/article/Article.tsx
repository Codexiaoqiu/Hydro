import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { remarkHighlightMark } from 'remark-highlight-mark';
import remarkMath from 'remark-math';
import { remarkImageSize } from '../../lib/markdown/plugins/remarkImageSize';
import { remarkMedia } from '../../lib/markdown/plugins/remarkMedia';
import { type ContentBlock, preprocessContent } from '../../lib/markdown/preprocess';
import { SamplePair } from '../ide/SamplePair';
import styles from './Article.module.css';

interface Props {
  langTabs?: ReactNode;
  /**
   * Raw markdown source. Rendered through react-markdown (XSS-safe by default —
   * HTML in the source is escaped). May also be passed as a string child.
   */
  content?: string;
}

const REMARK_PLUGINS = [
  remarkGfm,
  remarkMath,
  remarkHighlightMark,
  remarkImageSize,
  remarkMedia,
];

const REHYPE_PLUGINS = [rehypeKatex, rehypeHighlight];

// remark-highlight-mark produces `highlight` mdast nodes. mdast-util-to-hast
// has no default handler for `highlight`, which would otherwise render as a
// `<div>` (hydration warning). Map them to a real `<mark>` element.
const REMARK_REHYE_OPTIONS = {
  handlers: {
    highlight: (state: any, node: any) => ({
      type: 'element',
      tagName: 'mark',
      properties: {},
      children: state.all(node),
    }),
  },
};

function renderMarkdown(source: string): ReactElement {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      remarkRehypeOptions={REMARK_REHYE_OPTIONS}
    >
      {source}
    </ReactMarkdown>
  );
}

function MarkdownBlock({ body }: { body: string }): ReactElement {
  return renderMarkdown(body);
}

function SamplePairsBlock({
  pairs,
}: {
  pairs: Array<{ num: number, input: string, output: string }>;
}): ReactElement {
  return (
    <div className={styles.samples}>
      {pairs.map((p) => (
        <SamplePair
          key={p.num}
          num={p.num}
          input={{ filename: 'stdin.txt', lineNo: 1, value: <>{p.input}</> }}
          output={{ filename: 'stdout.txt', lineNo: 1, value: <>{p.output}</> }}
        />
      ))}
    </div>
  );
}

export function Article({ langTabs, content, children }: PropsWithChildren<Props>) {
  const blocks = useMemo<ContentBlock[] | null>(() => {
    if (typeof content === 'string') return preprocessContent(content);
    return null;
  }, [content]);

  let body: ReactNode;
  if (blocks) {
    body = blocks.map((b, i) =>
      b.type === 'markdown'
        ? <MarkdownBlock key={i} body={b.body} />
        : <SamplePairsBlock key={i} pairs={b.pairs} />,
    );
  } else if (typeof content === 'string') {
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
