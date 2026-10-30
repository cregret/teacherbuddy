const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const { buildSync } = require('esbuild');

function catalog() {
  const result = buildSync({
    entryPoints: [path.resolve(__dirname, '../../src/features/skills/catalog.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    loader: { '.md': 'text' },
  });
  const context = { module: { exports: {} } };
  vm.runInNewContext(result.outputFiles[0].text, context);
  return context.module.exports;
}

test('two maintained skills replace aliases without duplicating on reload or deleting unrelated skills', () => {
  const { teachingSkills, mergeTeachingSkills } = catalog();
  assert.equal(teachingSkills.length, 2);
  const unrelated = { name: '写公众号文章', text: '保留自定义内容' };
  const old = [
    unrelated,
    { name: '录音整理课节报告', text: '旧指令' },
    { id: 'teacherbuddy-create-class', name: '旧建班标题' },
  ];
  const merged = mergeTeachingSkills(old);
  assert.equal(merged.length, 3);
  assert.equal(merged[2], unrelated);
  assert.equal(JSON.stringify(mergeTeachingSkills(merged)), JSON.stringify(merged));
});

test('platform copy is self-contained and native downloads retain valid names and parseable JSON examples', () => {
  const { teachingSkills, skillPlatforms, skillPrompt } = catalog();
  for (const skill of teachingSkills) {
    assert(skill.text.startsWith('---'));
    assert(skill.text.includes('name: ' + skill.id));
    for (const [, block] of skill.text.matchAll(/```json\r?\n([\s\S]*?)```/g)) JSON.parse(block);
    const body = skill.text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
    for (const platform of skillPlatforms) assert(skillPrompt(skill, platform).endsWith(body));
  }
  assert.equal(skillPrompt({ name: '用户指令', text: '原样内容' }, 'Gemini'), '原样内容');
});
