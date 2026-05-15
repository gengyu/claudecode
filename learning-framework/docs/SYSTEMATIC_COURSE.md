# Claude Code 源码系统课程

## 课程定位

这门课面向已经具备 TypeScript、React 或 CLI 开发基础的学习者，目标不是把 Claude Code 的每个文件逐行读完，而是建立一套可迁移的源码理解能力：

- 看懂一个大型 AI CLI 项目的运行主线
- 理解终端 UI、Agent 循环、工具调用、权限控制如何协作
- 学会用“入口 -> 状态 -> 消息 -> 查询循环 -> 工具 -> 扩展”的方式拆解复杂源码
- 最终能在 `learning-framework` 中复刻一个简化版 Claude Code 架构

建议课程节奏为 **14 章主线课 + 4 个阶段项目**。每章都包含源码导读、调用链追踪、概念拆解和实践任务。

---

## 学习前置知识

### 必备基础

1. TypeScript 类型系统
2. React 组件、Hooks、Context
3. Node.js 或 Bun 运行时基础
4. CLI 参数、环境变量、进程退出码
5. async/await、AsyncGenerator、流式处理

### 建议补充

1. Commander.js 命令解析
2. Ink 终端 UI
3. Zod schema 校验
4. LLM tool use 基本概念
5. WebSocket、MCP、插件系统基础

---

## 总体源码地图

```text
用户输入
  ↓
CLI 入口 main.tsx
  ↓
初始化 init.ts + 配置/策略/环境变量
  ↓
REPL.tsx 终端交互界面
  ↓
AppState 全局状态 + Message 消息流
  ↓
query.ts Agent 查询循环
  ↓
Claude API 流式响应
  ↓
tool_use 检测
  ↓
toolOrchestration.ts 调度工具
  ↓
Tool.ts / tools/* 具体工具执行
  ↓
权限系统 / UI 反馈 / 会话持久化
```

核心学习文件：

- `claudecode-project/src/main.tsx`
- `claudecode-project/src/entrypoints/init.ts`
- `claudecode-project/src/screens/REPL.tsx`
- `claudecode-project/src/state/AppState.tsx`
- `claudecode-project/src/query.ts`
- `claudecode-project/src/Tool.ts`
- `claudecode-project/src/tools.ts`
- `claudecode-project/src/services/tools/toolOrchestration.ts`
- `claudecode-project/src/commands.ts`

---

## 四阶段学习路线

### 第一阶段：建立全局地图

目标：知道系统从哪里启动、如何显示界面、用户输入如何进入程序。

章节：

1. 源码全景与学习方法
2. CLI 启动入口与 Commander 命令解析
3. 初始化系统与配置加载
4. React + Ink 终端 UI

阶段项目：在 `learning-framework` 中实现一个可启动的 CLI TUI，支持输入、显示消息、退出程序。

### 第二阶段：理解交互主链路

目标：能追踪“一条用户消息”从输入到模型响应再到 UI 展示的完整路径。

章节：

5. REPL 主交互界面源码导读
6. AppState 状态管理机制
7. 消息系统与对话上下文
8. Agent 查询循环

阶段项目：实现一个简化版消息循环，支持用户输入、模拟模型流式输出、消息持久化。

### 第三阶段：掌握工具调用核心

目标：理解 Claude Code 的核心竞争力：模型如何安全地调用本地工具。

章节：

9. Tool 抽象层设计
10. 内置工具系统
11. 权限系统与安全边界
12. Slash Commands 命令体系

阶段项目：实现 3 个工具：`read`、`write`、`bash`，并加入权限确认流程。

### 第四阶段：进入高级扩展架构

目标：理解大型 AI CLI 如何支持 MCP、插件、远程会话、子 Agent 和性能优化。

章节：

13. MCP、插件与 Skills 扩展系统
14. 高级系统：远程、子 Agent、压缩、性能与工程化

阶段项目：实现一个简化插件系统，并把插件工具合并进主工具池。

---

## 第 1 章：源码全景与学习地图

### 学习目标

- 认识 Claude Code 的整体目录结构
- 找到主入口、核心循环、工具系统、UI 系统的位置
- 学会用调用链而不是文件列表学习大型源码

### 核心知识点

1. `src/main.tsx` 是 CLI 主入口
2. `src/screens/REPL.tsx` 是交互界面的核心
3. `src/query.ts` 是 Agent 查询循环
4. `src/Tool.ts` 定义工具抽象
5. `src/tools.ts` 组装内置工具池
6. `src/commands.ts` 组装斜杠命令

