# problem_detail 修复设计

**日期**: 2026-07-09
**范围**: `packages/ui-next/src/pages/problem_detail.tsx` 与依赖组件
**触发**: markdown 渲染异常 + UI 需对齐 `.claude/1.html` 设计

## 背景与目标

`packages/ui-next` 是 Hydro 的新一代 Vite + React 19 SPA,与 `ui-default` 共存(由 priority=100 + asFallback=true 的 `next` renderer 装载)。当前 `problem_detail` 页面有两个问题:

1. **Markdown 能力断层**:`ui-next/components/article/Article` 只用 `react-markdown + remark-gfm`,而 `ui-default/backendlib/markdown.js` 用 `markdown-it + 8 个插件`(KaTeX、imsize、footnote、mark、anchor、TOC、media、merge-cells、xss)。结果:题面里 KaTeX 公式、==高亮==、`![img](x =100x100)` 图片尺寸、`@[youtube](...)` 媒体嵌入、脚注等全部不渲染,样例输入/输出也不能像 ui-default 那样拆成 SamplePair。
2. **UI 与目标设计脱节**:1.html mockup 给出了 hero 卡(eyebrow + title + chips)、三个统计卡(通过率 ring、近 7 日提交趋势条、平均用时趋势条)、带 card-head+lang-tabs 的主区、完整 sidebar(CTA + Menu + Author + ContestList + TagCloud),当前实现只有标题 + tagRow + 内容 + 简易 sidebar。

目标:
- **A. Markdown 能力对齐 ui-default**(复用同一题面源不出现空白)
- **B. UI 按 1.html 完全重构**(hero + 主区 + sidebar)
- **C. 不引入新后端 API**:所有数据来自 `handler/problem.ts` 已下发的 args(`nSubmit`、`nAccept`、`difficulty`、`tag`、`owner_udoc`、`ctdocs`/`tdocs`/`htdocs` 等)

## 决策摘要

| 决策点 | 选择 | 理由 |
|---|---|---|
| Markdown 引擎 | 保留 react-markdown + 叠加插件 | XSS 安全、SSR 友好、与 React 生态一致;不引入 marked/markdown-it |
| 样例输入/输出 | 预处理切分为结构化 blocks 数组 | markdown 源在传给 ReactMarkdown 前被切分为 `ContentBlock[]`,SamplePair 在 Article 渲染时作为兄弟 block 插入到正确位置;不修改 markdown 字符串本身 |
| 代码高亮 | `rehype-highlight` | 运行时按需加载语言包,bundle 增量小,配置简单 |
| 统计卡 | 只展示可得数据(通过率 ring + nSubmit/nAccept) | 趋势条/平均用时需新 stats API,本期不做 |
| UI 重构 | 完全重构对齐 1.html | 用户已确认 |
| 主题 | 沿用 `tokens.css` 现有 CSS 变量 | 暗/亮主题自适应,不需要新工作 |

## 架构

三个独立层,各自失败隔离:

| 层 | 路径 | 责任 |
|---|---|---|
| Markdown 管线 | `src/lib/markdown/*`(新增)+ `src/components/article/Article.tsx`(扩展) | 把 ui-default 的 markdown 能力在 ui-next 复刻 |
| 视觉组件 | `src/components/charts/*`、`src/components/sidebar/SideCard.tsx`(新增) | Ring、SideCard 等 1.html 中缺失的原子 |
| 页面装配 | `src/pages/problem_detail.tsx`、`src/pages/problem_detail.module.css`(重写) | 用上述组件按 1.html 装配 |

## 模块设计

### 1. Markdown 预处理 (`src/lib/markdown/preprocess.ts`)

```ts
export interface SamplePairData {
  num: number;       // 1-based index, 由切分顺序决定
  input: string;     // 原文(包含 fenced code 块)
  output: string;
}

export type ContentBlock =
  | { type: 'markdown'; body: string }
  | { type: 'samples'; pairs: SamplePairData[] };

export function preprocessContent(raw: string): ContentBlock[];
```

**切分锚点**(`ANCHOR_PATTERNS`,多语言,大小写不敏感,trim 后匹配):

| 语言 | 正则(忽略大小写) |
|---|---|
| 中文(简体/繁体) | `^#{1,6}\s*(样例输入\s*[/／\-\s]*输出\|样例输入输出\|输入输出样例\|输入输出示例\|输入输出範例)\s*$` |
| 英文 | `^#{1,6}\s*(Sample Input\s*\/\s*Output\|Sample Input and Output\|Example Input\s*\/\s*Output\|Examples?)\s*$` |
| 日文 | `^#{1,6}\s*(サンプル入力\|入力例\|入出力例)\s*$` |

