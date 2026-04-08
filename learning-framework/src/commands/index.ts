/**
 * index.ts - 命令注册中心
 *
 * 对照学习计划里的"实现命令注册器"，
 * 这个文件就是第一版的注册中心。
 *
 * 对应追源码位置：
 * - `claudecode-project/src/main.tsx`
 * - `claudecode-project/src/cli/handlers/auth.ts`
 * - `claudecode-project/src/cli/handlers/plugins.ts`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 的命令注册和命令执行分散在 `main.tsx`、`commands/`、`cli/handlers/` 等位置。
 * - 入口文件会把不同命令接到 Commander，再根据命令类型走交互式或非交互式分支。
 *
 * 为什么这样设计：
 * - 命令越来越多时，集中注册可以保留全局视图，具体实现拆文件则便于维护。
 *
 * 它的职责很单一：
 * 1. 创建命令
 * 2. 把命令挂到 program 上
 *
 * 这样 `main.tsx` 就不需要知道每个命令的实现细节。
 */

import { Command } from 'commander';
import { createInspectCommand } from './inspect.js';
import { createStartCommand } from './start.js';
import { printLastSessionSummary } from '../cli/print.js';
import { launchInteractiveSession } from '../cli/handlers/session.js';

/**
 * registerCommands: 统一注册所有子命令
 *
 * 当命令数量变多后，这种"集中注册"模式会比在 main.tsx 里一段段写更清晰。
 */
export function registerCommands(program: Command): void {
  /**
   * 更贴近 Claude Code 的地方：
   * - 默认执行 `learning-framework` 时，直接进入交互式会话。
   * - `start` 保留为学习别名，方便你显式触发。
   */
  program
    .option('--topic <topic>', '设置当前学习主题')
    .action(async options => {
      await launchInteractiveSession({ topic: options.topic });
    });

  /**
   * `status` 比 `inspect` 更贴近"查看当前/最近一次会话状态"的语义。
   * `inspect` 继续保留为学习别名。
   */
  program
    .command('status')
    .description('打印最近一次会话元数据')
    .action(async () => {
      await printLastSessionSummary();
    });

  program.addCommand(createStartCommand());
  program.addCommand(createInspectCommand());
}
