# Review — ui-next 5 个未迁移页面 (`problem_config` / `problem_files` testdata 部分 / `contest_balloon` / `contest_clarification` / `contest_user`)

**Reviewed**: 2026-07-22
**Plan**: `docs/superpowers/plans/2026-07-21-ui-next-missing-pages-migration.md`
**Touched commits** (since `cf385566` ...):
- `feat(ui-next): add ProblemConfigTree for subtask/testcase editing`
- `feat(ui-next): migrate problem_config page with editor/basic/subtasks tabs`
- `feat(ui-next): ProblemFiles uses type=additional_file to match backend contract`
- `feat(ui-next): add ProblemCreateTestdata with prompt+upload for empty testdata file`
- `feat(ui-next): add ProblemGenerateTestdata with iframe postMessage progress`
- `feat(ui-next): add ProblemTestdata with upload/delete/bulk-download/create/generate`
- `feat(ui-next): problem_files page now includes testdata section`
- `feat(ui-next): add useBalloonPoll hook for 60s polling of contest_balloon page`
- `feat(ui-next): add ContestBalloonSetColor dialog backed by js-yaml dump`
- `feat(ui-next): add ContestBalloonTable with status/problem/user/awards/send columns`
- `feat(ui-next): migrate contest_balloon page with 60s poll and set-color dialog`
- `feat(ui-next): add ContestClarificationForm with reply/broadcast dual modes`
- `feat(ui-next): add ContestClarificationList with collapsible thread rendering`
- `feat(ui-next): migrate contest_clarification page with reply/broadcast modes`
- `feat(ui-next): add ContestUserTable with rank/unrank/resume operations`
- `feat(ui-next): add ContestUserAddDialog with multi-user autocomplete`
- `feat(ui-next): migrate contest_user page with add dialog and rank/resume actions`
- `fix(ui-next): use ProblemConfigFile type from @hydrooj/common in yaml-config`
- `fix(ui-next): reorder new contest i18n keys alphabetically`
- `fix(ui-next): testdata-detect correctly pairs input with output files`

**Reviewer focus**: 用户要求审查 (1) 新页面 i18n 大量缺失;(2) 多个组件缺少 padding 导致内容贴住卡片。

**Decision**: **REQUEST CHANGES** — 4 个 HIGH、6 个 MEDIUM、若干 LOW。建议修复后再合入。

---

## Summary

整体实现结构清晰(primitives + 5 page + tests 都齐了),但 i18n 与样式的"最后一公里"做得不够:

- **页面级 `t()` 调用基本就位**,但几乎所有新组件内部仍有 **大量硬编码英文字符串**(按钮文案、空态文本、提示),违反 CLAUDE.md "YAML keys must be sorted" 之外的 i18n 约定,中文界面会"英文 + 中文"混杂。
- **`packages/ui-next/src/components/primitives/Card.module.css` 的 `.card` 默认变体没有 body padding**,而所有 Page 都用 `<Card variant="default">` 套内容,导致"`No testdata yet.`" 等空态文本贴住卡片下沿,需要补 padding。
- `lib/i18n.ts` 英文字段出现**两组重复条目**(`ProblemFiles.*` 第 635-640 与 641-646 完全重复),看上去是合并冲突未清理。
- `ContestClarificationList` `SUBJECT_TEXT` 类型注释借了 `as any`,丢掉主题数字合法性检查。

---

## Findings

### HIGH

#### H1 — `<Card variant="default">` 没有 body padding,导致内部组件"贴卡片"
**Files**:
- `packages/ui-next/src/components/primitives/Card.tsx:9-17`
- `packages/ui-next/src/components/primitives/Card.module.css:1-6`

**Bug**: `.card` 选择器仅定义 `background / border / border-radius`,**没有任何 padding**。只有 `.side` / `.stat` 设了 padding。结果是默认 variant 的卡片 body 直接顶到卡片边框。

**复现**:
1. 打开任意题目 → `/p/P1/files`
2. 当题目没有 testdata 时,渲染
   ```html
   <Card variant="default" header={<h2>测试数据</h2>}>
     <ProblemTestdata pid=... files=[] .../>
   </Card>
   ```
3. "No testdata yet." 文本紧贴卡片底部边框,没有任何垂直边距。

**修复**: 在 `.card` 也加上 `padding: 0 0 var(--space-5);`(沿用 `.side` 的字号)或保持仅给 `.card` body 加 padding 而不动 header。具体可二选一:
```css
.card { ...; padding: 0 0 var(--space-5); }   /* 不破坏现有 header 内 padding */
```
或更激进:
```css
.card { ...; padding: var(--space-5); }
```
后者会与现有 header 内的 `padding: var(--space-4) var(--space-6)` 冲突,**不建议**。建议前者。

