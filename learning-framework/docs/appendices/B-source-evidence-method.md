# 附录 B：源码检索与证据链方法

本附录合并 `legacy/ARCHITECTURE_GUIDE.md` 和 `legacy/COMMENTS_GUIDE.md` 中的方法论内容，改成高级源码导读的实操规范。

## 证据链优先级

读 Claude Code 源码时，判断优先级如下：

```text
真实调用链
  > 真实符号引用
  > 文件职责推断
  > 注释说明
  > 文档描述
```

文档可以给方向，但讲义中的判断必须尽量落到源码符号。

## 标准阅读动作

1. 找入口：

```bash
rg -n "export function|export async function|program\\.action|function REPL|export type Tool" claudecode-project/src
```

2. 找调用方：

```bash
rg -n "handlePromptSubmit|normalizeMessagesForAPI|assembleToolPool|useCanUseTool" claudecode-project/src
```

3. 找数据结构：

```bash
rg -n "export type AppState|export type Command|export type PermissionDecision|export type ToolUseContext" claudecode-project/src
```

4. 找边界：

```bash
rg -n "safeParse|PermissionRequest|for await|useSyncExternalStore|AbortController|onChangeAppState" claudecode-project/src
```

## 每章证据模板

```markdown
## 源码证据

入口：
- file:line symbol

主调用链：
file:line -> file:line -> file:line

关键判断：
- 判断 1：由 ... 证明
- 判断 2：由 ... 证明

未确认：
- ...
```

## 注释使用规范

讲义可以引用源码注释的观点，但不能只靠注释。注释适合作为设计意图补充，调用链才是行为证据。

## 常见误区

1. 只看文件名推职责。
2. 只看类型不看调用点。
3. 只看 happy path，不看错误/权限/取消路径。
4. 发现旧路径后直接修脑补，不做 `rg --files` 校验。
