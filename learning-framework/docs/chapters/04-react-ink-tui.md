# 第 4 章：React + Ink 终端 UI

## 本章定位

第 4 章承接第 3 章的初始化结果，进入第一个真正可见的运行时层：React + Ink 终端 UI。前面三章已经建立了这条链路：

```text
main.tsx
  -> preAction
  -> init()
  -> launchRepl(...)
```

本章从 `launchRepl(...)` 继续往下看：

```text
launchRepl
  -> App
  -> REPL
  -> Messages / PromptInput / Dialog / Spinner / Status UI
```

对高级前端工程师来说，本章不讲 React 组件或 Flexbox 基础。重点是：Claude Code 如何把你熟悉的组件、状态、输入和布局模型放进一个终端渲染环境里，并为第 5 章 `REPL.tsx` 的复杂协调职责做铺垫。

本章保持 `SYSTEMATIC_COURSE.md` 第 4 章主题不变，覆盖这些知识点：

1. Ink 的 `Box`、`Text`
2. 终端 Flexbox 布局
3. `useInput` 键盘事件
4. 终端尺寸变化
5. Dialog 与全屏布局
6. 消息列表渲染
7. Spinner、状态栏、提示信息

第 4 章不是 REPL 主逻辑精读。它只讲“终端 UI 基础设施如何组织”，第 5 章再进入输入、队列、query、权限弹窗如何集中协作。

## 面向高级前端工程师的学习价值

你已经熟悉 React 组件树、Provider、memo、虚拟列表、输入框、footer、modal。Claude Code 的 TUI 层值得关注的不是这些概念本身，而是它们在终端环境中产生的新约束：

| Web 前端 UI | Claude Code TUI |
| --- | --- |
| DOM + CSS | Ink reconciler + terminal frame |
| CSS flexbox | Ink/terminal flex layout |
| click/input/browser focus | raw stdin、key event、terminal focus |
| viewport resize | terminal columns/rows |
| modal overlay | root.render / dialog slot / fullscreen layout |
| list virtualization | terminal scroll box / VirtualMessageList |
| loading indicator | SpinnerWithVerb、streaming text、tool progress |
| browser tab title | terminal title / tab status |

本章的核心价值是建立一个判断：Claude Code 的 UI 层不是“把 Web React 改成终端组件”这么简单，而是把长期运行的 Agent 会话渲染成一个可滚动、可输入、可中断、可弹权限、可显示流式进度的终端应用。

## 学习目标

完成本章后，你应该能够：

1. 用源码证明 `ink.ts` 是 Claude Code TUI 的统一导出层，而不是直接裸用 Ink。
2. 追踪 `main.tsx -> launchRepl -> App -> REPL` 的 UI 挂载链路。
3. 找到 `App` 如何给交互会话注入 AppState、Stats、FPS provider。
4. 说明 `Box`、`Text`、`useInput`、terminal focus/title/status 这些 TUI primitive 在 REPL 中的位置。
5. 追踪 `Messages` 如何使用 `VirtualMessageList` 渲染消息列表。
6. 追踪 `PromptInput` 如何把 TextInput/VimTextInput、queued commands、mode indicator、footer 组合成输入区域。
7. 在 `learning-framework` 中复刻一个两栏/上下布局 TUI，支持消息列表、输入框、状态栏和 `/clear` 命令。

## 前置知识

本章默认你已经理解：

- 第 2 章的 `launchRepl(...)` 是 interactive runtime 出口
- 第 3 章完成了配置、env、shutdown、网络准备
- React provider、memo、controlled input、虚拟列表这些前端模式
- 终端程序通过 stdin/stdout/stderr 与用户交互

本章不会重复讲：

- React 组件语法
- Flexbox 基础
- useState/useEffect 入门
- Ink 的 hello world

你要把注意力放在源码链路和设计边界：哪些是 TUI 基础设施，哪些是第 5 章 REPL runtime 编排。

## 核心概念讲解

### 1. `ink.ts` 是统一 TUI facade

源码锚点：

```bash
rg -n "withTheme|export async function render|export async function createRoot|export \\{ default as Box \\}|export \\{ default as Text \\}|useInput|useTerminalFocus|useTerminalTitle|useTabStatus" claudecode-project/src/ink.ts
```

`ink.ts` 没有让业务组件直接从底层 Ink 到处 import，而是做了一个 facade：

