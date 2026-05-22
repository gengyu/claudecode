# 第 5 章：REPL 主交互界面源码导读

## 本章定位

第 5 章进入 Claude Code 交互模式的核心：`src/screens/REPL.tsx`。前 4 章已经完成这条链路：

```text
main.tsx
  -> preAction
  -> init()
  -> launchRepl()
  -> <App><REPL /></App>
```

第 4 章只讲终端 UI 如何挂起来。本章开始看这个 UI 为什么能成为一个 Agent runtime：它接收输入、维护消息、处理队列、调用 query、展示权限弹窗、响应中断、连接 IDE/remote/voice/background tasks。

对高级前端工程师来说，`REPL.tsx` 不应该被简单评价为“巨型组件”。更准确的定位是：**交互式 AI CLI 的 runtime coordinator**。它连接了 UI 层、状态层、消息层、query 层、tool 层、permission 层和扩展层。

本章保持 `SYSTEMATIC_COURSE.md` 第 5 章主题不变，覆盖这些知识点：

1. REPL 组件职责边界
2. 用户输入提交
3. 消息队列处理
4. query 调用
5. tool permission UI
6. 中断与取消
7. IDE/remote/voice 等能力接入点
8. 后台任务与子会话

路径校正：课程蓝图中提到的 `utils/handlePromptSubmit.js` 和 `hooks/useQueueProcessor.js`，当前源码实际文件是：

```text
claudecode-project/src/utils/handlePromptSubmit.ts
claudecode-project/src/hooks/useQueueProcessor.ts
```

本章会用真实源码路径讲解。

## 面向高级前端工程师的学习价值

你可以把 `REPL.tsx` 类比成一个复杂前端应用里的 app shell + controller + workflow host，但它比 Web 页面更难：

| 高级前端熟悉的模式 | REPL 中的对应点 |
| --- | --- |
| Smart component / container | `REPL` 聚合输入、消息、状态、query、权限 |
| 表单提交 | `PromptInput -> onSubmit -> handlePromptSubmit` |
| 异步请求状态 | `QueryGuard`、`isLoading`、abort controller、stream state |
| 消息列表 | `messages`、`messagesRef`、`Messages`、deferred messages |
| 命令队列 | `useCommandQueue`、`useQueueProcessor`、module-level queue |
| Modal/permission | `PermissionRequest`、sandbox queue、prompt queue |
| 外部集成 | IDE、remote、bridge、background tasks、agent tasks |

AI CLI 的差异在于：用户一次输入并不只是一次请求。它可能触发 slash command、本地 JSX UI、远程发送、队列等待、工具权限请求、多轮 query、tool_result 回流、后台 agent 或 compact。REPL 必须把这些状态协调在一个终端会话里。

## 学习目标

完成本章后，你应该能够：

1. 用源码证明 `REPL.tsx` 是输入、消息、query、权限、队列的交汇点。
2. 追踪 `PromptInput -> onSubmit -> handlePromptSubmit -> processUserInput -> onQuery -> query()` 主链路。
3. 解释 `QueryGuard` 为什么要在 `handlePromptSubmit` 和 `onQuery` 两层参与并发控制。
4. 找到消息状态如何通过 `setMessages`、`messagesRef`、`deferredMessages`、`Messages` 渲染到终端。
5. 找到 tool permission UI 如何从 `toolUseConfirmQueue` 渲染为 `PermissionRequest`。
6. 说明队列系统如何用 `useCommandQueue` 和 `useQueueProcessor` 在 query 空闲后继续处理输入。
7. 在 `learning-framework` 中复刻一个简化 REPL：输入、消息追加、query guard、队列、模拟 query、权限占位。

## 前置知识

本章默认你已经理解：

- 第 4 章的 TUI 挂载链路：`launchRepl -> App -> REPL`
- React hooks、ref、memo、external store、异步请求状态
- CLI 输入和终端 UI 与 Web DOM 事件模型不同
- AI CLI 的模型 turn 可能包含多轮工具调用

本章不会重复讲：

- React 组件语法
- Ink `Box`/`Text` 基础
- Commander/初始化细节
- query 内部实现
- tool protocol 细节

