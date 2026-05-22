# 学习进度追踪

## 当前课程任务

目标：把 `learning-framework/docs/SYSTEMATIC_COURSE.md` 的 14 章主线课全部扩写为面向高级前端工程师的源码导读型讲义，并把 `docs/` 目录下已有架构、依赖、快速开始、项目对比、注释规范等内容合并为补充专题或附录。

本任务不重新规划 14 章课程体系，不修改 4 个阶段项目和 95 个知识点清单，不修改 `claudecode-project/src/assistant/sessionHistory.ts`。

### 整体执行节奏

```text
先写完全部内容
  -> 整体检查第 1 轮
  -> 根据第 1 轮结果整体修改
  -> 整体检查第 2 轮
  -> 根据第 2 轮结果整体修改
  -> 整体检查第 3 轮
  -> 根据第 3 轮结果最终修改
  -> 输出课程总目录、附录索引、验收报告
```

### 全量写作任务

- [x] 写完全部 14 章源码导读型讲义
  - [x] 第 1 章：源码全景与学习地图
  - [x] 第 2 章：CLI 启动入口与 Commander 命令解析
  - [x] 第 3 章：初始化系统与配置加载
  - [x] 第 4 章：React + Ink 终端 UI
  - [x] 第 5 章：REPL 主交互界面源码导读
  - [x] 第 6 章：AppState 状态管理机制
  - [x] 第 7 章：消息系统与对话上下文
  - [x] 第 8 章：Agent 查询循环
  - [x] 第 9 章：Tool 抽象层设计
  - [x] 第 10 章：内置工具系统
  - [x] 第 11 章：权限系统与安全边界
  - [x] 第 12 章：Slash Commands 命令体系
  - [x] 第 13 章：MCP、插件与 Skills 扩展系统
  - [x] 第 14 章：高级系统：远程、子 Agent、压缩、性能与工程化
- [x] 生成补充专题 / 附录
  - [x] 附录 A：运行时依赖地图
  - [x] 附录 B：源码检索与证据链方法
  - [x] 附录 C：learning-framework 复刻路线
  - [x] 附录 D：高级专题索引
  - [x] 附录 E：常见源码误判清单
- [x] 合并既有 docs 内容
  - [x] `ARCHITECTURE_GUIDE.md` 合并到第 1 章附录和阶段复盘
  - [x] `CLAUDE_CODE_ARCHITECTURE_OVERVIEW.md` 拆分到第 1、2、4、9、13 章补充阅读
  - [x] `PROJECT_COMPARISON.md` 合并到 4 个阶段项目复刻方法
  - [x] `QUICKSTART.md` 合并到课前准备和第一阶段项目
  - [x] `DEPENDENCIES.md` 合并到附录 A
  - [x] `COMMENTS_GUIDE.md` 合并到附录 B 和学习笔记规范

### 三轮整体检查与修改

- [x] 第 1 轮整体检查
  - [x] 检查 14 章是否全部存在且命名一致
  - [x] 检查每章是否保留 `SYSTEMATIC_COURSE.md` 的主题、知识点、重点源码、教学形式和实践任务
  - [x] 检查每章是否面向高级前端工程师，不讲基础语法
  - [x] 检查每章是否有真实源码符号、调用链、`rg` 命令和 5 分钟速验
  - [x] 检查每章是否有 learning-framework 复刻任务和进阶分析题
- [x] 第 1 轮整体修改
  - [x] 修正路径错误、符号错误、过浅说明、缺失调用链
  - [x] 补充 docs 合并入口和附录引用
  - [x] 标明未确认源码点
- [x] 第 2 轮整体检查
  - [x] 检查章节之间是否能串成完整主链路
  - [x] 检查 4 个阶段项目是否能覆盖 14 章能力
  - [x] 检查 95 个知识点是否都能映射到章节或附录
  - [x] 检查重复内容是否被合并为补充专题
- [x] 第 2 轮整体修改
  - [x] 调整跨章衔接
  - [x] 补充阶段项目验收标准
  - [x] 清理重复或过泛内容
- [x] 第 3 轮整体检查
  - [x] 检查所有 `rg` 命令是否仍能在当前源码中命中
  - [x] 检查所有文件路径是否真实存在或明确标注为蓝图旧路径
  - [x] 检查是否误改源码文件，尤其是 `claudecode-project/src/assistant/sessionHistory.ts`
  - [x] 检查最终目录、附录索引、验收报告是否完整
- [x] 第 3 轮最终修改
  - [x] 修复最后一轮发现的问题
  - [x] 输出最终课程交付清单
  - [x] 输出未确认源码点清单

### 本轮修改记录

- [x] 将课程任务从“逐章局部完成”调整为“全量写作 + 三轮整体检查修改”
- [x] 明确 14 章主线之外需要补充附录和专题
- [x] 明确 docs 目录已有内容的合并位置
- [x] 保持第 1-5 章已完成状态
- [x] 补齐第 6-14 章主线讲义
- [x] 新增课程总目录 `COURSE_INDEX.md`
- [x] 新增附录 A-E，完成 docs 旧内容整理入口
- [x] 完成三轮整体检查与最终修改
- [x] 新增 `COURSE_FINAL_REVIEW.md` 最终验收报告

