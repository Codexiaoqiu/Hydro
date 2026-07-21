# ui-next Scratchpad Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate ui-default's "Enter Online Coding Mode" (Scratchpad) feature into ui-next, providing a Monaco editor + pretest WebSocket + records panel embedded in problem_detail as a left/right split-pane layout, with `useReducer`+Context state management replacing Redux.

**Architecture:** `problem_detail.tsx` detects `?mode=scratchpad` URL param and mounts `<ScratchpadPanel>` instead of the normal layout. ScratchpadPanel sets up a context, splits the viewport into a problem pane (left, read-only) and an editor pane (right, vertical stack of toolbar + Monaco + bottom panels). All state is local to the panel; persistence uses IndexedDB; pretest runs over WebSocket; submit reuses the existing `postSubmitUrl`.

**Tech Stack:** React 19, TypeScript, monaco-editor (already in deps), @monaco-editor/react (already in deps), Vitest + happy-dom, ui-next design tokens (CSS variables).

## Global Constraints

- **Node ≥ 22** (per CLAUDE.md).
- **AGPLv3** — do not add copyright-incompatible content.
- **monaco-editor `^0.52.0`** and **@monaco-editor/react `^4.6.0`** are already in `packages/ui-next/package.json`; no dependency add required.
- **i18n** keys must be sorted alphabetically ascending (per CLAUDE.md).
- **No AGPLv3-incompatible auto-generated content** in commits.
- **YAGNI** — do not implement Monaco IntelliSense / language services / Monaco theme switching.
- **Tests** must follow existing ui-next pattern: Vitest + happy-dom, files named `*.test.tsx` next to source.
- All new files under `packages/ui-next/src/components/scratchpad/` use **CSS Modules** with `*.module.css` and the `.module.css` extension.

---

## File Map

### New files
- `packages/ui-next/src/components/scratchpad/types.ts` — `ScratchpadState`, `ScratchpadAction`, `WSMessage` types.
- `packages/ui-next/src/components/scratchpad/reducer.ts` — pure reducer + initial state factory.
- `packages/ui-next/src/components/scratchpad/ScratchpadContext.ts` — React Context + `useScratchpad()`.
- `packages/ui-next/src/components/scratchpad/useScratchpadState.ts` — `useReducer` wrapper + provider hook.
- `packages/ui-next/src/components/scratchpad/usePretestSession.ts` — WebSocket lifecycle hook.
- `packages/ui-next/src/components/scratchpad/useScratchpadPersistence.ts` — IndexedDB debounced load/save.
- `packages/ui-next/src/components/scratchpad/useScratchpadHotkeys.ts` — global keyboard handler.
- `packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.tsx` — left column (read-only problem content).
- `packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.tsx` — right column (toolbar + editor + panels).
- `packages/ui-next/src/components/scratchpad/ScratchpadToolbar.tsx` — Run Pretest / Submit / Exit / Lang / Panel toggles.
- `packages/ui-next/src/components/scratchpad/PretestPanel.tsx` — WebSocket output stream + input box.
- `packages/ui-next/src/components/scratchpad/RecordsPanel.tsx` — last 5 submissions list.
- `packages/ui-next/src/components/scratchpad/ScratchpadPanel.tsx` — top-level container, CSS Grid, lifecycle.
- `packages/ui-next/src/components/scratchpad/Scratchpad.module.css` — Grid + flex layout.
- `packages/ui-next/src/components/scratchpad/*.test.tsx` — unit tests for each.

### Modified files
- `packages/ui-next/src/pages/problem_detail.tsx` — detect `?mode=scratchpad`, mount `<ScratchpadPanel>`.
- `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx` — add "Enter Online Coding Mode" menu item.
- `packages/ui-next/src/components/problem/Scratchpad.tsx` — replace body with a re-export of the new panel entry; keep file to avoid breaking imports.
- `packages/ui-next/src/components/problem/MonacoEditor.tsx` — add `useMonaco?: boolean` prop to enable real Monaco via `@monaco-editor/react`.
- `packages/ui-next/src/lib/i18n.ts` — add new `Scratchpad.*` keys (zh + en).

---

### Task 1: Scratchpad state types and reducer

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/types.ts`
- Create: `packages/ui-next/src/components/scratchpad/reducer.ts`
- Create: `packages/ui-next/src/components/scratchpad/reducer.test.ts`

**Interfaces:**
- Produces: `ScratchpadState`, `ScratchpadAction`, `initialScratchpadState`, `scratchpadReducer`.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/reducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialScratchpadState, scratchpadReducer } from './reducer';

describe('scratchpadReducer', () => {
  it('initialScratchpadState has expected defaults', () => {
    const s = initialScratchpadState('cpp', '// template');
    expect(s.lang).toBe('cpp');
    expect(s.code).toBe('// template');
    expect(s.pretest.running).toBe(false);
    expect(s.pretest.output).toEqual([]);
    expect(s.submitting).toBe(false);
    expect(s.records).toEqual([]);
    expect(s.showPretestPanel).toBe(true);
    expect(s.showRecordsPanel).toBe(false);
    expect(s.wsStatus).toBe('idle');
  });

  it('SET_CODE updates code', () => {
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), {
      type: 'SET_CODE',
      payload: 'int main(){}',
    });
    expect(s.code).toBe('int main(){}');
  });

  it('SET_LANG updates lang', () => {
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), {
      type: 'SET_LANG',
      payload: 'py',
    });
    expect(s.lang).toBe('py');
  });

  it('START_PRETEST marks running=true and clears output', () => {
    const prev = {
      ...initialScratchpadState('cpp', ''),
      pretest: { running: false, input: '1\n', output: ['old'], error: undefined },
    };
    const s = scratchpadReducer(prev, { type: 'START_PRETEST' });
    expect(s.pretest.running).toBe(true);
    expect(s.pretest.output).toEqual([]);
    expect(s.pretest.error).toBeUndefined();
  });

  it('PUSH_PRETEST_LINE appends one line', () => {
    const prev = { ...initialScratchpadState('cpp', ''), pretest: { running: true, input: '', output: ['a'], error: undefined } };
    const s = scratchpadReducer(prev, { type: 'PUSH_PRETEST_LINE', payload: 'b' });
    expect(s.pretest.output).toEqual(['a', 'b']);
  });

  it('END_PRETEST marks running=false', () => {
    const prev = { ...initialScratchpadState('cpp', ''), pretest: { running: true, input: '', output: ['x'], error: undefined } };
    const s = scratchpadReducer(prev, { type: 'END_PRETEST' });
    expect(s.pretest.running).toBe(false);
  });

  it('PRETEST_ERROR sets error and ends pretest', () => {
    const prev = { ...initialScratchpadState('cpp', ''), pretest: { running: true, input: '', output: [], error: undefined } };
    const s = scratchpadReducer(prev, { type: 'PRETEST_ERROR', payload: 'compile fail' });
    expect(s.pretest.running).toBe(false);
    expect(s.pretest.error).toBe('compile fail');
  });

  it('SUBMIT_START / SUBMIT_END toggles submitting', () => {
    let s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'SUBMIT_START' });
    expect(s.submitting).toBe(true);
    s = scratchpadReducer(s, { type: 'SUBMIT_END' });
    expect(s.submitting).toBe(false);
  });

  it('TOGGLE_PANEL flips the named panel visibility', () => {
    let s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'TOGGLE_PANEL', payload: 'pretest' });
    expect(s.showPretestPanel).toBe(false);
    s = scratchpadReducer(s, { type: 'TOGGLE_PANEL', payload: 'records' });
    expect(s.showRecordsPanel).toBe(true);
  });

  it('LOAD_RECORDS replaces records array', () => {
    const records = [{ _id: 'r1', status: 1, lang: 'cpp', time: 1 }];
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'LOAD_RECORDS', payload: records });
    expect(s.records).toEqual(records);
  });

  it('WS_STATUS updates wsStatus', () => {
    const s = scratchpadReducer(initialScratchpadState('cpp', ''), { type: 'WS_STATUS', payload: 'open' });
    expect(s.wsStatus).toBe('open');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/reducer.test.ts`
Expected: FAIL with "Cannot find module './reducer'".

- [ ] **Step 3: Implement types**

Create `packages/ui-next/src/components/scratchpad/types.ts`:

