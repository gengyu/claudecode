/**
 * sessionStorage.ts - 学习版会话持久化工具
 *
 * 对应追源码位置：
 * - `claudecode-project/src/utils/sessionStorage.ts`
 * - `claudecode-project/src/utils/conversationRecovery.ts`
 * - `claudecode-project/src/commands/resume/resume.tsx`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 会把 transcript、session metadata、标题、模式等信息写入持久化层。
 * - 后续的 resume、状态栏、日志选择器、任务视图都会读取这些持久化数据。
 * - 也就是说，源码里"跨命令保留状态"主要不是靠 service，而是靠 utils/sessionStorage.ts 这样的存储层。
 *
 * 为什么这样设计：
 * - service 适合组织业务数据，storage 适合处理磁盘路径、读写格式、缓存与恢复。
 * - 拆开后，命令层就能像源码一样同时依赖"数据组装层"和"持久化层"。
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PersistedSessionSnapshot, SessionSnapshot } from '../types/session.js';

const SESSION_STORAGE_DIR = '.learning-framework';
const SESSION_METADATA_FILE = 'last-session-metadata.json';

/**
 * getCurrentSessionSnapshotPath: 返回当前项目的会话快照文件路径
 *
 * 对应 Claude Code 的设计：
 * - 源码里不会让调用方自己手写存储路径，
 *   而是通过 sessionStorage 工具统一管理路径规则。
 */
export function getLastSessionMetadataPath(
  cwd: string = process.cwd(),
): string {
  return join(cwd, SESSION_STORAGE_DIR, SESSION_METADATA_FILE);
}

/**
 * saveSessionMetadata: 保存最近一次会话元数据
 *
 * 对应 Claude Code 的设计：
 * - 会话状态需要跨命令存在，所以必须有一个明确的落盘步骤。
 * - 写磁盘的职责放在 storage 层，而不是散落在命令和组件里。
 */
export async function saveSessionMetadata(
  snapshot: SessionSnapshot,
  cwd: string = snapshot.workingDirectory,
): Promise<PersistedSessionSnapshot> {
  const persistedSnapshot: PersistedSessionSnapshot = {
    ...snapshot,
    savedAtIso: new Date().toISOString(),
    lastCommand: 'start',
  };

  await mkdir(join(cwd, SESSION_STORAGE_DIR), { recursive: true });
  await writeFile(
    getLastSessionMetadataPath(cwd),
    JSON.stringify(persistedSnapshot, null, 2),
    'utf8',
  );

  return persistedSnapshot;
}

/**
 * loadLastSessionMetadata: 读取最近一次保存的会话元数据
 *
 * 对应 Claude Code 的设计：
 * - resume / recovery / status 相关逻辑都会先读存储层，再决定后续行为。
 * - 源码不会叫这个名字，但语义上更接近"读取最近一次可恢复的会话元数据"。
 */
export async function loadLastSessionMetadata(
  cwd: string = process.cwd(),
): Promise<PersistedSessionSnapshot | null> {
  try {
    const raw = await readFile(getLastSessionMetadataPath(cwd), 'utf8');
    return JSON.parse(raw) as PersistedSessionSnapshot;
  } catch {
    return null;
  }
}
