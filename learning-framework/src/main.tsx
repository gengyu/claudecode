/**
 * Learning Framework - 主入口文件
 * 
 * 这是整个应用的入口点，负责：
 * 1. 初始化 CLI 命令解析器（Commander.js）
 * 2. 配置应用元数据（名称、描述、版本）
 * 3. 定义子命令（如 start）
 * 4. 渲染终端 UI（Ink + React）
 * 
 * 对应 Claude Code: claudecode-project/src/main.tsx (4684行)
 * 简化版本：从 4684 行简化到 22 行，保留核心架构
 */

// React - UI 框架（与 Claude Code 完全相同）
import React from 'react';

// Ink - 终端 UI 渲染引擎
// Claude Code 使用自定义封装：import { render } from './ink.js'
// 我们直接使用原始 ink 库来简化学习
import { render } from 'ink';

// Commander.js - CLI 命令解析器
// Claude Code 使用：import { Command as CommanderCommand } from '@commander-js/extra-typings'
// extra-typings 提供完整的 TypeScript 类型支持
import { Command } from 'commander';

// 主应用组件
import App from './components/App.js';

/**
 * 创建 Commander 命令实例
 * 
 * Commander.js 是一个完整的 node.js 命令行解决方案
 * 文档：https://github.com/tj/commander.js
 * 
 * Claude Code 的用法（第902行）：
 * const program = new CommanderCommand()
 *   .configureHelp(createSortedHelpConfig())
 *   .enablePositionalOptions();
 */
const program = new Command();

/**
 * 配置应用基本信息
 * 
 * 这些信息会在用户运行 --help 或 --version 时显示
 * 
 * Claude Code 的配置（第968行）：
 * program.name('claude')
 *   .description('Claude Code - starts an interactive session by default...')
 */
program
  .name('learning-framework')
  .description('基于 Claude Code 架构的学习框架')
  .version('0.1.0');

/**
 * 定义 'start' 子命令
 * 
 * 当用户运行 `learning-framework start` 时执行
 * 
 * 关键概念：
 * - command(): 定义子命令名称
 * - description(): 命令描述（显示在 help 中）
 * - action(): 命令执行时的回调函数
 * 
 * Claude Code 的做法：
 * - 不使用子命令，而是直接在主命令上定义 action
 * - 通过选项（options）来控制不同行为（如 --print, --debug）
 * - 有 50+ 个选项和复杂的参数处理
 */
program
  .command('start')
  .description('启动交互式 CLI')
  .action(() => {
    /**
     * 渲染 React 应用到终端
     * 
     * render() 返回一个对象：
     * - waitUntilExit(): 等待应用退出（用户按 Ctrl+C）
     * - cleanup(): 清理资源
     * - unmount(): 卸载应用
     * 
     * Claude Code 的用法（src/interactiveHelpers.tsx）：
     * const instance = await render(<App {...props} />);
     * return instance;
     */
    const { waitUntilExit } = render(<App />);
    
    // 阻塞进程直到用户退出
    // 如果不调用这个，程序会立即退出
    waitUntilExit();
  });

/**
 * 解析命令行参数并开始执行
 * 
 * 这会：
 * 1. 解析 process.argv（命令行参数数组）
 * 2. 匹配对应的命令
 * 3. 执行相应的 action 回调
 * 
 * 示例：
 * - `learning-framework start` → 执行 start 命令的 action
 * - `learning-framework --help` → 显示帮助信息
 * - `learning-framework --version` → 显示版本号
 * 
 * 注意：Claude Code 没有显式调用 parse()
 * Commander 在某些配置下会自动解析
 */
program.parse(process.argv);
