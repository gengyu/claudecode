# 第 2 章：CLI 启动入口与 Commander 命令解析

## 本章定位

第 2 章进入 `main.tsx`。如果第 1 章是建立源码地图，那么本章就是顺着地图走进第一个真实交通枢纽：Claude Code 如何从一条命令行指令变成一个可运行的 AI CLI 会话。

对高级前端工程师来说，`main.tsx` 不应该被理解成“一个过大的入口文件”，而应该先被理解成一个 **CLI runtime router**：

```text
process.argv
  -> Commander 参数解析
  -> preAction 初始化
  -> action handler 计算运行时上下文
  -> print/headless 或 interactive/REPL 分流
  -> query/tool/permission/state 在后续链路中接管
```

它承担的职责类似前端应用里的 bootstrap、router guard、feature flag 初始化、全局配置注入、首屏模式分流的组合体。区别在于，Web 前端通常分流到不同页面，而 Claude Code 分流到不同运行时：交互式 REPL、非交互式 print、远程、SSH、MCP server、plugin/auth 等子命令。

本章保持课程原体系不变，覆盖 `SYSTEMATIC_COURSE.md` 第 2 章规定的 7 个知识点：

1. 顶层副作用：启动性能优化
2. `CommanderCommand` 创建 CLI 程序
3. 全局参数与 option 定义
4. `preAction` 初始化钩子
5. `program.action` 主处理器
6. `--print` 非交互模式
7. session、model、permission 等 CLI 参数如何进入应用状态

## 学习目标

完成本章后，你应该能够：

1. 解释 `main.tsx` 为什么既像入口，又像运行时路由器。
2. 找到 Commander 创建、全局参数定义、`preAction` 和主 `.action()` 的源码位置。
3. 画出 `claude`、`claude -p`、`claude --resume` 这几类路径的分流逻辑。
4. 说清楚 `--model`、`--permission-mode`、`--allowedTools`、`--mcp-config` 等参数如何影响后续 state、tool、permission、query。
5. 通过 `rg` 验证 `main.tsx -> runHeadless` 和 `main.tsx -> launchRepl` 两条核心路径。
6. 理解为什么 print 模式不是“没有 UI 的 REPL”，而是独立的 headless runtime。

## 前置知识

本章不讲 Commander.js 基础语法。默认你知道 CLI option、argument、subcommand 的基本概念。你需要带着前端架构经验理解这些映射关系：

| 前端应用概念 | Claude Code CLI 中的对应物 |
| --- | --- |
| `bootstrap()` | `run()`、顶层预热、`init()` |
| router guard | `program.hook('preAction')` |
| route params/query | Commander options 和 prompt argument |
| feature flags | `feature(...)`、env gate、settings gate |
| app shell | 交互模式下的 `launchRepl(...)` |
| SSR/批处理入口 | `--print` 下的 `runHeadless(...)` |
| global app state seed | `initialState`、`headlessInitialState`、bootstrap state setters |

你还应该延续第 1 章的方法：每个架构判断都要能落到源码符号，而不是停留在“感觉应该如此”。

## 核心概念讲解

### 1. `main.tsx` 是 runtime router，不只是入口

普通 CLI 入口可能只做：

```text
parse args -> call handler -> exit
```

Claude Code 的入口复杂得多，因为它要在启动早期做出多个会影响后续运行时的决策：

- 是否是 `--print` 非交互模式
- 是否需要跳过或延迟某些交互能力
- 是否要恢复已有 session
- 是否指定 model、agent、permission mode
- 是否加载 MCP、plugin、skills、agents
- 是否进入远程或 SSH 模式
- 是否注册大量子命令
- 是否连接 IDE、Chrome、bridge、server

这些决策都发生在用户真正进入 REPL 或 headless query 之前。因此 `main.tsx` 是 AI CLI 主链路上的第一个 runtime router。

### 2. 顶层副作用服务于启动性能

`main.tsx` 文件开头有一些刻意放在其他 import 之前的副作用，比如 startup profiler、MDM 读取、keychain 预取。第一遍读到这里，不要用普通前端入口“避免顶层副作用”的标准直接否定它。

