/* نظام التقييد (P4): PRO_FEATURES + proGate(key). لا أثر إطلاقاً ما دام PRO.enabled=false.
   يعترض النقر في مرحلة الالتقاط قبل بقية المعالجات، فلا يلزم تعديل ملفات الأدوات. */
const PRO_FEATURES={
 mw:{t:'حاسبة المواريث',d:'حساب الأنصبة والتركة والوصية وقسمة الأعيان وتصدير المسألة'},
 fees:{t:'الأتعاب والحسابات',d:'اتفاقات الأتعاب والدفعات والمصروفات والتقارير الشهرية'},
 export:{t:'تجهيز المستندات (التصدير)',d:'ضغط الصور وتحويلها إلى PDF أو صور جاهزة للتقديم'},
 fill:{t:'التعبئة الآلية للصيغ',d:'التعبئة وتنزيل Word بلا حدود شهرية',limit:3,per:'شهرياً',lim:'استعملت حدّ التعبئة المجاني (3 مرات هذا الشهر)'},
 cases:{t:'قضايا غير محدودة',d:'عدد غير محدود من القضايا',limit:3,lim:'وصلت إلى حدّ القضايا المجانية (3 قضايا)'},
 poa:{t:'أرشيف توكيلات موسّع',d:'أكثر من 5 توكيلات',limit:5,lim:'وصلت إلى حدّ التوكيلات المجانية (5 توكيلات)'}};
/* مفاتيح النقر المقيَّدة → الميزة */
const PRO_ACTS={mw:'mw',mwopen:'mw',fees:'fees',fovr:'fees',fopen:'fees',dprun:'export',fdl:'fill',frdl:'fill',lnew:'cases',poaadd:'poa',poacase:'poa'};
const proOn=()=>typeof PRO!='undefined'&&PRO.enabled&&typeof proActive=='function';
const proMonth=()=>new Date().toISOString().slice(0,7);
function proFillN(){const o=_l('fillm',null);return o&&o.m==proMonth()?(+o.n||0):0}
/* هل الميزة متاحة الآن؟ (بلا أي أثر جانبي) */
function proAllowed(key,ctx){
 if(!proOn()||proActive())return true;
 const f=PRO_FEATURES[key];if(!f)return true;
 if(key=='fill')return proFillN()<f.limit;
 if(key=='cases')return !!(ctx&&ctx.noLimit)||_l('lists',[]).length<f.limit;
 if(key=='poa')return !!(ctx&&ctx.noLimit)||_l('pa',[]).length<f.limit;
 return false}
/* يعرض نافذة «ميزة Pro» إن كانت مقفلة ويرجع false، وإلا true */
function proGate(key,ctx){
 if(proAllowed(key,ctx))return true;
 const f=PRO_FEATURES[key],s=proStatus();
 const why=f.lim?`<div class="wn">${f.lim}</div>`:'';
 const st=s.state=='expired'?(s.revoked?'تم إبطال الكود السابق.':'انتهى اشتراكك أو تجربتك.'):'';
 sheet(`<h2 class="sht">⭐ ميزة Pro</h2><div class="pst"><b>${f.t}</b><div>${f.d}</div><small>${st} المكتبة والبحث والصيغ وحاسبة المواعيد والأجندة والنسخة الاحتياطية تبقى مجانية دائماً، وبياناتك محفوظة كما هي.</small></div>${why}<div class="acts"><button class="btn pri span2" data-act="prosub">💳 اشترك في Pro</button><button class="btn" data-act="pro">🔑 لديّ كود</button><button class="btn" data-act="pgclose">لاحقاً</button></div>`);
 return false}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-act]');if(!el||!proOn())return;
 const a=el.dataset.act;
 if(a=='pgclose'){closeSheet();e.stopImmediatePropagation();return}
 const k=PRO_ACTS[a];if(!k)return;
 if(k=='poa'&&a=='poacase'){const c=typeof curCase=='function'?curCase():null;if(c&&_l('pa',[]).some(x=>x.case==c.id))return}
 if(!proGate(k)){e.stopImmediatePropagation();e.preventDefault();return}
 if(k=='fill'&&!proActive())_s('fillm',{m:proMonth(),n:proFillN()+1})},true);
