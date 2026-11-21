/* الرعاة (P6): شريط «إعلان · برعاية …» في الرئيسية وصفحات الأقسام. يعتمد على SPONSORS في config.js.
   لا يظهر إلا لراعٍ غير محامٍ (nl:true) ورابط https وتاريخ انتهاء لم يمرّ. قائمة فارغة ⇒ لا أثر. */
function spToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function spActive(place){
 if(typeof SPONSORS=='undefined'||!Array.isArray(SPONSORS))return [];const t=spToday();
 return SPONSORS.filter(s=>s&&s.nl===true&&s.name&&/^https:\/\//i.test(s.url||'')&&s.end&&s.end>=t&&(s.place=='all'||s.place==place||(!s.place&&place=='home')))}
function spUrl(u,n){try{const x=new URL(u);x.searchParams.set('utm_source','legal-library');x.searchParams.set('utm_medium','sponsor');return x.href}catch(e){return u}}
function spPick(L){if(!L.length)return null;return L[Math.floor(Date.now()/864e5)%L.length]}
function spHtml(place){
 const s=spPick(spActive(place));if(!s)return '';
 return `<a class="spn" target="_blank" rel="noopener sponsored" href="${esc2(spUrl(s.url))}"><em>إعلان</em><span class="spl">${esc2(s.logo||'🤝')}</span><span class="spt"><b>برعاية ${esc2(s.name)}</b>${s.text?`<small>${esc2(s.text)}</small>`:''}</span></a>`}
(function(){
 if(typeof render!='function')return;const r0=render;
 render=function(){r0.apply(this,arguments);try{
  const m=document.querySelector('#m');if(!m||typeof S=='undefined')return;
  const p=S.tab=='home'?'home':S.tab=='all'?'sec':'';if(!p)return;
  const h=spHtml(p);if(h)m.insertAdjacentHTML('afterbegin',h)}catch(e){}};
 if(spActive('home').length||spActive('sec').length)render()})();
