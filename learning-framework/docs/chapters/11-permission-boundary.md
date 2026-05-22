# 第 11 章：权限系统与安全边界源码导读

## 本章定位

第 11 章承接第 9-10 章工具系统。工具池决定“模型能看到什么工具”，权限系统决定“模型能不能执行某次具体操作”。这是 AI CLI 和普通 CLI 最大的工程差异之一。

主线：

```text
tool_use
  -> tool.checkPermissions
  -> canUseTool
  -> allow / deny / ask
  -> PermissionRequest UI
  -> update toolPermissionContext
  -> continue / reject tool execution
```

## 面向高级前端工程师的学习价值

不要把权限理解为设置页选项。Claude Code 的 permission 是运行时协议：

| 普通前端权限 | Claude Code 权限 |
| --- | --- |
| 页面/按钮是否显示 | 工具是否暴露 + 本次执行是否允许 |
| 静态 role | mode + allow/deny/ask rules + workspace |
| 弹窗确认 | tool runtime 的暂停/继续点 |
| 表单提交 | 可能改变未来规则 |

## 学习目标

1. 定位 permission mode、rule、decision 类型。
2. 追踪 `useCanUseTool` 如何把 ask decision 转成 UI queue。
3. 解释工具级 `checkPermissions`、通用 `canUseTool`、UI `PermissionRequest` 的分工。
4. 找到 Bash 危险命令、文件写入、workspace directory 的边界。
5. 在 learning-framework 中复刻 allow/deny/ask + permission dialog。

## 前置知识

需要理解 Tool 协议、AppState 的 `toolPermissionContext`、REPL 的 `toolUseConfirmQueue`。不讲基础 RBAC。

## 核心概念讲解

### 1. 权限为什么存在

```bash
rg -n "PermissionMode|PermissionBehavior|PermissionDecision|ToolPermissionContext" claudecode-project/src/types/permissions.ts claudecode-project/src/Tool.ts
```

AI CLI 允许模型读写文件、执行命令、访问网络。权限系统必须在能力和安全之间建立动态边界。

### 2. allow/deny/ask 是执行决策

```bash
rg -n "behavior: 'allow'|behavior: 'deny'|behavior: 'ask'|alwaysAllowRules|alwaysDenyRules" claudecode-project/src/types/permissions.ts claudecode-project/src/utils/permissions/permissions.ts
```

`ask` 不是失败，而是暂停工具执行，交给用户或远程 permission bridge 决策。

### 3. useCanUseTool 连接 runtime 和 UI

```bash
rg -n "function useCanUseTool|setToolUseConfirmQueue|case \"ask\"|ToolUseConfirm" claudecode-project/src/hooks/useCanUseTool.tsx
```

当 permission result 是 ask，REPL 会把确认请求放进 queue，渲染 `PermissionRequest`。

### 4. PermissionRequest 是运行时暂停点

```bash
rg -n "PermissionRequest|BashPermissionRequest|FileWritePermissionRequest|SandboxPermissionRequest|onDone|onReject" claudecode-project/src/components/permissions -g '*.{ts,tsx}'
```

权限弹窗不是装饰 UI。它的结果会决定工具继续、拒绝、以及是否更新 future rule。

### 5. Bash 是权限复杂度最高的工具

```bash
rg -n "BashTool|bashPermissions|dangerous|readOnly|pathValidation|destructive" claudecode-project/src/tools/BashTool -g '*.{ts,tsx}'
```

Bash 需要处理语义风险、路径风险、wrapper、redirection、sed、rm/rmdir、sandbox 等多层判断。

## 核心源码地图

| 文件 | 看什么 | 不看什么 | 后续 |
| --- | --- | --- | --- |
| `src/types/permissions.ts` | mode/decision/rule 类型 | 每个类型字段背诵 | 本章 |
| `src/Tool.ts` | `ToolPermissionContext` | Tool 协议已讲 | 第 9 章 |
| `src/hooks/useCanUseTool.tsx` | ask queue 与 decision flow | UI 细节 | 本章重点 |
| `src/components/permissions/*` | 权限弹窗分发 | 每个表单细节 | 实践参考 |
| `src/utils/permissions/*` | rule matching、path safety | 所有 classifier 算法 | 高级专题 |
| `src/tools/BashTool/*` | 高风险命令权限 | bash parser 全量 | 深入任务 |

