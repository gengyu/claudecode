# 第 6 章：AppState 状态管理机制源码导读

## 本章定位

第 6 章承接第 5 章的 REPL runtime coordinator。第 5 章已经看到 `REPL.tsx` 同时连接输入、消息、query、tool、permission、queue、remote、background tasks；本章要回答一个更底层的问题：

```text
这么多跨模块状态，为什么没有都塞进 REPL 的 useState？
```

本章进入 `src/state/*`，重点看：

```text
App.tsx
  -> AppStateProvider
  -> createStore(getDefaultAppState())
  -> useAppState(selector)
  -> useSetAppState()
  -> REPL / PromptInput / permission / MCP / remote / tasks
```

本章为第 7 章消息系统准备“状态容器”的心智模型：消息是 REPL 的高频数据流，但 AppState 是全局运行时环境。理解这个差异，后面读 message、query、tool、permission 才不会把所有状态都混成一个大对象。

本章保持 `SYSTEMATIC_COURSE.md` 第 6 章主题不变，覆盖这些知识点：

1. `AppStateProvider`
2. `createStore`
3. `useSyncExternalStore`
4. selector 避免无效渲染
5. `useSetAppState`
6. 设置变更同步到 AppState

## 面向高级前端工程师的学习价值

你不需要在这里学习 `useSyncExternalStore` 是什么。真正值得读的是：Claude Code 为什么在终端 UI 中采用这种状态形态。

对高级前端来说，最容易犯的误判是把它看成“自己造了个 mini Zustand”。这个判断只对了一半。更准确地说，AppState 是一个 **runtime control plane**：

| 前端经验里的概念 | Claude Code 中的对应点 |
| --- | --- |
| app shell state | `settings`、`verbose`、`mainLoopModel`、`expandedView` |
| 权限上下文 | `toolPermissionContext` |
| 插件/MCP 运行状态 | `mcp`、`plugins` |
| 后台任务状态 | `tasks`、`agentNameRegistry`、`foregroundedTaskId` |
| UI 横切状态 | `notifications`、`elicitation`、`promptSuggestion` |
| 远程/桥接状态 | `remoteSessionUrl`、`replBridge*` |
| 非 React 运行时代码入口 | `useAppStateStore()` 暴露 `getState/setState` |

AI CLI 和普通前端应用的差异是：大量状态变化来自 React 组件之外，比如 query loop、tool execution、MCP connection、remote bridge、permission callback、settings watcher。AppState 必须同时服务 React 渲染和非 React 运行时。

## 学习目标

完成本章后，你应该能够：

1. 用源码证明 `AppStateProvider` 只把稳定 store 放进 Context，而不是把整个 state 放进 Context。
2. 追踪 `App -> AppStateProvider -> createStore -> useAppState(selector)` 的状态订阅链路。
3. 解释 `useSetAppState()` 为什么不订阅状态，以及它适合哪些写入场景。
4. 说明 `REPL.tsx` 为什么同时使用 `useAppState(selector)` 和 `useAppStateStore()`。
5. 找到 `onChangeAppState` 如何把 AppState 变化同步到外部系统，例如 permission mode、model settings、global config、managed env。
6. 在 `learning-framework` 中复刻一个 external store，支持 selector 订阅、独立 updater、settings sync。

## 前置知识

本章默认你已经理解：

- 第 4 章的 `App -> REPL` 组件挂载链路
- 第 5 章中 REPL 作为 runtime coordinator 的角色
- React external store、selector、referential equality、render subscription 的工程含义
- 大型前端应用中 Context value 稳定性和局部订阅的性能意义

本章不会重复讲：

- `useState`、Context、React Hooks 基础语法
- 状态管理库横向对比
- selector 的入门写法
- TypeScript 类型系统基础

## 核心概念讲解

### 1. AppState 为什么存在

源码锚点：