query 和 tool 的内部机制会在第 8-10 章深入。本章只看 REPL 如何把输入送进去、把事件接出来。

## 核心概念讲解

### 1. REPL 为什么存在：交互式 Agent runtime 的协调器

源码锚点：

```bash
rg -n "export function REPL|function REPL|type Props|initialMessages|onBeforeQuery|PromptInput|Messages|query\\(" claudecode-project/src/screens/REPL.tsx
```

REPL 的角色不是“显示一个聊天页面”。它至少承担这些职责：

- 接收第 2 章 `main.tsx` 传入的 commands、tools、MCP clients、initialMessages。
- 接收第 4 章 App Provider 提供的 AppState store。
- 维护本地消息数组、loading 状态、streaming 状态、tool JSX、permission queues。
- 处理用户输入、slash command、remote mode、queued command。
- 调用 `query()` 并消费 stream events。
- 显示权限弹窗、sandbox 请求、prompt 请求。
- 和 IDE、remote、background tasks、agent view 等系统互通。

它存在的工程问题是：交互式 Agent turn 的状态太多，不能散落在多个叶子组件里。

### 2. 输入提交不是直接调用 query

主链路：

```text
PromptInput
  -> REPL.onSubmit
  -> handlePromptSubmit
  -> executeUserInput
  -> processUserInput
  -> onQuery
  -> onQueryImpl
  -> query()
```

源码锚点：

```bash
rg -n "const onSubmit|await handlePromptSubmit|executeUserInput|processUserInput|const onQuery|const onQueryImpl|for await \\(const event of query" claudecode-project/src/screens/REPL.tsx claudecode-project/src/utils/handlePromptSubmit.ts
```

为什么要拆这么多层：

- `onSubmit` 处理 UI 侧问题：历史、stash、remote mode、immediate local JSX command、placeholder、input 清理。
- `handlePromptSubmit` 处理输入执行策略：空输入、exit、paste refs、slash command、loading 时入队、interrupt。
- `executeUserInput` 统一 direct input 和 queued input：都变成 `QueuedCommand[]`。
- `processUserInput` 把文本/命令/bash/附件变成 messages 和 shouldQuery。
- `onQuery` 负责并发 guard、append messages、调用 query runtime。

高级前端容易想把它看成“submit handler 太长”，但这里实际是多个运行时边界叠在一起。

### 3. 消息状态需要同步 ref 和 React state

源码锚点：

```bash
rg -n "const \\[messages|messagesRef|rawSetMessages|const setMessages|useDeferredValue\\(messages\\)|displayedMessages|<Messages" claudecode-project/src/screens/REPL.tsx
```

REPL 中消息不是简单 `useState`。你会看到：

- `messages`
- `messagesRef`
- `rawSetMessages`
- 包装后的 `setMessages`
- `deferredMessages`
- `displayedMessages`

为什么存在：

- query stream、tool event、permission dialog、queue processor 都可能需要读最新消息。
- React state 更新有调度延迟，某些逻辑需要同步 ref。
- 长消息列表渲染需要 `useDeferredValue` 降低 UI jank。
- `Messages` 组件会根据 loading/streaming 状态选择显示同步或 deferred messages。

这部分是第 6 章 AppState 和第 7 章 Message 模型的过渡点。

### 4. QueryGuard 是交互式并发边界

源码锚点：

```bash
rg -n "QueryGuard|queryGuard\\.reserve|queryGuard\\.tryStart|queryGuard\\.end|queryGuard\\.cancelReservation|queryGuard\\.isActive" claudecode-project/src/screens/REPL.tsx claudecode-project/src/utils/handlePromptSubmit.ts claudecode-project/src/hooks/useQueueProcessor.ts
```

REPL 中有两类并发风险：

1. 用户在模型还没完成时继续提交输入。
2. 队列 processor 在 query 刚开始/刚结束边界重复触发。

所以 `handlePromptSubmit` 会在执行输入前 `queryGuard.reserve()`，`onQuery` 会 `tryStart()`，结束时 `end()`，异常/跳过时 `cancelReservation()`。

