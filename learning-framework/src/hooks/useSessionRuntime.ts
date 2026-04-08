/**
 * useSessionRuntime.ts - 自定义 Hook 示例
 *
 * Claude Code 里有很多 `useXxx` Hook，用来把状态逻辑从组件中拆出去。
 * 这能让组件更专注于"渲染什么"，而 Hook 专注于"数据怎么变化"。
 *
 * 对应追源码位置：
 * - `claudecode-project/src/hooks/useElapsedTime.ts`
 * - `claudecode-project/src/hooks/useMinDisplayTime.ts`
 * - `claudecode-project/src/hooks/useTerminalSize.ts`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 的 Hook 常常接收少量输入参数，内部维护订阅、定时器或派生状态。
 * - 组件只拿 Hook 的返回值做渲染，不直接管理这些副作用细节。
 *
 * 为什么这样设计：
 * - 这样状态逻辑可以被复用，也能避免组件里堆满 effect 和计时逻辑。
 *
 * 这个 Hook 用来演示两个核心概念：
 * 1. `useState` 保存随时间变化的数据
 * 2. `useEffect` 建立和清理副作用（定时器）
 */

import { useEffect, useState } from 'react';

/**
 * formatDuration: 把秒数格式化成更适合终端显示的文本
 *
 * 这是一个纯函数：
 * - 相同输入一定得到相同输出
 * - 不读写外部状态
 *
 * 纯函数非常适合从 Hook 和组件中抽出来。
 */
function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

/**
 * useSessionRuntime: 根据启动时间计算"已运行时长"
 *
 * `startedAtIso` 来自 service 层，而不是 Hook 自己生成，
 * 这样可以清楚看到：
 * service 负责提供初始数据
 * hook 负责让这份数据"动起来"
 *
 * 如果你想继续往 Claude Code 靠近，可以对照看：
 * - Hook 接收输入参数
 * - Hook 维护局部状态
 * - Hook 最终只返回给组件"已经准备好显示的数据"
 *
 * 和源码的差异：
 * - Claude Code 的 `useElapsedTime` 已经进化到 `useSyncExternalStore` 方案，更新更稳定。
 * - 学习版先保留 `useEffect + setInterval`，方便先看懂副作用模型，再升级实现。
 */
export function useSessionRuntime(startedAtIso: string): string {
  const [runtimeLabel, setRuntimeLabel] = useState('0m 0s');

  useEffect(() => {
    const startedAt = new Date(startedAtIso).getTime();

    // 定时器每秒更新一次，让终端 UI 产生"活着"的感觉。
    const timer = setInterval(() => {
      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000),
      );

      setRuntimeLabel(formatDuration(elapsedSeconds));
    }, 1000);

    // 组件卸载时必须清理定时器。
    // 这是 React 副作用管理中非常重要的习惯。
    return () => {
      clearInterval(timer);
    };
  }, [startedAtIso]);

  return runtimeLabel;
}
