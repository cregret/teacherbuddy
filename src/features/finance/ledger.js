import { escapeHtml as esc } from '../../core/html.js';
import { AppStorage } from '../../core/storage.js';

const money = (n) =>
  '¥' + (n / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KEY = 'teacherbuddy.finance.v1',
  DATE = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
function totals(account, events) {
  const entries = events.filter((e) => e.accountId === account.id),
    paid = entries.filter((e) => e.type === 'receipt').reduce((n, e) => n + e.amount, 0),
    charges = entries.filter((e) => e.type === 'charge'),
    used = charges.reduce((n, e) => n + e.units, 0),
    spent = charges.reduce((n, e) => n + e.amount, 0);
  return {
    due: account.units * account.rate,
    paid,
    spent,
    used,
    remaining: account.units - used,
    balance: paid - spent,
    unpaid: Math.max(0, account.units * account.rate - paid),
  };
}
function seed(model) {
  return { version: 1, accounts: model.financeAccounts || [], events: model.financeEvents || [] };
}
function load(model) {
  try {
    const saved = JSON.parse(AppStorage.getItem(KEY));
    if (saved?.version === 1 && Array.isArray(saved.accounts) && Array.isArray(saved.events))
      return saved;
  } catch {}
  return seed(model);
}
async function persist(data) {
  try {
    AppStorage.setItem(KEY, JSON.stringify(data));
    await AppStorage.flush();
    return true;
  } catch {
    return false;
  }
}
function render(root, model) {
  document.body.classList.add('finance-page', 'workpages');
  let data = load(model);
  const params = new URLSearchParams(location.search);
  let tab =
      params.get('tab') === 'consumption'
        ? 'charges'
        : params.get('tab') === 'receipts'
          ? 'receipts'
          : 'accounts',
    studentFilter = params.get('student') || '',
    query = params.get('name') || '',
    classFilter = params.get('class') || '',
    status = params.get('view') === 'pending' ? 'unpaid' : '',
    period = params.get('period') || 'all';
  const statusOf = (a) => {
    const t = totals(a, data.events);
    return a.free
      ? 'free'
      : t.balance < a.rate && t.remaining > 0
        ? 'low'
        : t.unpaid
          ? 'unpaid'
          : 'paid';
  };
  function visible() {
    return data.accounts.filter(
      (a) =>
        (!studentFilter || a.studentId === studentFilter) &&
        (period === 'all' || a.periodId === period) &&
        (!classFilter || a.classId === classFilter) &&
        (!query || (a.name + ' ' + a.className).includes(query)) &&
        (!status ||
          (status === 'unpaid' ? totals(a, data.events).unpaid > 0 : statusOf(a) === status)),
    );
  }
  const options = (list, value) =>
    list
      .map(
        ([id, label]) =>
          '<option value="' +
          esc(id) +
          '" ' +
          (id === value ? 'selected' : '') +
          '>' +
          esc(label) +
          '</option>',
      )
      .join('');
  root.innerHTML =
    '<header class="finance-head"><div class="finance-head-actions"><button class="button" id="financeExport">导出当前列表</button><button class="button primary" id="financeReceive">＋ 登记收款</button></div></header><section class="finance-metrics" id="financeMetrics" aria-label="当前筛选范围汇总"></section><nav class="finance-tabs" aria-label="财务台账"><button data-finance-tab="accounts">学生账户</button><button data-finance-tab="receipts">收款流水</button><button data-finance-tab="charges">扣费明细</button></nav><section class="finance-list"><div class="finance-filters"><label class="finance-search">搜索<input id="financeSearch" type="search" placeholder="搜索学生、班级" value="' +
    esc(query) +
    '"></label><label>分组<select id="financePeriod">' +
    options([['all', '全部分组'], ...model.periods.map((p) => [p.id, p.name])], period) +
    '</select></label><label>班级<select id="financeClass">' +
    options(
      [
        ['', '全部班级'],
        ...model.classes
          .filter((c) => data.accounts.some((a) => a.classId === c.id))
          .map((c) => [c.id, c.label]),
      ],
      classFilter,
    ) +
    '</select></label><label>账户状态<select id="financeStatus">' +
    options(
      [
        ['', '全部状态'],
        ['unpaid', '有待收款'],
        ['low', '余额不足一课时'],
        ['paid', '已缴清'],
        ['free', '免费课包'],
      ],
      status,
    ) +
    '</select></label><span id="financeCount" role="status"></span></div><div class="finance-formula" id="financeFormula"></div><div class="table-scroll"><table class="finance-table"><thead id="financeTableHead"></thead><tbody id="financeTableBody"></tbody></table></div><p id="financeEmpty" class="finance-empty" hidden>没有匹配的记录，试试其他筛选条件。</p><footer class="finance-foot">统计随筛选更新 · 金额保留到分 · 免费课包按 ¥0 扣费，课时正常核销</footer></section><p class="finance-feedback" id="financeFeedback" role="status"></p>';
  function draw() {
    const accounts = visible(),
      sum = accounts.reduce(
        (s, a) => {
          const t = totals(a, data.events);
          for (const k of ['due', 'paid', 'spent', 'balance', 'unpaid']) s[k] += t[k];
          return s;
        },
        { due: 0, paid: 0, spent: 0, balance: 0, unpaid: 0 },
      ),
      low = accounts.filter((a) => statusOf(a) === 'low').length;
    root.querySelector('#financeMetrics').innerHTML = [
      ['累计实收', money(sum.paid), '已登记到账'],
      ['累计扣费', money(sum.spent), '已确认课消'],
      ['剩余余额', money(sum.balance), '实收 − 累计扣费'],
      ['待收款', money(sum.unpaid), '课包应收 − 实收'],
      ['续费提醒', low + ' 人次', '余额不足一课时'],
    ]
      .map(
        ([label, value, sub]) =>
          '<article><span>' + label + '</span><strong>' + value + '</strong></article>',
      )
      .join('');
    root.querySelectorAll('[data-finance-tab]').forEach((b) => {
      b.classList.toggle('active', b.dataset.financeTab === tab);
      b.setAttribute('aria-current', b.dataset.financeTab === tab ? 'page' : 'false');
    });
    const th = (labels) =>
        '<tr>' + labels.map((t) => '<th scope="col">' + t + '</th>').join('') + '</tr>',
      student = (a) =>
        '<strong>' + esc(a.name) + '</strong><small>' + esc(a.className) + '</small>',
      td = (v) => '<td>' + v + '</td>',
      action = (a, type, label) =>
        '<button class="finance-row-action" data-account="' +
        esc(a.id) +
        '" data-action="' +
        type +
        '">' +
        label +
        '</button>';
    let rows = [];
    if (tab === 'accounts') {
      root.querySelector('#financeFormula').textContent =
        '余额 = 累计实收 − 累计扣费　·　每次扣费 = 单价 × 本次课时　·　剩余课时 = 购买课时 − 已扣课时';
      root.querySelector('#financeTableHead').innerHTML = th([
        '学生 / 班级',
        '课包 / 单价',
        '应收金额',
        '累计实收',
        '累计扣费',
        '剩余余额',
        '剩余课时',
        '待收款',
        '操作',
      ]);
      rows = accounts.map((a) => {
        const t = totals(a, data.events);
        return (
          '<tr>' +
          td(student(a)) +
          td(
            a.units +
              ' 课时<small>' +
              money(a.rate) +
              ' / 课时' +
              (a.free ? ' · 免费' : '') +
              '</small>',
          ) +
          [t.due, t.paid, t.spent, t.balance]
            .map(
              (v, i) =>
                '<td class="finance-money ' +
                (i === 3 && statusOf(a) === 'low' ? 'finance-risk' : '') +
                '">' +
                money(v) +
                '</td>',
            )
            .join('') +
          td(
            '<strong>' + t.remaining + ' <small class="inline">/ ' + a.units + '</small></strong>',
          ) +
          '<td class="finance-money ' +
          (t.unpaid ? 'finance-risk' : '') +
          '">' +
          money(t.unpaid) +
          '</td>' +
          td(
            '<div class="finance-row-actions">' +
              (!a.free && t.unpaid ? action(a, 'receipt', '收款') : '') +
              (t.remaining ? action(a, 'charge', '扣费') : '已结课') +
              '</div>',
          ) +
          '</tr>'
        );
      });
    } else {
      const type = tab === 'receipts' ? 'receipt' : 'charge',
        ids = new Set(accounts.map((a) => a.id)),
        events = data.events
          .filter((e) => e.type === type && ids.has(e.accountId))
          .sort((a, b) => b.date.localeCompare(a.date));
      root.querySelector('#financeFormula').textContent =
        type === 'receipt'
          ? '每笔到账单独留痕；登记收款后，学生余额与待收款同步更新。'
          : '每次课消单独确认；免费课时也记录核销，余额不足时不允许继续扣费。';
      root.querySelector('#financeTableHead').innerHTML = th(
        type === 'receipt'
          ? ['到账日期', '学生 / 班级', '收款方式', '实收金额', '收款备注']
          : [
              '扣费日期',
              '学生 / 班级',
              '课节 / 说明',
              '核销课时',
              '课时单价',
              '本次扣费',
              '扣后余额',
            ],
      );
      const balances = new Map();
      for (const a of accounts) {
        let balance = 0;
        data.events
          .filter((e) => e.accountId === a.id)
          .map((e, i) => ({ e, i }))
          .sort((x, y) => x.e.date.localeCompare(y.e.date) || x.i - y.i)
          .forEach(({ e }) => {
            balance += e.type === 'receipt' ? e.amount : -e.amount;
            balances.set(e.id, balance);
          });
      }
      rows = events.map((e) => {
        const a = accounts.find((a) => a.id === e.accountId);
        return (
          '<tr>' +
          td(esc(e.date)) +
          td(student(a)) +
          (type === 'receipt'
            ? td(esc(e.method)) +
              '<td class="finance-money finance-income">' +
              money(e.amount) +
              '</td>' +
              td(esc(e.note))
            : td(esc(e.note)) +
              td(e.units + ' 课时') +
              td(money(a.rate)) +
              '<td class="finance-money">−' +
              money(e.amount) +
              '</td><td class="finance-money">' +
              money(balances.get(e.id)) +
              '</td>') +
          '</tr>'
        );
      });
    }
    root.querySelector('#financeTableBody').innerHTML = rows.join('');
    root.querySelector('#financeEmpty').hidden = !!rows.length;
    root.querySelector('#financeCount').textContent =
      rows.length + ' 条' + (tab === 'accounts' ? '学生课包' : '流水');
  }
  function form(type, id) {
    document.getElementById('financeDialog')?.remove();
    const eligible = data.accounts.filter((a) =>
      type === 'receipt'
        ? !a.free && totals(a, data.events).unpaid > 0
        : totals(a, data.events).remaining > 0,
    );
    if (!eligible.length) {
      root.querySelector('#financeFeedback').textContent = '当前没有可操作的课包';
      return;
    }
    const dialog = document.createElement('dialog');
    dialog.id = 'financeDialog';
    dialog.innerHTML =
      '<form id="financeEntry"><header><div><span class="finance-eyebrow">' +
      (type === 'receipt' ? '资金入账' : '课时核销') +
      '</span><h2>' +
      (type === 'receipt' ? '登记收款' : '确认扣费') +
      '</h2></div><button type="button" class="finance-close" aria-label="关闭">×</button></header><label>学生课包<select name="account">' +
      options(
        eligible.map((a) => [a.id, a.name + ' · ' + a.className]),
        id || eligible[0].id,
      ) +
      '</select></label><div class="finance-account-summary" id="financeAccountSummary"></div><div class="finance-form-grid"><label>' +
      (type === 'receipt' ? '到账日期' : '扣费日期') +
      '<input type="date" name="date" value="' +
      DATE +
      '" required></label><label>' +
      (type === 'receipt'
        ? '实收金额（元）<input type="number" name="amount" min="0.01" step="0.01" required>'
        : '本次课时<input type="number" name="units" min="0.5" step="0.5" value="1" required>') +
      '</label></div>' +
      (type === 'receipt'
        ? '<label>收款方式<select name="method"><option>微信</option><option>支付宝</option><option>银行转账</option><option>现金</option></select></label>'
        : '') +
      '<label>' +
      (type === 'receipt' ? '收款备注' : '课节 / 扣费说明') +
      '<input name="note" placeholder="' +
      (type === 'receipt' ? '例如：课包尾款' : '例如：第 06 讲 · 正常到课') +
      '" required maxlength="100"></label><div class="finance-preview" id="financePreview" aria-live="polite"></div><p class="finance-error" id="financeError" role="alert"></p><footer><button type="button" class="button finance-cancel">取消</button><button type="submit" class="button primary">' +
      (type === 'receipt' ? '确认入账' : '确认扣费') +
      '</button></footer></form>';
    document.body.append(dialog);
    const f = dialog.querySelector('form');
    const account = () => data.accounts.find((a) => a.id === f.elements.account.value);
    function preview(reset = false) {
      const a = account(),
        t = totals(a, data.events);
      if (type === 'receipt' && reset) f.elements.amount.value = (t.unpaid / 100).toFixed(2);
      const amount =
        type === 'receipt'
          ? Math.round(Number(f.elements.amount.value) * 100)
          : Math.round(Number(f.elements.units.value) * a.rate);
      dialog.querySelector('#financeAccountSummary').textContent =
        '当前余额 ' +
        money(t.balance) +
        '　·　剩余 ' +
        t.remaining +
        ' 课时　·　待收 ' +
        money(t.unpaid);
      dialog.querySelector('#financePreview').textContent =
        type === 'receipt'
          ? '本次入账 ' + money(amount) + ' → 余额 ' + money(t.balance + amount)
          : money(a.rate) +
            ' × ' +
            f.elements.units.value +
            ' 课时 = 扣费 ' +
            money(amount) +
            ' → 余额 ' +
            money(t.balance - amount);
    }
    f.elements.account.onchange = () => preview(true);
    f.addEventListener('input', () => preview());
    dialog.querySelector('.finance-close').onclick = () => dialog.close();
    dialog.querySelector('.finance-cancel').onclick = () => dialog.close();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const a = account(),
        t = totals(a, data.events),
        units = type === 'charge' ? Number(f.elements.units.value) : 0,
        amount =
          type === 'receipt'
            ? Math.round(Number(f.elements.amount.value) * 100)
            : Math.round(units * a.rate),
        date = f.elements.date.value,
        note = f.elements.note.value.trim();
      let error = '';
      if (!note || !date) error = '请填写日期和备注。';
      else if (!Number.isFinite(amount) || amount < 0 || (type === 'receipt' && amount <= 0))
        error = '请输入有效金额。';
      else if (type === 'receipt' && amount > t.unpaid)
        error = '收款不能超过当前课包待收金额；续费请使用新课包。';
      else if (
        type === 'charge' &&
        (!Number.isFinite(units) || units <= 0 || (units * 2) % 1 || units > t.remaining)
      )
        error = '本次课时须为 0.5 的倍数，且不能超过剩余课时。';
      else if (type === 'charge' && amount > t.balance) error = '余额不足，请先登记收款。';
      else if (
        type === 'charge' &&
        data.events.some(
          (x) => x.type === 'charge' && x.accountId === a.id && x.date === date && x.note === note,
        )
      )
        error = '同一天已有这条课消记录，请核对后再提交。';
      if (error) {
        dialog.querySelector('#financeError').textContent = error;
        return;
      }
      const next = {
        ...data,
        events: [
          ...data.events,
          {
            id: crypto.randomUUID(),
            accountId: a.id,
            type,
            date,
            units,
            amount,
            note,
            method: type === 'receipt' ? f.elements.method.value : undefined,
          },
        ],
      };
      if (!(await persist(next))) {
        dialog.querySelector('#financeError').textContent = '保存失败，未入账，请检查服务器连接。';
        return;
      }
      data = next;
      dialog.close();
      draw();
      root.querySelector('#financeFeedback').textContent =
        (type === 'receipt' ? '已入账 ' : '已扣费 ') + money(amount) + ' · 记录已保存到服务器';
    };
    preview(true);
    dialog.showModal();
  }
  root.querySelector('#financeReceive').onclick = () => form('receipt');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (b) form(b.dataset.action, b.dataset.account);
  });
  root.querySelectorAll('[data-finance-tab]').forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.financeTab;
        const url = new URL(location.href);
        url.searchParams.set(
          'tab',
          tab === 'charges' ? 'consumption' : tab === 'receipts' ? 'receipts' : 'payments',
        );
        history.replaceState(null, '', url);
        draw();
      }),
  );
  for (const [id, set] of [
    [
      'financeSearch',
      (v) => {
        query = v.trim();
        studentFilter = '';
      },
    ],
    ['financePeriod', (v) => (period = v)],
    ['financeClass', (v) => (classFilter = v)],
    ['financeStatus', (v) => (status = v)],
  ])
    root
      .querySelector('#' + id)
      .addEventListener(id === 'financeSearch' ? 'input' : 'change', (e) => {
        set(e.target.value);
        draw();
      });
  root.querySelector('#financeExport').onclick = () => {
    const csv =
        '\ufeff' +
        [...root.querySelectorAll('.finance-table tr')]
          .map((r) =>
            [...r.cells]
              .slice(0, tab === 'accounts' ? -1 : undefined)
              .map((c) => '"' + c.innerText.replace(/"/g, '""').replace(/^[=+@-]/, "'$&") + '"')
              .join(','),
          )
          .join('\r\n'),
      url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })),
      a = document.createElement('a');
    a.href = url;
    a.download =
      '' + { accounts: '学生账户', receipts: '收款流水', charges: '扣费明细' }[tab] + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  draw();
}
window.FinanceLedger = { render, totals, seed };

export const FinanceLedger = window.FinanceLedger;

export { load as readFinanceLedger, totals as accountTotals };