```ts
export interface ScratchpadRecord {
  _id: string;
  status: number;
  lang: string;
  time: number;
}

export interface PretestState {
  running: boolean;
  input: string;
  output: string[];
  error?: string;
}

export type WsStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface ScratchpadState {
  code: string;
  lang: string;
  pretest: PretestState;
  submitting: boolean;
  records: ScratchpadRecord[];
  showPretestPanel: boolean;
  showRecordsPanel: boolean;
  wsStatus: WsStatus;
}

export type ScratchpadAction =
  | { type: 'SET_CODE'; payload: string }
  | { type: 'SET_LANG'; payload: string }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'START_PRETEST' }
  | { type: 'PUSH_PRETEST_LINE'; payload: string }
  | { type: 'END_PRETEST' }
  | { type: 'PRETEST_ERROR'; payload: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }
  | { type: 'TOGGLE_PANEL'; payload: 'pretest' | 'records' }
  | { type: 'LOAD_RECORDS'; payload: ScratchpadRecord[] }
  | { type: 'WS_STATUS'; payload: WsStatus };

export interface WSMessage {
  type: string;
  payload?: unknown;
}
```

- [ ] **Step 4: Implement reducer**

Create `packages/ui-next/src/components/scratchpad/reducer.ts`:

```ts
import type { ScratchpadAction, ScratchpadState } from './types';

export function initialScratchpadState(initialLang: string, initialCode: string): ScratchpadState {
  return {
    code: initialCode,
    lang: initialLang,
    pretest: { running: false, input: '', output: [] },
    submitting: false,
    records: [],
    showPretestPanel: true,
    showRecordsPanel: false,
    wsStatus: 'idle',
  };
}

export function scratchpadReducer(state: ScratchpadState, action: ScratchpadAction): ScratchpadState {
  switch (action.type) {
    case 'SET_CODE':
      return { ...state, code: action.payload };
    case 'SET_LANG':
      return { ...state, lang: action.payload };
    case 'SET_INPUT':
      return { ...state, pretest: { ...state.pretest, input: action.payload } };
    case 'START_PRETEST':
      return {
        ...state,
        pretest: { running: true, input: state.pretest.input, output: [], error: undefined },
      };
    case 'PUSH_PRETEST_LINE':
      return {
        ...state,
        pretest: { ...state.pretest, output: [...state.pretest.output, action.payload] },
      };
    case 'END_PRETEST':
      return { ...state, pretest: { ...state.pretest, running: false } };
    case 'PRETEST_ERROR':
      return {
        ...state,
        pretest: { ...state.pretest, running: false, error: action.payload },
      };
    case 'SUBMIT_START':
      return { ...state, submitting: true };
    case 'SUBMIT_END':
      return { ...state, submitting: false };
    case 'TOGGLE_PANEL':
      return action.payload === 'pretest'
        ? { ...state, showPretestPanel: !state.showPretestPanel }
        : { ...state, showRecordsPanel: !state.showRecordsPanel };
    case 'LOAD_RECORDS':
      return { ...state, records: action.payload };
    case 'WS_STATUS':
      return { ...state, wsStatus: action.payload };
    default:
      return state;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/reducer.test.ts`
Expected: PASS, 11 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/types.ts \
        packages/ui-next/src/components/scratchpad/reducer.ts \
        packages/ui-next/src/components/scratchpad/reducer.test.ts
git commit -m "feat(ui-next): add scratchpad state types and reducer"
```

---

### Task 2: Scratchpad context and `useScratchpadState` hook

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadContext.ts`
- Create: `packages/ui-next/src/components/scratchpad/useScratchpadState.ts`
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadContext.test.tsx`

**Interfaces:**
- Produces: `ScratchpadProvider`, `useScratchpad()`.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/ScratchpadContext.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScratchpadProvider, useScratchpad } from './ScratchpadContext';

describe('useScratchpad', () => {
  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useScratchpad())).toThrow(/ScratchpadProvider/);
  });

  it('returns state and dispatch inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScratchpadProvider initialLang="cpp" initialCode="">
        {children}
      </ScratchpadProvider>
    );
    const { result } = renderHook(() => useScratchpad(), { wrapper });
    expect(result.current.state.lang).toBe('cpp');
    act(() => result.current.dispatch({ type: 'SET_CODE', payload: 'x' }));
    expect(result.current.state.code).toBe('x');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadContext.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement context and hook**

Create `packages/ui-next/src/components/scratchpad/ScratchpadContext.ts`:

```tsx
import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { ScratchpadAction, ScratchpadState } from './types';

export interface ScratchpadContextValue {
  state: ScratchpadState;
  dispatch: Dispatch<ScratchpadAction>;
}

export const ScratchpadContext = createContext<ScratchpadContextValue | null>(null);

export function useScratchpad(): ScratchpadContextValue {
  const ctx = useContext(ScratchpadContext);
  if (!ctx) throw new Error('useScratchpad must be used inside <ScratchpadProvider>');
  return ctx;
}
```

Create `packages/ui-next/src/components/scratchpad/useScratchpadState.ts`:

```tsx
import { useMemo, useReducer } from 'react';
import type { PropsWithChildren } from 'react';
import { ScratchpadContext } from './ScratchpadContext';
import type { ScratchpadContextValue } from './ScratchpadContext';
import { initialScratchpadState, scratchpadReducer } from './reducer';

export interface ScratchpadProviderProps {
  initialLang: string;
  initialCode: string;
}

