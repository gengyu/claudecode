# 附录 E：高级前端工程师常见源码误判清单

## 1. 把 REPL 当巨型组件

更准确：REPL 是 runtime coordinator。它连接输入、消息、query、tool、permission、remote、background tasks。

验证：

```bash
rg -n "handlePromptSubmit|query\\(|PermissionRequest|useAppStateStore|useQueueProcessor" claudecode-project/src/screens/REPL.tsx
```

## 2. 把 AppState 当普通全局状态

更准确：AppState 是 runtime control plane，驱动 permission、MCP、plugins、remote、tasks、settings sync。

验证：

```bash
rg -n "toolPermissionContext|mcp:|plugins:|remote|tasks|onChangeAppState" claudecode-project/src/state
```

## 3. 把 message 当 chat item

更准确：message 同时服务 UI、API、tool protocol、compact、session log。

验证：

```bash
rg -n "normalizeMessagesForAPI|ensureToolResultPairing|compact_boundary|tool_result" claudecode-project/src/utils/messages.ts
```

## 4. 把 query 当 API wrapper

更准确：query 是 Agent loop，负责 streaming、tool continuation、compact、stop hooks、恢复。

验证：

```bash
rg -n "export async function\\* query|runTools|handleStopHooks|autocompact|yield" claudecode-project/src/query.ts
```

## 5. 把 Tool 当普通函数

更准确：Tool 是模型可调用能力协议，包含 prompt、schema、permission、call、render、concurrency。

验证：

```bash
rg -n "export type Tool<|inputSchema|checkPermissions|isConcurrencySafe|renderToolResultMessage" claudecode-project/src/Tool.ts
```

## 6. 把权限当设置项

更准确：permission 是工具执行时的动态边界，ask 会暂停 runtime。

验证：

```bash
rg -n "useCanUseTool|setToolUseConfirmQueue|PermissionRequest|behavior: 'ask'" claudecode-project/src
```

## 7. 把 slash command 当 CLI 子命令

更准确：slash command 运行在 REPL 内部，有 local-jsx 和 prompt 两条路径。

验证：

```bash
rg -n "type: 'local-jsx'|type: 'prompt'|filterCommandsForRemoteMode" claudecode-project/src/commands.ts claudecode-project/src/commands -g '*.{ts,tsx}'
```

## 8. 把 MCP/plugin 当外围功能

更准确：它们能进入工具池、命令体系、agents、hooks、LSP，是主链路的扩展面。

验证：

```bash
rg -n "assembleToolPool|loadPluginCommands|loadSkillsDir|mcp.tools|plugins" claudecode-project/src
```

## 9. 把 compact 当删除历史

更准确：compact 是长上下文连续性机制，通过 summary/boundary 让 query 继续。

验证：

```bash
rg -n "compact_boundary|buildPostCompactMessages|microcompact|autocompact" claudecode-project/src/query.ts claudecode-project/src/services/compact claudecode-project/src/utils/messages.ts
```

## 10. 看到旧路径不校验

课程蓝图可能含 `.js` import 路径或生成入口，写讲义必须用 `rg --files` 和源码调用点校验。

验证：

```bash
rg --files claudecode-project/src | rg "handlePromptSubmit|useQueueProcessor|startupProfiler|permissions|command"
```
