# 第 1 章：源码全景与学习地图

## 本章定位

本章面向**高级前端开发工程师**。你已经熟悉 TypeScript、React、组件分层、状态管理、工程化和大型前端项目的阅读方式，所以这里不会把重点放在“什么是模块导入”“什么是组件”这类基础知识上。

Claude Code 对高级前端来说真正陌生的地方，通常不是 React 或状态管理，而是这些能力如何被放进一个 AI CLI 产品里：

- CLI 入口如何决定交互模式、非交互模式、远程模式
- Ink/React 终端 UI 如何承载一个长期运行的 Agent 会话
- 用户输入如何被转成消息、进入模型请求、再驱动工具调用
- Tool protocol、权限系统、MCP、插件和 skills 如何串进主链路
- `REPL.tsx` 为什么会成为 UI、状态、命令、权限、模型请求和工具执行的枢纽

所以第 1 章不是“项目简介”，而是给你一张足够实用的源码导航图。学完后，你应该能带着明确问题进入后续章节，而不是在大量文件里随机游走。

> 路径说明：本课程基于当前学习仓库结构，源码位于 `claudecode-project/src/`。如果你阅读的是官方仓库或其他镜像，目录前缀可能不同，但本章讲的模块角色和调用关系仍然适用。

在 14 章主线课中，本章属于第一阶段“建立全局地图”。它保持原课程体系不变，为后续第 2 章 `main.tsx`、第 5 章 `REPL.tsx`、第 8 章 `query.ts`、第 9-11 章工具与权限系统打底。

## 学习目标

完成本章后，你应该能够：

1. 用前端架构视角解释 Claude Code 的核心模块分工。
2. 快速定位 CLI 入口、终端 UI、状态层、Agent 查询循环、工具系统和命令系统的入口文件。
3. 画出“用户输入 -> 消息 -> query -> tool_use -> 工具执行 -> UI 更新”的主链路。
4. 识别 `REPL.tsx` 作为系统枢纽的 3-5 个交叉调用点。
5. 使用 `rg` 在 5 分钟内验证自己对主链路的判断。
6. 明确后续章节应该按“主路径证据链”推进，而不是按目录顺序平铺。

## 前置知识

你不需要补 TypeScript 或 React 基础。本章默认你已经具备：

- 大型前端项目模块拆解经验
- React 容器组件、Hooks、Context、外部 store 的实践经验
- CLI 工程或 Node.js/Bun 运行时的基本理解
- 能熟练使用 `rg`、`find`、`sed`、编辑器跳转定义等代码检索手段

本章会重点补齐你可能相对陌生的部分：

- **Agent loop**：模型不是一次返回就结束，而是可能多轮请求工具、消费工具结果、继续推理。
- **Tool protocol**：工具不是普通函数，它需要 schema、提示词、权限检查、执行上下文、结果消息和 UI 展示。
- **TUI 架构**：Ink 把 React 渲染到终端，前端组件思维还在，但输入、布局、刷新和生命周期会有 CLI 产品特有的问题。
- **安全边界**：AI 可以读写文件、执行命令，权限系统是主链路的一部分，不是附加功能。

## 核心概念讲解

### 1. 不要把它当普通 CLI，也不要只把它当 React App

如果只从 CLI 角度看，Claude Code 像是一个命令行工具；如果只从前端角度看，它又像一个 React 应用。但更准确的心智模型是：

```text
Claude Code = CLI Shell + React TUI + Agent Runtime + Tool Runtime + Extension Host
```

这几个角色同时存在：

- **CLI Shell**：解析参数、启动不同模式、处理登录/恢复/配置等命令。
- **React TUI**：用 Ink 管理输入框、消息列表、弹窗、状态栏、快捷键。
- **Agent Runtime**：把消息送进模型，处理流式响应、多轮继续、上下文压缩。
- **Tool Runtime**：把模型提出的 tool_use 转成真实本地能力调用。
- **Extension Host**：接入 MCP、插件、skills、远程桥接等扩展能力。

对高级前端来说，关键不是“它用了 React”，而是 React 组件树如何和 Agent Runtime 互相咬合。这个咬合点主要发生在 `REPL.tsx`。

### 2. 主链路先于目录树

大型源码阅读最容易犯的错，是先看目录树，然后试图把每个目录都解释清楚。对 Claude Code 更有效的方式是先抓主链路：