这不是普通 loading boolean 可以解决的问题，因为状态要区分：

```text
idle
  -> dispatching / reserved
  -> running
  -> idle
```

### 5. 队列系统让输入在 busy 状态下不丢失

源码锚点：

```bash
rg -n "useCommandQueue|getCommandQueueSnapshot|subscribeToCommandQueue|useQueueProcessor|processQueueIfReady|enqueue\\(" claudecode-project/src/hooks/useCommandQueue.ts claudecode-project/src/hooks/useQueueProcessor.ts claudecode-project/src/utils/handlePromptSubmit.ts claudecode-project/src/utils/messageQueueManager.ts
```

当 `queryGuard.isActive` 或 external loading 时，prompt/bash 输入会进入 queue。`useQueueProcessor` 订阅 query guard 和 command queue，在条件满足时触发处理。

主链路：

```text
busy submit
  -> handlePromptSubmit
  -> enqueue(...)
  -> useCommandQueue updates UI
  -> useQueueProcessor observes idle
  -> processQueueIfReady
  -> executeQueuedInput
  -> handlePromptSubmit({ queuedCommands })
```

设计意图：

- 用户不需要等当前 turn 完全结束才能输入下一条。
- task notification、proactive message、human prompt 可以按 priority 排队。
- React context 传播不可靠时，`useSyncExternalStore` 直接订阅 module-level queue。

### 6. Permission UI 是 tool runtime 的交互暂停点

源码锚点：

```bash
rg -n "toolUseConfirmQueue|PermissionRequest|focusedInputDialog|sandboxPermissionRequestQueue|promptQueue|setToolUseConfirmQueue" claudecode-project/src/screens/REPL.tsx
```

工具权限不是设置页里的静态开关，而是 query/tool runtime 中的交互暂停点：

```text
query/tool wants permission
  -> queue permission request
  -> REPL renders PermissionRequest / SandboxPermissionRequest
  -> user approves/rejects
  -> tool execution continues or fails
```

REPL 要处理多个输入焦点：PromptInput、permission dialog、sandbox dialog、prompt queue、local JSX command。第 11 章会深入权限规则，本章先确认 UI 协调边界。

### 7. Remote、IDE、voice、background tasks 是 REPL 的扩展接入点

源码锚点：

```bash
rg -n "useRemoteSession|useDirectConnect|useSSHSession|useIDEIntegration|useMailboxBridge|useBackgroundTaskNavigation|useSessionBackgrounding|onAgentSubmit|activeRemote|remoteSession" claudecode-project/src/screens/REPL.tsx
```

这些能力不是第 5 章要全部讲完，但你要知道它们为什么出现在 REPL：

- remote session 改变输入发送路径。
- IDE integration 改变上下文和 diff 行为。
- background tasks / agent tasks 改变消息来源和视图。
- voice / bridge 可能绕过普通 PromptInput。

REPL 是这些交互通道的汇合点。第 14 章会回到高级系统。

## 核心源码地图

| 文件 | 本章看什么 | 本章不看什么 | 后续章节 |
| --- | --- | --- | --- |
| `claudecode-project/src/screens/REPL.tsx` | 输入、消息、query、permission、queue 的协调边界 | 每个 remote/voice/agent 分支细节 | 第 6-14 章都会回看 |
| `claudecode-project/src/utils/handlePromptSubmit.ts` | 输入执行策略、队列、executeUserInput、processUserInput 边界 | `processUserInput` 内部完整解析 | 第 7、12 章继续 |
| `claudecode-project/src/hooks/useQueueProcessor.ts` | query idle 后处理队列的条件 | messageQueueManager 具体优先级实现 | 第 12、14 章继续 |
| `claudecode-project/src/hooks/useCommandQueue.ts` | UI 订阅队列快照 | 队列数据结构全部实现 | 第 12 章继续 |
| `claudecode-project/src/utils/messageQueueManager.ts` | enqueue/snapshot/subscribe 入口 | 所有队列细则 | 第 12 章 |
| `claudecode-project/src/utils/QueryGuard.ts` | 并发 guard 状态机 | 具体实现细节可选 | 第 8 章 query 时回看 |
| `claudecode-project/src/query.ts` | REPL 调用 query 的出口 | query loop 内部 | 第 8 章深入 |
| `claudecode-project/src/components/permissions/PermissionRequest.tsx` | tool permission UI 的渲染入口 | 权限规则计算 | 第 11 章深入 |

