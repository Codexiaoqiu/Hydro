# ui-next problem_submit 功能等价迁移设计

**日期：** 2026-07-20  
**状态：** 已确认，待实施计划  
**目标页面：** `packages/ui-next/src/pages/problem_submit.tsx`

## 1. 背景

当前 `ui-next` 的 `problem_submit` 并非 `ui-default` 提交页的等价迁移，而是重新实现了一个简化的 SPA 表单。它与既有功能契约存在多处偏差：

- 从不存在的顶层 `args.tid` 读取比赛或作业 ID，导致提交 URL 丢失 `?tid=...`。
- 从不存在的顶层 `args.codeLang` 读取用户偏好语言，没有使用 `UserContext.codeLang`。
- 将服务端的 `langRange: Record<string, string>` 错误当成数组，产生 `langRange.map is not a function`。
- 删除了 `ui-default` 的两级语言选择器及其偏好匹配逻辑。
- 删除了 Scratchpad 推荐提示、临时关闭和永久关闭行为。
- 自行实现提交请求和成功跳转，其中比赛或作业成功后错误跳转到首页。
- 新增了 `ui-default` 独立提交页没有的预测试输入框，但没有发送 `pretest=true`，实际无效。
- 没有恢复 `ui-default` 提交页的题目侧栏导航。

本设计将该页面改为功能等价迁移：保留 React 和 `ui-next` 视觉体系，但请求语义、语言选择、提示、特殊题型、侧栏和服务端跳转行为与 `ui-default` 保持一致。

## 2. 目标

1. `problem_submit` 的用户可观察功能与 `ui-default` 一致。
2. 普通题目、比赛题目、作业题目和 `submit_answer` 均沿用现有服务端契约。
3. 前端不重复实现服务端已有的校验、限流、记录创建和跳转决策。
4. 语言选择器保持旧页面的两级结构、可用语言过滤和偏好选择行为。
5. 提交页与题目详情页共享侧栏实现，避免菜单逻辑再次漂移。
6. 删除当前新增但无效的预测试 UI；预测试继续由 Scratchpad 提供。

## 3. 非目标

- 不重写 `ProblemSubmitHandler` 的提交业务。
- 不改变请求字段、响应结构或服务端错误类型。
- 不在独立提交页新增预测试功能。
- 不桥接 `ui-default` 的 jQuery 组件。
- 不要求视觉像素级复刻 `ui-default`；允许使用 `ui-next` 的设计系统。
- 不在本任务中实现当前仍为占位状态的 Scratchpad 编辑器。
- 不重构所有页面的路由或状态生命周期。

## 4. 已确认的实现路线

采用 React 重建界面并恢复浏览器原生表单语义：

- React 负责页面布局、语言选择器、提示和侧栏。
- 表单使用普通 HTML POST，不通过 `request.post` 或 `request.postFile`。
- form 不设置 `action`，提交到浏览器当前完整 URL，自然保留 `?tid=...`。
- 服务端负责验证、限流、文件处理、记录创建和成功重定向。
- 不复用 jQuery，也不在前端模拟服务端跳转。

## 5. 架构

### 5.1 `ProblemSubmitPage`

页面组件只负责：

- 读取 `pdoc`、`tdoc`、`langRange`、`UserContext` 及侧栏所需的现有页面数据。
- 渲染双栏布局。
- 渲染原生提交表单。
- 根据 `pdoc.config.type` 处理 `submit_answer` 的语言字段。
- 渲染提交提示。
- 组合共享题目侧栏。

页面组件不再负责：

- 构造提交 URL。
- 发起 fetch 请求。
- 转换服务端错误。
- 判断成功后应导航到哪个页面。
- 维护代码、文件、提交状态或预测试输入的 React state。

### 5.2 `ProblemLanguageSelect`

新增 React 语言选择组件，负责：

- 接收题目允许语言、服务端 `langRange`、`UserContext.codeLang` 和 `window.LANGS` 元数据。
- 复刻 `getAvailableLangs()` 的过滤规则。
- 按 `main.sub` 结构构造主语言和子版本选择器。
- 复刻 `renderLanguageSelect()` 的偏好匹配与初始选择规则。
- 输出真正参与提交的隐藏字段 `<input name="lang">`。

该组件不提交请求，也不验证服务端是否最终允许该语言。

### 5.3 `ProblemSidebar`

