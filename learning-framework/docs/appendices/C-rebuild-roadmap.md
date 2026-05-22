# 附录 C：learning-framework 复刻路线

本附录合并 `legacy/PROJECT_COMPARISON.md` 和 `legacy/QUICKSTART.md`，把“简化版 vs 生产版”的学习方式落到 4 个阶段项目。

## 复刻原则

```text
先复刻能力边界
再复刻数据流
最后复刻异常/权限/扩展
```

不要追求一比一复制 Claude Code。learning-framework 的价值是把复杂源码压缩成可运行的小系统。

## 阶段项目 1：CLI TUI

覆盖章节：第 1-4 章。

能力：

- Commander 入口。
- Ink/React TUI。
- 输入框、消息列表、状态栏。
- `/clear` 和退出。

验收：

```bash
pnpm start -- --model mock
```

能进入 TUI，输入文字后显示 user message。

## 阶段项目 2：消息循环

覆盖章节：第 5-8 章。

能力：

- `handlePromptSubmit`。
- message model。
- external store。
- mock `async function* query()`。
- 模拟 streaming assistant。
- 模拟 tool_use/tool_result。

验收：输入“read package”后，UI 展示 assistant 请求工具、工具结果、最终回复。

## 阶段项目 3：工具与权限

覆盖章节：第 9-12 章。

能力：

- Tool interface。
- `ReadTool`、`WriteTool`、`BashTool`。
- permission allow/deny/ask。
- PermissionRequest。
- slash command registry。

验收：Bash 默认 ask，用户确认后执行 mock command。

## 阶段项目 4：插件与高级系统

覆盖章节：第 13-14 章。

能力：

- plugin loader。
- 插件工具合并进工具池。
- background task registry。
- compact summary。
- startup profiler checkpoint。

验收：插件目录新增一个 tool，重载后 query 可调用。

## 对比学习记录模板

```markdown
# 模块对比：xxx

## Claude Code 生产版
- 入口：
- 主链路：
- 复杂点：

## learning-framework 简化版
- 保留：
- 省略：
- 为什么省略：

## 下一步增强
- ...
```