```text
ink.ts
  -> wrap ThemeProvider
  -> export render/createRoot
  -> export themed Box/Text
  -> export terminal hooks
  -> export lower-level ink primitives
```

为什么存在：

- 所有 render 都自动包 ThemeProvider，业务组件不用重复挂主题。
- `Box`/`Text` 默认走 design-system 的 ThemedBox/ThemedText，而不是裸底层组件。
- 终端 hooks、events、layout primitives 通过一个稳定入口暴露。

在主链路中的位置：

```text
main.tsx getRenderContext/createRoot
  -> ink.ts createRoot/render
  -> ThemeProvider
  -> App/REPL tree
```

### 2. `launchRepl` 是 UI tree 的切入点

源码锚点：

```bash
rg -n "export async function launchRepl|import\\('./components/App|import\\('./screens/REPL|renderAndRun" claudecode-project/src/replLauncher.tsx
```

`launchRepl` 动态 import `App` 和 `REPL`，再交给 `renderAndRun`：

```text
launchRepl(root, appProps, replProps, renderAndRun)
  -> import App
  -> import REPL
  -> renderAndRun(root, <App {...appProps}><REPL {...replProps}/></App>)
```

设计意图：

- 入口层不需要静态加载完整 REPL 和 UI tree。
- `App` 和 `REPL` 的职责分开：`App` 挂 provider，`REPL` 做交互运行时。
- 这一层是第 2 章 `main.tsx` 和第 5 章 `REPL.tsx` 的连接点。

### 3. `App` 是交互会话的 Provider shell

源码锚点：

```bash
rg -n "export function App|FpsMetricsProvider|StatsProvider|AppStateProvider|onChangeAppState" claudecode-project/src/components/App.tsx
```

`App` 不是视觉组件，而是交互 session 的 provider shell：

```text
App
  -> FpsMetricsProvider
  -> StatsProvider
  -> AppStateProvider(initialState, onChangeAppState)
  -> children(REPL)
```

为什么存在：

- REPL 和子组件需要共享 AppState。
- 统计和 FPS 是 UI/runtime 横切关注点。
- `onChangeAppState` 把状态变更与外部副作用连接起来。

这也解释了为什么第 6 章 AppState 要单独讲：第 4 章只确认 Provider shell，状态模型本身后面再拆。

### 4. `Box`/`Text` 是 TUI 的 layout 和 typography primitive

源码锚点：

```bash
rg -n "import \\{ Box, Text|<Box|<Text" claudecode-project/src/screens/REPL.tsx claudecode-project/src/components/App.tsx claudecode-project/src/components/Messages.tsx claudecode-project/src/components/PromptInput/PromptInput.tsx
```

`Box` 和 `Text` 在 TUI 中承担 Web 里的 layout container 和 text node，但边界不同：

- 宽高来自终端 rows/columns。
- 布局变化会影响整帧输出。
- 文本 wrapping、ANSI、selection、cursor 都是终端问题。
- 不能假设浏览器 DOM、CSS、mouse、scroll 行为存在。

本章不展开所有 layout 实现，只要建立这个判断：TUI layout 是“按终端帧重绘”的 UI，不是浏览器 DOM patch。

### 5. `useInput` 和 terminal hooks 是 TUI 的事件入口

源码锚点：

```bash
rg -n "useInput|useTerminalFocus|useTerminalTitle|useTabStatus|useStdin|useTerminalSize" claudecode-project/src/screens/REPL.tsx claudecode-project/src/components/PromptInput/PromptInput.tsx claudecode-project/src/components -g '*.{tsx,ts}'
```

与 Web 前端的事件系统不同，Claude Code 的 TUI 事件来自：

- stdin 字符输入
- key event
- terminal focus
- terminal title/tab status
- terminal viewport/size

`REPL.tsx` 和 `PromptInput.tsx` 都会注册输入相关逻辑。第 4 章只建立事件入口地图，第 5 章再追踪输入如何进入消息和 query。

### 6. `Messages` 是消息渲染层，不是消息状态层

源码锚点：

```bash
rg -n "MessagesImpl|VirtualMessageList|React\\.memo\\(MessagesImpl|shouldRenderStatically|renderableMessages" claudecode-project/src/components/Messages.tsx
```

`Messages` 的职责是把消息投影成可渲染列表，里面出现了：

