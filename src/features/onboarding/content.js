import repositories from './releases.json';

export const projectUrl = `https://github.com/${repositories.owner}/${repositories.project}`;
export const skillsUrl = `https://github.com/${repositories.owner}/${repositories.skills}`;
export const workbuddyUrl = 'https://www.workbuddy.cn/';
export const uploadGuide =
  'https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market';
export const skillDownload = (id) => `${skillsUrl}/releases/latest/download/${id}.zip`;

export const installPrompt = `请帮我在这台电脑安装并启动 TeacherBuddy 教师工作台。我不懂代码，请你完成操作，只在确实需要我点击或补充信息时告诉我下一步。

项目：${projectUrl}
两个 Skills：${skillsUrl}

1. 在我选定的工作文件夹下创建 TeacherBuddy 目录。若目录已存在，先识别是否为已有安装，保留 .env 和 data，不覆盖我的资料。
2. 优先下载项目 Releases 最新版的 teacherbuddy.zip 并解压；不要用第三方镜像。发布包含构建资源，运行无需 npm install。检查 Node.js 是否为 22 或更新版本；没有时引导我从 https://nodejs.org/ 安装官方 LTS，不要求我填写 API Key、购买服务器或订阅。
3. 阅读项目 README.md 和 AGENTS.md。运行 npm run preview，让服务在后台持续运行，并打开实际输出的本机地址。Windows 的后台进程使用隐藏窗口；不要把带密码的正式服务公开到网络。首次安装从空工作区开始，不导入示例覆盖我的数据。
4. 从 Skills 仓库的最新 Release 下载 teacherbuddy-create-class.zip 和 teacherbuddy-after-class.zip。先核对各包内有对应目录及 SKILL.md，再使用 WorkBuddy 支持的上传技能入口安装，不猜测隐藏安装目录。若你无法替我点击，告诉我文件位置，并引导我在“专家·技能·连接器 → 技能 → 添加技能 → 上传技能”中分别上传这两个 ZIP。
5. 核对网页能打开，两个技能已启用；无法核实时明确告诉我，不要说已完成。给我留下项目文件夹位置和下次打开方式：Windows 双击“启动预览.cmd”；其他系统可以继续请你启动。
6. 最后问我班级名称、分组、学生名单和每周上课安排，使用“创建班级”技能开始。名单与课表核对后，我授权你备份并合并本工作区数据；需要导入时只停止和重启你为该工作区启动的服务，不能停止其他程序，不覆盖历史资料。`;

export const scenarios = [
  {
    id: 'class',
    name: '建立第一个班级',
    where: '班课 · 学生 · 日程',
    text: '请使用“创建班级”技能，带我建立自己的第一个班级。先问班级名称、我自定义的分组、学生名单、每周上课时间和起止安排，一次只问当前缺的信息。先让我核对名单和具体课表，再备份、合并到我的 TeacherBuddy；若需要导入，可停止并重启你为这个工作区启动的服务，不要清空其他资料。',
    route: 'courses.html',
  },
  {
    id: 'learning',
    name: '整理课后学情',
    where: '课节报告 · 学生档案 · 重点关注',
    text: '请使用“课后学情整理”技能。先确认我这份资料对应的班级、日期、课节和学生名单，再整理班级学情报告、学生学情报告、重点关注和知识图谱。给每项判断注明来源，听不清或身份不明的不要猜。核对后备份并合并到我的 TeacherBuddy，保留历史记录；图谱文件单独保存。需要导入时只重启你为这个工作区启动的服务。',
    route: 'xue.html',
  },
  {
    id: 'leads',
    name: '跟进招生咨询',
    where: '潜在客池',
    text: '请根据我提供的咨询记录，整理潜在学员的课程需求、已沟通内容、当前进展和下一次联系安排，生成可核对的名单。只记录明确提供的信息，不猜电话、不替我发送消息。先让我核对，再按 TeacherBuddy 当前数据结构合并到潜在客池，保留原有跟进记录。',
    route: 'qianke.html',
  },
  {
    id: 'marketing',
    name: '把课堂成果变成文章',
    where: '营销招生',
    text: '请从我选定的一节课的真实记录中，制作一篇至少 600 字的招生文章草稿，写清适合什么学生、课堂如何解决问题、有哪些有证据的变化，并注明来源班级、课节与日期。搭配有权使用的图片；没有合适图片时给出配图建议，不冒用学生照片，不编造提分效果。去除学生个人信息，不自动发布。让我核对后按 TeacherBuddy 当前文章结构保存到营销招生草稿。',
    route: 'marketing.html',
  },
];
