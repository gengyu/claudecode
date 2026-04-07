# Claude Code 架构学习指南

## 📋 目录结构解析

### claudecode-project/src/ 核心模块

```
src/
├── main.tsx              # 主入口文件 (785KB - 核心逻辑)
├── commands.ts           # 命令注册与管理
├── tools.ts              # 工具注册与管理
├── Task.ts               # 任务管理
├── Tool.ts               # 工具基类
├── QueryEngine.ts        # 查询引擎
│
├── cli/                  # CLI 相关
│   ├── handlers/         # 命令处理器
│   ├── transports/       # 传输层（stdio, websocket等）
│   └── ...
│
├── commands/             # 斜杠命令实现 (/help, /resume等)
│   ├── help/             # 帮助命令
│   ├── resume/           # 恢复会话
│   ├── config/           # 配置管理
│   └── ... (100+ 命令)
│
├── components/           # React UI 组件 (144个组件)
│   ├── Input/            # 输入组件
│   ├── Messages/         # 消息显示
│   ├── Tools/            # 工具UI
│   └── ...
│
├── hooks/                # React Hooks (85个hooks)
│   ├── useInput.ts       # 输入处理
│   ├── useSession.ts     # 会话管理
│   └── ...
│
├── tools/                # AI可调用的工具 (43个工具)
│   ├── read/             # 文件读取
│   ├── write/            # 文件写入
│   ├── bash/             # Shell执行
│   └── ...
│
├── services/             # 服务层 (36个服务)
│   ├── auth/             # 认证服务
│   ├── session/          # 会话服务
│   ├── mcp/              # MCP协议
│   └── ...
│
├── bridge/               # 桥接层 (远程通信)
│   ├── bridgeApi.ts      # 桥接API
│   ├── replBridge.ts     # REPL桥接
│   └── ...
│
├── utils/                # 工具函数 (329个文件)
│   └── ...
│
├── types/                # TypeScript 类型定义
├── constants/            # 常量定义
└── ...
```

## 🎯 核心概念

### 1. 命令系统 (Commands)

**位置**: `src/commands/`

每个命令是一个独立的模块，例如：
```typescript
// 命令结构示例
export const helpCommand = {
  name: 'help',
  description: '显示帮助信息',
  action: async (args) => {
    // 命令逻辑
  }
};
```

**学习要点**:
- 如何注册命令
- 命令参数解析
- 命令执行流程
- 命令间的组合

### 2. 工具系统 (Tools)

**位置**: `src/tools/`

AI 可以调用的工具，例如：
- `read` - 读取文件
- `write` - 写入文件
- `bash` - 执行 shell 命令
- `glob` - 文件搜索

**学习要点**:
- 工具接口设计
- 权限控制
- 错误处理
- 结果格式化

### 3. UI 渲染 (Ink + React)

**位置**: `src/components/`, `src/ink/`

使用 Ink 在终端渲染 React 组件：
```tsx
import { Text, Box } from 'ink';

const MyComponent = () => (
  <Box>
    <Text color="green">Hello</Text>
  </Box>
);
```

**学习要点**:
- Ink 布局系统
- 响应式更新
- 键盘事件处理
- 样式管理

### 4. 会话管理 (Sessions)

**位置**: `src/services/session/`, `src/assistant/`

管理用户与 AI 的对话历史：
- 会话持久化
- 上下文管理
- 远程会话同步

**学习要点**:
- 状态管理
- 数据持久化
- 会话恢复

### 5. 桥接层 (Bridge)

**位置**: `src/bridge/`

支持远程执行和 IDE 集成：
- WebSocket 通信
- 消息序列化
- 权限控制

**学习要点**:
- 进程间通信
- 消息协议设计
- 安全性考虑

## 📚 学习路径建议

### Week 1: 基础理解

**Day 1-2: 项目概览**
- [ ] 阅读 `main.tsx` 了解入口逻辑
- [ ] 理解项目启动流程
- [ ] 查看 `package.json` 依赖

