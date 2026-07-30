import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { remarkHighlightMark } from 'remark-highlight-mark';
import remarkMath from 'remark-math';
import { remarkImageSize } from './plugins/remarkImageSize';
import { remarkMedia } from './plugins/remarkMedia';

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
