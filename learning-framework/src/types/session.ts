/**
 * session.ts - 会话相关类型
 *
 * Claude Code 中有大量 `types/` 文件，用来统一描述数据结构。
 * 这个学习版类型文件，对应去追这些源码会更有感觉：
 * - `claudecode-project/src/tasks/types.ts`
 * - `claudecode-project/src/services/teamMemorySync/types.ts`
 * - `claudecode-project/src/services/settingsSync/types.ts`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 会先在类型文件定义共享结构，再让 hooks、services、components 共用。
 * - 某些类型还会被网络层、存储层、任务系统同时依赖，所以类型文件会成为模块边界。
 *
 * 为什么这样设计：
 * - 类型先行能减少模块间的猜测和耦合，让重构更稳。
 *
 * 这样做的核心收益是：
 * 1. 让组件、命令、服务共享同一份类型定义
 * 2. 防止每个文件都自己"猜"数据长什么样
 * 3. 方便未来把简单实现替换成真实存储或远程会话
 */

/**
 * SessionSnapshot: 会话快照
 *
 * 为什么叫 snapshot？
 * 因为它表示某个时刻的一份只读数据视图，
 * 很适合从 service 返回给 UI 使用。
 *
 * 在 Claude Code 里，没有这个同名类型，
 * 但你可以把它类比为"从 session/task 状态里裁出一小块给 UI 显示的数据"。
 *
 * 设计意图：
 * - 不把完整内部状态直接暴露给 UI，而是给一份"为显示而准备的结构"。
 * - 这能让 service 以后自由演进，而 UI 接口保持稳定。
 */
export type SessionSnapshot = {
  sessionId: string;
  title: string;
  workingDirectory: string;
  startedAtIso: string;
  commandCount: number;
  currentTopic: string;
};

/**
 * PersistedSessionSnapshot: 持久化到磁盘的会话快照
 *
 * 对应追源码位置：
 * - `claudecode-project/src/utils/sessionStorage.ts`
 * - `claudecode-project/src/commands/resume/resume.tsx`
 * - `claudecode-project/src/components/StatusLine.tsx`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 会把会话元数据和 transcript 持久化下来，
 *   后续的 resume、状态栏、日志选择器都会读取这些数据。
 * - 也就是说，"一次命令执行结束后还能被后续命令看到"，
 *   依赖的不是内存，而是持久化层。
 *
 * 为什么这样设计：
 * - CLI 进程结束后，内存就没了；如果想跨命令保留状态，必须落盘。
 */
export type PersistedSessionSnapshot = SessionSnapshot & {
  savedAtIso: string;
  lastCommand: 'start' | 'inspect';
};