```bash
rg -n "export type AppState|export function getDefaultAppState|toolPermissionContext|mcp:|plugins:|notifications:|elicitation:" claudecode-project/src/state/AppStateStore.ts
```

AppState 存在的原因不是“全局状态方便共享”，而是 Claude Code 需要一个跨越多个运行时边界的控制平面：

```text
React TUI
  <-> REPL
  <-> query/tool runtime
  <-> permission callbacks
  <-> MCP/plugins
  <-> remote/bridge
  <-> settings watcher
  <-> background tasks
```

如果这些状态全部分散在组件局部，后果会很直接：

- tool permission mode 改了，remote/SDK/status stream 不一定同步。
- MCP 工具刷新了，query 可能拿到旧工具池。
- settings 文件变了，UI 和 headless path 可能不一致。
- background task 状态更新时，REPL/footer/panel 要靠层层 props 传递。

所以 AppState 是“运行时事实来源”，不是普通 UI view model。

### 2. AppStateProvider 为什么只提供 store

源码锚点：

```bash
rg -n "AppStoreContext|AppStateProvider|createStore|useState\\(\\(\\) =>|AppStoreContext.Provider" claudecode-project/src/state/AppState.tsx claudecode-project/src/components/App.tsx
```

`AppStateProvider` 的关键设计是：

```text
Context value = store
store contains state + subscribe + setState
```

而不是：

```text
Context value = current AppState object
```

这样做解决两个问题：

1. Provider 自身不会因为每次 state 变化都广播整个 context。
2. 消费者可以通过 selector 订阅局部切片，而不是被所有字段更新牵连。

从前端架构角度看，这是“稳定容器 + 外部订阅”的模式。它适合 Claude Code 这种状态字段多、更新来源多、渲染面复杂的终端应用。

### 3. createStore 是最小运行时状态内核

源码锚点：

```bash
rg -n "type Listener|type OnChange|export type Store|export function createStore|Object\\.is|listeners" claudecode-project/src/state/store.ts
```

`createStore` 做的事情很少：

```text
state = initialState
listeners = Set

getState()
setState(updater)
subscribe(listener)
```

它没有 action、middleware、devtools、immer。这个克制很重要：Claude Code 的复杂性不在 store 框架本身，而在 AppState 连接的运行时系统。

`setState` 的关键边界：

```text
prev = state
next = updater(prev)
Object.is(next, prev) -> skip
state = next
onChange({ newState, oldState })
notify listeners
```

这意味着 AppState 的副作用同步不散落在每个调用点，而是可以进入 `onChangeAppState` 这样的差异处理入口。

### 4. useAppState(selector) 是订阅边界

源码锚点：

```bash
rg -n "export function useAppState|useSyncExternalStore|selector|Do NOT return new objects|Object\\.is" claudecode-project/src/state/AppState.tsx
```

`useAppState(selector)` 的核心不是“读取状态”，而是声明订阅边界：

```text
component
  -> useAppState(s => s.toolPermissionContext)
  -> get selected slice
  -> subscribe store
  -> re-render only if selected value changed
```

源码注释已经非常明确：不要从 selector 返回新对象。因为 `useSyncExternalStore` 最终依赖 snapshot 是否变化；如果 selector 每次都返回 `{ a: s.a }`，就会制造无意义重渲染。

高级前端应该特别关注这里：Claude Code 的状态字段很多，如果 selector 粗暴返回对象，终端 UI 的高频刷新会非常难控。

### 5. useSetAppState() 是写入但不订阅

源码锚点：

```bash
rg -n "export function useSetAppState|setState|without subscribing|never re-render" claudecode-project/src/state/AppState.tsx
```

`useSetAppState()` 只返回 stable `store.setState`，不订阅任何字段。

这类 API 在普通前端应用里常被忽略，但在 REPL 这种 runtime coordinator 里非常关键。很多逻辑只需要写入状态，不需要读取状态，例如：

- 写入 permission 更新
- 写入 notification
- 写入 task 状态
- 写入 settings 同步结果
- 写入 remote/bridge 状态