### 教学表现形式

- 目录树速览
- 一张“用户输入到工具执行”的链路图
- 选 9 个核心文件做源码地图

### 实践任务

- 使用 `rg --files claudecode-project/src` 列出文件
- 标记 10 个最重要的入口文件
- 画出自己的第一版架构图

### 本章产出

一份 `docs/notes/ch01-source-map.md`，记录学习者对项目结构的第一印象。

---

## 第 2 章：CLI 启动入口与 Commander 命令解析

### 学习目标

- 理解 Claude Code 如何从命令行启动
- 掌握 Commander.js 如何定义参数、选项和 action
- 看懂交互模式与非交互模式的分流

### 核心知识点

1. 顶层副作用：启动性能优化
2. `CommanderCommand` 创建 CLI 程序
3. 全局参数与 option 定义
4. `preAction` 初始化钩子
5. `program.action` 主处理器
6. `--print` 非交互模式
7. session、model、permission 等 CLI 参数如何进入应用状态

### 重点源码

- `claudecode-project/src/main.tsx`
- `claudecode-project/src/cli/handlers/*`
- `claudecode-project/src/cli/print.ts`

### 教学表现形式

- 用“机场安检”类比 CLI 参数分流：不同参数决定用户走不同通道
- 画 `main.tsx` 的三段结构：导入与预热、命令定义、action 执行
- 现场追踪 `claude -p "hello"` 的执行路径

### 实践任务

- 在 `learning-framework` 中添加 Commander 入口
- 支持 `--debug`、`--print`、`--model`
- 打印解析后的 options

---

## 第 3 章：初始化系统与配置加载

### 学习目标

- 理解程序启动前需要准备哪些系统资源
- 掌握配置、环境变量、远程策略、清理函数的初始化顺序

### 核心知识点

1. `init()` 使用 memoize 避免重复初始化
2. 配置系统启用
3. safe env 与 full env 的区别
4. graceful shutdown
5. remote managed settings
6. policy limits
7. 网络、代理、证书、mTLS 初始化

### 重点源码

- `claudecode-project/src/entrypoints/init.ts`
- `claudecode-project/src/utils/config.js`
- `claudecode-project/src/services/remoteManagedSettings/*`
- `claudecode-project/src/services/policyLimits/*`

### 教学表现形式

- 用“开店前准备”类比初始化：开门、通电、收银、消防检查
- 拆解 fire-and-forget 异步任务
- 对比阻塞初始化与非阻塞初始化

### 实践任务

- 在 `learning-framework` 中实现 `init()`
- 加入配置读取、日志输出、退出清理
- 故意制造配置错误，观察错误路径

---

## 第 4 章：React + Ink 终端 UI

### 学习目标

- 理解终端应用为什么也能用 React
- 掌握 Ink 的组件、布局、输入和刷新机制

### 核心知识点

1. Ink 的 `Box`、`Text`
2. 终端 Flexbox 布局
3. `useInput` 键盘事件
4. 终端尺寸变化
5. Dialog 与全屏布局
6. 消息列表渲染
7. Spinner、状态栏、提示信息

### 重点源码

- `claudecode-project/src/ink.ts`
- `claudecode-project/src/components/App.tsx`
- `claudecode-project/src/components/Messages.tsx`
- `claudecode-project/src/components/PromptInput/PromptInput.tsx`

### 教学表现形式

- 先做一个最小 Ink demo
- 再对照 Claude Code 组件分层
- 通过截图或终端录屏展示 UI 状态变化

### 实践任务

- 实现一个两栏终端布局
- 支持输入框、消息列表、底部状态栏
- 输入 `/clear` 可以清空消息

---

## 第 5 章：REPL 主交互界面源码导读

### 学习目标

- 看懂 REPL 为什么是 Claude Code 最复杂的文件之一
- 掌握输入、队列、查询、渲染、权限弹窗如何集中协作

### 核心知识点

1. REPL 组件职责边界
2. 用户输入提交
3. 消息队列处理
4. query 调用
5. tool permission UI
6. 中断与取消
7. IDE/remote/voice 等能力接入点
8. 后台任务与子会话

### 重点源码

- `claudecode-project/src/screens/REPL.tsx`
- `claudecode-project/src/utils/handlePromptSubmit.js`
- `claudecode-project/src/hooks/useQueueProcessor.js`
- `claudecode-project/src/hooks/useCommandQueue.ts`