```text
命令行启动
  -> main.tsx 解析参数和运行模式
  -> init.ts 初始化配置、策略、环境
  -> REPL.tsx 挂载终端交互界面
  -> PromptInput 接收用户输入
  -> handlePromptSubmit 把输入转成消息
  -> query.ts 发起 Agent 查询循环
  -> 模型返回 assistant 文本或 tool_use
  -> toolOrchestration.ts 调度工具
  -> Tool.ts / tools/* 执行具体能力
  -> tool_result 回到消息流
  -> REPL/Messages 渲染新状态
```

这条链路是你后续读源码的“证据链”。每进入一个新文件，都要问两个问题：

1. 它在这条链路的哪一段？
2. 它把数据交给了谁，或者从谁那里接收数据？

目录树是静态地图，主链路是动态地图。高级工程师读源码要优先建立动态地图。

### 3. 五个核心子系统

第 1 章先把系统压缩成五个子系统，后续章节再展开：

| 子系统 | 前端类比 | 核心入口 | 主要问题 |
| --- | --- | --- | --- |
| 入口系统 | 应用 bootstrap + router guard | `main.tsx`、`entrypoints/init.ts` | 程序以什么模式启动？哪些配置先加载？ |
| 交互系统 | 顶层容器组件 + shell layout | `screens/REPL.tsx`、`components/` | 用户输入、消息展示、弹窗和快捷键如何协作？ |
| 状态与消息系统 | external store + domain model | `state/`、`utils/messages` | 会话状态如何被订阅、更新和转成 API 输入？ |
| Agent 循环系统 | async workflow engine | `query.ts`、`query/` | 模型流式响应、工具调用、多轮继续如何组织？ |
| 工具与扩展系统 | plugin host + capability registry | `Tool.ts`、`tools.ts`、`commands.ts` | 本地能力如何安全暴露给模型和用户？ |

注意，这不是严格分层架构。`REPL.tsx` 会同时连接多个子系统，这恰恰是它的价值：它是交互态系统的协调中心，而不是一个单纯的页面组件。

### 4. `REPL.tsx` 是前端工程师最应该优先理解的枢纽

从前端视角看，`REPL.tsx` 很像一个超大型 smart component，但它的职责比普通页面容器更重。它至少连接了这些方向：

1. **UI 输入方向**：通过 `PromptInput`、键盘处理、命令队列接收用户意图。
2. **状态方向**：通过 `useAppState`、`useSetAppState`、局部 state 维护会话和 UI 状态。
3. **模型方向**：调用 `query()`，消费流式事件，把模型输出变成消息。
4. **工具方向**：把工具池、MCP tools、权限上下文传入查询循环。
5. **权限方向**：展示文件、Bash、MCP、plan mode 等权限请求 UI。
6. **扩展方向**：接入 IDE、remote、skills、plugins、background tasks、voice 等能力。

这也是为什么它看起来“重”。它不是一个应该被简单拆小的普通前端页面，而是终端 Agent 产品的运行时编排层。后续第 5 章会专门拆它，本章先把它标成重点地标。

### 5. 工具系统是 AI CLI 和普通前端应用的最大差异

传统前端应用的动作一般来自用户点击、表单提交、路由跳转。Claude Code 的动作还可能来自模型：

```text
用户：帮我看一下项目结构
  -> 模型决定需要搜索文件
  -> 发出 tool_use: Glob/Grep/Read
  -> 程序检查工具是否可用、是否需要权限
  -> 执行工具并把结果作为 tool_result 返回
  -> 模型继续基于结果回答或发起下一轮工具调用
```

所以 `Tool.ts` 不是一个简单工具函数集合的类型定义。它定义的是模型和本地运行时之间的契约，包括：

- 工具名和描述如何进入模型上下文
- 输入 schema 如何校验模型生成的参数
- 权限系统如何参与执行
- 执行结果如何变成消息
- UI 如何展示工具运行状态
- 哪些工具可以并发，哪些必须串行

这部分会在第 9-11 章成为课程核心。

## 关键源码入口

本章先锁定 9 个核心入口文件。第一遍只需要识别角色，不必逐行读完。

| 文件 | 你应该看什么 | 后续章节 |
| --- | --- | --- |
| `claudecode-project/src/main.tsx` | CLI 参数、运行模式、进入 REPL 或 print 的分流 | 第 2 章 |
| `claudecode-project/src/entrypoints/init.ts` | 配置、环境、远程策略、清理逻辑的初始化顺序 | 第 3 章 |
| `claudecode-project/src/screens/REPL.tsx` | 输入、状态、query、权限、工具池如何聚合 | 第 5 章 |
| `claudecode-project/src/state/AppState.tsx` | external store、Provider、selector hook | 第 6 章 |
| `claudecode-project/src/query.ts` | Agent loop、流式事件、工具调用继续循环 | 第 8 章 |
| `claudecode-project/src/Tool.ts` | 工具抽象、ToolUseContext、权限上下文 | 第 9 章 |
| `claudecode-project/src/tools.ts` | 内置工具池、feature gate、权限过滤、MCP 合并 | 第 10 章 |
| `claudecode-project/src/services/tools/toolOrchestration.ts` | 工具串行/并发调度、tool_use 到 tool_result | 第 10 章 |
| `claudecode-project/src/commands.ts` | slash command 注册、动态命令、skills/plugin command | 第 12 章 |

