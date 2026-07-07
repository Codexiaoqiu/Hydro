# HydroOJ 项目结构分析

## 项目概述
HydroOJ 是一个基于 Node.js 的在线评测系统（Online Judge），采用服务端渲染（SSR）架构。项目使用 Koa.js 作为后端框架，MongoDB 作为数据库，Nunjucks 作为模板引擎。

## 目录结构

### 根目录
- [package.json](file:///home/xq/Hydro/framework/eslint-config/node_modules/@antfu/eslint-config/package.json) - 项目配置文件，定义了依赖、脚本等信息
- [setting.yaml](file:///home/xq/Hydro/packages/hydrooj/setting.yaml) - 系统默认配置文件，包含主页配置和编程语言配置

### bin/ - 可执行文件目录
- [hydrooj.js](file:///home/xq/Hydro/packages/hydrooj/bin/hydrooj.js) - 项目入口脚本
- [commands.ts](file:///home/xq/Hydro/packages/hydrooj/bin/commands.ts) - 命令行接口定义

### src/ - 源代码目录

#### src/commands/ - 命令行工具
- [addon.ts](file:///home/xq/Hydro/packages/hydrooj/src/commands/addon.ts) - 插件管理命令
- [db.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/db.ts) - 数据库相关命令
- [diagnosis.ts](file:///home/xq/Hydro/packages/hydrooj/src/commands/diagnosis.ts) - 诊断工具命令
- [install.ts](file:///home/xq/Hydro/install/install.ts) - 安装相关命令
- [patch.ts](file:///home/xq/Hydro/node_modules/zrender/src/svg/patch.ts) - 补丁相关命令

#### src/entry/ - 系统入口点
- [cli.ts](file:///home/xq/Hydro/node_modules/svgtofont/src/cli.ts) - 命令行接口入口
- [common.ts](file:///home/xq/Hydro/framework/utils/lib/common.ts) - 通用入口逻辑
- [setup.ts](file:///home/xq/Hydro/packages/hydrooj/src/entry/setup.ts) - 系统设置入口
- [worker.ts](file:///home/xq/Hydro/packages/hydrooj/src/entry/worker.ts) - 工作进程入口

#### src/handler/ - 请求处理器
- [compat.ts](file:///home/xq/Hydro/packages/hydrooj/src/handler/compat.ts) - 兼容性处理
- [connection.ts](file:///home/xq/Hydro/packages/hydrooj/src/handler/connection.ts) - 连接处理
- [import.ts](file:///home/xq/Hydro/packages/hydrooj/src/handler/import.ts) - 导入功能处理
- [misc.ts](file:///home/xq/Hydro/packages/hydrooj/src/handler/misc.ts) - 杂项功能处理
- [status.ts](file:///home/xq/Hydro/packages/common/status.ts) - 状态相关处理

#### src/lib/ - 核心库
- [avatar.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/avatar.ts) - 头像处理
- [content.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/content.ts) - 内容处理
- [difficulty.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/difficulty.ts) - 难度计算
- [hash.hydro.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/hash.hydro.ts) - 密码哈希处理
- [i18n.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/i18n.ts) - 国际化支持
- [mail.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/mail.ts) - 邮件发送
- [mime.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/mime.ts) - MIME类型处理
- [rating.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/rating.ts) - 评分系统
- [testdataConfig.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/testdataConfig.ts) - 测试数据配置
- [ui.ts](file:///home/xq/Hydro/packages/hydrooj/src/ui.ts) - 用户界面相关
- [verifyTFA.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/verifyTFA.ts) - 双因素认证验证

#### src/model/ - 数据模型
- [blacklist.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/blacklist.ts) - 黑名单模型
- [message.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/message.ts) - 消息模型
- [oauth.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/oauth.ts) - OAuth认证模型
- [opcount.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/opcount.ts) - 操作计数模型
- [oplog.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/oplog.ts) - 操作日志模型
- [schedule.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/schedule.ts) - 调度模型
- [solution.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/solution.ts) - 解题方案模型
- [storage.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/storage.ts) - 存储模型
- [system.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/system.ts) - 系统配置模型
- [task.ts](file:///home/xq/Hydro/packages/hydrojudge/src/task.ts) - 任务模型
- [token.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/token.ts) - 令牌模型
- [training.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/training.ts) - 训练模型
- [user.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/user.ts) - 用户模型（核心）

#### src/script/ - 脚本工具
- [blacklist.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/blacklist.ts) - 黑名单管理脚本
- [checkUpdate.ts](file:///home/xq/Hydro/packages/hydrooj/src/script/checkUpdate.ts) - 更新检查脚本
- [deleteUser.ts](file:///home/xq/Hydro/packages/hydrooj/src/script/deleteUser.ts) - 用户删除脚本
- [fixStorage.ts](file:///home/xq/Hydro/packages/hydrooj/src/script/fixStorage.ts) - 存储修复脚本
- [problemStat.ts](file:///home/xq/Hydro/packages/hydrooj/src/script/problemStat.ts) - 题目统计脚本
- [rating.ts](file:///home/xq/Hydro/packages/hydrooj/src/lib/rating.ts) - 评分计算脚本
- [storageUsage.ts](file:///home/xq/Hydro/packages/hydrooj/src/script/storageUsage.ts) - 存储使用情况脚本

#### src/service/ - 服务层

##### src/service/layers/ - 中间件层
- [base.ts](file:///home/xq/Hydro/framework/framework/base.ts) - 基础层
- [domain.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/domain.ts) - 域名层
- [user.ts](file:///home/xq/Hydro/packages/hydrooj/src/model/user.ts) - 用户层

##### 其他服务
- [bus.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/bus.ts) - 事件总线
- [check.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/check.ts) - 检查服务
- [db.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/db.ts) - 数据库服务（核心）
- [hmr.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/hmr.ts) - 热模块替换
- [migration.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/migration.ts) - 数据库迁移
- [monitor.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/monitor.ts) - 监控服务
- [server.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/server.ts) - 服务器服务（核心）
- [watch.ts](file:///home/xq/Hydro/packages/hydrooj/src/service/watch.ts) - 文件监控
- [worker.ts](file:///home/xq/Hydro/packages/hydrooj/src/entry/worker.ts) - 工作进程管理

#### 其他核心文件
- [context.ts](file:///home/xq/Hydro/packages/hydrooj/src/context.ts) - 上下文管理
- [error.ts](file:///home/xq/Hydro/framework/framework/error.ts) - 错误处理
- [init.ts](file:///home/xq/Hydro/packages/hydrooj/src/init.ts) - 初始化逻辑
- [libs.ts](file:///home/xq/Hydro/packages/hydrooj/src/libs.ts) - 库管理
- [loader.ts](file:///home/xq/Hydro/packages/hydrooj/src/loader.ts) - 模块加载器（核心）
- [logger.ts](file:///home/xq/Hydro/packages/hydrooj/src/logger.ts) - 日志系统
- [options.ts](file:///home/xq/Hydro/packages/hydrooj/src/options.ts) - 配置选项
- [pipelineUtils.ts](file:///home/xq/Hydro/packages/hydrooj/src/pipelineUtils.ts) - 管道工具
- [plugin-api.ts](file:///home/xq/Hydro/packages/hydrooj/src/plugin-api.ts) - 插件API（核心导出）
- [settings.ts](file:///home/xq/Hydro/packages/hydrooj/src/settings.ts) - 设置管理
- [typeutils.ts](file:///home/xq/Hydro/packages/hydrooj/src/typeutils.ts) - 类型工具
- [ui.ts](file:///home/xq/Hydro/packages/hydrooj/src/ui.ts) - UI管理
- [utils.ts](file:///home/xq/Hydro/build/utils.ts) - 通用工具
- [welcome.ts](file:///home/xq/Hydro/packages/hydrooj/src/welcome.ts) - 欢迎信息

### 主要技术栈
1. **后端框架**: Koa.js
2. **数据库**: MongoDB
3. **模板引擎**: Nunjucks
4. **依赖管理**: Yarn/PNPM
5. **类型检查**: TypeScript
6. **构建工具**: ESBuild
7. **测试**: Jest
8. **代码规范**: ESLint

### 核心架构特点
1. **插件化架构**: 通过 Cordis 框架实现插件系统
2. **服务端渲染**: 使用 Nunjucks 模板引擎进行服务端渲染
3. **多租户支持**: 通过 Domain 模型支持多站点
4. **权限系统**: 基于权限位和特权的细粒度权限控制
5. **国际化**: 支持多语言界面
6. **模块化设计**: 各功能模块解耦，便于扩展和维护

### 启动流程
1. 通过 [hydrooj.js](file:///home/xq/Hydro/packages/hydrooj/bin/hydrooj.js) 启动应用
2. 加载配置和环境变量
3. 初始化数据库连接
4. 加载插件和模块
5. 启动 HTTP 服务器
6. 开始监听请求

### 数据模型设计
系统采用 MongoDB 作为数据库，主要集合包括：
- 用户相关: user, vuser, user.group
- 题目相关: document (problem), record
- 比赛相关: document (contest), contest.balloon
- 系统配置: system, setting
- 存储相关: storage, file
- 日志监控: oplog, event, opcount

### 权限系统
系统具有完善的权限控制机制：
- **权限位(PERM)**: 控制具体功能访问权限
- **特权(PRIV)**: 控制用户账户级别权限
- **角色系统**: 支持自定义角色和权限分配
- **域权限**: 支持不同域的独立权限控制