### 教学表现形式

- 把 REPL 拆成 5 个角色：输入员、调度员、记录员、渲染员、守门员
- 只追踪一条消息，不一开始展开全部分支
- 用断点式讲解：输入前、输入后、请求中、工具中、结束后

### 实践任务

- 在简化项目中实现 `handlePromptSubmit`
- 加入一个消息队列
- 支持请求中禁止重复提交

---

## 第 6 章：AppState 状态管理机制

### 学习目标

- 理解 Claude Code 为什么不用简单的 React state
- 掌握外部 store + selector 的状态管理方式

### 核心知识点

1. `AppStateProvider`
2. `createStore`
3. `useSyncExternalStore`
4. selector 避免无效渲染
5. `useSetAppState`
6. 设置变更同步到 AppState

### 重点源码

- `claudecode-project/src/state/AppState.tsx`
- `claudecode-project/src/state/AppStateStore.ts`
- `claudecode-project/src/state/store.ts`

### 教学表现形式

- 对比 `useState`、Context、external store
- 用“仓库 + 订阅者”类比状态更新
- 演示 selector 返回新对象导致重复渲染的问题

### 实践任务

- 实现一个最小 external store
- 添加 `useAppState(selector)`
- 用 selector 分别订阅 `messages` 和 `isLoading`

---

## 第 7 章：消息系统与对话上下文

### 学习目标

- 理解 Claude Code 如何组织对话历史
- 掌握消息如何转成 API 可接受的格式

### 核心知识点

1. UserMessage
2. AssistantMessage
3. SystemMessage
4. Tool result message
5. Attachment message
6. `normalizeMessagesForAPI`
7. token 估算与上下文裁剪

### 重点源码

- `claudecode-project/src/types/message.js`
- `claudecode-project/src/utils/messages.js`
- `claudecode-project/src/utils/attachments.js`
- `claudecode-project/src/services/compact/*`

### 教学表现形式

- 用表格列出不同 message 类型
- 追踪 tool_use 与 tool_result 如何成对出现
- 展示 compact 前后的消息变化

### 实践任务

- 定义简化版 Message 类型
- 实现 `normalizeMessagesForAPI`
- 加入一个 `tool_result` 消息

---

## 第 8 章：Agent 查询循环

### 学习目标

- 看懂 Claude Code 的核心 Agent loop
- 理解模型响应、工具调用、多轮继续之间的关系

### 核心知识点

1. `query()` 是 AsyncGenerator
2. 流式事件如何 yield 给 UI
3. API 请求开始事件
4. assistant 文本响应
5. tool_use 检测
6. runTools 后继续下一轮
7. prompt too long / max output tokens 恢复
8. auto compact
9. stop hooks

### 重点源码

- `claudecode-project/src/query.ts`
- `claudecode-project/src/query/config.ts`
- `claudecode-project/src/query/tokenBudget.ts`
- `claudecode-project/src/services/api/claude.ts`

### 教学表现形式

- 用“回合制游戏”解释 Agent loop：模型出牌，工具响应，再轮到模型
- 画 `query -> API -> tool_use -> runTools -> query` 循环图
- 单独讲 AsyncGenerator 的价值

### 实践任务

- 实现一个模拟 `query()` 生成器
- 先 yield 文本，再 yield tool_use，再 yield tool_result
- UI 逐步消费这些事件

---

## 第 9 章：Tool 抽象层设计

### 学习目标

- 理解工具为什么需要统一协议
- 掌握工具的 schema、权限、执行、结果、UI 五件套

### 核心知识点

1. Tool name
2. inputSchema
3. prompt 描述
4. isEnabled
5. isConcurrencySafe
6. permission check
7. call/execute
8. result formatting

### 重点源码

- `claudecode-project/src/Tool.ts`
- `claudecode-project/src/tools/FileReadTool/FileReadTool.ts`
- `claudecode-project/src/tools/BashTool/BashTool.tsx`
- `claudecode-project/src/tools/FileEditTool/FileEditTool.ts`

### 教学表现形式

- 用“插座标准”类比 Tool 接口：只要符合接口，就能插进 Agent loop
- 把一个 Tool 拆成定义层、权限层、执行层、展示层
- 对比只读工具和会修改系统的工具

### 实践任务

- 定义 `Tool` interface
- 实现 `ReadTool`
- 加入 Zod input 校验

---