辅助目录可以先只建立印象：

| 目录 | 本章只需知道 |
| --- | --- |
| `components/` | Ink/React UI 组件，不等于 Web DOM 组件 |
| `hooks/` | 交互、IDE、命令、工具、状态订阅的组合逻辑 |
| `tools/` | 内置工具实现，后续按 Read/Edit/Bash/Agent 等分组读 |
| `commands/` | `/help`、`/clear`、`/model` 等斜杠命令 |
| `services/` | API、MCP、compact、analytics、settings、tool orchestration |
| `bridge/`、`remote/` | 远程与桥接能力，属于高级专题 |
| `plugins/`、`skills/` | 扩展系统，后续第 13 章读 |

## 源码阅读路线

### 路线一：先用命令建立静态地图

在仓库根目录运行：

```bash
find claudecode-project/src -maxdepth 1 -type d | sort
rg --files claudecode-project/src | wc -l
```

这一步只回答两个问题：

1. 一级功能区有哪些？
2. 项目规模大概有多大？

不要在这一步打开所有文件。高级工程师也会被大项目的横向复杂度拖慢，先避免无目的探索。

### 路线二：用 `rg` 验证主链路存在

第一轮验证不追求完全准确，只确认关键符号真实存在：

```bash
rg -n "function.*REPL|const.*REPL|export.*REPL" claudecode-project/src/screens/REPL.tsx
rg -n "handlePromptSubmit" claudecode-project/src
rg -n "export async function\\* query|function\\* query" claudecode-project/src/query.ts
rg -n "runTools\\(" claudecode-project/src
rg -n "getTools\\(|assembleToolPool" claudecode-project/src
```

你要得到的不是最终答案，而是证据链的锚点：

```text
REPL 存在
  -> 输入提交函数存在
  -> query 生成器存在
  -> runTools 调度存在
  -> tools 工具池装配存在
```

### 路线三：按“数据流”打开文件

按下面顺序读，每个文件第一遍只读导入、关键导出、核心函数签名：

1. `main.tsx`：看它引入了哪些启动和渲染能力。
2. `entrypoints/init.ts`：看初始化任务大类，不看每个配置细节。
3. `screens/REPL.tsx`：搜索 `handlePromptSubmit`、`query`、`useAppState`、`PermissionRequest`。
4. `query.ts`：搜索 `query`、`runTools`、`tool_use`、`yield`。
5. `Tool.ts`：搜索 `ToolUseContext`、`ToolPermissionContext`、`Tools`。
6. `tools.ts`：搜索 `getAllBaseTools`、`getTools`、`assembleToolPool`。
7. `commands.ts`：搜索 `getCommands`、`getDynamicSkills`、`getPluginCommands`。

这一路线的目标是把“文件名猜测”升级成“源码证据”。

### 路线四：把源码映射到课程章节

| 源码区域 | 先问的问题 | 深入章节 |
| --- | --- | --- |
| `main.tsx` | CLI 如何分流到不同运行模式？ | 第 2 章 |
| `entrypoints/init.ts` | 哪些初始化必须早于 UI 和 API？ | 第 3 章 |
| `ink/`、`components/` | React 如何渲染到终端？ | 第 4 章 |
| `screens/REPL.tsx` | 用户输入如何驱动 Agent turn？ | 第 5 章 |
| `state/` | 状态如何避免全树重渲染？ | 第 6 章 |
| `utils/messages`、`types/message` | UI 消息如何变成 API 消息？ | 第 7 章 |
| `query.ts` | Agent loop 如何多轮继续？ | 第 8 章 |
| `Tool.ts` | 工具协议包含哪些契约？ | 第 9 章 |
| `tools.ts`、`tools/` | 工具如何注册、过滤、执行？ | 第 10 章 |
| `permissions` | 本地危险能力如何被约束？ | 第 11 章 |
| `commands.ts`、`commands/` | slash command 如何接入？ | 第 12 章 |
| `mcp/`、`plugins/`、`skills/` | 外部能力如何扩展系统？ | 第 13 章 |
| `bridge/`、`remote/`、`AgentTool/` | 复杂产品能力如何接入主链路？ | 第 14 章 |

