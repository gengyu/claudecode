/**
 * sessionService.ts - 轻量服务层示例
 *
 * 对照 Claude Code 的 `src/services/`：
 * 服务层负责"组织数据"、"封装逻辑"、"隔离副作用"，
 * 让 UI 组件不用直接依赖 `process`、文件系统、网络等环境细节。
 *
 * 对应追源码位置：
 * - `claudecode-project/src/services/settingsSync/index.ts`
 * - `claudecode-project/src/services/AgentSummary/agentSummary.ts`
 * - `claudecode-project/src/services/toolUseSummary/toolUseSummaryGenerator.ts`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 的 service 往往会读取多份原始数据，再整理成 UI 或命令层可直接消费的结果。
 * - 组件通常不会自己去拼接这些细节，而是调用 service 或消费 service 的产物。
 *
 * 为什么这样设计：
 * - service 能隔离环境依赖和复杂逻辑，让组件保持薄、测试更容易写。
 *
 * 这里我们先实现一个非常小的 service：
 * - 输入：当前工作目录、学习主题
 * - 输出：一份可以给 UI 直接展示的 SessionSnapshot
 *
 * 贴近 Claude Code 的分层后：
 * - service 只负责组装会话快照
 * - 真正的磁盘读写交给 `src/utils/sessionStorage.ts`
 */

import { DEFAULT_SESSION_TITLE } from '../constants/appInfo.js';
import type { SessionSnapshot } from '../types/session.js';

function createSessionId(): string {
  return `session_${Date.now()}`;
}

/**
 * createSessionSnapshot: 创建会话快照
 *
 * 这是"服务函数"最常见的形态之一：
 * 接收普通参数，返回结构化数据。
 *
 * 学习时可以关注：
 * 1. 为什么不在组件里直接拼这些字符串？
 * 2. 如果以后要从本地文件恢复会话，这个函数该怎么演进？
 *
 * 继续追源码时，可以重点看：
 * - service 如何把多份原始数据整理成 UI 可消费的数据
 * - service 如何隐藏 `process`、配置、文件系统这些环境细节
 *
 * 这个学习版是如何贴近源码思路的：
 * - 由 service 统一决定默认标题、工作目录、初始主题。
 * - 命令层和 UI 层只消费结果，不关心这些字段是怎么拼出来的。
 *
 * 进一步贴近源码后的变化：
 * - 这个函数只负责生成会话元数据。
 * - 真正的保存 / 读取逻辑放在 `utils/sessionStorage.ts`，这更像 Claude Code 的分工。
 */
export function createSessionSnapshot(options?: {
  sessionId?: string;
  cwd?: string;
  topic?: string;
  commandCount?: number;
  startedAtIso?: string;
}): SessionSnapshot {
  return {
    sessionId: options?.sessionId ?? createSessionId(),
    title: DEFAULT_SESSION_TITLE,
    workingDirectory: options?.cwd ?? process.cwd(),
    startedAtIso: options?.startedAtIso ?? new Date().toISOString(),
    commandCount: options?.commandCount ?? 1,
    currentTopic: options?.topic ?? '理解命令系统与 UI 数据流',
  };
}