## 主调用链 / 主数据流

### 用户输入主链路

```text
PromptInput
  -> onSubmit(input, helpers)
  -> immediate local-jsx command check
  -> history/stash/input cleanup
  -> awaitPendingHooks()
  -> handlePromptSubmit(...)
  -> executeUserInput(...)
  -> processUserInput(...)
  -> onQuery(newMessages, abortController, shouldQuery, allowedTools, model)
  -> onQueryImpl(...)
  -> query(...)
  -> onQueryEvent(event)
  -> setMessages / streaming state / spinner / tool UI
```

### busy 输入队列链路

```text
onSubmit while query active
  -> handlePromptSubmit sees queryGuard.isActive
  -> enqueue({ value, mode, pastedContents })
  -> useCommandQueue updates queued UI
  -> useQueueProcessor sees query idle and no blocking JSX UI
  -> processQueueIfReady
  -> executeQueuedInput
  -> handlePromptSubmit({ queuedCommands })
```

### permission UI 链路

```text
query/tool runtime
  -> canUseTool / permission request
  -> toolUseConfirmQueue
  -> focusedInputDialog === 'tool-permission'
  -> <PermissionRequest ... />
  -> onDone / onReject
  -> queue shift
  -> tool continues or rejects
```

### message render 链路

```text
query stream event
  -> onQueryEvent
  -> handleMessageFromStream / create messages
  -> setMessages wrapper updates messagesRef synchronously
  -> deferredMessages / displayedMessages
  -> <Messages ... />
```

## 源码阅读路线

### 路线一：定位 REPL 的五个角色

阅读目标：把 REPL 拆成输入员、调度员、记录员、渲染员、守门员。

```bash
rg -n "PromptInput|handlePromptSubmit|const onQuery|for await \\(const event of query|setMessages|PermissionRequest|useQueueProcessor" claudecode-project/src/screens/REPL.tsx
```

应该看到：

- `PromptInput` 和 `onSubmit`
- `handlePromptSubmit`
- `onQuery/onQueryImpl/query`
- `setMessages`
- `PermissionRequest`
- `useQueueProcessor`

形成判断：

REPL 的复杂度来自多个 runtime 角色集中，不是单纯 UI 代码膨胀。

### 路线二：追踪 submit 到 query

阅读目标：确认输入不是直接 query。

```bash
rg -n "const onSubmit|await handlePromptSubmit" claudecode-project/src/screens/REPL.tsx
rg -n "export async function handlePromptSubmit|executeUserInput|processUserInput|await onQuery" claudecode-project/src/utils/handlePromptSubmit.ts
rg -n "const onQueryImpl|const onQuery|for await \\(const event of query" claudecode-project/src/screens/REPL.tsx
```

应该看到：

- REPL `onSubmit` 调用 `handlePromptSubmit`
- `handlePromptSubmit` 进入 `executeUserInput`
- `executeUserInput` 调 `processUserInput`
- `onQuery` 最终进入 `query()`

形成判断：

输入处理被拆成 UI side effects、input processing、query runtime 三层。

### 路线三：追踪消息状态

阅读目标：理解为什么需要 state + ref + deferred。

```bash
rg -n "const \\[messages|messagesRef|rawSetMessages|const setMessages|useDeferredValue\\(messages\\)|displayedMessages|<Messages" claudecode-project/src/screens/REPL.tsx
```

应该看到：

- `messages` state
- `messagesRef`
- wrapped `setMessages`
- `deferredMessages`
- `displayedMessages`
- `<Messages ... />`

形成判断：

长会话和 streaming 场景下，消息状态既要实时可读，也要避免 UI 抖动。

### 路线四：追踪队列系统

阅读目标：确认 busy 输入如何排队。

