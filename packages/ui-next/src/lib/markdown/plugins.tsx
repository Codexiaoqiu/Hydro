import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import articleSampleStyles from '../../components/article/Article.module.css';
import { SamplePair } from '../../components/ide/SamplePair';
import { REHYPE_PLUGINS, REMARK_PLUGINS, REMARK_REHYE_OPTIONS } from './plugins-config';
import { preprocessContent } from './preprocess';

/**
 * Run the source through `preprocessContent` (which extracts `||...||`
 * sample-pair blocks out of the prose) and render each block with the
 * shared plugin pipeline. Used by `Article` (problem_detail) and by
 * `MarkdownPreview` so both surfaces show identical rendering.
 */
export function renderArticleBlocks(source: string): ReactNode[] {
  const blocks = preprocessContent(source);
  return blocks.map((b, i) => {
    if (b.type === 'markdown') {
      const body = b.body;
      return (
        <ReactMarkdown
          key={i}
          remarkPlugins={REMARK_PLUGINS}
          rehypePlugins={REHYPE_PLUGINS}
          remarkRehypeOptions={REMARK_REHYE_OPTIONS}
        >
          {body}
        </ReactMarkdown>
      );
    }
    return (
      <div key={i} className={articleSampleStyles.samples}>
        {b.pairs.map((p) => (
          <SamplePair
            key={p.num}
            num={p.num}
            input={{ filename: 'stdin.txt', lineNo: 1, value: <>{p.input}</> }}
            output={{ filename: 'stdout.txt', lineNo: 1, value: <>{p.output}</> }}
          />
        ))}
      </div>
    );
  });
}
