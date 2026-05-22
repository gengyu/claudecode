# 第 13 章：MCP、插件与 Skills 扩展系统源码导读

## 本章定位

第 13 章进入开放扩展架构。前面章节讲的是内置主链路，本章看外部能力如何进入主系统：MCP tools/resources、plugin commands、skills prompt commands。

## 面向高级前端工程师的学习价值

可以把 MCP/插件/Skills 看成 AI CLI 的 extension platform。它比普通前端插件复杂：扩展不仅增加 UI，也会增加模型可调用工具、命令、hooks、agents、LSP server。

## 学习目标

1. 找到 MCP client/tools/resources 的状态入口。
2. 追踪 MCP tools 如何通过 AppState 进入 `assembleToolPool`。
3. 找到 plugin command/skill command 加载入口。
4. 解释 command 扩展和 tool 扩展的差异。
5. 在 learning-framework 中复刻一个简化 plugin loader。

## 前置知识

理解第 10 章工具池、第 12 章命令体系。不会讲 MCP 协议规范全文。

## 核心概念讲解

### 1. 扩展系统为什么存在

```bash
rg -n "mcp:|plugins:|pluginReconnectKey|commands: Command\\[\\]|tools: Tool\\[\\]" claudecode-project/src/state/AppStateStore.ts
```

Claude Code 不能只依赖内置工具。MCP 让外部服务提供工具和资源，插件/skills 让用户和组织提供命令、agents、hooks。

### 2. MCP tools 进入工具池

```bash
rg -n "assembleToolPool|mcp.tools|mcpTools|filterToolsByDenyRules" claudecode-project/src/tools.ts claudecode-project/src/screens/REPL.tsx
```

MCP tools 不绕过工具池，而是进入同一套 filtering/dedupe/permission 机制。

### 3. plugin/skills 进入命令体系

```bash
rg -n "plugin commands|loadPluginCommands|loadSkillsDir|dynamic skills|commandsPath|skillsPath" claudecode-project/src/commands.ts claudecode-project/src/utils/plugins claudecode-project/src/skills/loadSkillsDir.ts claudecode-project/src/commands/plugin -g '*.{ts,tsx}'
```

command 扩展影响用户输入和 prompt expansion；tool 扩展影响模型可调用能力。

### 4. LSP/agents/hooks 也是插件扩展面

```bash
rg -n "loadPluginAgents|loadPluginHooks|LSP servers from plugin|plugins" claudecode-project/src/utils/plugins claudecode-project/src/services/lsp -g '*.{ts,tsx}'
```

插件不仅是命令包，也可能提供 agents、hooks、LSP servers。

## 核心源码地图

| 文件 | 看什么 | 不看什么 | 后续 |
| --- | --- | --- | --- |
| `src/services/mcp/*` | MCP client/tools/resources | 协议全部细节 | 本章 |
| `src/tools.ts` | MCP tools 合并进工具池 | 内置工具细节 | 第 10 章 |
| `src/utils/plugins/*` | 插件 manifest/cache/load | marketplace 全量 | 高级专题 |
| `src/plugins/*` | built-in plugins | 每个插件业务 | 本章 |
| `src/skills/*` | skills 加载为 prompt command | skill 内容 | 本章 |
| `src/commands.ts` | 动态命令合并 | 命令业务 | 第 12 章 |

## 主调用链 / 主数据流

```text
plugin/MCP config
  -> load clients / tools / commands / skills
  -> AppState.mcp / AppState.plugins
  -> REPL useAppState(s => s.mcp/plugins)
  -> commands list / assembleToolPool
  -> PromptInput typeahead or query tools
```

## 源码阅读路线

```bash
rg -n "mcp:|plugins:" claudecode-project/src/state/AppStateStore.ts
rg -n "useManageMCPConnections|mcp.clients|mcp.tools|pluginReconnectKey" claudecode-project/src -g '*.{ts,tsx}' | head -80
rg -n "assembleToolPool|mcpTools" claudecode-project/src/tools.ts claudecode-project/src/screens/REPL.tsx
rg -n "loadPluginCommands|loadPluginAgents|loadPluginHooks|loadPluginOutputStyles" claudecode-project/src/utils/plugins -g '*.{ts,tsx}'
rg -n "loadSkillsDir|skill.type === 'prompt'" claudecode-project/src/skills/loadSkillsDir.ts
```

## 5 分钟源码速验

```bash
rg -n "mcp:|plugins:" claudecode-project/src/state/AppStateStore.ts
rg -n "assembleToolPool\\(" claudecode-project/src/tools.ts claudecode-project/src/screens/REPL.tsx
rg -n "loadSkillsDir|dynamic skills" claudecode-project/src/commands.ts claudecode-project/src/skills/loadSkillsDir.ts
rg -n "PluginManifest|loadPluginCommands" claudecode-project/src/utils/plugins -g '*.{ts,tsx}' | head -40
```

## 关键模块逐段导读

AppState 存扩展结果，`commands.ts` 合并命令扩展，`tools.ts` 合并工具扩展，plugin utils 管理 manifest/cache/load，skills loader 把 markdown skill 转成 prompt command 或 SkillTool 可用能力。

## 与前后章节的关系

第 10 章的 `assembleToolPool` 在这里接入 MCP tools。第 12 章 command registry 在这里接入 skills/plugin commands。第 14 章会看 remote、LSP、background tasks 等高级扩展如何复用这些入口。

## 教学可视化表达方式

```text
MCP server -> tools/resources -> AppState.mcp -> assembleToolPool/query
```

```text
Plugin -> commands/skills/agents/hooks/LSP -> AppState/plugins registries
```

```text
Command extension: user triggers
Tool extension: model triggers
Hook extension: runtime triggers
```

## 实践任务

1. 定位 AppState 中 mcp/plugins 字段。
2. 追踪 MCP tools 进入 `assembleToolPool` 的行号。
3. 找出 skills prompt command 的加载点。
4. learning-framework 实现插件目录读取 `plugin.json`，注册一个 command 和一个 tool。
5. 进阶分析：为什么 MCP tools 仍要经过 permission deny filtering？

## 常见误区

1. 把 MCP 当普通 HTTP API。它进入模型工具协议。
2. 把 plugin 只看成 UI 扩展。它可扩展 commands、tools、agents、hooks。
3. 认为扩展工具可以绕过权限。MCP tools 仍进入统一工具池。
4. 混淆 skills command 和 SkillTool。一个偏用户命令，一个偏模型工具能力。

## 本章总结

证据链：

```text
AppState.mcp/plugins
  -> commands.ts dynamic commands
  -> tools.ts assembleToolPool
  -> query/tool runtime
```

## 下一章衔接

第 14 章收束高级系统：remote、bridge、AgentTool、background tasks、compact、LSP、telemetry、startup profiler。