---

#### H2 — `ProblemTestdata` `.empty` 选择器零 padding/zero margin
**File**: `packages/ui-next/src/components/problem/ProblemTestdata.module.css:11`
```css
.empty { color: var(--text-mute); font-size: var(--text-sm); }
```
**Issue**: 相对 `ContestBalloonTable.module.css:9` / `ContestUserTable.module.css:9` / `ContestClarificationList.module.css:8`(分别带 `padding: var(--space-6)` / `var(--space-4)`),只有 testdata 的 `.empty` 是裸样式。即便修了 H1,这里仍然建议自带 `padding: var(--space-4) 0;` 以与姊妹组件对齐。

**修复**:
```css
.empty { color: var(--text-mute); font-size: var(--text-sm); padding: var(--space-4) 0; }
```

---

#### H3 — `ProblemTestdata` 大量硬编码英文(典型 / 严重)
**File**: `packages/ui-next/src/components/problem/ProblemTestdata.tsx`

| 行 | 硬编码 |
|---|---|
| 76 | `<h3>Testdata ({files.length})</h3>` |
| 79 | `{busy ? 'Uploading…' : 'Upload'}` |
| 85 | `Download ZIP` |
| 90 | `No testdata yet.` |
| 69 | `toast.error('No links returned')` |

**修复**: 增加 `useTranslate()` 后在 `lib/i18n.ts` 中、英双侧同步新增 `ProblemTestdata.Title` / `ProblemTestdata.Upload` / `ProblemTestdata.Uploading` / `ProblemTestdata.DownloadZip` / `ProblemTestdata.Empty` / `ProblemTestdata.NoLinks`。这些键全部按 CLAUDE.md "alphabetical order by key" 排列。

---

#### H4 — `lib/i18n.ts` 多个 pages 几乎完全没新增专用字典
**File**: `packages/ui-next/src/lib/i18n.ts:255-261, 367-371, 419-420`

只新增了 `ProblemConfig.*`(5 个)、`ContestBalloon.*`(2 个)、`ContestClarification.*`(2 个)、`ContestUser.*`(2 个) — 共 ~11 个键。但页面/组件实际产生的英文文案 **远超此数**。下表是缺失清单(全部都需要加):

| 来源 | 缺失的硬编码 |
|---|---|
| `ProblemTestdata.tsx` | Title / Upload / Uploading / DownloadZip / Empty / NoLinks |
| `ProblemCreateTestdata.tsx:14,27` | `Filename (e.g. 1.in)` / `Creating…` / `+ Create` |
| `ProblemGenerateTestdata.tsx:30,57,59,62,63,65` | `Testdata generated`、`Generate Testdata`、`Generator source`、`Standard output source`、`One of the existing files in testdata`、`Starting…` / `Start` |
| `ProblemConfigTree.tsx:32,33,37,43,45,46,47` | `Subtasks`、`Auto Detect`、`No subtasks. Click "Auto Detect" to infer from filenames ({n} files).`、`Subtask {i+1} ({n} cases)`、`Score`、`Time (ms)`、`Memory (MB)` |
| `ProblemConfigBasicForm.tsx:11-15,33,43,50` | 5 个类型 label(`Standard (default)` / `Objective` / `Submit Answer` / `Interactive` / `Communication`)、`Type`、`Count (cases per subtask)`、`Sub-Limit (ms)` |
| `ContestBalloonTable.tsx:32,50,54,68,71,73` | `Balloon marked as sent`、表头 `Status/Bid/Problem/Submitter/Awards/Action`、`No balloons`、`First`、`Send`、`Done` |
| `ContestBalloonSetColor.tsx:29,38,40,41` | `Color saved`、`Set Balloon Color`、`Cancel`、`Saving…` / `Save` |
| `ContestClarificationList.tsx:21,27,37,39,40` | `SUBJECT_TEXT.Tech`、`SUBJECT_TEXT.General`、`No clarifications yet.`、`(Jury)`、`Reply`、`+/-` |
| `ContestClarificationForm.tsx:17-19,28,37,47,50,62,68` | 2 个 SUBJECT option、`Content is required`、`Clarification submitted`、`Reply` / `Broadcast`、`Subject`、`Problem {n}`、`Submitting…` / `Submit` |
| `ContestUserTable.tsx:52,54,67,73` | 表头 `Uid/User/Start/End/Rank/Action`、`No attendees`、`UnRank` / `Rank`、`Resume` |
| `ContestUserAddDialog.tsx:32,42-49,51` | `Added {n} user(s)`、`Add Attendees`、`Cancel`、`Adding…` / `Add`、`Users`、`Add as unranked` |

