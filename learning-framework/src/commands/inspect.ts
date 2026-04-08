/**
 * inspect.ts - 非交互式命令别名
 *
 * 学习 CLI 时，一个很重要的点是：
 * 不是所有命令都要渲染 Ink 界面。
 *
 * 有些命令只负责：
 * - 输出诊断信息
 * - 显示配置
 * - 检查环境
 *
 * 这类命令更接近 Claude Code 中部分 CLI handler 的角色。
 *
 * 对应追源码位置：
 * - `claudecode-project/src/cli/print.ts`
 * - `claudecode-project/src/cli/handlers/util.tsx`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 的非交互逻辑主要集中在 `cli/print.ts` 等入口，而不是写在一个叫 `inspect` 的命令里。
 * - 学习版保留 `inspect`，但内部已经改成转发到 `cli/print.ts`。
 *
 * 为什么这样设计：
 * - CLI 并不是所有场景都适合交互式 UI，诊断和检查类命令通常直接输出更高效。
 */

import { Command } from 'commander';
import { printLastSessionSummary } from '../cli/print.js';

/**
 * createInspectCommand: 打印一份当前会话快照
 *
 * 这个命令很适合作为学习练习：
 * 1. 看 service 层如何被命令复用
 * 2. 看 "交互式命令" 和 "普通命令" 的区别
 * 3. 以后可以继续扩展为 doctor / config / debug 风格命令
 *
 * 你可以把它看成 `doctor` / `print` / `debug` 这类命令的最小学习版。
 *
 * 这个学习版是如何贴近源码思路的：
 * - `inspect` 不再直接实现打印细节，而是转发到 `cli/print.ts`。
 * - 这更接近源码里的非交互执行路径。
 */
export function createInspectCommand(): Command {
  return new Command('inspect')
    .description('学习版别名：打印最近一次会话元数据')
    .action(async () => {
      await printLastSessionSummary();
    });
}