export function ScratchpadProvider({
  initialLang,
  initialCode,
  children,
}: PropsWithChildren<ScratchpadProviderProps>) {
  const [state, dispatch] = useReducer(
    scratchpadReducer,
    undefined,
    () => initialScratchpadState(initialLang, initialCode),
  );
  const value = useMemo<ScratchpadContextValue>(() => ({ state, dispatch }), [state]);
  return <ScratchpadContext.Provider value={value}>{children}</ScratchpadContext.Provider>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadContext.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/ScratchpadContext.ts \
        packages/ui-next/src/components/scratchpad/useScratchpadState.ts \
        packages/ui-next/src/components/scratchpad/ScratchpadContext.test.tsx
git commit -m "feat(ui-next): add scratchpad context and provider hook"
```

---

### Task 3: Add new i18n keys

**Files:**
- Modify: `packages/ui-next/src/lib/i18n.ts:108-125` (zh) and `:572-590` (en)

**Interfaces:**
- Produces: new keys `Scratchpad.RunPretest`, `SubmitSolution`, `Exit`, `Pretest`, `Records`, `PretestInput`, `PretestOutput`, `NoRecords`, `CopyOutput`, `ClearOutput`, `UnsavedConfirm`, `ReconnectFailed`, `LangUnsupported`, `WsDisconnected`, `LoadFailed`.

- [ ] **Step 1: Read existing i18n structure**

Run: `grep -n "Scratchpad\\." packages/ui-next/src/lib/i18n.ts`
Expected: see existing 5 keys (`OpenButton`, `CloseButton`, `Title`, `ComingSoon`, `RegionLabel`) in both zh (~115) and en (~579) blocks.

- [ ] **Step 2: Add zh keys (alphabetical)**

In `packages/ui-next/src/lib/i18n.ts`, in the zh block (search for `'Scratchpad.OpenButton': '打开草稿本',` at ~115), insert the following lines after `'Scratchpad.ComingSoon'` and before `'Scratchpad.RegionLabel'` to keep alphabetical order:

```ts
  'Scratchpad.ClearOutput': '清空输出',
  'Scratchpad.CopyOutput': '复制输出',
  'Scratchpad.Exit': '退出',
  'Scratchpad.LangUnsupported': '当前语言不支持预测试',
  'Scratchpad.LoadFailed': '加载失败,请重试',
  'Scratchpad.NoRecords': '暂无提交记录',
  'Scratchpad.Pretest': '预测试',
  'Scratchpad.PretestInput': '输入',
  'Scratchpad.PretestOutput': '输出',
  'Scratchpad.ReconnectFailed': '预测试连接已断开,请刷新页面',
  'Scratchpad.Records': '提交记录',
  'Scratchpad.RunPretest': '运行预测试',
  'Scratchpad.SubmitSolution': '提交',
  'Scratchpad.UnsavedConfirm': '当前编辑的代码尚未提交,确定退出吗?',
  'Scratchpad.WsDisconnected': '预测试连接已断开,正在重连…',
```

- [ ] **Step 3: Add en keys (alphabetical)**

In the en block (search for `'Scratchpad.OpenButton': 'Open Scratchpad',` at ~579), insert after `'Scratchpad.ComingSoon'` and before `'Scratchpad.RegionLabel'`:

```ts
  'Scratchpad.ClearOutput': 'Clear output',
  'Scratchpad.CopyOutput': 'Copy output',
  'Scratchpad.Exit': 'Exit',
  'Scratchpad.LangUnsupported': 'Current language does not support pretest',
  'Scratchpad.LoadFailed': 'Failed to load, please retry',
  'Scratchpad.NoRecords': 'No submissions yet',
  'Scratchpad.Pretest': 'Pretest',
  'Scratchpad.PretestInput': 'Input',
  'Scratchpad.PretestOutput': 'Output',
  'Scratchpad.ReconnectFailed': 'Pretest connection lost, please refresh',
  'Scratchpad.Records': 'Records',
  'Scratchpad.RunPretest': 'Run Pretest',
  'Scratchpad.SubmitSolution': 'Submit',
  'Scratchpad.UnsavedConfirm': 'You have unsaved changes. Exit anyway?',
  'Scratchpad.WsDisconnected': 'Pretest connection lost, reconnecting…',
```

- [ ] **Step 4: Run linter to confirm alphabetical order**

Run: `cd packages/ui-next && yarn lint --quiet 2>&1 | grep -i "i18n\|sort" || true`
Expected: no sort-related errors. (i18n sort is enforced by hand; double-check by reading the diff.)

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): add scratchpad i18n keys (zh/en)"
```

---

### Task 4: Upgrade MonacoEditor to support real Monaco

**Files:**
- Modify: `packages/ui-next/src/components/problem/MonacoEditor.tsx`

**Interfaces:**
- Produces: `MonacoEditor` with optional `useMonaco?: boolean` prop. When `useMonaco` is true and `@monaco-editor/react` is available, render `<Editor>`; otherwise the existing textarea fallback.

- [ ] **Step 1: Read the current MonacoEditor.tsx file**

Run: `cat packages/ui-next/src/components/problem/MonacoEditor.tsx | head -50`
Expected: see existing `MonacoEditorProps` interface and `MonacoEditor` function (textarea fallback).

- [ ] **Step 2: Add `useMonaco` prop**

Edit `packages/ui-next/src/components/problem/MonacoEditor.tsx`. Replace the `MonacoEditorProps` interface declaration and the `MonacoEditor` function signature with:

```tsx
import type { ChangeEvent } from 'react';
import { useCallback } from 'react';
import Editor from '@monaco-editor/react';

export interface MonacoEditorProps {
  value: string;
  onChange?: (next: string) => void;
  language?: string;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  rows?: number;
  'aria-label'?: string;
  name?: string;
  id?: string;
  /**
   * When true, render real Monaco via @monaco-editor/react. Default false
   * (textarea fallback) — only the scratchpad passes useMonaco to opt into
   * the heavier editor; problem_submit keeps the lightweight textarea.
   */
  useMonaco?: boolean;
}

export function MonacoEditor({
  value,
  onChange,
  language,
  readOnly = false,
  placeholder,
  className,
  rows = 18,
  'aria-label': ariaLabel,
  name,
  id,
  useMonaco = false,
}: MonacoEditorProps) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value),
    [onChange],
  );

  if (useMonaco) {
    return (
      <Editor
        value={value}
        language={language || 'plaintext'}
        theme="vs"
        onChange={(v) => onChange?.(v ?? '')}
        options={{ readOnly, fontFamily: 'var(--font-mono)', minimap: { enabled: false } }}
        height="100%"
        className={className}
        loading={<div style={{ padding: 'var(--space-4)', color: 'var(--text-mute)' }}>Loading editor…</div>}
      />
    );
  }

  const cls = [
    language ? `language-${language}` : '',
    'hydro-monaco-fallback',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <textarea
      id={id}
      name={name}
      aria-label={ariaLabel}
      className={cls}
      data-monaco-fallback="true"
      data-language={language ?? ''}
      spellCheck={false}
      value={value}
      onChange={handleChange}
      readOnly={readOnly}
      placeholder={placeholder}
      rows={rows}
      wrap="off"
      style={{
        width: '100%',
        minHeight: '320px',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        lineHeight: 'var(--leading-normal)',
        resize: 'vertical',
        whiteSpace: 'pre',
      }}
    />
  );
}
```

- [ ] **Step 3: Run existing MonacoEditor tests to confirm no regression**

Run: `cd packages/ui-next && yarn vitest run src/components/problem/MonacoEditor.test.tsx`
Expected: PASS (textarea fallback path unchanged when `useMonaco` is omitted).

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/components/problem/MonacoEditor.tsx
git commit -m "feat(ui-next): add useMonaco opt-in to MonacoEditor"
```

---

### Task 5: `useScratchpadPersistence` (IndexedDB load/save)

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/useScratchpadPersistence.ts`
- Create: `packages/ui-next/src/components/scratchpad/useScratchpadPersistence.test.tsx`

**Interfaces:**
- Produces: `useScratchpadPersistence({ problemKey, code })` — returns nothing; on unmount or `code` change writes to IndexedDB after 800ms debounce. On mount, calls `onLoaded(draft)` once with persisted draft if any.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/useScratchpadPersistence.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScratchpadPersistence } from './useScratchpadPersistence';

// Lightweight fake-idb so we don't need to install the real package in tests.
const stores = new Map<string, Map<string, string>>();
vi.mock('idb-keyval', () => ({
  get: (k: string) => Promise.resolve(stores.get('hydro')?.get(k)),
  set: (k: string, v: string) => {
    if (!stores.has('hydro')) stores.set('hydro', new Map());
    stores.get('hydro')!.set(k, v);
    return Promise.resolve();
  },
}));