**Day 3-4: 命令系统**
- [ ] 研究 3-5 个简单命令的实现
- [ ] 理解命令注册机制
- [ ] 尝试添加一个新命令

**Day 5-7: UI 组件**
- [ ] 学习 Ink 基础
- [ ] 分析 5-10 个核心组件
- [ ] 创建一个简单的终端 UI

### Week 2: 核心功能

**Day 8-10: 工具系统**
- [ ] 理解 Tool 基类
- [ ] 分析 read/write/bash 工具
- [ ] 实现一个自定义工具

**Day 11-12: 状态管理**
- [ ] 学习 React Hooks 的使用
- [ ] 理解会话状态管理
- [ ] 分析数据流

**Day 13-14: 服务层**
- [ ] 研究认证服务
- [ ] 理解 MCP 协议
- [ ] 分析 API 调用

### Week 3: 高级特性

**Day 15-17: 桥接与远程**
- [ ] 理解桥接架构
- [ ] 分析 WebSocket 通信
- [ ] 研究远程会话

**Day 18-19: 插件系统**
- [ ] 学习插件加载机制
- [ ] 理解插件 API
- [ ] 创建一个简单插件

**Day 20-21: 性能优化**
- [ ] 分析性能瓶颈
- [ ] 学习优化技巧
- [ ] 实践优化方案

## 🔍 关键文件解读

### main.tsx (785KB)

这是整个应用的核心，包含：
- 应用初始化
- 命令循环
- 事件处理
- UI 渲染

**学习策略**: 分段阅读，先理解整体流程

### commands.ts

命令注册中心：
- 命令定义
- 命令路由
- 参数解析

### tools.ts

工具注册中心：
- 工具定义
- 权限检查
- 执行调度

## 💡 学习方法

### 1. 对比学习法

在 `learning-framework/` 中实现简化版本：
```
Claude Code 实现 → 理解原理 → 简化实现 → 测试验证
```

### 2. 增量开发法

不要一次性实现所有功能：
```
基础 CLI → 添加命令 → 添加 UI → 添加工具 → 添加服务
```

### 3. 文档驱动法

为每个学习的模块创建文档：
```
docs/
├── commands.md       # 命令系统笔记
├── tools.md          # 工具系统笔记
├── ui.md             # UI 渲染笔记
└── architecture.md   # 架构设计笔记
```

### 4. 实践验证法

每学完一个模块，都要：
- 实现一个简化版本
- 编写测试用例
- 记录遇到的问题

## 🛠️ 实用技巧

### 调试技巧

```bash
# 启用详细日志
DEBUG=* bun run dev

# 查看类型错误
bun run typecheck

# 代码检查
bun run lint
```

### 代码导航

```bash
# 查找命令定义
grep -r "name: 'help'" src/commands/

# 查找组件使用
grep -r "useSession" src/hooks/

# 查找工具实现
grep -r "class.*Tool" src/tools/
```

### 学习资源

- **Ink 文档**: https://github.com/vadimdemedes/ink
- **Commander.js**: https://github.com/tj/commander.js
- **React Docs**: https://react.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

## 📝 笔记模板

在学习每个模块时，使用以下模板记录：

```markdown
# [模块名称] 学习笔记

## 功能概述
[这个模块做什么]

## 核心文件
- file1.ts: [说明]
- file2.ts: [说明]

## 关键概念
1. [概念1]
2. [概念2]

## 实现思路
[如何实现]

## 我的实现
[在 learning-framework 中的实现]

## 遇到的问题
[问题及解决方案]

## 总结
[学习心得]
```

## 🎓 进阶主题

完成基础学习后，可以深入研究：

1. **MCP 协议** - Model Context Protocol
2. **插件生态** - 如何扩展功能
3. **安全模型** - 权限与沙箱
4. **性能优化** - 大规模会话处理
5. **测试策略** - 单元测试与集成测试

---

**记住**: 学习的关键是实践！每理解一个概念，就在 learning-framework 中实现它。
