# 第 9 章：Tool 抽象层设计源码导读

## 本章定位

第 9 章承接第 8 章。query loop 已经能识别 tool_use，但还没有解释“工具为什么能被统一执行”。本章看 `src/Tool.ts` 如何定义工具协议。

主线：

```text
assistant tool_use
  -> find Tool by name
  -> inputSchema
  -> checkPermissions
  -> call
  -> ToolResult
  -> renderToolResultMessage / API tool_result
```

## 面向高级前端工程师的学习价值

Tool 不是普通函数。它是模型可调用能力的协议对象，至少同时服务四个系统：模型 prompt、输入校验、权限系统、执行结果、UI 渲染。

| 普通函数 | Claude Code Tool |
| --- | --- |
| 参数由开发者调用 | 参数来自模型，需要 schema 校验 |
| 直接执行 | 先经过权限、hooks、sandbox、取消 |
| 返回值给调用方 | 返回值要转成 tool_result 和 UI |
| 无并发语义 | `isConcurrencySafe` 影响调度 |

## 学习目标

1. 定位 Tool interface 的核心字段。
2. 解释 `inputSchema`、`prompt`、`isEnabled`、`isConcurrencySafe`、`checkPermissions`、`call` 的职责边界。
3. 追踪 ToolUseContext 如何把 AppState、MCP、permission、file history 带入工具。
4. 对比 Read/Bash/Write/Edit 的风险差异。
5. 在 learning-framework 中实现一个最小 Tool interface 和 ReadTool。

## 前置知识

需要理解 zod schema、LLM tool use、permission decision、React node 渲染。不会讲 zod 基础和普通函数抽象。

## 核心概念讲解

### 1. Tool 为什么存在

源码锚点：

```bash
rg -n "export type Tool<|inputSchema|isConcurrencySafe|isEnabled|checkPermissions|call\\(|renderToolResultMessage" claudecode-project/src/Tool.ts
```

Tool 抽象把模型世界和本地执行世界隔离开：

```text
model says: { name, input }
Tool protocol says: validate -> permission -> execute -> render -> result
```

### 2. ToolUseContext 是运行时依赖注入

```bash
rg -n "export type ToolUseContext|options|getAppState|setAppState|readFileState|updateFileHistoryState" claudecode-project/src/Tool.ts claudecode-project/src/screens/REPL.tsx
```

工具执行不能只拿 input。它需要 cwd、tools、MCP clients、permission context、AppState、file history、abort signal、hooks 等运行时资源。

### 3. schema 是模型输入边界

```bash
rg -n "inputSchema.safeParse|InputValidationError|tool.inputSchema" claudecode-project/src/services/tools/toolExecution.ts claudecode-project/src/services/tools/StreamingToolExecutor.ts
```

模型生成的 input 不是可信参数。schema 是第一道协议校验。

### 4. permission 是工具执行边界

```bash
rg -n "checkPermissionsAndCallTool|tool.checkPermissions|canUseTool|PermissionDecision" claudecode-project/src/services/tools/toolExecution.ts claudecode-project/src/Tool.ts
```

Tool 自身可提供 `checkPermissions`，通用执行层还会调用 `canUseTool` 和 hooks。安全边界不是单点。

## 核心源码地图

| 文件 | 看什么 | 不看什么 | 后续 |
| --- | --- | --- | --- |
| `src/Tool.ts` | Tool/ToolUseContext/ToolResult 协议 | 具体工具业务 | 第 10、11 章 |
| `src/services/tools/toolExecution.ts` | schema、permission、call、result 包装 | hooks 全量 | 第 10、11 章 |
| `src/services/tools/toolOrchestration.ts` | 工具并发/串行调度入口 | executor 细节 | 第 10 章 |
| `src/tools/FileReadTool/FileReadTool.ts` | 只读工具样例 | 文件读取边角 | 第 10 章 |
| `src/tools/BashTool/BashTool.tsx` | 高风险工具样例 | Bash 解析全量 | 第 10、11 章 |
| `src/tools/FileWriteTool/FileWriteTool.ts` | 写工具权限样例 | diff UI 细节 | 第 11 章 |