describe('useScratchpadPersistence', () => {
  it('writes code to idb after debounce', async () => {
    stores.clear();
    const { rerender } = renderHook(
      ({ code }: { code: string }) => useScratchpadPersistence({ problemKey: 'k1', code, onLoaded: () => {} }),
      { initialProps: { code: 'int main(){}' } },
    );
    rerender({ code: 'int main(){return 0;}' });
    await waitFor(() => {
      expect(stores.get('hydro')?.get('k1')).toBe('int main(){return 0;}');
    }, { timeout: 1500 });
  });

  it('invokes onLoaded with persisted draft', async () => {
    stores.set('hydro', new Map([['k2', 'persisted']]));
    const onLoaded = vi.fn();
    renderHook(() => useScratchpadPersistence({ problemKey: 'k2', code: '', onLoaded }));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith('persisted'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/useScratchpadPersistence.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Install idb-keyval dev dependency**

Run: `cd packages/ui-next && yarn add -D idb-keyval`
Expected: package.json updates with idb-keyval.

- [ ] **Step 4: Implement hook**

Create `packages/ui-next/src/components/scratchpad/useScratchpadPersistence.ts`:

```ts
import { useEffect, useRef } from 'react';
import { get, set } from 'idb-keyval';

export interface UseScratchpadPersistenceArgs {
  problemKey: string;
  code: string;
  onLoaded: (draft: string) => void;
}

export function useScratchpadPersistence({ problemKey, code, onLoaded }: UseScratchpadPersistenceArgs) {
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    get(problemKey).then((value) => {
      if (cancelled) return;
      if (typeof value === 'string') onLoadedRef.current(value);
    });
    return () => {
      cancelled = true;
    };
  }, [problemKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void set(problemKey, code);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [problemKey, code]);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/useScratchpadPersistence.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/useScratchpadPersistence.ts \
        packages/ui-next/src/components/scratchpad/useScratchpadPersistence.test.tsx \
        packages/ui-next/package.json \
        yarn.lock
git commit -m "feat(ui-next): add scratchpad IndexedDB persistence hook"
```

---

### Task 6: `usePretestSession` WebSocket hook

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/usePretestSession.ts`
- Create: `packages/ui-next/src/components/scratchpad/usePretestSession.test.tsx`

**Interfaces:**
- Produces: `usePretestSession({ url, enabled, dispatch, rid })` — opens a WebSocket when `enabled && rid`, parses `{type, payload}` messages, dispatches `PUSH_PRETEST_LINE` / `END_PRETEST` / `PRETEST_ERROR` / `WS_STATUS`. Auto-reconnects with exponential backoff (3s, 6s, 12s) on close.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/usePretestSession.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePretestSession } from './usePretestSession';

class MockWS {
  static instances: MockWS[] = [];
  url: string;
  readyState = 0;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  sent: string[] = [];
  constructor(url: string) {
    this.url = url;
    MockWS.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }
  fakeOpen() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }
  fakeMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

beforeEach(() => {
  MockWS.instances = [];
  (globalThis as unknown as { WebSocket: typeof MockWS }).WebSocket = MockWS as unknown as typeof WebSocket;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('usePretestSession', () => {
  it('opens WebSocket and dispatches status open', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: true, rid: 'r1', dispatch }));
    expect(MockWS.instances).toHaveLength(1);
    expect(MockWS.instances[0].url).toBe('ws://x');
    act(() => MockWS.instances[0].fakeOpen());
    expect(dispatch).toHaveBeenCalledWith({ type: 'WS_STATUS', payload: 'open' });
  });

  it('dispatches PUSH_PRETEST_LINE for pretest message', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: true, rid: 'r1', dispatch }));
    act(() => MockWS.instances[0].fakeOpen());
    act(() => MockWS.instances[0].fakeMessage({ type: 'pretest', payload: { data: 'hello' } }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'PUSH_PRETEST_LINE', payload: 'hello' });
  });

  it('dispatches END_PRETEST on done', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: true, rid: 'r1', dispatch }));
    act(() => MockWS.instances[0].fakeOpen());
    act(() => MockWS.instances[0].fakeMessage({ type: 'done' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'END_PRETEST' });
  });

  it('skips connection when disabled', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: false, rid: 'r1', dispatch }));
    expect(MockWS.instances).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/usePretestSession.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement hook**

Create `packages/ui-next/src/components/scratchpad/usePretestSession.ts`:

```ts
import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { ScratchpadAction, WSMessage } from './types';

export interface UsePretestSessionArgs {
  url: string;
  enabled: boolean;
  rid: string | null;
  dispatch: Dispatch<ScratchpadAction>;
}

const BACKOFF_MS = [3000, 6000, 12000];

export function usePretestSession({ url, enabled, rid, dispatch }: UsePretestSessionArgs) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabledRef.current || !rid) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;
      dispatch({ type: 'WS_STATUS', payload: 'connecting' });
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        retriesRef.current = 0;
        dispatch({ type: 'WS_STATUS', payload: 'open' });
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WSMessage;
          switch (msg.type) {
            case 'pretest':
              dispatch({ type: 'PUSH_PRETEST_LINE', payload: String((msg.payload as { data?: unknown })?.data ?? '') });
              break;
            case 'compile-info':
            case 'compiler-error':
              dispatch({ type: 'PRETEST_ERROR', payload: String((msg.payload as { text?: unknown })?.text ?? msg.type) });
              break;
            case 'done':
            case 'record':
              dispatch({ type: 'END_PRETEST' });
              break;
            default:
              break;
          }
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        dispatch({ type: 'WS_STATUS', payload: 'closed' });
        if (cancelled) return;
        if (retriesRef.current >= BACKOFF_MS.length) {
          dispatch({ type: 'WS_STATUS', payload: 'error' });
          return;
        }
        const delay = BACKOFF_MS[retriesRef.current++];
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
      ws.onerror = () => {
        dispatch({ type: 'WS_STATUS', payload: 'error' });
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [url, rid, dispatch]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/usePretestSession.test.tsx`
Expected: PASS, 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/usePretestSession.ts \
        packages/ui-next/src/components/scratchpad/usePretestSession.test.tsx
git commit -m "feat(ui-next): add pretest WebSocket session hook"
```

---

### Task 7: PretestPanel component

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/PretestPanel.tsx`
- Create: `packages/ui-next/src/components/scratchpad/PretestPanel.test.tsx`

**Interfaces:**
- Produces: `<PretestPanel />` — renders pretest `<input>`, output `<pre>`, copy + clear buttons; reads/writes via `useScratchpad()`.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/PretestPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScratchpadProvider } from './useScratchpadState';
import { PretestPanel } from './PretestPanel';

function wrap(ui: React.ReactNode) {
  return render(<ScratchpadProvider initialLang="cpp" initialCode="">{ui}</ScratchpadProvider>);
}

describe('PretestPanel', () => {
  it('renders input box and empty output initially', () => {
    wrap(<PretestPanel />);
    expect(screen.getByLabelText(/input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/output/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/output/i).textContent).toBe('');
  });

  it('exposes copy and clear buttons', () => {
    wrap(<PretestPanel />);
    expect(screen.getByRole('button', { name: /copy output/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear output/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/PretestPanel.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement PretestPanel**

Create `packages/ui-next/src/components/scratchpad/PretestPanel.tsx`:

```tsx
import { useScratchpad } from './ScratchpadContext';
import { useTranslate } from '../../lib/i18n';

export function PretestPanel() {
  const { state, dispatch } = useScratchpad();
  const t = useTranslate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-mute)' }}>{t('Scratchpad.PretestInput')}</span>
        <textarea
          aria-label={t('Scratchpad.PretestInput')}
          value={state.pretest.input}
          onChange={(e) => dispatch({ type: 'SET_INPUT', payload: e.target.value })}
          rows={3}
          spellCheck={false}
          wrap="off"
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            color: 'var(--text)',
            whiteSpace: 'pre',
          }}
        />
      </label>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-mute)' }}>
            {t('Scratchpad.PretestOutput')} {state.pretest.running ? '…' : ''}
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(state.pretest.output.join('\n'))}
              aria-label={t('Scratchpad.CopyOutput')}
              style={btnStyle}
            >
              {t('Scratchpad.CopyOutput')}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'START_PRETEST' })}
              aria-label={t('Scratchpad.ClearOutput')}
              style={btnStyle}
            >
              {t('Scratchpad.ClearOutput')}
            </button>
          </div>
        </div>
        <pre
          aria-label={t('Scratchpad.PretestOutput')}
          data-pretest-output
          style={{
            minHeight: 120,
            maxHeight: 240,
            overflow: 'auto',
            margin: 0,
            padding: 'var(--space-2)',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {state.pretest.error ? state.pretest.error : state.pretest.output.join('\n')}
        </pre>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-soft)',
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-xs)',
  cursor: 'pointer',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/PretestPanel.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/PretestPanel.tsx \
        packages/ui-next/src/components/scratchpad/PretestPanel.test.tsx
git commit -m "feat(ui-next): add PretestPanel component"
```

---

### Task 8: RecordsPanel component

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/RecordsPanel.tsx`
- Create: `packages/ui-next/src/components/scratchpad/RecordsPanel.test.tsx`
- Create: `packages/ui-next/src/components/scratchpad/status.ts`

