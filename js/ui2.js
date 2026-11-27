/* واجهة 1.26 (UI2): مجموعة أيقونات SVG موحّدة + شاشة الرئيسية الجديدة + قائمة «المزيد» + قائمة الأدوات المنظّمة.
   تنظيم واجهة فقط: لا خوارزميات ولا تخزين ولا مفاتيح جديدة. كل data-act القائمة تبقى بأسمائها.
   أسماء الأزرار الجديدة فقط: more (قائمة المزيد)، mtab (فتح تبويب من قائمة المزيد).
   يُحمَّل قبل app.js (دوال فقط؛ تُستدعى وقت الرسم) ويملأ كل عنصر [data-i] بأيقونته. */
const UIG={
 home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
 library:'<path d="M2.5 5.5C5 4 8.5 4 12 6c3.5-2 7-2 9.5-.5V19c-2.5-1.5-6-1.5-9.5.5-3.5-2-7-2-9.5-.5z"/><path d="M12 6v13.5"/>',
 grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
 briefcase:'<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 more:'<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
 filter:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
 x:'<path d="m6 6 12 12M18 6 6 18"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/>',
 auto:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
 chat:'<path d="M20.5 12A8.5 8.5 0 0 1 8.7 19.8L3.5 21l1.3-4.4A8.5 8.5 0 1 1 20.5 12z"/>',
 scale:'<path d="M12 4v16M8 20h8M4.5 7.5h15"/><path d="M4.5 7.5 2 14a3 3 0 0 0 5 0zM19.5 7.5 17 14a3 3 0 0 0 5 0z"/>',
 alert:'<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
 megaphone:'<path d="M3.5 10.5v3a1 1 0 0 0 1 1H7l5.5 4v-13L7 9.5H4.5a1 1 0 0 0-1 1z"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.8 6.5a8.5 8.5 0 0 1 0 11"/>',
 doc:'<path d="M14 3H7.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7.5z"/><path d="M14 3v4.5h4.5M9 12.5h6M9 16h4"/>',
 clipboard:'<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5h6v2.5H9zM9 12h6M9 16h4"/>',
 pen:'<path d="m4 20 1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="m14.5 6 3.5 3.5"/>',
 ban:'<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
 msg:'<path d="M4 5.5h16v10H12l-4.5 3.5v-3.5H4z"/>',
 files:'<path d="M8 3.5h7l4 4V17H8z"/><path d="M5 7v13.5h11"/>',
 layout:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M9.5 9.5V20"/>',
 book:'<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
 shield:'<path d="M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6z"/>',
 shieldalert:'<path d="M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6z"/><path d="M12 8.5v4M12 15.5v.1"/>',
 bookmark:'<path d="M6 3.5h12v17l-6-4-6 4z"/>',
 landmark:'<path d="M3.5 9 12 4l8.5 5z"/><path d="M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3.5 20.5h17"/>',
 layers:'<path d="m12 3.5 9 4.5-9 4.5L3 8z"/><path d="m3 12.5 9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
 users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9.5" r="2.5"/><path d="M17 14.6c2.4.2 4 2 4 5"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
 gavel:'<path d="m13.5 5.5 5 5-3 3-5-5z"/><path d="m10.5 8.5-6.5 6.5 3 3 6.5-6.5M3.5 21h9"/>',
 building:'<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-4h4v4"/>',
 receipt:'<path d="M6 3.5h12v17l-2.2-1.5-2 1.5-1.8-1.5-1.8 1.5-2-1.5L6 20.5z"/><path d="M9 8.5h6M9 12h6"/>',
 barcode:'<path d="M4 5v14M7.5 5v14M11 5v14M14 5v10M17 5v14M20 5v14"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 star:'<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z"/>',
 calc:'<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 7.5h7M8.5 12h.1M12 12h.1M15.5 12h.1M8.5 16h.1M12 16h.1M15.5 16h.1"/>',
 calendar:'<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
 pin:'<path d="M12 21s6.5-5.7 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.3 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
 compass:'<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
 scan:'<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16"/>',
 pie:'<path d="M12 3.5v8.5h8.5A8.5 8.5 0 1 1 12 3.5z"/><path d="M15 3.8a8.5 8.5 0 0 1 5.2 5.2H15z"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14-4M4 4v4h4M4 13a8 8 0 0 0 14 4M20 20v-4h-4"/>',
 lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
 mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
 phone:'<path d="M6 3.5h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 5.7 2 2 0 0 1 6 3.5z"/>',
 save:'<path d="M5 4.5h11l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 5 19z"/><path d="M8 4.5v5h7v-5M8 20.5v-6h8v6"/>',
 bell:'<path d="M6 17.5V11a6 6 0 0 1 12 0v6.5l1.5 1.5h-15z"/><path d="M10 21h4"/>',
 offline:'<path d="M3 9.5a14 14 0 0 1 18 0M6 13a9 9 0 0 1 12 0M9.5 16.5a4 4 0 0 1 5 0M12 20h.01"/><path d="m4 4 16 16"/>',
 tag:'<path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.2"/>',
 chev:'<path d="m14.5 6-6 6 6 6"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
 download:'<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 19.5h14"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 trash:'<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
 image:'<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
 camera:'<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
 card:'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M6.5 15h3"/>',
 gift:'<rect x="4" y="9.5" width="16" height="10.5" rx="1.5"/><path d="M3 9.5h18V7H3zM12 7v13"/>',
 user:'<circle cx="12" cy="8.5" r="3.8"/><path d="M4.500 20c0-4 3.400-6.500 7.500-6.500s7.500 2.500 7.500 6.500"/>',
 chart:'<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
 check:'<path d="m5 12.500 4.500 4.500L19 7.500"/>',
 hash:'<path d="M9.500 4 8 20M16 4l-1.500 16M4.500 9h15.500M4 15h15.500"/>',
 play:'<path d="M8 5.500v13l10.500-6.500z"/>',
 send:'<path d="m21 3-9.5 18-2.3-7.7L1.5 11z"/><path d="m21 3-11.8 10.3"/>'
};
const svg=(n,c)=>`<svg class="ico${c?' '+c:''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${UIG[n]||UIG.doc}</svg>`;
/* عناصر ثابتة في index.html: <span data-i="اسم"> تُملأ بالأيقونة */
function uiFill(root){(root||document).querySelectorAll('[data-i]:empty').forEach(e=>{e.innerHTML=svg(e.dataset.i)})}
uiFill();
try{if(JSON.parse(localStorage.getItem('nums'))=='ar')document.documentElement.dataset.nums='ar'}catch(e){}
(function(){
 const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 /* ---------- الرئيسية: ترحيب + أدوات سريعة ---------- */
 const QT=[['calc','calendar','مواعيد'],['mw','pie','مواريث'],['fees','receipt','أتعاب'],['guide','compass','ماذا أفعل؟'],['hub','scan','مستندات'],['poa','pen','توكيلات'],['dir','pin','العناوين'],['tab:bc','barcode','باركودات']];
 window.homeHero=function(){
  const nb=D.filter(x=>'vbqkx'.includes(x[2])).length,nf=D.length-nb;
  const tl=QT.map(([a,i,t])=>{const tb=a.startsWith('tab:');return `<button class="qt2" data-act="${tb?'tab':a}"${tb?` data-tab="${a.slice(4)}"`:''}><span class="qi">${svg(i)}</span><b>${t}</b></button>`}).join('');
  return `<section class="hero"><div class="hk">${svg('scale')}<span>المكتبة القانونية</span></div><h2>ماذا تريد أن تنجز اليوم؟</h2><p>${nf.toLocaleString('en-US')} صيغة ونموذج · ${nb.toLocaleString('en-US')} كتاباً وموسوعة ومرجعاً</p></section>`
  +homeScope()+`<div class="bar2 sec"><b>أدوات سريعة</b><button class="lnk" data-act="tools">كل الأدوات</button></div><div class="qtg">${tl}</div>`};
 window.homeContinue=function(){
  const L=(typeof REC!='undefined'?REC:[]).map(i=>byId[i]).filter(Boolean).slice(0,2);
  return L.length?'<div class="bar2 sec"><b>أكمل من حيث توقفت</b><button class="lnk" data-act="tab" data-tab="rec">الأخيرة</button></div>'+L.map(row).join(''):''};
 /* ---------- المزيد ---------- */
 const mr=(attrs,i,t,s)=>`<button class="mr" ${attrs}><span class="mi">${svg(i)}</span><span class="mt"><b>${t}</b>${s?`<small>${s}</small>`:''}</span><span class="mc">${svg('chev')}</span></button>`;
 window.moreSheet=function(){
  const c=typeof CONTACT!='undefined'?CONTACT:{wa:'',mail:''},v=typeof APP!='undefined'?APP.version:'';
  sheet(`<h2 class="sht">المزيد</h2><div class="shm">باقي أقسام المكتبة والإعدادات</div><div class="ml">`
   +mr('data-act="mtab" data-tab="bc"','barcode','الباركودات','باركودات الجلسات حسب المحافظة')
   +mr('data-act="mtab" data-tab="rec"','clock','الأخيرة','آخر الصيغ التي فتحتها')
   +mr('data-act="nums"','hash','شكل الأرقام',document.documentElement.dataset.nums=='ar'?'الآن: عربية ٠١٢٣ — اضغط للتبديل':'الآن: إنجليزية 0123 — اضغط للتبديل')
   +mr('data-act="bk"','save','نسخة احتياطية','حفظ واستعادة بياناتك')
   +mr('data-act="ntf"','bell','التنبيهات','مواعيد الجلسات والمهل')
   +mr('data-act="lock"','lock','قفل التطبيق','رمز سري على هذا الجهاز')
   +mr('data-act="upd"','refresh','التحقق من تحديث','الإصدار '+esc(v))
   +mr('data-act="contact"','chat','تواصل معنا','واتساب · بريد · اتصال')
   +`</div>`)};
 /* ---------- الأدوات (التبويب الأوسط) ---------- */
 const tl=(a,i,t,cls)=>`<button class="tl${cls?' '+cls:''}" data-act="${a}"><span class="ti2">${svg(i)}</span><b>${t}</b></button>`,tg=(t,h,c)=>`<div class="tgt">${t}</div><div class="tg${c?' '+c:''}">${h}</div>`;
 window.toolsSheet=function(){
  sheet(`<h2 class="sht">الأدوات</h2><div class="shm">كل ما يحتاجه المحامي في مكان واحد</div>${typeof proBtn=='function'?'<div class="acts one" style="margin-bottom:10px">'+proBtn()+'</div>':''}`
   +`<button class="tl big" data-act="hub"><span class="ti2">${svg('scan')}</span><span class="mt"><b>أدوات المستندات</b><small>مسح · PDF · تحرير · نص · مكتبتي</small></span></button>`
   +tg('القضايا والمواعيد',tl('calc','calendar','حاسبة المواعيد')+tl('agenda','clock','الأجندة')+tl('poa','pen','أرشيف التوكيلات'))
   +tg('إدارة القضايا',tl('l5sch','clipboard','جدول الجلسات')+tl('l5dec','gavel','سجل القرارات')+tl('l5time','clock','سجل الوقت')+tl('l5cf','shield','تعارض المصالح')+tl('dgtool','doc','مذكرات وصحف'))
   +tg('الحسابات',tl('fees','receipt','الأتعاب')+tl('int','calc','الفوائد')+tl('mw','pie','المواريث'))
   +tg('مرجع',tl('guide','compass','ماذا أفعل؟')+tl('dir','pin','دليل العناوين')+tl('tab','barcode','الباركودات').replace('data-act="tab"','data-act="mtab" data-tab="bc"'))
   +tg('النظام',tl('bk','save','نسخة احتياطية')+tl('ntf','bell','التنبيهات')+tl('hdready','offline','بلا إنترنت')+tl('lock','lock','قفل')+tl('upd','refresh','تحديث')))};

 /* ---------- شرائح النطاق في الرئيسية ---------- */
 const SC=[['forms','files','الصيغ والنماذج'],['books','library','الكتب والموسوعات'],['rulings','gavel','مبادئ وأحكام'],['laws','landmark','تشريعات وقرارات']];
 window.homeScope=function(){return '<div class="scope" role="group" aria-label="ابدأ من">'+SC.map(([v,i,t])=>`<button class="sc" data-act="scope" data-v="${v}">${svg(i,'sm')}<span>${t}</span></button>`).join('')+'</div>'};
 /* ---------- قائمة القضايا ---------- */
 const bcls=st=>st==CST[0]?'ok':/حجز|محجوز/.test(st)?'gold':/منتهي|حكم/.test(st)?'end':'mu';
 window.casesList=function(){
  const all=[...CLS];
  return all.map(c=>{const n=!c.fav&&c.sessions&&typeof nextSess=='function'?nextSess(c):null;let chip='';
   if(n){const d=daysLeft(parseD(n.date));chip=`<span class="bdg sess${d<=3?' hot':''}">${svg('calendar','sm')}${d<0?'فائتة':d==0?'جلسة اليوم':d==1?'جلسة غداً':'جلسة بعد '+d+' يوم'}</span>`}
   const st=!c.fav&&c.status&&c.status!=CST[0]?`<span class="bdg ${bcls(c.status)}">${esc2(c.status)}</span>`:'';
   const sub=c.fav?'':(typeof caseSub=='function'?caseSub(c).replace(/ · 🗓 [^·]*/,''):'');
   return `<div class="cs${c.fav?' fv':''}" data-act="lopen" data-id="${c.id}"><span class="csi">${svg(c.fav?'star':'briefcase')}</span><div class="csx"><b>${esc2(c.name)}</b><small>${c.items.filter(i=>byId[i]).length} صيغة${sub}</small>${st||chip?`<div class="csb">${st}${chip}</div>`:''}</div><span class="mc">${svg('chev')}</span></div>`}).join('')};


 /* ---------- شارة المرحلة على بطاقة النتيجة ---------- */
 const STG={'رفع الدعوى وإعلانها':['رفع الدعوى','s1'],'أثناء نظر الدعوى والطعون':['أثناء النظر والطعون','s2'],'قبل الدعوى (إنذار / توكيل / عقد)':['قبل الدعوى','s3'],'التنفيذ وما بعد الحكم':['التنفيذ','s4'],'مستندات وإجراءات إدارية':['إدارية','s5']};
 window.stageChip=function(d){const x=STG[d.s];return x?`<div class="rbd"><span class="stg ${x[1]}">${x[0]}</span></div>`:''};
 /* ---------- «جلد الأيقونات»: يحوّل الإيموجي في بداية النص (أزرار، عناوين، لافتات، رسائل) إلى أيقونات SVG موحّدة دون لمس 800 نص في الملفات.
    الجدول EM هو المرجع؛ ما ليس فيه يبقى كما هو. لإيقافه احذف هذه الكتلة (لا يعتمد عليها أي منطق). ---------- */
 const EM={'⚖':'scale','⚠':'alert','📄':'doc','📋':'clipboard','🧾':'receipt','📜':'doc','📑':'files','⬇':'download','📥':'download','➕':'plus','🗑':'trash','🧹':'trash','🔒':'lock','🔐':'lock','🔓':'lock','🔑':'key','💾':'save','🗄':'save','🗂':'folder','📂':'folder','📁':'folder','🗓':'calendar','📅':'calendar','⏰':'clock','📤':'send','📚':'library','📖':'book','📘':'book','📕':'book','🖼':'image','📸':'camera','📷':'camera','💳':'card','💬':'chat','🖋':'pen','✏':'pen','✒':'pen','✍':'pen','📝':'pen','🔍':'search','🔎':'search','🔗':'link','⭐':'star','🔄':'refresh','🔁':'refresh','↻':'refresh','♻':'refresh','👁':'eye','🎁':'gift','👤':'user','💰':'receipt','⚙':'filter','🏛':'landmark','📊':'chart','🧭':'compass','📍':'pin','📌':'pin','🛡':'shield','🔔':'bell','🏠':'home','💼':'briefcase','🏢':'building','✕':'x','✖':'x','✔':'check','✅':'check','✓':'check','📏':'scan','🪪':'user','🧰':'briefcase','🧩':'layers','🔳':'scan','⛔':'ban','🔀':'refresh','🗜':'files','👷':'user','🛂':'user','📟':'doc','🔤':'doc','⏱':'clock','▶':'play'};
 const ER=new RegExp('^\\s*('+Object.keys(EM).join('|')+')\uFE0F?\\s*'),SKIP=/^(OPTION|TEXTAREA|SCRIPT|STYLE|TITLE|SVG|INPUT)$/;
 function skin(root){if(!root||root.nodeType!=1&&root.nodeType!=11)return;const w=document.createTreeWalker(root,4,null),L=[];let n;while(n=w.nextNode()){if(!n.previousSibling&&n.parentNode&&!SKIP.test(n.parentNode.nodeName)&&ER.test(n.nodeValue))L.push(n)}
  L.forEach(t=>{const m=ER.exec(t.nodeValue);if(!m)return;t.nodeValue=t.nodeValue.slice(m[0].length);const sp=document.createElement('span');sp.className='eic';sp.setAttribute('aria-hidden','true');sp.innerHTML=svg(EM[m[1]],'sm');t.parentNode.insertBefore(sp,t)})}

 /* ---------- تبويبات ملف القضية (1.28.3): قسم واحد يظهر في كل مرة. لا تغيير في البنية: كل ابن مباشر لـ .cp يُوسَم data-ct بحسب عنوانه، ويخفي CSS ما لا يطابق التبويب النشط. ما لا عنوان له يتبع ما قبله (وأي .acts تذهب إلى «المستندات»). اختيار التبويب في الذاكرة فقط (لكل قضية) ولا يُكتب في أي تخزين. ---------- */
 const CT=[['info','القضية'],['docs','المستندات'],['fin','الأتعاب'],['memo','المذكرات']],CTR=[[/بيانات القضية|الجلسات|المواعيد/,'info'],[/مستندات الرفع|التوكيلات|مواريث/,'docs'],[/الأتعاب|الحسابات|سجل الوقت|تعارض/,'fin'],[/المذكرات|الصحف|المسودات/,'memo']],ctSel={};
 const ctTitle=e=>{const b=e.matches('.cph')?e.querySelector('b'):e.querySelector(':scope > .cph b');return b?b.textContent:''};
 function ctBadge(cp,k){try{const c=(typeof CLS!='undefined'&&CLS.find(x=>String(x.id)==String(k)))||null;if(!c)return;const pa=typeof PA!='undefined'&&Array.isArray(PA)?PA.filter(x=>x.case==c.id).length:0;
  const n={info:(c.sessions||[]).filter(x=>!x.done).length,docs:(c.items||[]).length+pa,fin:(c.tl||[]).length,memo:(c.dr||[]).length};
  cp.querySelectorAll(':scope > .cpnav .cpn').forEach(b=>{const v=n[b.dataset.t]|0;let i=b.querySelector('.cpc');if(!v){if(i)i.remove();return}if(!i){i=document.createElement('i');i.className='cpc';i.setAttribute('aria-hidden','true');b.appendChild(i)}const t=v>99?'99+':String(v);if(i.textContent!==t)i.textContent=t})}catch(e){}}
 function ctSync(cp){let cur='info';[...cp.children].forEach(e=>{if(e.classList.contains('cpnav'))return;const t=ctTitle(e),r=t&&CTR.find(x=>x[0].test(t));if(r)cur=r[1];else if(e.matches('.acts'))cur='docs';e.dataset.ct=cur});
  const k=S.cl||'',on=ctSel[k]||'info';ctBadge(cp,k);cp.dataset.ctab=on;cp.querySelectorAll(':scope > .cpnav .cpn').forEach(b=>{const y=b.dataset.t==on;b.classList.toggle('on',y);b.setAttribute('aria-selected',y)})}
 function caseNav(x){if(!x||!x.querySelectorAll)return;(x.matches&&x.matches('.cp')?[x]:[...x.querySelectorAll('.cp')]).forEach(cp=>{
  if(!cp.querySelector(':scope > .cpnav')){if([...cp.children].filter(e=>e.matches('.cph')||e.querySelector(':scope > .cph')).length<4)return;
   const top=document.querySelector('.top');cp.insertAdjacentHTML('afterbegin',`<div class="cpnav" style="top:${top?top.offsetHeight:120}px" role="tablist" aria-label="أقسام القضية">${CT.map(t=>`<button class="cpn" role="tab" data-act="cptab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`)}
  ctSync(cp)})}
 let q=new Set(),raf=0;
 const mo=new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(x=>{if(x.nodeType==1)q.add(x)}));if(!raf)raf=requestAnimationFrame(()=>{raf=0;const a=[...q];q.clear();a.forEach(x=>{if(x.isConnected){skin(x);caseNav(x);const pp=x.parentElement;if(pp&&pp.classList.contains('cp')&&!x.classList.contains('cpnav'))caseNav(pp)}})})});
 const start=()=>{skin(document.body);caseNav(document.body);mo.observe(document.body,{childList:true,subtree:true})};
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start);
 document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a=='nums'){const on=document.documentElement.dataset.nums=='ar';if(on)delete document.documentElement.dataset.nums;else document.documentElement.dataset.nums='ar';try{sv('nums',on?'en':'ar')}catch(x){}moreSheet();return}
  if(a=='cptab'){const cp=el.closest('.cp');if(!cp)return;ctSel[S.cl||'']=el.dataset.t;ctSync(cp);const nv=cp.querySelector(':scope > .cpnav'),top=document.querySelector('.top'),r=cp.getBoundingClientRect(),lim=(top?top.offsetHeight:0)+4;if(r.top<lim)scrollBy({top:r.top-lim,behavior:'auto'});return}
  if(a=='cpjump'){const t=document.getElementById(el.dataset.to);if(t)t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});return}
  if(a=='scope'){const v=el.dataset.v;S.f={t:'',b:'',p:'',s:'',j:''};S.q='';const q=document.querySelector('#q');if(q)q.value='';if(v=='books')go('lib');else{if(v=='rulings')S.f.t='مبادئ وأحكام';else if(v=='laws')S.f.t='تشريعات وقرارات';go('all')}return}
  
  if(a=='more')moreSheet();
  else if(a=='mtab'){closeSheet();go(el.dataset.tab)}});
})();
