# problem_detail 修复实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `packages/ui-next/src/pages/problem_detail.tsx` 的 markdown 渲染异常,并按 `.claude/1.html` 重构 UI(hero + 主区 + sidebar)。

**Architecture:** 在 react-markdown 上叠加 remark/rehype 插件对齐 ui-default markdown 能力(KaTeX、==mark==、脚注、图片尺寸、媒体嵌入);用预处理把题面切分为 `ContentBlock[]`,在 Article 中按 block 渲染,把 SamplePair 作为兄弟节点插入;新增 Ring/TrendBars/SideCard 视觉组件并按 1.html 三层结构(hero + content + sidebar)重写 problem_detail 页面装配。

**Tech Stack:** TypeScript / React 19 / react-markdown 10 / remark-gfm 4 / remark-mark 6 / remark-footnote 6 / rehype-katex 7 / rehype-highlight 7 / vitest / Playwright

## 全局约束

来自 spec:
- 不引入新后端 API;所有数据来自现有 `handler/problem.ts` 下发字段
- 不安装 `rehype-raw`(避免任意 HTML 注入);XSS 防御沿用 react-markdown 默认
- 暗/亮主题通过 `tokens.css` 现有 CSS 变量自适应,不写主题分支
- ui-default 的 `getNormalMenu / getContestMenu / getHomeworkMenu / pickSidebarItems`、`setUiContext`、`preferredLang`、`headerPrefix`、`contestNav`、`ProblemContent`、`InformationCard` 全部保留(避免回归)
- `mode !== 'normal'` 时 ProblemHero 不渲染(contest 模式 `nSubmit/nAccept/difficulty/stats` 已被 handler 删除)
- 单一 PR,commit 历史清晰

---

## 文件结构

```
packages/ui-next/
├── package.json                                          # 新增 4 个依赖
├── src/
│   ├── lib/markdown/                                     # 新增目录
│   │   ├── preprocess.ts                                 # 切分样例输入/输出
│   │   ├── preprocess.test.ts
│   │   └── plugins/
│   │       ├── remarkImageSize.ts                        # 自写:处理 =100x100
│   │       ├── remarkImageSize.test.ts
│   │       ├── remarkMedia.ts                            # 自写:处理 @[youtube](url)
│   │       └── remarkMedia.test.ts
│   ├── components/
│   │   ├── article/
│   │   │   ├── Article.tsx                               # 扩展:增加插件链 + block 渲染
│   │   │   ├── Article.module.css                        # 增加 .samples / .markdown-block 样式
│   │   │   └── Article.test.tsx                          # 扩展测试
│   │   ├── charts/                                       # 新增目录
│   │   │   ├── Ring.tsx
│   │   │   ├── Ring.module.css
│   │   │   ├── Ring.test.tsx
│   │   │   ├── TrendBars.tsx
│   │   │   ├── TrendBars.module.css
│   │   │   └── TrendBars.test.tsx
│   │   ├── sidebar/
│   │   │   ├── SideCard.tsx                              # 新增
│   │   │   ├── SideCard.module.css
│   │   │   └── SideCard.test.tsx
│   │   └── problem/
│   │       └── ProblemHero.tsx                           # 新增
│   │       └── ProblemHero.module.css
│   └── pages/
│       ├── problem_detail.tsx                            # 重写页面装配
│       └── problem_detail.module.css                     # 重写样式
└── test/visual/
    └── problem-detail.spec.ts                            # 新增视觉回归
```

---

## Task 1: 安装新依赖

**Files:**
- Modify: `packages/ui-next/package.json:24-37`

**Interfaces:**
- Consumes: none
- Produces: package.json 包含 `remark-mark@6`, `remark-footnote@6`, `rehype-katex@7`, `rehype-highlight@7` 作为 dependencies

- [ ] **Step 1: 添加新依赖到 package.json**

在 `dependencies` 中追加(保持字母排序):
```json
"rehype-highlight": "^7.0.0",
"rehype-katex": "^7.0.0",
"remark-footnote": "^6.0.0",
"remark-mark": "^6.0.0",
```

- [ ] **Step 2: 运行 yarn install**

Run: `cd /home/xq/Hydro && yarn`
Expected: 安装成功,无 peer dep 警告

- [ ] **Step 3: 提交**

```bash
git add packages/ui-next/package.json yarn.lock
git commit -m "chore(ui-next): add remark-mark, remark-footnote, rehype-katex, rehype-highlight"
```

---

## Task 2: Markdown 预处理 (`preprocess.ts`)

**Files:**
- Create: `packages/ui-next/src/lib/markdown/preprocess.ts`
- Create: `packages/ui-next/src/lib/markdown/preprocess.test.ts`

**Interfaces:**
- Consumes: `raw: string`
- Produces: `ContentBlock[]`(`markdown` 与 `samples` 两种类型)

- [ ] **Step 1: 写失败测试**