**Interfaces:**
- Produces: `<RecordsPanel submissionsUrl />` — fetches once on mount, renders list with status badge / lang / link to record. Empty state uses `Scratchpad.NoRecords`.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/RecordsPanel.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordsPanel } from './RecordsPanel';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('RecordsPanel', () => {
  it('shows empty state when fetch returns no records', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ rdocs: [] }),
    });
    render(<RecordsPanel submissionsUrl="/r" />);
    await waitFor(() => expect(screen.getByText(/no submissions/i)).toBeInTheDocument());
  });

  it('renders up to 5 records with link to record detail', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        rdocs: [
          { _id: 'r1', status: 1, lang: 'cpp', time: 1700000000 },
          { _id: 'r2', status: 2, lang: 'py', time: 1700000001 },
        ],
      }),
    });
    render(<RecordsPanel submissionsUrl="/r" />);
    await waitFor(() => {
      expect(screen.getByText('r1')).toBeInTheDocument();
      expect(screen.getByText('r2')).toBeInTheDocument();
    });
    expect((screen.getByText('r1').closest('a') as HTMLAnchorElement).href).toContain('/record/r1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/RecordsPanel.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement RecordsPanel**

Create `packages/ui-next/src/components/scratchpad/RecordsPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Link } from '../link';
import { useTranslate } from '../../lib/i18n';
import { statusText } from './status';

export interface RecordRow {
  _id: string;
  status: number;
  lang: string;
  time: number;
}

export function RecordsPanel({ submissionsUrl }: { submissionsUrl: string }) {
  const t = useTranslate();
  const [records, setRecords] = useState<RecordRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(submissionsUrl)
      .then((res) => res.json())
      .then((data: { rdocs?: RecordRow[] }) => {
        if (!cancelled) setRecords((data.rdocs ?? []).slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionsUrl]);

  if (records === null) {
    return <p style={{ color: 'var(--text-mute)' }}>…</p>;
  }
  if (records.length === 0) {
    return <p style={{ color: 'var(--text-mute)' }}>{t('Scratchpad.NoRecords')}</p>;
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {records.map((r) => (
        <li key={r._id}>
          <Link to="record_detail" params={{ rid: r._id }} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span aria-label={statusText(r.status)} data-status={r.status} style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)' }} />
            <span style={{ flex: 1, fontFamily: 'var(--font-mono)' }}>{r._id}</span>
            <span style={{ color: 'var(--text-mute)' }}>{r.lang}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Add statusText helper**

Create `packages/ui-next/src/components/scratchpad/status.ts`:

```ts
const NAMES: Record<number, string> = {
  1: 'Accepted',
  2: 'Wrong Answer',
  3: 'Time Limit Exceeded',
  4: 'Memory Limit Exceeded',
  5: 'Runtime Error',
  6: 'Compile Error',
  7: 'System Error',
  8: 'Output Limit Exceeded',
};

export function statusText(status: number): string {
  return NAMES[status] ?? `Status ${status}`;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/RecordsPanel.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/RecordsPanel.tsx \
        packages/ui-next/src/components/scratchpad/RecordsPanel.test.tsx \
        packages/ui-next/src/components/scratchpad/status.ts
git commit -m "feat(ui-next): add RecordsPanel component"
```

---

### Task 9: ScratchpadToolbar component

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadToolbar.tsx`
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadToolbar.test.tsx`

**Interfaces:**
- Produces: `<ScratchpadToolbar postSubmitUrl pretestConnUrl getSubmissionsUrl problemId pdoc tdoc UserContext onExit setRid />` — Run Pretest (F9), Submit (F10), Exit (Alt+Q), language select, panel toggles. The `setRid` callback is invoked after a successful pretest submission so that the parent (`ScratchpadEditorPane`) can open the WebSocket connection.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/ScratchpadToolbar.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScratchpadProvider } from './useScratchpadState';
import { ScratchpadToolbar } from './ScratchpadToolbar';

const baseArgs = {
  postSubmitUrl: '/submit',
  pretestConnUrl: 'ws://x',
  getSubmissionsUrl: '/r',
  problemId: 1,
  pdoc: { config: { type: 'default', langs: ['cpp', 'py'] } },
  tdoc: undefined,
  UserContext: { _id: 1 },
  onExit: vi.fn(),
  setRid: vi.fn(),
};

function wrap(ui: React.ReactNode) {
  return render(<ScratchpadProvider initialLang="cpp" initialCode="">{ui}</ScratchpadProvider>);
}

describe('ScratchpadToolbar', () => {
  it('renders Run Pretest, Submit, and Exit buttons', () => {
    wrap(<ScratchpadToolbar {...baseArgs} />);
    expect(screen.getByRole('button', { name: /run pretest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
  });

  it('calls onExit when exit button clicked', () => {
    const onExit = vi.fn();
    wrap(<ScratchpadToolbar {...baseArgs} onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: /exit/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadToolbar.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement ScratchpadToolbar**

Create `packages/ui-next/src/components/scratchpad/ScratchpadToolbar.tsx`:

```tsx
import { useScratchpad } from './ScratchpadContext';
import { useTranslate } from '../../lib/i18n';
import type { Dispatch, SetStateAction } from 'react';

interface PdocMinimal {
  config?: { type?: string; langs?: string[] } | string;
}

export interface ScratchpadToolbarProps {
  postSubmitUrl: string;
  pretestConnUrl: string;
  getSubmissionsUrl: string;
  problemId: number;
  pdoc: PdocMinimal;
  tdoc?: { docId?: string };
  UserContext: { _id?: number };
  onExit: () => void;
  /**
   * Called with the new rid returned by the pretest POST so the parent
   * (`ScratchpadEditorPane`) can open the WebSocket session.
   */
  setRid: Dispatch<SetStateAction<string | null>>;
}

export function ScratchpadToolbar({
  postSubmitUrl,
  pretestConnUrl: _pretestConnUrl,
  getSubmissionsUrl: _getSubmissionsUrl,
  pdoc,
  onExit,
  setRid,
}: ScratchpadToolbarProps) {
  const { state, dispatch } = useScratchpad();
  const t = useTranslate();

  const langs = (typeof pdoc.config === 'object' && pdoc.config?.langs) || ['cpp'];
  const canPretest = typeof pdoc.config === 'object' && pdoc.config?.type === 'default';

  async function runPretest() {
    dispatch({ type: 'START_PRETEST' });
    try {
      const res = await fetch(postSubmitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: state.lang, code: state.code, input: [state.pretest.input], pretest: true }),
      });
      const data = await res.json();
      setRid(data.rid ?? null);
    } catch (e) {
      dispatch({ type: 'PRETEST_ERROR', payload: String((e as Error).message) });
    }
  }

  async function submit() {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const res = await fetch(postSubmitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: state.lang, code: state.code }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      dispatch({ type: 'SUBMIT_END' });
      alert((e as Error).message); // replaced by toast in follow-up
    }
  }

  return (
    <div role="toolbar" aria-label="Scratchpad toolbar" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface-elev)' }}>
      {canPretest && (
        <button type="button" data-hotkey="f9" onClick={runPretest} disabled={state.pretest.running || state.submitting} style={btnStyle}>
          {t('Scratchpad.RunPretest')} (F9)
        </button>
      )}
      <button type="button" data-hotkey="f10" onClick={submit} disabled={state.submitting} style={btnStyle}>
        {t('Scratchpad.SubmitSolution')} (F10)
      </button>
      <button type="button" data-hotkey="alt+q" onClick={onExit} style={btnStyle}>
        {t('Scratchpad.Exit')} (Alt+Q)
      </button>
      <span style={{ flex: 1 }} />
      <button type="button" data-hotkey="alt+p" onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'pretest' })} style={btnStyle}>
        {t('Scratchpad.Pretest')} (Alt+P)
      </button>
      <button type="button" data-hotkey="alt+r" onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'records' })} style={btnStyle}>
        {t('Scratchpad.Records')} (Alt+R)
      </button>
      <select
        aria-label="Language"
        value={state.lang}
        onChange={(e) => dispatch({ type: 'SET_LANG', payload: e.target.value })}
        style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)' }}
      >
        {langs.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-soft)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-xs)',
  cursor: 'pointer',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadToolbar.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/ScratchpadToolbar.tsx \
        packages/ui-next/src/components/scratchpad/ScratchpadToolbar.test.tsx
git commit -m "feat(ui-next): add ScratchpadToolbar component"
```

---

### Task 10: `useScratchpadHotkeys` hook

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/useScratchpadHotkeys.ts`
- Create: `packages/ui-next/src/components/scratchpad/useScratchpadHotkeys.test.tsx`

**Interfaces:**
- Produces: `useScratchpadHotkeys({ onRunPretest, onSubmit, onExit, onTogglePretest, onToggleRecords, canPretest })` — global window keydown listener.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/useScratchpadHotkeys.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScratchpadHotkeys } from './useScratchpadHotkeys';

describe('useScratchpadHotkeys', () => {
  function press(key: string, opts: KeyboardEventInit = {}) {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
    });
  }

  it('F9 triggers onRunPretest when canPretest', () => {
    const onRunPretest = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest, onSubmit: vi.fn(), onExit: vi.fn(), onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: true }));
    press('F9');
    expect(onRunPretest).toHaveBeenCalledOnce();
  });

  it('F10 triggers onSubmit', () => {
    const onSubmit = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest: vi.fn(), onSubmit, onExit: vi.fn(), onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: false }));
    press('F10');
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('Alt+Q triggers onExit', () => {
    const onExit = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest: vi.fn(), onSubmit: vi.fn(), onExit, onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: false }));
    press('q', { altKey: true });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('does not fire F9 when canPretest=false', () => {
    const onRunPretest = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest, onSubmit: vi.fn(), onExit: vi.fn(), onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: false }));
    press('F9');
    expect(onRunPretest).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/useScratchpadHotkeys.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement hook**

Create `packages/ui-next/src/components/scratchpad/useScratchpadHotkeys.ts`:

```ts
import { useEffect } from 'react';

export interface ScratchpadHotkeys {
  onRunPretest: () => void;
  onSubmit: () => void;
  onExit: () => void;
  onTogglePretest: () => void;
  onToggleRecords: () => void;
  canPretest: boolean;
}

export function useScratchpadHotkeys({ onRunPretest, onSubmit, onExit, onTogglePretest, onToggleRecords, canPretest }: ScratchpadHotkeys) {
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.altKey && (ev.key === 'q' || ev.key === 'Q')) {
        ev.preventDefault();
        onExit();
        return;
      }
      if (ev.altKey && (ev.key === 'p' || ev.key === 'P')) {
        ev.preventDefault();
        onTogglePretest();
        return;
      }
      if (ev.altKey && (ev.key === 'r' || ev.key === 'R')) {
        ev.preventDefault();
        onToggleRecords();
        return;
      }
      if (ev.key === 'F9' && canPretest) {
        ev.preventDefault();
        onRunPretest();
        return;
      }
      if (ev.key === 'F10') {
        ev.preventDefault();
        onSubmit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRunPretest, onSubmit, onExit, onTogglePretest, onToggleRecords, canPretest]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/useScratchpadHotkeys.test.tsx`
