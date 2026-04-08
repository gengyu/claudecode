/**
 * start.tsx - 交互式命令别名
 *
 * 这个文件继续保留 `start`，但现在它更像一个学习别名。
 * 真正的交互实现已经迁到 `src/cli/handlers/session.tsx`，
 * 这样结构会更接近 Claude Code。
 *
 * 对应追源码位置：
 * - `claudecode-project/src/main.tsx`
 * - `claudecode-project/src/cli/handlers/util.tsx`
 * - `claudecode-project/src/interactiveHelpers.tsx`
 *
 * 源码如何实现 / 使用：
 * - 真实项目里交互启动更多是入口默认行为，不一定是 `start` 这样的显式子命令。
 * - 学习版保留 `start` 只是为了让你更容易手动触发。
 *
 * 为什么这样设计：
 * - 一边保留学习友好的命令名，一边把内部结构往源码靠。
 */

import { Command } from 'commander';
import { launchInteractiveSession } from '../cli/handlers/session.js';

/**
 * createStartCommand: 生成 start 命令
 *
 * 用工厂函数而不是直接 `export const command = ...` 的好处是：
 * 1. 未来可以注入依赖（logger、config、storage）
 * 2. 更方便测试
 * 3. 更接近"注册阶段"和"执行阶段"分离的思路
 *
 * 追 Claude Code 时，可以关注：
 * - main.tsx 里如何决定进入哪条执行路径
 * - handler 文件如何懒加载、组装 UI、最后执行退出逻辑
 *
 * 这个学习版是如何贴近源码思路的：
 * - `start` 自己不再直接 render UI，而是转交给 handler。
 * - 这更像源码里的入口 -> handler 分工。
 */
export function createStartCommand(): Command {
  return new Command('start')
    .description('学习版别名：启动交互式 CLI')
    .option('--topic <topic>', '设置当前学习主题')
    .action(async (options: { topic?: string }) => {
      await launchInteractiveSession(options);
    });
}