```bash
rg -n "enqueue\\(|queryGuard\\.isActive|queuedCommands|executeQueuedInput" claudecode-project/src/utils/handlePromptSubmit.ts claudecode-project/src/screens/REPL.tsx
rg -n "useQueueProcessor|processQueueIfReady|useSyncExternalStore" claudecode-project/src/hooks/useQueueProcessor.ts
rg -n "useCommandQueue|getCommandQueueSnapshot|subscribeToCommandQueue" claudecode-project/src/hooks/useCommandQueue.ts
```

应该看到：

- active query 时 enqueue
- queue processor 订阅 guard 和 queue
- idle 后处理 queued input

形成判断：

队列是 REPL 的交互连续性保障。

### 路线五：追踪权限弹窗

阅读目标：确认 permission UI 是 runtime 中断点。

```bash
rg -n "toolUseConfirmQueue|PermissionRequest|focusedInputDialog|setToolUseConfirmQueue|sandboxPermissionRequestQueue" claudecode-project/src/screens/REPL.tsx
```

应该看到：

- queue state
- focused dialog 判断
- `PermissionRequest` 渲染
- queue shift / reject handler

形成判断：

权限不是独立设置模块，而是 REPL 的 runtime UI 分支。

## 5 分钟源码速验

### 验证 1：真实文件路径

```bash
rg --files claudecode-project/src | rg "handlePromptSubmit|useQueueProcessor|useCommandQueue"
```

确认当前源码是 `.ts` 文件，不是蓝图里的 `.js` 路径。

### 验证 2：submit 主链路

```bash
rg -n "const onSubmit|await handlePromptSubmit|executeUserInput|processUserInput|for await \\(const event of query" claudecode-project/src/screens/REPL.tsx claudecode-project/src/utils/handlePromptSubmit.ts
```

确认从 UI submit 到 query 的关键符号都存在。

### 验证 3：QueryGuard

```bash
rg -n "QueryGuard|queryGuard\\.reserve|queryGuard\\.tryStart|queryGuard\\.end|queryGuard\\.cancelReservation" claudecode-project/src/screens/REPL.tsx claudecode-project/src/utils/handlePromptSubmit.ts claudecode-project/src/hooks/useQueueProcessor.ts
```

确认并发控制不是单个 `isLoading`。

### 验证 4：队列系统

```bash
rg -n "enqueue\\(|useQueueProcessor|processQueueIfReady|useCommandQueue" claudecode-project/src/screens/REPL.tsx claudecode-project/src/utils/handlePromptSubmit.ts claudecode-project/src/hooks/useQueueProcessor.ts claudecode-project/src/hooks/useCommandQueue.ts
```

确认 busy 输入会进入统一队列，空闲后再消费。

### 验证 5：permission UI

```bash
rg -n "PermissionRequest|toolUseConfirmQueue|focusedInputDialog" claudecode-project/src/screens/REPL.tsx
```

确认 tool permission UI 在 REPL 内渲染。

### 验证 6：消息渲染

```bash
rg -n "messagesRef|deferredMessages|displayedMessages|<Messages" claudecode-project/src/screens/REPL.tsx
```

确认消息状态到 UI 渲染的桥。

## 关键模块逐段导读

### 1. `REPL.tsx` props 和初始化区：接收 runtime 上下文

运行时职责：

```text
main.tsx / launchRepl
  -> replProps
  -> REPL initialMessages / commands / initialTools / mcpClients / thinkingConfig
```

设计意图：

- `main.tsx` 完成启动分流和上下文组装。
- `REPL` 不再解析 CLI 参数，而是接收已准备好的 runtime inputs。
- 这让 REPL 专注交互态运行。

### 2. 消息状态区：记录员

运行时职责：

```text
initialMessages
  -> messages state
  -> messagesRef sync
  -> deferredMessages
  -> displayedMessages
  -> Messages
```

设计意图：

- 同步 ref 给异步回调读最新消息。
- deferred value 减少 streaming 时渲染压力。
- displayedMessages 根据 loading/agent view/transcript 状态切换。

### 3. tool JSX 和 permission queues：守门员