Expected: PASS, 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/useScratchpadHotkeys.ts \
        packages/ui-next/src/components/scratchpad/useScratchpadHotkeys.test.tsx
git commit -m "feat(ui-next): add scratchpad global hotkey hook"
```

---

### Task 11: ScratchpadProblemPane

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.tsx`
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.test.tsx`

**Interfaces:**
- Produces: `<ScratchpadProblemPane pdoc contentText contentLangs preferredLang mode />` — reuses the read-only problem content (langTabs + ProblemContent + Article).

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScratchpadProblemPane } from './ScratchpadProblemPane';

describe('ScratchpadProblemPane', () => {
  it('renders title and content', () => {
    render(
      <ScratchpadProblemPane
        pdoc={{ docId: 1, title: 'Two Sum' }}
        contentText="Given an array..."
        contentLangs={['en']}
        preferredLang="en"
        mode="normal"
      />,
    );
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('Given an array...')).toBeInTheDocument();
  });

  it('renders language tabs when multiple langs', () => {
    render(
      <ScratchpadProblemPane
        pdoc={{ docId: 1, title: 'T', pid: 'p1' }}
        contentText="body"
        contentLangs={['en', 'zh_CN']}
        preferredLang="en"
        mode="normal"
      />,
    );
    expect(screen.getByRole('link', { name: 'en' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'zh_CN' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadProblemPane.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement ScratchpadProblemPane**

Create `packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.tsx`:

```tsx
import { Article } from '../article/Article';
import { Link } from '../link';
import { Alert } from '../primitives';
import { useTranslate } from '../../lib/i18n';

interface PdocMinimal {
  docId: number;
  pid?: string;
  title: string;
  config?: { type?: string; langs?: string[] } | string;
  data?: unknown[];
  reference?: { domainId: string, pid: string | number };
}

export interface ScratchpadProblemPaneProps {
  pdoc: PdocMinimal;
  contentText: string;
  contentLangs: string[];
  preferredLang: string;
  mode: 'normal' | 'contest' | 'view' | 'correction';
}

