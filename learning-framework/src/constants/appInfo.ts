/**
 * appInfo.ts - 应用级常量
 *
 * 在 Claude Code 里，`src/constants/` 目录非常大，
 * 作用是把"不会频繁变化的配置数据"从业务逻辑中抽离出来。
 *
 * 对应追源码位置：
 * - `claudecode-project/src/constants/product.ts`
 * - `claudecode-project/src/constants/common.ts`
 * - `claudecode-project/src/constants/outputStyles.ts`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 会把产品链接、默认行为、展示文案、输出风格等拆到不同常量文件。
 * - `main.tsx`、UI 组件、工具模块都会直接 import 这些常量，而不是在各处重复写字面量。
 *
 * 为什么这样设计：
 * - 常量集中后，更容易统一修改和审查影响面。
 * - 这也让 `main.tsx` 更专注于装配流程，而不是夹杂大量配置细节。
 *
 * 学习目标：
 * 1. 认识"常量模块"的职责
 * 2. 避免在多个文件里重复写应用名、版本、描述
 * 3. 让 main.tsx 更像"装配层"而不是"数据堆放层"
 */

/**
 * APP_INFO: 应用基础元数据
 *
 * 这类信息通常会被多个地方使用：
 * - Commander 的 `.name()` / `.description()` / `.version()`
 * - UI 顶部标题
 * - 日志输出
 * - 测试断言
 */
export const APP_INFO = {
  name: 'learning-framework',
  description: '基于 Claude Code 架构的学习框架',
  version: '0.1.0',
} as const;

/**
 * DEFAULT_SESSION_TITLE: 默认会话标题
 *
 * Claude Code 会维护更复杂的 session / task / thread 状态。
 * 学习框架先用一个简单的字符串常量，帮助你理解：
 * "状态数据"和"界面显示"可以来自不同模块。
 *
 * 继续追的话，可以看这些和会话/显示文案相关的源码：
 * - `claudecode-project/src/constants/messages.ts`
 * - `claudecode-project/src/constants/turnCompletionVerbs.ts`
 *
 * 源码如何实现 / 使用：
 * - Claude Code 会把提示语、状态文案、完成语气词拆到常量文件，
 *   再由消息组件、状态栏、工具结果渲染逻辑统一使用。
 *
 * 为什么这样设计：
 * - 文案统一管理后，UI 层就只负责"显示哪条文案"，不用关心文案内容从哪来。
 */
export const DEFAULT_SESSION_TITLE = 'Interactive Learning Session';
