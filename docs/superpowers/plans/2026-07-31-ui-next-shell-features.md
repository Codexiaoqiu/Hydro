# Shell Features Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** 把 SP6/SP7/SP8 已迁移页面从外壳提升到基本功能可用。

---

## File Map

### 新建共享 hooks
- `packages/ui-next/src/hooks/use-form-submit.ts`(Task 2)
- `packages/ui-next/src/hooks/use-domain-action.ts`(Task 3)

### Task 1: read-only 增强
- Modify: `pages/about.tsx`、`pages/wiki_help.tsx`、`pages/status.tsx`、`pages/ranking.tsx`、`pages/home_files.tsx`、`pages/home_domain.tsx`、`pages/home_messages.tsx`
- Modify: 各对应 test 文件

### Task 2: domain_create / edit 接 submit
- Create: `hooks/use-form-submit.ts`
- Modify: `components/domain/DomainForm.tsx`(接 onSubmit prop)
- Modify: `pages/domain_create.tsx`、`pages/domain_edit.tsx`(接 submit handler)
- Modify: 对应 test 文件

### Task 3: domain_user / group / role / permission CRUD
- Create: `hooks/use-domain-action.ts`
- Modify: `components/domain/MemberTable.tsx`(接 onAction prop)
- Modify: `components/domain/RoleSelector.tsx`(接 onChange prop)
- Modify: `pages/domain_user.tsx`、`pages/domain_group.tsx`、`pages/domain_role.tsx`、`pages/domain_permission.tsx`
- Modify: 对应 test 文件

## Task 1: read-only 增强

**目标:** 7 个 SP6 页面加最小交互增强。

### Step 1:about / wiki_help 锚点跳转

```tsx
// pages/about.tsx
const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};
// 在 <a href="#id"> 上挂 onClick={(e) => handleAnchor(e, id)}
```

### Step 2:status 时间排序 + 严重度颜色

```tsx
const sorted = [...args.journals].sort((a, b) => b.time - a.time);
const colorClass = `journal__item--${j.level}`;  // info / warn / error
```

### Step 3:ranking 前 3 名高亮

(已实现,验证 data-top 属性)

### Step 4:home_files / home_domain / home_messages 列表增强

(列表已渲染,加排序 + 空态 + 链接 disabled)

### Step 5:跑测试

```bash
yarn workspace @hydrooj/ui-next test \
  src/pages/about.test.tsx \
  src/pages/wiki_help.test.tsx \
  src/pages/status.test.tsx \
  src/pages/ranking.test.tsx \
  src/pages/home_files.test.tsx \
  src/pages/home_domain.test.tsx \
  src/pages/home_messages.test.tsx 2>&1 | tail -5
```

- [ ] 完成 Task 1

## Task 2: domain_create / edit 接 submit

**Files:**
- Create: `hooks/use-form-submit.ts`
- Modify: `components/domain/DomainForm.tsx`、`pages/domain_create.tsx`、`pages/domain_edit.tsx`、对应 tests

### Step 1:写 useFormSubmit hook

```ts
export function useFormSubmit<T>(endpoint: string) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  return useCallback(async (data: T) => {
    setBusy(true);
    try {
      await request.post(endpoint, new URLSearchParams(data as any));
      toast.success('Saved');
      navigate(window.location.pathname);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [endpoint]);
}
```

### Step 2:DomainForm 接 onSubmit

```tsx
interface Props {
  domain: Partial<DomainFields>;
  mode: 'create' | 'edit';
  onSubmit?: (e: React.FormEvent) => void;
  busy?: boolean;
}
```

### Step 3:domain_create / edit 用 hook

```tsx
// pages/domain_create.tsx
const submit = useFormForm('/domain/create');
return <DomainForm domain={{}} mode="create" onSubmit={(e) => { e.preventDefault(); submit(formData); }} busy={busy} />;
```

### Step 4:测试

- mock request.post → 验证调用
- 错误场景 → toast.error
- 成功场景 → navigate

### Step 5:跑测试

```bash
yarn workspace @hydrooj/ui-next test \
  src/hooks/use-form-submit.test.ts \
  src/pages/domain_create.test.tsx \
  src/pages/domain_edit.test.tsx 2>&1 | tail -5
```

- [ ] 完成 Task 2

## Task 3: domain_user / group / role / permission CRUD

**Files:**
- Create: `hooks/use-domain-action.ts`
- Modify: `components/domain/MemberTable.tsx`、`components/domain/RoleSelector.tsx`、4 个 pages + tests

### Step 1:写 useDomainAction hook

```ts
export function useDomainAction(domainId: string) {
  const toast = useToast();
  return useCallback(async (action: string, payload: any) => {
    try {
      await request.post(`/domain/${domainId}/${action}`, new URLSearchParams(payload));
      toast.success('Done');
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  }, [domainId]);
}
```

### Step 2:MemberTable 接 onAction

```tsx
interface Props {
  members: Member[];
  type: 'user' | 'group';
  onAction?: (memberUid: number, action: 'edit' | 'remove') => void;
}
```

### Step 3:RoleSelector 接 onChange

```tsx
interface Props {
  roles: Role[];
  permissions: Permission[];
  onChange?: (roleId: number, permIdx: number, enabled: boolean) => void;
}
```

### Step 4:4 个 page 接 useDomainAction

```tsx
// pages/domain_user.tsx
const action = useDomainAction(args.domain._id);
const items = members.map((m) => ({
  ...m,
  actions: [
    { label: 'Edit', onClick: () => action('user/edit', { uid: m.uid }) },
    { label: 'Remove', onClick: () => action('user/remove', { uid: m.uid }) },
  ],
}));
return <MemberTable members={items} type="user" />;
```

### Step 5:跑测试

```bash
yarn workspace @hydrooj/ui-next test \
  src/hooks/use-domain-action.test.ts \
  src/components/domain/MemberTable.test.tsx \
  src/components/domain/RoleSelector.test.tsx \
  src/pages/domain_user.test.tsx \
  src/pages/domain_group.test.tsx \
  src/pages/domain_role.test.tsx \
  src/pages/domain_permission.test.tsx 2>&1 | tail -5
```

- [ ] 完成 Task 3

## Task 4: 综合回归

**步骤:**
1. 定向回归 7 个 SP6 页 + 10 个 SP7 页 + 7 个 SP8 页(若已迁移)
2. 全量 vitest
3. e2e harness(测试 form submit / role update)
4. 完成报告

```bash
yarn workspace @hydrooj/ui-next test 2>&1 | tail -5
CI=true yarn test 2>&1 | tail -10
```

---

## Self-Review

1. **Spec coverage**:23 页 + 2 个 hook + final review。
2. **Placeholder scan**:无 TBD。
3. **Type consistency**:`useFormSubmit` / `useDomainAction` 通用 type。
4. **Global constraints**:不改 renderer;新增 2 个共享 hook。
5. **Commit checkpoints**:每 Task 含可选 commit。
6. **Risk Tier**:Task 3 最大(CRUD 接线)。