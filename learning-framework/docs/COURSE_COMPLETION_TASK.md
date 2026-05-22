# Claude Code 源码系统课程完成任务书

## 任务目标

把 `SYSTEMATIC_COURSE.md` 中的 14 章主线课完整扩写为面向高级前端工程师的源码导读型讲义，并把 `docs/` 目录下已有文档合并成补充专题、附录和阶段项目材料。

这不是重新设计课程体系。14 章主线、4 个阶段项目、95 个知识点清单保持不变。

## 当前原则

1. 面向高级前端工程师，不讲 TypeScript、React、Commander、Ink 的入门语法。
2. 每章围绕真实源码证据链写作：文件、符号、调用链、`rg` 命令、验证任务。
3. 每章都解释模块为什么存在、解决什么工程问题、在 AI CLI 主链路中的位置。
4. 每章都要说明和前后章节如何连接，不能写成孤立模块说明。
5. 每章都要落到 `learning-framework` 可复刻能力。
6. 不修改 `claudecode-project/src/assistant/sessionHistory.ts`。

## 全量写作范围

| 序号 | 章节 | 状态 | 输出文件 |
| --- | --- | --- | --- |
| 1 | 源码全景与学习地图 | 已完成 | `chapters/01-source-map.md` |
| 2 | CLI 启动入口与 Commander 命令解析 | 已完成 | `chapters/02-cli-entry-commander.md` |
| 3 | 初始化系统与配置加载 | 已完成 | `chapters/03-initialization-config.md` |
| 4 | React + Ink 终端 UI | 已完成 | `chapters/04-react-ink-tui.md` |
| 5 | REPL 主交互界面源码导读 | 已完成 | `chapters/05-repl-runtime-coordinator.md` |
| 6 | AppState 状态管理机制 | 已完成 | `chapters/06-appstate-store.md` |
| 7 | 消息系统与对话上下文 | 已完成 | `chapters/07-message-context.md` |
| 8 | Agent 查询循环 | 已完成 | `chapters/08-agent-query-loop.md` |
| 9 | Tool 抽象层设计 | 已完成 | `chapters/09-tool-abstraction.md` |
| 10 | 内置工具系统 | 已完成 | `chapters/10-built-in-tools.md` |
| 11 | 权限系统与安全边界 | 已完成 | `chapters/11-permission-boundary.md` |
| 12 | Slash Commands 命令体系 | 已完成 | `chapters/12-slash-commands.md` |
| 13 | MCP、插件与 Skills 扩展系统 | 已完成 | `chapters/13-mcp-plugin-skills.md` |
| 14 | 高级系统：远程、子 Agent、压缩、性能与工程化 | 已完成 | `chapters/14-advanced-systems.md` |

## 补充专题范围

| 专题 | 来源文档 | 输出建议 |
| --- | --- | --- |
| 运行时依赖地图 | `legacy/DEPENDENCIES.md` | `appendices/A-runtime-dependencies.md` |
| 源码检索与证据链方法 | `legacy/ARCHITECTURE_GUIDE.md`、`legacy/COMMENTS_GUIDE.md` | `appendices/B-source-evidence-method.md` |
| learning-framework 复刻路线 | `legacy/PROJECT_COMPARISON.md`、`legacy/QUICKSTART.md` | `appendices/C-rebuild-roadmap.md` |
| 高级专题索引 | `legacy/CLAUDE_CODE_ARCHITECTURE_OVERVIEW.md` | `appendices/D-advanced-topic-index.md` |
| 常见源码误判清单 | 已完成章节与检查结果 | `appendices/E-common-misreadings.md` |

## 三轮整体循环

### 第 0 步：先写完

先把第 6-14 章和附录草稿全部写完。写作阶段只做必要的源码核验，不进入全局润色。

### 第 1 轮：结构完整性检查与修改

检查重点：

- 14 章文件是否齐全，命名是否一致。
- 每章是否保留蓝图中的主题、学习目标、核心知识点、重点源码、教学表现形式和实践任务。
- 每章结构是否完整：定位、学习价值、目标、前置、概念、源码地图、调用链、阅读路线、速验、导读、关系、图示、任务、误区、总结、衔接。

修改重点：

- 补齐缺失章节结构。
- 修正过浅、过泛、偏入门的段落。
- 补充章节之间的承接关系。

### 第 2 轮：源码证据链检查与修改

检查重点：

- `rg` 命令是否能命中当前源码。
- 重点文件路径是否真实存在，旧路径是否明确标注。
- 调用链是否有真实符号支撑。
- 未确认源码点是否明确标注。

修改重点：

- 修正路径和符号错误。
- 补充可执行速验命令。
- 把推断改成“推断”或补源码证据。

### 第 3 轮：课程一致性检查与最终修改

检查重点：

- 14 章是否能串成 `入口 -> 初始化 -> TUI -> REPL -> AppState -> Message -> query -> tool -> permission -> command -> MCP -> advanced systems` 主线。
- 4 个阶段项目是否覆盖每阶段核心能力。
- 95 个知识点是否都能映射到章节或附录。
- 既有 docs 是否已合并到补充专题，而不是重复散落。

修改重点：

- 统一术语、写作风格、任务产出格式。
- 补阶段项目验收标准。
- 生成最终课程总目录、附录索引和验收报告。

## 每章验收标准

一章只有同时满足下面条件，才算完成：

1. 有真实源码入口和主调用链。
2. 有至少 3 条源码阅读路线。
3. 有 5 分钟源码速验命令。
4. 有至少 5 个实践任务，包含源码定位、调用链追踪、行号记录、learning-framework 复刻和进阶分析题。
5. 有至少 3 个高级前端工程师常见误区。
6. 有 2-3 个服务源码理解的 markdown 图示。
7. 标明未确认源码点。
8. 更新 `LEARNING_TRACKER.md`。
