# ui-next problem_submit 功能等价迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `ui-next` 的 `problem_submit` 重做为与 `ui-default` 功能和提交语义等价的 React 页面，同时保留 `ui-next` 视觉体系。

**Architecture:** 服务端只额外注入提交页需要的完整语言元数据；客户端以纯函数复刻旧语言过滤和偏好算法，以 React 组件实现两级选择与提交提示。页面恢复无 `action` 的原生 multipart POST，由现有 `ProblemSubmitHandler` 统一处理 `tid`、校验、限流和重定向；题目侧栏菜单从 `problem_detail` 抽成共享组件。

**Tech Stack:** TypeScript、React 19、Vitest、Testing Library、happy-dom、Node `node:test`、Hydro Handler/renderer、CSS Modules。

## Global Constraints

- 功能和交互必须与 `ui-default` 等价；只允许技术栈和视觉表现变化。
- 独立提交页不得保留预测试输入；预测试仍只由 Scratchpad 提供。
- 不修改 `packages/ui-default/**` 的运行时行为。
- 不复制 `ProblemSubmitHandler.post()` 的校验、限流、文件处理或跳转逻辑。
- 不修改全局 next renderer 或 `UiContext`；语言元数据只在 `ProblemSubmitHandler.get()` 局部注入。
- 不实现 Scratchpad，不新增提交协议，不顺手重构无关页面。
- 不使用 Playwright。
- 所有行为变更遵循 RED → GREEN；每次先观察测试按预期失败，再写最小实现。
- 当前工作树已有用户修改；不得覆盖或回滚 `.claude/error.md`、`.claude/rebuild.md`、`ProblemForm.tsx` 等无关文件。
- 执行期间只有在用户明确授权 Git commit 后才能运行计划中的可选 commit 命令。
- 新增提示文案必须由用户审阅；不改 YAML locale 文件。

---

## 文件结构

### 新建

- `packages/ui-next/src/components/problem/problem-language.ts`
  - 纯函数和语言元数据类型；不依赖 React 或浏览器全局。
- `packages/ui-next/src/components/problem/problem-language.test.ts`
  - 旧语言过滤、分组、偏好和初始选择算法测试。
- `packages/ui-next/src/components/problem/ProblemLanguageSelect.tsx`
  - 两级语言选择器和最终隐藏 `lang` 字段。
- `packages/ui-next/src/components/problem/ProblemLanguageSelect.test.tsx`
  - 主/子选择联动及隐藏字段测试。
- `packages/ui-next/src/components/problem/SubmitHint.tsx`
  - `submit-hint` 提示状态机。
- `packages/ui-next/src/components/problem/SubmitHint.module.css`
  - 提示容器及链接式按钮样式。
- `packages/ui-next/src/components/problem/SubmitHint.test.tsx`
  - 临时关闭、永久关闭、存储异常测试。
- `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx`
  - 从 `problem_detail` 抽出的菜单上下文、菜单构建函数和共享菜单组件。
- `packages/ui-next/src/components/sidebar/ProblemSidebar.test.tsx`
  - 普通、比赛、作业菜单契约测试。
- `packages/ui-next/src/pages/problem_submit.module.css`
  - 提交页双栏、表单、textarea、文件区域和响应式样式。

### 修改

- `packages/hydrooj/src/handler/problem.ts:471-482`
  - 向提交页 GET body 注入 `langs: setting.langs`。
- `test/main.ts`
  - 通过真实 HTTP 路由验证 `ProblemSubmitHandler.get()` 的语言数据契约。
- `packages/ui-next/src/pages/problem_detail.tsx:221-461`
  - 删除本地侧栏菜单构建代码，改用共享模块；菜单行为不变。
- `packages/ui-next/src/pages/problem_submit.tsx`
  - 改为原生 POST 表单，组合语言选择器、提示和共享侧栏。
- `packages/ui-next/src/pages/problem_submit.test.tsx`
  - 扩充提交页功能等价集成测试。
- `packages/ui-next/src/lib/i18n.ts`
  - 新增两条提交提示文案；删除不再使用的预测试、提交中和客户端空提交错误键。

---

### Task 1：向提交页注入完整语言元数据

**Files:**
- Modify: `test/main.ts:1-70`
- Modify: `packages/hydrooj/src/handler/problem.ts:471-482`

**Interfaces:**
- Produces: `ProblemSubmitHandler.get()` 的 `response.body.langs: typeof setting.langs`
- Preserves: `response.body.langRange: Record<string, string>`
- Consumed by: Task 2、Task 3、Task 6

- [ ] **Step 1：在真实 HTTP harness 中写失败契约测试**

在 `test/main.ts` 的注册、登录测试之后增加：

```ts
it('ProblemSubmitHandler.get exposes language metadata for ui-next', async () => {
    const {
        ProblemModel, SettingModel, UserModel,
    } = require('hydrooj');
    await UserModel.setSuperAdmin(2);
    await ProblemModel.add(
        'system',
        'P1000',
        'A+B Problem',
        JSON.stringify({ en: 'A+B', zh: 'A+B' }),
        2,
        [],
    );

    const res = await agent.get('/p/P1000/submit').expect(200);
    const body = typeof res.body === 'object' && res.body !== null
        ? res.body
        : JSON.parse(res.text);

    assert(body.langRange && typeof body.langRange === 'object');
    assert(body.langs && typeof body.langs === 'object', 'problem_submit response is missing langs');
    assert.strictEqual(body.langs.cc?.display, SettingModel.langs.cc.display);
    assert.strictEqual(body.langs.cc?.pretest, SettingModel.langs.cc.pretest);
    assert.strictEqual(body.langs['cc.cc17']?.display, SettingModel.langs['cc.cc17'].display);
});
```