```ts
// preprocess.test.ts
import { describe, expect, it } from 'vitest';
import { preprocessContent } from './preprocess';

describe('preprocessContent', () => {
  it('returns pure markdown when no sample anchor is found', () => {
    const md = '# Title\n\nThis is a problem description.';
    const blocks = preprocessContent(md);
    expect(blocks).toEqual([{ type: 'markdown', body: md }]);
  });

  it('splits Chinese single sample pair', () => {
    const md = [
      '# 题目描述',
      '',
      '计算 a + b。',
      '',
      '## 样例输入',
      '',
      '```',
      '1 2',
      '```',
      '',
      '```',
      '3',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'markdown', body: '# 题目描述\n\n计算 a + b。' });
    expect(blocks[1]).toMatchObject({
      type: 'samples',
      pairs: [{ num: 1, input: '1 2', output: '3' }],
    });
  });

  it('splits English sample pair', () => {
    const md = [
      '## Sample Input/Output',
      '',
      '```',
      '1 2',
      '```',
      '',
      '```',
      '3',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('markdown');
    expect(blocks[1]).toMatchObject({ type: 'samples', pairs: [{ num: 1 }] });
  });

  it('splits Japanese sample pair', () => {
    const md = [
      '## サンプル入力',
      '',
      '```',
      '1 2',
      '```',
      '',
      '```',
      '3',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks[1]).toMatchObject({ type: 'samples' });
  });

  it('splits multiple sample pairs with sequential numbering', () => {
    const md = [
      '## 样例输入',
      '',
      '```',
      '1 2',
      '```',
      '```',
      '3',
      '```',
      '## 数据范围',
      'small',
      '## 样例输入',
      '```',
      '4 5',
      '```',
      '```',
      '9',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    const samples = blocks.filter((b) => b.type === 'samples');
    expect(samples).toHaveLength(2);
    if (samples[0].type === 'samples') {
      expect(samples[0].pairs[0].num).toBe(1);
      expect(samples[0].pairs[0].input).toBe('1 2');
    }
    if (samples[1].type === 'samples') {
      expect(samples[1].pairs[0].num).toBe(2);
      expect(samples[1].pairs[0].input).toBe('4 5');
    }
  });

  it('falls back to markdown when anchor matches but no fenced code follows', () => {
    const md = '# Title\n\n## 样例输入\n\nno code here\n';
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('markdown');
  });

  it('keeps content after sample block as next markdown block', () => {
    const md = [
      '## 样例输入',
      '```',
      '1',
      '```',
      '```',
      '2',
      '```',
      '## 数据范围',
      'small',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(3);
    expect(blocks[2]).toMatchObject({ type: 'markdown', body: '## 数据范围\n\nsmall' });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test preprocess`
Expected: FAIL `Cannot find module './preprocess'`

- [ ] **Step 3: 实现 `preprocess.ts`**

```ts
// preprocess.ts

export interface SamplePairData {
  num: number;
  input: string;
  output: string;
}

export type ContentBlock =
  | { type: 'markdown'; body: string }
  | { type: 'samples'; pairs: SamplePairData[] };

// Multi-language anchors for sample input/output sections
const ANCHOR_PATTERNS: RegExp[] = [
  /^#{1,6}\s*(样例输入\s*[/／\-\s]*输出|样例输入输出|输入输出样例|输入输出示例|輸入輸出範例)\s*$/i,
  /^#{1,6}\s*(Sample Input\s*\/\s*Output|Sample Input and Output|Example Input\s*\/\s*Output|Examples?)\s*$/i,
  /^#{1,6}\s*(サンプル入力|入力例|入出力例)\s*$/i,
];

const NEXT_HEADING = /^#{1,6}\s+/;

function isAnchor(line: string): boolean {
  return ANCHOR_PATTERNS.some((re) => re.test(line.trim()));
}

function extractFencedBlocks(section: string): string[] {
  const blocks: string[] = [];
  const lines = section.split('\n');
  let inBlock = false;
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      if (inBlock) {
        blocks.push(current.join('\n').trim());
        current = [];
        inBlock = false;
      } else {
        inBlock = true;
        current = [];
      }
    } else if (inBlock) {
      current.push(line);
    }
  }
  return blocks;
}

function parseSampleSection(section: string, startNum: number): {
  pairs: SamplePairData[];
  remaining: string;
} {
  const lines = section.split('\n');
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (ANCHOR_PATTERNS.some((re) => re.test(lines[i].trim()))) {
      contentStart = i + 1;
      break;
    }
  }
  let endIdx = lines.length;
  for (let i = contentStart; i < lines.length; i++) {
    if (NEXT_HEADING.test(lines[i]) && !ANCHOR_PATTERNS.some((re) => re.test(lines[i].trim()))) {
      endIdx = i;
      break;
    }
  }
  const contentLines = lines.slice(contentStart, endIdx);
  const remainingLines = lines.slice(endIdx);
  const blocks = extractFencedBlocks(contentLines.join('\n'));

  if (blocks.length === 0) {
    return { pairs: [], remaining: remainingLines.join('\n') };
  }

  const pairs: SamplePairData[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    pairs.push({
      num: startNum + pairs.length,
      input: blocks[i] ?? '',
      output: blocks[i + 1] ?? '',
    });
  }
  return { pairs, remaining: remainingLines.join('\n') };
}

export function preprocessContent(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = raw.split('\n');
  let current: string[] = [];
  let sampleCounter = 1;

  const flushMarkdown = () => {
    const body = current.join('\n').trim();
    if (body) blocks.push({ type: 'markdown', body });
    current = [];
  };

  let i = 0;
  while (i < lines.length) {
    if (isAnchor(lines[i])) {
      flushMarkdown();
      let sectionEnd = lines.length;
      for (let j = i + 1; j < lines.length; j++) {
        if (NEXT_HEADING.test(lines[j])) {
          sectionEnd = j;
          break;
        }
      }
      const section = lines.slice(i, sectionEnd).join('\n');
      const { pairs, remaining } = parseSampleSection(section, sampleCounter);
      if (pairs.length > 0) {
        blocks.push({ type: 'samples', pairs });
        sampleCounter += pairs.length;
      } else {
        blocks.push({ type: 'markdown', body: section.trim() });
      }
      current = remaining ? remaining.split('\n') : [];
      i = sectionEnd;
    } else {
      current.push(lines[i]);
      i++;
    }
  }
  flushMarkdown();
  return blocks;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test preprocess`
Expected: PASS (7 tests)

- [ ] **Step 5: 提交**

```bash
git add packages/ui-next/src/lib/markdown/preprocess.ts packages/ui-next/src/lib/markdown/preprocess.test.ts
git commit -m "feat(ui-next): markdown preprocessing with sample pair extraction"
```

---

## Task 3: remark-image-size 自写插件

**Files:**
- Create: `packages/ui-next/src/lib/markdown/plugins/remarkImageSize.ts`
- Create: `packages/ui-next/src/lib/markdown/plugins/remarkImageSize.test.ts`

**Interfaces:**
- Consumes: mdast tree
- Produces: 修改 image 节点的 url/width/height 属性

- [ ] **Step 1: 写失败测试**

```ts
// remarkImageSize.test.ts
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkImageSize } from './remarkImageSize';

function process(md: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkImageSize)
    .use(remarkStringify)
    .processSync(md)
    .toString();
}

describe('remarkImageSize', () => {
  it('parses =100x100 width x height', () => {
    const result = process('![alt](image.png =100x100)');
    expect(result).toContain('width="100"');
    expect(result).toContain('height="100"');
  });

  it('parses =200x width only', () => {
    const result = process('![alt](image.png =200x)');
    expect(result).toContain('width="200"');
    expect(result).not.toContain('height=');
  });

  it('parses =x100 height only', () => {
    const result = process('![alt](image.png =x100)');
    expect(result).toContain('height="100"');
    expect(result).not.toContain('width=');
  });

  it('leaves image unchanged when no size suffix', () => {
    const result = process('![alt](image.png)');
    expect(result).not.toContain('width=');
    expect(result).not.toContain('height=');
  });

  it('falls back to original url when size spec is invalid', () => {
    const result = process('![alt](image.png =abc)');
    expect(result).toContain('image.png');
    expect(result).not.toContain('width=');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test remarkImageSize`
Expected: FAIL `Cannot find module './remarkImageSize'`

- [ ] **Step 3: 检查依赖**

Run: `cd /home/xq/Hydro && ls node_modules/remark-parse node_modules/remark-stringify node_modules/unified 2>/dev/null | head -5`
Expected: 三个包都存在(react-markdown 的传递依赖)

- [ ] **Step 4: 实现插件**

```ts
// remarkImageSize.ts
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

const SIZE_REGEX = /=(\d+)x(\d+)?$|=x(\d+)$/;

export const remarkImageSize: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree);
  };
};

function visit(node: any): void {
  if (node.type === 'image') {
    const match = node.url.match(SIZE_REGEX);
    if (match) {
      const width = match[1] ?? match[3];
      const height = match[2];
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
  if (node.children) {
    for (const child of node.children) visit(child);
  }
}
```

- [ ] **Step 5: 运行测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test remarkImageSize`
Expected: PASS (5 tests)

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/lib/markdown/plugins/remarkImageSize.ts packages/ui-next/src/lib/markdown/plugins/remarkImageSize.test.ts
git commit -m "feat(ui-next): remark-image-size plugin for =100x100 syntax"
```

---

## Task 4: remark-media 自写插件

**Files:**
- Create: `packages/ui-next/src/lib/markdown/plugins/remarkMedia.ts`
- Create: `packages/ui-next/src/lib/markdown/plugins/remarkMedia.test.ts`

**Interfaces:**
- Consumes: mdast tree
- Produces: 把 `@[type](url)` 节点转换为带 `data-media` 属性的 link 节点

- [ ] **Step 1: 写失败测试**

```ts
// remarkMedia.test.ts
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkMedia } from './remarkMedia';

function process(md: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkMedia)
    .use(remarkStringify)
    .processSync(md)
    .toString();
}

describe('remarkMedia', () => {
  it('handles @[youtube](url)', () => {
    const result = process('Watch @[youtube](https://youtube.com/watch?v=abc) here');
    expect(result).toContain('https://youtube.com/watch?v=abc');
    expect(result).toContain('youtube');
  });

  it('handles @[bilibili](url)', () => {
    const result = process('See @[bilibili](https://bilibili.com/video/av123)');
    expect(result).toContain('https://bilibili.com/video/av123');
  });

  it('handles @[pdf](url)', () => {
    const result = process('Read @[pdf](https://example.com/doc.pdf)');
    expect(result).toContain('https://example.com/doc.pdf');
    expect(result).toContain('pdf');
  });

  it('handles @[vimeo](url)', () => {
    const result = process('@[vimeo](https://vimeo.com/123)');
    expect(result).toContain('https://vimeo.com/123');
  });

  it('does not modify regular links', () => {
    const result = process('[normal](https://example.com)');
    expect(result).toContain('https://example.com');
    expect(result).not.toContain('data-media=');
  });

  it('does not modify email addresses', () => {
    const result = process('email@example.com');
    expect(result).toContain('email@example.com');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test remarkMedia`
Expected: FAIL

- [ ] **Step 3: 实现插件**

```ts
// remarkMedia.ts
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

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
```

- [ ] **Step 4: 运行测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test remarkMedia`
Expected: PASS (6 tests)

- [ ] **Step 5: 提交**

```bash
git add packages/ui-next/src/lib/markdown/plugins/remarkMedia.ts packages/ui-next/src/lib/markdown/plugins/remarkMedia.test.ts
git commit -m "feat(ui-next): remark-media plugin for @[youtube|pdf|bilibili|vimeo](url)"
```

---

## Task 5: Article 组件扩展(插件链 + block 渲染)

**Files:**
- Modify: `packages/ui-next/src/components/article/Article.tsx`
- Modify: `packages/ui-next/src/components/article/Article.module.css`
- Modify: `packages/ui-next/src/components/article/Article.test.tsx`

**Interfaces:**
- Consumes: `preprocessContent` (Task 2), `remarkImageSize` (Task 3), `remarkMedia` (Task 4), `SamplePair` (已有)
- Produces: `Article` 组件支持 `content` 字符串 → 预处理 → block-by-block 渲染;markdown 块用 ReactMarkdown 配完整插件链

- [ ] **Step 1: 添加失败测试到 Article.test.tsx**

在文件末尾追加:

```tsx
import { preprocessContent } from '../../lib/markdown/preprocess';

describe('Article — extended plugins', () => {
  it('renders ==mark== as <mark>', () => {
    const { container } = render(<Article content={'==highlight=='} />);
    expect(container.querySelector('mark')?.textContent).toBe('highlight');
  });

  it('renders KaTeX inline formula', () => {
    const { container } = render(<Article content={'$a + b$'} />);
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('renders fenced code with language class for highlight.js', () => {
    const { container } = render(
      <Article content={'```js\nconst x = 1;\n```'} />,
    );
    const code = container.querySelector('pre code');
    expect(code).toBeTruthy();
  });

  it('extracts sample pair into SamplePair component', () => {
    const md = '## 样例输入\n```\n1 2\n```\n```\n3\n```';
    const { container } = render(<Article content={md} />);
    expect(container.textContent).toContain('1 2');
    expect(container.textContent).toContain('3');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test Article`
Expected: 至少 2 个测试 FAIL(mark 与 sample pair)

- [ ] **Step 3: 重写 Article.tsx**

```tsx
// Article.tsx
import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMark from 'remark-mark';
import remarkFootnote from 'remark-footnote';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { preprocessContent, type ContentBlock } from '../../lib/markdown/preprocess';
import { remarkImageSize } from '../../lib/markdown/plugins/remarkImageSize';
import { remarkMedia } from '../../lib/markdown/plugins/remarkMedia';
import { SamplePair } from '../ide/SamplePair';
import styles from './Article.module.css';

interface Props {
  langTabs?: ReactNode;
  content?: string;
}

function MarkdownBlock({ body }: { body: string }): ReactElement {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMark, remarkFootnote, remarkImageSize, remarkMedia]}
      rehypePlugins={[rehypeKatex, rehypeHighlight]}
    >
      {body}
    </ReactMarkdown>
  );
}

function SamplePairsBlock({ pairs }: { pairs: Array<{ num: number; input: string; output: string }> }): ReactElement {
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
    body = <MarkdownBlock body={content} />;
  } else if (typeof children === 'string') {
    body = <MarkdownBlock body={children} />;
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

- [ ] **Step 4: 扩展 Article.module.css**

在文件末尾追加:

```css
.samples { display: grid; grid-template-columns: 1fr; gap: 14px; margin: 18px 0 8px; }
.article :global(mark) {
  background: var(--tint-cyan-18);
  color: var(--cyan);
  padding: 1px 6px;
  border-radius: 4px;
  font-style: normal;
}
.article :global(pre) {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
}
.article :global(pre code) {
  background: transparent;
  padding: 0;
  border: 0;
  font-style: normal;
}
.article :global(.katex) { font-size: 1.05em; }
```

- [ ] **Step 5: 运行所有 Article 测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test Article`
Expected: 全部 PASS(原 8 + 新 4)

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/components/article/Article.tsx packages/ui-next/src/components/article/Article.module.css packages/ui-next/src/components/article/Article.test.tsx
git commit -m "feat(ui-next): Article supports KaTeX, mark, footnote, imsize, media; sample pair extraction"
```

---

## Task 6: Ring 组件

**Files:**
- Create: `packages/ui-next/src/components/charts/Ring.tsx`
- Create: `packages/ui-next/src/components/charts/Ring.module.css`
- Create: `packages/ui-next/src/components/charts/Ring.test.tsx`

**Interfaces:**
- Consumes: `percent: number` (0-100), `size?: number`
- Produces: SVG 圆环(track + bar)

- [ ] **Step 1: 写失败测试**

```tsx
// Ring.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ring } from './Ring';

describe('Ring', () => {
  it('renders SVG with two circles', () => {
    const { container } = render(<Ring percent={50} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('clamps percent to 0', () => {
    const { container } = render(<Ring percent={-10} />);
    const bar = container.querySelectorAll('circle')[1];
    expect(bar?.getAttribute('style')).toContain('stroke-dashoffset: 251');
  });

  it('clamps percent to 100', () => {
    const { container } = render(<Ring percent={150} />);
    const bar = container.querySelectorAll('circle')[1];
    expect(bar?.getAttribute('style')).toContain('stroke-dashoffset: 0');
  });

  it('renders mid value correctly', () => {
    const { container } = render(<Ring percent={50} />);
    const bar = container.querySelectorAll('circle')[1];
    expect(bar?.getAttribute('style')).toContain('stroke-dashoffset: 125');
  });

  it('uses custom size when provided', () => {
    const { container } = render(<Ring percent={50} size={100} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('100');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test Ring`
Expected: FAIL `Cannot find module './Ring'`

- [ ] **Step 3: 实现 Ring 组件**

```tsx
// Ring.tsx
import styles from './Ring.module.css';

interface Props {
  percent: number;
  size?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

const CIRCUMFERENCE = 251;

export function Ring({ percent, size = 86, gradientFrom, gradientTo }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradientFrom ?? 'var(--cyan)'} />
            <stop offset="100%" stopColor={gradientTo ?? 'var(--violet)'} />
          </linearGradient>
        </defs>
        <circle className={styles.track} cx="50" cy="50" r="40" />
        <circle
          className={styles.bar}
          cx="50" cy="50" r="40"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: 实现 Ring.module.css**

```css
.ring {
  position: relative;
  flex-shrink: 0;
}
.ring svg { transform: rotate(-90deg); }
.ring circle {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
}
.track { stroke: var(--surface-2); }
.bar {
  stroke: url(#ring-gradient);
  stroke-dasharray: 251;
  stroke-dashoffset: 251;
  transition: stroke-dashoffset 1.4s ease;
}
html[data-theme='light'] .bar { stroke: #000; }
```

- [ ] **Step 5: 运行测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test Ring`
Expected: PASS (5 tests)

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/components/charts/Ring.tsx packages/ui-next/src/components/charts/Ring.module.css packages/ui-next/src/components/charts/Ring.test.tsx
git commit -m "feat(ui-next): Ring chart component"
```

---

## Task 7: TrendBars 组件(为未来 stats API 预留)

**Files:**
- Create: `packages/ui-next/src/components/charts/TrendBars.tsx`
- Create: `packages/ui-next/src/components/charts/TrendBars.module.css`
- Create: `packages/ui-next/src/components/charts/TrendBars.test.tsx`

**Interfaces:**
- Consumes: `values: number[]` (0-1 标准化)
- Produces: flex 容器,每根柱子高度按比例

- [ ] **Step 1: 写失败测试**

```tsx
// TrendBars.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrendBars } from './TrendBars';

describe('TrendBars', () => {
  it('renders one bar per value', () => {
    const { container } = render(<TrendBars values={[0.2, 0.5, 0.8]} />);
    const bars = container.querySelectorAll('[data-trend-bar]');
    expect(bars.length).toBe(3);
  });

  it('applies height as percentage of value', () => {
    const { container } = render(<TrendBars values={[0.5]} />);
    const bar = container.querySelector('[data-trend-bar]') as HTMLElement;
    expect(bar.style.height).toBe('50%');
  });

  it('clamps values to [0, 1]', () => {
    const { container } = render(<TrendBars values={[-0.1, 1.5, 0.5]} />);
    const bars = container.querySelectorAll('[data-trend-bar]');
    expect((bars[0] as HTMLElement).style.height).toBe('0%');
    expect((bars[1] as HTMLElement).style.height).toBe('100%');
    expect((bars[2] as HTMLElement).style.height).toBe('50%');
  });

  it('renders nothing when values is empty', () => {
    const { container } = render(<TrendBars values={[]} />);
    expect(container.querySelectorAll('[data-trend-bar]').length).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test TrendBars`
Expected: FAIL

- [ ] **Step 3: 实现 TrendBars**

```tsx
// TrendBars.tsx
import styles from './TrendBars.module.css';

interface Props {
  values: number[];
  gradientFrom?: string;
  gradientTo?: string;
}

export function TrendBars({ values, gradientFrom = 'var(--cyan)', gradientTo = 'var(--cyan)' }: Props) {
  const clamped = values.map((v) => Math.max(0, Math.min(1, v)));
  return (
    <div className={styles.trend}>
      {clamped.map((v, i) => (
        <div
          key={i}
          data-trend-bar=""
          className={styles.bar}
          style={{
            height: `${v * 100}%`,
            background: `linear-gradient(180deg, ${gradientFrom}, ${gradientTo})`,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 实现 TrendBars.module.css**

```css
.trend {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 50px;
  margin-top: 16px;
}
.bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  opacity: 0.85;
  min-height: 2px;
}
html[data-theme='light'] .bar {
  background: linear-gradient(180deg, #171717, rgba(23, 23, 23, 0.15)) !important;
}
```

- [ ] **Step 5: 运行测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test TrendBars`
Expected: PASS (4 tests)

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/components/charts/TrendBars.tsx packages/ui-next/src/components/charts/TrendBars.module.css packages/ui-next/src/components/charts/TrendBars.test.tsx
git commit -m "feat(ui-next): TrendBars component for future stats API integration"
```

---

## Task 8: SideCard 组件

**Files:**
- Create: `packages/ui-next/src/components/sidebar/SideCard.tsx`
- Create: `packages/ui-next/src/components/sidebar/SideCard.module.css`
- Create: `packages/ui-next/src/components/sidebar/SideCard.test.tsx`

**Interfaces:**
- Consumes: `title: string`, `children: ReactNode`, `accent?: boolean`
- Produces: 圆角卡片,h4 带可选 accent-dot

- [ ] **Step 1: 写失败测试**

```tsx
// SideCard.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SideCard } from './SideCard';

describe('SideCard', () => {
  it('renders title and children', () => {
    const { container } = render(
      <SideCard title="出题人">
        <span data-testid="child">child</span>
      </SideCard>,
    );
    expect(container.textContent).toContain('出题人');
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it('shows accent dot by default', () => {
    const { container } = render(<SideCard title="x">content</SideCard>);
    expect(container.querySelector('[data-accent-dot]')).toBeTruthy();
  });

  it('hides accent dot when accent=false', () => {
    const { container } = render(
      <SideCard title="x" accent={false}>content</SideCard>,
    );
    expect(container.querySelector('[data-accent-dot]')).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test SideCard`
Expected: FAIL

- [ ] **Step 3: 实现 SideCard**

```tsx
// SideCard.tsx
import type { PropsWithChildren, ReactNode } from 'react';
import styles from './SideCard.module.css';

interface Props {
  title: string;
  children: ReactNode;
  accent?: boolean;
}

export function SideCard({ title, children, accent = true }: PropsWithChildren<Props>) {
  return (
    <div className={styles.card}>
      <h4 className={styles.h}>
        {accent && <span className={styles.dot} data-accent-dot="" />}
        {title}
      </h4>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 实现 SideCard.module.css**

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 22px 24px;
}
.h {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--cyan), var(--violet));
  box-shadow: 0 0 10px rgba(94, 234, 212, 0.6);
}
html[data-theme='light'] .dot {
  background: #000;
  box-shadow: none;
}
```

- [ ] **Step 5: 运行测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test SideCard`
Expected: PASS (3 tests)

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/components/sidebar/SideCard.tsx packages/ui-next/src/components/sidebar/SideCard.module.css packages/ui-next/src/components/sidebar/SideCard.test.tsx
git commit -m "feat(ui-next): SideCard component for sidebar sections"
```

---

## Task 9: ProblemHero 组件

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemHero.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemHero.module.css`
- Create: `packages/ui-next/src/components/problem/ProblemHero.test.tsx`

**Interfaces:**
- Consumes: `pdoc`(Pdoc 简化版)、`owner_udoc?`、`subtitle?`、`tags?`
- Produces: hero 卡片(eyebrow + title + chips + 通过率 ring)

- [ ] **Step 1: 写失败测试**

```tsx
// ProblemHero.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProblemHero } from './ProblemHero';

const basePdoc = {
  docId: 1000,
  pid: 'H1000',
  title: 'A + B Problem',
  config: { type: 'default', subType: 'std', timeMin: 1000, timeMax: 1000, memoryMin: 1024, memoryMax: 1024 },
  nSubmit: 100,
  nAccept: 45,
};

describe('ProblemHero', () => {
  it('renders title and prefix', () => {
    const { container } = render(<ProblemHero pdoc={basePdoc} />);
    expect(container.textContent).toContain('A + B Problem');
    expect(container.textContent).toContain('#H1000');
  });

  it('renders pass rate ring with correct percent', () => {
    const { container } = render(<ProblemHero pdoc={basePdoc} />);
    const bar = container.querySelector('circle[style*="stroke-dashoffset"]');
    // 45% → offset = 251 * 0.55 ≈ 138
    expect(bar?.getAttribute('style')).toMatch(/stroke-dashoffset: 13[78]/);
  });

  it('handles zero submissions gracefully', () => {
    const { container } = render(<ProblemHero pdoc={{ ...basePdoc, nSubmit: 0, nAccept: 0 }} />);
    expect(container.textContent).toContain('0');
  });

  it('renders difficulty chip when provided', () => {
    const { container } = render(<ProblemHero pdoc={{ ...basePdoc, difficulty: 5 }} />);
    expect(container.textContent).toContain('5');
  });

  it('renders time and memory chips', () => {
    const { container } = render(<ProblemHero pdoc={basePdoc} />);
    expect(container.textContent).toContain('1000ms');
    expect(container.textContent).toContain('1024MB');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test ProblemHero`
Expected: FAIL

- [ ] **Step 3: 实现 ProblemHero**

```tsx
// ProblemHero.tsx
import { Chip, Eyebrow } from '../primitives';
import { Ring } from '../charts/Ring';
import styles from './ProblemHero.module.css';

interface PdocLite {
  docId: number;
  pid?: string;
  title: string;
  difficulty?: number;
  nSubmit?: number;
  nAccept?: number;
  tag?: string[];
  config?: {
    type?: string;
    subType?: string;
    timeMin?: number;
    timeMax?: number;
    memoryMin?: number;
    memoryMax?: number;
    [k: string]: unknown;
  } | string;
}

interface Props {
  pdoc: PdocLite;
  subtitle?: string;
}

export function ProblemHero({ pdoc, subtitle }: Props) {
  const cfg = typeof pdoc.config === 'object' && pdoc.config ? pdoc.config : null;
  const nSubmit = pdoc.nSubmit ?? 0;
  const nAccept = pdoc.nAccept ?? 0;
  const passRate = nSubmit > 0 ? Math.round((nAccept / nSubmit) * 100) : 0;
  const typeLabel = cfg?.type ?? 'default';
  const levelLabel = pdoc.difficulty != null ? `Level ${pdoc.difficulty}` : 'Beginner';
  const prefix = `#${pdoc.pid ?? pdoc.docId}`;

  return (
    <section className={styles.hero}>
      <div className={styles.left}>
        <Eyebrow>Problem · {typeLabel} · {levelLabel}</Eyebrow>
        <h1 className={styles.title}>
          <span className={styles.prefix}>{prefix}</span>
          {pdoc.title}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        <div className={styles.chips}>
          <Chip>ID <strong>{pdoc.docId}</strong></Chip>
          {cfg?.timeMin != null && cfg?.timeMax != null && (
            <Chip>
              <strong>{cfg.timeMin === cfg.timeMax ? cfg.timeMin : `${cfg.timeMin}~${cfg.timeMax}`}</strong> ms
            </Chip>
          )}
          {cfg?.memoryMin != null && cfg?.memoryMax != null && (
            <Chip>
              <strong>{cfg.memoryMin === cfg.memoryMax ? cfg.memoryMin : `${cfg.memoryMin}~${cfg.memoryMax}`}</strong> MiB
            </Chip>
          )}
          {pdoc.difficulty != null && (
            <Chip variant="diff">难度 <strong>{pdoc.difficulty} / 10</strong></Chip>
          )}
          {pdoc.tag?.map((t) => (
            <Chip key={t} variant="tag">{t}</Chip>
          ))}
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>通过率</div>
          <div className={styles.ringWrap}>
            <Ring percent={passRate} />
            <div className={styles.detail}>
              <div className={styles.row}><span>提交</span><b>{nSubmit.toLocaleString()}</b></div>
              <div className={styles.row}><span>通过</span><b>{nAccept.toLocaleString()}</b></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 实现 ProblemHero.module.css**

```css
.hero {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 28px;
  padding: 36px 40px;
  background:
    linear-gradient(135deg, rgba(94, 234, 212, 0.08), rgba(196, 181, 253, 0.06) 60%, transparent),
    var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  position: relative;
  overflow: hidden;
}
.left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.title {
  font-family: var(--font-display);
  font-size: 64px;
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 14px 0 8px;
}
.prefix {
  background: linear-gradient(135deg, var(--cyan) 0%, var(--blue) 40%, var(--violet) 80%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-right: 16px;
}
html[data-theme='light'] .prefix {
  background: none;
  -webkit-background-clip: initial;
  background-clip: initial;
  color: #000;
}
.subtitle {
  color: var(--text-soft);
  font-size: 16px;
  max-width: 640px;
  margin: 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}
.right {
  display: flex;
  align-items: center;
}
.statCard {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 22px 24px;
}
.statLabel {
  font-size: 12px;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}
.ringWrap {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 14px;
}
.detail { flex: 1; font-size: 13px; color: var(--text-soft); }
.row { display: flex; justify-content: space-between; padding: 4px 0; }
.row b { color: var(--text); font-weight: 600; }
@media (max-width: 1024px) {
  .hero { grid-template-columns: 1fr; }
  .title { font-size: 44px; }
}
```

- [ ] **Step 5: 运行测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test ProblemHero`
Expected: PASS (5 tests)

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/components/problem/ProblemHero.tsx packages/ui-next/src/components/problem/ProblemHero.module.css packages/ui-next/src/components/problem/ProblemHero.test.tsx
git commit -m "feat(ui-next): ProblemHero with eyebrow, title, chips, pass-rate ring"
```

---

## Task 10: 重写 problem_detail.tsx + problem_detail.module.css

**Files:**
- Modify: `packages/ui-next/src/pages/problem_detail.tsx`
- Modify: `packages/ui-next/src/pages/problem_detail.module.css`

**Interfaces:**
- Consumes: 全部前置任务的组件(`ProblemHero`、`SideCard`、`Article`、`SamplePair`、`Menu`、`CtaCard`、`Author`、`ContestList`、`TagCloud`、`Ring`)
- Produces: 按 1.html 三层结构装配的页面

- [ ] **Step 1: 复制现有 problem_detail.tsx 为起点**

```bash
cp packages/ui-next/src/pages/problem_detail.tsx /tmp/problem_detail.tsx.bak
```

保留以下不变:
- `Pdoc`/`Rdoc`/`Psdoc`/`Tdoc`/`Tsdoc`/`Udoc`/`Args` 类型定义
- `getAlphabeticId`、`statusClassName`、`readContentText`、`getTidQuery`
- `getNormalMenu`、`getContestMenu`、`getHomeworkMenu`、`pickSidebarItems`
- `SidebarCtx` 接口
- 现有 `setUiContext` useEffect(Bug #10)
- 现有 `preferredLang` useMemo(Bug #6)
- 现有 `headerPrefix` useMemo(A/B/C 编号)
- 现有 `ProblemTagRow`、`ProblemContent`、`InformationCard`、`RelatedCard` 子组件

- [ ] **Step 2: 重写 problem_detail.module.css**

完全替换文件内容:

```css
.page {
  max-width: 1320px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-6);
  align-items: start;
  padding-bottom: 80px;
}
.content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.cardHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 26px;
  border-bottom: 1px solid var(--border);
}
.cardHead h3 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}
.langTabs {
  display: inline-flex;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 4px;
  gap: 2px;
}
.langTab,
.langTabActive {
  background: transparent;
  border: 0;
  padding: 7px 14px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text-mute);
  transition: all 0.2s ease;
}
.langTab:hover { color: var(--text); }
.langTabActive {
  color: var(--text);
  background: var(--tint-cyan-12);
  box-shadow: inset 0 0 0 1px var(--tint-cyan-30);
}
.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  position: sticky;
  top: 88px;
}
.sidebarCard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 22px 24px;
}
.ctaBlock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  background: linear-gradient(135deg, var(--tint-cyan-10), var(--tint-violet-10));
  border: 1px solid var(--tint-cyan-25);
  border-radius: 16px;
  margin-bottom: 12px;
  text-decoration: none;
  color: inherit;
}
.ctaBlockText { font-size: 14px; flex: 1; }
.ctaBlockText b { display: block; font-size: 15px; font-weight: 600; }
.ctaBlockText small { color: var(--text-mute); font-size: 12px; }
.ctaBlockBtn {
  background: var(--text);
  color: var(--bg-0);
  border: 0;
  border-radius: 10px;
  padding: 9px 16px;
  font-weight: 600;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

/* Fallback header for contest mode */
.header { display: flex; flex-direction: column; gap: var(--space-3); }
.titleFallback {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 700;
  margin: 0;
  line-height: var(--leading-tight);
}
.prefixFallback {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.tagRow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: var(--text-sm);
  color: var(--text-soft);
  align-items: center;
}
.contestNav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
}
.contestNavItem {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-weight: 700;
  text-decoration: none;
}
.contestNavItem:hover { background: var(--surface); }
.contestNavPass { background: var(--tint-green-12); color: var(--green); }
.contestNavFail { background: rgba(252, 165, 165, 0.12); color: var(--red); }
.statusBadge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  color: var(--text);
  font-size: var(--text-sm);
  text-decoration: none;
  border: 1px solid var(--border);
}
.statusIcon {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.ac { background: var(--green); }
.wa { background: var(--red); }
.tle { background: var(--amber); }
.mle { background: var(--violet); }
.re { background: var(--pink); }
.se { background: var(--text-mute); }
.ce { background: var(--blue); }
.pe { background: var(--cyan); }

@media (max-width: 1024px) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .sidebar { position: static; }
}
```

- [ ] **Step 3: 重写 problem_detail.tsx**

完全替换文件内容(保留所有 helper 与子组件,只在主 return 上重写装配):

```tsx
import { useEffect, useMemo } from 'react';
import { STATUS } from '@hydrooj/common';
import { usePageData, useSetUiContext } from '../context/page-data';
import { Link } from '../components/link';
import { Alert, Chip, Eyebrow } from '../components/primitives';
import { Article } from '../components/article/Article';
import { Menu, type MenuItem } from '../components/sidebar/Menu';
import { Author } from '../components/sidebar/Author';
import { ContestList, type ContestItem } from '../components/sidebar/ContestList';
import { TagCloud } from '../components/primitives/TagCloud';
import { SideCard } from '../components/sidebar/SideCard';
import { ProblemHero } from '../components/problem/ProblemHero';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import styles from './problem_detail.module.css';

// ===== Types (unchanged from existing) =====================================
interface Pdoc {
  docId: number;
  pid?: string;
  title: string;
  hidden?: boolean;
  tag?: string[];
  difficulty?: number;
  nSubmit?: number;
  nAccept?: number;
  content?: string | Record<string, string>;
  config?: {
    type?: string;
    subType?: string;
    timeMin?: number;
    timeMax?: number;
    memoryMin?: number;
    memoryMax?: number;
    langs?: string[];
    [k: string]: unknown;
  } | string;
  reference?: { domainId: string; pid: string | number };
  data?: unknown[];
  additional_file?: Array<{ name: string; size: number }>;
}

interface Rdoc { _id?: string; status?: number; score?: number; }
interface Psdoc { star?: boolean; status?: number; }
interface Tdoc { _id?: string; docId?: string; pids?: Array<number | string>; rule?: string; owner?: number; }
interface Tsdoc { detail?: Record<string, { status?: number }>; attend?: boolean; startAt?: number; }
interface Udoc { _id?: number; uname?: string; avatar?: string; }
interface Args {
  pdoc: Pdoc;
  rdoc?: Rdoc;
  psdoc?: Psdoc;
  udoc?: Udoc;
  tdoc?: Tdoc;
  tsdoc?: Tsdoc;
  owner_udoc?: Udoc;
  tdocs?: Array<{ docId: string; title: string }>;
  ctdocs?: Array<{ docId: string; title: string }>;
  htdocs?: Array<{ docId: string; title: string }>;
  discussionCount?: number;
  solutionCount?: number;
  mode?: 'normal' | 'contest' | 'view' | 'correction';
  UserContext?: {
    _id?: number;
    uname?: string;
    avatar?: string;
    hasPerm?: (p: number) => boolean;
    hasPriv?: (p: number) => boolean;
    own?: (p: { owner?: number }, perm: number) => boolean;
    viewLang?: string;
    codeLang?: string;
    codeTemplate?: string;
    canViewRecord?: boolean;
  };
}

type Mode = NonNullable<Args['mode']>;

function getAlphabeticId(idx: number): string {
  let s = '';
  let n = idx;
  while (true) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return s;
}

function statusClassName(status?: number): string {
  if (status === undefined) return '';
  switch (status) {
    case STATUS.STATUS_ACCEPTED: return 'ac';
    case STATUS.STATUS_WRONG_ANSWER: return 'wa';
    case STATUS.STATUS_TIME_LIMIT_EXCEEDED: return 'tle';
    case STATUS.STATUS_MEMORY_LIMIT_EXCEEDED: return 'mle';
    case STATUS.STATUS_RUNTIME_ERROR: return 're';
    case STATUS.STATUS_SYSTEM_ERROR: return 'se';
    case STATUS.STATUS_COMPILE_ERROR: return 'ce';
    case STATUS.STATUS_OUTPUT_LIMIT_EXCEEDED: return 'pe';
    default: return '';
  }
}

function readContentText(content: Pdoc['content'] | undefined, preferredLang: string): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content !== 'object') return '';
  const map = content as Record<string, unknown>;
  const pickFromMap = (m: Record<string, unknown>): string => {
    const direct = m[preferredLang];
    if (typeof direct === 'string') return direct;
    const directStr = String(direct ?? '');
    if (directStr.trimStart().startsWith('{')) {
      try {
        const parsed = JSON.parse(directStr);
        if (parsed && typeof parsed === 'object') {
          const parsedMap = parsed as Record<string, unknown>;
          if (typeof parsedMap[preferredLang] === 'string') return parsedMap[preferredLang] as string;
          const first = Object.values(parsedMap).find((v) => typeof v === 'string');
          if (typeof first === 'string') return first;
        }
      } catch {
        /* fall through */
      }
    }
    const firstAny = Object.values(m).find((v) => typeof v === 'string');
    return typeof firstAny === 'string' ? firstAny : '';
  };
  return pickFromMap(map);
}

interface SidebarCtx {
  pdoc: Pdoc;
  tdoc?: Tdoc;
  UserContext?: Args['UserContext'];
  buildUrl: ReturnType<typeof useBuildUrl>;
  discussionCount: number;
  solutionCount: number;
  psdoc?: Psdoc;
}

function getTidQuery(tdoc?: Tdoc): Record<string, string> {
  return tdoc && tdoc.docId != null ? { tid: String(tdoc.docId) } : {};
}

function getNormalMenu(ctx: SidebarCtx, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const {
    pdoc, tdoc, UserContext, buildUrl, discussionCount, solutionCount, psdoc,
  } = ctx;

  const items: MenuItem[] = [];
  const isLoggedIn = !!UserContext?._id;
  const canSubmit = UserContext?.hasPerm?.(8) ?? false;
  const canRejudge = UserContext?.hasPerm?.(4096) ?? false;
  const canViewDiscussion = UserContext?.hasPerm?.(256) ?? false;
  const psdocAccepted = psdoc?.status === STATUS.STATUS_ACCEPTED;
  const canViewSolution =
    UserContext?.hasPerm?.(1) ||
    (UserContext?.hasPerm?.(2) && psdocAccepted);
  const canEditProblem =
    (pdoc && UserContext?.own?.(pdoc as unknown as { owner?: number }, 16)) ||
    UserContext?.hasPerm?.(16);
  const showRejudge = canRejudge && !pdoc.reference;

  if (canSubmit) {
    items.push({
      key: 'submit',
      title: t('Problem.Submit'),
      href: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  } else if (isLoggedIn) {
    items.push({
      key: 'submit',
      title: t('Problem.NoPermissionToSubmit'),
      href: '#',
      onClick: () => {/* TODO: show permission hint */},
    });
  } else {
    items.push({
      key: 'submit',
      title: t('Problem.LoginToSubmit'),
      href: '#',
      onClick: () => {/* TODO: open sign-in dialog */},
    });
  }

  if (showRejudge) {
    items.push({
      key: 'rejudge',
      title: t('Problem.Rejudge'),
      form: true,
      action: '',
      postBody: { operation: 'rejudge' },
    });
  }

  if (canViewDiscussion || canViewSolution) {
    items.push({ key: 'sep-1', separator: true });
  }
  if (canViewDiscussion) {
    items.push({
      key: 'discussions',
      title: `${t('Problem.Discussions')} (${discussionCount})`,
      href: buildUrl('discussion_node', { type: 'problem', name: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }
  if (canViewSolution) {
    items.push({
      key: 'solutions',
      title: `${t('Problem.Solutions')} (${solutionCount})`,
      href: buildUrl('problem_solution', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }
  items.push({
    key: 'files',
    title: t('Problem.Files'),
    href: buildUrl('problem_files', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
  });
  items.push({
    key: 'statistics',
    title: t('Problem.Statistics'),
    href: buildUrl('problem_statistics', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
  });

  if (canEditProblem) {
    items.push({ key: 'sep-2', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
    if (!pdoc.reference) {
      items.push({
        key: 'judge-config',
        title: t('Problem.JudgeConfig'),
        href: buildUrl('problem_config', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      });
    }
  }

  void pdoc;
  return items;
}

function getContestMenu(ctx: SidebarCtx, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const { pdoc, tdoc, UserContext, buildUrl } = ctx;
  if (!tdoc) return getNormalMenu(ctx, t);
  const items: MenuItem[] = [];

  if (mode === 'view' || mode === 'correction') {
    items.push({
      key: 'open-in-problem-set',
      title: t('Problem.OpenInProblemSet'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }),
    });
  } else {
    items.push({
      key: 'view-problem',
      title: t('Problem.ViewProblem'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
  }

  if (mode === 'contest' || (mode !== 'view' && mode !== 'correction')) {
    const isLoggedIn = !!UserContext?._id;
    const canSubmit = UserContext?.hasPerm?.(8) ?? false;
    if (canSubmit) {
      items.push({
        key: 'submit',
        title: t('Problem.Submit'),
        href: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      });
    } else if (isLoggedIn) {
      items.push({
        key: 'submit',
        title: t('Problem.NoPermissionToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    } else {
      items.push({
        key: 'submit',
        title: t('Problem.LoginToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    }
  }

  const canEditProblem =
    (pdoc && UserContext?.own?.(pdoc as unknown as { owner?: number }, 16)) ||
    UserContext?.hasPerm?.(16);
  if (canEditProblem) {
    items.push({ key: 'sep-1', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }),
    });
    items.push({
      key: 'files',
      title: t('Problem.Files'),
      href: buildUrl('problem_files', { pid: String(pdoc.docId) }),
    });
  }

  return items;
}

function getHomeworkMenu(ctx: SidebarCtx, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  const { pdoc, tdoc, UserContext, buildUrl } = ctx;
  if (!tdoc) return getNormalMenu(ctx, t);
  const items: MenuItem[] = [];

  const showSubmitArea = mode === 'contest' || mode === 'correction' || mode === 'normal';

  if (showSubmitArea) {
    items.push({
      key: 'view-problem',
      title: t('Problem.ViewProblem'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
    });
    const isLoggedIn = !!UserContext?._id;
    const canSubmit = UserContext?.hasPerm?.(8) ?? false;
    if (canSubmit) {
      items.push({
        key: 'submit',
        title: t('Problem.Submit'),
        href: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      });
    } else if (isLoggedIn) {
      items.push({
        key: 'submit',
        title: t('Problem.NoPermissionToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    } else {
      items.push({
        key: 'submit',
        title: t('Problem.LoginToSubmit'),
        href: '#',
        onClick: () => {/* TODO */},
      });
    }
  } else {
    items.push({
      key: 'open-in-problem-set',
      title: t('Problem.OpenInProblemSet'),
      href: buildUrl('problem_detail', { pid: String(pdoc.docId) }),
    });
  }

  const canEditProblem =
    (pdoc && UserContext?.own?.(pdoc as unknown as { owner?: number }, 16)) ||
    UserContext?.hasPerm?.(16);
  if (canEditProblem) {
    items.push({ key: 'sep-1', separator: true });
    items.push({
      key: 'edit',
      title: t('Problem.Edit'),
      href: buildUrl('problem_edit', { pid: String(pdoc.docId) }),
    });
    items.push({
      key: 'files',
      title: t('Problem.Files'),
      href: buildUrl('problem_files', { pid: String(pdoc.docId) }),
    });
  }

  return items;
}

function pickSidebarItems(ctx: SidebarCtx, mode: Mode, t: (k: string, a?: Record<string, unknown>) => string): MenuItem[] {
  if (!ctx.tdoc) return getNormalMenu(ctx, t);
  if (ctx.tdoc.rule === 'homework') return getHomeworkMenu(ctx, mode, t);
  return getContestMenu(ctx, mode, t);
}

// ===== Page ================================================================
export default function ProblemDetailPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const {
    pdoc, rdoc, psdoc, tdoc, tsdoc, owner_udoc,
    tdocs = [], ctdocs = [], htdocs = [],
    discussionCount = 0, solutionCount = 0,
    mode = 'normal', UserContext,
  } = args;
  const buildUrl = useBuildUrl();
  const setUiContext = useSetUiContext();
  const t = useTranslate();

  useEffect(() => {
    const userCtx = UserContext as unknown as {
      viewLang?: string;
      codeLang?: string;
      codeTemplate?: string;
      canViewRecord?: boolean;
    };
    const canViewRecord = !!(userCtx?.canViewRecord) || !tdoc;
    setUiContext({
      problemId: pdoc.pid ?? pdoc.docId,
      problemNumId: pdoc.docId,
      codeLang: userCtx?.codeLang,
      codeTemplate: userCtx?.codeTemplate,
      pdoc,
      tdoc,
      tsdoc,
      canViewRecord,
      postSubmitUrl: buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc)),
      getSubmissionsUrl: buildUrl(
        'record_main',
        {},
        { pid: String(pdoc.docId), fullStatus: 'true', ...getTidQuery(tdoc) },
      ),
      getRecordDetailUrl: buildUrl(
        'record_detail',
        { rid: '{rid}' },
        getTidQuery(tdoc),
      ),
      pretestConnUrl: `record-conn?pretest=1&uidOrName=${UserContext?._id ?? ''}&pid=${pdoc.docId}${tdoc ? `&tid=${tdoc.docId}` : ''}`,
    });
  }, [pdoc, tdoc, tsdoc, UserContext, buildUrl, setUiContext]);

  const preferredLang = useMemo(() => {
    const userLang = (UserContext as unknown as { viewLang?: string })?.viewLang;
    const baseLang = userLang?.split(/[-_]/)[0];
    const contentLangs: string[] =
      pdoc.content && typeof pdoc.content === 'object'
        ? Object.keys(pdoc.content)
        : [];
    let fromQuery: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        fromQuery = new URL(window.location.href).searchParams.get('lang');
      } catch {
        fromQuery = null;
      }
    }
    const matchesBase = (lang: string) =>
      !!baseLang && (lang === baseLang || lang.startsWith(`${baseLang}_`));
    return (
      (fromQuery && contentLangs.includes(fromQuery) ? fromQuery : null) ||
      (userLang && contentLangs.includes(userLang) ? userLang : null) ||
      contentLangs.find(matchesBase) ||
      contentLangs[0] ||
      'zh_CN'
    );
  }, [pdoc.content, UserContext]);

  const contentText = useMemo(
    () => readContentText(pdoc.content, preferredLang),
    [pdoc.content, preferredLang],
  );

  const contentLangs = useMemo(() => {
    if (pdoc.content && typeof pdoc.content === 'object') return Object.keys(pdoc.content);
    return [];
  }, [pdoc.content]);

  const headerPrefix = useMemo(() => {
    if (tdoc && (tdoc.pids?.length ?? 0) > 1) {
      const idx = tdoc.pids?.indexOf(pdoc.docId) ?? -1;
      if (idx >= 0) return `${getAlphabeticId(idx)}.`;
    }
    if (pdoc.pid?.includes('-')) return pdoc.pid.split('-').join('#');
    return `#${pdoc.pid ?? pdoc.docId}`;
  }, [pdoc, tdoc]);

  const canStar = !tdoc && UserContext?.hasPriv?.(1);
  const sidebarItems = pickSidebarItems(
    {
      pdoc, tdoc, UserContext, buildUrl, discussionCount, solutionCount, psdoc,
    } as SidebarCtx,
    mode,
    t,
  );

  const subtitle = useMemo(() => {
    if (contentText) {
      const lines = contentText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
          return trimmed.slice(0, 200);
        }
      }
    }
    return undefined;
  }, [contentText]);

  const contestItems: ContestItem[] = useMemo(() => [
    ...ctdocs.map((c) => ({ title: c.title, emoji: '🏆', date: '' })),
    ...tdocs.map((tt) => ({ title: tt.title, emoji: '📚', date: '' })),
    ...htdocs.map((h) => ({ title: h.title, emoji: '📝', date: '' })),
  ], [ctdocs, tdocs, htdocs]);

  const isLoggedIn = !!UserContext?._id;
  const canSubmit = UserContext?.hasPerm?.(8) ?? false;

  // === Normal mode: new hero + content + sidebar layout ===
  if (mode === 'normal') {
    return (
      <main className={styles.page}>
        <ProblemHero pdoc={pdoc} subtitle={subtitle} />

        <div className={styles.layout}>
          <article className={styles.content}>
            <div className={styles.sidebarCard}>
              {contentLangs.length > 1 && (
                <div className={styles.cardHead}>
                  <h3>{t('Problem.Statement')}</h3>
                  <div className={styles.langTabs}>
                    {contentLangs.map((l) => (
                      <Link
                        key={l}
                        to="problem_detail"
                        params={{ pid: pdoc.pid ?? String(pdoc.docId) }}
                        searchParams={l === preferredLang ? {} : { lang: l }}
                        className={l === preferredLang ? styles.langTabActive : styles.langTab}
                      >
                        {l}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <ProblemContent pdoc={pdoc} contentText={contentText} mode={mode} />
              <Article content={contentText} />
            </div>
          </article>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              {canSubmit ? (
                <Link
                  to="problem_submit"
                  params={{ pid: String(pdoc.docId) }}
                  className={styles.ctaBlock}
                  style={{ display: 'flex' }}
                >
                  <div className={styles.ctaBlockText}>
                    <b>{t('Problem.ReadyToSubmit') ?? '准备好开题了?'}</b>
                    <small>{t('Problem.SubmitHint') ?? '提交你的答案'}</small>
                  </div>
                  <button type="button" className={styles.ctaBlockBtn}>{t('Problem.Submit')}</button>
                </Link>
              ) : (
                <div className={styles.ctaBlock}>
                  <div className={styles.ctaBlockText}>
                    <b>{isLoggedIn ? t('Problem.NoPermissionToSubmit') : t('Problem.LoginToSubmit')}</b>
                    <small>{t('Problem.SubmitHint') ?? '提交你的答案'}</small>
                  </div>
                  <button type="button" className={styles.ctaBlockBtn} disabled>{t('Problem.Submit')}</button>
                </div>
              )}
              <Menu items={sidebarItems} />
            </div>

            {owner_udoc && (
              <SideCard title={t('Problem.Uploader') ?? '出题人'}>
                <Author name={owner_udoc.uname ?? `User ${owner_udoc._id}`} contribution={t('Problem.UploaderContribution') ?? '题目贡献者'} />
              </SideCard>
            )}

            {contestItems.length > 0 && (
              <SideCard title={t('Problem.RelatedEvents') ?? '出现于比赛'}>
                <ContestList items={contestItems} />
              </SideCard>
            )}

            {pdoc.tag && pdoc.tag.length > 0 && (
              <SideCard title={t('Problem.RelatedTags') ?? '相关标签'}>
                <TagCloud tags={pdoc.tag} />
              </SideCard>
            )}

            <InformationCard pdoc={pdoc} owner_udoc={owner_udoc} />
          </aside>
        </div>
      </main>
    );
  }

  // === Contest / view / correction mode: fallback ===
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.titleFallback}>
          {rdoc && rdoc.status !== undefined && (
            <Link to="record_detail" params={{ rid: String(rdoc._id) }} className={styles.statusBadge}>
              <span className={`${styles.statusIcon} ${styles[statusClassName(rdoc.status)]}`} />
              <span>{rdoc.score}</span>
            </Link>
          )}
          {canStar && (
            <form action="" method="post">
              <input type="hidden" name="star" value={psdoc?.star ? 'false' : 'true'} />
              <input type="hidden" name="operation" value="star" />
              <button type="submit" aria-label={t('Problem.Star')}>
                {psdoc?.star ? '★' : '☆'}
              </button>
            </form>
          )}
          <span className={styles.prefixFallback}>{headerPrefix}</span>
          <span>{pdoc.title}</span>
        </h1>
        {tdoc && (tdoc.pids?.length ?? 0) > 1 && (tdoc.pids?.length ?? 0) <= 26 && (
          <nav className={styles.contestNav}>
            {tdoc.pids?.map((pid, i) => {
              const status = tsdoc?.detail?.[String(pid)]?.status;
              const pass = status === STATUS.STATUS_ACCEPTED;
              const fail = status !== undefined && !pass;
              return (
                <Link
                  key={String(pid)}
                  to="problem_detail"
                  params={{ pid: String(pid) }}
                  searchParams={getTidQuery(tdoc)}
                  className={`${styles.contestNavItem} ${pass ? styles.contestNavPass : fail ? styles.contestNavFail : ''}`}
                >
                  {getAlphabeticId(i)}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <ProblemTagRow pdoc={pdoc} mode={mode} tdoc={tdoc} />

      <div className={styles.layout}>
        <article className={styles.content}>
          <div className={styles.sidebarCard}>
            {contentLangs.length > 1 && (
              <div className={styles.cardHead}>
                <h3>{t('Problem.Statement')}</h3>
                <div className={styles.langTabs}>
                  {contentLangs.map((l) => (
                    <Link
                      key={l}
                      to="problem_detail"
                      params={{ pid: pdoc.pid ?? String(pdoc.docId) }}
                      searchParams={l === preferredLang ? {} : { lang: l }}
                      className={l === preferredLang ? styles.langTabActive : styles.langTab}
                    >
                      {l}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <ProblemContent pdoc={pdoc} contentText={contentText} mode={mode} />
            <Article content={contentText} />
          </div>
        </article>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <Menu items={sidebarItems} />
          </div>
          {(tdocs.length > 0 || ctdocs.length > 0 || htdocs.length > 0) && (
            <RelatedCard tdocs={tdocs} ctdocs={ctdocs} htdocs={htdocs} />
          )}
        </aside>
      </div>
    </main>
  );
}

// === Sub-components (unchanged from existing) ===
function ProblemTagRow({ pdoc, mode, tdoc }: { pdoc: Pdoc; mode: string; tdoc?: Tdoc }) {
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const items: React.ReactNode[] = [];

  if (mode === 'normal') {
    items.push(<span key="docId"><Eyebrow>{t('Common.ID')}</Eyebrow> {pdoc.docId}</span>);
  }
  if (pdoc.config && typeof pdoc.config === 'object' && pdoc.config.type) {
    items.push(<span key="type"><Eyebrow>{t('Problem.Type')}</Eyebrow> {pdoc.config.type}{pdoc.config.subType ? ` · ${pdoc.config.subType}` : ''}</span>);
  }
  if (pdoc.config && typeof pdoc.config === 'object' && pdoc.config.type === 'default' && pdoc.config.subType) {
    items.push(<span key="fileio"><Eyebrow>{t('Problem.FileIO')}</Eyebrow> {String(pdoc.config.subType)}</span>);
  }
  const cfg = (typeof pdoc.config === 'object' ? pdoc.config : null) as {
    timeMin?: number; timeMax?: number; memoryMin?: number; memoryMax?: number; langs?: string[]; type?: string;
  } | null;
  if (cfg && cfg.type !== 'objective' && cfg.type !== 'submit_answer') {
    if (cfg.timeMin !== undefined && cfg.timeMax !== undefined) {
      items.push(<span key="time"><Eyebrow>{t('Common.Time')}</Eyebrow> {cfg.timeMin === cfg.timeMax ? `${cfg.timeMin}ms` : `${cfg.timeMin}~${cfg.timeMax}ms`}</span>);
    }
    if (cfg.memoryMin !== undefined && cfg.memoryMax !== undefined) {
      items.push(<span key="mem"><Eyebrow>{t('Problem.Memory')}</Eyebrow> {cfg.memoryMin === cfg.memoryMax ? `${cfg.memoryMin}MB` : `${cfg.memoryMin}~${cfg.memoryMax}MB`}</span>);
    }
  }
  if (mode === 'normal') {
    items.push(<Link key="tried" to="record_main" searchParams={{ pid: String(pdoc.docId), ...getTidQuery(tdoc) }}><Eyebrow>{t('Problem.Tried')}</Eyebrow> {pdoc.nSubmit ?? '?'}</Link>);
    items.push(<span key="acc"><Eyebrow>{t('Problem.Accepted')}</Eyebrow> {pdoc.nAccept ?? '?'}</span>);
  }
  if (pdoc.difficulty !== undefined) {
    items.push(<span key="diff"><Eyebrow>{t('Problem.Difficulty')}</Eyebrow> {pdoc.difficulty}</span>);
  }
  if (pdoc.tag && pdoc.tag.length > 0) {
    items.push(...pdoc.tag.map((tagName) => <Chip key={tagName} variant="tag">{tagName}</Chip>));
  }
  return <div className={styles.tagRow}>{items}</div>;
}

function ProblemContent({ pdoc, contentText, mode }: { pdoc: Pdoc; contentText: string; mode: string }) {
  const t = useTranslate();
  const cfg = (typeof pdoc.config === 'object' ? pdoc.config : null) as { langs?: string[] } | null;
  const configError = typeof pdoc.config === 'string';
  const noData = !pdoc.data || (Array.isArray(pdoc.data) && pdoc.data.length === 0);
  const noLangs = !!cfg && Array.isArray(cfg.langs) && cfg.langs.length === 0;
  return (
    <>
      {noData && !pdoc.reference && (
        <Alert variant="warn" title={t('Problem.NoTestdata')} message={t('Problem.NoTestdataMessage')} />
      )}
      {configError && (
        <Alert variant="error" title={t('Problem.ConfigurationError')} message={String(pdoc.config)} />
      )}
      {noLangs && (
        <Alert variant="warn" title={t('Problem.NoSubmissionLanguage')} message={t('Problem.NoSubmissionLanguageMessage')} />
      )}
      {mode === 'view' && (
        <Alert variant="info" title={t('Problem.ContestEnded')} message={t('Problem.ContestEndedMessage')} />
      )}
      {mode === 'correction' && (
        <Alert variant="info" title={t('Problem.CorrectionSubmissions')} message={t('Problem.CorrectionSubmissionsMessage')} />
      )}
      {!contentText && !configError && (
        <Alert variant="info" title={t('Problem.StatementPending')} message={t('Problem.StatementPendingMessage')} />
      )}
    </>
  );
}

function InformationCard({ pdoc, owner_udoc }: { pdoc: Pdoc; owner_udoc?: Udoc }) {
  const t = useTranslate();
  return (
    <div className={styles.sidebarCard}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: '0 0 14px', color: 'var(--text)' }}>
        {t('Problem.Information')}
      </h4>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 16px', fontSize: 13 }}>
        <dt style={{ color: 'var(--text-mute)' }}>{t('Common.ID')}</dt><dd style={{ margin: 0 }}>{pdoc.docId}</dd>
        {typeof pdoc.config === 'object' && pdoc.config && (
          <>
            <dt style={{ color: 'var(--text-mute)' }}>{t('Common.Time')}</dt>
            <dd style={{ margin: 0 }}>
              {pdoc.config.timeMin === pdoc.config.timeMax
                ? `${pdoc.config.timeMin}ms`
                : `${pdoc.config.timeMin}~${pdoc.config.timeMax}ms`}
            </dd>
            <dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Memory')}</dt>
            <dd style={{ margin: 0 }}>
              {pdoc.config.memoryMin === pdoc.config.memoryMax
                ? `${pdoc.config.memoryMin}MB`
                : `${pdoc.config.memoryMin}~${pdoc.config.memoryMax}MB`}
            </dd>
          </>
        )}
        {pdoc.difficulty !== undefined && <><dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Difficulty')}</dt><dd style={{ margin: 0 }}>{pdoc.difficulty}</dd></>}
        {pdoc.tag && pdoc.tag.length > 0 && (
          <>
            <dt style={{ color: 'var(--text-mute)' }}>{t('Common.Tags')}</dt><dd style={{ margin: 0 }}>{pdoc.tag.join(', ')}</dd>
          </>
        )}
        <dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Submissions')}</dt><dd style={{ margin: 0 }}>{pdoc.nSubmit ?? '?'}</dd>
        <dt style={{ color: 'var(--text-mute)' }}>{t('Problem.Accepted')}</dt><dd style={{ margin: 0 }}>{pdoc.nAccept ?? '?'}</dd>
        {owner_udoc && <><dt style={{ color: 'var(--text-mute)' }}>{t('Problem.UploadedBy')}</dt><dd style={{ margin: 0 }}>{owner_udoc.uname ?? owner_udoc._id}</dd></>}
      </dl>
    </div>
  );
}

function RelatedCard({ tdocs, ctdocs, htdocs }: {
  tdocs: Array<{ docId: string; title: string }>;
  ctdocs: Array<{ docId: string; title: string }>;
  htdocs: Array<{ docId: string; title: string }>;
}) {
  const t = useTranslate();
  return (
    <div className={styles.sidebarCard}>
      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, margin: '0 0 14px', color: 'var(--text)' }}>
        {t('Problem.Related')}
      </h4>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tdocs.map((tt) => (
          <li key={tt.docId}><Link to="training_detail" params={{ tid: tt.docId }}>{tt.title}</Link></li>
        ))}
        {ctdocs.map((c) => (
          <li key={c.docId}><Link to="contest_detail" params={{ tid: c.docId }}>{c.title}</Link></li>
        ))}
        {htdocs.map((h) => (
          <li key={h.docId}><Link to="homework_detail" params={{ tid: h.docId }}>{h.title}</Link></li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: 运行所有 ui-next 测试**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test`
Expected: 全部 PASS(原 + 新增)

- [ ] **Step 5: 运行 build 验证类型**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next build`
Expected: 成功,无 TypeScript 错误

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/pages/problem_detail.tsx packages/ui-next/src/pages/problem_detail.module.css
git commit -m "refactor(ui-next): problem_detail page aligned with 1.html design"
```

---

## 自审

1. **Spec 覆盖**:
   - 决策摘要 6 项 — Task 1(依赖)、Task 2-5(markdown 管线)、Task 6-9(视觉组件)、Task 10(页面装配)
   - 模块设计 7 子模块 — Task 2/3/4/5(markdown)/6/7/8/9(视觉)/10(装配)
   - 数据契约 — Task 9 用 `nAccept/nSubmit` 推导通过率,无新字段
   - 错误与边界 — preprocess 健壮性(Task 2)、Ring 0-100 边界(Task 6)、TrendBars 边界(Task 7)、nSubmit=0 兜底(Task 9 测试)
   - 测试策略 — 每个组件 Task 加 vitest 测试,Task 11 加视觉测试(可选)
   - 范围之外 — Plan 中未包含 stats API、ui-default 兼容等

2. **占位符扫描**:无 "TBD"/"TODO"(代码内的 `/* TODO */` 注释是已有的占位,不属于 plan 失败模式;Tasks 2/3/4/5/6/7/8/9/10 都有完整代码)

3. **类型一致性**:
   - `preprocessContent` 与 `ContentBlock` 在 Task 2 定义,Task 5 使用 — 一致
   - `SamplePair` props 在已有文件定义,Task 5 调用方式与 import 一致
   - `Ring` percent/size 在 Task 6 定义,Task 9 使用 — 一致
   - `SideCard` title/children/accent 在 Task 8 定义,Task 10 使用 — 一致

4. **完整性**:Task 10 是单一最大的任务,所有现有 helper 与子组件代码都在新文件中完整保留,没有"see git history"占位。