如果这些写入点也订阅整个 AppState，就会把协调器变成重渲染热点。

### 6. useAppStateStore() 是非 React 运行时代码的桥

源码锚点：

```bash
rg -n "export function useAppStateStore|store\\.getState\\(\\)|getAppState: \\(\\) => store\\.getState\\(\\)" claudecode-project/src/state/AppState.tsx claudecode-project/src/screens/REPL.tsx
```

第 5 章已经看到 REPL 会把 `getAppState` 和 `setAppState` 传给 query/tool/permission context：

```text
REPL
  -> const store = useAppStateStore()
  -> getToolUseContext()
  -> getAppState: () => store.getState()
  -> setAppState
```

为什么不直接依赖闭包里的 `toolPermissionContext`、`mcp`、`plugins`？

因为 query/tool 运行可能跨越多个异步边界。闭包值可能是旧的，`store.getState()` 可以在执行点读取最新状态。

这就是 AppState 和 Agent runtime 的关键连接：React 组件负责创建上下文，但真正执行工具时要读取 runtime 最新状态。

### 7. onChangeAppState 是状态变化的外部同步出口

源码锚点：

```bash
rg -n "export function onChangeAppState|permission_mode|notifySessionMetadataChanged|notifyPermissionModeChanged|mainLoopModel|expandedView|settings" claudecode-project/src/state/onChangeAppState.ts
```

`onChangeAppState` 的设计意图是把跨系统同步集中在一个 diff 入口：

```text
oldState + newState
  -> permission mode changed?
  -> model changed?
  -> expanded view changed?
  -> verbose changed?
  -> settings changed?
  -> notify / persist / clear cache / apply env
```

这不是普通 reducer。它处理的是 AppState 变化对 CLI 外部世界的影响：

- permission mode 同步到 CCR / SDK status stream
- model 写回 settings / bootstrap override
- expanded view 写回 global config
- verbose 写回 global config
- settings 变化清理 auth cache 并重新应用 env

这个文件告诉你：AppState 不只是 UI 状态，它还驱动外部副作用。

## 核心源码地图

| 文件 | 本章看什么 | 本章不看什么 | 后续章节是否回看 |
| --- | --- | --- | --- |
| `claudecode-project/src/components/App.tsx` | `App` 如何包裹 `AppStateProvider` | 子组件业务细节 | 第 14 章 remote/headless 时回看 |
| `claudecode-project/src/state/AppState.tsx` | Provider、Context、`useAppState`、`useSetAppState`、`useAppStateStore` | React compiler 输出细节、VoiceProvider 分支深挖 | 第 11、13、14 章持续回看 |
| `claudecode-project/src/state/store.ts` | 最小 external store 实现 | 状态管理库比较 | 本章重点文件 |
| `claudecode-project/src/state/AppStateStore.ts` | AppState 类型、默认值、运行时状态分区 | 每个字段业务细节 | 第 7-14 章按主题回看 |
| `claudecode-project/src/state/onChangeAppState.ts` | 状态 diff 如何同步外部系统 | CCR/SDK 内部实现 | 第 11、14 章回看 |
| `claudecode-project/src/screens/REPL.tsx` | AppState 在 REPL 中的消费方式 | REPL 全量逻辑 | 第 5 章已讲，第 7-14 章继续 |

## 主调用链 / 主数据流

### 1. Provider 初始化链路

```text
main.tsx / cli handler
  -> <App initialState={...} onChangeAppState={...}>
  -> <AppStateProvider initialState onChangeAppState>
  -> createStore(initialState ?? getDefaultAppState(), onChangeAppState)
  -> AppStoreContext.Provider value={store}
  -> REPL / children
```

源码验证：

```bash
rg -n "<AppStateProvider|initialState|onChangeAppState" claudecode-project/src/components/App.tsx claudecode-project/src/main.tsx claudecode-project/src/cli/handlers/util.tsx
```