不要增加 source-text、regex 或 mock handler 测试；该契约必须经过真实路由。

- [ ] **Step 2：运行测试并确认 RED**

Run:

```bash
yarn test
```

Expected: 新测试在 `problem_submit response is missing langs` 断言失败；不是 401、403、404 或 fixture 创建错误。

- [ ] **Step 3：写最小服务端实现**

在 `packages/hydrooj/src/handler/problem.ts` 的 `this.response.body.langRange = langRange;` 后增加一行：

```ts
this.response.body.langRange = langRange;
this.response.body.langs = setting.langs;
```

不要修改 renderer、`UiContext` 或 `ui-default` builder。

- [ ] **Step 4：运行测试并确认 GREEN**

Run:

```bash
yarn test
```

Expected: 新的 `ProblemSubmitHandler.get exposes language metadata for ui-next` 测试通过，原有 backend e2e 测试仍通过。

- [ ] **Step 5：可选提交检查点**

仅在用户明确授权提交后运行：

```bash
git add test/main.ts packages/hydrooj/src/handler/problem.ts
git commit -m "fix(ui-next): expose submit language metadata

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2：以纯函数复刻 ui-default 语言算法

**Files:**
- Create: `packages/ui-next/src/components/problem/problem-language.ts`
- Create: `packages/ui-next/src/components/problem/problem-language.test.ts`

**Interfaces:**
- Consumes: `langRange: Record<string, string>`、`langs: Record<string, LangMeta>`、`codeLang: string`
- Produces:
  - `LangMeta`
  - `getAvailableLangsForProblem(langRange, langs)`
  - `buildMainLangsAndPreferences(availableLangs, codeLang, langs)`
  - `pickInitialLanguage(availableLangs, mainLangs, preferences)`
  - `getSubLangs(availableLangs, main)`

- [ ] **Step 1：写语言算法失败测试**

创建 `problem-language.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import {
  buildMainLangsAndPreferences,
  getAvailableLangsForProblem,
  getSubLangs,
  pickInitialLanguage,
  type LangMeta,
} from './problem-language';

const langs: Record<string, LangMeta> = {
  cc: { display: 'C++', pretest: 'cc.cc17' },
  'cc.cc17': { display: 'C++17' },
  'cc.cc17o2': { display: 'C++17 (O2)' },
  py: { display: 'Python' },
  'py.py2': { display: 'Python 2', disabled: true },
  rs: { display: 'Rust', hidden: true },
};

describe('problem submit language model', () => {
  it('uses langRange as the allowed-language set', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', py: 'Python' },
      langs,
    );
    expect(Object.keys(available)).toEqual(['cc.cc17', 'py']);
  });

  it('excludes disabled languages and keeps explicitly allowed hidden languages', () => {
    const available = getAvailableLangsForProblem(
      { 'py.py2': 'Python 2', rs: 'Rust' },
      langs,
    );
    expect(available).not.toHaveProperty('py.py2');
    expect(available).toHaveProperty('rs');
  });

  it('groups compound keys under their main language', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)' },
      langs,
    );
    const { mainLangs } = buildMainLangsAndPreferences(available, '', langs);
    expect(mainLangs).toEqual({ cc: 'C++' });
    expect(getSubLangs(available, 'cc')).toEqual({ cc17: 'C++17', cc17o2: 'C++17 (O2)' });
  });

  it('prefers UserContext.codeLang when it is available', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', py: 'Python' },
      langs,
    );
    const { mainLangs, preferences } = buildMainLangsAndPreferences(available, 'py', langs);
    expect(pickInitialLanguage(available, mainLangs, preferences)).toEqual(['py', '']);
  });

  it('preserves the legacy pretest preference mapping', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)' },
      langs,
    );
    const { mainLangs, preferences } = buildMainLangsAndPreferences(available, 'cc.cc17', langs);
    expect(preferences).toContain('cc');
    expect(pickInitialLanguage(available, mainLangs, preferences)).toEqual(['cc', 'cc17']);
  });

  it('falls back to the first available complete language key', () => {
    const available = getAvailableLangsForProblem({ py: 'Python', 'cc.cc17': 'C++17' }, langs);
    const { mainLangs } = buildMainLangsAndPreferences(available, 'missing', langs);
    expect(pickInitialLanguage(available, mainLangs, ['missing'])).toEqual(['py', '']);
  });
});
```

- [ ] **Step 2：运行测试并确认 RED**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/problem/problem-language.test.ts
```

Expected: FAIL，因为 `problem-language.ts` 或导出函数尚不存在。

- [ ] **Step 3：实现纯函数**

创建 `problem-language.ts`：