## 主调用链 / 主数据流

```text
query tool_use block
  -> runTools
  -> runToolUse / checkPermissionsAndCallTool
  -> findToolByName
  -> tool.inputSchema.safeParse
  -> tool.checkPermissions
  -> canUseTool
  -> tool.call(input, context)
  -> ToolResult
  -> tool_result message
```

## 源码阅读路线

```bash
rg -n "export type Tool<|export type ToolUseContext|export type ToolResult" claudecode-project/src/Tool.ts
rg -n "checkPermissionsAndCallTool|inputSchema.safeParse|tool.call" claudecode-project/src/services/tools/toolExecution.ts
rg -n "isConcurrencySafe|partitionToolCalls|runTools" claudecode-project/src/services/tools/toolOrchestration.ts
rg -n "get inputSchema|isConcurrencySafe|checkPermissions|async call" claudecode-project/src/tools/FileReadTool/FileReadTool.ts claudecode-project/src/tools/BashTool/BashTool.tsx claudecode-project/src/tools/FileWriteTool/FileWriteTool.ts
```

读完判断：Tool 是协议，不是函数集合。

## 5 分钟源码速验

```bash
rg -n "export type Tool<" claudecode-project/src/Tool.ts
rg -n "inputSchema.safeParse|tool.call" claudecode-project/src/services/tools/toolExecution.ts
rg -n "isConcurrencySafe|runToolsConcurrently|runToolsSerially" claudecode-project/src/services/tools/toolOrchestration.ts
rg -n "async checkPermissions|async call" claudecode-project/src/tools/FileReadTool/FileReadTool.ts claudecode-project/src/tools/BashTool/BashTool.tsx
```

## 关键模块逐段导读

`Tool.ts` 分三层读：

1. 权限上下文：`ToolPermissionContext` 定义 mode、allow/deny/ask rules、workspace directories。
2. 执行上下文：`ToolUseContext` 把 AppState、MCP、file history、options 传入工具。
3. 工具协议：`Tool` 定义 name、prompt、schema、enable、concurrency、permission、call、render。

`toolExecution.ts` 是 Tool 协议真正落地处：先找工具，再校验 input，再跑 permission/hooks，最后 call，并把返回结果变成 message。

## 与前后章节的关系

第 8 章 query 发现 tool_use；本章解释 tool_use 如何映射到 Tool 协议。第 10 章看工具池和内置工具差异。第 11 章深入 permission。

## 教学可视化表达方式

```text
Tool = prompt + schema + permission + call + render
```

```text
untrusted model input
  -> zod schema
  -> permission
  -> tool.call
  -> tool_result
```

```text
ToolUseContext
  -> AppState
  -> MCP clients
  -> file history
  -> permission context
```

## 实践任务

1. 定位 Tool interface、ToolUseContext、ToolResult 行号。
2. 对比 FileReadTool 和 BashTool 的 `isConcurrencySafe`、`checkPermissions`、`call`。
3. 追踪 toolExecution 中 schema 校验失败如何变成 tool_result error。
4. learning-framework 实现 `Tool` interface + `ReadTool`。
5. 进阶分析：为什么 `renderToolResultMessage` 不应该和 `call` 混在一起？

## 常见误区

1. 把 Tool 当普通函数。Tool 是模型协议对象。
2. 以为 schema 足够安全。schema 只校验形状，不判断操作风险。
3. 忽略 concurrency。工具是否能并发会影响 runTools 调度。
4. 把 UI render 放进执行逻辑。Claude Code 明确区分结果和展示。

## 本章总结

Tool 抽象的核心证据链：

```text
Tool.ts defines protocol
  -> toolExecution validates and calls
  -> toolOrchestration schedules
  -> concrete tools implement risk-specific behavior
```

## 下一章衔接

第 10 章进入内置工具系统：工具如何注册、过滤、合并 MCP 工具、按权限和 feature gate 组成工具池。