从 `problem_detail.tsx` 抽出共享题目侧栏及菜单生成逻辑，包括：

- `SidebarCtx`
- `getTidQuery`
- 普通、比赛和作业菜单构建逻辑
- 根据页面模式选择菜单项的逻辑
- 现有 `Menu`、`SideCard`、`Author`、`ContestList` 和信息卡组合

`problem_detail` 和 `problem_submit` 均使用同一个共享组件或共享构建函数。不得复制一套提交页专用菜单。

不为该抽取新增 slot 协议；若将来需要插件扩展，应另行设计。

## 6. 数据契约

### 6.1 页面注入数据

`next` renderer 将数据组织为：

```ts
{
  UserContext,
  UiContext,
  ...response.body,
}
```

提交页使用的关键字段：

```ts
interface ProblemSubmitArgs {
  UserContext: {
    codeLang?: string;
    // 侧栏权限与用户信息字段
  };
  pdoc: {
    docId: number;
    pid?: string;
    title: string;
    config: {
      type?: string;
      langs?: string[];
    };
  };
  langRange: Record<string, string>;
  tdoc?: {
    docId: string;
    rule?: string;
  };
  tsdoc?: unknown;
  psdoc?: unknown;
  owner_udoc?: unknown;
  discussionCount?: number;
  solutionCount?: number;
  mode?: string;
}
```

不得继续读取不存在的顶层 `args.codeLang` 或 `args.tid`。

### 6.2 表单请求

普通提交表单：

```html
<form method="post" enctype="multipart/form-data">
  <input type="hidden" name="lang" value="完整语言 key">
  <textarea name="code"></textarea>
  <input type="file" name="file">
  <button type="submit">...</button>
</form>
```

form 不设置 `action`。浏览器提交到当前地址，例如：

```text
/p/3/submit
/p/3/submit?tid=64f000000000000000000001
```

`submit_answer` 不渲染语言选择器，语言字段固定为：

```html
<input type="hidden" name="lang" value="_">
```

代码 textarea 和文件上传仍按旧模板保留，用于提交答案内容。

页面不发送 `pretest` 或 `input` 字段。

### 6.3 服务端结果

页面不解释 `{rid}` 或 `{tid}`，也不硬编码目标路径。浏览器服从 `ProblemSubmitHandler.post()` 设置的 redirect：

- 普通提交进入记录详情。
- 比赛提交进入比赛题单或记录详情，服从现有规则。
- 作业提交进入作业详情或记录详情，服从现有规则。

## 7. 语言选择行为

### 7.1 可用语言过滤

与 `ui-default` 的 `getAvailableLangs()` 一致：

- 仅保留题目允许的语言。
- 排除 disabled 语言。
- hidden 语言只有在题目明确包含时才可见。
- 复合语言保留完整 key，例如 `cc.cc17`。
- 父级占位语言不作为最终提交语言。

### 7.2 两级选择器

- 第一级选择主语言。
- 第二级选择主语言下的具体版本；只有一个版本时仍保持确定的提交值。
- 任一选择变化后，隐藏的 `name="lang"` 字段同步为最终完整 key。

### 7.3 初始偏好

按旧实现顺序选择：

1. `UserContext.codeLang`。
2. 与该语言的 `pretest` 配置直接关联的可用语言。
3. 与该语言同主语言族的关联语言。
4. 第一个可用语言。

若用户偏好不在题目允许集合中，不得让受控选择器保存一个不存在的值。

## 8. 提交提示

默认显示与旧页面语义相同的提示：该页面仅用于粘贴已有代码；若需要代码高亮和试运行，应回到题目详情页使用 Scratchpad。

操作：

- `Dismiss`：仅关闭当前组件实例，不写存储。
- `Don't show again`：写入 `localStorage['submit-hint'] = 'dismiss'` 后关闭。
- 首次渲染时若该键已是 `dismiss`，不显示提示。
- `submit_answer` 与旧脚本一致，不渲染该提示。
- localStorage 不可用时，永久关闭退化为当前页面关闭，不影响表单。

必须沿用旧键名，以兼容用户在 `ui-default` 中已有的偏好。

## 9. 页面结构

使用 `ui-next` 设计系统构造双栏布局：

- 主区域：返回题目链接、页面标题、提交提示、语言选择、代码 textarea、文件上传、提交按钮。
- 侧栏：共享 `ProblemSidebar`。

题目模式决定侧栏菜单：