```ts
export interface LangMeta {
  display: string;
  hidden?: boolean;
  disabled?: boolean;
  pretest?: string;
  [key: string]: unknown;
}

export function getAvailableLangsForProblem(
  langRange: Record<string, string>,
  langs: Record<string, LangMeta>,
): Record<string, LangMeta> {
  const prefixes = new Set(
    Object.keys(langs).filter((key) => key.includes('.')).map((key) => key.split('.')[0]),
  );
  const available: Record<string, LangMeta> = {};
  for (const key in langs) {
    if (prefixes.has(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(langRange, key)) continue;
    if (langs[key].disabled) continue;
    available[key] = langs[key];
  }
  return available;
}

export function buildMainLangsAndPreferences(
  availableLangs: Record<string, LangMeta>,
  codeLang: string,
  langs: Record<string, LangMeta>,
): { mainLangs: Record<string, string>, preferences: string[] } {
  const mainLangs: Record<string, string> = {};
  const preferences = [codeLang || ''];
  for (const key in availableLangs) {
    if (langs[key]?.pretest === preferences[0]) preferences.push(key);
    if (!key.includes('.')) mainLangs[key] = langs[key]?.display || key;
    else {
      const main = key.split('.')[0];
      mainLangs[main] = langs[main]?.display || main;
    }
  }
  for (const key in availableLangs) {
    const pretest = langs[key]?.pretest;
    if (typeof pretest === 'string' && pretest.split('.')[0] === preferences[0].split('.')[0]) {
      preferences.push(key);
    }
  }
  return { mainLangs, preferences };
}

export function pickInitialLanguage(
  availableLangs: Record<string, LangMeta>,
  mainLangs: Record<string, string>,
  preferences: string[],
): [string, string] {
  for (const preference of preferences) {
    if (preference.includes('.')) {
      const [main, sub] = preference.split('.');
      if (availableLangs[preference]) return [main, sub];
      if (availableLangs[main]) return [main, ''];
    } else if (availableLangs[preference]) return [preference, ''];
  }
  const main = Object.keys(mainLangs)[0] || '';
  for (const key in availableLangs) {
    if (key.startsWith(`${main}.`)) return [main, key.split('.')[1]];
  }
  return [main, ''];
}

export function getSubLangs(
  availableLangs: Record<string, LangMeta>,
  main: string,
): Record<string, string> {
  const options: Record<string, string> = {};
  for (const key in availableLangs) {
    if (key.startsWith(`${main}.`)) options[key.split('.')[1]] = availableLangs[key].display;
  }
  return options;
}
```

- [ ] **Step 4：运行测试并确认 GREEN**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/problem/problem-language.test.ts
```

Expected: 6 tests PASS。

- [ ] **Step 5：可选提交检查点**

仅在用户明确授权提交后运行：

```bash
git add packages/ui-next/src/components/problem/problem-language.ts packages/ui-next/src/components/problem/problem-language.test.ts
git commit -m "feat(ui-next): port submit language selection model

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3：实现 React 两级语言选择器

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemLanguageSelect.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemLanguageSelect.test.tsx`

**Interfaces:**
- Consumes Task 2 的四个纯函数和 `LangMeta`
- Produces:

```ts
export interface ProblemLanguageSelectProps {
  langRange: Record<string, string>;
  langs: Record<string, LangMeta>;
  codeLang?: string;
  name?: string;
}
```

- [ ] **Step 1：写组件失败测试**

创建 `ProblemLanguageSelect.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProblemLanguageSelect from './ProblemLanguageSelect';

const langs = {
  cc: { display: 'C++', pretest: 'cc.cc17' },
  'cc.cc17': { display: 'C++17' },
  'cc.cc17o2': { display: 'C++17 (O2)' },
  py: { display: 'Python' },
};

describe('ProblemLanguageSelect', () => {
  it('writes the preferred complete language key to the hidden field', () => {
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)', py: 'Python' }}
      langs={langs}
      codeLang="cc.cc17o2"
    />);
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17o2');
  });

  it('updates the hidden field when the main language changes', () => {
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)', py: 'Python' }}
      langs={langs}
      codeLang="py"
    />);
    const mainSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(mainSelect, { target: { value: 'cc' } });
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17');
  });

  it('updates the hidden field when the sub language changes', () => {
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)' }}
      langs={langs}
      codeLang="cc.cc17"
    />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'cc17o2' } });
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17o2');
  });
});
```

- [ ] **Step 2：运行测试并确认 RED**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/problem/ProblemLanguageSelect.test.tsx
```

Expected: FAIL，因为组件不存在。

- [ ] **Step 3：实现两级选择器**

创建 `ProblemLanguageSelect.tsx`：

