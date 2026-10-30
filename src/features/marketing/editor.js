import { escapeHtml as esc } from '../../core/html.js';
import { Product } from '../../core/model.js';
import { AppStorage } from '../../core/storage.js';
import { BuddyUI } from '../../core/shell.js';

let baseDrafts = [];

let drafts = baseDrafts.slice();
const keyFor = (i) =>
  drafts[i]?.revision
    ? 'teacherbuddy_marketing_' + drafts[i].revision + '_' + drafts[i].id
    : drafts[i]?.id
      ? 'teacherbuddy_marketing_' + drafts[i].id
      : 'teacherbuddy_marketing_draft_' + i;
function initialText(item, index) {
  try {
    return AppStorage.getItem(keyFor(index)) || item.title + '\n\n' + item.body;
  } catch {
    return item.title + '\n\n' + item.body;
  }
}
function xmlEsc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function crc32(bytes) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function zipStore(files) {
  const enc = new TextEncoder(),
    locals = [],
    centrals = [];
  let offset = 0;
  for (const [path, content] of files) {
    const name = enc.encode(path),
      data = enc.encode(content),
      crc = crc32(data),
      local = new Uint8Array(30 + name.length + data.length),
      lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x21, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    locals.push(local);
    const central = new Uint8Array(46 + name.length),
      cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((n, a) => n + a.length, 0),
    end = new Uint8Array(22),
    ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);
  const chunks = [...locals, ...centrals, end],
    size = chunks.reduce((n, a) => n + a.length, 0),
    out = new Uint8Array(size);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}
