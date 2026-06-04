# 个人成长长期奖励计划

这是一个只在当前台式电脑上运行的本地网页。数据保存在本机，不需要域名、备案、Tailscale 或其他远程访问配置。

## 首次使用

安装 Node.js 后，在项目目录执行：

```powershell
npm install
npm run build
```

随后双击：

```text
打开成长计划.cmd
```

程序会在后台启动本地服务，并打开 `http://127.0.0.1:4174`。

## 数据和备份

- 主数据库：`data/growth.db`
- 自动备份：`data/backups/`
- 每天生成一份备份，保留最近 14 份。
- `data/` 不会提交到 Git 仓库。

## 开发和验证

```powershell
npm install
npm test
npm run build
```
