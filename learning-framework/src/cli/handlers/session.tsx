/**
 * session.tsx - 交互式会话 handler
 *
 * 对应追源码位置：
 * - `claudecode-project/src/cli/handlers/util.tsx`
 * - `claudecode-project/src/interactiveHelpers.tsx`
 * - `claudecode-project/src/main.tsx`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 的 `main.tsx` 不会把完整交互逻辑都塞在入口里，
 *   而是把某些命令分支交给 handler。
 * - handler 负责准备运行态数据、render 顶层 UI、等待退出。
 *
 * 为什么这样设计：
 * - 入口文件更像路由和装配层。
 * - 交互启动细节集中在 handler，更方便后续扩展为 resume、setup、doctor 等分支。
 */

import React from 'react';
import { render } from 'ink';
import App from '../../components/App.js';
import { createSessionSnapshot } from '../../services/sessionService.js';
import {
  loadLastSessionMetadata,
  saveSessionMetadata,
} from '../../utils/sessionStorage.js';

export type LaunchInteractiveSessionOptions = {
  topic?: string;
};

/**
 * launchInteractiveSession: 启动交互式学习会话
 *
 * 这个函数是学习版里对"进入主会话循环"的最小模拟。
 * 它做的事情很像源码里的交互入口：
 * 1. 读取已有会话元数据
 * 2. 组装新的运行态
 * 3. 持久化本次会话信息
 * 4. render 顶层 App
 */
export async function launchInteractiveSession(
  options: LaunchInteractiveSessionOptions = {},
): Promise<void> {
  const previousSession = await loadLastSessionMetadata();

  const session = createSessionSnapshot({
    sessionId: previousSession?.sessionId,
    topic: options.topic ?? previousSession?.currentTopic,
    commandCount: (previousSession?.commandCount ?? 0) + 1,
  });

  await saveSessionMetadata(session);

  const instance = render(<App session={session} />);
  await instance.waitUntilExit();
}
