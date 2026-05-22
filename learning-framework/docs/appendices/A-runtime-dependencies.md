# 附录 A：运行时依赖地图

本附录整理自 `legacy/DEPENDENCIES.md`，但不按“依赖说明文档”的方式讲。面向高级前端工程师时，重点是每个依赖在 Claude Code 主链路里的工程位置。

## 核心依赖分层

| 依赖/运行时 | 主链路位置 | 相关章节 | 源码验证 |
| --- | --- | --- | --- |
| React | TUI 组件模型、状态订阅 | 第 4-6 章 | `rg -n "from 'react'|useSyncExternalStore" claudecode-project/src` |
| Ink | 终端渲染、输入、布局 | 第 4 章 | `rg -n "ink|render\\(" claudecode-project/src/ink.ts claudecode-project/src/components` |
| Commander | CLI 入口、参数分流 | 第 2 章 | `rg -n "CommanderCommand|program\\.action|preAction" claudecode-project/src/main.tsx` |
| Zod | Tool input schema、plugin schema | 第 9、13 章 | `rg -n "z\\.strictObject|inputSchema|Schema" claudecode-project/src/Tool.ts claudecode-project/src/tools claudecode-project/src/utils/plugins` |
| Bun/Node runtime | 进程、文件系统、feature gate、bundle | 第 2-3、14 章 | `rg -n "bun:bundle|process\\.env|fs|node:" claudecode-project/src` |
| Anthropic SDK message types | Message/API boundary | 第 7-8 章 | `rg -n "@anthropic-ai/sdk|MessageParam|ContentBlock" claudecode-project/src` |

## 学习方式

不要先学依赖 API，再回源码找用法。更有效的顺序是：

```text
先定位主链路
  -> 找到依赖承担的边界
  -> 看 Claude Code 如何约束它
  -> 再补依赖文档
```

## 依赖与阶段项目

- 第一阶段项目：Commander + Ink + React。
- 第二阶段项目：React external store + AsyncGenerator。
- 第三阶段项目：Zod + Tool protocol + permission UI。
- 第四阶段项目：插件/MCP schema + background task + profiler。

## 常见误区

1. 把 Ink 当 React DOM 的替代品。终端输入、布局和刷新约束不同。
2. 把 Commander 当课程重点。Commander 只是入口分流，主复杂度在 REPL/query/tool。
3. 把 Zod 当表单校验。这里是模型输入的协议边界。
4. 忽略 Bun feature gate。部分源码分支依赖构建裁剪和运行环境。