```tsx
import { useMemo, useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import {
  buildMainLangsAndPreferences,
  getAvailableLangsForProblem,
  getSubLangs,
  pickInitialLanguage,
  type LangMeta,
} from './problem-language';

export interface ProblemLanguageSelectProps {
  langRange: Record<string, string>;
  langs: Record<string, LangMeta>;
  codeLang?: string;
  name?: string;
}

export default function ProblemLanguageSelect({
  langRange, langs, codeLang = '', name = 'lang',
}: ProblemLanguageSelectProps) {
  const t = useTranslate();
  const available = useMemo(
    () => getAvailableLangsForProblem(langRange, langs),
    [langRange, langs],
  );
  const { mainLangs, preferences } = useMemo(
    () => buildMainLangsAndPreferences(available, codeLang, langs),
    [available, codeLang, langs],
  );
  const [initialMain, initialSub] = useMemo(
    () => pickInitialLanguage(available, mainLangs, preferences),
    [available, mainLangs, preferences],
  );
  const [main, setMain] = useState(initialMain);
  const [sub, setSub] = useState(initialSub);
  const subLangs = getSubLangs(available, main);
  const fullKey = sub ? `${main}.${sub}` : main;

  const changeMain = (nextMain: string) => {
    const nextSubs = getSubLangs(available, nextMain);
    setMain(nextMain);
    setSub(Object.keys(nextSubs)[0] || '');
  };

  return (
    <div>
      <label>
        <span>{t('ProblemSubmit.Language')}</span>
        <select value={main} onChange={(event) => changeMain(event.currentTarget.value)}>
          {Object.entries(mainLangs).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      {Object.keys(subLangs).length > 0 && (
        <label>
          <span>{t('ProblemSubmit.LanguageVersion')}</span>
          <select value={sub} onChange={(event) => setSub(event.currentTarget.value)}>
            {Object.entries(subLangs).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      )}
      <input type="hidden" name={name} value={fullKey} />
    </div>
  );
}
```

父页面会按 `pdoc.docId:tdoc.docId` 设置 key，因此本组件不额外同步已经挂载后的新 props。

- [ ] **Step 4：运行测试并确认 GREEN**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/problem/ProblemLanguageSelect.test.tsx
```

Expected: 3 tests PASS，隐藏字段始终保存完整 key。

- [ ] **Step 5：可选提交检查点**

仅在用户明确授权提交后运行：

```bash
git add packages/ui-next/src/components/problem/ProblemLanguageSelect.tsx packages/ui-next/src/components/problem/ProblemLanguageSelect.test.tsx
git commit -m "feat(ui-next): add equivalent submit language selector

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4：恢复提交提示和兼容的 localStorage 行为

**Files:**
- Create: `packages/ui-next/src/components/problem/SubmitHint.tsx`
- Create: `packages/ui-next/src/components/problem/SubmitHint.module.css`
- Create: `packages/ui-next/src/components/problem/SubmitHint.test.tsx`
- Modify: `packages/ui-next/src/lib/i18n.ts:156-168,578-590`

**Interfaces:**
- Produces: `SubmitHint`，固定使用 `localStorage['submit-hint']` 和值 `dismiss`
- Consumed by: Task 6

- [ ] **Step 1：写提示状态失败测试**

创建 `SubmitHint.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubmitHint from './SubmitHint';

describe('SubmitHint', () => {
  beforeEach(() => localStorage.clear());

  it('shows by default and Dismiss only hides the current instance', () => {
    render(<SubmitHint />);
    fireEvent.click(screen.getByRole('button', { name: /Dismiss|关闭/ }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(localStorage.getItem('submit-hint')).toBeNull();
  });

  it("Don't show again stores the legacy dismiss value", () => {
    render(<SubmitHint />);
    fireEvent.click(screen.getByRole('button', { name: /Don.t show again|不再显示/ }));
    expect(localStorage.getItem('submit-hint')).toBe('dismiss');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('starts hidden when the legacy key is already dismissed', () => {
    localStorage.setItem('submit-hint', 'dismiss');
    render(<SubmitHint />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('still dismisses when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('blocked'); });
    render(<SubmitHint />);
    fireEvent.click(screen.getByRole('button', { name: /Don.t show again|不再显示/ }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2：运行测试并确认 RED**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/problem/SubmitHint.test.tsx
```

Expected: FAIL，因为组件不存在。

- [ ] **Step 3：新增经过审阅的 i18n 键**

在 `zhCN` 和 `en` catalog 的 `ProblemSubmit.*` 区域增加：

```ts
'ProblemSubmit.HintBody1': '此页面仅用于粘贴来自其他来源的代码。',
'ProblemSubmit.HintBody2': '如需代码高亮和试运行等更好的编辑体验，请返回题目详情页并使用“打开草稿本”。',
'ProblemSubmit.LanguageVersion': '语言版本',

'ProblemSubmit.HintBody1': 'This page is only for pasting code from other sources.',
'ProblemSubmit.HintBody2': "For code highlighting and test runs, return to the problem page and use 'Open Scratchpad'.",
'ProblemSubmit.LanguageVersion': 'Language version',
```

删除不再有消费者的：

```ts
'ProblemSubmit.PretestInput'
'ProblemSubmit.PretestPlaceholder'
'ProblemSubmit.Submitting'
'ProblemSubmit.ErrorNoCodeOrFile'
```

保留 `ProblemSubmit.UploadHint`，它属于视觉辅助文案，不改变提交行为。

- [ ] **Step 4：实现提示组件和样式**

创建 `SubmitHint.tsx`：

```tsx
import { useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import styles from './SubmitHint.module.css';

const HINT_KEY = 'submit-hint';
const DISMISSED = 'dismiss';

export default function SubmitHint() {
  const t = useTranslate();
  const [visible, setVisible] = useState(() => {
    try {
      return typeof localStorage === 'undefined' || localStorage.getItem(HINT_KEY) !== DISMISSED;
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const dismissForever = () => {
    setVisible(false);
    try {
      localStorage.setItem(HINT_KEY, DISMISSED);
    } catch {
      // 存储不可用时仍允许关闭当前提示。
    }
  };

  return (
    <aside className={styles.hint} role="note">
      <p>{t('ProblemSubmit.HintBody1')}</p>
      <p>{t('ProblemSubmit.HintBody2')}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => setVisible(false)}>{t('Common.Dismiss')}</button>
        <span aria-hidden="true">/</span>
        <button type="button" onClick={dismissForever}>{t('Common.DontShowAgain')}</button>
      </div>
    </aside>
  );
}
```