### 2. 状态读取链路

```text
REPL.tsx
  -> useAppState(s => s.toolPermissionContext)
  -> useAppStore()
  -> useSyncExternalStore(store.subscribe, get, get)
  -> selector(store.getState())
  -> selected slice drives render / memo / tool list
```

源码验证：

```bash
rg -n "useAppState\\(s => s\\.toolPermissionContext|useSyncExternalStore|selector\\(state\\)" claudecode-project/src/screens/REPL.tsx claudecode-project/src/state/AppState.tsx
```

### 3. 状态写入链路

```text
REPL / permission UI / hooks
  -> useSetAppState()
  -> store.setState(updater)
  -> createStore.setState
  -> onChangeAppState({ newState, oldState })
  -> listeners()
  -> subscribed selectors re-render if snapshot changed
```

源码验证：

```bash
rg -n "useSetAppState\\(|setAppState\\(prev|onChangeAppState|for \\(const listener of listeners\\)" claudecode-project/src/screens/REPL.tsx claudecode-project/src/state/*.ts claudecode-project/src/state/*.tsx
```

### 4. 非 React runtime 读取链路

```text
REPL
  -> const store = useAppStateStore()
  -> getToolUseContext()
  -> getAppState: () => store.getState()
  -> query / tool / permission callbacks
  -> read latest mcp/tools/permission/settings/tasks
```

源码验证：

```bash
rg -n "useAppStateStore\\(|getToolUseContext|getAppState: \\(\\) => store\\.getState\\(\\)|assembleToolPool" claudecode-project/src/screens/REPL.tsx
```

## 源码阅读路线

### 路线一：确认 Provider 不是普通 Context 全量广播

阅读目标：证明 Context value 是稳定 store，而不是整个 AppState。

检索命令：

```bash
rg -n "AppStoreContext|useState\\(\\(\\) =>|createStore|Provider value=\\{store\\}" claudecode-project/src/state/AppState.tsx
```

你应该看到：

- `AppStoreContext` 保存 `AppStateStore | null`
- `useState(() => createStore(...))`
- Provider 的 value 是 `store`

读完判断：

AppStateProvider 用稳定 store 避免 Context 全量广播，局部订阅交给 `useSyncExternalStore`。

### 路线二：确认 selector 是渲染边界

阅读目标：证明组件只订阅自己选择的状态切片。

检索命令：

```bash
rg -n "export function useAppState|selector|useSyncExternalStore|Do NOT return new objects" claudecode-project/src/state/AppState.tsx
rg -n "useAppState\\(s => s\\." claudecode-project/src/screens/REPL.tsx | head -40
```

你应该看到：

- `useAppState(selector)` 内部调用 selector
- `useSyncExternalStore(store.subscribe, get, get)`
- REPL 中多次独立订阅 `toolPermissionContext`、`verbose`、`mcp`、`plugins`、`tasks`

读完判断：

AppState 的性能策略不是拆 Provider，而是拆 selector。

### 路线三：确认 setAppState 是写入入口

阅读目标：理解 `useSetAppState` 如何让组件写入状态但不订阅状态。

检索命令：

```bash
rg -n "export function useSetAppState|without subscribing|setState" claudecode-project/src/state/AppState.tsx
rg -n "const setAppState = useSetAppState|setAppState\\(prev" claudecode-project/src/screens/REPL.tsx | head -60
```

你应该看到：

- `useSetAppState()` 直接返回 `store.setState`
- REPL 大量通过 updater 修改局部字段

读完判断：

写入路径和订阅路径分离，是 REPL 能承载大量横切状态的基础。

### 路线四：追踪状态变化如何影响外部系统

阅读目标：确认 AppState 不是纯 UI state。

检索命令：

```bash
rg -n "export function onChangeAppState|notifySessionMetadataChanged|notifyPermissionModeChanged|saveGlobalConfig|updateSettingsForSource|applyConfigEnvironmentVariables" claudecode-project/src/state/onChangeAppState.ts
```

