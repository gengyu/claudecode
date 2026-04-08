/**
 * App - 主应用组件
 *
 * 这是应用的根组件，负责渲染整个终端界面。
 *
 * 对应 Claude Code: claudecode-project/src/components/App.tsx
 * 在真实项目里，App 更像一个"顶层容器"：
 * - 接收外部注入的数据
 * - 组合多个 provider / hook / 子组件
 * - 决定主界面布局
 *
 * 这次我们把 App 稍微升级，让它开始接收 service 层产出的 session 数据。
 */

import React from 'react';
import { Box, Text } from 'ink';
import { APP_INFO } from '../constants/appInfo.js';
import { useSessionRuntime } from '../hooks/useSessionRuntime.js';
import type { SessionSnapshot } from '../types/session.js';

/**
 * AppProps: 根组件输入
 *
 * 当组件开始变复杂时，先把 props 类型抽清楚，是非常好的习惯。
 */
type AppProps = {
  session: SessionSnapshot;
};

/**
 * 主应用组件
 *
 * 这次的学习重点：
 * 1. 从 props 读取数据，而不是把所有内容写死
 * 2. 调用自定义 Hook 获取动态状态
 * 3. 把界面拆成几个"信息块"，更接近真实终端应用
 */
const App: React.FC<AppProps> = ({ session }) => {
  /**
   * runtimeLabel 来自自定义 Hook。
   *
   * 组件不关心"定时器怎么实现"，只关心"现在要显示什么"，
   * 这就是 Hook 解耦逻辑和视图的价值。
   */
  const runtimeLabel = useSessionRuntime(session.startedAtIso);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="green">
        Learning Framework
      </Text>

      <Text>{APP_INFO.description}</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={1}>
        <Text bold color="cyan">
          Session Overview
        </Text>
        <Text>title: {session.title}</Text>
        <Text>topic: {session.currentTopic}</Text>
        <Text>cwd: {session.workingDirectory}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={1}>
        <Text bold color="yellow">
          Runtime State
        </Text>
        <Text>startedAt: {session.startedAtIso}</Text>
        <Text>runningFor: {runtimeLabel}</Text>
        <Text>commandCount: {session.commandCount}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>学习提示：先读 main.tsx，再读 commands/ 和 services/。</Text>
        <Text dimColor>按 Ctrl+C 退出交互式界面。</Text>
      </Box>
    </Box>
  );
};

export default App;
