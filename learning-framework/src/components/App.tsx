/**
 * App - 主应用组件
 * 
 * 这是应用的根组件，负责渲染整个终端界面。
 * 
 * 对应 Claude Code: claudecode-project/src/components/App.tsx
 * （实际在 src/state/AppStateStore.tsx 中定义）
 * 
 * 关键概念：
 * - React.FC: React Function Component 类型
 * - Box: Ink 的布局组件（类似 HTML 的 div）
 * - Text: Ink 的文本组件（类似 HTML 的 span）
 */

import React from 'react';

// Ink 提供的终端 UI 组件
// Box:  flexbox 布局容器
// Text: 文本显示组件
// Claude Code 使用自定义封装：import { Box, Text } from '../ink.js'
import { Text, Box } from 'ink';

/**
 * 主应用组件
 * 
 * @returns React 元素，将在终端中渲染
 * 
 * Claude Code 的 App 组件更复杂：
 * - 管理全局状态（useState, useReducer）
 * - 处理用户输入（useInput hook）
 * - 显示消息列表（Messages 组件）
 * - 显示工具输出（Tools 组件）
 * - 主题支持（ThemeProvider）
 */
const App: React.FC = () => {
  return (
    // Box: 布局容器
    // flexDirection: 'column' - 垂直排列子元素
    // padding: 1 - 内边距为 1 个字符
    <Box flexDirection="column" padding={1}>
      {/* Text: 文本组件 */}
      {/* bold: 粗体 */}
      {/* color: 文本颜色（支持 ansi 颜色名） */}
      <Text bold color="green">
        🎓 Learning Framework
      </Text>
      
      {/* 普通文本 */}
      <Text>
        基于 Claude Code 项目架构的学习框架
      </Text>
      
      {/* dimColor: 暗淡的文本颜色（用于次要信息） */}
      <Text dimColor>
        按 Ctrl+C 退出
      </Text>
    </Box>
  );
};

export default App;