- `MessagesImpl`
- `VirtualMessageList`
- `React.memo`
- `shouldRenderStatically`
- message lookup / renderable messages

这说明消息列表是性能敏感区域。它不是“messages.map 渲染一下”这么简单，因为终端会话可能很长，还有 streaming tool、thinking、compact boundary、collapsed content、static/dynamic render 等差异。

状态和消息模型本身在第 6、7 章讲；本章只确认消息如何进入 TUI 渲染层。

### 7. `PromptInput` 是输入区域组合体，不只是文本框

源码锚点：

```bash
rg -n "function PromptInput|onSubmit|TextInput|VimTextInput|PromptInputFooter|PromptInputQueuedCommands|PromptInputModeIndicator|export default React\\.memo\\(PromptInput\\)" claudecode-project/src/components/PromptInput/PromptInput.tsx
```

`PromptInput` 组合了：

- TextInput / VimTextInput
- onSubmit
- PromptInputQueuedCommands
- PromptInputModeIndicator
- PromptInputFooter
- suggestions、history、paste、footer navigation、mode

这不是普通 form input，而是 Agent CLI 的交互控制台。它既要接收自然语言 prompt，也要支持 slash command、队列提示、模式指示、粘贴、历史、任务/团队/bridge 状态。

第 5 章会追踪 `onSubmit` 如何进入 `handlePromptSubmit` 和 query，本章先看它作为 UI 组合边界。

## 核心源码地图

| 文件 | 本章看什么 | 本章不看什么 | 后续章节 |
| --- | --- | --- | --- |
| `claudecode-project/src/ink.ts` | TUI facade、ThemeProvider、Box/Text/hooks 导出 | 底层 reconciler 完整实现 | 第 14 章可回看性能/终端底层 |
| `claudecode-project/src/replLauncher.tsx` | App + REPL 的挂载链路 | REPL 内部逻辑 | 第 5 章深入 REPL |
| `claudecode-project/src/components/App.tsx` | Provider shell：AppState/Stats/FPS | AppState 字段和 selector | 第 6 章深入状态 |
| `claudecode-project/src/screens/REPL.tsx` | TUI 组件如何被组合：Messages、PromptInput、Spinner、terminal hooks | query、权限、队列具体逻辑 | 第 5 章重点 |
| `claudecode-project/src/components/Messages.tsx` | 消息列表渲染、VirtualMessageList、memo、static/dynamic render | message 类型和 API normalize | 第 7 章深入消息 |
| `claudecode-project/src/components/PromptInput/PromptInput.tsx` | 输入区域组合、TextInput/VimTextInput、footer、queued commands、onSubmit 边界 | `handlePromptSubmit` 具体业务 | 第 5 章深入输入提交 |
| `claudecode-project/src/components/Spinner.tsx` | loading/progress 的 UI 表达 | query progress 的完整状态机 | 第 5、8 章会连接 |
| `claudecode-project/src/components/FullscreenLayout.tsx` | fullscreen/dialog 布局边界 | 所有 dialog 业务实现 | 第 5、11 章连接权限弹窗 |

## 主调用链 / 主数据流

### 交互 UI 挂载链路

```text
main.tsx interactive branch
  -> launchRepl(root, appProps, replProps, renderAndRun)
  -> dynamic import App
  -> dynamic import REPL
  -> renderAndRun(root, <App><REPL /></App>)
  -> AppStateProvider / StatsProvider / FpsMetricsProvider
  -> REPL renders Messages + PromptInput + dialogs + spinner
```

### TUI primitive 数据流

```text
ink.ts
  -> createRoot/render wraps ThemeProvider
  -> exports themed Box/Text
  -> exports useInput/useStdin/useTerminalFocus/useTerminalTitle/useTabStatus
  -> components import from ../ink.js
  -> REPL/PromptInput/Messages render terminal frames
```

### 消息渲染流

```text
REPL messages state
  -> displayed/deferred/renderable messages
  -> <Messages ... />
  -> MessagesImpl
  -> VirtualMessageList
  -> MessageRow / message-specific renderers
  -> terminal output
```

### 输入 UI 流

```text
REPL passes onSubmit and UI state
  -> PromptInput
  -> TextInput or VimTextInput
  -> PromptInputQueuedCommands / ModeIndicator / Footer
  -> onSubmit boundary
  -> 第 5 章 handlePromptSubmit / queue / query
```

## 源码阅读路线

### 路线一：确认 TUI facade