## 快速验证：5 分钟源码速验

这一节是给有经验开发者的抓手。读完本章后，立刻做一次快速验证。

### 验证 1：确认入口文件存在

```bash
ls claudecode-project/src/main.tsx
ls claudecode-project/src/screens/REPL.tsx
ls claudecode-project/src/query.ts
ls claudecode-project/src/Tool.ts
ls claudecode-project/src/tools.ts
ls claudecode-project/src/commands.ts
```

如果路径不一致，先修正你本地的路径前缀，再继续学习。

### 验证 2：确认用户输入链路的关键符号

```bash
rg -n "handlePromptSubmit" claudecode-project/src
rg -n "PromptInput" claudecode-project/src/screens/REPL.tsx
rg -n "query\\(" claudecode-project/src/screens/REPL.tsx
```

你要确认三件事：

- REPL 渲染或使用了输入组件。
- 输入提交会进入 `handlePromptSubmit` 附近的逻辑。
- REPL 会调用或消费 `query()`。

### 验证 3：确认工具执行链路

```bash
rg -n "runTools\\(" claudecode-project/src/query.ts claudecode-project/src/services/tools
rg -n "runToolUse" claudecode-project/src/services/tools
rg -n "getAllBaseTools|getTools|assembleToolPool" claudecode-project/src/tools.ts
```

你要确认：

- `query.ts` 不是只负责 API 请求，它还会衔接工具调度。
- 工具有统一的 orchestration 层。
- 工具池不是散落调用，而是集中装配、过滤和合并。

### 验证 4：确认权限系统进入主链路

```bash
rg -n "PermissionRequest|useCanUseTool|toolPermissionContext" claudecode-project/src/screens/REPL.tsx claudecode-project/src
```

你要确认权限不是独立设置页，而是和 REPL、工具执行、状态上下文直接相关。

## 教学可视化表达方式

### 1. 高级前端视角的系统分层图

```text
┌──────────────────────────────────────────────┐
│ CLI Bootstrap                                │
│ main.tsx / init.ts                           │
├──────────────────────────────────────────────┤
│ React TUI Container                          │
│ REPL.tsx / PromptInput / Messages / Dialogs  │
├──────────────────────────────────────────────┤
│ State + Domain Events                        │
│ AppState / message model / command queue     │
├──────────────────────────────────────────────┤
│ Agent Runtime                                │
│ query.ts / stream events / compact / hooks   │
├──────────────────────────────────────────────┤
│ Tool Runtime                                 │
│ Tool.ts / tools.ts / toolOrchestration.ts    │
├──────────────────────────────────────────────┤
│ Extension + Remote                           │
│ MCP / plugins / skills / bridge / remote     │
└──────────────────────────────────────────────┘
```

### 2. REPL 枢纽图

```text
                         ┌──────────────┐
                         │  AppState    │
                         └──────┬───────┘
                                │
┌──────────────┐        ┌───────▼───────┐        ┌──────────────┐
│ PromptInput  ├───────►│   REPL.tsx    ├───────►│   query.ts   │
└──────────────┘        └───┬───────┬───┘        └──────┬───────┘
                            │       │                   │
                    ┌───────▼───┐   │            ┌──────▼──────┐
                    │ Commands  │   │            │ runTools     │
                    └───────────┘   │            └──────┬──────┘
                                    │                   │
                              ┌─────▼─────┐      ┌──────▼──────┐
                              │ Permission│      │ Tool Runtime │
                              └───────────┘      └─────────────┘
```

这张图要传达一个判断：`REPL.tsx` 的复杂度不是偶然的，它负责把用户交互态和 Agent 执行态接起来。

### 3. 工具协议图

```text
Model tool_use
  -> name + input
  -> findToolByName
  -> inputSchema.safeParse
  -> canUseTool / permission context
  -> runToolUse
  -> tool_result message
  -> query continues
```

这个图可以提前建立第 9-11 章的心智模型。

## 实践任务

### 任务 1：建立 10 个入口文件清单

产出一个表格，记录 10 个入口文件：

```markdown
| 文件 | 我认为它负责什么 | 后续要验证的问题 |
| --- | --- | --- |
| `src/main.tsx` | CLI 启动与模式分流 | `--print` 在哪里进入非交互路径？ |
```

要求：不能只复制本章表格，必须补一列“后续要验证的问题”。

### 任务 2：追踪 REPL 的 5 个交叉点

在 `REPL.tsx` 中搜索并记录这些符号附近的代码位置：

```bash
rg -n "PromptInput|handlePromptSubmit|query\\(|useAppState|PermissionRequest|useMergedTools|useMergedCommands" claudecode-project/src/screens/REPL.tsx
```

