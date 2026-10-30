# TeacherBuddy

可自行部署的教师工作台，包含日程、班课、学生、缴费课消、营销、潜客和 Skills 指令。

**不懂代码？从[用 WorkBuddy 开始使用](docs/getting-started.md)入门。** 下载、复制一段话，交给 WorkBuddy 安装；页面左下角也有「开始使用」。项目和两个 Skills 免费开源，本机运行无需购买服务器。WorkBuddy 的 AI 调用受账号额度限制。

发布版 `teacherbuddy.zip` 包含构建资源，安装 Node.js 22 或更新版本后即可运行，无需先安装开发依赖。两个教学技能的下载和导入方式见 [Skills 包说明](docs/skills-package.md)。

采用 Node.js 单进程服务和 AES-256-GCM 加密 JSON 文件，不需要数据库。当前适用于一个工作室共用一个管理员账号；不提供多租户、角色权限或匿名报告分享。独立简报也需要登录。

## 本地运行

需要 Node.js 22 或更新版本。运行服务无需安装第三方依赖。

```sh
npm run preview
```

也可双击 Windows 的 `启动预览.cmd`。预览会自动打开浏览器，仅监听本机地址，无需登录；重复启动会复用已运行的预览服务。

正式部署使用 `npm run setup` 和 `npm start`，默认地址为 http://127.0.0.1:3000。此模式需要登录，用户名为 `admin`，密码查看本地 `.env` 的 `ADMIN_PASSWORD`。不要将本地预览模式用于公网部署。

全新安装默认没有业务数据。体验合成示例时，先停止服务：

```sh
npm run data -- import examples/demo.json
npm start
```

导入会替换整份工作区，旧加密文件保留为一份 `.bak`。不要在已有业务数据时随意导入示例。

## Vercel 公开演示

仓库提供 `vercel.json`，Vercel 执行 `npm run build:vercel`，发布 `dist/`。演示构建只使用仓库中的合成数据，不读取 `.env` 或本机 `data/`；构建输出不会覆盖本地预览。访客的修改保存在自己的浏览器会话中，不会写入共享服务器，关闭会话后可重新开始。

这是公开体验与下载安装入口，不是保存真实教学数据的云端工作区。正式使用请按入门说明部署本地版，或另行接入持久化云存储与登录权限。

## Docker 部署

先生成 `.env`，然后：

```sh
docker compose up -d --build
```

容器使用独立数据卷，默认仅绑定本机 3000 端口。公网访问请通过 HTTPS 反向代理转发到该端口。Basic 登录依赖 HTTPS 保护传输；文件加密只保护磁盘存储。反向代理应保留原始 Host。部署使用同一份 `DATA_KEY` 才能读取原数据；Docker 的新数据卷默认是空工作区，本地 `data/` 不会自动复制进去。

环境变量：`HOST`、`PORT`、`DATA_DIR`、`DATA_KEY`、`ADMIN_PASSWORD`。`DATA_KEY` 为 32 字节随机密钥的 64 位十六进制表示，访问密码至少 16 个字符。服务不会生成或写入固定默认密码。

## 存储与备份

- `data/workspace.enc.json`：加密后的 JSON 信封，包含随机 IV、认证标签和密文。
- `data/workspace.enc.json.bak`：上一次成功保存的加密副本，不是长期备份。
- `data/migration-backup.enc.json`：本次本地迁移资料的加密副本，仅已有项目迁移时存在。
- `.env`：密钥与访问密码。与数据文件分开备份，禁止提交源码仓库。
- 启动时错误密钥或损坏文件会报错退出，不会自动清空数据。
- 保存采用临时文件、刷新磁盘、原子替换；同目录仅允许运行一个服务实例。异常终止后会自动清理已退出进程的残留锁；仍在运行的实例不会被覆盖。

学生跟进、首页处理结果、报名补录、财务流水、营销编辑和界面偏好统一通过服务端保存。浏览器只维护内存缓存，不在 localStorage 留业务副本。右下角只在保存中或失败时显示状态。不同窗口修改同一记录发生冲突时拒绝覆盖，需要留存修改文字、刷新并核对；当前不是实时协作系统。

旧版本浏览器 localStorage 的记录不会自动上传。如有需要，请先在旧版本导出或留存；文件迁移仅覆盖原有文件记录。

## 导入导出

先停止服务。JSON 结构参考 `examples/demo.json`，完整替换需保留所有顶级字段。

```sh
npm run data -- export /private/teacherbuddy-backup.json
npm run data -- import /private/teacherbuddy-backup.json
```

导出的文件为明文，不要放在开源目录。新建班级和学生目前通过导入 JSON 完成，未增加管理后台页面。`model` 保存分组、班级、学生、报名、潜客、指令与可选的 `financeAccounts` / `financeEvents`；`workspace` 保存课节报告、按班级组织的学情和关注事件；`state` 保存界面编辑结果及版本号。关联以稳定 ID 为准，课节以班级 ID 与课次定位。

旧班级与学生 HTML 可以放在工作区 `resources` 映射中，由登录后的服务读取，不再以静态文件形式公开。常规新数据使用结构化 `model` 与 `workspace`。

## 开发与开源

```sh
npm ci
npm run build
npm test
```

`server/public-files.json` 是构建自动生成的静态路由白名单；页面放在 `public/pages/`，前端源码放在 `src/`。运行 `npm run build` 更新资源和白名单。服务不会直接公开项目目录、配置、数据、脚本或示例 JSON。原有资料只存在于本地加密数据中；仓库中的 `examples/` 使用合成姓名和记录。开源前检查 `.gitignore`，不要强制加入 `.env`、`data/` 或私人备份。

采用 MIT 许可证。Material Web 构建产物使用其自身的 Apache-2.0 许可证，见 [第三方说明](docs/third-party.md)。

目录职责、样式归属与回归检查见 [架构与维护说明](docs/architecture.md)。