function downloadWord(text) {
  const chunks = text
      .trim()
      .split(/\n\s*\n/)
      .filter(Boolean),
    title = chunks.shift() || '教师内容草稿';
  const paragraph = (value, isTitle = false) =>
    '<w:p><w:pPr><w:spacing w:after="180" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:rPr>' +
    (isTitle ? '<w:b/><w:sz w:val="32"/>' : '<w:sz w:val="24"/>') +
    '</w:rPr>' +
    String(value)
      .split('\n')
      .map(
        (line, i) => (i ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + xmlEsc(line) + '</w:t>',
      )
      .join('') +
    '</w:r></w:p>';
  const body =
    paragraph(title, true) +
    chunks.map((p) => paragraph(p)).join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
  const documentXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    body +
    '</w:body></w:document>';
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const bytes = zipStore([
      ['[Content_Types].xml', contentTypes],
      ['_rels/.rels', rels],
      ['word/document.xml', documentXml],
    ]),
    blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    url = URL.createObjectURL(blob),
    safe = title.replace(/[\\/:*?"<>|]/g, '').slice(0, 60) || '教师内容草稿',
    a = document.createElement('a');
  a.href = url;
  a.download = safe + '.docx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
window.MarketingDrafts = {
  render(root, incoming = []) {
    baseDrafts = window.MarketingArticles || [];
    const ids = new Set(baseDrafts.map((d) => d.id));
    drafts = [
      ...baseDrafts,
      ...incoming.filter((d) => !ids.has(d.id)),
      ...Product.safeStorage('buddy_lesson_materials', []).filter((d) => !ids.has(d.id)),
    ];
    const query = new URLSearchParams(location.search).get('draft'),
      parsed = Number(query);
    let selected = Number.isInteger(parsed) && parsed >= 0 && parsed < drafts.length ? parsed : 0,
      filter = '';
    const material = new URLSearchParams(location.search).get('material');
    if (material) {
      const match = drafts.findIndex((d) => d.id === material);
      if (match >= 0) selected = match;
    }
    root.innerHTML =
      '<div class="marketing-workspace"><aside class="panel marketing-index"><div class="panel-heading"><div><h2>文章草稿</h2><p class="caption">' +
      drafts.length +
      ' 篇</p></div></div><label class="marketing-search"><input id="marketingSearch" type="search" placeholder="搜索标题或类型"></label><div class="marketing-draft-list" id="marketingDraftList"></div></aside><section class="panel marketing-editor"><div class="marketing-editor-head"><div><span id="marketingDraftTag" class="marketing-type"></span><input id="marketingDraftTitle" aria-label="文章标题" placeholder="文章标题">' +
      BuddyUI.tip('编辑时自动保存在服务器；复制或下载不会发布文章。', '草稿保存说明') +
      '</div><span id="marketingSaveState" role="status">已保存</span></div><div class="marketing-provenance" id="marketingProvenance"></div><div class="marketing-view-tabs"><button id="marketingRead" class="active">图文预览</button><button id="marketingEdit">编辑正文</button></div><article id="marketingArticlePreview" class="marketing-article-preview"></article><textarea id="marketingDraftEditor" aria-label="文章正文" hidden></textarea><div class="marketing-actions"><button class="button" id="saveMarketingDraft">保存修改</button><button class="button" id="copyMarketingDraft">复制全文</button><button class="button primary" id="downloadMarketingWord">下载文字版 Word</button><button class="button" id="downloadMarketingArticle">下载图文</button><span id="marketingActionState" role="status"></span></div></section></div>';
    const list = root.querySelector('#marketingDraftList'),
      search = root.querySelector('#marketingSearch'),
      editor = root.querySelector('#marketingDraftEditor'),
      state = root.querySelector('#marketingSaveState'),
      actionState = root.querySelector('#marketingActionState');
    const titleInput = root.querySelector('#marketingDraftTitle');
    const fullText = () => titleInput.value + '\n\n' + editor.value;
    const preview = root.querySelector('#marketingArticlePreview'),
      provenance = root.querySelector('#marketingProvenance');
    const articleHTML = () =>
      '<h1>' +
      esc(titleInput.value) +
      '</h1>' +
      editor.value
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((p) => {
          const m = p.match(/^!\[([^\]]*)\]\((assets\/marketing\/[a-z-]+\.svg)\)$/);
          return m
            ? '<figure><img src="' +
                m[2] +
                '" alt="' +
                esc(m[1]) +
                '"><figcaption>' +
                esc(m[1]) +
                '</figcaption></figure>'
            : '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>';
        })
        .join('') +
      '<footer>内容来源：' +
      esc(drafts[selected]?.sourceLabel || '待核对来源') +
      '。项目示例课节记录；文中演示题为编辑编写，不是课堂实录。</footer>';
    const paintPreview = () => {
      preview.innerHTML = articleHTML();
    };
    const publishText = () =>
      fullText().replace(/!\[([^\]]*)\]\([^)]+\)/g, '【配图：$1】') +
      '\n\n内容来源：' +
      (drafts[selected]?.sourceLabel || '待核对来源') +
      '。项目示例课节记录。';
    const switchView = (read) => {
      preview.hidden = !read;
      editor.hidden = read;
      root.querySelector('#marketingRead').classList.toggle('active', read);
      root.querySelector('#marketingEdit').classList.toggle('active', !read);
      if (read) paintPreview();
    };
    root.querySelector('#marketingRead').onclick = () => switchView(true);
    root.querySelector('#marketingEdit').onclick = () => switchView(false);

    function drawList() {
      const matches = drafts
        .map((d, i) => {
          const text = initialText(d, i);
          return {
            d: {
              ...d,
              title: text.split('\n')[0] || d.title,
              body: text.split('\n').slice(1).join('\n').trim(),
            },
            i,
          };
        })
        .filter(({ d }) => (d.title + ' ' + d.tag + ' ' + d.body).toLowerCase().includes(filter));
      if (!matches.length) selected = -1;
      if (matches.length && !matches.some((x) => x.i === selected)) selected = matches[0].i;
      list.innerHTML = matches.length
        ? matches
            .map(
              ({ d, i }) =>
                '<button type="button" class="marketing-draft-choice ' +
                (i === selected ? 'active' : '') +
                '" aria-pressed="' +
                (i === selected) +
                '" data-draft="' +
                i +
                '"><span>' +
                esc(d.tag) +
                '</span><strong>' +
                esc(d.title) +
                '</strong><small>' +
                esc(d.body.split('\n\n')[0]) +
                '</small></button>',
            )
            .join('')
        : '<p class="result-empty">没有找到相关文章。</p>';
      list.querySelectorAll('[data-draft]').forEach(
        (button) =>
          (button.onclick = () => {
            selected = Number(button.dataset.draft);
            drawList();
            drawEditor();
          }),
      );
    }
    function drawEditor() {
      const item = drafts[selected];
      root.querySelectorAll('.marketing-actions button').forEach((b) => (b.disabled = !item));
      editor.disabled = !item;
      titleInput.disabled = !item;
      if (!item) {
        titleInput.value = '';
        titleInput.placeholder = '没有匹配的文章';
        root.querySelector('#marketingDraftTag').textContent = '';
        editor.value = '';
        preview.innerHTML = '';
        provenance.innerHTML = '';
        state.textContent = '';
        actionState.textContent = '';
        return;
      }
      root.querySelector('#marketingDraftTag').textContent = item.tag;
      const saved = initialText(item, selected).split('\n');
      titleInput.value = saved.shift() || item.title;
      titleInput.placeholder = '文章标题';
      editor.value = saved.join('\n').replace(/^\n+/, '');
      state.textContent = '已保存';
      actionState.textContent = '';
      const url = new URL(location.href);
      url.searchParams.set('draft', String(selected));
      history.replaceState(null, '', url);
      provenance.innerHTML = item.sourceLabel
        ? '<a href="' +
          esc(item.source) +
          '">来源：' +
          esc(item.sourceLabel) +
          ' ↗</a><small>依据项目示例课节改写 · 讲解图为文章绘制 · 非课堂实拍</small>'
        : '<span>课堂素材，来源待核对</span>';
      paintPreview();
    }
    async function save() {
      try {
        if (selected < 0) return false;
        AppStorage.setItem(keyFor(selected), fullText());
        await AppStorage.flush();
        state.textContent = '已保存';
        return true;
      } catch {
        state.textContent = '保存失败';
        return false;
      }
    }
    search.oninput = () => {
      filter = search.value.trim().toLowerCase();
      drawList();
      drawEditor();
    };
    titleInput.oninput = editor.oninput = () => {
      state.textContent = '正在保存…';
      save();
      drawList();
      paintPreview();
    };
    root.querySelector('#saveMarketingDraft').onclick = async () => {
      actionState.textContent = (await save()) ? '修改已保存' : '保存失败，请先复制留存';
    };
    root.querySelector('#copyMarketingDraft').onclick = async () => {
      try {
        await navigator.clipboard.writeText(publishText());
        actionState.textContent = '全文已复制';
      } catch {
        switchView(false);
        editor.select();
        actionState.textContent = '正文已选中，请按 Ctrl+C 复制';
      }
    };
    root.querySelector('#downloadMarketingWord').onclick = () => {
      downloadWord(publishText());
      actionState.textContent = '已下载 Word 文档';
    };
    root.querySelector('#downloadMarketingArticle').onclick = async () => {
      try {
        const host = document.createElement('div');
        host.innerHTML = articleHTML();
        for (const img of host.querySelectorAll('img')) {
          const svg = await fetch(img.getAttribute('src')).then((r) => {
            if (!r.ok) throw Error('图片读取失败');
            return r.text();
          });
          img.src =
            'data:image/svg+xml;base64,' +
            btoa(String.fromCharCode(...new TextEncoder().encode(svg)));
        }
        const html =
          '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
          esc(titleInput.value) +
          '</title><style>body{max-width:760px;margin:40px auto;padding:0 24px;font:18px/2 system-ui;color:#273e50}h1{font-size:30px;line-height:1.5}p{margin:24px 0}figure{margin:32px 0}img{max-width:100%;height:auto}figcaption,footer{font-size:13px;color:#71828d}footer{border-top:1px solid #ddd;padding-top:20px}</style>' +
          host.innerHTML +
          '</html>';
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })),
          a = document.createElement('a');
        a.href = url;
        a.download = titleInput.value.replace(/[\\/:*?"<>|]/g, '').slice(0, 60) + '.html';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        actionState.textContent = '图文已下载，图片包含在文件中';
      } catch (e) {
        actionState.textContent = e.message || '下载失败，请重试';
      }
    };
    drawList();
    drawEditor();
  },
};

export const MarketingDrafts = window.MarketingDrafts;