它的设计意图是：在大量模块 import 期间，把可以并行的启动工作提前发出去。后面 `preAction` 再 await 这些预热结果。

主链路可以这样理解：

```text
module evaluation
  -> startMdmRawRead()
  -> startKeychainPrefetch()
  -> import 大量模块
  -> run()
  -> preAction await ensureMdmSettingsLoaded / ensureKeychainPrefetchCompleted
```

这是 CLI 产品常见的启动优化：把 IO 型准备工作和模块加载重叠，而不是串行等待。

### 3. Commander 定义的是运行时契约

`program.name(...).description(...).argument(...).option(...).action(...)` 不是简单的帮助文档配置。对 Claude Code 来说，每一个 option 都可能改变后续 runtime：

| option | 后续影响 |
| --- | --- |
| `-p, --print` | 进入 headless `runHeadless`，不启动 REPL |
| `--output-format` | 决定 stdout 协议：text/json/stream-json |
| `--input-format` | 决定 stdin 消息协议 |
| `--model` | 影响 main loop model |
| `--permission-mode` | 影响工具权限上下文 |
| `--allowedTools` / `--disallowedTools` | 影响工具池过滤 |
| `--mcp-config` | 影响 MCP server、tools、commands |
| `--system-prompt` / `--append-system-prompt` | 影响 query 的 system prompt |
| `--continue` / `--resume` | 影响 session recovery |
| `--plugin-dir` | 影响 plugin/skills/command/tool 扩展 |

所以本章读 `.option()` 的方法不是背 Commander API，而是追问：这个参数最终会进入哪个核心模块？

### 4. `preAction` 是命令执行前的 runtime guard

`program.hook('preAction')` 的作用类似前端 router guard，但它不是鉴权页面跳转，而是给所有真正执行的命令准备环境：

```text
preAction
  -> await MDM/keychain 预取
  -> await init()
  -> 设置 process.title
  -> initSinks()
  -> setInlinePlugins()
  -> runMigrations()
  -> loadRemoteManagedSettings()
  -> loadPolicyLimits()
```

这段逻辑有两个关键点：

1. 显示帮助时不需要跑完整初始化，所以初始化放在 `preAction`，而不是无条件放在模块加载后。
2. subcommand 也需要共享初始化能力，比如 logging sinks、plugin-dir、migrations、remote settings。

也就是说，`preAction` 是“命令真的要执行了”的边界。

### 5. 主 `.action()` 负责把 CLI 参数翻译成运行时上下文

主 `.action(async (prompt, options) => { ... })` 是默认 `claude [prompt]` 的核心处理器。它不是直接调用模型，而是完成一系列上下文组装：

- 规范化 prompt 和 stdin
- 判断 print / interactive
- 解析 model、effort、agent、betas
- 计算 permission mode 和 tool permission context
- 加载 settings、MCP、plugin、skills、commands
- 组装 initial state 或 headless state
- 根据 session/resume/continue/direct connect/SSH 等分支决定进入哪个 runtime

它把命令行世界翻译成后续 REPL 或 headless runtime 需要的结构。

### 6. `--print` 是独立 headless runtime

`--print` 不是“启动 REPL 但不显示 UI”。它进入 `src/cli/print.ts` 的 `runHeadless(...)`，有自己的 state store、stdin/stdout 协议、stream-json 支持、SDK 控制消息、MCP 连接策略和 permission prompt tool。

主链路是：

```text
main.tsx action
  -> isNonInteractiveSession
  -> build headlessInitialState
  -> createStore(...)
  -> connect MCP for print mode
  -> import('src/cli/print.js')
  -> runHeadless(...)
  -> print.ts 内部调用 ask/query 相关能力
```

这条路径最终仍然会进入 Agent 能力和工具能力，但绕过了 `REPL.tsx` 的交互 UI。

### 7. 交互模式进入 `launchRepl`

非 print 的默认路径最终会进入 `launchRepl(root, ..., sessionConfig, renderAndRun)`。这一刻，CLI 参数已经被翻译成 REPL 所需的上下文：

- `commands`
- `initialTools`
- `mcpClients`
- `thinkingConfig`
- `mainThreadAgentDefinition`
- `initialMessages`
- `initialState`
- `permission` 相关通知
- resume/continue 相关恢复结果