你应该看到：

- permission mode 改变会通知外部 metadata / SDK
- model 改变会写 settings
- expanded view / verbose 会写 global config
- settings 改变会清理认证缓存并应用 env

读完判断：

AppState 的变化会驱动 CLI 外部副作用，不能把它理解成单纯组件状态。

### 路线五：追踪 REPL 为什么要读最新 store

阅读目标：确认 `store.getState()` 是异步 runtime 的最新状态读取点。

检索命令：

```bash
rg -n "useAppStateStore\\(|store\\.getState\\(\\)|getAppState: \\(\\) => store\\.getState\\(\\)|Compute tools fresh" claudecode-project/src/screens/REPL.tsx
```

你应该看到：

- REPL 创建 `store`
- 多处把 `getAppState: () => store.getState()` 传入上下文
- 源码注释强调 fresh state / fresh tools

读完判断：

query/tool/permission 运行时不能只依赖 React render 时的闭包值，它们需要执行时的最新 AppState。

## 5 分钟源码速验

### 验证 1：Provider 链路

```bash
rg -n "<AppStateProvider|AppStateProvider|initialState|onChangeAppState" claudecode-project/src/components/App.tsx claudecode-project/src/main.tsx claudecode-project/src/cli/handlers/util.tsx
```

确认 `App` 和 CLI util 都通过 `AppStateProvider` 提供状态环境。

### 验证 2：store 最小内核

```bash
sed -n '1,120p' claudecode-project/src/state/store.ts
```

确认 store 只有 `getState`、`setState`、`subscribe` 三个能力，复杂性不在框架层。

### 验证 3：selector 订阅

```bash
rg -n "useSyncExternalStore|selector\\(state\\)|Do NOT return new objects" claudecode-project/src/state/AppState.tsx
```

确认 `useAppState(selector)` 是局部订阅机制。

### 验证 4：REPL 消费 AppState

```bash
rg -n "useAppState\\(s => s\\.|useSetAppState\\(|useAppStateStore\\(" claudecode-project/src/screens/REPL.tsx | head -80
```

确认 REPL 同时使用 selector、updater 和 direct store。

### 验证 5：外部同步

```bash
rg -n "permission_mode|mainLoopModel|expandedView|verbose|settings|applyConfigEnvironmentVariables" claudecode-project/src/state/onChangeAppState.ts
```

确认 AppState diff 会同步 permission、model、配置和环境变量。

## 关键模块逐段导读

### 1. `App.tsx`：AppState 的挂载边界

`App.tsx` 的职责很窄：把 `children` 放进 `AppStateProvider`。

运行时意义：

```text
App
  -> 提供 AppState runtime
  -> children 可以是 REPL，也可以是 CLI handler 中的独立 UI
```

这说明 AppState 不是 REPL 私有机制，而是 Claude Code TUI 的基础运行环境。

### 2. `AppState.tsx`：React 与 external store 的结合层

这一层有四个关键出口：

```text
AppStateProvider
useAppState(selector)
useSetAppState()
useAppStateStore()
```

设计边界：

- Provider 负责创建 store 和注入上下文。
- `useAppState` 负责读切片和触发渲染。
- `useSetAppState` 负责写入但不订阅。
- `useAppStateStore` 负责给非 React 运行时拿 `getState/setState`。

这是本章最重要的拆分。不要把这四个 API 都理解成“读写全局状态”，它们服务的是不同运行时边界。

### 3. `store.ts`：状态更新和通知顺序

`createStore` 的更新顺序是：

```text
calculate next
  -> Object.is skip
  -> assign state
  -> onChange diff callback
  -> notify subscribers
```

这里有一个值得注意的设计取舍：`onChange` 发生在 listener 通知之前。也就是说外部同步可以先观察到完整 old/new state，再让 React 订阅者重渲染。

这对 permission mode、settings sync、global config 这类外部副作用非常有价值。

