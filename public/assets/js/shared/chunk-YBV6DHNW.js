import{c as e}from"./chunk-DCJ4ZX5Q.js";var h=`/* Shared reading components. Colors are supplied by each report's :host variables. */
:where(:host) * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.panel {
  background: var(--card);
  border: 1px solid var(--line);
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--deep);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.score-card .label,
.kpi .l {
  font-size: 11.5px;
  color: var(--t2);
}
`;var b=`:host {
  --deep: #0f392b;
  --accent: #3a6b55;
  --light: #f2f7f3;
  --t1: #1f1309;
  --t2: #6b4f3a;
  --t3: #9c8570;
  --ok: #2c6b4f;
  --warn: #7a5620;
  --err: #9b2c1f;
  --card: #ffffff;
  --line: #e4ded2;
  --cream: #fbf8f2;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--cream);
  color: var(--t1);
  line-height: 1.7;
}
.container {
  max-width: 640px;
  margin: 0 auto;
  background: var(--light);
  padding-bottom: 48px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 12px;
}
.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--deep);
}
.brand-sub {
  font-size: 12px;
  color: var(--t3);
}
.hero {
  background: linear-gradient(135deg, var(--deep) 0%, #10b981 100%);
  color: #fff;
  padding: 32px 24px 36px;
  border-radius: 0 0 28px 28px;
  margin-bottom: 20px;
}
.hero .tag {
  display: inline-block;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 3px 12px;
  border-radius: 20px;
  margin-bottom: 14px;
}
.hero h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1px;
}
.hero .sub {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 6px;
}
.hero .quote {
  margin-top: 16px;
  font-size: 14.5px;
  line-height: 1.9;
  background: rgba(255, 255, 255, 0.12);
  border-left: 3px solid #fbbf24;
  padding: 12px 14px;
  border-radius: 0 10px 10px 0;
}

.panel {
  border-radius: 16px;
  margin: 0 16px 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.panel-title .bar {
  width: 4px;
  height: 18px;
  background: var(--accent);
  border-radius: 2px;
  display: inline-block;
}
.panel-title .en {
  font-size: 11px;
  color: var(--t3);
  font-weight: 400;
  margin-left: auto;
  letter-spacing: 1px;
}

.score-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
.score-card {
  background: var(--light);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
}
.score-card .value {
  font-size: 20px;
  font-weight: 800;
  color: var(--deep);
  margin-top: 2px;
  line-height: 1.35;
}
.score-card .sub {
  font-size: 11px;
  color: var(--t3);
  margin-top: 3px;
}

.know {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  align-items: flex-start;
}
.know .num {
  min-width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--light);
  color: var(--deep);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.know .text .desc {
  font-size: 13px;
  color: var(--t2);
  margin-top: 3px;
}
.know .status {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  margin-top: 5px;
}
.know .status.ok {
  background: #dcfce7;
  color: #166534;
}
.know .status.warn {
  background: #fef9c3;
  color: #854d0e;
}

.hl {
  background: var(--light);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.hl .hl-:host {
  background: var(--cream);
  font-size: 13.5px;
  color: var(--t2);
}

.wr {
  border-left: 3px solid var(--warn);
  background: #fffbeb;
  padding: 12px 14px;
  border-radius: 0 10px 10px 0;
  margin-bottom: 12px;
}
.wr .wr-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 4px;
}
.wr .wr-:host {
  background: var(--cream);
  font-size: 13.5px;
  color: #78350f;
  margin-bottom: 4px;
}
.wr .wr-fix {
  font-size: 12.5px;
  color: #166534;
  background: #f0fdf4;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 4px;
}

.chk {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.chk .box {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent);
  border-radius: 5px;
  flex-shrink: 0;
  margin-top: 1px;
}
.know .text,
.chk .txt {
  font-size: 14px;
  color: var(--t1);
}
.chk .txt .sub {
  display: block;
  font-size: 12px;
  color: var(--t3);
  margin-top: 2px;
  font-weight: 400;
}

.trace-item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  background: var(--light);
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 8px;
}
.trace-item.current {
  border-color: var(--accent);
  background: #fff;
}
.trace-term {
  font-size: 10.5px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 4px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.08);
  color: var(--t2);
}
.trace-term.t-\u79CB {
  background: #fef3c7;
  color: #92400e;
}
.trace-term.t-\u6691 {
  background: #fee2e2;
  color: #991b1b;
}
.trace-term.t-\u5BD2 {
  background: #e0f2fe;
  color: #075985;
}
.trace-term.t-\u6625 {
  background: #dcfce7;
  color: #166534;
}
.trace-no {
  font-size: 12px;
  font-weight: 700;
  color: var(--deep);
  background: rgba(0, 0, 0, 0.07);
  padding: 2px 8px;
  border-radius: 5px;
  flex-shrink: 0;
}
.trace-item.current .trace-no {
  background: var(--accent);
  color: #fff;
}
.trace-date {
  font-size: 11.5px;
  color: var(--t3);
  flex-shrink: 0;
}
.trace-topic {
  font-size: 13.5px;
  color: var(--t1);
  flex: 1;
  min-width: 130px;
}
.trace-att,
.trace-quiz {
  font-size: 11.5px;
  color: var(--t2);
  flex-shrink: 0;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 1px 6px;
}
.trace-cur {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 10px;
  padding: 1px 7px;
  flex-shrink: 0;
}

.foot {
  text-align: center;
  padding: 28px 20px;
  color: var(--t3);
  font-size: 12px;
  line-height: 2;
}
.foot .tel {
  font-size: 15px;
  font-weight: 700;
  color: var(--deep);
}
`;var m=":host{display:block;min-width:0;background:#F2F7F3}.container{max-width:760px;width:100%;margin:0 auto}.brand{display:flex}.hero h1{display:block}.panel{overflow-wrap:anywhere}img{max-width:100%}";async function w(i,s){let o=new URL(s,location.href);if(o.origin!==location.origin||!o.pathname.includes("/class/"))throw Error("\u7B80\u62A5\u5730\u5740\u65E0\u6548");let x=await fetch(o,{cache:"no-store"});if(!x.ok)throw Error("\u7B80\u62A5\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6");let t=new DOMParser().parseFromString(await x.text(),"text/html"),n=t.querySelector(".container");if(!n)throw Error("\u7B80\u62A5\u6B63\u6587\u7F3A\u5931");if(n.querySelector(".foot")?.remove(),n.querySelectorAll("script,iframe,object,embed,link,meta,base,form").forEach(a=>a.remove()),n.querySelectorAll("*").forEach(a=>{[...a.attributes].forEach(d=>{/^on/i.test(d.name)&&a.removeAttribute(d.name)}),["src","href"].forEach(d=>{if(!a.hasAttribute(d))return;let l=a.getAttribute(d);if(l.startsWith("#"))return;let r=new URL(l,o);r.origin===location.origin&&/^https?:$/.test(r.protocol)?a.setAttribute(d,r.href):a.removeAttribute(d)})}),!i.isConnected)return;let g=i.shadowRoot||i.attachShadow({mode:"open"}),p=document.createElement("style");p.textContent=[...t.querySelectorAll("style")].map(a=>a.textContent.replace(/:root/g,":host").replace(/\bbody\s*\{/g,":host{")).join(`
`)+`
`+m,g.replaceChildren(p,document.importNode(n,!0)),i.textContent="",i.dataset.loaded="true"}function k(i,s,o,x=!1){let t=o.report,n=r=>"<ul>"+(r||[]).map(c=>"<li>"+e(c)+"</li>").join("")+"</ul>";if(!t)return;i.innerHTML='<article class="received-report"><header class="report-intro"><h2>'+e(t.title)+"</h2><p>"+e(s.label)+" \xB7 \u7B2C "+o.number+" \u8BB2 \xB7 "+e(o.date)+(o.time?" \xB7 "+e(o.time):"")+'</p></header><section><h3>\u5B66\u4E60\u603B\u89C8</h3><p class="report-summary-goal">'+e(t.goal)+"</p><p>"+e(t.summary)+"</p>"+(t.assessment?"<p><strong>\u968F\u5802\u6D4B\u9A8C\uFF1A</strong>"+e(t.assessment)+"</p>":"")+'</section><section class="report-next"><h3>\u4E0B\u8282\u8BFE\u5B89\u6392</h3>'+n(t.next)+"</section><section><h3>\u91CD\u70B9\u5173\u6CE8\u5B66\u751F</h3>"+((t.focus||[]).length?t.focus.map(r=>'<div class="report-focus-item">'+(x?"<strong>"+e(r.name)+"</strong>":'<a href="'+e(Product.studentLink(r.studentId))+'">'+e(r.name)+"</a>")+"<p>"+e(r.text)+"</p></div>").join(""):"<p>\u672C\u8282\u672A\u65B0\u589E\u4E2A\u522B\u8DDF\u8FDB\u4E8B\u9879\uFF0C\u4E0B\u8282\u8BFE\u7EDF\u4E00\u56DE\u770B\u5171\u6027\u95EE\u9898\u3002</p>")+"</section><section><h3>\u5171\u6027\u8584\u5F31\u70B9</h3>"+n(t.weaknesses)+"</section><section><h3>\u73ED\u7EA7\u4EAE\u70B9</h3>"+n(t.highlights)+(t.teachingReflection?'<p class="report-teaching-reflection"><strong>\u6559\u5B66\u53CD\u601D\uFF1A</strong>'+e(t.teachingReflection)+"</p>":"")+"</section><section><h3>\u672C\u8282\u8BFE\u8BB2\u4E86\u4EC0\u4E48</h3>"+n(t.content)+"</section><section><h3>\u5B66\u4E60\u8DB3\u8FF9</h3>"+(t.footprints||[]).map(r=>'<div class="report-footprint"><span>'+e(r.time)+"</span><div>"+e(r.text)+"</div></div>").join("")+"</section></article>";let g=i.querySelector(".received-report"),p=document.createElement("div");p.className="container",p.innerHTML='<div class="brand"><div class="brand-logo"><img src="demo-logo.svg" alt="TeacherBuddy" style="width:100%"></div><div><div class="brand-name">TeacherBuddy</div><div class="brand-sub">\u73ED\u7EA7\u5B66\u4E60\u7B80\u62A5</div></div></div><div class="hero"><div class="tag">'+e(s.label)+" \xB7 "+e(o.label||"\u7B2C "+String(o.number).padStart(2,"0")+" \u8BB2")+"</div><h1>"+e(t.title)+'</h1><div class="sub">'+e(o.date)+" "+e(o.time||"")+'</div><div class="quote">'+e(t.summary||"")+"</div></div>",g.querySelectorAll(":scope > section").forEach(r=>{r.classList.add("panel");let c=r.querySelector("h3");if(c){let f=document.createElement("div");f.className="panel-title",f.innerHTML='<span class="bar"></span>'+e(c.textContent),c.replaceWith(f)}p.append(r)});let a=p.querySelector(".panel");if(a){let r=o.attendance;a.insertAdjacentHTML("afterbegin",'<div class="score-grid"><div class="score-card"><div class="label">\u5230\u8BFE\u60C5\u51B5</div><div class="value" style="font-size:17px">'+(Number.isFinite(r?.present)?r.present+" / "+(r.expected??s.members.length):"\u672A\u8BB0\u5F55")+'</div></div><div class="score-card"><div class="label">\u968F\u5802\u5C0F\u6D4B</div><div class="value" style="font-size:17px">'+(t.assessment?"\u89C1\u4E0B\u65B9\u6D4B\u9A8C\u8BB0\u5F55":"\u672A\u8BB0\u5F55")+'</div></div><div class="score-card"><div class="label">\u8BFE\u65F6\u8FDB\u5EA6</div><div class="value" style="font-size:17px">'+e(o.label||"\u7B2C "+String(o.number).padStart(2,"0")+" \u8BB2")+"</div></div></div>");let c=a.querySelector(".panel-title");c&&a.prepend(c)}let d=i.shadowRoot||i.attachShadow({mode:"open"}),l=document.createElement("style");l.textContent=h+`
`+b+`
`+m+`
.report-focus-item{padding:12px 0;border-bottom:1px solid var(--line)}.report-focus-item p{margin:5px 0}.report-footprint{display:grid;grid-template-columns:110px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.panel ul{padding-left:20px}.panel li{margin:8px 0}.hero h1{font-size:25px}.panel>p{margin:10px 0}`,d.replaceChildren(l,p),i.textContent="",i.dataset.loaded="true"}window.TeacherbuddyReading={mount:w,mountRecord:k};var C=window.TeacherbuddyReading;export{C as a};