从这里开始，课程主线会交给第 5 章的 `REPL.tsx`。

## 关键源码入口

第 2 章建议重点读这些入口：

| 文件 | 本章阅读重点 |
| --- | --- |
| `claudecode-project/src/main.tsx` | Commander 初始化、option 定义、`preAction`、主 `.action()`、print/interactive 分流 |
| `claudecode-project/src/entrypoints/init.ts` | `preAction` 里调用的初始化函数，第 3 章会深入 |
| `claudecode-project/src/cli/print.ts` | `--print` 进入的 headless runtime |
| `claudecode-project/src/replLauncher.tsx` | 交互模式进入 REPL 的启动包装 |
| `claudecode-project/src/interactiveHelpers.tsx` | `renderAndRun`、setup screens、错误渲染等交互辅助 |
| `claudecode-project/src/bootstrap/state.ts` | CLI 参数落到全局 bootstrap state 的位置 |
| `claudecode-project/src/utils/permissions/permissionSetup.js` | permission mode 和工具权限上下文初始化 |
| `claudecode-project/src/utils/model/model.js` | `--model` 解析和规范化 |

本章不要求读完 `main.tsx` 的全部 4600 多行。高级读法是先打锚点，再沿分支深入。

## 源码阅读路线

### 路线一：定位 Commander 骨架

先确认 `run()` 里的四段结构：

```bash
rg -n "async function run|new CommanderCommand|program\\.hook\\('preAction'|program\\.name\\('claude'|\\.action\\(async|program\\.parseAsync" claudecode-project/src/main.tsx
```

你要得到的骨架是：

```text
run()
  -> new CommanderCommand()
  -> program.hook('preAction')
  -> program.name(...).argument(...).option(...).action(...)
  -> subcommands registration
  -> program.parseAsync(process.argv)
```

第一遍不要陷入 option 链的细节，先确认它确实是一个 Commander runtime router。

### 路线二：分离初始化、参数定义、主处理器

用下面命令切出三个区域：

```bash
rg -n "program\\.hook\\('preAction'|await init\\(|initSinks|loadRemoteManagedSettings|loadPolicyLimits" claudecode-project/src/main.tsx
rg -n "--print|--model|--permission-mode|--allowedTools|--mcp-config|--session-id|--plugin-dir" claudecode-project/src/main.tsx
rg -n "action_handler_start|isNonInteractiveSession|runHeadless|launchRepl" claudecode-project/src/main.tsx
```

你要建立的判断：

- `preAction` 管“命令执行前准备”
- `.option()` 管“外部契约”
- `.action()` 管“把参数翻译成 runtime state”
- `runHeadless` 和 `launchRepl` 是两条关键出口

### 路线三：追踪 `--print`

```bash
rg -n "hasPrintFlag|setIsInteractive|isNonInteractiveSession|--print mode|runHeadless" claudecode-project/src/main.tsx
rg -n "export async function runHeadless|ask\\(|assembleToolPool|outputFormat|inputFormat" claudecode-project/src/cli/print.ts
```

要确认的链路：

```text
-p / --print
  -> setIsInteractive(false)
  -> main action 进入 isNonInteractiveSession 分支
  -> 构造 headlessInitialState
  -> createStore
  -> 连接 MCP
  -> runHeadless
  -> print.ts 内部继续走 ask/query/tool 能力
```

这一步能帮你避免一个常见误解：print 不是 REPL 的显示开关，而是独立 headless runtime。

### 路线四：追踪交互模式

```bash
rg -n "launchRepl\\(" claudecode-project/src/main.tsx
rg -n "initialState|initialMessages|commands|initialTools|mcpClients|thinkingConfig" claudecode-project/src/main.tsx
rg -n "export.*launchRepl|function launchRepl" claudecode-project/src/replLauncher.tsx
```

要确认：

- `main.tsx` 可能在多个 resume/remote/SSH/default 分支调用 `launchRepl`
- 每个分支传入的 `initialState`、`initialMessages`、`sessionConfig` 不同
- 进入 `launchRepl` 后，REPL 才成为主协调器

