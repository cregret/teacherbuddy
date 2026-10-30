export function enhanceEditor(root) {
  const editor = root.querySelector('#marketingDraftEditor');
  if (!editor) return;
  const count = document.createElement('span');
  count.id = 'workWordCount';
  count.className = 'editor-word-count';
  root.querySelector('.marketing-actions').append(count);
  const update = () => (count.textContent = editor.value.replace(/\s/g, '').length + ' 字');
  update();
  editor.addEventListener('input', update);
  root.querySelector('#marketingDraftList').addEventListener('click', update);
  root.querySelector('#marketingSearch').addEventListener('input', update);
}
