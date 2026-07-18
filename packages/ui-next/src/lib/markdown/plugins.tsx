import type { ReactElement, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { remarkHighlightMark } from 'remark-highlight-mark';
import remarkMath from 'remark-math';
import articleSampleStyles from '../../components/article/Article.module.css';
import { SamplePair } from '../../components/ide/SamplePair';
import { remarkImageSize } from './plugins/remarkImageSize';
import { remarkMedia } from './plugins/remarkMedia';
import { preprocessContent } from './preprocess';

/**
 * Shared remark / rehype plugin pipeline used by both `Article` (problem
 * detail page) and `MarkdownPreview` (problem_create / problem_edit
 * live preview pane). Keeping these as a single source of truth ensures
 * preview == detail-page rendering.
 */
export const REMARK_PLUGINS = [
  remarkGfm,
  remarkMath,
  remarkHighlightMark,
  remarkImageSize,
  remarkMedia,
];

export const REHYPE_PLUGINS = [rehypeKatex, rehypeHighlight];

// remark-highlight-mark produces `highlight` mdast nodes. mdast-util-to-hast
// has no default handler for `highlight`, which would otherwise render as a
// `<div>` (hydration warning). Map them to a real `<mark>` element.
export const REMARK_REHYE_OPTIONS = {
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
    <div className={articleSampleStyles.samples}>
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

/**
 * Run the source through `preprocessContent` (which extracts `||...||`
 * sample-pair blocks out of the prose) and render each block with the
 * shared plugin pipeline. Used by `Article` (problem_detail) and by
 * `MarkdownPreview` so both surfaces show identical rendering.
 */
export function renderArticleBlocks(source: string): ReactNode[] {
  const blocks = preprocessContent(source);
  return blocks.map((b, i) =>
    b.type === 'markdown'
      ? <MarkdownBlock key={i} body={b.body} />
      : <SamplePairsBlock key={i} pairs={b.pairs} />,
  );
}