运行时职责：

```text
toolJSX
toolUseConfirmQueue
sandboxPermissionRequestQueue
promptQueue
focusedInputDialog
  -> dialog / overlay / PermissionRequest
```

设计意图：

- local JSX command、tool UI、permission request 都可能临时占用输入区域。
- REPL 必须决定 PromptInput 是否隐藏、哪个 dialog 获得焦点。
- 权限和工具 UI 是 query/tool runtime 的一部分。

### 4. `getToolUseContext`：REPL 到 Tool runtime 的上下文构造器

运行时职责：

```text
messages + newMessages + abortController + model
  -> ProcessUserInputContext / ToolUseContext
  -> tools / commands / mcpClients / permissions / app state accessors
```

设计意图：

- query/tool 需要读取最新 app state、tools、MCP clients。
- permission dialog、background task、slash command 也需要相同上下文。
- 这个函数是 REPL 和 tool/query 系统的重要桥。

### 5. `onSubmit`：输入员

运行时职责：

```text
PromptInput submit
  -> immediate command check
  -> history/stash/input cleanup
  -> remote mode branch
  -> awaitPendingHooks
  -> handlePromptSubmit
```

设计意图：

- UI 相关副作用留在 REPL：清空输入、历史、stash、placeholder。
- 输入执行策略交给 `handlePromptSubmit`。
- remote mode 可以绕过本地 query，把输入发给远程。

### 6. `handlePromptSubmit`：调度员

运行时职责：

```text
input
  -> validate / expand pasted refs
  -> local-jsx command
  -> active query ? enqueue : execute
  -> executeUserInput
```

设计意图：

- direct input 和 queued input 最终走同一执行 loop。
- loading 时不丢输入。
- immediate command 可以在 busy 时执行局部 UI。

### 7. `executeUserInput` + `processUserInput`：把输入变成消息

运行时职责：

```text
QueuedCommand[]
  -> queryGuard.reserve()
  -> processUserInput(...)
  -> newMessages / shouldQuery / allowedTools / model / nextInput
  -> onQuery(...)
```

设计意图：

- slash command、bash mode、plain prompt、附件统一处理。
- 第一条 command 带完整附件/IDE context，后续 queued commands 避免重复上下文。
- skill/frontmatter 可以影响 allowedTools/model/effort。

### 8. `onQuery` + `onQueryImpl`：进入 Agent runtime

运行时职责：

```text
newMessages
  -> queryGuard.tryStart()
  -> append messages
  -> prepare systemPrompt/userContext/toolUseContext
  -> for await query(...)
  -> onQueryEvent(...)
```

设计意图：

- queryGuard 防止并发 turn。
- setMessages 要先追加用户消息，UI 及时反馈。
- query 前准备 tools、MCP、system/user context。
- stream events 逐步驱动 UI。

### 9. `useQueueProcessor`：空闲后续跑

运行时职责：

```text
useSyncExternalStore(queryGuard)
useSyncExternalStore(commandQueue)
  -> if idle and no local JSX
  -> processQueueIfReady
```

设计意图：

- queue 是 module-level store，不依赖 React context。
- query idle 后自动消费，避免用户手动重试。
- local JSX UI 打开时不抢焦点处理队列。

## 与前后章节的关系

### 承接第 4 章

第 4 章确认 REPL UI 已经挂载。本章解释这个 UI 如何运行：

```text
PromptInput exists
  -> onSubmit
Messages exists
  -> setMessages / displayedMessages
Dialog slots exist
  -> PermissionRequest / sandbox request
Spinner exists
  -> query/tool progress
```

### 连接第 6 章 AppState

REPL 大量使用 store、setAppState、getAppState、toolPermissionContext。第 6 章会拆外部 store 和 selector，本章只看 REPL 如何消费它。

### 连接第 7 章 Message

本章看到消息被创建和追加，但不解释所有 message 类型。第 7 章会讲 UserMessage、AssistantMessage、SystemMessage、ToolResultMessage 如何组织和 normalize。

### 连接第 8 章 query

本章只追踪到 `query(...)` 调用和 stream event 消费。第 8 章会进入 query loop 内部。