产出：

- 输入组件在哪里接入？
- 状态在哪里读取？
- query 在哪里被调用或消费？
- 权限 UI 在哪里接入？
- 工具池/命令池在哪里进入 REPL？

记录函数名或行号即可，不需要本章深入解释全部实现。

### 任务 3：画真实调用证据链

基于 `rg` 结果，画一条带文件名的证据链：

```text
PromptInput
  -> REPL.tsx: ...
  -> handlePromptSubmit: ...
  -> query.ts: ...
  -> toolOrchestration.ts: ...
  -> Tool.ts / tools.ts: ...
```

要求每一段都能对应到一个真实文件或符号，不写纯猜测。

### 任务 4：高级可选任务：找出一个设计张力

从下面任选一个问题，写 200-300 字分析：

- 为什么 `REPL.tsx` 很难保持“小而美”？
- 为什么工具系统不能只是普通函数列表？
- 为什么权限系统必须进入工具主链路，而不能只放在设置页？
- 为什么 `main.tsx` 在真实产品里会承担大量启动分流？

这个任务的目的，是训练你从源码结构反推产品和工程约束。

### 任务 5：写第 1 章学习笔记

建议创建：

```text
learning-framework/docs/notes/ch01-source-map.md
```

包含：

- 我理解的 Claude Code 主链路
- 10 个入口文件和验证问题
- REPL 的 5 个交叉点
- 我发现的 1 个设计张力
- 下一章要重点验证的 `main.tsx` 问题

## 常见误区

### 误区 1：把 `REPL.tsx` 当作普通页面组件评价

高级前端很容易看到大组件就本能想拆。但在这里要先问：它是不是承担了运行时协调职责？`REPL.tsx` 同时连接输入、状态、query、权限、工具池、命令池、远程和后台任务，它更像交互运行时的 coordinator。是否应该拆，是后续重构问题；第一遍阅读先理解它为什么会重。

### 误区 2：只看静态目录，不看调用证据

目录名会告诉你“可能是什么”，但不会告诉你“运行时怎么走”。本章要求用 `rg` 验证，是为了避免停留在架构猜测。高级工程师读源码，应该尽快把猜测变成证据链。

### 误区 3：低估工具系统的协议复杂度

如果把工具理解成 `tools.map(fn => fn())`，后面会看不懂权限、schema、tool_result、并发调度和 UI 展示为什么要分散在多个文件。工具系统本质上是模型和本地能力之间的协议层。

### 误区 4：过早深入高级扩展

MCP、plugins、skills、bridge、remote 都很有吸引力，但它们是主链路上的扩展点。先理解本地交互主链路和工具主链路，再看扩展系统，会快很多。

### 误区 5：把 `main.tsx` 的复杂度理解为“入口写乱了”

真实 CLI 产品的入口通常会承担参数解析、模式分流、配置预热、登录状态、远程状态、兼容路径等职责。第 2 章会拆解它的结构，第一章先不要急着用普通前端入口文件的标准评价它。

## 本章总结

第 1 章的重点不是把 Claude Code 讲完，而是让你获得一个可以继续深入的心智模型：

```text
main.tsx 启动和分流
  -> init.ts 准备运行环境
  -> REPL.tsx 承载交互运行时
  -> AppState / messages 维护会话状态
  -> query.ts 驱动 Agent loop
  -> Tool.ts / tools.ts / toolOrchestration.ts 连接模型和本地能力
  -> commands / MCP / plugins / skills 提供扩展入口
```

对高级前端开发工程师来说，本章最重要的结论是：

1. Claude Code 不是普通 CLI，也不是普通 React App，而是一个终端 Agent Runtime。
2. `REPL.tsx` 是理解系统的关键枢纽，后续要重点追踪它的交叉调用点。
3. 工具系统是 AI CLI 的核心差异，后续要按协议层而不是普通函数层理解。
4. 每个架构判断都要用源码符号和调用链验证。

请带着这句话进入后续章节：**先建立证据链，再评价架构；先理解主路径，再讨论拆分和优化。**

## 下一章衔接

第 2 章会进入 `main.tsx`，重点不再是“它很大”，而是拆解它为什么大、如何分层阅读：

- 顶层导入和启动预热做了什么
- Commander.js 如何定义 CLI 参数和 action
- `preAction` 为什么承载初始化逻辑
- 交互模式、`--print` 非交互模式、特殊子命令如何分流
- model、session、permission 等参数如何进入后续运行时

如果第 1 章是地图，第 2 章就是从地图上的第一个入口正式进城。