### 4. `AppStateStore.ts`：运行时状态分区

`AppState` 类型很大，但不是无序堆砌。可以按运行时职责切成几类：

| 状态类别 | 字段示例 | 后续章节 |
| --- | --- | --- |
| 基础配置 | `settings`、`verbose`、`mainLoopModel` | 第 3、8 章 |
| 权限上下文 | `toolPermissionContext` | 第 11 章 |
| MCP/插件 | `mcp`、`plugins` | 第 13 章 |
| 任务/Agent | `tasks`、`agentNameRegistry`、`foregroundedTaskId` | 第 14 章 |
| UI 横切 | `expandedView`、`notifications`、`elicitation` | 第 4、5 章 |
| 远程/桥接 | `remoteSessionUrl`、`replBridge*` | 第 14 章 |
| 推测/建议 | `promptSuggestion`、`speculation` | 第 14 章 |

读这个文件不要从第一行逐字段背。更好的读法是：每遇到后续章节的模块，再回到 AppState 找它的状态入口。

### 5. `getDefaultAppState()`：默认运行环境

`getDefaultAppState()` 是 AppState 的初始事实来源。

它做了几件有工程意义的事：

- 根据 teammate/plan mode 决定初始 permission mode。
- 初始化 `toolPermissionContext`。
- 初始化 MCP、plugins、notifications、elicitation 等容器。
- 初始化 prompt suggestion、speculation、skill improvement 等高级能力状态。
- 把 `settings` 从 `getInitialSettings()` 接入。

这说明很多系统不是“用到时才随便创建”，而是在 AppState 初始态里占位。这样后续模块能假设结构存在，减少防御式分支。

### 6. `onChangeAppState.ts`：集中处理状态副作用

这个文件体现的是“状态变化是一种事件”：

```text
toolPermissionContext.mode changed
  -> notifySessionMetadataChanged
  -> notifyPermissionModeChanged

mainLoopModel changed
  -> updateSettingsForSource
  -> setMainLoopModelOverride

settings changed
  -> clear auth cache
  -> apply env
```

如果没有这个集中点，同步逻辑会散落在 `/plan`、permission dialog、remote bridge、print mode、settings watcher 等调用点里，很容易漏掉某条路径。

## 与前后章节的关系

### 承接第 5 章 REPL

第 5 章看到 REPL 是协调器。本章解释 REPL 为什么能协调这么多系统：它不是只靠局部 state，而是通过 AppState 读取和写入运行时状态。

关键连接：

```text
REPL
  -> useAppState(s => s.toolPermissionContext)
  -> useAppState(s => s.mcp)
  -> useAppState(s => s.plugins)
  -> useSetAppState()
  -> useAppStateStore()
```

### 连接第 7 章 Message

消息列表本身大量保留在 REPL 局部状态中，而不是全部放 AppState。这是一个重要边界：高频、会话内、渲染相关的数据不一定进入全局 AppState。

第 7 章会继续回答：

- 哪些 message 是 API 上下文？
- 哪些 message 是 UI 可渲染事件？
- 哪些 message 会进入 session log / compact？

### 连接第 8 章 query

query loop 需要读取 model、tools、MCP clients、permission context、settings、hooks。REPL 通过 `getToolUseContext` 和 `store.getState()` 把最新 AppState 暴露给 query/tool runtime。

### 连接第 9-11 章 tool / permission

`toolPermissionContext` 是 AppState 中最核心的安全状态之一。第 11 章会专门讲 permission mode、allow/deny/ask rule、permission dialog 如何更新它。

### 连接第 13-14 章 MCP / remote / advanced systems

`mcp`、`plugins`、`tasks`、`replBridge*`、`remote*`、`speculation` 等字段会在后续高级章节继续展开。本章只建立它们的状态入口位置。

## 教学可视化表达方式

### 1. AppState 分层图

