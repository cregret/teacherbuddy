import {
  installPrompt,
  scenarios,
  projectUrl,
  skillsUrl,
  workbuddyUrl,
  uploadGuide,
  skillDownload,
} from './content.js';

export function renderGettingStarted({ root, esc, route }) {
  document.body.classList.add('workpages');
  const external = (url, text, className = '') =>
    `<a class="${className}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  root.innerHTML = `<div class="start-guide">
    <section class="start-step"><span class="start-number">1</span><div><h2>安装 WorkBuddy</h2><p>用电脑打开官网，下载安装并登录。新建一个任务，选一个文件夹存放你的教学工作台。</p><div class="start-actions">${external(workbuddyUrl, '下载 WorkBuddy ↗', 'button primary')}${external('https://www.codebuddy.cn/docs/workbuddy/FirstTask', '查看官方安装图解 ↗')}</div><p class="start-cost">TeacherBuddy 和 Skills 免费开源，本机使用不需要服务器或域名。WorkBuddy 的 AI 调用受账号免费额度限制，${external('https://www.workbuddy.cn/pricing/', '以官方套餐为准')}。</p></div></section>
    <section class="start-step"><span class="start-number">2</span><div><h2>复制这段话，让它帮你安装</h2><p>把安装指令粘贴到 WorkBuddy 并发送。它会下载工作台、启动网页，并准备两个技能包。</p><div class="start-actions"><button class="button primary" data-copy-start="install">复制安装指令</button><span class="start-copy-state" role="status"></span></div><details class="start-prompt"><summary>查看完整安装指令</summary><textarea id="startInstallPrompt" aria-label="安装指令" readonly>${esc(installPrompt)}</textarea></details><div class="start-skill-upload"><p>需要手动导入技能时：打开「专家·技能·连接器 → 技能 → 添加技能 → 上传技能」，分别上传这两个 ZIP。</p><div class="start-actions">${external(skillDownload('teacherbuddy-create-class'), '下载「创建班级」')}${external(skillDownload('teacherbuddy-after-class'), '下载「课后学情整理」')}${external(uploadGuide, '查看官方图解 ↗')}</div></div></div></section>
    <section class="start-step"><span class="start-number">3</span><div><h2>从第一个班级开始</h2><p>安装好后，复制下面任意一项发给 WorkBuddy，再按提示提供资料。</p><div class="start-tasks">${scenarios.map((s, i) => `<article><div><h3>${i + 1}. ${esc(s.name)}</h3><p>${esc(s.where)}</p></div><button class="button${i === 0 ? ' primary' : ''}" data-copy-start="${s.id}">复制指令</button><a href="${esc(route(s.route))}">查看页面 →</a><span class="start-copy-state" role="status"></span></article>`).join('')}</div><details class="start-preview"><summary>看看工作台的样子</summary><img src="/assets/images/guides/classroom.png" alt="使用合成示例展示的班课页面：分组筛选、班级卡片、每周上课时间、授课进度和学员数" loading="lazy"><p>合成示例；你的新工作区从空班级开始。</p></details></div></section>
    <section class="start-help"><h2>以后怎么用</h2><dl><div><dt>下次打开</dt><dd>Windows 双击项目文件夹中的「启动预览.cmd」。也可以对 WorkBuddy 说：“打开我已有的 TeacherBuddy，不要重新安装。”</dd></div><div><dt>保存和备份</dt><dd>数据保存在你自己的电脑。请 WorkBuddy 定期备份项目中的 data 和 .env，两者缺一不可；不要把它们上传到公开仓库。</dd></div><div><dt>遇到报错</dt><dd>把错误截图发给 WorkBuddy，说：“修复这个问题，保留我的班级和学生记录。”电脑需保持开机才能访问本机服务。</dd></div></dl><div class="start-actions">${external(projectUrl, '项目源码 ↗')}${external(skillsUrl, 'Skills 源码 ↗')}<a href="${esc(route('zhiling.html'))}">打开 Skills 库 →</a></div></section>
  </div>`;
  root.querySelectorAll('[data-copy-start]').forEach(
    (button) =>
      (button.onclick = async () => {
        const text =
          button.dataset.copyStart === 'install'
            ? installPrompt
            : scenarios.find((s) => s.id === button.dataset.copyStart).text;
        const status = button.parentElement.querySelector('[role=status]');
        try {
          await navigator.clipboard.writeText(text);
          status.textContent = '已复制，粘贴到 WorkBuddy 即可';
        } catch {
          status.textContent = '请选中下方文字复制';
          let input = button.parentElement.querySelector('textarea');
          if (!input) {
            input = document.createElement('textarea');
            input.className = 'start-copy-fallback';
            input.readOnly = true;
            input.setAttribute('aria-label', '待复制指令');
            button.parentElement.append(input);
          }
          input.value = text;
          input.focus();
          input.select();
        }
      }),
  );
}