## 主调用链 / 主数据流

```text
runToolUse
  -> tool.checkPermissions(input, context)
  -> canUseTool(tool, input, context, assistantMessage, toolUseID)
  -> allow: execute tool.call
  -> deny: yield rejected tool_result
  -> ask: setToolUseConfirmQueue
       -> REPL renders PermissionRequest
       -> user chooses yes/no/yes-dont-ask
       -> update toolPermissionContext?
       -> continue / reject
```

## 源码阅读路线

```bash
rg -n "PermissionMode|PermissionBehavior|PermissionDecision" claudecode-project/src/types/permissions.ts
rg -n "useCanUseTool|setToolUseConfirmQueue|case \"ask\"" claudecode-project/src/hooks/useCanUseTool.tsx
rg -n "toolUseConfirmQueue|PermissionRequest|setToolPermissionContext" claudecode-project/src/screens/REPL.tsx
rg -n "getDenyRuleForTool|toolPermissionResult|alwaysAllowedRule" claudecode-project/src/utils/permissions/permissions.ts
rg -n "checkPermissions\\(|dangerous|readOnly" claudecode-project/src/tools/BashTool/BashTool.tsx claudecode-project/src/tools/BashTool/*.ts
```

## 5 分钟源码速验

```bash
rg -n "export type PermissionMode|export type PermissionBehavior" claudecode-project/src/types/permissions.ts
rg -n "function useCanUseTool|setToolUseConfirmQueue" claudecode-project/src/hooks/useCanUseTool.tsx
rg -n "PermissionRequest|toolUseConfirmQueue" claudecode-project/src/screens/REPL.tsx
rg -n "BashPermissionRequest|FileWritePermissionRequest|SandboxPermissionRequest" claudecode-project/src/components/permissions -g '*.{ts,tsx}'
```

## 关键模块逐段导读

1. 类型层：定义 mode、rule、decision。
2. 工具层：每个工具可给出自己的 `checkPermissions`。
3. 通用判断层：`useCanUseTool` 整合 permission result 和 UI queue。
4. UI 层：`PermissionRequest` 分发到 Bash/File/Web/Sandbox 等具体请求组件。
5. 状态层：用户选择可能更新 AppState 的 `toolPermissionContext`。

## 与前后章节的关系

第 10 章说明工具池可被 deny rule 过滤；本章说明即使工具已暴露，执行时仍要权限判断。第 12 章的 `/permissions`、`/config` 等命令会修改权限相关状态。第 14 章 remote/bridge 会让权限请求跨进程/跨端。

## 教学可视化表达方式

```text
tool visible != tool executable
```

```text
allow -> call
deny  -> rejected result
ask   -> UI/remote prompt -> decision
```

```text
Bash command
  -> syntax/semantic checks
  -> path/workspace checks
  -> rules
  -> sandbox
  -> user approval
```

## 实践任务

1. 定位 PermissionMode、PermissionDecision、ToolPermissionContext 行号。
2. 追踪一次 ask 从 `useCanUseTool` 到 `PermissionRequest` 的调用链。
3. 记录 BashTool 的 `checkPermissions` 行号和它依赖的权限 helper。
4. learning-framework 实现 allow/deny/ask，写一个 BashTool 默认 ask。
5. 进阶分析：为什么权限不能只在工具池过滤阶段完成？

## 常见误区

1. 把权限当设置项。权限是执行时协议。
2. 认为工具显示了就一定能执行。执行时还有 `checkPermissions`。
3. 把 ask 当 error。ask 是 runtime pause。
4. 低估 Bash 权限复杂度。命令语义远比文件读写复杂。

## 本章总结

证据链：

```text
Permission types
  -> tool.checkPermissions
  -> useCanUseTool
  -> PermissionRequest UI
  -> toolPermissionContext update
```

## 下一章衔接

第 12 章进入 Slash Commands：用户输入 `/help`、`/clear`、`/model`、`/permissions` 时，如何绕过或进入 query 主链路。
