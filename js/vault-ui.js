/* L4 (1.24.0): واجهة خزنة التشفير (الإعداد والتغيير والإلغاء والقفل التلقائي) + منع تسرّب البيانات الحساسة خارج الخزنة.
   المحرك في vault.js (يُحمَّل أولاً). يُحمَّل هذا الملف أخيراً لأنه يلفّ دوال تعرّفها ملفات أخرى (bkSheet وntfSnapshot) ويعتمد على sheet/toast من app.js.
   لا حقول من نوع password (فلا يتدخل مدير كلمات المرور في المتصفح): الحقول نصية بإخفاء بصري -webkit-text-security كما في قفل الرمز. */
(function(){
const q=s=>document.querySelector(s),pwType=(()=>{try{return CSS.supports('-webkit-text-security','disc')?'text':'password'}catch(e){return'password'}})();
const inp=(id,ph)=>`<input id="${id}" class="vxin" type="${pwType}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" dir="auto" name="${id}${Date.now()%1e6}" placeholder="${ph}" data-lpignore="true" data-1p-ignore="true">`;
const reopen=()=>{const a=q('[data-act="lock"]');if(a)a.click();else if(typeof closeSheet=='function')closeSheet()};
const T=(m,ms)=>{if(typeof toast=='function')toast(m,ms)};
const msg=t=>{const e=q('#vx_sm');if(e)e.textContent=t||''};
const busy=(on,t)=>{document.querySelectorAll('#sh [data-act^="vx"]').forEach(b=>{if(b.tagName=='BUTTON')b.disabled=!!on});if(t!=null)msg(t)};
/* ---------- قسم الخزنة داخل شاشة «قفل التطبيق» (يستدعيه lock.js) ---------- */
window.vxLockHtml=function(){
 if(!window.VAULT)return'';
 if(!VAULT.on)return`<div style="border-top:1px solid var(--bd);margin:16px 0 0;padding-top:14px"><h2 class="sht" style="font-size:16px">🔐 تشفير البيانات (الأقوى)</h2><div class="shm">يشفّر القضايا والمواعيد والحسابات والتوكيلات على جهازك بكلمة مرور (AES-256)، فلا يقرؤها أحد حتى لو نسخ ملفات المتصفح. <b>إن نسيت الكلمة لا يمكن استرجاع البيانات</b>، فاحفظ نسخة احتياطية قبل التفعيل.</div><div class="acts one"><button class="btn" data-act="vxset">🔐 تفعيل تشفير البيانات</button></div></div>`;
 const al=VAULT.autoMin();
 return`<h2 class="sht">🔐 بياناتك مشفّرة</h2><div class="shm">القضايا والمواعيد والحسابات والتوكيلات محفوظة مشفّرة (AES-256 بمفتاح مشتق من كلمة مرورك). تُطلب الكلمة كلما فتحت التطبيق من جديد، وهي تحلّ محل قفل الرمز.</div><div class="acts one"><button class="btn pri" data-act="vxlock">🔒 قفل الآن</button><button class="btn" data-act="vxchg">🔑 تغيير كلمة المرور</button><button class="btn" data-act="vxoff">🔓 إلغاء التشفير</button></div><div class="shm" style="margin-top:12px"><label>⏱ قفل تلقائي بعد غياب التطبيق: <select id="vx_al" style="font:inherit;padding:4px 8px;border-radius:8px;border:1px solid var(--bd);background:var(--sf);color:inherit">${[[0,'بدون'],[5,'5 دقائق'],[15,'15 دقيقة'],[60,'ساعة']].map(o=>`<option value="${o[0]}"${o[0]==al?' selected':''}>${o[1]}</option>`).join('')}</select></label></div><div class="shm" style="margin-top:8px"><b>تنبيه:</b> النسخة الاحتياطية ملف غير مشفّر فاحفظه في مكان آمن. والمستندات الممسوحة المخزنة على الجهاز لا تشملها هذه الخزنة. إن نسيت الكلمة لا يمكن استرجاع البيانات إلا من نسخة احتياطية.</div>`};
/* ---------- نافذة سؤال كلمة المرور (بديل prompt) ---------- */
let PR=null;
function vxPrompt(title,sub,extra){if(PR){PR(null);PR=null}return new Promise(res=>{PR=res;sheet(`<h2 class="sht">${title}</h2><div class="shm">${sub}</div>${inp('vx_pp','كلمة المرور')}${extra||''}<div class="lks lkm" id="vx_sm" role="status"></div><div class="acts one"><button class="btn pri" data-act="vxpok">متابعة</button><button class="btn" data-act="vxpno">إلغاء</button></div>`);setTimeout(()=>{const i=q('#vx_pp');if(i)i.focus()},120)})}
window.vxAsk=async function(){const pw=await vxPrompt('🔐 كلمة مرور الخزنة','اكتب كلمة المرور للمتابعة');if(typeof closeSheet=='function')closeSheet();if(pw==null)return false;const r=await VAULT.verifyPw(pw);if(!r.ok){T(r.err);return false}return true};
const refreshSnap=()=>{try{if(typeof ntfSnapshot=='function')ntfSnapshot()}catch(e){}};
document.addEventListener('change',e=>{if(e.target.id=='vx_al'&&window.VAULT){VAULT.setAuto(e.target.value);T('تم حفظ إعداد القفل التلقائي',1800)}});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el||!window.VAULT)return;const a=el.dataset.act;if(a.indexOf('vx')!==0)return;
 if(a=='vxset'){if(!VAULT.supported()){T('المتصفح أو طريقة الاتصال لا تدعم التشفير (يلزم اتصال آمن https)',4500);return}
  sheet(`<h2 class="sht">🔐 تفعيل تشفير البيانات</h2><div class="shm">اختر كلمة مرور طويلة، كجملة من ثلاث كلمات مثلاً. <b>لا يمكن استرجاعها إن نُسيت</b>، ولا يستطيع أي شخص فتح بياناتك بدونها.</div>${inp('vx_p1','كلمة المرور (8 أحرف فأكثر)')}${inp('vx_p2','أعد كتابة كلمة المرور')}<div class="lks lkm" id="vx_sm" role="status"></div><div class="acts one"><button class="btn pri" data-act="vxon">🔐 تفعيل</button><button class="btn" data-act="vxback">رجوع</button></div>`);setTimeout(()=>{const i=q('#vx_p1');if(i)i.focus()},120)}
 else if(a=='vxback')reopen();
 else if(a=='vxon'){const p1=(q('#vx_p1')||{}).value||'',p2=(q('#vx_p2')||{}).value||'';if(p1!==p2){msg('الكلمتان غير متطابقتين');return}const w=VAULT.weak(p1);if(w){msg(w);return}
  busy(true,'جارٍ التشفير…');const r=await VAULT.enable(p1);busy(false);if(r.ok){refreshSnap();T('🔐 تم تشفير بياناتك',2500);reopen()}else msg(r.err)}
 else if(a=='vxlock'){if(typeof closeSheet=='function')closeSheet();VAULT.lockNow()}
 else if(a=='vxchg'){sheet(`<h2 class="sht">🔑 تغيير كلمة المرور</h2>${inp('vx_o','كلمة المرور الحالية')}${inp('vx_p1','كلمة المرور الجديدة (8 أحرف فأكثر)')}${inp('vx_p2','أعد كتابة الجديدة')}<div class="lks lkm" id="vx_sm" role="status"></div><div class="acts one"><button class="btn pri" data-act="vxchgdo">حفظ</button><button class="btn" data-act="vxback">رجوع</button></div>`)}
 else if(a=='vxchgdo'){const o=(q('#vx_o')||{}).value||'',p1=(q('#vx_p1')||{}).value||'',p2=(q('#vx_p2')||{}).value||'';if(p1!==p2){msg('الكلمتان الجديدتان غير متطابقتين');return}
  busy(true,'جارٍ إعادة التشفير…');const r=await VAULT.change(o,p1);busy(false);if(r.ok){T('🔑 تم تغيير كلمة المرور',2500);reopen()}else msg(r.err)}
 else if(a=='vxoff'){const pw=await vxPrompt('🔓 إلغاء التشفير','ستُحفظ بياناتك بعد الإلغاء دون تشفير على هذا الجهاز. اكتب كلمة المرور للتأكيد.');if(pw==null){reopen();return}
  busy(true,'جارٍ الإلغاء…');const r=await VAULT.disable(pw);busy(false);if(r.ok){refreshSnap();T('تم إلغاء التشفير',2500);reopen()}else msg(r.err)}
 else if(a=='vxpok'){const i=q('#vx_pp'),r=PR;PR=null;if(r)r(i?i.value:'')}
 else if(a=='vxpno'){const r=PR;PR=null;if(r)r(null)}});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target&&e.target.id=='vx_pp'){const b=q('[data-act="vxpok"]');if(b)b.click()}});
