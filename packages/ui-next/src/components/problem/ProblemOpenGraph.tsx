import { useEffect } from 'react';

export interface ProblemOpenGraphProps {
  pdoc: {
    title?: string;
    content?: string | Record<string, string>;
    config?: { type?: string, subType?: string, [k: string]: unknown } | string;
  };
  /**
   * Max characters kept from the rendered description (matches ui-default's
   * `truncate(100, true)` budget). Defaults to 160 to leave room for the
   * `og:description` while still producing keyword-rich copy for crawlers.
   */
  descriptionLimit?: number;
}

const DEFAULT_DESCRIPTION_LEN = 160;

interface MetaDef {
  /** Either a `property` (`og:*`) or a `name` (twitter / generic). */
  attr: 'property' | 'name';
  key: string;
  value: string;
}

function stripMarkdown(s: string): string {
  if (!s) return '';
  let out = s;
  // strip fenced code blocks
  out = out.replace(/```[\s\S]*?```/g, ' ');
  // strip inline code
  out = out.replace(/`[^`]*`/g, ' ');
  // images / links — keep alt text / link text only
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // headings, blockquote, list markers
  out = out.replace(/^[#>\-*+]\s+/gm, '');
  // emphasis markers
  out = out.replace(/[*_~]/g, '');
  // lossy: OG is plaintext only, strip raw HTML tags to avoid <script>
  // literals appearing in crawlers.
  out = out.replace(/<[^>]+>/g, ' ');
  // collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function pickContentText(raw: string | Record<string, string> | undefined): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const langs = Object.keys(raw);
    if (langs.length === 0) return '';
    return raw[langs[0]] ?? '';
  }
  return '';
}

function buildDescription(text: string, limit: number): string {
  const stripped = stripMarkdown(text);
  if (stripped.length <= limit) return stripped;
  // Truncate on a word boundary if possible so we don't break mid-word.
  const slice = stripped.slice(0, limit);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

function buildTitle(title: string | undefined, config: ProblemOpenGraphProps['pdoc']['config']): string {
  const base = title ?? 'Problem';
  if (config && typeof config === 'object' && config.type) {
    const sub = config.subType ? ` · ${config.subType}` : '';
    return `${base} (${config.type}${sub})`;
  }
  return base;
}

/**
 * Side-effect-only component that mirrors the Open Graph metadata block from
 * `templates/problem_detail.html` (lines 30–43). The `next` renderer doesn't
 * currently emit `<meta property="og:*">` tags from the SSR template, so we
 * inject them client-side after mount. Cleanup removes every meta element we
 * added on unmount so navigating between problems doesn't leak stale tags.
 *
 * Cleanup strategy: we tag every meta we create with `data-hydro-og='true'`
 * and the effect captures the exact set it inserted into a `created` array.
 * On unmount we remove exactly those nodes — no `body.dataset.*` writes,
 * no shared singleton `id`, so parallel / re-entered effects cannot delete
 * each other's tags by mistake.
 *
 * SSR-safe: the effect bails out when `document` is unavailable.
 */
export function ProblemOpenGraph({ pdoc, descriptionLimit }: ProblemOpenGraphProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const limit = descriptionLimit ?? DEFAULT_DESCRIPTION_LEN;
    const contentText = pickContentText(pdoc.content);
    const title = buildTitle(pdoc.title, pdoc.config);
    const description = buildDescription(contentText, limit);

    const metas: MetaDef[] = [
      { attr: 'property', key: 'og:title', value: title },
      { attr: 'property', key: 'og:description', value: description },
      { attr: 'property', key: 'og:type', value: 'article' },
    ];

    const created: HTMLMetaElement[] = [];
    for (const m of metas) {
      // Skip if the meta is already provided by the surrounding template.
      const existing = document.head.querySelector<HTMLMetaElement>(
        `meta[${m.attr}="${m.key}"]`,
      );
      if (existing) continue;
      const el = document.createElement('meta');
      el.setAttribute(m.attr, m.key);
      el.setAttribute('content', m.value);
      el.dataset.hydroOg = 'true';
      document.head.appendChild(el);
      created.push(el);
    }

    return () => {
      // Only remove what this effect created; leave any pre-existing tag
      // owned by the surrounding template alone.
      for (const el of created) el.remove();
    };
  }, [pdoc.title, pdoc.content, pdoc.config, descriptionLimit]);

  return null;
}
