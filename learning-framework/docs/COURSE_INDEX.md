# Claude Code 源码系统课程总目录

## 目录约定

`docs/` 根目录只放课程主控文件：

- `COURSE_INDEX.md`：课程入口和阅读顺序。
- `SYSTEMATIC_COURSE.md`：14 章主线、4 个阶段项目、95 个知识点清单。
- `LEARNING_TRACKER.md`：课程扩写、检查和修订进度。
- `COURSE_COMPLETION_TASK.md`：最终完成任务与三轮检查要求。
- `COURSE_FINAL_REVIEW.md`：最终验收记录。

具体内容按职责分区：

| 目录 | 作用 | 是否作为学习主线 |
| --- | --- | --- |
| `chapters/` | 14 章源码导读型讲义 | 是 |
| `appendices/` | 依赖地图、证据链方法、复刻路线、高级专题和误区补充 | 是，作为章节补充 |
| `legacy/` | 旧版散乱资料归档，已合并进章节和附录 | 否，仅作为历史来源 |

## 主线课

| 阶段 | 章节 | 讲义 |
| --- | --- | --- |
| 第一阶段：建立全局地图 | 第 1 章：源码全景与学习地图 | `chapters/01-source-map.md` |
| 第一阶段：建立全局地图 | 第 2 章：CLI 启动入口与 Commander 命令解析 | `chapters/02-cli-entry-commander.md` |
| 第一阶段：建立全局地图 | 第 3 章：初始化系统与配置加载 | `chapters/03-initialization-config.md` |
| 第一阶段：建立全局地图 | 第 4 章：React + Ink 终端 UI | `chapters/04-react-ink-tui.md` |
| 第二阶段：理解交互主链路 | 第 5 章：REPL 主交互界面源码导读 | `chapters/05-repl-runtime-coordinator.md` |
| 第二阶段：理解交互主链路 | 第 6 章：AppState 状态管理机制 | `chapters/06-appstate-store.md` |
| 第二阶段：理解交互主链路 | 第 7 章：消息系统与对话上下文 | `chapters/07-message-context.md` |
| 第二阶段：理解交互主链路 | 第 8 章：Agent 查询循环 | `chapters/08-agent-query-loop.md` |
| 第三阶段：掌握工具调用核心 | 第 9 章：Tool 抽象层设计 | `chapters/09-tool-abstraction.md` |
| 第三阶段：掌握工具调用核心 | 第 10 章：内置工具系统 | `chapters/10-built-in-tools.md` |
| 第三阶段：掌握工具调用核心 | 第 11 章：权限系统与安全边界 | `chapters/11-permission-boundary.md` |
| 第三阶段：掌握工具调用核心 | 第 12 章：Slash Commands 命令体系 | `chapters/12-slash-commands.md` |
| 第四阶段：进入高级扩展架构 | 第 13 章：MCP、插件与 Skills 扩展系统 | `chapters/13-mcp-plugin-skills.md` |
| 第四阶段：进入高级扩展架构 | 第 14 章：高级系统：远程、子 Agent、压缩、性能与工程化 | `chapters/14-advanced-systems.md` |

## 附录

| 附录 | 文件 | 合并来源 |
| --- | --- | --- |
| 附录 A：运行时依赖地图 | `appendices/A-runtime-dependencies.md` | `legacy/DEPENDENCIES.md` |
| 附录 B：源码检索与证据链方法 | `appendices/B-source-evidence-method.md` | `legacy/ARCHITECTURE_GUIDE.md`、`legacy/COMMENTS_GUIDE.md` |
| 附录 C：learning-framework 复刻路线 | `appendices/C-rebuild-roadmap.md` | `legacy/PROJECT_COMPARISON.md`、`legacy/QUICKSTART.md` |
| 附录 D：高级专题索引 | `appendices/D-advanced-topic-index.md` | `legacy/CLAUDE_CODE_ARCHITECTURE_OVERVIEW.md` |
| 附录 E：常见源码误判清单 | `appendices/E-common-misreadings.md` | 已完成章节与整体验收 |

## 阅读顺序

```text
先读第 1-4 章，建立入口和 UI 地图
  -> 第 5-8 章，追踪一条用户消息到 Agent loop
  -> 第 9-12 章，理解工具、权限、命令
  -> 第 13-14 章，进入扩展与高级系统
  -> 附录 A-E，补齐依赖、方法、复刻路线和专题索引
```

## 整体验收入口

课程完成后按 `COURSE_COMPLETION_TASK.md` 执行三轮检查：

1. 结构完整性检查。
2. 源码证据链检查。
3. 课程一致性检查。