**修复策略**:
1. 在每个组件顶部加入 `const t = useTranslate();`
2. 在 `lib/i18n.ts` zh_CN 与 en 段分别新增对应键,key 命名遵循 `<PageName>.<Key>`,按字母序排列(按 plan 第 19 行约定)。
3. 翻译若不确定英文含义,参考 packages/ui-default 对应文件,如 `ui-default/components/contest/contest_balloon.html`。

---

### MEDIUM

#### M1 — `lib/i18n.ts` 重复键 `ProblemFiles.BackToEdit / .Subtitle / .AdditionalSection / .NotFound / .ReferenceNotice / .Done`
**File**: `packages/ui-next/src/lib/i18n.ts:635-646`(en 段)

```ts
'ProblemFiles.BackToEdit': 'Back to edit',
'ProblemFiles.Subtitle': 'Upload supporting files (PDFs, dataset notes, etc.).',
'ProblemFiles.AdditionalSection': 'Additional files',
'ProblemFiles.NotFound': 'Problem not found.',
'ProblemFiles.ReferenceNotice': 'This problem is a cross-domain reference; additional files can only be edited from the source domain.',
'ProblemFiles.Done': 'Done',
'ProblemFiles.BackToEdit': 'Back to edit',   // ← 重复
'ProblemFiles.Subtitle': 'Upload supporting files (PDFs, dataset notes, etc.).', // ← 重复
... 后续四行也是重复
```

JS 对象字面量允许重复键,后者覆盖前者,但容易被认为数据脏且后续修改易漏另一份。**修复**: 删除 641-646 重复块。

---

#### M2 — zh_CN 侧 5 个新增 `ProblemFiles.*` 未翻译
**File**: `packages/ui-next/src/lib/i18n.ts:109-112` zh_CN 段,只新增了 4 个:
```
'ProblemFiles.Title', 'ProblemFiles.Empty', 'ProblemFiles.Manage', 'ProblemFiles.TestdataSection'
```
英文多了 `BackToEdit`/`Subtitle`/`AdditionalSection`/`NotFound`/`ReferenceNotice`/`Done`,zh_CN 完全没增,`useTranslate()` 在 zh 环境下对 `ProblemFiles.BackToEdit` 等**返回原始 key**(`t()` 找不到键时的回退行为),界面会显示英文技术键名。

**修复**: 将 zh_CN 段同步补齐:
```ts
'ProblemFiles.BackToEdit': '返回编辑',
'ProblemFiles.Subtitle': '上传附加文件(PDF、题面说明等)。',
'ProblemFiles.AdditionalSection': '附加文件',
'ProblemFiles.NotFound': '题目不存在。',
'ProblemFiles.ReferenceNotice': '本题为跨域引用,附加文件只能在源域修改。',
'ProblemFiles.Done': '完成',
```

---

#### M3 — `ProblemConfigTree` form labels / 空态文案硬编码 + 双重间隙隐患
**File**: `packages/ui-next/src/components/problem/ProblemConfigTree.tsx:32-47`、`ProblemConfigTree.module.css:7`
- 行 32-47 全部 label/title/空态文案硬编码(已在 H4 中列出)
- 行 7 `.empty { color: var(--text-mute); font-size: var(--text-sm); }` 与 `ProblemTestdata` 同病(已在 H2 中说明)

**修复**: 同步 H2 + H4。

---

#### M4 — `ContestClarificationList` 类型安全 + 单一真相源
**File**: `packages/ui-next/src/components/contest/ContestClarificationList.tsx:21`
```ts
const SUBJECT_TEXT: Record<number, string> = { '-1': 'Technical', 0: 'General' } as any;
```
- `'-1'` 在 `Record<number, ...>` 中需当作数字 key,但这里写成了字符串,被 `as any` 强转掩盖。最终 `SUBJECT_TEXT[it.subject]` 在 `subject === -1` 时返回 undefined,fallback 到 `Problem ${it.subject}` 实际是 `Problem -1`。
- 应统一 `SUBJECT_TEXT: Record<string, string>`,key 全用字符串。

**修复**:
```ts
const SUBJECT_TEXT: Record<string, string> = { '-1': t('ContestClarification.SubjectTechnical'), '0': t('ContestClarification.SubjectGeneral') };
```
顺便翻译 `Technical` / `General` / `(Jury)` / `Reply` / `+ / −` / `Problem {n}` 等硬编码(详 H4)。

