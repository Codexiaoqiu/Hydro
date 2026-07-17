// remarkMedia.ts
import type { Root } from 'mdast';
import type { Plugin } from 'unified';

const MEDIA_RE = /^@\[(youtube|bilibili|pdf|vimeo)\]\(([^)]+)\)$/;

export const remarkMedia: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree);
  };
};

function visit(node: any): void {
  if (node.type === 'paragraph' && node.children?.length === 1 && node.children[0].type === 'text') {
    const text = node.children[0];
    const match = text.value.match(MEDIA_RE);
    if (match) {
      const [, type, url] = match;
      node.children = [{
        type: 'link',
        url,
        title: null,
        children: [{ type: 'text', value: `📺 ${type}` }],
        data: {
          hProperties: {
            'data-media': type,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        },
      }];
      return;
    }
  }
  if (node.children) {
    for (const child of node.children) visit(child);
  }
}