---

## 旧版三阶段学习计划（待合并）

下面内容来自早期 21 天学习模板，保留为阶段项目和附录素材。后续整体修改时，应把它拆入 14 章主线、4 个阶段项目和补充专题，不再作为当前课程的主进度口径。

## 📊 整体进度

- [ ] 第一阶段：基础架构 (0%)
- [ ] 第二阶段：核心功能 (0%)
- [ ] 第三阶段：高级特性 (0%)

---

## 第一阶段：基础架构

### Week 1: 项目理解与基础搭建

#### Day 1-2: 项目概览
- [ ] 阅读 main.tsx 入口文件
  - [ ] 理解应用初始化流程
  - [ ] 分析依赖关系
  - [ ] 记录关键函数
- [ ] 查看 package.json
  - [ ] 理解每个依赖的作用
  - [ ] 学习 scripts 命令
- [ ] 运行原始项目
  - [ ] 安装依赖
  - [ ] 启动开发模式
  - [ ] 体验基本功能

**学习笔记**: `docs/notes/day1-2-overview.md`

#### Day 3-4: 命令系统
- [ ] 研究 commands/ 目录结构
  - [ ] 选择一个简单命令（如 help）
  - [ ] 分析命令实现
  - [ ] 理解命令注册机制
- [ ] 在 learning-framework 中实现命令系统
  - [ ] 创建命令接口
  - [ ] 实现命令注册器
  - [ ] 添加第一个命令
- [ ] 测试命令执行

**学习笔记**: `docs/notes/day3-4-commands.md`

#### Day 5-7: UI 渲染
- [ ] 学习 Ink 基础
  - [ ] 阅读 Ink 文档
  - [ ] 运行示例代码
  - [ ] 理解布局系统
- [ ] 分析 Claude Code 的组件
  - [ ] 研究 App 组件
  - [ ] 分析输入组件
  - [ ] 理解消息显示
- [ ] 创建简单的终端 UI
  - [ ] 实现基础布局
  - [ ] 添加样式
  - [ ] 处理用户输入

**学习笔记**: `docs/notes/day5-7-ui.md`

**第一阶段验收**:
- [ ] 能够运行基本的 CLI 应用
- [ ] 实现了至少 3 个命令
- [ ] 创建了响应式终端 UI

---

## 第二阶段：核心功能

### Week 2: 工具与状态管理

#### Day 8-10: 工具系统
- [ ] 理解 Tool 基类
  - [ ] 阅读 Tool.ts
  - [ ] 分析工具接口
  - [ ] 理解权限模型
- [ ] 研究内置工具
  - [ ] read 工具实现
  - [ ] write 工具实现
  - [ ] bash 工具实现
- [ ] 实现自定义工具
  - [ ] 设计工具接口
  - [ ] 实现工具逻辑
  - [ ] 添加工具测试

**学习笔记**: `docs/notes/day8-10-tools.md`

#### Day 11-12: 状态管理
- [ ] 学习 React Hooks
  - [ ] useState 使用
  - [ ] useEffect 使用
  - [ ] 自定义 Hook
- [ ] 分析 Claude Code 的 Hooks
  - [ ] useInput
  - [ ] useSession
  - [ ] useCommand
- [ ] 实现状态管理
  - [ ] 创建全局状态
  - [ ] 实现状态持久化
  - [ ] 测试状态更新

**学习笔记**: `docs/notes/day11-12-state.md`

#### Day 13-14: 服务层
- [ ] 研究 services/ 目录
  - [ ] 认证服务
  - [ ] 会话服务
  - [ ] 配置服务
- [ ] 理解服务架构
  - [ ] 服务接口设计
  - [ ] 依赖注入
  - [ ] 错误处理
- [ ] 实现基础服务
  - [ ] 配置服务
  - [ ] 日志服务
  - [ ] 存储服务

**学习笔记**: `docs/notes/day13-14-services.md`

**第二阶段验收**:
- [ ] 实现了至少 5 个工具
- [ ] 完整的状态管理系统
- [ ] 模块化服务架构

---

## 第三阶段：高级特性

### Week 3: 桥接与扩展

#### Day 15-17: 桥接与远程
- [ ] 理解 bridge/ 模块
  - [ ] 桥接架构设计
  - [ ] 消息协议
  - [ ] 通信机制
- [ ] 研究 WebSocket 实现
  - [ ] 连接管理
  - [ ] 消息序列化
  - [ ] 重连机制
- [ ] 实现简单的桥接
  - [ ] 本地进程通信
  - [ ] 消息路由
  - [ ] 错误处理

**学习笔记**: `docs/notes/day15-17-bridge.md`

#### Day 18-19: 插件系统
- [ ] 学习插件架构
  - [ ] 插件接口定义
  - [ ] 插件加载机制
  - [ ] 插件生命周期