```text
React Context
  AppStoreContext
    value = stable store
            |
            v
External Store
  getState / setState / subscribe
            |
            v
AppState
  settings / permission / mcp / plugins / tasks / remote / notifications
```

### 2. selector 订阅图

```text
store state changes
  |
  +-> REPL selector: s.toolPermissionContext -> changed? -> re-render permission dependent UI
  |
  +-> Footer selector: s.expandedView -> changed? -> re-render footer state
  |
  +-> Task panel selector: s.tasks -> changed? -> re-render task panel
  |
  +-> unrelated selector -> Object.is same -> skip
```

### 3. 写入与副作用图

```text
setAppState(prev => next)
  -> createStore.setState
  -> onChangeAppState(old, new)
       -> permission metadata sync
       -> settings/global config sync
       -> env/cache side effects
  -> notify subscribers
  -> selected UI updates
```

### 4. REPL 与非 React runtime 图

```text
REPL render time
  -> useAppState slices for UI

query/tool execution time
  -> getAppState() = store.getState()
  -> read fresh permission/mcp/tools/tasks
```

这张图适合强调闭包值和执行时最新状态的区别。

## 实践任务

### 任务 1：源码定位任务

目标：找出 AppState 的四个公开入口。

命令：

```bash
rg -n "export function AppStateProvider|export function useAppState|export function useSetAppState|export function useAppStateStore" claudecode-project/src/state/AppState.tsx
```

产出格式：

```markdown
## AppState API 定位

- AppStateProvider: line ...
- useAppState: line ...
- useSetAppState: line ...
- useAppStateStore: line ...

我的判断：
这四个 API 分别服务 ...
```

### 任务 2：调用链追踪任务

目标：追踪 AppState 从 App 挂载到 REPL 消费。

命令：

```bash
rg -n "<AppStateProvider|useAppState\\(s => s\\.toolPermissionContext|useSetAppState\\(|useAppStateStore\\(" claudecode-project/src/components/App.tsx claudecode-project/src/screens/REPL.tsx
```

产出格式：

```markdown
## AppState 调用链

App.tsx line ...
  -> AppStateProvider line ...
  -> REPL useAppState(toolPermissionContext) line ...
  -> REPL useSetAppState line ...
  -> REPL useAppStateStore line ...
```

### 任务 3：记录 selector 反模式

目标：解释为什么 selector 不能返回新对象。

命令：

```bash
rg -n "Do NOT return new objects|Object\\.is|useSyncExternalStore" claudecode-project/src/state/AppState.tsx claudecode-project/src/state/store.ts
```

产出格式：

```markdown
## selector 反模式分析

源码证据：
- line ...
- line ...

错误写法：
useAppState(s => ({ verbose: s.verbose }))

原因：
...
```

### 任务 4：learning-framework 复刻任务

目标：在 `learning-framework` 中实现最小 AppState store。

建议文件：

```text
learning-framework/src/state/store.ts
learning-framework/src/state/AppState.tsx
learning-framework/src/state/AppStateStore.ts
```

要求：

- `createStore(initialState, onChange?)`
- `AppStateProvider`
- `useAppState(selector)`
- `useSetAppState()`
- `useAppStateStore()`
- AppState 至少包含：`messages`、`isLoading`、`settings`、`toolPermissionContext`
- 用 selector 分别订阅 `messages.length` 和 `isLoading`
- 写一个反例：selector 返回新对象导致重复渲染，并记录现象

产出格式：

```markdown
## 第 6 章复刻结果

新增文件：
- ...

支持能力：
- ...

验证方式：
- ...

与 Claude Code 差异：
- ...
```

### 任务 5：设置同步任务

目标：复刻 `onChangeAppState` 的思路。

要求：

- 在 learning-framework 中新增 `onChangeAppState.ts`
- 当 `settings.model` 改变时打印同步日志
- 当 `toolPermissionContext.mode` 改变时打印权限模式日志
- 不把日志写在每个调用点，而是集中在 store 的 `onChange`