### 路线五：追踪 model、permission、tool 如何被 CLI 参数影响

```bash
rg -n "parseUserSpecifiedModel|setInitialMainLoopModel|getInitialMainLoopModel" claudecode-project/src/main.tsx
rg -n "initialPermissionModeFromCLI|initializeToolPermissionContext|toolPermissionContext|setSessionBypassPermissionsMode" claudecode-project/src/main.tsx
rg -n "parseToolListFromCLI|allowedTools|disallowedTools|getTools|assembleToolPool" claudecode-project/src/main.tsx claudecode-project/src/tools.ts claudecode-project/src/cli/print.ts
```

要确认：

- CLI 参数不是停留在 options 对象里，而是被写入 bootstrap state、tool permission context、headless/interactive initial state。
- 工具是否可见、是否可用、是否需要权限，早在入口阶段就开始被配置。

## 5 分钟源码速验

这组命令用于快速验证本章主链路。

### 验证 1：Commander 骨架

```bash
rg -n "new CommanderCommand|program\\.hook\\('preAction'|program\\.name\\('claude'|\\.action\\(async|parseAsync" claudecode-project/src/main.tsx
```

你应该能看到 Commander 创建、preAction、主 action 和 parseAsync。

### 验证 2：核心 option 是否存在

```bash
rg -n "--print|--model|--permission-mode|--allowedTools|--disallowedTools|--mcp-config|--session-id" claudecode-project/src/main.tsx
```

你应该能看到这些 option 都在主命令链上定义。

### 验证 3：print 分支出口

```bash
rg -n "--print mode|isNonInteractiveSession|runHeadless" claudecode-project/src/main.tsx
rg -n "export async function runHeadless" claudecode-project/src/cli/print.ts
```

你应该能确认 `--print` 出口是 `runHeadless`。

### 验证 4：interactive 分支出口

```bash
rg -n "launchRepl\\(" claudecode-project/src/main.tsx
rg -n "launchRepl" claudecode-project/src/replLauncher.tsx
```

你应该能看到多个 interactive 分支最终进入 `launchRepl`。

### 验证 5：permission/model/tool 进入运行时

```bash
rg -n "initialPermissionModeFromCLI|initializeToolPermissionContext|parseUserSpecifiedModel|setInitialMainLoopModel|parseToolListFromCLI" claudecode-project/src/main.tsx
```

你应该能确认 CLI 参数在入口阶段就开始影响后续 query 和 tool runtime。

## 主调用链

### 默认交互模式

```text
shell: claude "fix this"
  -> process.argv
  -> program.parseAsync
  -> preAction
       -> init()
       -> settings / migrations / remote policy
  -> program.action(prompt, options)
       -> parse model / permission / tool options
       -> load commands / MCP / plugins / skills
       -> build initialState / sessionConfig
  -> launchRepl(...)
  -> REPL.tsx
  -> query.ts
  -> tools / permissions
```

### 非交互 print 模式

```text
shell: claude -p "summarize"
  -> process.argv
  -> early print detection: setIsInteractive(false)
  -> program.parseAsync
  -> preAction
  -> program.action(prompt, options)
       -> isNonInteractiveSession
       -> build headlessInitialState
       -> create headlessStore
       -> connect MCP for turn 1
       -> import cli/print.ts
  -> runHeadless(...)
  -> ask/query/tool runtime
  -> stdout text/json/stream-json
```

### 恢复会话模式

```text
shell: claude --resume <id>
  -> Commander parses resume option
  -> action loads conversation/session state
  -> restore initialState / initialMessages
  -> launchRepl(...)
  -> REPL continues with restored state
```

这些链路说明：`main.tsx` 不直接代表 Agent 执行本身，它负责把不同入口形态翻译成后续 runtime 所需的状态。

## 与核心模块的关联

### 和 REPL 的关系

`main.tsx` 负责启动前的上下文组装，`REPL.tsx` 负责启动后的交互编排。它们的边界大致是：

```text
main.tsx
  -> 解析 CLI、配置 runtime、恢复 session、准备 initialState
  -> launchRepl(...)

REPL.tsx
  -> 接管用户输入、消息流、query 消费、权限 UI、工具状态
```