**切分算法**:
1. 按行扫描,遇到匹配锚点的行 → 切出当前 markdown 块(若有内容)
2. 从锚点行向下读到下一个 `## ` 标题或文档结束
3. 在该子区域内识别**成对 fenced code 块**:` ``` ` 包围的内容,奇数顺序视为 input,偶数视为 output
4. 若只有 1 个 fenced code 块 → 视为 input,output 留空字符串
5. 若 fenced 块顺序相反(先 output 后 input)→ 不矫正,按出现顺序写入
6. 解析失败(无任何 fenced code)→ 整段降级为 markdown,不创建 samples 块

**健壮性**:
- input/output 行数为 0 或 1 时也要正确处理(允许题面只有 input)
- 锚点多次出现 → 全部切分(多组样例)
- 锚点出现在文末 → 不产生后续 markdown 块

### 2. remark/rehype 插件链

在 `Article.tsx` 中:

```ts
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMark, remarkFootnote, remarkImageSize, remarkMedia]}
  rehypePlugins={[rehypeKatex, rehypeHighlight]}
  components={customComponents}
>
  {block.body}
</ReactMarkdown>
```

| 插件 | 来源 | 处理语法 |
|---|---|---|
| `remark-gfm` | 已装(`remark-gfm@4`) | 表格/任务列表/删除线/链接 |
| `remark-mark` | 新装(`remark-mark@6`) | `==text==` 高亮 |
| `remark-footnote` | 新装(`remark-footnote@6`) | `[^id]` 脚注 |
| `remark-image-size`(自写) | `src/lib/markdown/plugins/remarkImageSize.ts` | `![alt](url =100x100)` / `=200x` / `=x100` |
| `remark-media`(自写) | `src/lib/markdown/plugins/remarkMedia.ts` | `@[youtube](url)` / `@[pdf](url)` / `@[bilibili](url)` / `@[vimeo](url)` |
| `rehype-katex` | 新装(`rehype-katex@7`) | `$inline$` 与 `$$block$$` |
| `rehype-highlight` | 新装(`rehype-highlight@7`) | fenced code(按语言识别) |

**自写插件契约**:
- 遵循 `unified` 插件签名:`(options?) => (tree: Node) => void`
- 修改 image/media 节点的 `url`/`data` 属性(图片尺寸变为 HTML width/height 属性;媒体包装为 `<a target="_blank" rel="noopener">` 链接或 `<iframe>` 占位)
- **不引入新解析依赖**:用 mdast-util-from-markdown 内置解析,或直接在 string 层面 replace

**XSS 防御**:沿用 react-markdown 默认(HTML 字符串被 escape)。`rehype-raw` **不安装**,避免任意 HTML 注入风险。

### 3. Article 组件扩展

```ts
// src/components/article/Article.tsx
interface Props {
  content?: string;
  langTabs?: ReactNode;
  children?: ReactNode;
}