---

#### M5 — `ProblemFiles` 页面用 `<main>` 顶部多行 inline style,建议替换为模块 CSS
**File**: `packages/ui-next/src/pages/problem_files.tsx:41,52-54,56,58,61,64,67,71,76,85-87,87`
反复出现:
```tsx
style={{ padding: 'var(--space-6)' }}
style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}
```
该页面**没有对应的 `.module.css`(尽管文件名暗示会有,但 `ls` 确认没有)**。违反项目"每个组件配 `*.module.css`"的约定,会导致 SSR/CSR 样式注入顺序闪烁风险。

**修复**: 新建 `packages/ui-next/src/pages/problem_files.module.css` 并迁移所有 inline style。

---

#### M6 — `pages/problem_config.tsx:82` 用 `${e.instancePath || '/'} ${e.message}` 字符串拼接硬编码标点
**File**: `packages/ui-next/src/pages/problem_config.tsx:82`
```tsx
{validation.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')}
```
错误信息也没经过 `t()`,且 `instancePath` 默认是 JSON Pointer(`/foo/0/bar`),会把技术细节泄漏给最终用户。**修复**: 按顺序包裹 `<code>{path}</code>: <span>{message}</span>`,并把整个数组用 `t('ProblemConfig.AjvError', { list })` 包装。

---

### LOW

#### L1 — `pages/problem_config.tsx` 内的"back to problem_edit"链接可补 i18n 翻
`ProblemConfig.Tab.basic` / `.editor` / `.subtasks` 已加,但 plan §3 提到的"页面标题旁的副标题 / breadcrumb 未翻译"未体现。可在 `ProblemConfig.Subtitle` 之类独立一栏。

#### L2 — `use-balloon-poll.ts` 未读文件,但根据 `ContestBalloonTable.tsx:71` `Send`/`Done` 是英文按钮 — 已计入 H4。
**File**: `packages/ui-next/src/hooks/use-balloon-poll.ts`(未读文件,无内容风险)

#### L3 — `pages/contest_balloon.tsx` & `contest_clarification.tsx` & `contest_user.tsx` 共享同一份 `contest_*.module.css`(grep 发现文件内容完全相同)
三份文件内容完全一致,重复维护成本。建议抽出 `packages/ui-next/src/pages/contest-management.module.css` 共用,或者每个文件自带不同的子类(如 `.balloonPage` / `.clarificationPage`)。

#### L4 — `ContestBalloonTable.tsx:61` 用 `aria-label={r.status}` 直接显示 `pending` / `done`,无 i18n。
**修复**: 用 `t('ContestBalloon.Status.' + r.status)`。

#### L5 — `ProblemFiles.module.css` 的 `.empty` 与新增的 `ProblemTestdata.module.css` 的 `.empty` 几乎相同,合并到 primitives 共享 class。

#### L6 — `ProblemCreateTestdata.module.css` 是空文件(`/* 共用 Button 样式,无额外规则 */`)
无害但容易误导 reviewer;若确认无需样式,直接 `rm` 文件并移除 `import styles` 即可。

#### L7 — `ContestClarificationForm.tsx:51-65` `<select>` 内 `aria-label="Subject"` 与 `<label htmlFor="clar-subject">` 一并出现,label 关联符合 a11y,但 Subject 文案仍需 i18n(计入 H4)。

---

## 复现说明(对应用户原始反馈)

### "新增的页面有很多 i18n 缺失"
所有 5 个新增 page 的**页头 / 标题 / 按钮**已 `t()`(见 H1 之外的高优先级:页级文件基本合理),但**所有子组件**几乎全硬编码:
- `ProblemTestdata.tsx`(报告里 H3)
- `ProblemCreateTestdata.tsx`(M/L 类别内 H4 表)
- `ProblemGenerateTestdata.tsx`(H4 表)
- `ProblemConfigTree.tsx`(H4 表 + M3)
- `ProblemConfigBasicForm.tsx`(H4 表)
- `ContestBalloonTable.tsx`、`ContestClarificationForm.tsx`、`ContestClarificationList.tsx`、`ContestUserTable.tsx`、`ContestUserAddDialog.tsx`、`ContestBalloonSetColor.tsx`(H4 表)

→ 切换到 zh_CN 时:页面/页头中文,组件内按钮/空态/Toast 全英文。或更糟:返回 `ProblemFiles.BackToEdit` 这种**未在 zh 段注册的 key**,直接显示 raw key。

