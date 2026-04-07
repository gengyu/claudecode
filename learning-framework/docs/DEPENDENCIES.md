# 项目依赖说明

本文档详细说明 learning-framework 项目使用的所有依赖库。

---

## 📦 运行时依赖 (Dependencies)

这些库在应用运行时必需，会被打包到生产版本中。

### React (^18.2.0)

**用途**: UI 框架  
**文档**: https://react.dev  
**Claude Code**: ✅ 也使用 React 18

```typescript
import React from 'react';

const App = () => {
  return <div>Hello</div>;
};
```

**为什么选择 React:**
- 组件化开发，代码复用性高
- 生态系统丰富，社区活跃
- Claude Code 也使用，便于对比学习
- 与 Ink 完美集成

---

### Ink (^4.4.0)

**用途**: 终端 UI 渲染引擎  
**文档**: https://github.com/vadimdemedes/ink  
**Claude Code**: ✅ 使用相同的 Ink 库（有自定义封装）

```typescript
import { Text, Box } from 'ink';

const App = () => (
  <Box>
    <Text color="green">Hello Terminal!</Text>
  </Box>
);
```

**核心组件:**
- `Box`: flexbox 布局容器（类似 div）
- `Text`: 文本显示组件（类似 span）
- `useInput`: 键盘输入 hook
- `useApp`: 应用实例 hook

**Claude Code 的封装:**
```typescript
// Claude Code: src/ink.ts
export async function render(node: ReactNode) {
  return inkRender(withTheme(node), options);
}
```

---

### Commander (^11.0.0)

**用途**: CLI 命令解析器  
**文档**: https://github.com/tj/commander.js  
**Claude Code**: ⚠️ 使用 `@commander-js/extra-typings`（带完整类型）

```typescript
import { Command } from 'commander';

const program = new Command();
program
  .name('my-app')
  .version('1.0.0')
  .option('-d, --debug', 'Enable debug mode')
  .action((options) => {
    console.log('Running...');
  });

program.parse(process.argv);
```

**常用 API:**
- `.name()`: 设置应用名称
- `.description()`: 设置描述
- `.version()`: 设置版本号
- `.option()`: 定义选项
- `.command()`: 定义子命令
- `.action()`: 执行回调
- `.parse()`: 解析参数

**与 Claude Code 的差异:**
```typescript
// 我们使用
import { Command } from 'commander';

// Claude Code 使用（更严格的类型）
import { Command as CommanderCommand } from '@commander-js/extra-typings';
```

---

### Chalk (^5.3.0)

**用途**: 终端字符串样式库  
**文档**: https://github.com/chalk/chalk  
**Claude Code**: ✅ 也使用 Chalk

```typescript
import chalk from 'chalk';

console.log(chalk.red('错误信息'));
console.log(chalk.green('成功信息'));
console.log(chalk.blue('提示信息'));
console.log(chalk.bold('粗体文本'));
```

**常用方法:**
- `chalk.red()`, `chalk.green()`, `chalk.blue()` - 颜色
- `chalk.bold()`, `chalk.dim()` - 样式
- `chalk.bgRed()` - 背景色
- 可以链式调用：`chalk.red.bold('重要')`

---

### Lodash-es (^4.17.21)

**用途**: JavaScript 工具库（ES modules 版本）  
**文档**: https://lodash.com  
**Claude Code**: ✅ 大量使用 lodash-es

```typescript
import mapValues from 'lodash-es/mapValues.js';
import pickBy from 'lodash-es/pickBy.js';
import uniqBy from 'lodash-es/uniqBy.js';

// 示例
const obj = { a: 1, b: 2, c: 3 };
const doubled = mapValues(obj, n => n * 2);
// { a: 2, b: 4, c: 6 }
```

**为什么用 lodash-es 而不是 lodash:**
- ES modules 版本，支持 tree-shaking
- 可以单独导入函数，减小打包体积
- Bun 和现代打包工具友好

**Claude Code 中的使用:**
```typescript
// claudecode-project/src/main.tsx
import mapValues from 'lodash-es/mapValues.js';
import pickBy from 'lodash-es/pickBy.js';
import uniqBy from 'lodash-es/uniqBy.js';
```

---

## 🛠️ 开发时依赖 (DevDependencies)

这些库只在开发时使用，不会打包到生产版本。

### @types/react (^18.2.0)

**用途**: React 的 TypeScript 类型定义  
**必要性**: 为 React 提供完整的类型支持

```typescript
import React from 'react';

// 有了 @types/react，TypeScript 知道：
const App: React.FC = () => { ... };  // ✅ 类型正确
```

---

### TypeScript (^5.3.0)

**用途**: TypeScript 编译器  
**文档**: https://www.typescriptlang.org  
**Claude Code**: ✅ 使用 TypeScript 5.3+