/* ---------- منع التسرب خارج الخزنة ---------- */
/* لقطة التنبيهات يقرؤها عامل الخدمة من ذاكرة المتصفح بدون كلمة مرور: مع الخزنة نحذف الأسماء والعناوين ونُبقي نوع الحدث وتاريخه فقط */
if(typeof ntfSnapshot=='function'&&typeof ntfPut=='function'&&typeof ntfItems=='function'){const o=ntfSnapshot,K={s:'جلسة',d:'ميعاد',p:'توكيل'};
 window.ntfSnapshot=function(){if(!(window.VAULT&&VAULT.on))return o.apply(this,arguments);if(!VAULT.unlocked)return Promise.resolve();
  return ntfPut(NT.snap,{on:!!NT.cfg.on,lead:NT.cfg.lead,items:ntfItems().map(x=>({id:x.id,k:x.k,title:K[x.k]||'تنبيه',cn:'',date:x.date,time:x.time})),saved:Date.now()}).catch(()=>{})}}
/* النسخة الاحتياطية تبقى ملفاً صريحاً: نبيّن ذلك للمستخدم */
if(typeof bkSheet=='function'){const b=bkSheet;window.bkSheet=bkSheet=function(){const r=b.apply(this,arguments);try{if(window.VAULT&&VAULT.on){const a=q('#sh');if(a&&!q('#vx_bkn'))a.insertAdjacentHTML('beforeend','<div class="shm" id="vx_bkn" style="margin-top:8px">🔐 تنبيه: بياناتك مشفّرة على الجهاز، لكن ملف النسخة الاحتياطية <b>غير مشفّر</b> ويحوي أسماء الموكلين، فاحفظه في مكان آمن.</div>')}}catch(e){}return r}}
/* تفعيل الخزنة أثناء التشغيل: حدّث لقطة التنبيهات فور بدء الصفحة إن كانت مفتوحة */
if(window.VAULT&&VAULT.on&&VAULT.unlocked)setTimeout(refreshSnap,2500);
})();