- [ ] 分析 MCP 协议
  - [ ] 协议规范
  - [ ] 实现方式
  - [ ] 应用场景
- [ ] 创建插件系统
  - [ ] 插件管理器
  - [ ] 插件 API
  - [ ] 示例插件

**学习笔记**: `docs/notes/day18-19-plugins.md`

#### Day 20-21: 优化与完善
- [ ] 性能优化
  - [ ] 识别瓶颈
  - [ ] 优化策略
  - [ ] 性能测试
- [ ] 代码质量
  - [ ] 类型检查
  - [ ] 代码规范
  - [ ] 文档完善
- [ ] 测试覆盖
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] E2E 测试

**学习笔记**: `docs/notes/day20-21-optimization.md`

**第三阶段验收**:
- [ ] 完整的插件系统
- [ ] 远程通信能力
- [ ] 良好的性能和测试覆盖

---

## 📚 学习资源

### 已创建的文档
- [x] README.md - 项目说明
- [x] ARCHITECTURE_GUIDE.md - 架构指南
- [x] SYSTEMATIC_COURSE.md - Claude Code 源码系统课程
- [x] COURSE_INDEX.md - 课程总目录与附录索引
- [x] COURSE_COMPLETION_TASK.md - 14 章全量写作与三轮整体检查任务书
- [x] COURSE_FINAL_REVIEW.md - 课程最终验收报告
- [x] chapters/01-source-map.md - 第 1 章源码全景与学习地图讲义
- [x] chapters/02-cli-entry-commander.md - 第 2 章 CLI 启动入口与 Commander 命令解析讲义
- [x] chapters/03-initialization-config.md - 第 3 章初始化系统与配置加载讲义
- [x] chapters/04-react-ink-tui.md - 第 4 章 React + Ink 终端 UI 讲义
- [x] chapters/05-repl-runtime-coordinator.md - 第 5 章 REPL 主交互界面源码导读讲义
- [x] chapters/06-appstate-store.md - 第 6 章 AppState 状态管理机制讲义
- [x] chapters/07-message-context.md - 第 7 章消息系统与对话上下文讲义
- [x] chapters/08-agent-query-loop.md - 第 8 章 Agent 查询循环讲义
- [x] chapters/09-tool-abstraction.md - 第 9 章 Tool 抽象层设计讲义
- [x] chapters/10-built-in-tools.md - 第 10 章内置工具系统讲义
- [x] chapters/11-permission-boundary.md - 第 11 章权限系统与安全边界讲义
- [x] chapters/12-slash-commands.md - 第 12 章 Slash Commands 命令体系讲义
- [x] chapters/13-mcp-plugin-skills.md - 第 13 章 MCP、插件与 Skills 扩展系统讲义
- [x] chapters/14-advanced-systems.md - 第 14 章高级系统讲义
- [x] appendices/A-runtime-dependencies.md - 附录 A 运行时依赖地图
- [x] appendices/B-source-evidence-method.md - 附录 B 源码检索与证据链方法
- [x] appendices/C-rebuild-roadmap.md - 附录 C learning-framework 复刻路线
- [x] appendices/D-advanced-topic-index.md - 附录 D 高级专题索引
- [x] appendices/E-common-misreadings.md - 附录 E 常见源码误判清单
- [ ] 学习笔记（待创建）

### 系统课程讲义进度
- [x] 第 1 章：源码全景与学习地图
- [x] 第 2 章：CLI 启动入口与 Commander 命令解析
- [x] 第 3 章：初始化系统与配置加载
- [x] 第 4 章：React + Ink 终端 UI
- [x] 第 5 章：REPL 主交互界面源码导读
- [x] 第 6 章：AppState 状态管理机制
- [x] 第 7 章：消息系统与对话上下文
- [x] 第 8 章：Agent 查询循环
- [x] 第 9 章：Tool 抽象层设计
- [x] 第 10 章：内置工具系统
- [x] 第 11 章：权限系统与安全边界
- [x] 第 12 章：Slash Commands 命令体系
- [x] 第 13 章：MCP、插件与 Skills 扩展系统
- [x] 第 14 章：高级系统：远程、子 Agent、压缩、性能与工程化

### 外部资源
- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [Commander.js](https://github.com/tj/commander.js)
- [React 官方文档](https://react.dev)
- [TypeScript 手册](https://www.typescriptlang.org/docs/)

---

## 💡 每日学习模板

```markdown
# Day X - [日期]

## 今日目标
- [ ] 目标1
- [ ] 目标2

## 学习内容
### 看了什么代码
[文件路径和关键发现]

### 理解了什么概念
[概念解释]

### 实现了什么功能
[功能描述和代码片段]

## 遇到的问题
[问题描述]
[解决方案]

## 明日计划
[明天的学习目标]

## 心得总结
[今天的收获]
```

---

## 🎯 里程碑

- [ ] **Milestone 1** (Week 1): 基础 CLI 应用
- [ ] **Milestone 2** (Week 2): 完整的功能模块
- [ ] **Milestone 3** (Week 3): 可扩展的框架

---

**最后更新**: 2026-04-07