## 第 10 章：内置工具系统

### 学习目标

- 理解 Claude Code 如何注册、过滤和组合工具
- 掌握常见工具的设计差异

### 核心知识点

1. `getAllBaseTools`
2. `getTools`
3. feature gate
4. permission deny filter
5. MCP tools 合并
6. 工具去重与排序
7. 读写工具的风险差异
8. 并发安全工具批处理

### 重点源码

- `claudecode-project/src/tools.ts`
- `claudecode-project/src/services/tools/toolOrchestration.ts`
- `claudecode-project/src/services/tools/toolExecution.ts`
- `claudecode-project/src/tools/*`

### 教学表现形式

- 工具池装配流程图
- 表格对比 Read/Edit/Write/Bash/Glob/Grep/Agent
- 现场追踪一个 Bash tool_use

### 实践任务

- 实现 `getTools(permissionContext)`
- 添加 `ReadTool`、`WriteTool`、`BashTool`
- 让只读工具可以并发执行

---

## 第 11 章：权限系统与安全边界

### 学习目标

- 理解 AI CLI 最大的工程难点：既要有能力，又不能越界
- 掌握权限规则如何影响工具暴露和工具执行

### 核心知识点

1. permission mode
2. always allow / always deny / always ask
3. workspace directories
4. Bash 危险命令识别
5. 文件写入确认
6. 权限 UI 弹窗
7. 后台 Agent 权限约束

### 重点源码

- `claudecode-project/src/types/permissions.js`
- `claudecode-project/src/hooks/useCanUseTool.js`
- `claudecode-project/src/components/permissions/*`
- `claudecode-project/src/tools/BashTool/*`

### 教学表现形式

- 用“钥匙串”类比权限上下文：不同钥匙开不同门
- 用案例讲解：读文件、改文件、执行删除命令
- 对比工具展示前过滤和执行时拦截

### 实践任务

- 实现一个 permission context
- Bash 命令默认 ask
- 文件写入必须确认

---

## 第 12 章：Slash Commands 命令体系

### 学习目标

- 理解 `/help`、`/clear`、`/model` 这类命令如何接入
- 掌握 prompt command 与本地 command 的区别

### 核心知识点

1. `commands.ts` 命令注册中心
2. command 类型定义
3. 本地 JSX command
4. prompt command
5. 动态 skills command
6. plugin command

### 重点源码

- `claudecode-project/src/commands.ts`
- `claudecode-project/src/types/command.js`
- `claudecode-project/src/commands/help/*`
- `claudecode-project/src/commands/model/*`
- `claudecode-project/src/skills/loadSkillsDir.js`

### 教学表现形式

- 用“前台菜单”和“后厨任务”区分本地命令与 prompt 命令
- 现场实现一个 `/hello`
- 追踪 `/compact` 如何变成特殊工作流

### 实践任务

- 实现 command registry
- 添加 `/help`、`/clear`、`/model`
- 支持动态注册命令

---

## 第 13 章：MCP、插件与 Skills 扩展系统

### 学习目标

- 理解 Claude Code 如何从固定工具扩展到开放生态
- 掌握 MCP 工具、插件命令、skills 命令如何进入主系统

### 核心知识点

1. MCP server config
2. MCP client connection
3. MCP tools/resources
4. `assembleToolPool`
5. plugin command loading
6. bundled skills
7. dynamic skills

### 重点源码

- `claudecode-project/src/services/mcp/*`
- `claudecode-project/src/plugins/*`
- `claudecode-project/src/skills/*`
- `claudecode-project/src/utils/plugins/*`

### 教学表现形式

- 用“USB 外设”类比 MCP：主机不需要提前知道所有设备
- 画内置工具 + MCP 工具合并图
- 比较 command 扩展和 tool 扩展

### 实践任务

- 实现一个简化 plugin loader
- 从插件目录读取工具定义
- 合并进主工具池

---

## 第 14 章：高级系统：远程、子 Agent、压缩、性能与工程化

### 学习目标

- 理解 Claude Code 作为大型产品的复杂工程能力
- 学会从源码中识别性能优化、远程协作、上下文管理等高级设计

### 核心知识点

1. bridge 远程通信
2. remote session
3. AgentTool 子 Agent
4. background tasks
5. compact 与 micro compact
6. session memory
7. LSP feedback
8. telemetry
9. startup profiling

### 重点源码