所以第 2 章读 `main.tsx` 时，不需要深入用户输入如何变成消息，那是第 5 章。

### 和 query 的关系

`main.tsx` 不直接承担 Agent loop，但它会决定 query 的初始条件：

- 使用哪个 model
- system prompt 如何构造
- thinking/effort 如何设置
- max turns、budget、fallback model 是否启用
- print 模式还是 REPL 模式消费 query 事件

query 是执行引擎，main 是执行前的 runtime 配置器。

### 和 tool 的关系

入口阶段会解析：

- `--allowedTools`
- `--disallowedTools`
- `--tools`
- `--mcp-config`
- `--plugin-dir`
- `--disable-slash-commands`

这些会影响后续工具池的可见性和可用性。尤其在 print 模式中，`main.tsx` 会尽量让 MCP tools 在第一轮前准备好，因为 headless 往往只有单 turn。

### 和 permission 的关系

`--permission-mode`、`--dangerously-skip-permissions`、`--allow-dangerously-skip-permissions` 等参数在入口阶段就被解析，并进入 `toolPermissionContext`。

这意味着权限系统不是工具执行时才临时判断，它的基础上下文在 CLI 启动阶段已经生成。后续 REPL 或 print 只是使用这个上下文做具体决策。

### 和 state 的关系

`main.tsx` 会写入 bootstrap state，也会构造 interactive 或 headless 的初始 AppState：

```text
CLI options
  -> bootstrap/state setters
  -> initialState or headlessInitialState
  -> REPL store or headless store
```

这和前端应用中把 URL/query/env/settings 转成初始 store 很像，只是这里还混入了模型、工具、权限和 MCP 维度。

## 教学可视化表达方式

### 1. `main.tsx` 三段结构图

```text
┌─────────────────────────────────────┐
│ Top-level warmup                    │
│ profiler / MDM / keychain prefetch  │
├─────────────────────────────────────┤
│ Commander declaration               │
│ name / argument / options / hooks   │
├─────────────────────────────────────┤
│ Runtime action                      │
│ parse options -> build context      │
│   ├─ print -> runHeadless           │
│   └─ interactive -> launchRepl      │
└─────────────────────────────────────┘
```

### 2. Option 到 Runtime 的映射图

```text
--model              -> model parsing -> query config
--permission-mode    -> toolPermissionContext -> canUseTool
--allowedTools       -> tool filtering -> model-visible tools
--mcp-config         -> MCP clients/tools/commands -> tool pool
--resume             -> session restore -> initialMessages
--print              -> headless store -> runHeadless
```

### 3. 双出口图

```text
                 main.tsx action
                       │
          ┌────────────┴────────────┐
          │                         │
  isNonInteractiveSession       interactive
          │                         │
  cli/print.ts runHeadless      launchRepl
          │                         │
  stdout protocol               REPL.tsx
          │                         │
      ask/query                 query stream
          │                         │
       tools                   tools + UI
```

这个图适合解释为什么 `--print` 和 REPL 是两条 runtime，而不是同一个 UI 的两个显示状态。

## 实践任务

### 任务 1：画出 `main.tsx` 的真实骨架

用 `rg` 找到以下符号的行号，画一张带行号的骨架图：

```bash
rg -n "async function run|new CommanderCommand|program\\.hook\\('preAction'|program\\.name\\('claude'|\\.action\\(async|parseAsync" claudecode-project/src/main.tsx
```

产出格式：

```markdown
| 符号 | 行号 | 作用 |
| --- | --- | --- |
| `new CommanderCommand` | ... | 创建 CLI program |
```

### 任务 2：追踪 `--print` 证据链

要求写出完整证据链，并标注每一段对应文件：

```text
--print option
  -> print flag / isNonInteractiveSession
  -> headlessInitialState
  -> runHeadless
  -> print.ts ask/query
```

建议检索：

```bash
rg -n "--print|isNonInteractiveSession|headlessInitialState|runHeadless" claudecode-project/src/main.tsx
rg -n "runHeadless|ask\\(" claudecode-project/src/cli/print.ts
```

### 任务 3：追踪交互模式进入 REPL