### 连接第 9-11 章 tool/permission

本章看到 `getToolUseContext` 和 `PermissionRequest`。Tool 抽象、工具池、权限规则会在第 9-11 章深入。

### 连接第 12-14 章 command/MCP/remote

slash command、queue、remote session、agent/background tasks 在 REPL 中都有入口。后续章节会逐个拆。

## 教学可视化表达方式

### 1. REPL 五角色图

```text
REPL.tsx
  ├─ 输入员：PromptInput / onSubmit
  ├─ 调度员：handlePromptSubmit / useQueueProcessor
  ├─ 记录员：messages / messagesRef / setMessages
  ├─ 渲染员：Messages / Spinner / toolJSX
  └─ 守门员：PermissionRequest / sandbox / prompt queues
```

### 2. submit 到 query 图

```text
PromptInput
  -> onSubmit
  -> handlePromptSubmit
  -> executeUserInput
  -> processUserInput
  -> onQuery
  -> onQueryImpl
  -> query
  -> onQueryEvent
  -> setMessages / UI state
```

### 3. busy queue 图

```text
query running
  -> user submits next prompt
  -> enqueue
  -> PromptInputQueuedCommands shows queue
  -> query ends
  -> useQueueProcessor wakes
  -> processQueueIfReady
  -> execute queued prompt
```

### 4. permission pause 图

```text
tool wants permission
  -> toolUseConfirmQueue
  -> focusedInputDialog
  -> PermissionRequest
  -> approve/reject
  -> tool result / rejection
  -> query continues
```

## 实践任务

### 任务 1：画 REPL 五角色源码表

使用：

```bash
rg -n "PromptInput|handlePromptSubmit|setMessages|Messages|PermissionRequest|useQueueProcessor|query\\(" claudecode-project/src/screens/REPL.tsx
```

产出格式：

```markdown
| 角色 | 源码符号 | 行号 | 为什么属于这个角色 |
| --- | --- | --- | --- |
| 输入员 | `PromptInput` | ... | ... |
```

### 任务 2：追踪 submit 到 query 证据链

使用：

```bash
rg -n "const onSubmit|await handlePromptSubmit" claudecode-project/src/screens/REPL.tsx
rg -n "executeUserInput|processUserInput|await onQuery" claudecode-project/src/utils/handlePromptSubmit.ts
rg -n "for await \\(const event of query" claudecode-project/src/screens/REPL.tsx
```

产出：

```text
PromptInput -> onSubmit line ...
  -> handlePromptSubmit line ...
  -> executeUserInput line ...
  -> processUserInput line ...
  -> onQuery line ...
  -> query line ...
```

### 任务 3：记录 QueryGuard 状态边界

使用：

```bash
rg -n "queryGuard\\.reserve|queryGuard\\.tryStart|queryGuard\\.end|queryGuard\\.cancelReservation|queryGuard\\.isActive" claudecode-project/src/screens/REPL.tsx claudecode-project/src/utils/handlePromptSubmit.ts claudecode-project/src/hooks/useQueueProcessor.ts
```

产出：

```markdown
| 方法 | 出现位置 | 状态含义 | 解决的问题 |
| --- | --- | --- | --- |
| `reserve` | ... | ... | ... |
```

### 任务 4：分析队列系统

使用：

```bash
rg -n "enqueue\\(|useCommandQueue|useQueueProcessor|processQueueIfReady|getCommandQueueSnapshot" claudecode-project/src
```

产出：

```markdown
## Queue flow

1. 入队位置：...
2. UI 订阅位置：...
3. 消费条件：...
4. 为什么不用普通 React state：...
```

### 任务 5：分析 permission UI

使用：

```bash
rg -n "toolUseConfirmQueue|PermissionRequest|focusedInputDialog|SandboxPermissionRequest|promptQueue" claudecode-project/src/screens/REPL.tsx
```

产出：

```markdown
## Permission UI flow

1. 队列状态：...
2. 焦点选择：...
3. 渲染组件：...
4. approve/reject 后如何恢复：...
```

### 任务 6：learning-framework 复刻任务

