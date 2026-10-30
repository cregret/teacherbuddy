import { skillPlatforms, skillPrompt, teachingSkills } from './catalog.js';

export function createSkillsView(context) {
  const { model, params, root, esc, tip, heading } = context;
  function skills() {
    const items = model.skills || [];
    let query = params.get('q') || '';
    let platform = '通用对话';
    let selected = items.findIndex((s) =>
      [s.name, s.desc, s.cat, s.space, s.text]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    if (selected < 0) {
      selected = 0;
      query = '';
    }
    root.innerHTML =
      heading(
        'Skills 指令',
        '给 AI 工具 使用的教师工作指令。左侧找任务，右侧查看完整指令并复制。',
      ) +
      '<div class="skills-workspace"><aside class="panel skills-index"><div class="panel-heading"><div><h2>指令目录</h2><p class="caption">' +
      items.length +
      ' 条工作指令</p></div></div><div class="skills-filters"><label>搜索<input id="skillsSearch" type="search" placeholder="备课、复盘、学情、营销" value="' +
      esc(query) +
      '"></label><label>工作类别<select id="skillsCategory"><option value="">全部类别</option>' +
      [...new Set(items.map((s) => s.cat))]
        .map((cat) => '<option value="' + esc(cat) + '">' + esc(cat) + '</option>')
        .join('') +
      '</select></label></div><nav class="skills-list" id="skillsList" aria-label="Skills 指令列表"></nav></aside><section class="panel skills-detail" id="skillsDetail"></section></div>';
    const input = root.querySelector('#skillsSearch'),
      category = root.querySelector('#skillsCategory'),
      list = root.querySelector('#skillsList'),
      detail = root.querySelector('#skillsDetail');
    let cat = '';
    const matches = () =>
      items
        .map((s, i) => ({ s, i }))
        .filter(
          ({ s }) =>
            (!cat || s.cat === cat) &&
            (!query ||
              [s.name, s.desc, s.cat, s.space, s.text]
                .join(' ')
                .toLowerCase()
                .includes(query.toLowerCase())),
        );
    function drawDetail() {
      const s = items[selected];
      if (!s) {
        detail.innerHTML = '<div class="result-empty">没有找到匹配的指令。</div>';
        return;
      }
      detail.innerHTML =
        '<header class="skills-detail-head"><div><span class="skills-detail-category">' +
        esc(s.cat) +
        '</span><h2>' +
        esc(s.name) +
        '</h2><p>' +
        esc(s.desc) +
        '</p></div></header><dl class="skills-output">' +
        (s.sourceUrl
          ? '<div><dt>工作空间</dt><dd>' +
            esc(s.space) +
            '</dd></div><div><dt>技能链</dt><dd>' +
            esc(s.chain || '无需') +
            '</dd></div><div><dt>专家</dt><dd>' +
            esc(s.expert || '无需') +
            '</dd></div><div><dt>预期产出</dt><dd>' +
            esc(s.out) +
            '</dd></div>'
          : '<div><dt>提供什么</dt><dd>' +
            esc(s.inputs || '任务相关材料') +
            '</dd></div><div><dt>产出内容</dt><dd>' +
            esc(s.out || s.space) +
            '</dd></div>') +
        '</dl>' +
        (teachingSkills.some((item) => item.id === s.id)
          ? '<div class="skills-platform"><label>使用平台<select id="skillPlatform">' +
            skillPlatforms
              .map(
                (name) =>
                  '<option' +
                  (name === platform ? ' selected' : '') +
                  '>' +
                  esc(name) +
                  '</option>',
              )
              .join('') +
            '</select></label><button type="button" class="button" id="downloadSkill" title="将文件放入 ' +
            esc(s.id) +
            '/SKILL.md">下载 SKILL.md</button></div>'
          : '') +
        '<div class="skills-prompt-head"><h3>完整指令</h3><button type="button" class="button primary" data-copy-skill="' +
        selected +
        '">复制指令</button><span class="copy-state" aria-live="polite"></span></div><textarea class="skills-prompt-text" aria-label="完整 AI 工具 指令" readonly>' +
        esc(skillPrompt(s, platform)) +
        '</textarea>' +
        (s.note ? '<div class="skill-tip">' + tip(s.note, '指令使用说明') + '</div>' : '');
      detail.querySelector('#skillPlatform')?.addEventListener('change', (event) => {
        platform = event.target.value;
        detail.querySelector('.skills-prompt-text').value = skillPrompt(s, platform);
        detail.querySelector('.copy-state').textContent = '';
      });
      detail.querySelector('#downloadSkill')?.addEventListener('click', () => {
        const url = URL.createObjectURL(
          new Blob([s.text], { type: 'text/markdown;charset=utf-8' }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'SKILL.md';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        detail.querySelector('.copy-state').textContent = '请放入 ' + s.id + '/SKILL.md';
      });
    }
    function drawList() {
      const visible = matches();
      if (!visible.length) selected = -1;
      if (visible.length && !visible.some((x) => x.i === selected)) selected = visible[0].i;
      list.innerHTML = visible.length
        ? visible
            .map(
              ({ s, i }) =>
                '<button type="button" class="skills-choice ' +
                (i === selected ? 'active' : '') +
                '" aria-pressed="' +
                (i === selected) +
                '" data-skill-index="' +
                i +
                '"><span>' +
                esc(s.cat) +
                '</span><strong>' +
                esc(s.name) +
                '</strong><small>' +
                esc(s.desc) +
                '</small></button>',
            )
            .join('')
        : '<p class="result-empty">没有找到匹配的指令。</p>';
      list.querySelectorAll('[data-skill-index]').forEach(
        (button) =>
          (button.onclick = () => {
            selected = Number(button.dataset.skillIndex);
            drawList();
            drawDetail();
          }),
      );
    }
    input.oninput = () => {
      query = input.value.trim();
      drawList();
      drawDetail();
    };
    category.onchange = () => {
      cat = category.value;
      drawList();
      drawDetail();
    };
    drawList();
    drawDetail();
  }
  return skills;
}