阅读目标：确认业务组件不是直接裸用底层 Ink，而是通过 `ink.ts`。

```bash
rg -n "withTheme|render\\(|createRoot\\(|default as Box|default as Text|useInput|useTerminalFocus|useTerminalTitle|useTabStatus" claudecode-project/src/ink.ts
```

应该看到：

- `withTheme`
- `render`
- `createRoot`
- themed `Box` / `Text`
- terminal hooks exports

形成判断：

`ink.ts` 是 UI 基础设施边界，主题和 primitive 都从这里统一进入业务组件。

### 路线二：追踪 UI 挂载链路

阅读目标：确认第 2、3 章后的 interactive runtime 如何变成 React tree。

```bash
rg -n "launchRepl\\(" claudecode-project/src/main.tsx
rg -n "export async function launchRepl|<App|<REPL|renderAndRun" claudecode-project/src/replLauncher.tsx
rg -n "export function App|AppStateProvider|StatsProvider|FpsMetricsProvider" claudecode-project/src/components/App.tsx
```

应该看到：

- `main.tsx` 多个分支调用 `launchRepl`
- `launchRepl` 动态 import `App` / `REPL`
- `App` 挂 provider

形成判断：

`launchRepl` 是 CLI runtime 和 TUI tree 的分界线。

### 路线三：定位 REPL 中的 TUI 元件

阅读目标：不深入 REPL 业务，只确认 UI 结构入口。

```bash
rg -n "import \\{ Box, Text|PromptInput|Messages|SpinnerWithVerb|useTerminalSize|useInput|useTerminalFocus|useTerminalTitle|useTabStatus" claudecode-project/src/screens/REPL.tsx
```

应该看到：

- REPL 使用 terminal hooks
- REPL 组合 Messages / PromptInput / Spinner
- REPL 使用 Box/Text 构建布局

形成判断：

REPL 是第 5 章的运行时协调器，但它在 UI 层已经可以看出三块：消息、输入、状态/进度/弹窗。

### 路线四：验证消息列表不是简单 map

阅读目标：确认 Messages 的性能和渲染策略。

```bash
rg -n "MessagesImpl|VirtualMessageList|React\\.memo\\(MessagesImpl|shouldRenderStatically|renderableMessages" claudecode-project/src/components/Messages.tsx
```

应该看到：

- `MessagesImpl`
- `VirtualMessageList`
- `React.memo`
- `shouldRenderStatically`

形成判断：

长会话消息列表需要虚拟化、静态/动态渲染判断和 memo，不是普通列表渲染。

### 路线五：验证 PromptInput 是组合控制台

阅读目标：确认输入区域包含哪些交互能力。

```bash
rg -n "function PromptInput|onSubmit|TextInput|VimTextInput|PromptInputFooter|PromptInputQueuedCommands|PromptInputModeIndicator|useInput\\(|export default React\\.memo\\(PromptInput\\)" claudecode-project/src/components/PromptInput/PromptInput.tsx
```

应该看到：

- `PromptInput` props 包含 `onSubmit`
- TextInput / VimTextInput 分支
- queued commands、mode indicator、footer
- `React.memo`

形成判断：

PromptInput 是输入控制台，不是普通文本框；第 5 章会继续追踪它的提交边界。

## 5 分钟源码速验

### 验证 1：统一 Ink 入口

```bash
sed -n '1,120p' claudecode-project/src/ink.ts
```

确认 `ThemeProvider` 包装、`render/createRoot`、`Box/Text/useInput` 导出。

### 验证 2：App + REPL 挂载

```bash
sed -n '1,80p' claudecode-project/src/replLauncher.tsx
```

确认 `launchRepl` 动态加载 `App` 和 `REPL`，并通过 `renderAndRun` 渲染。

### 验证 3：Provider shell

```bash
rg -n "FpsMetricsProvider|StatsProvider|AppStateProvider" claudecode-project/src/components/App.tsx
```

确认交互 UI tree 的 provider 层。

### 验证 4：消息列表虚拟化

```bash
rg -n "VirtualMessageList|React\\.memo\\(MessagesImpl|shouldRenderStatically" claudecode-project/src/components/Messages.tsx
```

确认消息渲染有虚拟列表和静态渲染判断。

### 验证 5：输入区域组合

