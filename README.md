# pi-strict-ask-mode

为 [Pi](https://pi.dev) 提供严格只读 `/ask` 模式。

开启后，模型只能使用：

- `read`
- `grep`
- `find`
- `ls`

`bash`、`edit`、`write` 和其他自定义工具都会从模型工具集中移除；`tool_call` 拦截器还会阻止残留或重新激活的非只读调用。关闭后恢复进入 Ask 模式前的工具集。

## 安装

从 npm 安装：

```bash
pi install npm:pi-strict-ask-mode
```

从 GitHub 安装：

```bash
pi install git:github.com/liush2yuxjtu/pi-strict-ask-mode
```

安装后重启 Pi，或在当前会话执行 `/reload`。

## 使用

```text
/ask                 切换 Ask 模式
/ask on              开启
/ask off             关闭并恢复原工具集
/ask status          查看状态
/ask <问题>          开启 Ask 模式并立即提问
```

开启时，底部状态栏显示 `ASK · 只读`。

## 安全边界

- 扩展使用严格白名单，不分析 shell 命令是否“看起来安全”；`bash` 直接不可用。
- 未知自定义工具默认不可用，避免第三方工具绕过只读限制。
- 用户自己在编辑器输入的 `!command` 属于人工 shell，不是模型工具调用，本扩展不会拦截。
- Pi 扩展与 Pi 进程权限相同。本扩展是模型工具权限控制，不是操作系统沙箱；其他恶意扩展仍需单独审计。

## 开发

```bash
npm install
npm run check
npm run pack:check
```

零运行时依赖。

## 许可证

MIT
