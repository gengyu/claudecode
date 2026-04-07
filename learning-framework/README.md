# Learning Framework

基于 Claude Code 项目架构的学习框架，用于理解和掌握现代 CLI 应用的构建方法。

## 📚 学习目标

通过这个框架，你将学习到：

1. **CLI 应用架构** - 如何构建现代化的命令行工具
2. **React + Ink** - 如何在终端中渲染 React 组件
3. **命令系统** - 如何实现可扩展的命令体系
4. **插件系统** - 如何设计可插拔的架构
5. **会话管理** - 如何管理用户交互状态
6. **工具调用** - 如何实现 AI 可调用的工具系统

## 🏗️ 项目结构

```
learning-framework/
├── src/
│   ├── commands/      # 命令模块（对应 Claude Code 的 commands）
│   ├── components/    # UI 组件（对应 Claude Code 的 components）
│   ├── hooks/         # React Hooks（对应 Claude Code 的 hooks）
│   ├── utils/         # 工具函数（对应 Claude Code 的 utils）
│   ├── services/      # 服务层（对应 Claude Code 的 services）
│   ├── tools/         # 工具实现（对应 Claude Code 的 tools）
│   ├── types/         # TypeScript 类型定义
│   ├── constants/     # 常量定义
│   └── main.tsx       # 入口文件
├── docs/              # 学习文档
├── package.json
└── tsconfig.json
```

## 🚀 快速开始

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
bun run dev
```

### 构建

```bash
bun run build
```

### 类型检查

```bash
bun run typecheck
```

## 📖 学习路径

### 第一阶段：基础架构

1. 理解项目入口 (`main.tsx`)
2. 学习 Commander.js 命令解析
3. 掌握 Ink 终端渲染

### 第二阶段：核心功能

1. 实现命令系统
2. 构建 UI 组件
3. 管理应用状态

### 第三阶段：高级特性

1. 插件系统设计
2. 会话持久化
3. MCP 协议集成

## 🔍 参考 Claude Code

在学习过程中，可以参考原始项目的实现：

- **Commands**: `../claudecode-project/src/commands/`
- **Components**: `../claudecode-project/src/components/`
- **Tools**: `../claudecode-project/src/tools/`
- **Services**: `../claudecode-project/src/services/`

## 📝 技术栈

- **运行时**: Bun
- **语言**: TypeScript
- **UI 框架**: React 18 + Ink
- **CLI 解析**: Commander.js
- **工具库**: Lodash, Chalk

## 💡 学习建议

1. **循序渐进** - 从简单的命令开始，逐步增加复杂度
2. **对比学习** - 对照 Claude Code 的实现，理解设计思路
3. **实践为主** - 每个模块都要动手实现
4. **记录笔记** - 在 `docs/` 目录下记录学习心得

## 🤝 贡献

欢迎提交问题和改进建议！
