import { Product } from './core/model.js';
import { StudentDesk } from './features/students/desk.js';
import { ProductCalendar } from './features/schedule/calendar.js';
import { FinanceLedger } from './features/finance/ledger.js';
import { TeacherBuddyLeads } from './features/leads/list.js';
import { MarketingDrafts } from './features/marketing/editor.js';
import './core/workspace.js';
import { createContext } from './core/context.js';
import { createCoursesView } from './features/courses/page.js';
import { createTeachingViews } from './features/teaching/page.js';
import { createSkillsView } from './features/skills/page.js';
import { renderGettingStarted } from './features/onboarding/page.js';
import { enhanceEditor } from './features/marketing/enhance.js';
import './features/reports/lesson-view.js';
import './features/reports/student-view.js';
const page = document.body.dataset.page;
const root = document.getElementById('channel');
async function load() {
  root.innerHTML = '<div class="load-state" role="status">正在读取周期、班级和学生记录…</div>';
  try {
    const model = await Product.load(true),
      context = createContext(model);
    const teaching = createTeachingViews(context);
    const renderers = {
      courses: createCoursesView(context),
      class: teaching.classDetail,
      student: teaching.studentDetail,
      students: () => StudentDesk.render(root, model),
      schedule: () => ProductCalendar.render(root, model),
      payments: () => FinanceLedger.render(root, model),
      leads: () => TeacherBuddyLeads.render(root, model),
      skills: createSkillsView(context),
      'getting-started': () => renderGettingStarted(context),
      marketing: () => {
        MarketingDrafts.render(root, model.receivedDrafts);
        enhanceEditor(root);
      },
    };
    document.getElementById('sourceSnapshot').textContent = '来源快照 · ' + model.snapshot;
    await renderers[page]();
    if (['students', 'student', 'marketing', 'leads', 'skills'].includes(page))
      document.body.classList.add('workpages');
    if (location.hash)
      requestAnimationFrame(() => {
        try {
          document
            .getElementById(decodeURIComponent(location.hash.slice(1)))
            ?.scrollIntoView({ block: 'start' });
        } catch {}
      });
  } catch (error) {
    const context = createContext({});
    root.innerHTML =
      context.heading('记录暂时无法加载', error.message) +
      '<p class="info-body">' +
      context.esc(error.message) +
      '</p><button class="button" id="retryLoad">重新读取</button>';
    document.getElementById('retryLoad').onclick = load;
  }
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-skill]');
  if (!button) return;
  try {
    await navigator.clipboard.writeText(root.querySelector('.skills-prompt-text').value);
    button.nextElementSibling.textContent = '已复制';
  } catch {
    button.nextElementSibling.textContent = '复制失败，请展开指令手动选择复制';
  }
});
document.getElementById('refreshChannel').onclick = load;
load();