在 `learning-framework` 中实现简化 REPL：

建议文件：

```text
learning-framework/src/screens/REPL.tsx
learning-framework/src/utils/handlePromptSubmit.ts
learning-framework/src/hooks/useQueueProcessor.ts
learning-framework/src/utils/QueryGuard.ts
```

要求：

- PromptInput submit 后追加 user message。
- 模拟 `query()` 延迟 1 秒返回 assistant message。
- query 运行中再次输入时进入 queue。
- query 结束后自动消费 queue。
- 增加一个模拟 permission request：输入 `/needs-permission` 时展示确认 UI。
- 支持 cancel 当前 query。

产出：

```markdown
## 简化 REPL 复刻说明

1. 我实现的 REPL 五角色：...
2. 我如何处理 query busy：...
3. 我如何处理 queued input：...
4. 我如何模拟 permission UI：...
5. 和 Claude Code 原源码相比省略了什么：...
```

### 任务 7：进阶分析题

任选一题，写 400-600 字：

1. 为什么 `REPL.tsx` 不适合第一眼就按“拆组件”来评价？
2. `QueryGuard` 相比 `isLoading` 解决了哪些竞态？
3. 为什么 direct input 和 queued input 最终要走同一个 `executeUserInput`？
4. 为什么 permission UI 必须在 REPL 层协调，而不能完全放在 tool 内部？
5. REPL 同时处理 remote/IDE/background tasks，会带来哪些架构张力？

## 常见误区

### 误区 1：把 REPL 当普通页面容器

高级前端很容易看到大组件就想拆。但 REPL 是 runtime coordinator，先理解它连接了哪些状态机，再讨论拆分边界。

### 误区 2：认为 onSubmit 应该直接调用 query

直接调用 query 会绕过 slash command、paste refs、queue、remote mode、history、stash、interrupt、permission context 等边界。

### 误区 3：把 QueryGuard 当成 loading boolean

QueryGuard 需要处理 reserve、running、end、cancelReservation 等过渡状态。普通 boolean 无法表达 dispatching 和 race。

### 误区 4：把队列当 UI 小功能

队列是交互连续性的核心。Agent turn 可能很长，没有队列，用户输入、task notification、proactive event 都容易丢或乱序。

### 误区 5：把权限弹窗当设置项

权限是 tool runtime 中的暂停点。REPL 必须协调焦点、输入隐藏、dialog 渲染、approve/reject 恢复。

### 误区 6：在第 5 章过早深入 query/tool 内部

本章只追踪到 `query()` 和 permission/tool context 边界。query loop 和 tool protocol 后面单独讲。

## 本章总结

本章建立的源码心智模型：

```text
REPL = interactive Agent runtime coordinator

PromptInput
  -> onSubmit
  -> handlePromptSubmit
  -> executeUserInput
  -> processUserInput
  -> onQuery
  -> query
  -> stream events
  -> setMessages / permission UI / spinner / Messages
```

最重要的证据链：

```text
REPL.tsx imports handlePromptSubmit/useQueueProcessor/useCommandQueue/query
  -> onSubmit calls handlePromptSubmit
  -> handlePromptSubmit reserves QueryGuard or enqueue
  -> executeUserInput calls processUserInput
  -> onQuery appends messages and calls query
  -> PermissionRequest renders from toolUseConfirmQueue
  -> useQueueProcessor resumes queued input when idle
```

如果你能解释这条链路，就能进入后续章节：AppState、Message、query、tool、permission 都是在这条 REPL 主链路上被逐步展开的。

## 下一章衔接

第 6 章会从 REPL 的局部状态和 App provider 过渡到 AppState 机制。下一章要继续追踪：

1. 为什么 REPL 不能只靠普通 React Context 传递所有状态？
2. `AppStateProvider`、`createStore`、`useAppState(selector)` 如何减少无效渲染？
3. REPL 中的 `store.getState()`、`setAppState`、`toolPermissionContext` 如何连接到全局状态模型？

第 5 章回答“交互运行时如何协调”，第 6 章回答“这个运行时背后的共享状态如何组织”。
