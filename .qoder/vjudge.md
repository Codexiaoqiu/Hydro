# VJudge 模块分析

## 项目概述
VJudge（Virtual Judge）是 HydroOJ 系统的一个模块，用于连接和提交代码到远程在线评测系统（OJ）。它允许用户在 HydroOJ 平台上提交代码，然后将代码转发到其他 OJ 进行评测，最后将结果返回给用户。

## 目录结构

### 根目录
- `package.json` - 项目配置文件，定义了依赖、脚本等信息
- `src/index.ts` - 主入口文件，包含核心逻辑和服务定义

### src/ - 源代码目录

#### src/providers/ - 远程OJ提供者实现
- `index.ts` - 提供者注册入口
- `codeforces.ts` - Codeforces OJ 支持
- `csgoj.ts` - CSU Online Judge 支持
- `hduoj.ts` - HDU Online Judge 支持
- `hustoj.ts` - HUST Online Judge 支持
- `poj.ts` - PKU Online Judge 支持
- `spoj.ts` - SPOJ Online Judge 支持
- `yacs.ts` - YACS Online Judge 支持

#### 其他核心文件
- `interface.ts` - 接口定义文件
- `fetch.ts` - 网络请求基础类
- `verdict.ts` - 评测结果映射

## 核心组件

### 1. VJudgeService 主服务
位于 `src/index.ts` 中，是 VJudge 模块的核心服务，负责：
- 管理远程账户
- 协调不同 OJ 提供者
- 处理任务队列
- 同步题目数据

### 2. 提供者接口 (IBasicProvider)
所有远程 OJ 提供者都必须实现以下接口：

```typescript
interface IBasicProvider {
    ensureLogin: () => Promise<boolean | string>;
    getProblem: (id: string, meta: Record<string, any>) => Promise<{
        title: string;
        data: Record<string, any>;
        files: Record<string, any>;
        tag: string[];
        content: string;
        difficulty?: number;
        solution?: string;
    }>;
    entryProblemLists?: string[];
    listProblem: (page: number, resyncFrom: number, listId: string) => Promise<string[]>;
    submitProblem: (id: string, lang: string, code: string, info: any, next: NextFunction, end: NextFunction) => Promise<string | void>;
    waitForSubmission: (id: string, next: NextFunction, end: NextFunction) => Promise<void>;
    checkStatus?: (onCheckFunc: boolean) => Promise<void>;
    stop?: () => Promise<void>;
}
```

### 3. 账户服务 (AccountService)
负责管理单个远程账户的连接和任务处理：
- 登录验证
- 题目同步
- 代码提交
- 结果等待

## 支持的远程OJ

### Codeforces
- 支持 Codeforces 和 Codeforces Gym
- 实现了完整的题目抓取、提交和结果获取功能
- 处理了 CSRF 令牌和 Cookie 管理

### POJ (PKU Online Judge)
- 支持多语言题目内容获取
- 图片资源处理
- 提交和结果监控

### 其他支持的OJ
- CSU Online Judge
- HDU Online Judge
- HUST Online Judge
- SPOJ
- YACS

## 核心功能

### 1. 题目同步
- 自动从远程 OJ 抓取题目信息
- 转换为 HydroOJ 格式
- 存储到本地数据库

### 2. 代码提交
- 将用户代码转发到远程 OJ
- 处理语言映射
- 添加注释标识来源

### 3. 结果监控
- 轮询远程 OJ 获取评测结果
- 映射不同 OJ 的评测状态到统一格式
- 实时更新用户界面

### 4. 语言映射
- 不同 OJ 的语言标识不同，VJudge 提供了语言映射机制
- 自动更新系统语言配置

## 技术特点

### 1. 插件化架构
- 每个 OJ 提供者都是独立的插件
- 易于扩展新的 OJ 支持

### 2. 异步处理
- 使用 Promise 和 async/await 处理异步操作
- 任务队列管理

### 3. 错误处理
- 完善的错误处理和重试机制
- 网络异常恢复

### 4. 网络请求
- 基于 superagent 的 HTTP 客户端
- 支持代理设置
- Cookie 和 Session 管理

## 数据结构

### RemoteAccount 远程账户
```typescript
interface RemoteAccount {
    _id: string;
    type: string;
    cookie?: string[];
    handle: string;
    password: string;
    endpoint?: string;
    proxy?: string;
    query?: string;
    frozen?: string;
    problemLists?: string[];
    enableOn?: string[];
    UA?: string;
}
```

### 评测结果映射
通过 VERDICT 对象将不同 OJ 的评测结果映射到统一的状态码。

## 部署和配置

### 环境要求
- Node.js 运行环境
- MongoDB 数据库
- 网络访问权限到目标 OJ

### 配置项
- 远程账户信息
- 代理设置
- 同步配置

## 扩展性

### 添加新的 OJ 支持
1. 实现 IBasicProvider 接口
2. 在 providers/index.ts 中注册
3. 测试登录、题目获取、提交等功能

### 自定义功能
- 可以添加特定 OJ 的特殊处理逻辑
- 支持自定义语言映射
- 可扩展的状态检查功能