- `claudecode-project/src/bridge/*`
- `claudecode-project/src/remote/*`
- `claudecode-project/src/tools/AgentTool/*`
- `claudecode-project/src/services/compact/*`
- `claudecode-project/src/services/lsp/*`
- `claudecode-project/src/utils/startupProfiler.js`

### 教学表现形式

- 用专题课形式讲，不强行串成单一路径
- 每个高级系统给一个“为什么需要它”的真实场景
- 引导学习者建立大型源码的取舍意识

### 实践任务

- 实现一个简化 background task
- 给消息历史增加 compact
- 加一个启动耗时 profiler

---

## 95 个知识点清单

说明：课程建议按 **86 个必修知识点 + 9 个进阶知识点** 组织。前 86 个用于主线教学，87-95 用于加餐、项目提高或高级源码专题。

### 架构与入口

1. 项目目录分层
2. 主入口文件定位
3. 调用链阅读法
4. Commander 程序创建
5. CLI argument
6. CLI option
7. preAction hook
8. interactive 与 print 模式分流
9. 顶层副作用与启动性能
10. feature gate

### 初始化与配置

11. memoized init
12. 配置系统启用
13. safe env
14. full env
15. graceful shutdown
16. remote managed settings
17. policy limits
18. 网络代理初始化
19. CA/mTLS 设置
20. fire-and-forget 预加载

### UI 与状态

21. Ink 渲染模型
22. Box/Text 布局
23. 终端输入事件
24. 终端尺寸监听
25. PromptInput
26. Messages 渲染
27. Dialog
28. Spinner
29. AppStateProvider
30. external store
31. selector
32. useSyncExternalStore
33. settings change sync

### REPL 与消息

34. REPL 职责拆分
35. prompt submit
36. command queue
37. message queue
38. cancellation
39. early input
40. UserMessage
41. AssistantMessage
42. SystemMessage
43. ToolResultMessage
44. AttachmentMessage
45. normalizeMessagesForAPI
46. token estimation
47. conversation recovery

### Agent 查询循环

48. AsyncGenerator
49. stream event
50. request start event
51. query loop state
52. model response handling
53. tool_use detection
54. tool_result continuation
55. max turns
56. prompt too long recovery
57. max output tokens recovery
58. auto compact
59. stop hooks
60. terminal transition

### Tool 系统

61. Tool interface
62. tool input schema
63. tool prompt
64. isEnabled
65. isConcurrencySafe
66. ToolUseContext
67. built-in tools
68. tool pool
69. tool dedupe
70. MCP tool merge
71. runTools serial
72. runTools concurrent
73. tool result formatting
74. tool UI

### 权限与安全

75. permission mode
76. allow rule
77. deny rule
78. ask rule
79. workspace directories
80. Bash command semantics
81. destructive command warning
82. file edit permission
83. permission dialog

### 扩展与高级能力

84. slash command
85. plugin command
86. skills command
87. MCP resources
88. bridge session
89. remote session
90. AgentTool
91. background task
92. session memory
93. LSP integration
94. telemetry
95. startup profiler

---

## 每章讲义模板

后续扩展每章时，建议统一使用下面模板：

```markdown
# 第 X 章：标题

## 本章目标

## 先看现象

## 源码地图

## 核心调用链

## 关键源码精读

## 概念解释

## 常见误区

## 实践任务

## 课后作业

## 本章小结
```

---

## 教学风格建议

### 由浅入深

每章按这个顺序推进：

1. 先讲“这个模块解决什么问题”
2. 再讲“用户能看到什么现象”
3. 然后画“调用链”
4. 最后精读“关键源码”

### 表现类型丰富

建议混合使用：

- 架构图：适合讲模块关系
- 调用链：适合讲一次请求如何流动
- 表格：适合比较工具、命令、消息类型
- 类比：适合解释抽象系统
- 小实验：适合把概念落到代码
- 源码注释：适合讲关键函数
- 阶段项目：适合检验掌握程度

### 源码精读原则

- 每章只精读 2-4 个文件
- 先读主路径，再读分支
- 先理解数据流，再理解异常流
- 先看接口，再看实现
- 先做简化复刻，再回看原源码

---

## 最终课程成果

学习者完成课程后，应该能交付：

1. 一份 Claude Code 架构图
2. 一套 14 章学习笔记
3. 一个简化版 AI CLI 框架
4. 至少 3 个可调用工具
5. 一个简化权限系统
6. 一个插件/skills 扩展示例
7. 一篇源码阅读复盘文章
