/* دليل العناوين: محاكم، ومأموريات الشهر العقاري والتوثيق، ومكاتب الخبراء حسب المحافظة (بيانات data/15-addresses.js). */
const DIRK=[['','الكل'],['c','⚖️ المحاكم'],['s','📜 الشهر العقاري والتوثيق'],['e','🧑‍⚖️ الخبراء والسجل التجاري']];
const DIRG=['القاهرة','الجيزة','الإسكندرية','القليوبية','الغربية','المنوفية','كفر الشيخ','الشرقية','الدقهلية','دمياط','بورسعيد','السويس','الإسماعيلية','البحيرة','مطروح','شمال سيناء','جنوب سيناء','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','البحر الأحمر','أسوان'];
let DIR={g:'',k:'',q:'',n:30,rows:[]};
const dirKind=x=>x.k=='a'?'c':x.k;
function dirFilter(){const q=nz(DIR.q.trim());return ADDR.filter(x=>(!DIR.g||x.g==DIR.g)&&(!DIR.k||dirKind(x)==DIR.k)&&(!q||q.split(/\s+/).every(w=>nz(x.n+' '+x.a+' '+x.g+' '+x.x).includes(w))))}
const dirIcon=k=>k=='c'?'⚖️':k=='a'?'🏛️':k=='s'?'📜':'🧑‍⚖️';
function dirChips(){const el=document.querySelector('#dkc');if(el)el.innerHTML=DIRK.map(([v,t])=>`<button class="chip ${DIR.k==v?'on':''}" data-act="dk" data-v="${v}">${t}</button>`).join('')}
function dirList(){const el=document.querySelector('#dr');if(!el)return;DIR.rows=dirFilter();const R=DIR.rows,N=Math.min(R.length,DIR.n);
 el.innerHTML=`<div class="shm">${R.length} نتيجة</div>`+R.slice(0,N).map((x,i)=>{const mq=encodeURIComponent(x.n+' '+x.a+' '+x.g+' مصر');
  return `<div class="dc"><b>${dirIcon(x.k)} ${esc2(x.n)}</b><div class="dm">📍 ${esc2(x.a)}${x.a?' — ':''}${x.g}</div>${x.p?`<div class="dm">☎️ ${esc2(x.p)} <small>(بدون كود المحافظة)</small></div>`:''}${x.x?`<div class="dm">ℹ️ ${esc2(x.x)}</div>`:''}<div class="acts"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${mq}">🗺 الخريطة</a><button class="btn" data-act="dcopy" data-i="${i}">📋 نسخ</button></div></div>`}).join('')+(R.length>N?'<button class="btn wide" data-act="dmore">عرض المزيد</button>':'')+(R.length?'':'<div class="em"><div>📍</div>لا توجد نتائج — جرّب كلمات أقل أو محافظة أخرى</div>')}
function dirSheet(){DIR.n=30;
 sheet(`<h2 class="sht">📍 دليل العناوين</h2><div class="wn">مصدر الدليل ملف قديم في مكتبتك على درايف: قد تتغير العناوين والأرقام، فتأكد منها قبل الذهاب. الأرقام بدون كود المحافظة.</div><label class="fld"><span>المحافظة</span><select id="dg"><option value="">كل المحافظات</option>${DIRG.map(g=>`<option value="${g}" ${DIR.g==g?'selected':''}>${g}</option>`).join('')}</select></label><div id="dkc" class="dkc"></div><label class="fld"><span>بحث (اسم مكتب أو مدينة أو شارع)</span><input id="dq" value="${esc2(DIR.q)}" placeholder="مثال: الجيزة أو توثيق أو طنطا"></label><div id="dr"></div><div class="acts" style="margin-top:10px"><a class="btn" target="_blank" rel="noopener" href="${pv(ADDR_SRC.doc)}">📄 الملف الأصلي</a><a class="btn" target="_blank" rel="noopener" href="${pv(ADDR_SRC.interior)}">🛂 دليل خدمات الداخلية (2016)</a></div>`);dirChips();dirList()}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='dir')dirSheet();
 else if(a=='dk'){DIR.k=el.dataset.v;DIR.n=30;dirChips();dirList()}
 else if(a=='dmore'){DIR.n+=40;dirList()}
 else if(a=='dcopy'){const x=DIR.rows[+el.dataset.i];if(x){const t=x.n+'\n'+x.a+' — '+x.g+(x.p?'\nهاتف: '+x.p:'');if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>toast('تم النسخ'),()=>toast('تعذّر النسخ'))}}});
document.addEventListener('change',e=>{if(e.target.id=='dg'){DIR.g=e.target.value;DIR.n=30;dirList()}});
document.addEventListener('input',e=>{if(e.target.id=='dq'){DIR.q=e.target.value;DIR.n=30;dirList()}});