创建 `SubmitHint.module.css`：

```css
.hint {
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  padding: var(--space-3) var(--space-4);
  color: var(--text);
}

.hint p {
  margin: 0 0 var(--space-2);
}

.actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.actions button {
  border: 0;
  padding: 0;
  background: none;
  color: var(--primary);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
```

- [ ] **Step 5：运行测试并确认 GREEN**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/problem/SubmitHint.test.tsx
```

Expected: 4 tests PASS。

- [ ] **Step 6：可选提交检查点**

仅在用户明确授权提交后运行：

```bash
git add packages/ui-next/src/components/problem/SubmitHint.tsx packages/ui-next/src/components/problem/SubmitHint.module.css packages/ui-next/src/components/problem/SubmitHint.test.tsx packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): restore submit page hint behavior

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5：抽取并共享题目侧栏菜单

**Files:**
- Create: `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx`
- Create: `packages/ui-next/src/components/sidebar/ProblemSidebar.test.tsx`
- Modify: `packages/ui-next/src/pages/problem_detail.tsx:221-461,605-651,730-737`

**Interfaces:**
- Produces:
  - `ProblemSidebarContext`
  - `getTidQuery(tdoc)`
  - `getNormalMenu(ctx, t)`
  - `getContestMenu(ctx, mode, t)`
  - `getHomeworkMenu(ctx, mode, t)`
  - `pickSidebarItems(ctx, mode, t)`
  - `ProblemSidebar`
- Preserves: `problem_detail` 的既有 menu item、权限判断、badge、POST form 和 URL
- Consumed by: Task 6

- [ ] **Step 1：先写共享菜单失败测试**

创建 `ProblemSidebar.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import {
  getTidQuery,
  pickSidebarItems,
  type ProblemSidebarContext,
} from './ProblemSidebar';

const t = (key: string) => key;
const buildUrl = (name: string, params?: Record<string, unknown>, query?: Record<string, string>) => (
  `${name}:${String(params?.pid ?? '')}:${new URLSearchParams(query).toString()}`
);
const base: ProblemSidebarContext = {
  pdoc: { docId: 3, pid: 'P1000', title: 'A+B' },
  UserContext: { _id: 2, perm: '0', priv: 0 },
  buildUrl,
  discussionCount: 4,
  solutionCount: 2,
};

describe('ProblemSidebar', () => {
  it('builds no tid query outside a contest or homework', () => {
    expect(getTidQuery()).toEqual({});
  });

  it('keeps tid in every contest or homework problem link', () => {
    const ctx = { ...base, tdoc: { docId: '64f000000000000000000001', rule: 'contest' } };
    expect(getTidQuery(ctx.tdoc)).toEqual({ tid: '64f000000000000000000001' });
    expect(pickSidebarItems(ctx, 'normal', t).some((item) => item.href?.includes('tid='))).toBe(true);
  });

  it('selects the homework menu only for rule=homework', () => {
    const homework = pickSidebarItems(
      { ...base, tdoc: { docId: '64f000000000000000000001', rule: 'homework' } },
      'normal',
      t,
    );
    const contest = pickSidebarItems(
      { ...base, tdoc: { docId: '64f000000000000000000001', rule: 'contest' } },
      'normal',
      t,
    );
    expect(homework.map((item) => item.label)).not.toEqual(contest.map((item) => item.label));
  });
});
```

执行时应复用 `problem_detail` 当前测试或 route-map helper 的实际类型；不要通过 `as any` 绕过错误的 URL 签名。

- [ ] **Step 2：运行测试并确认 RED**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/sidebar/ProblemSidebar.test.tsx
```

Expected: FAIL，因为共享模块不存在。

- [ ] **Step 3：平移现有菜单实现，不改变函数体**

从 `packages/ui-next/src/pages/problem_detail.tsx:221-461` 将以下符号完整移动到 `ProblemSidebar.tsx`：

```ts
export interface ProblemSidebarContext { /* 原 SidebarCtx 字段原样保留 */ }
export function getTidQuery(/* 原签名 */) { /* 原函数体原样保留 */ }
export function getNormalMenu(/* 原签名 */) { /* 原函数体原样保留 */ }
export function getContestMenu(/* 原签名 */) { /* 原函数体原样保留 */ }
export function getHomeworkMenu(/* 原签名 */) { /* 原函数体原样保留 */ }
export function pickSidebarItems(/* 原签名 */) { /* 原函数体原样保留 */ }
```

“原样保留”是本任务的硬约束：不得修改菜单顺序、权限条件、badge、form、route name 或 query。只把 `SidebarCtx` 重命名为 `ProblemSidebarContext` 并导出。

在同一文件增加组件包装：

```tsx
export function ProblemSidebar({
  context, mode,
}: {
  context: ProblemSidebarContext;
  mode: 'normal' | 'contest' | 'view' | 'correction';
}) {
  const t = useTranslate();
  return <Menu items={pickSidebarItems(context, mode, t)} />;
}
```

- [ ] **Step 4：让 problem_detail 使用共享模块**

删除 `problem_detail.tsx` 中已移动的 `SidebarCtx` 和五个函数，导入：

```ts
import {
  ProblemSidebar,
  type ProblemSidebarContext,
} from '../components/sidebar/ProblemSidebar';
```

将原本直接渲染的：

```tsx
<Menu items={sidebarItems} />
```

替换为：

```tsx
<ProblemSidebar context={sidebarContext satisfies ProblemSidebarContext} mode={mode} />
```

保留 `problem_detail` 原有 `SideCard`、`Author`、`ContestList`、`InformationCard` 和 `RelatedCard` JSX；本任务只共享功能菜单，避免把详情页专属信息卡错误耦合到提交表单。

- [ ] **Step 5：运行目标测试并确认 GREEN**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/components/sidebar/ProblemSidebar.test.tsx src/pages/problem_detail.test.ts
```