- 普通题目：查看、提交、编辑、文件、统计、讨论、题解等现有权限项。
- 比赛题目：比赛上下文中的查看和提交导航。
- 作业题目：作业上下文中的查看和提交导航。

视觉可以使用 `ui-next` token、Card、Menu 和按钮样式，但不得删除对应功能入口。

## 10. 状态与 SPA 导航

当前 App 在同一 page slot 内导航时可能复用 `ProblemSubmitPage` 实例。为避免上一题数据残留：

- 以 `pdoc.docId` 和 `tdoc?.docId` 组成稳定 key，重建表单及语言选择组件。
- code textarea 和 file input 使用原生非受控字段。
- 切换到另一道题或另一比赛上下文时，语言和表单字段恢复新页面的初始状态。
- 提交提示是否永久隐藏仍由兼容的 localStorage 键决定。

## 11. 错误处理

客户端不创建独立错误协议。

以下错误继续由服务端产生并展示：

- 题目配置错误。
- 比赛不在进行中。
- 语言不允许。
- 代码为空或文件缺失。
- 代码或文件超限。
- 用户或全局提交限流。
- 文件存储失败。

这样可以保证 `ui-default` 和 `ui-next` 使用同一错误来源、同一状态码和同一跳转规则。

## 12. 测试策略

采用 TDD，先写会在当前实现上失败的行为测试，再迁移代码。

### 12.1 语言选择器单元测试

1. 接受 `Record<string, string>` 的 `langRange`。
2. 正确过滤 hidden、disabled 和题目未允许语言。
3. 正确分组复合语言 key。
4. 用户偏好可用时优先选中。
5. 用户偏好不可用时回退到第一个允许语言。
6. pretest 关联语言的偏好顺序与旧实现一致。
7. 主语言和子版本变化会更新隐藏字段完整值。
8. 空或不一致元数据不会产生不存在的选中值。

### 12.2 页面集成测试

1. 普通提交页渲染原生 POST multipart form。
2. form 不存在 `action` 覆盖，因而保留当前 URL query。
3. textarea 具有 `name="code"`、autofocus、spellcheck=false。
4. 文件输入具有 `name="file"`。
5. 页面不渲染预测试输入框。
6. `submit_answer` 仅渲染 `lang="_"`，不渲染语言选择器。
7. 提交提示支持临时关闭。
8. 永久关闭写入并读取旧 localStorage key。
9. 普通、比赛和作业模式显示相应共享侧栏菜单。
10. 更换 `pdoc/tdoc` 后表单和语言状态重置。

### 12.3 回归测试

- 现有 `problem_detail` 侧栏行为在抽取后保持不变。
- `ui-next` 目标测试通过。
- 相关 TypeScript 诊断无新增错误。
- 生产构建环境可用时执行 `@hydrooj/ui-next` build。
- 不使用 Playwright；浏览器验证由用户现有运行环境或允许的浏览器工具完成。

## 13. 验收标准

全部满足才视为完成：

1. `/p/:pid/submit` 不再因 `langRange` 数据形状崩溃。
2. 普通题目能按所选完整语言 key 提交代码或文件。
3. 带 `?tid=` 的比赛或作业提交仍属于对应活动。
4. 成功跳转完全服从服务端，不再跳到错误首页。
5. 用户语言偏好与旧页面一致。
6. 两级语言选择器覆盖旧页面的过滤和选择逻辑。
7. `submit_answer` 行为与旧页面一致。
8. 提交提示及 localStorage 行为与旧页面兼容。
9. 独立提交页不出现预测试输入框。
10. 题目侧栏功能不因迁移缺失，详情页与提交页共享实现。
11. SPA 内切换提交页不会残留上一题表单状态。
12. 新增测试覆盖以上契约，且不修改 `ui-default` 行为。

## 14. 实施边界总结

预计实施会涉及：

- 重写 `packages/ui-next/src/pages/problem_submit.tsx`。
- 扩充 `packages/ui-next/src/pages/problem_submit.test.tsx`。
- 新增 React 语言选择组件及测试。
- 从 `problem_detail.tsx` 抽取共享题目侧栏或菜单构建逻辑，并调整对应测试。
- 仅在现有页面数据确实缺失且测试证明时，才对服务端 GET 数据注入做最小修改。

不得顺手重构无关页面、实现 Scratchpad、扩展提交协议或改变服务端业务规则。