产出格式：

```markdown
## onChangeAppState 复刻

状态变化：
- before:
- after:

触发日志：
- ...

我的结论：
集中 diff 比分散调用的优势是 ...
```

### 任务 6：进阶分析题

回答下面问题：

1. 为什么 AppStateProvider 禁止嵌套？
2. 为什么 REPL 既用 `useAppState(s => s.mcp)`，又用 `store.getState()` 读取最新 MCP？
3. 如果把整个 AppState 放入 React Context value，会出现哪些性能和一致性问题？
4. `onChangeAppState` 是不是 reducer？为什么？
5. 哪些状态适合留在 REPL 局部 state，而不是进入 AppState？

产出格式：

```markdown
## 第 6 章进阶分析

1. ...
2. ...
3. ...
4. ...
5. ...
```

## 常见误区

### 误区 1：把 AppState 当成普通全局 UI 状态

AppState 同时承载 permission、MCP、plugins、remote、tasks、settings sync。它是 AI CLI runtime 的控制平面，不只是 UI view model。

### 误区 2：认为 useAppState 可以随便返回对象

selector 返回新对象会破坏 `Object.is` 判等，导致订阅组件无意义重渲染。源码注释已经明确禁止这个模式。

### 误区 3：认为 useSetAppState 和 useAppState 差不多

`useSetAppState` 不订阅状态，只提供写入能力。这个差异对 REPL 这种高频协调器非常重要。

### 误区 4：把 store.getState() 看成反 React 模式

在纯 UI 组件里滥用 `getState()` 当然危险。但 query/tool/permission callback 跨异步边界执行，需要读取 runtime 最新状态。这里的 `getState()` 是刻意设计的桥。

### 误区 5：忽略 onChangeAppState

如果只看 `setAppState(prev => ...)`，你会漏掉 permission mode、model、settings、global config 的外部同步。`onChangeAppState` 是理解状态副作用的关键入口。

### 误区 6：把 AppStateStore.ts 当成字段字典背诵

这个文件字段很多，逐字段背没有意义。应该按后续模块回看：权限看 `toolPermissionContext`，MCP 看 `mcp`，插件看 `plugins`，任务看 `tasks`，remote 看 `replBridge*`。

## 本章总结

第 6 章建立的核心心智模型是：

```text
AppState = Claude Code interactive runtime 的控制平面

AppStateProvider
  -> 提供稳定 store

useAppState(selector)
  -> 局部订阅，控制渲染

useSetAppState()
  -> 写入状态，不订阅

useAppStateStore()
  -> 给 query/tool/permission 等非 React 运行时读最新状态

onChangeAppState
  -> 把状态变化同步到外部系统
```

本章最重要的证据链：

```text
App.tsx wraps AppStateProvider
  -> AppStateProvider creates createStore(...)
  -> useAppState uses useSyncExternalStore(store.subscribe, get, get)
  -> REPL consumes slices and setAppState
  -> REPL passes store.getState into runtime contexts
  -> onChangeAppState syncs permission/settings/global config side effects
```

掌握这条链路后，第 7 章读消息系统时就能分清：哪些数据是 AppState 级别的 runtime state，哪些数据是消息流自身的上下文和持久化问题。

## 下一章衔接

第 7 章进入“消息系统与对话上下文”。下一章要继续追踪：

1. `Message`、`UserMessage`、`AssistantMessage`、`SystemMessage`、`ToolResultMessage` 的真实类型入口在哪里？
2. REPL 中的 `messages`、`messagesRef`、`deferredMessages` 如何转成 query/API 可消费的上下文？
3. tool_use 和 tool_result 如何在消息层成对出现，并影响后续 query loop？

未确认源码点：

- 当前源码大量从 `../types/message.js` import 类型，但本轮只通过调用点确认了 import 关系，尚未定位到该类型入口的物理源文件或生成机制。第 7 章扩写前必须先校验这个点。
