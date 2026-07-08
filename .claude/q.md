● Code Review 报告（按严重度排序，top 10）

  [
    {
      "file": "packages/ui-next/src/** (entire src tree)",
      "line": 0,
      "summary": "ui-next 完全没有 i18n 基础设施；no i18n() / _() / useTranslate / window.LOCALES 注入；renderer (index.ts:191-204) 只注入 PageData，没有 locale map",
      "failure_scenario": "登录中文用户进任意页面（除 homepage/problem_main 这两个碰巧硬编码中文的），看到的全是英文 'Submit / Sign in / Files / Statistics'。即使想加中文文案，也没有翻译数据加载到客户端"
    },
    {
      "file": "packages/ui-next/src/components/article/Article.tsx",
      "line": 6,
      "summary": "Article 组件只把 children 包进 div，没有 markdown 解析器；problem_detail.tsx:217 把 pdoc.content（原始 markdown 字符串）直接传进去",
      "failure_scenario": "用户打开任意题目 → 看到原始 '# Description\\nGiven two integers…' 文本，看不到任何 markdown 渲染（标题、代码块、列表、图片全部不生效）"
    },
    {
      "file": "packages/ui-next/src/pages/problem_detail.tsx",
      "line": 70,
      "summary": "statusClassName 把 0→'ac', 1→'wa', 2→'tle'…；实际 @hydrooj/common STATUS 是 1=AC, 2=WA, 3=TLE…整个枚举全部偏移一位",
      "failure_scenario": "AC 提交 (status=1) 头部徽章被染成 WA 红色；TLE (status=3) 染成 MLE；用户在题目列表/记录页看到的颜色和真实状态相反"
    },
    {
      "file": "packages/ui-next/src/components/auth/SignInDialog.tsx",
      "line": 68,
      "summary": "usePageData() 在 `if (!open) return null` 之后才调用；open=false 时只跑 4 个 hook、open=true 时跑 5 个，Rules of Hooks 违反，React StrictMode 直接抛 'Rendered fewer hooks than expected'",
      "failure_scenario": "用户点击登录按钮打开对话框 → 5 个 hook 跑完渲染 → 用户关闭 → open=false 提前 return → React 检测到 hook 数量不一致 → 应用崩溃（生产模式下可能静默错乱）"
    },
    {
      "file": "packages/ui-next/src/components/primitives/Alert.tsx",
      "line": 81,
      "summary": "RateLimitAlert 用 `error?.code === 'too_many_requests'` 判断限流，但 HydroClientError.code 是 number（HTTP status 429），永远不等字符串 'too_many_requests'；只靠 message 子串匹配 'too many requests'（大小写敏感）兜底",
      "failure_scenario": "用户连续登录触发后端 429，错误消息是 'Rate limit exceeded'（不包含小写 'too many requests'）→ RateLimitAlert 静默不渲染，用户看到普通红框 alert，不知道是限流，下一次重试再次 429"
    },
    {
      "file": "packages/ui-next/src/pages/problem_detail.tsx",
      "line": 103,
      "summary": "preferredLang 回退到 UserContext.viewLang（值 'zh'）去查 pdoc.content，但 content key 是 'zh_CN'，永远查不到，Object.values()[0] 兜底，用户实际看到的是题目作者最先写的语言而不是自己选的",
      "failure_scenario": "中文用户打开一篇有 zh_CN + en 双语版本的题目 → 前端查到 'zh' → pdoc.content['zh'] = undefined → fallback 到 Object.values()[0]（可能是 en），用户看到英文题面，调试时找不到原因"
    },
    {
      "file": "packages/ui-next/src/components/sidebar/Menu.tsx (used by problem_detail.tsx)",
      "line": 0,
      "summary": "Menu 组件只接受 {key, label, icon, badge, onClick}；problem_detail.tsx:228-234 给 Rejudge/Cancel score 项传的 `form: true, action: '', postBody: {operation:'rejudge'}` 全部被静默丢弃，渲染成无 href 无 onClick 的空链接",
      "failure_scenario": "管理员点 sidebar 'Rejudge all submissions' → 链接没有 action、没有 JS 处理 → 什么都不会发生，没有 POST 'operation=rejudge'，没有反馈。需要整页跳转或 fetch"
    },
    {
      "file": "packages/ui-next/src/pages/problem_detail.tsx",
      "line": 222,
      "summary": "Sidebar 是 mode-agnostic 的同一个 Menu；ui-default 根据 tdoc.rule 走 3 个不同 partial（problem_sidebar_normal/contest/homework.html），缺少 correction/view 模式下的 'Open in Problem Set' 链、缺少 homework 模式的特殊 gating",
      "failure_scenario": "比赛结束后用户进入 correction 模式看题目详情 → 找不到 'Open in Problem Set' 链接回公开题库；homework 模式下看到的是普通 'Discussions/Solutions/Files/Statistics' 菜单（应隐藏这些）"
    },
    {
      "file": "packages/ui-next/src/hooks/use-judge-stream.ts",
      "line": 85,
      "summary": "setTimeout(connect, backoff) 在 unmount/paused 翻转时没被 clearTimeout；component 卸载后定时器仍触发 connect()，创建孤儿 EventSource 并对已卸载组件 setState",
      "failure_scenario": "用户在断网瞬间切到 /record 页面 → EventSource 立即触发 error → 排了 500ms 重连 → 用户 200ms 后跳走 → 定时器到点 → 新 EventSource 在已卸载组件上被创建；React 警告 'state update on unmounted'，浏览器 EventSource 泄漏直到 GC"
    },
    {
      "file": "packages/ui-next/src/pages/problem_detail.tsx",
      "line": 87,
      "summary": "useEffect 直接用 Object.assign 篡改 useUiContext() 返回的 UiContext 对象；React 不观察 context value 的 mutation，所有下游消费 useUiContext().problemId 的组件不会重渲染，且 ui 在 deps 里只在 PageData 变时才换引用，副作用基本不会重跑",
      "failure_scenario": "Section 4 的 sidebar/pretest panel 读 UiContext.problemId 期望题目变化时重渲染；实际上字段只是被静默覆盖，组件不会刷新；'mirror UiContext' 机制等于失效"
    }
  ]

  额外高分发现（未进 top 10 但需修复）

  11. pages/record_detail.tsx:69 — useEffect([rdoc._id, rdoc.domainId, rev, liveStatus]) 把 liveStatus 放依赖里 → 每次 SSE 更新都 disconnect 再 reconnect，断连风暴
  12. pages/record_main.tsx:79 — 筛选表单用 window.location.search = '?' + params → 全页 reload，破坏 SPA
  13. components/auth/LoginForm.tsx:189 — encodeURIComponent(redirect) 把整个 path（含 ? &）编码成 %3F %26 → OAuth callback 解码失败，回跳到 /
  14. components/problem/ProblemForm.tsx:101 — fd.set('content', JSON.stringify(contentByLang)) 把整张多语言表塞成字符串 → 后端 Types.Content 不会 parse，存为 string，下次读出来 Object.values() 找不到正确语言
  15. pages/problem_import.tsx:17 — importerType = args?.type ?? window.location.pathname.split('/').pop() 在第一次渲染时 PageData 未到位 → 拿 URL 兜底成 'import'，PageData 到了又变成 'fps-importer'，但 form action URL 已经在初次渲染时定型
  16. pages/record_main.tsx:52 — [error] = useState<null>(null) 永远是 null，但渲染处 (error as unknown as {message}).message 隐藏类型检查，未来 refactor 把 error 设成非 HydroClientError 类型会运行时崩溃
  17. hooks/use-post-login-redirect.ts:17-26 — value.startsWith('/login') 误伤 /loginRequired 等合法路径
  18. pages/problem_detail.tsx:177-191 — 比赛字母导航的 status 比较 === 0 应为 === 1（同 finding 3）；且链接丢了 ?tid= 导致跳到公开题库
  19. templates/partials/problem_files.html 等 partials 整片缺失 — additional_file 没有下载链 / reference problem 没有提示 / OpenGraph / scratchpad / Monaco 编辑器
  20. tags/difficulty/uploadedBy 渲染细节 — lib.difficulty(nSubmit, nAccept) 兜底缺失、uploaded by 没有头像、没有 MiB 单位、tag 永远展开

  建议优先级（按修复 ROI）

  1. 加 i18n 基础设施（find 1）—— 没它其他都修不动。建议照 ui-default 的模式：renderer 注入 window.LOCALES，新增 src/lib/i18n.ts + useTranslate()，把 14+ 文件的英文全部改为 t('key')，加 locales/zh.ts 常量表
  2. 修 5 个 critical runtime bug（find 4/5/9/10 + record_detail reconnect storm）—— 每个都是真用户能撞上的 crash / 静默坏
  3. 对齐 problem_detail 与 ui-default（find 2/3/6/7/8）—— Article markdown + STATUS 枚举 + preferredLang + Menu form/props + sidebar 三态
  4. OAuth encodeURIComponent / ProblemForm JSON.stringify / 状态文本重复 —— 几个 latent UX bug

  如果需要我接着修这些 bug，按编号说「修 #4、#5」即可，或者「继续按 priority 1 修 i18n」也行。