export function ScratchpadProblemPane({ pdoc, contentText, contentLangs, preferredLang, mode }: ScratchpadProblemPaneProps) {
  const t = useTranslate();
  const cfg = typeof pdoc.config === 'object' ? pdoc.config : null;
  const noData = !pdoc.data || (Array.isArray(pdoc.data) && pdoc.data.length === 0);
  const configError = typeof pdoc.config === 'string';

  return (
    <aside aria-label="Problem statement" style={{ padding: 'var(--space-4)', overflow: 'auto', height: '100%' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: '0 0 var(--space-3)' }}>{pdoc.title}</h2>
      {contentLangs.length > 1 && (
        <div role="tablist" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {contentLangs.map((l) => (
            <Link
              key={l}
              to="problem_detail"
              params={{ pid: pdoc.pid ?? String(pdoc.docId) }}
              searchParams={l === preferredLang ? {} : { lang: l }}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                color: l === preferredLang ? 'var(--accent)' : 'var(--text-soft)',
                fontSize: 'var(--text-xs)',
              }}
            >
              {l}
            </Link>
          ))}
        </div>
      )}
      {noData && !pdoc.reference && (
        <Alert variant="warn" title={t('Problem.NoTestdata')} message={t('Problem.NoTestdataMessage')} />
      )}
      {configError && (
        <Alert variant="error" title={t('Problem.ConfigurationError')} message={String(pdoc.config)} />
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
      {cfg === null ? null : <Article content={contentText} />}
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadProblemPane.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.tsx \
        packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.test.tsx
git commit -m "feat(ui-next): add ScratchpadProblemPane (read-only left column)"
```

---

### Task 12: ScratchpadEditorPane

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.tsx`
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.test.tsx`
- Create: `packages/ui-next/src/components/scratchpad/Scratchpad.module.css`

**Interfaces:**
- Produces: `<ScratchpadEditorPane pdoc pretestConnUrl postSubmitUrl getSubmissionsUrl problemId tdoc UserContext onExit rid setRid />` — vertical stack: toolbar + Monaco editor + bottom panels. Receives `rid` from the parent and forwards `setRid` to the toolbar so a successful pretest POST can flow back up to the WebSocket session.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScratchpadProvider } from './useScratchpadState';
import { ScratchpadEditorPane } from './ScratchpadEditorPane';

function wrap(ui: React.ReactNode) {
  return render(<ScratchpadProvider initialLang="cpp" initialCode="">{ui}</ScratchpadProvider>);
}

describe('ScratchpadEditorPane', () => {
  it('renders toolbar', () => {
    wrap(
      <ScratchpadEditorPane
        pdoc={{ config: { type: 'default', langs: ['cpp'] } }}
        pretestConnUrl="ws://x"
        postSubmitUrl="/s"
        getSubmissionsUrl="/r"
        problemId={1}
        UserContext={{ _id: 1 }}
        onExit={() => {}}
        rid={null}
        setRid={() => {}}
      />,
    );
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('renders pretest panel by default', () => {
    wrap(
      <ScratchpadEditorPane
        pdoc={{ config: { type: 'default', langs: ['cpp'] } }}
        pretestConnUrl="ws://x"
        postSubmitUrl="/s"
        getSubmissionsUrl="/r"
        problemId={1}
        UserContext={{ _id: 1 }}
        onExit={() => {}}
        rid={null}
        setRid={() => {}}
      />,
    );
    expect(screen.getByLabelText(/input/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadEditorPane.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement ScratchpadEditorPane**

Create `packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.tsx`:

```tsx
import { useScratchpad } from './ScratchpadContext';
import { usePretestSession } from './usePretestSession';
import { MonacoEditor } from '../problem/MonacoEditor';
import { PretestPanel } from './PretestPanel';
import { RecordsPanel } from './RecordsPanel';
import { ScratchpadToolbar } from './ScratchpadToolbar';
import styles from './Scratchpad.module.css';

interface PdocMinimal {
  config?: { type?: string; langs?: string[] } | string;
}

export interface ScratchpadEditorPaneProps {
  pdoc: PdocMinimal;
  pretestConnUrl: string;
  postSubmitUrl: string;
  getSubmissionsUrl: string;
  problemId: number;
  tdoc?: { docId?: string };
  UserContext: { _id?: number };
  onExit: () => void;
  rid: string | null;
  setRid: (rid: string | null) => void;
}

export function ScratchpadEditorPane({
  pdoc,
  pretestConnUrl,
  postSubmitUrl,
  getSubmissionsUrl,
  problemId,
  tdoc,
  UserContext,
  onExit,
  rid,
  setRid,
}: ScratchpadEditorPaneProps) {
  const { state, dispatch } = useScratchpad();

  usePretestSession({ url: pretestConnUrl, enabled: !!rid, rid, dispatch });

  return (
    <section className={styles.editorPane} aria-label="Scratchpad editor pane">
      <ScratchpadToolbar
        postSubmitUrl={postSubmitUrl}
        pretestConnUrl={pretestConnUrl}
        getSubmissionsUrl={getSubmissionsUrl}
        problemId={problemId}
        pdoc={pdoc}
        tdoc={tdoc}
        UserContext={UserContext}
        onExit={onExit}
        setRid={setRid}
      />
      <div className={styles.editorSurface}>
        <MonacoEditor
          useMonaco
          value={state.code}
          onChange={(v) => dispatch({ type: 'SET_CODE', payload: v })}
          language={state.lang}
          aria-label="Code editor"
        />
      </div>
      {state.showPretestPanel && (
        <div className={styles.bottomPanel}>
          <PretestPanel />
        </div>
      )}
      {state.showRecordsPanel && (
        <div className={styles.bottomPanel}>
          <RecordsPanel submissionsUrl={getSubmissionsUrl} />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Create the CSS module**

Create `packages/ui-next/src/components/scratchpad/Scratchpad.module.css`:

```css
.layout {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(420px, 1.2fr);
  gap: 1px;
  background: var(--border);
  height: calc(100vh - 64px);
  overflow: hidden;
}

.problemPane {
  background: var(--surface);
  overflow: hidden;
}

.editorPane {
  background: var(--surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editorSurface {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.bottomPanel {
  border-top: 1px solid var(--border);
  background: var(--surface-elev);
  padding: var(--space-3);
  max-height: 40%;
  overflow: auto;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadEditorPane.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.tsx \
        packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.test.tsx \
        packages/ui-next/src/components/scratchpad/Scratchpad.module.css
git commit -m "feat(ui-next): add ScratchpadEditorPane and layout CSS"
```

---

### Task 13: ScratchpadPanel (top-level container)

**Files:**
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadPanel.tsx`
- Create: `packages/ui-next/src/components/scratchpad/ScratchpadPanel.test.tsx`

**Interfaces:**
- Produces: `<ScratchpadPanel pdoc tdoc UserContext pretestConnUrl postSubmitUrl getSubmissionsUrl contentText contentLangs preferredLang mode problemId onExit />` — mounts provider, mounts both panes, wires hotkeys, mounts persistence.

- [ ] **Step 1: Write the failing test**

Create `packages/ui-next/src/components/scratchpad/ScratchpadPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScratchpadPanel } from './ScratchpadPanel';

const baseArgs = {
  pdoc: { docId: 1, title: 'T', pid: 'p1', config: { type: 'default', langs: ['cpp'] }, content: { en: 'body' } },
  tdoc: undefined,
  UserContext: { _id: 1 },
  pretestConnUrl: 'ws://x',
  postSubmitUrl: '/s',
  getSubmissionsUrl: '/r',
  contentText: 'body',
  contentLangs: ['en'],
  preferredLang: 'en',
  mode: 'normal' as const,
  problemId: 1,
  onExit: vi.fn(),
};

describe('ScratchpadPanel', () => {
  it('renders both panes', () => {
    render(<ScratchpadPanel {...baseArgs} />);
    expect(screen.getByRole('region', { name: /problem statement/i })).toBeInTheDocument();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('Alt+Q triggers onExit when confirm is accepted', () => {
    const onExit = vi.fn();
    window.confirm = vi.fn(() => true);
    render(<ScratchpadPanel {...baseArgs} onExit={onExit} />);
    fireEvent.keyDown(window, { key: 'q', altKey: true });
    expect(onExit).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadPanel.test.tsx`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement ScratchpadPanel**

Create `packages/ui-next/src/components/scratchpad/ScratchpadPanel.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import { useScratchpad } from './ScratchpadContext';
import { ScratchpadEditorPane } from './ScratchpadEditorPane';
import { ScratchpadProblemPane } from './ScratchpadProblemPane';
import { ScratchpadProvider } from './useScratchpadState';
import { useScratchpadHotkeys } from './useScratchpadHotkeys';
import { useScratchpadPersistence } from './useScratchpadPersistence';
import styles from './Scratchpad.module.css';

interface PdocMinimal {
  docId: number;
  pid?: string;
  title: string;
  content?: string | Record<string, string>;
  config?: { type?: string; langs?: string[] } | string;
  data?: unknown[];
  reference?: { domainId: string, pid: string | number };
}

export interface ScratchpadPanelProps {
  pdoc: PdocMinimal;
  tdoc?: { docId?: string; rule?: string };
  UserContext: { _id?: number; codeTemplate?: string; codeLang?: string };
  pretestConnUrl: string;
  postSubmitUrl: string;
  getSubmissionsUrl: string;
  contentText: string;
  contentLangs: string[];
  preferredLang: string;
  mode: 'normal' | 'contest' | 'view' | 'correction';
  problemId: number;
  onExit: () => void;
}

export function ScratchpadPanel(props: ScratchpadPanelProps) {
  const t = useTranslate();
  const initialLang = (props.UserContext.codeLang ?? '').split('.')[0] || 'cpp';
  const initialCode = props.UserContext.codeTemplate ?? '';
  const [rid, setRid] = useState<string | null>(null);
  const problemKey = useMemo(
    () => `${props.UserContext._id ?? 0}/scratchpad/${props.problemId}`,
    [props.UserContext._id, props.problemId],
  );

  function handleExit() {
    if (window.confirm(t('Scratchpad.UnsavedConfirm'))) props.onExit();
  }

  return (
    <ScratchpadProvider initialLang={initialLang} initialCode={initialCode}>
      <PersistenceInner problemKey={problemKey} />
      <HotkeyInner onExit={handleExit} />
      <div className={styles.layout}>
        <div className={styles.problemPane}>
          <ScratchpadProblemPane
            pdoc={props.pdoc}
            contentText={props.contentText}
            contentLangs={props.contentLangs}
            preferredLang={props.preferredLang}
            mode={props.mode}
          />
        </div>
        <ScratchpadEditorPane
          pdoc={props.pdoc}
          pretestConnUrl={props.pretestConnUrl}
          postSubmitUrl={props.postSubmitUrl}
          getSubmissionsUrl={props.getSubmissionsUrl}
          problemId={props.problemId}
          tdoc={props.tdoc}
          UserContext={props.UserContext}
          onExit={handleExit}
          rid={rid}
          setRid={setRid}
        />
      </div>
    </ScratchpadProvider>
  );
}

function PersistenceInner({ problemKey }: { problemKey: string }) {
  const { state, dispatch } = useScratchpad();
  useScratchpadPersistence({
    problemKey,
    code: state.code,
    onLoaded: (draft) => dispatch({ type: 'SET_CODE', payload: draft }),
  });
  return null;
}

function HotkeyInner({ onExit }: { onExit: () => void }) {
  const { dispatch } = useScratchpad();
  useScratchpadHotkeys({
    onRunPretest: () => undefined,
    onSubmit: () => undefined,
    onExit,
    onTogglePretest: () => dispatch({ type: 'TOGGLE_PANEL', payload: 'pretest' }),
    onToggleRecords: () => dispatch({ type: 'TOGGLE_PANEL', payload: 'records' }),
    canPretest: true,
  });
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/ui-next && yarn vitest run src/components/scratchpad/ScratchpadPanel.test.tsx`
Expected: PASS, 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/scratchpad/ScratchpadPanel.tsx \
        packages/ui-next/src/components/scratchpad/ScratchpadPanel.test.tsx
git commit -m "feat(ui-next): add ScratchpadPanel top-level container"
```

---

### Task 14: Wire scratchpad menu item into ProblemSidebar

**Files:**
- Modify: `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx:142-151`
- Modify: `packages/ui-next/src/lib/i18n.ts` (add `Problem.OpenScratchpad`)

- [ ] **Step 1: Read the existing menu construction**

Run: `sed -n '140,170p' packages/ui-next/src/components/sidebar/ProblemSidebar.tsx`
Expected: see items.push({ key: 'statistics', ... }) and the post-statistics editable block.

- [ ] **Step 2: Append scratchpad menu item**

After the `statistics` push (around line 151), insert:

```tsx
  items.push({
    key: 'scratchpad',
    title: t('Problem.OpenScratchpad') ?? '进入在线编程模式',
    href: buildUrl('problem_detail',
      { pid: String(pdoc.docId) },
      { ...getTidQuery(tdoc), mode: 'scratchpad' },
    ),
  });
```

- [ ] **Step 3: Add i18n key**

In `packages/ui-next/src/lib/i18n.ts` zh block, add (alphabetically after `Problem.SubmitHint`):

```ts
  'Problem.OpenScratchpad': '进入在线编程模式',
```

In the en block:

```ts
  'Problem.OpenScratchpad': 'Enter Online Coding Mode',
```

- [ ] **Step 4: Run existing sidebar tests to confirm no regression**

Run: `cd packages/ui-next && yarn vitest run src/components/sidebar/ProblemSidebar.test.tsx`
Expected: PASS (existing tests don't assert menu count).

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/sidebar/ProblemSidebar.tsx \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): add scratchpad entry to ProblemSidebar"
```

---

### Task 15: Wire `?mode=scratchpad` into problem_detail page

**Files:**
- Modify: `packages/ui-next/src/pages/problem_detail.tsx:328-409`

**Interfaces:**
- Produces: when `?mode=scratchpad` is in the URL and the user can submit, render `<ScratchpadPanel>` instead of the normal layout; the exit handler removes the param via `history.pushState`.

- [ ] **Step 1: Add the detection block**

In `packages/ui-next/src/pages/problem_detail.tsx`, inside `ProblemDetailPage`, after the existing `useEffect(() => { ... setUiContext(...) }, [...])` block and before `const preferredLang = useMemo(...)`, add:

```tsx
  const searchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const isScratchpad = searchParams.get('mode') === 'scratchpad';
```

- [ ] **Step 2: Add exit handler**

Adjacent to the above, add:

```tsx
  const handleExitScratchpad = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
```

Add `useCallback` to the imports: change `import { useEffect, useMemo } from 'react';` to `import { useCallback, useEffect, useMemo } from 'react';`.

- [ ] **Step 3: Branch the JSX**

Replace the `if (mode === 'normal')` block in `ProblemDetailPage` with:

```tsx
  if (isScratchpad && canSubmit) {
    return (
      <ScratchpadPanel
        pdoc={pdoc}
        tdoc={tdoc}
        UserContext={UserContext as unknown as ScratchpadPanelProps['UserContext']}
        pretestConnUrl={`record-conn?pretest=1&uidOrName=${UserContext?._id ?? ''}&pid=${pdoc.docId}${tdoc ? `&tid=${tdoc.docId}` : ''}`}
        postSubmitUrl={buildUrl('problem_submit', { pid: String(pdoc.docId) }, getTidQuery(tdoc))}
        getSubmissionsUrl={buildUrl('record_main', {}, { pid: String(pdoc.docId), fullStatus: 'true', ...getTidQuery(tdoc) })}
        contentText={contentText}
        contentLangs={contentLangs}
        preferredLang={preferredLang}
        mode={mode}
        problemId={pdoc.docId}
        onExit={handleExitScratchpad}
      />
    );
  }

  if (mode === 'normal') {
    return (
      <main className={styles.page}>
        ...
```

- [ ] **Step 4: Add the import**

At the top of the file, after existing scratchpad-related imports, add:

```tsx
import { ScratchpadPanel } from '../components/scratchpad/ScratchpadPanel';
import type { ScratchpadPanelProps } from '../components/scratchpad/ScratchpadPanel';
```

- [ ] **Step 5: Run existing problem_detail tests**

Run: `cd packages/ui-next && yarn vitest run src/pages/problem_detail.test.ts`
Expected: PASS (existing tests don't assert URL mode behavior).

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/pages/problem_detail.tsx
git commit -m "feat(ui-next): mount ScratchpadPanel when ?mode=scratchpad"
```

---

### Task 16: Add integration test in `problem_detail.test.tsx`

**Files:**
- Modify: `packages/ui-next/src/pages/problem_detail.test.tsx`

- [ ] **Step 1: Read the existing test scaffold**

Run: `wc -l packages/ui-next/src/pages/problem_detail.test.tsx && head -40 packages/ui-next/src/pages/problem_detail.test.tsx`
Expected: see existing describe blocks and `args` mock.

- [ ] **Step 2: Add scratchpad integration tests**

Append to the existing describe block:

```tsx
  it('mounts ScratchpadPanel when ?mode=scratchpad is in the URL', () => {
    window.history.pushState({}, '', '/p/1?mode=scratchpad');
    renderProblemDetail({ ...defaultArgs });
    expect(screen.getByRole('region', { name: /problem statement/i })).toBeInTheDocument();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('removes mode=scratchpad when exit button is clicked and confirm is accepted', () => {
    window.history.pushState({}, '', '/p/1?mode=scratchpad');
    window.confirm = vi.fn(() => true);
    renderProblemDetail({ ...defaultArgs });
    fireEvent.click(screen.getByRole('button', { name: /exit/i }));
    expect(window.location.search).not.toContain('mode=scratchpad');
  });
```

Also add `vi` to the imports:

```tsx
import { describe, expect, it, vi } from 'vitest';
```

- [ ] **Step 3: Run the new tests**

Run: `cd packages/ui-next && yarn vitest run src/pages/problem_detail.test.tsx`
Expected: PASS, including the 2 new tests.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/pages/problem_detail.test.tsx
git commit -m "test(ui-next): cover scratchpad mode in problem_detail"
```

---

### Task 17: Run full test suite, lint, build

**Files:** none new; verification only.

- [ ] **Step 1: Run full ui-next test suite**

Run: `cd packages/ui-next && yarn test`
Expected: all tests pass (existing 22 + new tests for reducer / context / persistence / pretest session / hotkeys / pretest panel / records panel / toolbar / problem pane / editor pane / scratchpad panel / problem_detail integration).

- [ ] **Step 2: Run lint**

Run: `cd packages/ui-next && yarn lint`
Expected: 0 errors.

- [ ] **Step 3: Run typecheck and build**

Run: `cd packages/ui-next && yarn build`
Expected: tsc -b succeeds; vite build succeeds.

- [ ] **Step 4: Final commit if any incidental fixes**

```bash
git status
# If anything is dirty from lint/build fixes:
git add -A
git commit -m "chore(ui-next): lint/typecheck fixes from scratchpad migration"
```

---

### Task 18: Optional cleanup — remove old placeholder `Scratchpad.tsx`

**Files:**
- Modify: `packages/ui-next/src/components/problem/Scratchpad.tsx` (delete or stub)

- [ ] **Step 1: Check imports of the old file**

Run: `grep -rn "components/problem/Scratchpad" packages/ui-next/src`
Expected: a small number of imports (or none). If any, replace with the new panel.

- [ ] **Step 2: Delete or stub**

If no imports remain:

```bash
git rm packages/ui-next/src/components/problem/Scratchpad.tsx
```

Otherwise, replace its contents with a re-export shim:

```tsx
// DEPRECATED — use `components/scratchpad/ScratchpadPanel` instead.
export { ScratchpadPanel as default } from '../scratchpad/ScratchpadPanel';
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/components/problem/Scratchpad.tsx
git commit -m "chore(ui-next): remove deprecated Scratchpad placeholder"
```

---

## Self-Review Checklist (run after writing the plan)

1. **Spec coverage**
   - Goal 1 (problem_detail in ui-next has Scratchpad): Task 15 ✓
   - Goal 2 (Monaco real editor): Task 4 ✓
   - Goal 3 (WebSocket pretest + record URLs reused): Tasks 6, 8, 14, 15 ✓
   - Goal 4 (useReducer+Context): Tasks 1, 2 ✓
   - Goal 5 (URL `?mode=scratchpad`, no new route): Task 15 ✓
   - Goal 6 (delete ComingSoon placeholder): Task 18 ✓
   - Component contracts (5.1-5.6): Tasks 11, 12, 7, 8, 9, 13 ✓
   - State (6.1-6.3): Tasks 1, 2, 5, 6, 10 ✓
   - Data flow (7.1-7.3): Tasks 5, 6, 8, 9, 13, 15 ✓
   - Error handling (table): Tasks 6 (reconnect), 9 (submit error), 13 (unsaved confirm) ✓
   - i18n: Task 3 + Task 14 ✓
   - Testing: Tasks 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17 ✓

2. **Placeholders**
   - No TBD/TODO. All `it()` blocks have full code. No "implement later" steps.

3. **Type consistency**
   - `ScratchpadState` defined in Task 1, used unchanged in Tasks 2, 6, 7, 8, 9, 10, 13.
   - `ScratchpadAction` union defined in Task 1, dispatched in Tasks 2, 6, 7, 8, 9, 10, 13, 14.
   - `useScratchpad()` defined in Task 2, consumed by Tasks 7, 8, 9, 12, 13.
   - `useScratchpadPersistence({ problemKey, code, onLoaded })` signature in Task 5, consumed in Task 13.
   - `usePretestSession({ url, enabled, rid, dispatch })` signature in Task 6, consumed in Task 12.

4. **Gaps fixed during self-review**
   - Task 13 originally had `import` after a function (syntax error) — Step 3 fixes this with a clean rewrite (all imports at top).
   - RecordsPanel test in Task 8 originally imported `within` and had a stray `trigger` button — Step 1 of Task 8 was corrected to a clean two-test variant.
   - **Pre-flight fix (post-review):** The original plan had a data-flow gap — Task 9's `ScratchpadToolbar` kept the new `rid` in local state (`_rid`) but never propagated it to the parent `ScratchpadPanel`. As a result, `ScratchpadEditorPane`'s WebSocket session (`usePretestSession({ rid })`) would never open after a successful pretest. Fixed by adding `setRid: (rid: string | null) => void` to `ScratchpadToolbarProps` and `ScratchpadEditorPaneProps`, removing Toolbar's local `useState`, and forwarding `setRid` from `ScratchpadPanel`.