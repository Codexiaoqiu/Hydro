import type { Plugin } from 'unified';
import type { Root, Image, Text } from 'mdast';

const SIZE_REGEX = /=(\d+)x(\d+)?$|=x(\d+)$/;
// Match text nodes that are entire markdown images with space in URL (remark-parse
// doesn't create image nodes when there's a space before the size spec).
const TEXT_IMAGE_REGEX = /^!\[([^\]]*)\]\(([^)\s]+)\s+(=\d+x\d*|=\d+x|=x\d+)\)$/;

export const remarkImageSize: Plugin<[], Root> = function () {
  // Register stringify extension at plugin registration time (processor is unfrozen)
  const extensions = this.data('toMarkdownExtensions') || [];
  extensions.push(imageSizeExtension());
  this.data('toMarkdownExtensions', extensions);

  return (tree) => {
    visit(tree);
  };
};

/**
 * Stringify extension: intercepts image serialization to inject width/height.
 */
function imageSizeExtension() {
  return {
    handlers: {
      image(node: Image) {
        const props = (node.data?.hProperties ?? {}) as Record<string, unknown>;
        const width = props.width;
        const height = props.height;
        const alt = node.alt || '';
        const url = node.url ?? '';

        if (width || height) {
          const sizeAttr =
            (width && height) ? ` width="${width}" height="${height}"` :
            width ? ` width="${width}"` :
            ` height="${height}"`;
          return `![${alt}](${url}${sizeAttr})`;
        }

        return `![${alt}](${url})`;
      }
    }
  };
}

function visit(node: any): void {
  if (node.type === 'image') {
    const match = node.url.match(SIZE_REGEX);
    if (match) {
      const width = match[1];
      const height = match[2] ?? match[3];
      node.url = node.url.replace(SIZE_REGEX, '');
      const data = (node.data ??= {}) as { hProperties?: Record<string, unknown> };
      data.hProperties = {
        ...(data.hProperties ?? {}),
        ...(width ? { width: String(width) } : {}),
        ...(height ? { height: String(height) } : {}),
      };
    }
    return;
  }

  // Handle text nodes that contain image syntax with space in URL.
  // remark-parse does not create image nodes when there is a space before the
  // size spec (e.g. "image.png =100x100" is text, not image).
  if (node.type === 'text') {
    const m = (node as Text).value.match(TEXT_IMAGE_REGEX);
    if (m) {
      const [, alt, url, sizeStr] = m;
      const sizeMatch = sizeStr.match(SIZE_REGEX);
      if (sizeMatch) {
        const width = sizeMatch[1];
        const height = sizeMatch[2] ?? sizeMatch[3];
        // Convert text node to image node in-place
        node.type = 'image';
        node.url = url;
        node.alt = alt;
        delete (node as any).value;
        const data = (node.data ??= {}) as { hProperties?: Record<string, unknown> };
        data.hProperties = {
          ...(data.hProperties ?? {}),
          ...(width ? { width: String(width) } : {}),
          ...(height ? { height: String(height) } : {}),
        };
      }
    }
    return;
  }

  if (node.children) {
    for (const child of node.children) visit(child);
  }
}