Expected: 新侧栏测试及现有 `problem_detail` 测试全部通过。

- [ ] **Step 6：可选提交检查点**

仅在用户明确授权提交后运行：

```bash
git add packages/ui-next/src/components/sidebar/ProblemSidebar.tsx packages/ui-next/src/components/sidebar/ProblemSidebar.test.tsx packages/ui-next/src/pages/problem_detail.tsx
git commit -m "refactor(ui-next): share problem sidebar menu

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6：将 problem_submit 重写为功能等价原生表单

**Files:**
- Modify: `packages/ui-next/src/pages/problem_submit.test.tsx`
- Modify: `packages/ui-next/src/pages/problem_submit.tsx`
- Create: `packages/ui-next/src/pages/problem_submit.module.css`

**Interfaces:**
- Consumes:
  - Task 1 的 `args.langs`
  - Task 3 的 `ProblemLanguageSelect`
  - Task 4 的 `SubmitHint`
  - Task 5 的 `ProblemSidebar`
- Produces: 无 `action` 的 `POST multipart/form-data` 表单
- Removes: fetch 请求、`tid` 拼接、客户端跳转、客户端错误状态、预测试 UI

- [ ] **Step 1：重写页面测试，使当前实现按功能差异失败**

保留现有 `langRange` 对象回归测试，并增加以下断言：

```tsx
it('renders a native multipart POST form without overriding the current URL', () => {
  renderPage(defaultArgs);
  const form = document.querySelector('form')!;
  expect(form.getAttribute('method')?.toLowerCase()).toBe('post');
  expect(form.getAttribute('enctype')).toBe('multipart/form-data');
  expect(form.hasAttribute('action')).toBe(false);
});

it('renders legacy code and file field names without pretest fields', () => {
  renderPage(defaultArgs);
  expect(document.querySelector('textarea[name="code"]')).toBeTruthy();
  expect(document.querySelector('input[type="file"][name="file"]')).toBeTruthy();
  expect(document.querySelector('[name="pretest"], [name="input"]')).toBeNull();
});

it('uses UserContext.codeLang for the initial submitted language', () => {
  renderPage({ ...defaultArgs, UserContext: { _id: 2, codeLang: 'py' } });
  expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('py');
});

it('submit_answer fixes lang to underscore and hides language controls and hint', () => {
  renderPage({
    ...defaultArgs,
    pdoc: { ...defaultArgs.pdoc, config: { type: 'submit_answer', langs: ['_'] } },
    langRange: { _: '_' },
  });
  expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('_');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.queryByRole('note')).not.toBeInTheDocument();
});

it('renders the shared problem sidebar menu', () => {
  renderPage(defaultArgs);
  expect(screen.getByRole('complementary')).toBeInTheDocument();
});
```

测试 helper 的 `defaultArgs` 必须包含：

```ts
const defaultArgs = {
  pdoc: {
    docId: 3,
    pid: 'P1000',
    title: 'A+B',
    config: { type: 'default', langs: ['cc.cc17', 'py'] },
  },
  langRange: { 'cc.cc17': 'C++17', py: 'Python' },
  langs: {
    cc: { display: 'C++', pretest: 'cc.cc17' },
    'cc.cc17': { display: 'C++17' },
    py: { display: 'Python' },
  },
  discussionCount: 0,
  solutionCount: 0,
  mode: 'normal',
  UserContext: { _id: 2, codeLang: 'cc.cc17' },
  UiContext: {},
};
```

- [ ] **Step 2：运行页面测试并确认 RED**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/pages/problem_submit.test.tsx
```

Expected: 至少在 `action`/原生提交语义、无预测试字段、`UserContext.codeLang`、`submit_answer` 提示和共享侧栏断言失败；不能只出现 setup 错误。

- [ ] **Step 3：定义准确页面 Args 并删除 SPA 提交逻辑**

在 `problem_submit.tsx` 中删除：

```ts
FormEvent
useState（提交字段和错误状态）
useNavigate
HydroClientError
request
Alert
RateLimitAlert
afterSubmit
submit
pretestAllowed
```

定义：

