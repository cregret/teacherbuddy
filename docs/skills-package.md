# TeacherBuddy Skills

仅包含两个可独立安装的技能：

| 技能 | 完成的工作 |
| --- | --- |
| teacherbuddy-create-class | 引导填信息、核对名单、生成每周课节与停补课安排 |
| teacherbuddy-after-class | 录音/录像/逐字稿 → 班级报告、学生报告、重点关注、知识图谱与证据索引 |

## 在 WorkBuddy 安装

从 [Releases](https://github.com/cregret/teacherbuddy-skills/releases/latest) 分别下载两个单独的技能 ZIP。在 WorkBuddy 的「专家·技能·连接器 → 技能 → 添加技能 → 上传技能」中逐个导入，然后检查「已安装」中两个技能已启用。[官方说明](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)。

每个 ZIP 内是一个同名文件夹及 SKILL.md，没有额外执行脚本。不要把包含两个文件夹的仓库源码 ZIP 当成单个技能导入。

## 使用

- 说“使用创建班级技能，带我建立第一个班级”，提供班级名称、名单和上课安排。
- 说“使用课后学情整理技能，整理这节课”，提供班级、课节、名单及课堂资料。无法读取录音或视频时，改用带时间戳的逐字稿。
- 其他对话平台可复制 SKILL.md 正文使用；支持 Agent Skills 的文件代理可将同名技能目录放入其配置的技能位置。

## 安装教师工作台

[TeacherBuddy 项目](https://github.com/cregret/teacherbuddy) · [零基础安装与使用](https://github.com/cregret/teacherbuddy/blob/main/docs/getting-started.md)

项目和技能免费开源；WorkBuddy 的 AI 调用按其账号额度计费或使用免费额度。技能不会自动发送家长消息或公开学生资料。普通对话产出报告与数据草稿，有文件工具的代理才可按授权合并到工作台；详细数据契约见各 SKILL.md。

## 维护

源文件在项目的 src/features/skills/library/ 中维护。运行项目的 npm run release:package 生成本仓库和发布 ZIP，避免同时修改两个副本。

MIT License，见 LICENSE。
