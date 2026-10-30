const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');

function guideContent() {
  const result = esbuild.buildSync({
    entryPoints: [path.join(root, 'src/features/onboarding/content.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
  });
  const context = { module: { exports: {} } };
  vm.runInNewContext(result.outputFiles[0].text, context);
  return context.module.exports;
}
function buildGuides() {
  const c = guideContent();
  const skills = ['teacherbuddy-create-class', 'teacherbuddy-after-class'];
  fs.writeFileSync(
    path.join(root, 'docs/getting-started.md'),
    `# 用 WorkBuddy 开始使用 TeacherBuddy

TeacherBuddy 和两个 Skills 免费开源，在自己的电脑运行，无需购买服务器或域名。WorkBuddy 的 AI 调用受账号免费额度限制，[以官方套餐为准](https://www.workbuddy.cn/pricing/)。

## 1. 安装 WorkBuddy

从 [WorkBuddy 官网](${c.workbuddyUrl}) 下载电脑端，安装并登录。新建任务，选择存放教学工作台的文件夹。[官方安装图解](https://www.codebuddy.cn/docs/workbuddy/FirstTask)。

## 2. 复制下面的安装指令

把整段发给 WorkBuddy，无需自己输入命令：

\`\`\`text
${c.installPrompt}
\`\`\`

需要手动安装技能时，在「专家·技能·连接器 → 技能 → 添加技能 → 上传技能」中分别上传两个 ZIP，不要上传整个源码仓库 ZIP。[官方上传说明](${c.uploadGuide})。

${skills.map((id) => `- [下载 ${id}.zip](${c.skillDownload(id)})`).join('\n')}

## 3. 开始自己的教学工作

${c.scenarios.map((s) => `### ${s.name}\n\n${s.where}\n\n\`\`\`text\n${s.text}\n\`\`\``).join('\n\n')}

![班课页面，使用合成数据演示](../public/assets/images/guides/classroom.png)

图中为合成示例；新安装从空工作区开始。建班后，可在班课中查看每周上课时间、授课进度和学生人数。

## 下次打开与保存

Windows 双击项目文件夹中的「启动预览.cmd」，或让 WorkBuddy 打开已有 TeacherBuddy。电脑需保持开机，本机服务才能访问。

数据在自己的电脑中。定期备份 data 与 .env，两者缺一不可，不上传到公开仓库。遇到问题，把报错发给 WorkBuddy 并说明“保留我的班级和学生记录”。

两个 Skills 分别处理建班和课后学情；招生与营销可使用 WorkBuddy 的通用能力及库中其他指令。生成草稿不等于已经导入或发送，写入后应在相应页面核对。完整知识图谱作为文件交付，当前页面显示知识点掌握表。
`,
  );
  fs.writeFileSync(
    path.join(root, 'docs/skills-package.md'),
    `# TeacherBuddy Skills

仅包含两个可独立安装的技能：

| 技能 | 完成的工作 |
| --- | --- |
| teacherbuddy-create-class | 引导填信息、核对名单、生成每周课节与停补课安排 |
| teacherbuddy-after-class | 录音/录像/逐字稿 → 班级报告、学生报告、重点关注、知识图谱与证据索引 |

## 在 WorkBuddy 安装

从 [Releases](${c.skillsUrl}/releases/latest) 分别下载两个单独的技能 ZIP。在 WorkBuddy 的「专家·技能·连接器 → 技能 → 添加技能 → 上传技能」中逐个导入，然后检查「已安装」中两个技能已启用。[官方说明](${c.uploadGuide})。

每个 ZIP 内是一个同名文件夹及 SKILL.md，没有额外执行脚本。不要把包含两个文件夹的仓库源码 ZIP 当成单个技能导入。

## 使用

- 说“使用创建班级技能，带我建立第一个班级”，提供班级名称、名单和上课安排。
- 说“使用课后学情整理技能，整理这节课”，提供班级、课节、名单及课堂资料。无法读取录音或视频时，改用带时间戳的逐字稿。
- 其他对话平台可复制 SKILL.md 正文使用；支持 Agent Skills 的文件代理可将同名技能目录放入其配置的技能位置。

## 安装教师工作台

[TeacherBuddy 项目](${c.projectUrl}) · [零基础安装与使用](${c.projectUrl}/blob/main/docs/getting-started.md)

项目和技能免费开源；WorkBuddy 的 AI 调用按其账号额度计费或使用免费额度。技能不会自动发送家长消息或公开学生资料。普通对话产出报告与数据草稿，有文件工具的代理才可按授权合并到工作台；详细数据契约见各 SKILL.md。

## 维护

源文件在项目的 src/features/skills/library/ 中维护。运行项目的 npm run release:package 生成本仓库和发布 ZIP，避免同时修改两个副本。

MIT License，见 LICENSE。
`,
  );
}
if (require.main === module) buildGuides();
module.exports = { buildGuides };
