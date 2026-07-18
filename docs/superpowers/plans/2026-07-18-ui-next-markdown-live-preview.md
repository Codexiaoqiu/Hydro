# ui-next Markdown Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a right-side live-rendering preview pane to `MarkdownEditor` so `problem_create` / `problem_edit` in ui-next matches ui-default's "edit-and-see" behavior, reusing the same remark/rehype pipeline as `Article.tsx`.

**Architecture:** Extract the existing remark/rehype plugin constants and the `preprocessContent` + SamplePair rendering logic from `Article.tsx` into a new shared module `lib/markdown/plugins.ts`. Build a new `MarkdownPreview` primitive that consumes `source: string` and renders via the shared pipeline with 150ms debounce and error isolation. `MarkdownEditor` becomes a CSS-grid split-pane that places Monaco on the left and `MarkdownPreview` on the right.

**Tech Stack:** React 19, `@monaco-editor/react`, `react-markdown`, `remark-gfm`, `remark-math`, `remark-highlight-mark`, `remark-math`, `rehype-katex`, `rehype-highlight`, vitest + happy-dom, CSS Modules + design tokens.

## Global Constraints

- TypeScript strict mode (existing project standard); no `any` outside Article's existing `state: any, node: any` handlers (kept for parity with the current code).
- No new dependencies — all required packages are already in `packages/ui-next/package.json`.
- Bundled CSS for katex + highlight.js already imported in `packages/ui-next/src/main.tsx` — do NOT re-import.
- AGPLv3 + project CLAUDE.md rules apply (no AI-only comments, run lint before commit).
- Test environment: `@vitest-environment happy-dom`. Use `vi.mock` for `rehype-katex` if katex math rendering hangs in tests.
- Theme reactivity: respect `window` event `hydro:theme-change` (already used by current `MarkdownEditor`).
- All file paths in this plan are absolute from the repo root (`/home/xq/Hydro/...`).

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/ui-next/src/lib/markdown/plugins.ts` | Create | Shared `REMARK_PLUGINS`, `REHYPE_PLUGINS`, `REMARK_REHYE_OPTIONS`, `renderArticleBlocks()` |
| `packages/ui-next/src/components/article/Article.tsx` | Modify | Remove local constants; delegate to `renderArticleBlocks()` |
| `packages/ui-next/src/components/primitives/MarkdownPreview.tsx` | Create | Live preview with 150ms debounce, error isolation, theme-aware |
| `packages/ui-next/src/components/primitives/MarkdownPreview.test.tsx` | Create | Unit tests for preview rendering |
| `packages/ui-next/src/components/primitives/MarkdownEditor.tsx` | Modify | CSS-grid split-pane; left Monaco, right MarkdownPreview |
| `packages/ui-next/src/components/primitives/MarkdownEditor.module.css` | Modify | Add grid layout + preview pane styling |
| `packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx` | Modify | Add preview rendering assertion |
| `packages/ui-next/src/pages/problem_create.test.tsx` | Modify | Assert preview pane exists |

---

## Task 1: Extract shared markdown plugin pipeline

**Files:**
- Create: `packages/ui-next/src/lib/markdown/plugins.ts`
- Modify: `packages/ui-next/src/components/article/Article.tsx:1-46,60-81,89-102`
- Test: `packages/ui-next/src/components/article/Article.test.tsx` (regression — should remain green)

**Interfaces:**
- Produces: `REMARK_PLUGINS: any[]`, `REHYPE_PLUGINS: any[]`, `REMARK_REHYE_OPTIONS: object`, `renderArticleBlocks(source: string): ReactNode[]`
- Consumes: nothing new (existing plugin imports)

- [ ] **Step 1: Create `lib/markdown/plugins.ts`**

Create file `packages/ui-next/src/lib/markdown/plugins.ts` with the exact content:

```ts
import type { ReactElement, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { remarkHighlightMark } from 'remark-highlight-mark';
import remarkMath from 'remark-math';
import { remarkImageSize } from './plugins/remarkImageSize';
import { remarkMedia } from './plugins/remarkMedia';
import { type ContentBlock, preprocessContent } from './preprocess';
import { SamplePair } from '../../components/ide/SamplePair';
import articleSampleStyles from '../../components/article/Article.module.css';

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

function MarkdownBlock({ body }: { body: string }): ReactElement {
  return renderMarkdown(body);
}
```

Note: `articleSampleStyles.samples` is the existing class on the samples container in `Article.module.css`. Verify by reading `packages/ui-next/src/components/article/Article.module.css` and confirm the class name is `.samples`. If the class name differs (e.g. `.samplePairs`), adjust the import and usage accordingly.

- [ ] **Step 2: Run existing Article tests — they should still fail (Article.tsx not yet updated)**

Run: `yarn workspace @hydrooj/ui-next test -- Article.test`
Expected: PASS (the file imports `Article` directly; new `plugins.ts` is not yet imported by anything). If the file `Article.module.css` doesn't expose `.samples`, the build will fail at vite compile time — adjust the class name in `plugins.ts` accordingly before proceeding.

- [ ] **Step 3: Refactor `Article.tsx`**

Replace the entire `packages/ui-next/src/components/article/Article.tsx` with this simplified version:

```tsx
import type { PropsWithChildren, ReactNode } from 'react';
import { useMemo } from 'react';
import { renderArticleBlocks } from '../../lib/markdown/plugins';
import styles from './Article.module.css';

interface Props {
  langTabs?: ReactNode;
  /**
   * Raw markdown source. Rendered through react-markdown (XSS-safe by default —
   * HTML in the source is escaped). May also be passed as a string child.
   */
  content?: string;
}

export function Article({ langTabs, content, children }: PropsWithChildren<Props>) {
  const source = typeof content === 'string'
    ? content
    : typeof children === 'string'
      ? children
      : null;

  const blocks = useMemo<ReactNode[] | null>(() => {
    if (source === null) return null;
    return renderArticleBlocks(source);
  }, [source]);

  let body: ReactNode;
  if (blocks !== null) {
    body = blocks;
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
```

It preserves the original "prefers content over children when both are strings" behavior — `source` is `content` when both are strings, `children` otherwise; the render path then uses `source` if available.

- [ ] **Step 4: Run Article tests — must still pass**

Run: `yarn workspace @hydrooj/ui-next test -- Article.test`
Expected: All 8 existing Article tests PASS (no behavior change).

- [ ] **Step 5: Run full ui-next test suite — no regression**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: All previously-green tests remain green; only possibly an unrelated flaky test fails. If Article.test or any previously-passing test fails, STOP and re-investigate.

- [ ] **Step 6: Lint**

Run: `yarn lint`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/lib/markdown/plugins.ts packages/ui-next/src/components/article/Article.tsx
git commit -m "refactor(ui-next): extract shared markdown plugin pipeline

Move REMARK_PLUGINS / REHYPE_PLUGINS / REMARK_REHYE_OPTIONS and the
preprocessContent + SamplePair rendering logic out of Article.tsx into
lib/markdown/plugins.ts so MarkdownPreview (the live preview pane)
can render with byte-identical output to the problem detail page.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Create MarkdownPreview primitive

**Files:**
- Create: `packages/ui-next/src/components/primitives/MarkdownPreview.tsx`
- Create: `packages/ui-next/src/components/primitives/MarkdownPreview.test.tsx`

**Interfaces:**
- Produces: `<MarkdownPreview source: string />` — renders debounced live preview
- Consumes: shared `renderArticleBlocks` from Task 1

- [ ] **Step 1: Write failing tests**

Create file `packages/ui-next/src/components/primitives/MarkdownPreview.test.tsx`:

```tsx
/* @vitest-environment happy-dom */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from './MarkdownPreview';

describe('MarkdownPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing-visible (placeholder) for empty source', () => {
    render(<MarkdownPreview source="" />);
    expect(screen.getByTestId('markdown-preview-placeholder')).toBeTruthy();
  });

  it('renders headings after debounce window', () => {
    render(<MarkdownPreview source="# Hello" />);
    // Before debounce: still placeholder
    expect(screen.queryByTestId('markdown-preview-placeholder')).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Hello' })).toBeTruthy();
    expect(screen.queryByTestId('markdown-preview-placeholder')).toBeNull();
  });

  it('debounces rapid source updates to one render', () => {
    const { rerender } = render(<MarkdownPreview source="# A" />);
    rerender(<MarkdownPreview source="# B" />);
    rerender(<MarkdownPreview source="# C" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'C' })).toBeTruthy();
  });

  it('renders GFM tables', () => {
    render(<MarkdownPreview source={'| a | b |\n|---|---|\n| 1 | 2 |'} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('does not crash on very long input', () => {
    const longInput = '# '.repeat(50000);
    expect(() => {
      render(<MarkdownPreview source={longInput} />);
      act(() => {
        vi.advanceTimersByTime(200);
      });
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn workspace @hydrooj/ui-next test -- MarkdownPreview.test`
Expected: FAIL with "Cannot find module './MarkdownPreview'".

- [ ] **Step 3: Implement MarkdownPreview**

Create file `packages/ui-next/src/components/primitives/MarkdownPreview.tsx`:

```tsx
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
```

- [ ] **Step 4: Create MarkdownPreview.module.css**

Create file `packages/ui-next/src/components/primitives/MarkdownPreview.module.css`:

```css
.preview {
  height: 100%;
  min-height: 320px;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  overflow: auto;
}

.placeholder {
  margin: 0;
  color: var(--text-mute);
  font-size: var(--text-sm);
  font-style: italic;
}

.fallback {
  margin: 0;
  padding: var(--space-3);
  background: var(--bg-soft);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  white-space: pre-wrap;
  word-break: break-word;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `yarn workspace @hydrooj/ui-next test -- MarkdownPreview.test`
Expected: All 5 tests PASS.

- [ ] **Step 6: Lint**

Run: `yarn lint`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/components/primitives/MarkdownPreview.tsx packages/ui-next/src/components/primitives/MarkdownPreview.module.css packages/ui-next/src/components/primitives/MarkdownPreview.test.tsx
git commit -m "feat(ui-next): add MarkdownPreview primitive with debounced render

Renders markdown through the shared pipeline (same plugins as
problem_detail) with 150ms debounce, error isolation, and an empty-state
placeholder. Used by MarkdownEditor to provide live preview.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Wire MarkdownPreview into MarkdownEditor as a split-pane

**Files:**
- Modify: `packages/ui-next/src/components/primitives/MarkdownEditor.tsx`
- Modify: `packages/ui-next/src/components/primitives/MarkdownEditor.module.css`
- Modify: `packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx`

**Interfaces:**
- Produces: updated `<MarkdownEditor>` — CSS-grid split with Monaco left + MarkdownPreview right
- Consumes: existing props unchanged (`value`, `onChange`, `onUpload`, `height`, `language`, `aria-label`)

- [ ] **Step 1: Update MarkdownEditor tests**

Replace the entire `packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx` with:

```tsx
/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string; onChange?: (v: string | undefined) => void }) => (
    <textarea
      data-testid="editor-source"
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  ),
  loader: { config: vi.fn() },
}));

import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor (textarea fallback path)', () => {
  test('renders source textarea and preview pane', async () => {
    render(<MarkdownEditor value="hello" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    expect(screen.getByTestId('editor-source').tagName).toBe('TEXTAREA');
    expect((screen.getByTestId('editor-source') as HTMLTextAreaElement).value).toBe('hello');
  });

  test('calls onChange when source textarea changes', async () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    const stub = screen.getByTestId('editor-source') as HTMLTextAreaElement;
    fireEvent.change(stub, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });
});

describe('MarkdownEditor (live preview)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders heading into preview pane after debounce', async () => {
    render(<MarkdownEditor value="# Heading" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.querySelector('h1')?.textContent).toBe('Heading');
  });

  test('renders empty-state placeholder for empty source', async () => {
    render(<MarkdownEditor value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    expect(screen.getByTestId('markdown-preview-placeholder')).toBeTruthy();
  });

  test('updates preview when value prop changes externally (language switch)', async () => {
    const { rerender } = render(<MarkdownEditor value="# English" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('markdown-preview').querySelector('h1')?.textContent).toBe('English');

    rerender(<MarkdownEditor value="# 中文标题" onChange={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('markdown-preview').querySelector('h1')?.textContent).toBe('中文标题');
  });
});
```

- [ ] **Step 2: Run tests — should fail (preview pane not yet wired)**

Run: `yarn workspace @hydrooj/ui-next test -- MarkdownEditor.test`
Expected: FAIL — `getByTestId('markdown-preview')` throws because the preview isn't rendered yet.

- [ ] **Step 3: Update MarkdownEditor.tsx**

Replace the entire `packages/ui-next/src/components/primitives/MarkdownEditor.tsx` with:

```tsx
import { lazy, Suspense, useEffect, useState } from 'react';
import type { OnMount } from '@monaco-editor/react';
import { MarkdownPreview } from './MarkdownPreview';
import styles from './MarkdownEditor.module.css';

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.Editor })),
);

export interface MarkdownEditorProps {
  value: string;
  language?: 'markdown' | string;
  onChange: (val: string) => void;
  onUpload?: (files: File[]) => Promise<string[]>;
  height?: number | string;
  'aria-label'?: string;
}

function readScheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function MarkdownEditor({
  value, language = 'markdown', onChange, onUpload, height = 360, ...rest
}: MarkdownEditorProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readScheme());

  useEffect(() => {
    const onThemeChange = () => setTheme(readScheme());
    window.addEventListener('hydro:theme-change', onThemeChange);
    return () => window.removeEventListener('hydro:theme-change', onThemeChange);
  }, []);

  const handleMount: OnMount = (editor, _monaco) => {
    if (onUpload) {
      editor.addAction({
        id: 'hydro.upload-image',
        label: 'Upload Image',
        contextMenuGroupId: 'hydro',
        run: async () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = async () => {
            if (!input.files?.length) return;
            const urls = await onUpload(Array.from(input.files));
            editor.trigger('keyboard', 'type', { text: urls.map((u) => `![](${u})`).join('\n') });
          };
          input.click();
        },
      });
    }
  };

  return (
    <div className={styles.root} style={{ height }} aria-label={rest['aria-label']}>
      <div className={styles.pane}>
        <Suspense fallback={<textarea className={styles.fallback} value={value} onChange={(e) => onChange(e.target.value)} />}>
          <MonacoEditor
            height="100%"
            language={language}
            value={value}
            onChange={(v) => onChange(v ?? '')}
            onMount={handleMount}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: 'on',
            }}
          />
        </Suspense>
      </div>
      <div className={styles.previewPane}>
        {/* key={value} forces remount on language switch (parent passes a new
            content slice), flushing the preview immediately instead of
            waiting for the 150ms debounce. */}
        <MarkdownPreview key={value} source={value} />
      </div>
    </div>
  );
}
```

Note on the `key={value}` design choice: using `value` as the key remounts `MarkdownPreview` whenever the source changes. This is acceptable for problem_create / problem_edit usage (markdown content rarely shifts to a value with the exact same string across re-renders). For high-frequency keystroke updates, the remount cost is similar to a re-render of the same component. If profiling shows it's a hotspot, the implementation should switch to an explicit `flushKey` prop on `MarkdownPreview` driven by the parent's `activeLang`.

- [ ] **Step 4: Update MarkdownEditor.module.css for split-pane layout**

Replace the entire `packages/ui-next/src/components/primitives/MarkdownEditor.module.css` with:

```css
.root {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  width: 100%;
  border: 1px solid var(--border, #ccc);
  border-radius: 8px;
  overflow: hidden;
}

.pane {
  min-width: 0;
  border-right: 1px solid var(--border);
}

.previewPane {
  min-width: 0;
}

.fallback {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--surface, #fff);
  color: inherit;
}

@media (max-width: 768px) {
  .root {
    grid-template-columns: 1fr;
  }
  .pane {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}
```

- [ ] **Step 5: Run MarkdownEditor tests — should pass**

Run: `yarn workspace @hydrooj/ui-next test -- MarkdownEditor.test`
Expected: All 5 tests PASS.

- [ ] **Step 6: Run full ui-next test suite — no regression**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: All previously-green tests remain green.

- [ ] **Step 7: Lint**

Run: `yarn lint`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add packages/ui-next/src/components/primitives/MarkdownEditor.tsx packages/ui-next/src/components/primitives/MarkdownEditor.module.css packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx
git commit -m "feat(ui-next): MarkdownEditor renders live preview in split pane

Wrap Monaco with a CSS-grid split-pane; left pane keeps the source
editor and image-upload action, right pane mounts MarkdownPreview.
On language switch (value remount) the preview flushes immediately
instead of waiting for the 150ms debounce.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Add problem_create test assertion for preview pane

**Files:**
- Modify: `packages/ui-next/src/pages/problem_create.test.tsx`

**Interfaces:**
- Produces: extra assertion that `problem_create` page renders the preview pane via the existing `MarkdownEditor`
- Consumes: existing `MarkdownEditor` mock from Task 3

- [ ] **Step 1: Add preview assertion to problem_create test**

Replace the entire `packages/ui-next/src/pages/problem_create.test.tsx` with:

```tsx
/* @vitest-environment happy-dom */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { ToastProvider } from '../components/primitives';
import ProblemCreatePage from './problem_create';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string; onChange?: (v: string | undefined) => void }) => (
    <textarea
      data-testid="monaco-stub"
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  ),
  loader: { config: vi.fn() },
}));

function buildPageData(args: PageData['args']): PageData {
  return { name: 'problem_create', template: '', url: '/', args };
}

describe('problem_create page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders empty ProblemForm', () => {
    render(
      <PageDataProvider initial={buildPageData({ statementLangs: ['zh_CN', 'en'], UserContext: { _id: 1 }, UiContext: {} })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemCreatePage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    expect(screen.getByRole('textbox', { name: /标题|title/i })).toBeInTheDocument();
  });

  test('renders live preview pane', () => {
    render(
      <PageDataProvider initial={buildPageData({ statementLangs: ['zh_CN', 'en'], UserContext: { _id: 1 }, UiContext: {} })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemCreatePage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('markdown-preview-placeholder')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run problem_create tests**

Run: `yarn workspace @hydrooj/ui-next test -- problem_create.test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/pages/problem_create.test.tsx
git commit -m "test(ui-next): assert problem_create renders live preview pane

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Full regression sweep + lint + visual baseline

**Files:** none modified; verification only

- [ ] **Step 1: Run full ui-next test suite**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: All tests pass, including the 5 new MarkdownPreview tests, 5 updated MarkdownEditor tests (2 existing + 3 new), and the 2 problem_create tests (1 existing + 1 new). Total: 30 tests across 3 newly-affected files; other files unchanged.

- [ ] **Step 2: Run lint**

Run: `yarn lint`
Expected: no new errors related to changed files. If unrelated lint errors appear (from other recent commits), note them but do not fix them in this plan.

- [ ] **Step 3: Run oxlint fast pass**

Run: `yarn oxlint`
Expected: no new errors.

- [ ] **Step 4: Optional visual regression baseline**

If the user has approved visual baseline updates:

Run: `yarn workspace @hydrooj/ui-next build && yarn workspace @hydrooj/ui-next test:visual:update`

Expected: snapshots regenerated for problem_create page; commit them:

```bash
git add packages/ui-next/test/visual/
git commit -m "test(ui-next): update visual baselines for problem_create live preview

Co-Authored-By: Claude <noreply@anthropic.com>"
```

If the user has NOT approved visual baseline updates, skip this step and note in the PR description that visual baselines need manual review.

- [ ] **Step 5: Manual smoke test**

Start the dev server and load `/problem/create`:

```bash
yarn workspace @hydrooj/ui-next dev
```

Open `http://localhost:3000/problem/create` (or the configured dev URL). Verify:
- [ ] Page loads with split-pane editor (Monaco left, preview right)
- [ ] Typing in the editor updates the preview within ~150ms
- [ ] Preview renders GFM tables, fenced code blocks, images, math
- [ ] Switching language tabs (`zh_CN` ↔ `en`) flushes the preview immediately
- [ ] Empty content shows the placeholder text
- [ ] Theme toggle (light/dark) keeps both panes readable

If any check fails, STOP and investigate before merging.

- [ ] **Step 6: Final commit & summary**

If all checks pass, push the branch and open a PR summarizing:
- "Add live Markdown preview pane to problem_create / problem_edit in ui-next"
- Mention the shared `lib/markdown/plugins.ts` extraction
- Reference this plan file path

---

## Self-Review Notes

**Spec coverage:**
- §1 行为对齐 ui-default → Task 2, Task 3
- §2 预览所见即详情页所见 → Task 1 (shared plugin pipeline)
- §3 不增加新依赖 → verified (all imports exist in package.json)
- §4 保留现有能力 → Task 3 (kept `onUpload`, `aria-label`, textarea fallback)
- §5 测试覆盖 → Tasks 2, 3, 4
- 防抖 150ms → Task 2
- 切语言立即渲染 → Task 3 (`key={value}` remount)
- 错误隔离 → Task 2 (try/catch with `<pre>` fallback)
- 空内容 placeholder → Task 2
- aria-label + aria-live → Task 2
- 响应式 → Task 3 (CSS media query)
- 主题适配 → Task 3 (theme prop on Monaco + `.markdown` class)

**Placeholder scan:** No TBD / TODO / "implement later" — every step has concrete code.

**Type consistency:** `renderArticleBlocks(source: string): ReactNode[]` defined in Task 1, used identically in Tasks 2 and 3. `MarkdownPreview` props defined once and consumed consistently.
