import { escapeHtml as esc } from '../../core/html.js';
import { Product } from '../../core/model.js';
import { readFinanceLedger, accountTotals } from '../finance/ledger.js';
import {
  FOLLOWUPS,
  PROCESSED,
  RESOLUTIONS,
  readStudentState as read,
  saveStudentState as save,
  studentEvents,
  scopedLearning,
  findLearningLesson,
} from './records.js';

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const money = (n) =>
  '¥' + (n / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const link = (href, label, cls = '') => `<a class="${cls}" href="${esc(href)}">${esc(label)}</a>`;
const table = (heads, rows) =>
  `<div class="sp-table-scroll"><table><thead><tr>${heads.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const empty = (text) => `<p class="sp-empty">${esc(text)}</p>`;

export function renderStudentDetail(host, model, options = {}) {
  const params = new URLSearchParams(location.search);
  const student = model.students.find((s) => s.id === (options.studentId || params.get('id')));
  if (!student) {
    host.innerHTML = empty('没有找到这位学生') + link(Product.route('xue.html'), '返回学生列表');
    return;
  }
  const classes = model.classes.filter((c) => student.classIds.includes(c.id));
  const requested = options.classId || params.get('class');
  let cls = requested
    ? classes.find((c) => c.id === requested)
    : classes.find((c) => c.status === 'active') || classes[0];
  if (requested && !cls) {
    host.innerHTML =
      empty('这位学生未关联该班级') + link(Product.studentLink(student.id), '查看学生档案');
    return;
  }
  const tabs = [
    ['overview', '学习概况'],
    ['history', '逐课记录'],
    ['focus', '跟进沟通'],
    ['finance', '缴费课时'],
  ];
  let tab = tabs.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview';
  host.classList.add('student-profile');
  const learning = () => scopedLearning(model, student, cls);
  const events = () => studentEvents(model, student.id, cls?.id || '');
  const lessonHref = (l) =>
    Product.route('class-detail.html', { id: cls.id, tab: 'lessons', lesson: l.number });
  const financeHref = (t = '') =>
    Product.route('payment.html', {
      student: student.id,
      name: student.name,
      ...(cls ? { class: cls.id } : {}),
      ...(t ? { tab: t } : {}),
    });
  function sync() {
    const url = new URL(location.href);
    url.searchParams.set('id', student.id);
    url.searchParams.set('tab', tab);
    cls ? url.searchParams.set('class', cls.id) : url.searchParams.delete('class');
    history.replaceState(null, '', url);
  }
  function draw() {
    const d = learning(),
      ev = events(),
      pending = ev.filter((f) => f.status !== 'resolved');
    const back = options.onBack
      ? '<button class="sp-back" id="spBack">← 学生列表</button>'
      : link(
          params.get('from') === 'class' && cls
            ? Product.classLink(cls.id, 'students') + '&student=' + encodeURIComponent(student.id)
            : Product.route('xue.html'),
          params.get('from') === 'class' ? '← 班级学生' : '← 学生列表',
          'sp-back',
        );
    host.innerHTML = `<div class="sp-back-row">${back}</div><header class="sp-header"><div><h1>${esc(student.name)}</h1><div class="sp-context">${cls ? link(Product.classLink(cls.id, 'students') + '&student=' + encodeURIComponent(student.id), cls.label) : '班级未关联'}${cls?.status === 'archived' ? '<span>已归档</span>' : ''}</div></div><div class="sp-controls">${classes.length ? `<label>班级<select id="spClass">${classes.map((c) => `<option value="${esc(c.id)}" ${c.id === cls?.id ? 'selected' : ''}>${esc(model.groups.find((g) => g.id === c.groupId)?.name || '')} · ${esc(c.label)}${c.status === 'archived' ? ' · 已归档' : ''}</option>`).join('')}</select></label>` : ''}<button class="button" id="spFeedback" ${d ? '' : 'disabled'}>准备家长反馈</button><button class="button primary" id="sdAddFollow">记录跟进</button></div></header><nav class="sp-tabs" aria-label="学生详情分区">${tabs.map(([id, label]) => `<button data-detail-tab="${id}" aria-pressed="${id === tab}">${label}${id === 'focus' && pending.length ? `<span>${pending.length}</span>` : ''}</button>`).join('')}</nav><section class="sp-content" id="spContent"></section>`;
    const content = host.querySelector('#spContent');
    if (tab === 'overview') {
      const recent = d?.lessons?.[0],
        lesson = findLearningLesson(cls, recent);
      content.innerHTML = `<div class="sp-overview"><section><div class="sp-section-head"><h2>最近学习</h2>${lesson ? link(lessonHref(lesson), '查看对应课节 →') : ''}</div>${d ? `<p class="sp-latest">${esc(d.latest || recent?.[4] || '暂无学习摘要')}</p><dl class="sp-facts"><div><dt>个人到课</dt><dd>${esc(d.metrics?.['到课'] || '未记录')}</dd></div><div><dt>最近测验</dt><dd>${esc(d.metrics?.['随堂测验'] || '未记录')}</dd></div><div><dt>最近作业</dt><dd>${esc(d.homework?.[0]?.status || '未记录')}</dd></div></dl>${d.focus || d.judgement ? `<h3>需要巩固</h3><p>${esc(d.focus || d.judgement)}</p>` : ''}${d.sections?.['行动方案'] ? `<h3>下一步练习</h3><p>${esc(d.sections['行动方案'])}</p>` : ''}` : empty('当前班级还没有个人学习记录')}</section><section><div class="sp-section-head"><h2>待跟进</h2><button class="sp-text-button" data-open-tab="focus">全部记录 →</button></div>${
        pending.length
          ? pending
              .slice(0, 3)
              .map(
                (f) =>
                  `<button class="sp-pending" data-open-tab="focus"><span>${esc(f.category)}</span><strong>${esc(f.detail || f.text)}</strong>${f.nextStep ? `<small>${esc(f.nextStep)}</small>` : ''}</button>`,
              )
              .join('')
          : empty('暂无待跟进事项')
      }</section></div>`;
    } else if (tab === 'history') {
      content.innerHTML =
        `<div class="sp-section-head"><h2>逐课学习记录</h2>${d && cls ? link(Product.route('student-report.html', { id: student.id, class: cls.id }), '完整学习报告 ↗') : ''}</div>` +
        (d?.lessons?.length
          ? table(
              ['课节', '出勤', '测验', '课堂表现', '作业 / 订正'],
              d.lessons.map((r) => {
                const l = findLearningLesson(cls, r),
                  h = d.homework?.find((h) => h.lesson === r[0] && h.date === r[1]);
                return `<tr><td>${l ? link(lessonHref(l), r[0]) : esc(r[0])}<small>${esc(r[1])}</small></td><td>${esc(r[2] || '未记录')}</td><td>${esc(r[3] || '未记录')}</td><td>${esc(r[4] || '未记录')}</td><td>${esc(h?.status || '未记录')}${h?.text ? `<small>${esc(h.text)}</small>` : ''}</td></tr>`;
              }),
            )
          : empty('当前班级还没有逐课学习记录')) +
        (d?.knowledge?.length
          ? `<details class="sp-knowledge"><summary>知识掌握 · ${d.knowledge.length} 项</summary>${table(
              ['知识点', '掌握情况', '练习方向'],
              d.knowledge.map(
                (k) =>
                  `<tr><td>${esc(k.topic)}</td><td>${esc(k.status)}</td><td>${esc(k.note)}</td></tr>`,
              ),
            )}</details>`
          : '');
    } else if (tab === 'focus') {
      const ordered = [...ev].sort(
        (a, b) =>
          Number(a.status === 'resolved') - Number(b.status === 'resolved') ||
          (b.date || '').localeCompare(a.date || ''),
      );
      content.innerHTML = ordered.length
        ? ordered
            .map(
              (f) =>
                `<article class="sp-event sd-event"><header><strong>${esc(f.category)}</strong><time>${esc(f.date || '日期未记录')}</time><span>${f.status === 'resolved' ? '已处理' : '待跟进'}</span></header><p>${esc(f.detail || f.text)}</p>${f.nextStep ? `<p class="sp-next-step">下一步：${esc(f.nextStep)}</p>` : ''}${f.resolution ? `<p class="sd-result">处理结果：${esc(f.resolution)}</p>` : ''}${f.status !== 'resolved' ? `<form data-resolve="${esc(f.id)}" class="sp-resolve"><input aria-label="处理结果" placeholder="填写处理结果" required><button type="submit" class="button">完成跟进</button><span role="alert"></span></form>` : ''}</article>`,
            )
            .join('')
        : empty('当前班级还没有跟进记录');
    } else {
      const ledger = readFinanceLedger(model),
        accounts = ledger.accounts.filter(
          (a) => a.studentId === student.id && (!cls || a.classId === cls.id),
        );
      content.innerHTML =
        `<div class="sp-section-head"><h2>学生课包</h2>${link(financeHref(), '进入缴费课消 →')}</div>` +
        (accounts.length
          ? table(
              ['课包', '累计实收', '剩余余额', '剩余课时', '待收款'],
              accounts.map((a) => {
                const t = accountTotals(a, ledger.events);
                return `<tr><td>${esc(a.className)}<small>${a.units} 课时 · ${money(a.rate)} / 课时</small></td><td>${money(t.paid)}</td><td>${money(t.balance)}</td><td>${t.remaining} / ${a.units}</td><td>${money(t.unpaid)}</td></tr>`;
              }),
            )
          : empty('当前班级尚未建立课包账户')) +
        `<div class="sp-finance-links">${link(financeHref('receipts'), '收款流水 →')}${link(financeHref('consumption'), '扣费明细 →')}</div>`;
      const enrollment = read('teacherbuddy.student.enrollment.v1', {})[student.id];
      if (enrollment)
        content.insertAdjacentHTML(
          'beforeend',
          `<details class="sp-knowledge"><summary>报名记录</summary><p>${esc(enrollment.date || '日期未记录')}</p><p>${esc(enrollment.evidence || '')}</p></details>`,
        );
    }
    host.querySelector('#spBack')?.addEventListener('click', options.onBack);
    host.querySelector('#spClass')?.addEventListener('change', (e) => {
      cls = classes.find((c) => c.id === e.target.value);
      sync();
      draw();
    });
    host.querySelectorAll('[data-detail-tab],[data-open-tab]').forEach(
      (b) =>
        (b.onclick = () => {
          tab = b.dataset.detailTab || b.dataset.openTab;
          sync();
          draw();
        }),
    );
    host.querySelector('#sdAddFollow').onclick = () => addFollow();
    host.querySelector('#spFeedback').onclick = () => feedback();
    host.querySelectorAll('[data-resolve]').forEach(
      (form) =>
        (form.onsubmit = async (e) => {
          e.preventDefault();
          const text = form.querySelector('input').value.trim();
          if (!text) return;
          const id = form.dataset.resolve;
          form.querySelector('button').disabled = true;
          try {
            const local = read(FOLLOWUPS, []),
              f = local.find((f) => f.id === id && f.studentId === student.id);
            if (f) {
              f.status = 'resolved';
              f.resolution = text;
              f.resolvedAt = today();
              await save(FOLLOWUPS, local);
            } else {
              await save(RESOLUTIONS, { ...read(RESOLUTIONS, {}), [id]: { text, date: today() } });
              await save(PROCESSED, [...new Set([...read(PROCESSED, []), id])]);
            }
            options.onChange?.();
            draw();
          } catch {
            form.querySelector('[role=alert]').textContent = '保存失败，请刷新后核对';
            form.querySelector('button').disabled = false;
          }
        }),
    );
  }
  function addFollow(category = '学习状态') {
    document.getElementById('sdFollowDialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'sdFollowDialog';
    dialog.className = 'sp-dialog';
    dialog.innerHTML = `<form><h2>记录跟进 · ${esc(student.name)}</h2><label>日期<input type="date" name="date" value="${today()}" required></label><label>类型<select name="category">${['学习状态', '待补测', '待补交作业', '成绩下滑', '家长沟通', '进步表现'].map((t) => `<option ${t === category ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>观察或沟通内容<textarea name="detail" required></textarea></label><label>下一步<input name="nextStep" required></label><label>状态<select name="status"><option value="open">待跟进</option><option value="resolved">已处理</option></select></label><label id="spResultField" hidden>处理结果<textarea name="resolution"></textarea></label><p role="alert"></p><footer><button class="button" type="button">取消</button><button class="button primary" type="submit">保存跟进</button></footer></form>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    form.elements.status.onchange = () => {
      const done = form.elements.status.value === 'resolved';
      form.querySelector('#spResultField').hidden = !done;
      form.elements.resolution.required = done;
    };
    form.querySelector('[type=button]').onclick = () => dialog.close();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const detail = form.elements.detail.value.trim(),
        nextStep = form.elements.nextStep.value.trim(),
        resolution = form.elements.resolution.value.trim();
      if (!detail || !nextStep || (form.elements.status.value === 'resolved' && !resolution))
        return;
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true;
      try {
        await save(FOLLOWUPS, [
          ...read(FOLLOWUPS, []),
          {
            id: crypto.randomUUID(),
            studentId: student.id,
            classId: cls?.id || '',
            date: form.elements.date.value,
            category: form.elements.category.value,
            detail,
            nextStep,
            status: form.elements.status.value,
            resolution,
          },
        ]);
        dialog.close();
        tab = 'focus';
        sync();
        options.onChange?.();
        draw();
      } catch {
        form.querySelector('[role=alert]').textContent = '保存失败，请保留内容后重试';
        submit.disabled = false;
      }
    };
    dialog.showModal();
  }
  function feedback() {
    document.getElementById('spFeedbackDialog')?.remove();
    const d = learning();
    if (!d) return;
    const key = 'teacherbuddy.student.feedback.v1',
      draftId = student.id + '|' + (cls?.id || '');
    const initial = [
      student.name + '家长您好：',
      cls?.label || '',
      d.latest,
      d.sections?.['作业记录'] ? '【作业与订正】\n' + d.sections['作业记录'] : '',
      d.sections?.['行动方案'] ? '【下一步建议】\n' + d.sections['行动方案'] : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const dialog = document.createElement('dialog');
    dialog.id = 'spFeedbackDialog';
    dialog.className = 'sp-dialog';
    dialog.innerHTML = `<h2>家长反馈 · ${esc(student.name)}</h2><textarea aria-label="家长反馈正文">${esc(read(key, {})[draftId]?.text || initial)}</textarea><p role="status"></p><footer><button class="button" data-feedback="close">关闭</button><button class="button" data-feedback="save">保存草稿</button><button class="button" data-feedback="copy">复制反馈</button><button class="button primary" data-feedback="record">记录沟通结果</button></footer>`;
    document.body.append(dialog);
    dialog.querySelector('[data-feedback=close]').onclick = () => dialog.close();
    const persist = () =>
      save(key, {
        ...read(key, {}),
        [draftId]: {
          text: dialog.querySelector('textarea').value,
          updatedAt: new Date().toISOString(),
        },
      });
    for (const action of ['save', 'copy', 'record'])
      dialog.querySelector('[data-feedback=' + action + ']').onclick = async () => {
        const status = dialog.querySelector('[role=status]');
        try {
          await persist();
          if (action === 'copy') {
            try {
              await navigator.clipboard.writeText(dialog.querySelector('textarea').value);
              status.textContent = '已复制，可粘贴给家长';
            } catch {
              dialog.querySelector('textarea').select();
              status.textContent = '草稿已保存，请按 Ctrl+C 复制';
            }
          } else if (action === 'record') {
            dialog.close();
            addFollow('家长沟通');
          } else status.textContent = '草稿已保存';
        } catch {
          status.textContent = '保存失败，请先复制内容留存';
        }
      };
    dialog.showModal();
  }
  sync();
  draw();
}
