# 目录与维护方式

```text
src/
  entries/          首页、工作区、课节分享、学生报告四个入口
  core/             加密存储客户端、数据模型、导航壳和共享界面工具
  components/       Material Web 组件入口
  features/         按首页、班课、教学、日程、学生、财务、营销、潜客、指令、报告分组
  styles/
    app.css         公共样式入口，只组织核心样式的导入顺序
    core/           tokens（设计变量）、base（基础）、workspace（布局）、components（组件）
    pages/          首页、日程、学生、财务、营销和潜客的页面布局
    reports/        独立报告与 Shadow DOM 的阅读主题
public/
  index.html        首页 HTML
  pages/            其他页面 HTML
  assets/
    css/            构建后的 9 个样式资源
    js/             4 个入口及自动生成的共享分包
    images/         品牌图片
    marketing/      文章插图
server/             HTTP 服务、加密存储与生成的静态路由白名单
scripts/            构建、初始化、预览、数据导入导出和打包清单
examples/           空工作区与合成示例
licenses/           第三方许可证原文
tests/
  unit/             加密存储测试
  integration/      HTTP 权限与发布文件检查
  browser/          页面样式、布局与交互回归
.cache/             本地测试缓存，不发布
releases/           本地源码压缩包，不进入发布清单
data/               私有加密数据与迁移备份，不发布
```

## 源码和构建产物

编辑 `src/` 下的 JS/CSS，执行 `npm run build` 更新 `public/assets/`。不要手工修改生成的资源和 `server/public-files.json`。HTML 位于 `public/index.html` 和 `public/pages/`，不再将 HTML、JS、CSS 平铺在项目根目录。

服务仍保留 `/courses.html`、`/class-detail.html` 等已有 URL。构建脚本自动把它们映射到 `public/pages/`，所以班级、学生与分享链接不需要改动存储中的业务记录。旧图标地址保留兼容映射。

页面加载公共样式，再按需要加载页面样式；班课和指令页仅依赖公共组件，不保留空的页面 CSS。所有页面沿用同一套 CSS 设计变量和 Material Web 组件。报告主题在独立文档或 Shadow DOM 中隔离，防止工作区样式影响阅读内容。

## 增加或修改功能

1. 在相应 `src/features/` 目录维护业务逻辑，共享逻辑放 `src/core/`，使用明确的 ES 模块导入。
2. 颜色和通用变量改 `styles/core/tokens.css`；可复用控件改 `components.css`；页面布局改对应的 `styles/pages/` 文件。
3. 不再增加 polish、refined、expanded 等历史覆盖文件。直接修改当前负责该规则的源文件。
4. 新增 HTML 页面放在 `public/pages/`，运行构建自动更新发布白名单。
5. 执行格式检查、构建和测试。检查首页、班课卡片及统计区，保留 AGENTS.md 中的产品约定。

## 检查命令

```sh
npm ci
npm run format:check
npm run build
npm test
```

浏览器视觉回归在同一份隔离数据上运行。首次记录示例基线：

```sh
node tests/browser/visual-check.cjs record
npm run test:visual
```

Windows 默认使用已安装的 Edge。其他环境可设置 `BROWSER_CHANNEL=chromium`，并先运行 `npx playwright install chromium`。本地使用现有私有资料检查时可加 `--current`；截图和基线仅保存在 `.cache/test-results/`，不会进入源码包。

重复样式排查结果和复用边界见 [样式排查记录](style-audit.md)，后续可运行 `npm run styles:audit` 查看候选。