```ts
interface Args {
  UserContext: ProblemSidebarContext['UserContext'] & { codeLang?: string };
  UiContext: Record<string, unknown>;
  pdoc: ProblemSidebarContext['pdoc'] & {
    config?: { type?: string, langs?: string[] } | string;
  };
  langRange: Record<string, string>;
  langs: Record<string, LangMeta>;
  tdoc?: ProblemSidebarContext['tdoc'];
  psdoc?: ProblemSidebarContext['psdoc'];
  discussionCount?: number;
  solutionCount?: number;
  mode?: 'normal' | 'contest' | 'view' | 'correction';
}
```

不得重新加入顶层 `codeLang` 或 `tid`。

- [ ] **Step 4：实现原生表单页面**

核心 JSX：

```tsx
const submitAnswer = typeof pdoc.config === 'object' && pdoc.config?.type === 'submit_answer';
const formKey = `${pdoc.docId}:${tdoc?.docId ?? ''}`;
const sidebarContext: ProblemSidebarContext = {
  pdoc,
  tdoc,
  UserContext,
  buildUrl,
  discussionCount,
  solutionCount,
  psdoc,
};

return (
  <main className={styles.page}>
    <div className={styles.layout}>
      <section className={styles.content}>
        <Link to="problem_detail" params={{ pid: pdoc.pid ?? String(pdoc.docId) }}>
          {t('ProblemSubmit.BackToProblem')}
        </Link>
        <h1 className={styles.title}>{t('ProblemSubmit.TitlePrefix')}{pdoc.title}</h1>
        {!submitAnswer && <SubmitHint />}
        <form key={formKey} method="post" encType="multipart/form-data" className={styles.form}>
          {submitAnswer ? (
            <input type="hidden" name="lang" value="_" />
          ) : (
            <ProblemLanguageSelect
              key={formKey}
              langRange={langRange}
              langs={langs}
              codeLang={UserContext.codeLang}
            />
          )}
          <label className={styles.field}>
            <span>{t('ProblemSubmit.SourceCode')}</span>
            <textarea
              name="code"
              spellCheck={false}
              autoFocus
              className={styles.codearea}
              placeholder={t('ProblemSubmit.SourcePlaceholder')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('ProblemSubmit.UploadFile')}</span>
            <input type="file" name="file" />
            <small>{t('ProblemSubmit.UploadHint')}</small>
          </label>
          <Button type="submit" variant="primary">{t('ProblemSubmit.Submit')}</Button>
        </form>
      </section>
      <aside className={styles.sidebar}>
        <ProblemSidebar context={sidebarContext} mode={mode} />
      </aside>
    </div>
  </main>
);
```

form 不能出现 `action`、`onSubmit`、隐藏 `tid`、`pretest` 或 `input`。

- [ ] **Step 5：添加页面 CSS Module**

创建 `problem_submit.module.css`：

```css
.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: var(--space-6);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: var(--space-6);
  align-items: start;
}

.content,
.sidebar {
  min-width: 0;
}

.title {
  margin: var(--space-2) 0 var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
}

.form,
.field {
  display: flex;
  flex-direction: column;
}

.form {
  gap: var(--space-4);
}

.field {
  gap: var(--space-2);
}

.codearea {
  width: 100%;
  min-height: 360px;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6：运行提交页测试并确认 GREEN**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/pages/problem_submit.test.tsx
```

Expected: 所有 `problem_submit` 测试 PASS；不再出现 `langRange.map`。

- [ ] **Step 7：验证同一 page slot 切题时表单重置**

在测试中使用 `useSetPageData()` 创建控制器，不要通过 unmount/remount 伪造验证：

```tsx
function NavigateToSecondProblem({ next }: { next: PageData }) {
  const setPageData = useSetPageData();
  return <button onClick={() => setPageData(next)}>next problem</button>;
}

it('resets native form fields when pdoc changes in the same page slot', () => {
  renderProviders(defaultArgs, <NavigateToSecondProblem next={buildPageData({
    ...defaultArgs,
    pdoc: { ...defaultArgs.pdoc, docId: 4, pid: 'P1001', title: 'Second' },
  })} />);
  const code = document.querySelector<HTMLTextAreaElement>('textarea[name="code"]')!;
  code.value = 'old code';
  fireEvent.click(screen.getByRole('button', { name: 'next problem' }));
  expect(document.querySelector<HTMLTextAreaElement>('textarea[name="code"]')?.value).toBe('');
});
```

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run src/pages/problem_submit.test.tsx
```

Expected: 该测试 PASS，证明 `formKey` 真实重建非受控字段。

- [ ] **Step 8：可选提交检查点**

仅在用户明确授权提交后运行：

```bash
git add packages/ui-next/src/pages/problem_submit.tsx packages/ui-next/src/pages/problem_submit.test.tsx packages/ui-next/src/pages/problem_submit.module.css
git commit -m "fix(ui-next): restore problem submit feature parity

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7：集成回归、静态检查与人工运行时验证

**Files:**
- Verify only; no production edits unless a preceding test exposes a defect.

**Interfaces:**
- Verifies all outputs from Tasks 1–6

- [ ] **Step 1：运行所有本任务目标测试**

Run:

```bash
yarn workspace @hydrooj/ui-next vitest run \
  src/components/problem/problem-language.test.ts \
  src/components/problem/ProblemLanguageSelect.test.tsx \
  src/components/problem/SubmitHint.test.tsx \
  src/components/sidebar/ProblemSidebar.test.tsx \
  src/pages/problem_detail.test.ts \
  src/pages/problem_submit.test.tsx
```