找到 `launchRepl` 的调用点，挑一个默认路径或 resume 路径分析它传入了哪些关键参数：

```bash
rg -n "launchRepl\\(" claudecode-project/src/main.tsx
```

产出：

- 当前分支是什么场景？
- 传入了哪些 state？
- 传入了哪些 commands/tools/MCP 信息？
- 哪些信息会在第 5 章的 REPL 中继续使用？

### 任务 4：分析一个 CLI option 的生命周期

从下面任选一个 option：

- `--model`
- `--permission-mode`
- `--allowedTools`
- `--mcp-config`
- `--session-id`

追踪它从 `.option()` 定义到后续 runtime 的路径。产出格式：

```markdown
## `--permission-mode` 生命周期

1. 在 `main.tsx` 中定义位置：...
2. 在 action 中读取位置：...
3. 进入的运行时结构：...
4. 后续影响模块：permission / tool / REPL / print
5. 我还没确认的问题：...
```

### 任务 5：实现一个 learning-framework 版本的入口骨架

在 `learning-framework` 中实现一个简化 CLI 入口，支持：

- `[prompt]`
- `--print`
- `--model`
- `--permission-mode`
- `--allowed-tools`

要求只打印解析结果和将要进入的 runtime：

```text
runtime: interactive
model: sonnet
permissionMode: default
prompt: ...
```

进阶要求：把解析结果转成一个 `InitialRuntimeConfig`，不要在业务代码里到处传 Commander 的 `options`。

### 任务 6：进阶分析题

任选一题，写 300-500 字：

1. 为什么 `preAction` 比“模块加载后立即 init”更适合这个 CLI？
2. 为什么 `--print` 要有独立 headless runtime，而不是复用 REPL 后隐藏 UI？
3. 为什么 `main.tsx` 的 option 定义会越来越多？这是不是架构问题？
4. CLI 参数为什么会影响 tool、permission、query、state 多个系统？

## 常见误区

### 误区 1：把 `main.tsx` 当成普通前端入口文件评价

前端入口通常很薄，但 CLI 产品入口天然承担更多 runtime 分流。先理解它的 router 角色，再讨论是否需要拆分。

### 误区 2：认为 `.option()` 只是帮助文案

在 Claude Code 中，option 是用户能改变 runtime 的外部契约。读 option 要追踪它对 model、state、tool、permission、MCP、session 的影响。

### 误区 3：把 `preAction` 看成普通初始化

`preAction` 的关键价值在边界：只有命令真正执行才初始化，显示 help 不需要。同时它让 subcommand 共享必要环境。

### 误区 4：误以为 print 模式只是“无 UI 输出”

print 模式有自己的 store、stdout 协议、MCP 策略和 SDK 控制能力。它最终使用 Agent 能力，但入口 runtime 和 REPL 不同。

### 误区 5：过早深入所有 subcommand

`main.tsx` 后半部分有大量 subcommand 注册。第 2 章先读默认主命令和 print/interactive 双出口，subcommand 体系后面会在第 12 章集中处理。

## 本章总结

第 2 章的核心结论：

1. `main.tsx` 是 Claude Code 的 CLI runtime router。
2. 顶层预热和 `preAction` 共同服务于启动性能与执行前初始化。
3. Commander option 定义的是运行时契约，不只是 CLI 帮助信息。
4. 主 `.action()` 把 CLI 参数翻译成 model、permission、tool、MCP、session、state 等运行时上下文。
5. `--print` 进入 `runHeadless`，交互模式进入 `launchRepl`，两条路径都会继续连接 Agent 和 Tool 系统。

请带着这条证据链进入下一章：

```text
main.tsx
  -> preAction
  -> init()
  -> action
  -> runHeadless 或 launchRepl
```

## 下一章衔接

第 3 章会进入 `entrypoints/init.ts`，回答本章留下的问题：`preAction` 中的 `init()` 到底做了什么，为什么配置、安全环境变量、远程策略、清理函数、网络代理、证书和 telemetry 初始化要在进入 REPL 或 print runtime 之前完成。

如果说第 2 章讲的是“入口如何分流”，第 3 章讲的就是“进入任何分流前，系统必须先准备好什么”。
