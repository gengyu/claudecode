/**
 * print.ts - 非交互式打印入口
 *
 * 对应追源码位置：
 * - `claudecode-project/src/cli/print.ts`
 * - `claudecode-project/src/utils/conversationRecovery.ts`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 的 `cli/print.ts` 负责非交互模式下的大量打印、恢复、命令执行逻辑。
 * - 它不是一个简单的工具函数，而是一条完整的 CLI 执行路径。
 *
 * 为什么这样设计：
 * - 交互式 REPL 和非交互式打印/恢复往往是两套不同流程，
 *   拆成独立入口后，主入口更清晰，也更接近真实产品结构。
 */

import { loadLastSessionMetadata } from '../utils/sessionStorage.js';

/**
 * printLastSessionSummary: 打印最近一次会话元数据
 *
 * 这是学习版里对 `cli/print.ts` 思路的极简模拟：
 * - 先从存储层恢复会话信息
 * - 再以非交互方式输出
 */
export async function printLastSessionSummary(): Promise<void> {
  const session = await loadLastSessionMetadata();

  if (!session) {
    console.log('No saved session metadata found.');
    console.log('Run `learning-framework --topic "<your-topic>"` first.');
    return;
  }

  console.log('Learning Framework Session Metadata');
  console.log(`sessionId: ${session.sessionId}`);
  console.log(`title: ${session.title}`);
  console.log(`cwd: ${session.workingDirectory}`);
  console.log(`startedAt: ${session.startedAtIso}`);
  console.log(`savedAt: ${session.savedAtIso}`);
  console.log(`commandCount: ${session.commandCount}`);
  console.log(`topic: ${session.currentTopic}`);
}
