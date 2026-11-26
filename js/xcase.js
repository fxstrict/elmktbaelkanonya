/* الحسام سكان — المرحلة N10 (1.19.0): (1) حفظ مراجعة الاستخراج مع المستند في مكتبتك، (2) اعتماد الجلسات والمواعيد المستخرجة في ملف القضية بعد معاينة وتأكيد.
   إضافة فقط: لا يُعدَّل hdb.js ولا شكل بيانات القضايا. المراجعة تُحفظ في مخزن `assets` الموجود أصلاً داخل hscan-db بمفتاح `xr:<معرّف المستند>` (لا تُحذف مع الحفظ التلقائي للمستند، وتُنظَّف يتيمتها عند التشغيل).
   الكتابة في القضايا تستعمل الشكل القائم نفسه تماماً (قضية.sessions وDLS بمفاتيحهما نفسها) عبر `_s` نفسها، ولا شيء يُكتب إلا بزر «اعتماد» بعد المعاينة. */
const XC={tgt:''};
(function(){
 if(typeof document=='undefined'||typeof EX=='undefined'||!EX.ui||typeof HD=='undefined')return;
 const XS=EX.ui.state,E=s=>esc2(String(s==null?'':s)),q=s=>document.querySelector(s);
 const hash=s=>{let h=5381;s=String(s);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h};
 const KEY=id=>'xr:'+id;let lastH=0;
 /* ---------- حفظ المراجعة واستعادتها ---------- */
 XS.load=async tsig=>{if(!HD.cur||HD.off)return null;const r=await HD.get('assets',KEY(HD.cur));return r&&r.tsig===tsig&&r.res?{res:r.res,tab:r.tab}:null};
 async function saveNow(){
  if(!XS.res||!XS.edited||!HD.cur||HD.off)return false;
  if(XS.sig!==EX.ui.sig())return false; /* النتيجة المعروضة لا تخص الصفحات الحالية (فُتح مستند آخر) */
  const tsig=EX.ui.tsig(),res={items:XS.res.items,tables:XS.res.tables},h=hash(JSON.stringify(res)+'|'+tsig+'|'+HD.cur+'|'+XS.tab);
  if(h===lastH)return false;
  await HD.put('assets',{id:KEY(HD.cur),kind:'xr',tsig,tab:XS.tab,res,saved:Date.now()});lastH=h;return true}
 async function prune(){
  const a=(await HD.all('assets')).filter(x=>x.kind=='xr');if(!a.length||!HD.db)return 0;
  const ids=new Set((await HD.all('docs')).map(d=>d.id)),dead=a.filter(x=>!ids.has(String(x.id).slice(3)));
  if(dead.length){const t=HD.db.transaction('assets','readwrite');dead.forEach(x=>t.objectStore('assets').delete(x.id));await new Promise(r=>{t.oncomplete=t.onerror=t.onabort=()=>r()})}
  return dead.length}
 XC.saveNow=saveNow;XC.prune=prune;
 setInterval(()=>{try{saveNow().catch(()=>{})}catch(e){}},3000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)try{saveNow().catch(()=>{})}catch(e){}});
 setTimeout(()=>{try{prune().catch(()=>{})}catch(e){}},6000);
 /* ---------- اعتماد الجلسات والمواعيد في القضية ---------- */
 const caseLabel=c=>[c.name,c.no&&(c.no+(c.year?'-'+c.year:''))].filter(Boolean).join(' ');
 const fd=iso=>{try{return fmtD(parseD(iso))}catch(e){return iso}};
 const target=()=>{if(XC.tgt&&CLS.some(c=>c.id==XC.tgt))return XC.tgt;const id=HD.caseId||'';if(id&&CLS.some(c=>c.id==id))return id;const c=typeof curCase=='function'&&curCase();return c?c.id:''};
 const plan=cid=>{const c=CLS.find(x=>x.id==cid);return EX.caseEntries(XS.res.items,{today:isoD(new Date()),doc:EX.ui.meta().name,sessions:c&&c.sessions||[],deadlines:c?DLS.filter(x=>x.case==cid):[]})};
 XC.plan=plan;
 function show(){
  if(!XS.res){toast('افتح الاستخراج أولاً',2200);return}
  if(!CLS.length){toast('لا توجد قضايا بعد — أنشئ قضية أولاً ثم ارجع',3800);return}
  const cid=target();XC.tgt=cid;const p=cid?plan(cid):null,n=p?p.sessions.length+p.deadlines.length:0;
  const warn=p&&[...p.sessions,...p.deadlines].some(x=>x.approx);
  sheet(`<div class="shh"><h2 class="sht">📅 اعتماد في ملف القضية</h2><button class="lnk" data-act="exopen">← الاستخراج</button></div>
<div class="shm">تُضاف <b>الجلسات</b> و<b>المواعيد</b> المؤشَّر عليها فقط (نوع التاريخ «جلسة» أو «ميعاد»؛ غيّر النوع في الصف إن أخطأ الاستخراج). راجع المعاينة ثم اعتمد. لا يتغير أي شيء آخر في القضية، ويمكنك حذف أي جلسة أو ميعاد بعدها من ملف القضية.</div>
<label class="fld"><span>القضية</span><select data-xc="case"><option value="">— اختر القضية —</option>${CLS.map(c=>`<option value="${E(c.id)}"${c.id==cid?' selected':''}>${E(caseLabel(c))}</option>`).join('')}</select></label>
${!cid?'<div class="wn">اختر القضية التي تُضاف إليها المواعيد.</div>':`
${p.sessions.length?`<div class="shm mws">🗓 جلسات ستُضاف (${p.sessions.length})</div>${p.sessions.map(s=>`<div class="pr"><span><b>${E(fd(s.date))}</b>${s.time?' · '+E(s.time):''}<br><small>${E(s.note)}${s.done?' · فائتة: تُسجَّل «منجزة» كي لا تزحم الأجندة':''}${s.approx?' · <span class="exw">⚠ محوَّلة من هجري (قد يختلف يوماً أو يومين)</span>':''}</small></span></div>`).join('')}`:''}
${p.deadlines.length?`<div class="shm mws">⏰ مواعيد ستُضاف (${p.deadlines.length})</div>${p.deadlines.map(d=>`<div class="pr"><span><b>${E(fd(d.end))}</b><br><small>${E(d.title)}${d.approx?' · <span class="exw">⚠ محوَّل من هجري (قد يختلف يوماً أو يومين)</span>':''}</small></span></div>`).join('')}`:''}
${p.skipped.length?`<div class="shm mws">⏭ تُركت (${p.skipped.length})</div>${p.skipped.map(s=>`<div class="pr"><span>${E(s.date)} · ${E(s.kind)}<br><small>${E(s.reason)}</small></span></div>`).join('')}`:''}
${!n?`<div class="shm">لا جلسات أو مواعيد جديدة لإضافتها${p.other?'':'. أشِّر على تواريخ من نوع «جلسة» أو «ميعاد» في تبويب التواريخ'}.</div>`:''}
${p.other?`<div class="shm">${p.other} تاريخ مؤشَّر عليه من أنواع أخرى (حكم، إعلان، تحرير…) لم يُضَف لأنه ليس جلسة ولا ميعاداً.</div>`:''}
${warn?'<div class="wn">⚠ بعض التواريخ محوَّلة من الهجري بحساب تقريبي قد يخالف التقويم الرسمي بيوم أو يومين؛ تحقق منها من المستند قبل الاعتماد.</div>':''}
<div class="acts one"><button class="btn pri" data-act="excaseok" ${n?'':'disabled'}>✔ اعتماد وإضافة (${n})</button></div>`}`)}
 function apply(){
  const c=CLS.find(x=>x.id==XC.tgt);if(!c||!XS.res)return;const p=plan(c.id);
  if(!p.sessions.length&&!p.deadlines.length){toast('لا شيء جديد لإضافته',2200);return}
  const st=Date.now().toString(36);
  p.sessions.forEach((s,i)=>(c.sessions=c.sessions||[]).push({id:'s'+st+i,date:s.date,time:s.time,note:s.note,done:s.done}));
  p.deadlines.forEach((d,i)=>DLS.push({id:'d'+st+i,title:d.title,end:d.end,case:c.id}));
  _s('lists',CLS);_s('dls',DLS);try{if(typeof render=='function')render()}catch(e){}
  sheet(`<div class="shh"><h2 class="sht">✔ تمت الإضافة</h2></div><div class="shm">أُضيف إلى «${E(caseLabel(c))}»: <b>${p.sessions.length}</b> جلسة و<b>${p.deadlines.length}</b> ميعاد.</div><div class="acts"><button class="btn pri" data-act="cgo" data-id="${E(c.id)}">⚖️ فتح ملف القضية</button><button class="btn" data-act="exopen">← الاستخراج</button></div>`)}
 document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  try{if(a=='excase')show();else if(a=='excaseok')apply()}catch(x){toast('تعذّرت العملية: '+String(x&&x.message||x).slice(0,80),4000)}});
 document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.xc=='case'){XC.tgt=el.value;if(!XC.tgt)XC.tgt='';show()}});
})();