export function Article({ content, langTabs, children }: PropsWithChildren<Props>) {
  const blocks = useMemo(() => {
    if (typeof content === 'string') return preprocessContent(content);
    return null;
  }, [content]);

  return (
    <>
      {langTabs}
      <div className={styles.article}>
        {blocks
          ? blocks.map((b, i) =>
              b.type === 'markdown'
                ? <MarkdownBlock key={i} body={b.body} />
                : <SamplesBlock key={i} pairs={b.pairs} />)
          : (typeof content === 'string'
              ? <MarkdownBlock body={content} />
              : children)}
      </div>
    </>
  );
}
```

`MarkdownBlock` 内部才是带插件链的 `<ReactMarkdown>`,把每个 block 独立 memo 防止整篇重渲染。

`SamplesBlock` 渲染 `<SamplePair>`(已存在,直接 import)。

### 4. 视觉组件新增

#### Ring(`src/components/charts/Ring.tsx`)

```ts
interface Props {
  percent: number;          // 0..100
  size?: number;            // default 86
  gradientFrom?: string;    // CSS color, default var(--cyan)
  gradientTo?: string;      // CSS color, default var(--violet)
}
```

- 纯 SVG,无新依赖
- 动画:`stroke-dashoffset` 从 251 → `251 * (1 - percent/100)`,`transition: stroke-dashoffset 1.4s ease`
- 在 light 主题下 gradient 颜色由 CSS 变量切换(沿用现有 `--cyan`/`--violet` 在 light 主题下的覆盖)

#### TrendBars(`src/components/charts/TrendBars.tsx`)

```ts
interface Props { values: number[]; gradientFrom?: string; gradientTo?: string; }
```

- 渲染 `<div className={styles.trend}>{values.map(v => <div style={{height: \`${v*100}%\`}} />)}</div>`
- **本期 UI 装配时不使用**,但组件实现并加 1 个测试,作为后续 stats API 接入的钩子

#### SideCard(`src/components/sidebar/SideCard.tsx`)

```ts
interface Props {
  title: string;
  children: ReactNode;
  accent?: boolean;        // default true;false 时隐藏 accent-dot
}
```

- 对应 1.html 中 `.side-card`:圆角 22px 背景 surface + 边框、padding 22px 24px、h4 内嵌 accent-dot
- 暗/亮主题通过 tokens.css CSS 变量自适应

### 5. ProblemHero 组件(`src/components/problem/ProblemHero.tsx`)

```ts
interface Props {
  pdoc: Pdoc;              // docId/title/pid/type/subType/timeMin/timeMax/memoryMin/memoryMax/difficulty/tag/nSubmit/nAccept
  owner_udoc?: Udoc;       // 上传者
}
```

对应 1.html `.hero-left` + `.hero-right` 中**只**渲染通过率 ring(本期)。

- **eyebrow**:渲染 `<Eyebrow>Problem · {type} · {difficulty ? `Level ${difficulty}` : 'Beginner'}</Eyebrow>`(type/subType 来自 pdoc.config)
- **title**:`<span className={styles.prefix}>{#H1000}</span><span>A + B</span>`,prefix 用 `var(--gradient-primary)` 着色
- **subtitle**:取 pdoc.content 第一段非标题 plain text(在 preprocess 后的第一个 markdown block 中提取),无则不渲染
- **chips**:ID / Time / Memory / Difficulty / Tag,与现有 ProblemTagRow 等价但放在 hero 内
- **pass-rate ring**:`<Ring percent={Math.round((nAccept/nSubmit) * 100)} />` + 详情(提交/通过)

`hero-right` 区域本期只放通过率 ring,**不放**近 7 日提交/平均用时两块(无数据)。未来 stats API 上线时,这两块直接接 `<TrendBars />` 即可。

### 6. 页面装配(`src/pages/problem_detail.tsx`)

完全重写。`mode === 'normal'` 时:

```
<main>
  <ProblemHero pdoc owner_udoc />
  <div className={layout}>
    <article>
      <Card>
        <div className={cardHead}>
          <h3>{t('Problem.Statement')}</h3>
          {langTabs}            {/* contentLangs.length > 1 时 */}
        </div>
        <Article content={contentText} />   {/* 内部预处理 + SamplePair */}
      </Card>
    </article>
    <aside>
      <SideCard title="">                    {/* 无标题侧卡:放 CTA + Menu */}
        <CtaCard ... />
        <Menu items={sidebarItems} />
      </SideCard>
      {owner_udoc && (
        <SideCard title="出题人">
          <Author name={owner_udoc.uname} contribution={...} />
        </SideCard>
      )}
      {contestItems.length > 0 && (
        <SideCard title="出现于比赛">
          <ContestList items={contestItems} />
        </SideCard>
      )}
      {pdoc.tag?.length > 0 && (
        <SideCard title="相关标签">
          <TagCloud tags={pdoc.tag} />
        </SideCard>
      )}
      <InformationCard />                   {/* 保留现有:基本信息表 */}
    </aside>
  </div>
</main>
```

`mode !== 'normal'`(contest / view / correction / none):**保留**现有 header + tagRow + 内容 + 侧栏(已有逻辑不变),只对 Article 应用新的 markdown 管线,以确保 contest 内题目也能正确渲染题面。

**保留不变的部分**(避免回归):
- `getNormalMenu / getContestMenu / getHomeworkMenu / pickSidebarItems` 逻辑
- `setUiContext`(Bug #10)推送逻辑
- `preferredLang`(Bug #6)语言选择链
- `headerPrefix`(A/B/C 编号)
- `contestNav`(多题字母导航)
- `ProblemContent`(noData / configError / noLangs / view / correction / statement-pending 等 Alert)
- `InformationCard`(基本信息表)

### 7. CSS 增量

新增 token(若需要):
- `--radius-card: 22px`(与 1.html 一致)
- `--shadow-card: 0 12px 30px -16px rgba(0,0,0,0.6)`(用于 IDE 块,可选)

`problem_detail.module.css` 重写;`Article.module.css` 增加:
- `.samples { display: grid; grid-template-columns: 1fr 28px 1fr; gap: 0; margin: 18px 0 8px; }`(直接复用 SamplePair 已有样式即可,无需新增)

## 数据契约

无新增后端字段。`Args` 接口扩展:

```ts
interface Args {
  // ... 现有字段 ...
  // 现有字段已覆盖所有需求(无需新增)
}
```

hero 的通过率计算:
```ts
const passRate = (pdoc.nSubmit ?? 0) > 0
  ? Math.round((pdoc.nAccept ?? 0) / pdoc.nSubmit * 100)
  : 0;
```

contest 模式(`mode !== 'normal'`):handler 已经 `delete pdoc.nSubmit / nAccept / difficulty / stats`,故 ProblemHero **只在 normal 模式**渲染,其他模式回退到现有 header。

## 错误与边界

| 情况 | 处理 |
|---|---|
| 题目没样例 | preprocess 返回纯 markdown blocks,无 samples |
| 锚点不匹配任何已知标题 | 整篇走 markdown,样例不切分(用户看到原文) |
| 锚点匹配但下方无 fenced code | 同上,降级为 markdown |
| `=100x100` 解析失败(非数字) | 退化为原 url 字符串,不抛错 |
| KaTeX 公式语法错误 | rehype-katex 抛错被 react 边界捕获,渲染空白(不传播) |
| `nSubmit === 0` | Ring 显示 0%,detail 渲染 "0 提交 / 0 通过" |
| `owner_udoc` 缺失 | SideCard "出题人" 不渲染 |
| `ctdocs/tdocs/htdocs` 全空 | SideCard "出现于比赛" 不渲染 |
| `tag` 空 | SideCard "相关标签" 不渲染 |

## 测试

| 文件 | 类型 | 覆盖 |
|---|---|---|
| `src/lib/markdown/preprocess.test.ts` | vitest | 7 fixture:无样例 / 中文单组 / 英文单组 / 日文单组 / 中文多组 / 锚点匹配但无 fenced / 锚点文末 |
| `src/lib/markdown/plugins/remarkImageSize.test.ts` | vitest | `=100x100` / `=200x` / `=x100` / 无尺寸不修改 |
| `src/lib/markdown/plugins/remarkMedia.test.ts` | vitest | youtube/pdf/bilibili/vimeo 4 类 / 不匹配不修改 |
| `src/components/article/Article.test.ts` | vitest | 扩展现有:KaTeX 公式 / ==mark== / 脚注 / image-size / media / 样例切分后 SamplePair 出现 |
| `src/components/charts/Ring.test.ts` | vitest | percent=0 / 50 / 100 边界,svg 元素存在 |
| `src/components/charts/TrendBars.test.ts` | vitest | values 渲染正确数量的柱 |
| `src/components/sidebar/SideCard.test.ts` | vitest | title/children 渲染、accent 控制 |
| `test/visual/problem-detail.spec.ts` | Playwright | 与 1.html 的 hero+ring 区域快照比对(`test:visual`) |

## 范围之外(明确不做)

- 后端 stats API(近 7 日提交趋势、平均用时)— 留 TODO,不阻塞本期
- `ui-default` 模板兼容 — 不可行,SSR 管线不同
- 暗/亮主题切换适配(1.html 已有 CSS 变量,直接复用 `tokens.css`)
- 题目难度算法 — 沿用 `hydrooj/lib/difficulty.ts`
- `psdoc` accepted 状态展示 — 1.html 没有,不展示
- 下载/复制/Scratchpad 等 ui-default 行为 — ui-next phase 2+ 工作
- KATEX 字体子集 — 使用 katex 默认 webfont(`rehype-katex` 自带)

## 风险与回滚

| 风险 | 缓解 |
|---|---|
| rehype-katex 引入新字体子集,bundle 增量大 | katex.min.css 通过 CDN 或按需;若过大降级为只渲染公式文本 |
| 自写 remark 插件解析出错 | 插件容错:任何解析失败降级为原 markdown,不计错误 |
| Playwright 视觉测试不稳定 | 初始用 `test:visual:update` 重新生成基线;hero 区域限定 snapshot 范围 |
| 现有 ui-next 测试受影响 | 重写前先 `yarn workspace @hydrooj/ui-next test` 跑基线,重写后对比 |

回滚:`git revert <commit>`(本次提交为单一 PR)。