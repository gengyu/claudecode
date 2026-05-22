# 快速开始指南

## 📦 项目结构说明

```
claudecode/
├── claudecode-project/     # 原始 Claude Code 项目源代码
│   └── src/                # 完整的源代码（53个目录/文件）
│
└── learning-framework/     # 学习框架（你要在这里实践）
    ├── src/                # 你的代码
    │   ├── commands/       # 命令模块
    │   ├── components/     # UI组件
    │   ├── hooks/          # React Hooks
    │   ├── utils/          # 工具函数
    │   ├── services/       # 服务层
    │   ├── tools/          # 工具实现
    │   ├── types/          # 类型定义
    │   ├── constants/      # 常量
    │   └── main.tsx        # 入口文件
    ├── docs/               # 学习文档
    │   ├── ARCHITECTURE_GUIDE.md   # 架构指南
    │   └── LEARNING_TRACKER.md     # 学习进度追踪
    ├── package.json        # 项目配置
    ├── tsconfig.json       # TypeScript配置
    ├── .gitignore          # Git忽略文件
    └── README.md           # 项目说明
```

## 🚀 立即开始

### 1. 安装依赖

```bash
cd learning-framework
bun install
```

### 2. 运行示例

```bash
bun run dev
```

你会看到一个简单的终端界面。

### 3. 开始学习

按照以下顺序学习：

1. **阅读文档**
   ```bash
   # 先读这个
   cat README.md
   
   # 再读架构指南
   cat docs/legacy/ARCHITECTURE_GUIDE.md
   
   # 查看学习进度
   cat docs/LEARNING_TRACKER.md
   ```

2. **对照学习**
   - 在 `learning-framework/src/` 中编写代码
   - 参考 `claudecode-project/src/` 中的实现
   - 在 `docs/` 中记录笔记

3. **渐进式开发**
   ```
   Week 1: 基础 CLI → 命令系统 → UI 渲染
   Week 2: 工具系统 → 状态管理 → 服务层
   Week 3: 桥接通信 → 插件系统 → 优化完善
   ```

## 📖 第一个任务：理解项目入口

### 步骤 1: 查看简化版入口

打开 `learning-framework/src/main.tsx`:

```typescript
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import App from './components/App.js';

const program = new Command();

program
  .name('learning-framework')
  .description('基于 Claude Code 架构的学习框架')
  .version('0.1.0');

program
  .command('start')
  .description('启动交互式 CLI')
  .action(() => {
    const { waitUntilExit } = render(<App />);
    waitUntilExit();
  });

program.parse(process.argv);
```

### 步骤 2: 对比原始入口

查看 `claudecode-project/src/main.tsx` (785KB):

```bash
# 只看前100行
head -100 claudecode-project/src/main.tsx
```

你会发现：
- 都使用 Commander.js 解析命令
- 都使用 Ink 渲染 UI
- 原始版本有更多初始化和配置

### 步骤 3: 修改并测试

尝试修改 `learning-framework/src/components/App.tsx`:

```tsx
import React from 'react';
import { Text, Box } from 'ink';

const App: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        👋 Hello, Learning Framework!
      </Text>
      <Text>
        这是我的第一个修改
      </Text>
    </Box>
  );
};

export default App;
```

运行查看效果：

```bash
bun run dev
```

## 🎯 第二个任务：添加第一个命令

### 步骤 1: 创建命令文件

在 `learning-framework/src/commands/` 创建 `hello.ts`:

```typescript
import { Command } from 'commander';

export const helloCommand = new Command('hello')
  .description('Say hello')
  .option('-n, --name <name>', 'Name to greet', 'World')
  .action((options) => {
    console.log(`Hello, ${options.name}!`);
  });
```

### 步骤 2: 注册命令

修改 `learning-framework/src/main.tsx`:

```typescript
import { helloCommand } from './commands/hello.js';

// 在 program.parse 之前添加
program.addCommand(helloCommand);
```

### 步骤 3: 测试命令

```bash
bun run src/main.tsx hello
bun run src/main.tsx hello --name Alice
```

### 步骤 4: 参考原始实现

查看 `claudecode-project/src/commands/help/` 了解真实项目的命令结构。

## 🔍 学习技巧

### 1. 并行对比

同时打开两个文件进行对比：

```bash
# 终端 1: 查看简化版
cat learning-framework/src/main.tsx

# 终端 2: 查看完整版
head -50 claudecode-project/src/main.tsx
```

### 2. 增量学习

不要一次性看完所有代码，按模块学习：

```bash
# 今天只学 commands
ls claudecode-project/src/commands/ | head -10

# 明天只学 tools
ls claudecode-project/src/tools/ | head -10
```

### 3. 实践验证

每学一个概念，都要动手实现：

```
理解概念 → 查看源码 → 简化实现 → 测试运行 → 记录笔记
```

### 4. 使用 Git

在学习框架中使用 Git 跟踪进度：

```bash
cd learning-framework
git init
git add .
git commit -m "Initial learning framework setup"

# 每完成一个任务就提交
git add .
git commit -m "Day 1: Completed project overview"
```

## 📝 笔记建议

在 `learning-framework/docs/notes/` 创建每日笔记：

```bash
mkdir -p docs/notes
touch docs/notes/day1-overview.md
```

使用这个模板：

```markdown
# Day 1 - 项目概览

## 今日目标
- [x] 理解项目结构
- [x] 运行示例代码

## 关键发现
1. Commander.js 用于命令解析
2. Ink 用于终端渲染
3. React 用于 UI 组件

## 代码片段
[粘贴重要代码]

## 问题与解答
Q: [问题]
A: [答案]

## 明日计划
- 学习命令系统
- 实现第一个命令
```

## 🛠️ 常用命令

```bash
# 开发模式
bun run dev

# 类型检查
bun run typecheck

# 代码检查
bun run lint

# 构建
bun run build

# 安装新依赖
bun add <package-name>

# 安装开发依赖
bun add -d <package-name>
```

## 💡 提示

1. **不要急于求成** - 这是一个大型项目，需要时间理解
2. **多动手实践** - 看十遍不如写一遍
3. **善用文档** - 遇到问题先查文档
4. **记录笔记** - 好记性不如烂笔头
5. **对比学习** - 始终对照原始项目

## 🎓 下一步

现在你已经准备好了！

1. ✅ 阅读 `README.md` 了解项目
2. ✅ 阅读 `docs/legacy/ARCHITECTURE_GUIDE.md` 理解架构
3. ✅ 打开 `docs/LEARNING_TRACKER.md` 开始追踪进度
4. ✅ 运行 `bun run dev` 查看效果
5. ✅ 开始 Day 1 的学习任务

祝你学习愉快！🚀

---

**需要帮助？**
- 查看 `docs/legacy/ARCHITECTURE_GUIDE.md` 获取详细指导
- 参考 `claudecode-project/src/` 中的实现
- 在 `docs/notes/` 中记录问题和解决方案
