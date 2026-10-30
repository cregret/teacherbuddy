import createClass from './library/teacherbuddy-create-class/SKILL.md';
import afterClass from './library/teacherbuddy-after-class/SKILL.md';

export const teachingSkills = [
  {
    id: 'teacherbuddy-create-class',
    name: '创建班级',
    cat: '班级创建',
    desc: '逐步填写班级信息、核对学生名单，生成每周课节。',
    inputs: '班级信息、学生名单、每周时间与起止安排',
    out: '建班核对单、学生名单、完整课表、数据草稿',
    space: '班课 / 学生 / 日程',
    text: createClass,
    aliases: ['新学员入班'],
  },
  {
    id: 'teacherbuddy-after-class',
    name: '课后学情整理',
    cat: '课后整理',
    desc: '一次整理班级报告、学生报告、重点关注与知识图谱。',
    inputs: '录音、录像或逐字稿，班级、课节及学生名单',
    out: '班级与学生报告、重点关注、知识掌握表与图谱、证据索引',
    space: '班课 / 学生 / 重点关注',
    text: afterClass,
    aliases: ['录音整理课节报告', '更新学生学习档案', '课后全流程闭环'],
  },
];

export function mergeTeachingSkills(existing = []) {
  const ids = new Set(teachingSkills.map((s) => s.id));
  const names = new Set(teachingSkills.flatMap((s) => [s.name, ...s.aliases]));
  return [...teachingSkills, ...existing.filter((s) => !ids.has(s.id) && !names.has(s.name))];
}

export const skillPlatforms = [
  '通用对话',
  'WorkBuddy',
  'ChatGPT',
  'Claude',
  'Gemini',
  'DeepSeek',
  '豆包',
  '通义千问',
  'Codex / Claude Code',
];

export function skillPrompt(skill, platform = '通用对话') {
  if (!teachingSkills.some((s) => s.id === skill.id)) return skill.text || '';
  const body = skill.text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
  const mode =
    platform === 'Codex / Claude Code'
      ? '你在具备文件工具的代理环境中执行。先读取项目约定并检查实际权限；按下面的技能完成任务。没有实际写入并回读验证时，不宣称数据已同步。'
      : `请在${platform === '通用对话' ? '当前对话' : platform}中执行下面的技能。先检查此会话实际能读取的附件；无法读取音视频时请使用逐字稿。没有 TeacherBuddy 写入工具时交付结果与数据草稿，不声称已导入。`;
  return mode + '\n\n' + body;
}