Expected: 所列测试文件全部 PASS，0 failed。

- [ ] **Step 2：运行 ui-next 完整测试**

Run:

```bash
yarn workspace @hydrooj/ui-next test
```

Expected: 全部测试通过。若出现已知的 `127.0.0.1:3000` 环境请求或现有无关失败，记录准确文件、测试名和退出码；不得把目标测试通过描述成完整 suite 通过。

- [ ] **Step 3：检查 TypeScript/IDE 诊断**

优先执行仓库可用的 IDE diagnostics；CLI 环境具备 `tsc` 时运行：

```bash
yarn workspace @hydrooj/ui-next build
```

Expected: 相关新文件无 TypeScript error。若当前环境仍报 `command not found: tsc`，标记为环境阻塞，不修改依赖来掩盖问题。

- [ ] **Step 4：运行格式检查**

Run:

```bash
git diff --check -- \
  packages/hydrooj/src/handler/problem.ts \
  test/main.ts \
  packages/ui-next/src/components/problem \
  packages/ui-next/src/components/sidebar/ProblemSidebar.tsx \
  packages/ui-next/src/components/sidebar/ProblemSidebar.test.tsx \
  packages/ui-next/src/pages/problem_detail.tsx \
  packages/ui-next/src/pages/problem_submit.tsx \
  packages/ui-next/src/pages/problem_submit.test.tsx \
  packages/ui-next/src/pages/problem_submit.module.css \
  packages/ui-next/src/lib/i18n.ts
```

Expected: 无输出，exit 0。

- [ ] **Step 5：在用户现有浏览器环境进行人工验证，不使用 Playwright**

验证路径：

1. 打开普通题目的 `/p/:pid/submit`。
2. 确认提示、两级语言选择、代码区、文件上传、提交按钮和题目侧栏存在。
3. 临时关闭提示并刷新，确认提示重新出现。
4. 选择“不再显示”并刷新，确认提示保持隐藏。
5. 在 Network 或表单 DOM 中确认 form 无 `action`，method 为 POST，enctype 为 multipart。
6. 打开带 `?tid=` 的比赛或作业提交页，确认浏览器地址仍保留 query。
7. 在安全测试题上提交最小代码，确认服务端跳转到记录详情或对应比赛/作业页面，而非首页。
8. 打开 `submit_answer` 题，确认无语言选择和提交提示，但代码/文件答案字段仍在，`lang` 为 `_`。

Expected: 8 项全部符合设计；若用户不授权实际提交，跳过第 7 项并明确注明未验证成功重定向。

- [ ] **Step 6：执行代码审查**

按项目要求分别运行 React、TypeScript 和通用代码审查，重点检查：

- 原生 form 是否意外出现 `action` 或 JS submit handler。
- 完整语言 key 是否始终写入隐藏字段。
- `submit_answer` 是否仍保留答案内容字段。
- 侧栏抽取是否改变原菜单顺序、权限或 URL。
- 新 i18n 文案是否准确。

所有确认的问题先补失败测试，再修复。

- [ ] **Step 7：最终可选提交**

只有用户明确授权提交，并且上述验证结果已如实汇报后，运行：

```bash
git add \
  packages/hydrooj/src/handler/problem.ts \
  test/main.ts \
  packages/ui-next/src/components/problem/problem-language.ts \
  packages/ui-next/src/components/problem/problem-language.test.ts \
  packages/ui-next/src/components/problem/ProblemLanguageSelect.tsx \
  packages/ui-next/src/components/problem/ProblemLanguageSelect.test.tsx \
  packages/ui-next/src/components/problem/SubmitHint.tsx \
  packages/ui-next/src/components/problem/SubmitHint.module.css \
  packages/ui-next/src/components/problem/SubmitHint.test.tsx \
  packages/ui-next/src/components/sidebar/ProblemSidebar.tsx \
  packages/ui-next/src/components/sidebar/ProblemSidebar.test.tsx \
  packages/ui-next/src/pages/problem_detail.tsx \
  packages/ui-next/src/pages/problem_submit.tsx \
  packages/ui-next/src/pages/problem_submit.test.tsx \
  packages/ui-next/src/pages/problem_submit.module.css \
  packages/ui-next/src/lib/i18n.ts \
  docs/superpowers/specs/2026-07-20-problem-submit-parity-design.md \
  docs/superpowers/plans/2026-07-20-problem-submit-parity.md

git commit -m "fix(ui-next): preserve problem submit behavior

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 计划自审结果

- **Spec coverage:** 覆盖语言数据注入、两级语言算法、用户偏好、原生 POST、`tid` query 保留、服务端重定向、`submit_answer`、提交提示、预测试删除、共享侧栏、SPA 切题重置和不使用 Playwright。
- **Type consistency:** `langs` 始终为 `Record<string, LangMeta>`；`langRange` 始终为 `Record<string, string>`；用户偏好只从 `UserContext.codeLang` 读取；不存在顶层 `codeLang`/`tid`。
- **Scope:** 不修改 renderer、UiContext、ui-default 或 Scratchpad；侧栏只抽取功能菜单，详情页信息卡保持原位。
- **Placeholder scan:** 计划没有待定实现；Task 5 唯一要求“原函数体原样平移”是明确的无逻辑变更重构约束，对应精确源码范围 `problem_detail.tsx:221-461`。