```bash
rg -n "TextInput|VimTextInput|PromptInputFooter|PromptInputQueuedCommands|PromptInputModeIndicator|onSubmit" claudecode-project/src/components/PromptInput/PromptInput.tsx
```

确认 PromptInput 的组合结构和提交边界。

### 验证 6：REPL 引用 UI 元件

```bash
rg -n "Messages|PromptInput|SpinnerWithVerb|useInput|useTerminalFocus|useTerminalTitle|useTabStatus" claudecode-project/src/screens/REPL.tsx
```

确认第 5 章要继续深入的 REPL UI/事件入口。

## 关键模块逐段导读

### 1. `ink.ts`：UI primitive 的统一门面

运行时职责：

```text
render/createRoot
  -> withTheme
  -> themed Box/Text
  -> terminal hooks
```

设计意图：

- 让业务组件稳定从 `../ink.js` import。
- 把主题注入集中化。
- 保留底层 Ink 能力，同时默认使用 design-system 组件。

边界：

- 本章看 facade，不深入 `ink/root.js` reconciler。
- 终端底层渲染和性能问题留到高级工程化专题。

### 2. `replLauncher.tsx`：runtime 到 UI tree 的桥

运行时职责：

```text
launchRepl(root, appProps, replProps, renderAndRun)
  -> import App
  -> import REPL
  -> render tree
```

设计意图：

- 避免主入口静态拉入 REPL 大模块。
- 让 `main.tsx` 只负责准备 appProps/replProps。
- 让 REPL 真正成为 interactive runtime 的入口。

上下游：

- 上游：第 2 章 `main.tsx` 分支。
- 下游：第 5 章 `REPL.tsx`。

### 3. `App.tsx`：Provider shell

运行时职责：

```text
FpsMetricsProvider
  -> StatsProvider
  -> AppStateProvider
  -> REPL
```

设计意图：

- FPS/stats 是 UI 和性能横切数据。
- AppState 是 REPL 与子组件共享状态。
- `onChangeAppState` 把 state mutation 和外部副作用连接。

边界：

- 本章只确认 provider 注入。
- 第 6 章再讲 AppState store、selector、onChangeAppState。

### 4. `Messages.tsx`：长会话消息列表的渲染层

运行时职责：

```text
messages input
  -> renderableMessages
  -> VirtualMessageList
  -> message row/renderers
```

设计意图：

- 长会话不能简单全量重绘。
- streaming tool/thinking/compact/collapsed 状态需要不同渲染策略。
- `React.memo` 和 `shouldRenderStatically` 说明这里有明确性能边界。

边界：

- 本章不解释每种 message 类型。
- 第 7 章会讲消息模型和 API normalize。

### 5. `PromptInput.tsx`：输入控制台

运行时职责：

```text
TextInput/VimTextInput
  + queued commands
  + mode indicator
  + footer
  + suggestions/history/paste
  -> onSubmit
```

设计意图：

- 输入不仅是 prompt，还可能是 slash command、队列、模式切换、粘贴内容、历史导航。
- footer 和 mode indicator 是运行时状态的 UI 投影。
- TextInput focus 和 overlay/dialog 会影响 key handling。

边界：

- 本章只定位 `onSubmit` 边界。
- 第 5 章继续追踪 `onSubmit -> handlePromptSubmit -> query`。

### 6. Spinner、状态栏、提示信息：Agent 运行状态的 UI 投影

运行时职责：

```text
isLoading / streamMode / spinnerMessage / toolJSX / progress
  -> SpinnerWithVerb / status notices / footer indicators
```

设计意图：

- Agent turn 不是即时完成，需要持续反馈。
- tool execution、hooks、compact、thinking、background tasks 都可能改变可见状态。
- 状态提示不能只靠一个 loading boolean。

边界：

- 本章只看 UI 表达入口。
- 第 8 章 query 和第 10 章 tool orchestration 会解释状态来源。

## 与前后章节的关系

### 承接第 3 章

第 3 章准备了配置、env、shutdown 和网络环境。本章假设这些已经完成，开始把 interactive runtime 渲染成终端 UI。

```text
init completed
  -> main action chooses interactive path
  -> launchRepl
  -> Ink/React tree
```

### 连接第 5 章 REPL

第 4 章只建立 REPL 周围的 UI 基础设施。第 5 章会深入：

- 用户输入如何提交
- message queue 如何处理
- query 如何被调用
- permission UI 如何阻塞/恢复工具执行
- cancel/interruption 如何影响 UI 和运行时