### "页面样式上缺失边距,例如:No testdata yet. 那一整块和卡片是贴在一起的"
1. 用户报告点 → `ProblemFiles.tsx:71` → `<Card variant="default">` 包住 `<ProblemTestdata/>`。
2. `Card.module.css` 的 `.card` **没有 body padding**(只有 `.side` / `.stat` 有)。
3. `ProblemTestdata.module.css` 的 `.empty { color; font-size; }` 没有 padding / margin。
4. ⇒ "No testdata yet." 文本紧贴卡片底部边框,且与上方 tools 行 gap 仅 `var(--space-3)`(10 px)。

**根因 (HIGH)**:
- `Card.module.css:1-6` (`.card` 块缺 padding)
- `ProblemTestdata.module.css:11` (`.empty` 缺 padding)

---

## Validation Results

| Check | Result | 说明 |
|---|---|---|
| 类型检查 `tsc -b` | 不适用 | 未运行(本地 setup 未启);用 Reviewer 时间建议补 |
| Lint | 不适用 | 未运行 |
| Vitest `yarn workspace @hydrooj/ui-next test` | 应 PASS | 每个新组件已有 `*.test.tsx`,与 src 并列 |
| 视觉回归(Playwright) | 缺失 | 新页面**未在 visual regression 中加 baseline**;强烈建议补一帧空 testdata 截图作为基线,避免 H1/H2 修复后被误当 regression |

---

## Files Reviewed (this review pass)

Source(实际代码,只列有 issue):
- `packages/ui-next/src/components/primitives/Card.{tsx,module.css}`
- `packages/ui-next/src/components/contest/ContestBalloonTable.tsx`
- `packages/ui-next/src/components/contest/ContestBalloonSetColor.tsx`
- `packages/ui-next/src/components/contest/ContestClarificationForm.tsx`
- `packages/ui-next/src/components/contest/ContestClarificationList.tsx`
- `packages/ui-next/src/components/contest/ContestManagementSidebar.tsx`
- `packages/ui-next/src/components/contest/ContestUserTable.tsx`
- `packages/ui-next/src/components/contest/ContestUserAddDialog.tsx`
- `packages/ui-next/src/components/problem/ProblemTestdata.{tsx,module.css}`
- `packages/ui-next/src/components/problem/ProblemCreateTestdata.{tsx,module.css}`
- `packages/ui-next/src/components/problem/ProblemGenerateTestdata.{tsx,module.css}`
- `packages/ui-next/src/components/problem/ProblemConfigTree.{tsx,module.css}`
- `packages/ui-next/src/components/problem/ProblemConfigBasicForm.tsx`
- `packages/ui-next/src/components/problem/ProblemConfigEditor.tsx`
- `packages/ui-next/src/pages/problem_config.{tsx,module.css}`
- `packages/ui-next/src/pages/problem_files.tsx`
- `packages/ui-next/src/pages/contest_balloon.{tsx,module.css}`
- `packages/ui-next/src/pages/contest_clarification.{tsx,module.css}`
- `packages/ui-next/src/pages/contest_user.{tsx,module.css}`
- `packages/ui-next/src/components/problem/ProblemFiles.{tsx,module.css}`
- `packages/ui-next/src/lib/i18n.ts`

未读文件(`Plan` 列出的,但本次 review 未深入,可下一轮补):
- `packages/ui-next/src/lib/yaml-config.ts` & 单元测试
- `packages/ui-next/src/lib/testdata-detect.ts` & 单元测试
- `packages/ui-next/src/components/primitives/Modal.{tsx,test,css}`
- `packages/ui-next/src/components/primitives/HexColorPicker.{tsx,test,css}`
- `packages/ui-next/src/components/primitives/UserSelectAutoComplete.{tsx,test,css}`
- `packages/ui-next/src/hooks/use-balloon-poll.ts`
- 相关 `.test.tsx` 文件(仅作为存在性确认,未跑)

## 修复优先级建议

1. **H1 + H2**(同一个用户反馈的根因)+ **H3**(testdata 的英文文案)— 必须同一 PR 一起修。
2. **H4**(全量 i18n 表)— 建议单独 PR(为减少 conflicts)。
3. M1 / M2 / M3 / M4 — H4 一起处理最经济。
4. M5 / M6 — 顺带手,影响小。
5. L 类别 — 选择性接。

## 后续建议(非本 PR)
- 把视觉回归补完(`yarn workspace @hydrooj/ui-next test:visual:update`),为所有 5 个新页面各增加 baseline。
- `use-build-url` 风格的 helper 应当允许 Page / Component 任意层级共用,而不是把路由名硬写到 `Link to=`。
- 抽出 `<Empty>` primitive,把 `.empty` 样式统一到一处。
