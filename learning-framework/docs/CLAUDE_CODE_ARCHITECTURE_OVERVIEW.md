# Claude Code 项目架构预览

## 📋 目录

- [项目概述](#项目概述)
- [核心技术栈](#核心技术栈)
- [架构分层](#架构分层)
- [CLI 命令系统 (Commander.js)](#cli-命令系统-commanderjs)
- [终端 UI 系统 (React + Ink)](#终端-ui-系统-react--ink)
- [工具调用系统](#工具调用系统)
- [会话管理系统](#会话管理系统)
- [插件与 MCP 系统](#插件与-mcp-系统)
- [完整示例：从启动到交互](#完整示例从启动到交互)

---

## 项目概述

**Claude Code** 是一个基于终端

 
### 核心特性

- 🖥️ **终端交互界面** - 基于 React + Ink 的响应式 TUI
- 🤖 **AI 驱动** - 集成 Anthropic Claude API
- 🛠️ **工具调用** - AI 可以调用文件读写、Shell 执行等工具
- 💬 **会话管理** - 支持会话持久化和恢复
- 🔌 **插件系统** - 支持 MCP 协议和自定义插件
- 🌐 **远程支持** - 支持 SSH 远程会话和 IDE 集成

### 项目规模

- **代码量**: ~50,000+ 行 TypeScript
- **文件数**: 1000+ 文件
- **模块**: 50+ 个功能模块
- **命令**: 100+ 个斜杠命令
- **工具**: 43+ 个 AI 可调用的工具

---

## 核心技术栈

### 1. 运行时与语言

```typescript
// Bun 运行时 - 比 Node.js 快 4 倍
// 原生支持 TypeScript，无需预编译
import { feature } from 'bun:bundle';

// TypeScript 5.3+ - 完整的类型安全
type SessionId = string & { readonly __brand: 'SessionId' };
```

**为什么选择 Bun:**
- 极速启动（~135ms vs Node.js ~500ms）
- 原生 TypeScript 支持
- 内置打包工具
- 兼容 npm 生态

---

### 2. CLI 命令解析 - Commander.js

```typescript
// claudecode-project/src/main.tsx (第22行)
import { Command as CommanderCommand, Option } from '@commander-js/extra-typings';

const program = new CommanderCommand()
  .configureHelp(createSortedHelpConfig())
  .enablePositionalOptions();
```

**核心功能:**
- 参数解析（位置参数、选项参数）
- 子命令支持
- 自动帮助生成
- 类型安全的选项定义

---

### 3. 终端 UI - React + Ink

```typescript
// claudecode-project/src/ink.ts
import inkRender from './ink/root.js';

export async function render(node: ReactNode) {
  return inkRender(withTheme(node), options);
}
```

**Ink 提供的组件:**
- `Box` - Flexbox 布局容器
- `Text` - 文本显示
- `useInput` - 键盘输入处理
- `useApp` - 应用生命周期

---

### 4. 状态管理 - React Hooks + Zustand

```typescript
// claudecode-project/src/state/store.ts
import { createStore } from './state/store.js';

const store = createStore<AppState>({
  messages: [],
  currentTool: null,
  session: null,
});
```

---

## 架构分层

```
┌─────────────────────────────────────────┐
│         CLI Interface Layer             │  ← Commander.js 解析命令行
│         (src/main.tsx)                  │
├─────────────────────────────────────────┤
│         Command System                  │  ← 斜杠命令 (/help, /resume)
│         (src/commands/)                 │
├─────────────────────────────────────────┤
│         UI Rendering Layer              │  ← React + Ink 渲染
│         (src/components/, src/ink/)     │
├─────────────────────────────────────────┤
│         Business Logic Layer            │  ← 核心业务逻辑
│         (src/Task.ts, src/QueryEngine)  │
├─────────────────────────────────────────┤
│         Tool System                     │  ← AI 工具调用
│         (src/tools/)                    │
├─────────────────────────────────────────┤
│         Service Layer                   │  ← 外部服务集成
│         (src/services/)                 │
├─────────────────────────────────────────┤
│         Bridge Layer                    │  ← 远程通信
│         (src/bridge/)                   │
└─────────────────────────────────────────┘
```

---

## CLI 命令系统 (Commander.js)

### 1. 主命令配置

**文件**: `src/main.tsx` (第902-1006行)

```typescript
import { Command as CommanderCommand, Option } from '@commander-js/extra-typings';

// 创建命令实例
const program = new CommanderCommand()
  .configureHelp(createSortedHelpConfig())
  .enablePositionalOptions();

// 配置基本信息
program
  .name('claude')
  .description('Claude Code - starts an interactive session by default')
  .argument('[prompt]', 'Your prompt', String);

// 定义全局选项（50+ 个选项）
program
  .option('-d, --debug [filter]', 'Enable debug mode')
  .option('-p, --print', 'Print response and exit')
  .option('--model <model>', 'Model for the current session')
  .option('--permission-mode <mode>', 'Permission mode', 
    ['auto', 'default', 'acceptEdits'])
  .addOption(new Option('--effort <level>', 'Effort level')
    .choices(['low', 'medium', 'high', 'max']))
  .option('--mcp-config <configs...>', 'Load MCP servers')
  .option('--session-id <uuid>', 'Use specific session ID')
  // ... 更多选项
```

### 2. PreAction Hook - 初始化逻辑

**文件**: `src/main.tsx` (第907-967行)

```typescript
// 在执行任何命令前运行的初始化逻辑
program.hook('preAction', async (thisCommand) => {
  // 1. 等待异步 subprocess 完成
  await Promise.all([
    ensureMdmSettingsLoaded(),
    ensureKeychainPrefetchCompleted()
  ]);
  
  // 2. 初始化应用
  await init();
  
  // 3. 设置进程标题
  if (!isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE)) {
    process.title = 'claude';
  }
  
  // 4. 附加日志 sinks
  const { initSinks } = await import('./utils/sinks.js');
  initSinks();
  
  // 5. 加载远程设置（非阻塞）
  void loadRemoteManagedSettings();
  void loadPolicyLimits();
});
```

### 3. 主 Action 处理器

**文件**: `src/main.tsx` (第1006-4684行)

```typescript
program.action(async (prompt, options) => {
  // 解构选项
  const {
    debug = false,
    print = false,
    model,
    sessionId,
    permissionMode,
    // ... 更多选项
  } = options;
  
  // 1. 处理特殊模式
  if (options.bare) {
    process.env.CLAUDE_CODE_SIMPLE = '1';
  }
  
  // 2. 下载文件资源（如果有）
  if (options.file) {
    const fileSpecs = parseFileSpecs(options.file);
    fileDownloadPromise = downloadSessionFiles(fileSpecs, config);
  }
  
  // 3. 初始化权限上下文
  await initializeToolPermissionContext({
    permissionMode,
    allowedTools,
    disallowedTools,
  });
  
  // 4. 启动交互式 REPL 或打印模式
  if (print) {
    // 非交互模式：打印结果并退出
    await runPrintMode(prompt, options);
  } else {
    // 交互模式：启动 REPL
    await launchRepl(prompt, options);
  }
});

// 解析命令行参数
program.parse(process.argv);
```

### 4. 子命令示例

#### 示例 1: MCP 命令

**文件**: `src/cli/handlers/mcp.tsx`

```typescript
import { Command } from '@commander-js/extra-typings';

export const mcpCommand = new Command('mcp')
  .description('Manage MCP servers')
  .addCommand(
    new Command('add')
      .description('Add an MCP server')
      .argument('<name>', 'Server name')
      .option('--transport <type>', 'Transport type', 'stdio')
      .option('--command <cmd>', 'Command to run')
      .action(async (name, options) => {
        await addMcpServer(name, options);
      })
  )
  .addCommand(
    new Command('list')
      .description('List MCP servers')
      .action(async () => {
        await listMcpServers();
      })
  )
  .addCommand(
    new Command('remove')
      .description('Remove an MCP server')
      .argument('<name>', 'Server name')
      .action(async (name) => {
        await removeMcpServer(name);
      })
  );

// 在主程序中注册
program.addCommand(mcpCommand);
```

#### 示例 2: Plugin 命令

**文件**: `src/commands/plugin/install.tsx`

```typescript
export const pluginInstallCommand = new Command('install')
  .description('Install a plugin')
  .argument('<package>', 'Plugin package name')
  .option('--scope <scope>', 'Installation scope', 'user')
  .option('--version <ver>', 'Specific version')
  .action(async (pkg, options) => {
    console.log(`Installing ${pkg}...`);
    
    // 验证包名
    if (!isValidPluginName(pkg)) {
      throw new Error('Invalid plugin name');
    }
    
    // 下载并安装
    await installPlugin(pkg, {
      scope: options.scope,
      version: options.version,
    });
    
    console.log(chalk.green('✓ Plugin installed successfully'));
  });
```

---

## 终端 UI 系统 (React + Ink)

### 1. Ink 封装层

**文件**: `src/ink.ts`

```typescript
import { createElement, type ReactNode } from 'react';
import inkRender from './ink/root.js';
import { ThemeProvider } from './components/design-system/ThemeProvider.js';

// 包装所有渲染调用，添加主题支持
function withTheme(node: ReactNode): ReactNode {
  return createElement(ThemeProvider, null, node);
}

export async function render(
  node: ReactNode,
  options?: RenderOptions
): Promise<Instance> {
  return inkRender(withTheme(node), options);
}

// 导出 Ink 组件
export { Box } from './components/design-system/ThemedBox.js';
export { Text } from './components/design-system/ThemedText.js';
export { useInput } from './ink/hooks/use-input.js';
export { useApp } from './ink/hooks/use-app.js';
```

### 2. 主应用组件

**文件**: `src/state/AppStateStore.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from '../ink.js';
import { MessageList } from '../components/Messages/MessageList.js';
import { InputBox } from '../components/Input/InputBox.js';
import { ToolOutput } from '../components/Tools/ToolOutput.js';
import { useAppState } from './AppStateStore.js';

export const App: React.FC = () => {
  const {
    messages,
    input,
    setInput,
    isProcessing,
    currentTool,
  } = useAppState();
  
  // 处理键盘输入
  useInput((input, key) => {
    if (key.return) {
      // 提交消息
      handleSubmit(input);
      setInput('');
    } else if (key.upArrow) {
      // 历史消息导航
      navigateHistory('up');
    } else if (key.ctrlC) {
      // 中断当前操作
      handleInterrupt();
    }
  });
  
  return (
    <Box flexDirection="column" height="100%">
      {/* 消息列表 */}
      <Box flexGrow={1} overflow="hidden">
        <MessageList messages={messages} />
      </Box>
      
      {/* 工具输出 */}
      {currentTool && (
        <Box borderTop={1} borderColor="gray">
          <ToolOutput tool={currentTool} />
        </Box>
      )}
      
      {/* 输入框 */}
      <Box borderTop={1} borderColor="gray" padding={1}>
        <InputBox 
          value={input}
          onChange={setInput}
          disabled={isProcessing}
          placeholder="Ask Claude to do something..."
        />
      </Box>
    </Box>
  );
};
```

### 3. 消息列表组件

**文件**: `src/components/Messages/MessageList.tsx`

```typescript
import React from 'react';
import { Box, Text } from '../../ink.js';
import { UserMessage } from './UserMessage.js';
import { AssistantMessage } from './AssistantMessage.js';
import { SystemMessage } from './SystemMessage.js';
import type { Message } from '../../types/message.js';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <Box flexDirection="column">
      {messages.map((message, index) => {
        switch (message.role) {
          case 'user':
            return (
              <UserMessage 
                key={message.id}
                content={message.content}
                timestamp={message.timestamp}
              />
            );
          
          case 'assistant':
            return (
              <AssistantMessage
                key={message.id}
                content={message.content}
                tools={message.toolCalls}
              />
            );
          
          case 'system':
            return (
              <SystemMessage
                key={message.id}
                content={message.content}
              />
            );
        }
      })}
    </Box>
  );
};
```

### 4. 用户消息组件

**文件**: `src/components/Messages/UserMessage.tsx`

```typescript
import React from 'react';
import { Box, Text } from '../../ink.js';
import chalk from 'chalk';

interface UserMessageProps {
  content: string;
  timestamp: Date;
}

export const UserMessage: React.FC<UserMessageProps> = ({ 
  content, 
  timestamp 
}) => {
  const timeStr = timestamp.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <Box flexDirection="column" marginY={1}>
      <Text dimColor>
        ┌─ You ({timeStr})
      </Text>
      <Box paddingLeft={2}>
        <Text color="cyan">{content}</Text>
      </Box>
      <Text dimColor>└─</Text>
    </Box>
  );
};
```

### 5. 助手消息组件（支持工具调用）

**文件**: `src/components/Messages/AssistantMessage.tsx`

```typescript
import React, { useState } from 'react';
import { Box, Text } from '../../ink.js';
import { ToolCallDisplay } from '../Tools/ToolCallDisplay.js';
import type { ToolCall } from '../../types/tool.js';

interface AssistantMessageProps {
  content: string;
  tools?: ToolCall[];
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  content,
  tools = []
}) => {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  
  return (
    <Box flexDirection="column" marginY={1}>
      <Text dimColor>┌─ Claude</Text>
      
      {/* AI 回复内容 */}
      {content && (
        <Box paddingLeft={2}>
          <Text>{content}</Text>
        </Box>
      )}
      
      {/* 工具调用 */}
      {tools.length > 0 && (
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          {tools.map((tool) => (
            <ToolCallDisplay
              key={tool.id}
              tool={tool}
              expanded={expandedTools.has(tool.id)}
              onToggle={() => {
                const newSet = new Set(expandedTools);
                if (newSet.has(tool.id)) {
                  newSet.delete(tool.id);
                } else {
                  newSet.add(tool.id);
                }
                setExpandedTools(newSet);
              }}
            />
          ))}
        </Box>
      )}
      
      <Text dimColor>└─</Text>
    </Box>
  );
};
```

### 6. 输入框组件

**文件**: `src/components/Input/InputBox.tsx`

```typescript
import React from 'react';
import { Box, Text, useStdin } from '../../ink.js';
import { cursor } from '../../ink/termio/cursor.js';

interface InputBoxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const InputBox: React.FC<InputBoxProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Type a message...'
}) => {
  const { internal_writeToStdout } = useStdin();
  
  // 渲染提示符
  const prompt = disabled 
    ? Text.color('gray')('⏸ ') 
    : Text.color('green')('❯ ');
  
  // 渲染输入内容
  const displayValue = value || Text.dim()(placeholder);
  
  return (
    <Box>
      {prompt}
      <Text>{displayValue}</Text>
      {!disabled && value.length > 0 && cursor.show()}
    </Box>
  );
};
```

### 7. 工具调用显示组件

**文件**: `src/components/Tools/ToolCallDisplay.tsx`

```typescript
import React from 'react';
import { Box, Text } from '../../ink.js';
import type { ToolCall } from '../../types/tool.js';

interface ToolCallDisplayProps {
  tool: ToolCall;
  expanded: boolean;
  onToggle: () => void;
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({
  tool,
  expanded,
  onToggle
}) => {
  const statusIcon = {
    pending: '⏳',
    running: '🔄',
    completed: '✅',
    failed: '❌'
  }[tool.status];
  
  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text>{statusIcon} </Text>
        <Text bold>{tool.name}</Text>
        <Text dimColor> (press Enter to {expanded ? 'collapse' : 'expand'})</Text>
      </Box>
      
      {expanded && (
        <Box paddingLeft={2} flexDirection="column">
          <Text dimColor>Arguments:</Text>
          <Text>
            {JSON.stringify(tool.arguments, null, 2)}
          </Text>
          
          {tool.result && (
            <>
              <Text dimColor>Result:</Text>
              <Text color="green">
                {typeof tool.result === 'string' 
                  ? tool.result 
                  : JSON.stringify(tool.result, null, 2)}
              </Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};
```

---

## 工具调用系统

### 1. 工具基类

**文件**: `src/Tool.ts`

```typescript
export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolInputJSONSchema;
  
  /**
   * 执行工具
   */
  abstract execute(
    input: unknown,
    context: ToolExecutionContext
  ): Promise<ToolResult>;
  
  /**
   * 检查权限
   */
  checkPermission(
    input: unknown,
    context: PermissionContext
  ): PermissionDecision {
    return 'ask'; // 默认询问用户
  }
}
```

### 2. Bash 工具示例

**文件**: `src/tools/bash/BashTool.ts`

```typescript
import { Tool } from '../../Tool.js';
import { spawn } from 'child_process';

export class BashTool extends Tool {
  name = 'Bash';
  description = 'Execute a bash command';
  
  parameters = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in seconds',
        default: 30
      }
    },
    required: ['command']
  };
  
  async execute(input: { command: string; timeout?: number }) {
    const { command, timeout = 30 } = input;
    
    return new Promise((resolve, reject) => {
      const proc = spawn('bash', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error(`Command timed out after ${timeout}s`));
      }, timeout * 1000);
      
      proc.on('close', (code) => {
        clearTimeout(timer);
        
        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code
        });
      });
    });
  }
}
```

### 3. 文件读取工具

**文件**: `src/tools/read/ReadTool.ts`

```typescript
import { Tool } from '../../Tool.js';
import { readFile } from 'fs/promises';

export class ReadTool extends Tool {
  name = 'Read';
  description = 'Read a file from the filesystem';
  
  parameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read'
      },
      encoding: {
        type: 'string',
        enum: ['utf-8', 'base64'],
        default: 'utf-8'
      }
    },
    required: ['path']
  };
  
  async execute(input: { path: string; encoding?: string }) {
    try {
      const content = await readFile(input.path, {
        encoding: (input.encoding as BufferEncoding) || 'utf-8'
      });
      
      return {
        success: true,
        content,
        size: content.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

## 会话管理系统

### 1. 会话存储

**文件**: `src/utils/sessionStorage.ts`

```typescript
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const SESSION_DIR = join(process.env.HOME!, '.claude', 'sessions');

export interface Session {
  id: string;
  name: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 保存会话
 */
export async function saveSession(session: Session): Promise<void> {
  const filePath = join(SESSION_DIR, `${session.id}.json`);
  
  writeFileSync(filePath, JSON.stringify({
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  }, null, 2));
}

/**
 * 加载会话
 */
export async function loadSession(sessionId: string): Promise<Session | null> {
  const filePath = join(SESSION_DIR, `${sessionId}.json`);
  
  try {
    const data = readFileSync(filePath, 'utf-8');
    const session = JSON.parse(data);
    
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt)
    };
  } catch (error) {
    return null;
  }
}

/**
 * 列出所有会话
 */
export async function listSessions(): Promise<Session[]> {
  const files = readdirSync(SESSION_DIR);
  
  return Promise.all(
    files
      .filter(f => f.endsWith('.json'))
      .map(f => loadSession(f.replace('.json', '')))
  ).then(sessions => sessions.filter(Boolean) as Session[]);
}
```

---

## 插件与 MCP 系统

### 1. MCP 服务器配置

**文件**: `src/services/mcp/config.ts`

```typescript
import { readFileSync } from 'fs';

export interface McpServerConfig {
  name: string;
  transport: 'stdio' | 'sse' | 'websocket';
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

/**
 * 解析 MCP 配置
 */
export function parseMcpConfig(configPath: string): McpServerConfig[] {
  const content = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content);
  
  return Object.entries(config.mcpServers || {}).map(([name, server]) => ({
    name,
    ...(server as Omit<McpServerConfig, 'name'>)
  }));
}
```

### 2. MCP 客户端

**文件**: `src/services/mcp/client.ts`

```typescript
import { spawn } from 'child_process';

export class McpClient {
  private process: ChildProcess | null = null;
  
  async connect(server: McpServerConfig): Promise<void> {
    if (server.transport === 'stdio') {
      this.process = spawn(server.command!, server.args || []);
      
      this.process.stdout.on('data', (data) => {
        this.handleMessage(JSON.parse(data));
      });
    }
  }
  
  async callTool(name: string, args: unknown): Promise<unknown> {
    const requestId = generateId();
    
    this.process!.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    }) + '\n');
    
    return new Promise((resolve) => {
      this.once(`response:${requestId}`, resolve);
    });
  }
}
```

---

## 完整示例：从启动到交互

### 启动流程

```bash
# 用户运行
$ claude "帮我创建一个 React 组件"
```

### 执行流程

```typescript
// 1. Commander 解析参数 (src/main.tsx)
program.parse(['node', 'claude', '帮我创建一个 React 组件']);

// 2. PreAction Hook 执行初始化
await init();
await initializeToolPermissionContext({...});

// 3. 进入主 action
program.action(async (prompt, options) => {
  // prompt = "帮我创建一个 React 组件"
  
  // 4. 启动 REPL
  await launchRepl(prompt, options);
});

// 5. 渲染 UI (src/interactiveHelpers.tsx)
const instance = await render(<App initialPrompt={prompt} />);

// 6. App 组件显示初始消息
// ┌─ You (14:30)
//   帮我创建一个 React 组件
// └─

// 7. AI 处理并返回
// ┌─ Claude
//   我来帮你创建一个 React 组件。首先让我查看一下项目结构。
//   
//   ⏳ Bash (ls -la)
// └─

// 8. 执行 Bash 工具
const result = await bashTool.execute({ command: 'ls -la' });

// 9. 显示工具结果
// ✅ Bash
// Arguments: { "command": "ls -la" }
// Result:
// total 48
// drwxr-xr-x  12 user  staff   384 Apr  7 14:30 .
// -rw-r--r--   1 user  staff  1234 Apr  7 14:29 package.json

// 10. AI 继续对话
// ┌─ Claude
//   我看到这是一个 Node.js 项目。我来创建一个简单的 Button 组件。
//   
//   📝 Write (src/components/Button.tsx)
// └─

// 11. 执行 Write 工具
await writeTool.execute({
  path: 'src/components/Button.tsx',
  content: `
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};
  `
});

// 12. 完成
// ✅ Write
// Arguments: { "path": "src/components/Button.tsx" }
// Result: File written successfully (234 bytes)

// ┌─ Claude
//   完成！我已经创建了 Button 组件。你可以这样使用：
//   
//   import { Button } from './components/Button';
//   
//   <Button label="Click me" onClick={() => alert('Clicked!')} />
// └─
```

---

## 关键技术点总结

### 1. Commander.js 的优势

✅ **类型安全** - `@commander-js/extra-typings` 提供完整类型  
✅ **链式 API** - 流畅的配置体验  
✅ **自动帮助** - 自动生成 `--help` 输出  
✅ **子命令** - 支持嵌套命令结构  
✅ **Hooks** - `preAction` 用于初始化  

### 2. React + Ink 的优势

✅ **组件化** - 复用 React 组件开发经验  
✅ **声明式 UI** - 清晰的 UI 结构  
✅ **状态管理** - 使用 React hooks  
✅ **热更新** - 开发时即时预览  
✅ **生态系统** - 丰富的 React 库可用  

### 3. 架构设计亮点

🎯 **分层清晰** - CLI → Commands → UI → Business → Tools → Services  
🎯 **可扩展** - 插件系统和 MCP 协议  
🎯 **类型安全** - 全程 TypeScript  
🎯 **性能优化** - Bun 运行时 + 懒加载  
🎯 **用户体验** - 响应式 TUI + 实时反馈  

---

## 学习路径建议

### Week 1: 基础理解
1. 阅读 `src/main.tsx` - 理解入口和 Commander 配置
2. 研究 `src/ink.ts` - 理解 Ink 封装
3. 分析一个简单的组件（如 `UserMessage.tsx`）

### Week 2: 核心功能
1. 实现一个自定义工具（参考 `BashTool.ts`）
2. 添加一个新的斜杠命令
3. 修改 UI 组件的样式

### Week 3: 高级特性
1. 研究 MCP 协议实现
2. 理解会话管理机制
3. 探索插件系统架构

---

**文档版本**: 1.0.0  
**最后更新**: 2026-04-07  
**参考项目**: claudecode-project (50,000+ 行代码)
