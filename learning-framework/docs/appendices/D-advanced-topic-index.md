# 附录 D：高级专题索引

本附录整理自 `CLAUDE_CODE_ARCHITECTURE_OVERVIEW.md`，把宽泛架构说明拆成可继续深挖的专题索引。

## 专题索引

| 专题 | 源码入口 | 所属章节 | 深挖问题 |
| --- | --- | --- | --- |
| non-interactive print mode | `src/cli/print.ts`、`src/main.tsx` | 第 2、8 章 | print mode 如何复用 query 但跳过 REPL |
| session resume | `src/screens/ResumeConversation.tsx`、`src/utils/sessionRestore.ts` | 第 7、14 章 | log 如何恢复为 messages/AppState |
| remote session | `src/remote/RemoteSessionManager.ts` | 第 14 章 | 本地 REPL 如何转发输入和中断 |
| bridge | `src/bridge/*` | 第 14 章 | bridge 如何处理 inbound/outbound/control |
| AgentTool | `src/tools/AgentTool/*` | 第 10、14 章 | 子 Agent 如何创建独立上下文 |
| compact | `src/services/compact/*` | 第 7、8、14 章 | compact 如何改变 messages 但维持连续性 |
| hooks | `src/utils/hooks/*`、`src/services/tools/toolHooks.ts` | 第 8-14 章 | hooks 如何介入 tool/query 生命周期 |
| LSP | `src/services/lsp/*` | 第 14 章 | 异步 diagnostics 如何进入上下文 |
| telemetry | `logEvent(...)` 调用点 | 第 14 章 | 关键行为如何被观测 |
| startup profiling | `src/utils/startupProfiler.ts` | 第 14 章 | 冷启动耗时如何打点 |

## 推荐深挖顺序

```text
print mode
  -> session resume
  -> compact
  -> AgentTool/background tasks
  -> remote/bridge
  -> hooks/LSP/telemetry/profiler
```

这个顺序从主链路变体开始，再进入真正的分布式/异步系统。
