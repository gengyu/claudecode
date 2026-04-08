/**
 * Learning Framework - 主入口文件
 *
 * 这是整个应用的入口点，负责：
 * 1. 初始化 CLI 命令解析器（Commander.js）
 * 2. 配置应用元数据（名称、描述、版本）
 * 3. 注册子命令
 * 4. 启动命令解析流程
 *
 * 对应 Claude Code: claudecode-project/src/main.tsx (4684行)
 * 这次我们继续往 Claude Code 的结构靠近：
 * - main.tsx 只做装配
 * - commands/ 目录负责命令实现
 * - constants/ 目录负责集中管理元数据
 */

// Commander.js - CLI 命令解析器
// Claude Code 使用：import { Command as CommanderCommand } from '@commander-js/extra-typings'
// extra-typings 提供完整的 TypeScript 类型支持
import { Command } from 'commander';
import { registerCommands } from './commands/index.js';
import { APP_INFO } from './constants/appInfo.js';

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
  .name(APP_INFO.name)
  .description(APP_INFO.description)
  .version(APP_INFO.version);

/**
 * 注册所有子命令
 *
 * 这是本次重构最重要的一步：
 * main.tsx 不再直接定义每个命令细节，而是把职责交给 commands/index.ts。
 */
registerCommands(program);

/**
 * 解析命令行参数并开始执行
 *
 * 这会：
 * 1. 解析 process.argv（命令行参数数组）
 * 2. 匹配对应的命令
 * 3. 执行相应的 action 回调
 *
 * 示例：
 * - `learning-framework` → 默认进入交互式会话
 * - `learning-framework status` → 打印最近一次会话元数据
 * - `learning-framework start` → 学习别名：进入交互式会话
 * - `learning-framework inspect` → 学习别名：打印最近一次会话元数据
 * - `learning-framework --help` → 显示帮助信息
 * - `learning-framework --version` → 显示版本号
 *
 * 注意：Claude Code 没有显式调用 parse()
 * Commander 在某些配置下会自动解析
 */
program.parse(process.argv);