### 连接 AppState、Message、query、tool、permission、command、MCP

- AppState：`App` 注入 Provider，第 6 章深入。
- Message：`Messages` 渲染消息，第 7 章深入 message model。
- query：Spinner/streaming/progress 的来源，第 8 章深入。
- tool：tool progress/tool JSX 最终进入 UI，第 10 章深入。
- permission：dialog/fullscreen layout 后续会展示权限请求，第 11 章深入。
- command：PromptInput 和 queued commands 连接 slash command，第 12 章深入。
- MCP：PromptInput footer/MCP 状态、tools/resources 后续会进入第 13 章。

## 教学可视化表达方式

### 1. TUI 挂载图

```text
main.tsx
  -> launchRepl
       -> App
            ├─ FpsMetricsProvider
            ├─ StatsProvider
            └─ AppStateProvider
                 -> REPL
                      ├─ Messages
                      ├─ PromptInput
                      ├─ Dialogs
                      ├─ Spinner
                      └─ Status UI
```

### 2. TUI primitive facade 图

```text
ink/root.js
  -> ink.ts
       ├─ withTheme
       ├─ render/createRoot
       ├─ ThemedBox / ThemedText
       ├─ useInput / useStdin
       ├─ useTerminalFocus / useTerminalTitle / useTabStatus
       └─ lower-level terminal primitives
```

### 3. 消息与输入双区域图

```text
┌──────────────────────────────┐
│ Messages                     │
│  VirtualMessageList          │
│  static/dynamic render rows  │
├──────────────────────────────┤
│ Spinner / notices / status   │
├──────────────────────────────┤
│ PromptInput                  │
│  TextInput / VimTextInput    │
│  queued commands / footer    │
└──────────────────────────────┘
```

### 4. 第 4 到第 5 章边界图

```text
第 4 章：UI infrastructure
  PromptInput exists
  Messages renders
  Spinner displays
  Dialog slots exist

第 5 章：REPL runtime coordination
  onSubmit -> handlePromptSubmit
  messages -> query
  tool_use -> permission UI
  stream events -> UI updates
```

## 实践任务

### 任务 1：定位 TUI facade 符号

使用：

```bash
rg -n "withTheme|render\\(|createRoot\\(|default as Box|default as Text|useInput|useTerminalFocus|useTerminalTitle|useTabStatus" claudecode-project/src/ink.ts
```

产出格式：

```markdown
| 符号 | 行号 | 作用 | 为什么要统一从 ink.ts 导出 |
| --- | --- | --- | --- |
| `withTheme` | ... | ... | ... |
```

### 任务 2：画 `launchRepl -> App -> REPL` 证据链

使用：

```bash
rg -n "launchRepl\\(" claudecode-project/src/main.tsx
sed -n '1,80p' claudecode-project/src/replLauncher.tsx
rg -n "FpsMetricsProvider|StatsProvider|AppStateProvider" claudecode-project/src/components/App.tsx
```

产出：

```text
main.tsx:...
  -> replLauncher.tsx: launchRepl
  -> App.tsx: providers
  -> REPL.tsx: runtime UI
```

### 任务 3：记录 REPL UI 入口行号

使用：

```bash
rg -n "Messages|PromptInput|SpinnerWithVerb|useInput|useTerminalFocus|useTerminalTitle|useTabStatus" claudecode-project/src/screens/REPL.tsx
```

产出格式：

```markdown
| UI/Hook | 行号 | 本章判断 | 第 5 章要继续追的问题 |
| --- | --- | --- | --- |
| `PromptInput` | ... | 输入区域入口 | onSubmit 如何进入 query？ |
```

### 任务 4：分析 Messages 的性能边界

使用：

```bash
rg -n "MessagesImpl|VirtualMessageList|React\\.memo\\(MessagesImpl|shouldRenderStatically|renderableMessages" claudecode-project/src/components/Messages.tsx
```

产出：

```markdown
## Messages 渲染策略

1. 虚拟列表证据：...
2. memo 边界证据：...
3. static/dynamic render 证据：...
4. 为什么长会话需要这些设计：...
```

### 任务 5：分析 PromptInput 组合结构

使用：

```bash
rg -n "function PromptInput|onSubmit|TextInput|VimTextInput|PromptInputFooter|PromptInputQueuedCommands|PromptInputModeIndicator|export default React\\.memo\\(PromptInput\\)" claudecode-project/src/components/PromptInput/PromptInput.tsx
```