**主要功能:**
- 静态类型检查
- 代码智能提示
- 重构支持
- 早期发现错误

**运行类型检查:**
```bash
bun run typecheck
# 或
tsc --noEmit
```

---

### ESLint (^8.50.0)

**用途**: JavaScript/TypeScript 代码检查工具  
**文档**: https://eslint.org  
**Claude Code**: ✅ 也使用 ESLint

**主要功能:**
- 代码风格检查
- 发现潜在错误
- 强制最佳实践
- 自动修复部分问题

**运行代码检查:**
```bash
bun run lint
# 或
eslint src/
```

---

### @types/bun (latest)

**用途**: Bun 运行时的 TypeScript 类型定义  
**Bun 简介**: 快速的 JavaScript 运行时（替代 Node.js）  
**文档**: https://bun.sh

**Bun 的优势:**
- 比 Node.js 快 4 倍
- 原生支持 TypeScript
- 内置打包工具
- 兼容 npm 生态

**提供的类型:**
```typescript
// Bun 特有的 API
Bun.file('path.txt');
Bun.write('output.txt', data);
```

---

## 📊 依赖对比表

| 依赖 | 版本 | Claude Code | 用途 | 是否必需 |
|------|------|-------------|------|---------|
| react | ^18.2.0 | ✅ 相同 | UI 框架 | ✅ 是 |
| ink | ^4.4.0 | ✅ 相同 | 终端渲染 | ✅ 是 |
| commander | ^11.0.0 | ⚠️ extra-typings | CLI 解析 | ✅ 是 |
| chalk | ^5.3.0 | ✅ 相同 | 终端样式 | ⚠️ 可选 |
| lodash-es | ^4.17.21 | ✅ 相同 | 工具函数 | ⚠️ 可选 |
| @types/react | ^18.2.0 | ✅ 相同 | TS 类型 | ✅ 是 |
| typescript | ^5.3.0 | ✅ 相同 | 编译器 | ✅ 是 |
| eslint | ^8.50.0 | ✅ 相同 | 代码检查 | ⚠️ 可选 |
| @types/bun | latest | ✅ 相同 | Bun 类型 | ✅ 是 |

---

## 🔧 如何管理依赖

### 安装新依赖

```bash
# 运行时依赖
bun add <package-name>

# 开发时依赖
bun add -d <package-name>

# 指定版本
bun add package@^1.0.0
```

### 更新依赖

```bash
# 更新所有依赖
bun update

# 更新特定依赖
bun update package-name
```

### 移除依赖

```bash
bun remove package-name
```

### 查看依赖树

```bash
bun pm ls
```

---

## 💡 学习建议

### 第一阶段：核心依赖
先掌握这三个核心库：
1. **React** - UI 组件化
2. **Ink** - 终端渲染
3. **Commander** - CLI 解析

### 第二阶段：辅助工具
然后学习辅助库：
4. **Chalk** - 美化输出
5. **Lodash-es** - 工具函数

### 第三阶段：开发工具
最后熟悉开发工具：
6. **TypeScript** - 类型系统
7. **ESLint** - 代码质量
8. **@types/bun** - Bun API

---

## 🔍 深入理解

### 查看依赖源码

```bash
# 查看 Ink 源码
ls node_modules/ink/build/components

# 查看 Commander 示例
cat node_modules/commander/examples/*.js
```

### 阅读官方文档

- [React 官方教程](https://react.dev/learn)
- [Ink 组件文档](https://github.com/vadimdemedes/ink#components)
- [Commander 完整指南](https://github.com/tj/commander.js#documentation)

### 实践练习

```typescript
// 练习 1: 创建一个简单的 Ink 组件
import { Text } from 'ink';
const Hello = () => <Text>Hello</Text>;

// 练习 2: 添加一个 Commander 子命令
program.command('test').action(() => console.log('Test'));

// 练习 3: 使用 Chalk 美化输出
console.log(chalk.green('✓ Success'));
```

---

## ❓ 常见问题

### Q: 为什么不用 npm 或 yarn？
A: Bun 更快，且原生支持 TypeScript，与 Claude Code 保持一致。

### Q: 可以用其他 CLI 库吗？
A: 可以，如 yargs、minimist。但 Commander 最流行，文档最全。

### Q: Ink 和其他终端库有什么区别？
A: Ink 使用 React，可以复用 React 知识，组件化更好。

### Q: 必须使用 TypeScript 吗？
A: 不是必须，但强烈推荐。Claude Code 也用 TS，便于对比学习。

---

## 📚 相关资源

- [Bun 官方文档](https://bun.sh/docs)
- [npm vs Bun 对比](https://bun.sh/docs/cli/install)
- [React + Ink 教程](https://github.com/vadimdemedes/ink#create-your-first-app)
- [TypeScript 入门](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)

---

**最后更新**: 2026-04-07  
**维护者**: Learning Framework Team