产出一张结构图：

```text
PromptInput
  -> TextInput / VimTextInput
  -> QueuedCommands
  -> ModeIndicator
  -> Footer
  -> onSubmit boundary
```

并写 200 字解释为什么它不是普通表单输入。

### 任务 6：learning-framework 复刻任务

在 `learning-framework` 中实现一个简化 TUI：

建议文件：

```text
learning-framework/src/components/App.tsx
learning-framework/src/components/Messages.tsx
learning-framework/src/components/PromptInput.tsx
learning-framework/src/main.tsx
```

要求：

- 使用 App shell 包住全局状态。
- 页面分成消息区、状态区、输入区。
- 支持输入普通消息并追加到列表。
- 支持 `/clear` 清空消息。
- 底部状态栏显示当前消息数和输入模式。

产出：

```markdown
## TUI 复刻说明

1. 我复刻了哪些 Claude Code UI 边界：...
2. 我省略了哪些复杂能力：...
3. 哪些设计会在第 5 章继续补：...
```

### 任务 7：进阶分析题

任选一题，写 300-500 字：

1. 为什么 Claude Code 需要 `ink.ts` 作为 facade，而不是所有组件直接 import 底层 Ink？
2. 为什么消息列表需要 `VirtualMessageList` 和 static/dynamic render 判断？
3. `PromptInput` 为什么应该被看成交互控制台，而不是输入框组件？
4. TUI 中的 focus/key handling 和 Web DOM 事件系统最大的架构差异是什么？

## 常见误区

### 误区 1：把 Ink UI 当成 Web React 的低配版

Ink 不是浏览器 DOM 的替代皮肤。终端有自己的 frame、cursor、stdin、ANSI、viewport、focus、title/status 约束。Claude Code 的 UI 复杂度来自长期 Agent 会话，而不是组件写法不够简单。

### 误区 2：把 `App.tsx` 当视觉组件

`App` 是 provider shell，不负责具体视觉布局。它的价值是把 AppState、stats、FPS 注入 REPL tree。第 6 章 AppState 的很多问题，从这里开始进入组件树。

### 误区 3：认为 `Messages` 只是消息数组渲染

长会话、streaming、tool use、thinking、compact、collapsed content 都会影响渲染策略。`VirtualMessageList`、`React.memo`、`shouldRenderStatically` 都是性能和交互约束的证据。

### 误区 4：把 `PromptInput` 当普通文本框

PromptInput 连接 slash command、队列、history、paste、vim mode、footer、状态提示和 submit boundary。它是 Agent CLI 的输入控制台。

### 误区 5：第 4 章过早分析 query 和权限

本章只建立 UI 基础设施。query、permission、tool 的运行时协调在第 5、8、10、11 章再深入。不要把 UI 挂载链路和 Agent 执行链路混在第一遍读。

## 本章总结

本章建立的源码心智模型：

```text
ink.ts
  -> TUI primitive facade
main.tsx
  -> launchRepl
replLauncher.tsx
  -> <App><REPL /></App>
App.tsx
  -> providers
REPL.tsx
  -> Messages + PromptInput + Spinner + Dialogs
Messages.tsx
  -> VirtualMessageList
PromptInput.tsx
  -> TextInput/VimTextInput + footer + queued commands + onSubmit boundary
```

最重要的证据链：

```text
main.tsx launchRepl(...)
  -> replLauncher.tsx renderAndRun(<App><REPL /></App>)
  -> App.tsx AppStateProvider
  -> REPL.tsx imports Messages and PromptInput
  -> Messages.tsx VirtualMessageList
  -> PromptInput.tsx onSubmit boundary
```

如果你能解释这条链路，就已经知道 Claude Code 的终端 UI 是如何从 CLI runtime 接到 React tree 的。

## 下一章衔接

第 5 章会进入 `REPL.tsx`。下一章要继续追踪：

1. `PromptInput` 的 `onSubmit` 如何进入 `handlePromptSubmit`？
2. REPL 如何维护 messages、loading、streaming、tool JSX、permission queue？
3. query 的 stream event 如何驱动 Messages、Spinner、PromptInput 的更新？

第 4 章回答“终端 UI 怎么挂起来”，第 5 章回答“这个 UI 如何成为 Agent runtime 的协调器”。
