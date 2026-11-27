/* التنقل بزر الرجوع (1.16.5): زر/إيماءة الرجوع في الهاتف يرجع خطوة واحدة داخل البرنامج بدل الخروج منه.
   الفكرة: نُبقي دائماً سجلّ المتصفح «مسلّحاً» بمدخل إضافي (trap) فوق مدخل الجذر (root). عند الرجوع يصل المتصفح إلى الجذر فنقرأ حالة الشاشة الحالية
   ونتراجع طبقة واحدة بالترتيب: الكاميرا ← النافذة السفلية (وقائمتها السابقة إن وُجدت) ← مجلد المكتبة الحيّة ← محافظة الباركودات ← قائمة القضية ← التبويب السابق
   ← الرئيسية، ثم نعيد التسليح. على الرئيسية: أول رجوع يُظهر «اضغط مرة أخرى للخروج» والثاني يخرج فعلاً.
   لا يُغيَّر أي كود قائم: نلفّ render/sheet/closeSheet فقط، ونطلق نفس أحداث الأزرار الموجودة (data-act) فيعمل كل منطق الإغلاق الأصلي. لا تخزين ولا مفاتيح جديدة. */
const NAV={tabs:[],last:null,sheets:[],exitAt:0,busy:false};
/* نافذة سفلية سابقة تُسترجع بالرجوع: فقط إن كانت قائمة ثابتة (بلا حقول إدخال ولا لوحات رسم/فيديو) حتى لا تفقد معالجات الأحداث المباشرة */
/* عنوان النافذة: إن بقي كما هو (إعادة رسم لنفس النافذة مثل تغيير خيار في التصفية) فلا نُراكم نسخاً قديمة */
const navKey=h=>((/<h2[^>]*>([^<]*)/.exec(h)||[])[1]||'').trim();
const navPlain=h=>!/<(canvas|video|input|textarea|select)\b|contenteditable/i.test(h||'');
(function(){
 if(typeof history=='undefined'||!history.pushState)return;
 const $q=s=>document.querySelector(s),sheetOpen=()=>{const e=$q('#sh');return !!e&&e.classList.contains('open')};
 /* ---- تتبّع التبويبات ---- */
 NAV.last=S.tab;
 if(typeof render=='function'){const _r=render;window.render=render=function(){const r=_r.apply(this,arguments);try{if(S.tab!==NAV.last){if(!NAV.busy&&NAV.last!=null){NAV.tabs.push(NAV.last);if(NAV.tabs.length>12)NAV.tabs.shift()}NAV.last=S.tab}}catch(e){}return r}}
 /* ---- تتبّع النوافذ السفلية: عند فتح نافذة فوق نافذة نحتفظ بسابقتها إن كانت قابلة للاسترجاع ---- */
 if(typeof sheet=='function'){const _s=sheet;window.sheet=sheet=function(h){try{const e=$q('#sh');if(!NAV.busy&&e&&e.classList.contains('open')){const prev=e.innerHTML.replace(/^<div class="grab"><\/div>/,'');if(prev&&navPlain(prev)&&prev!==h&&navKey(prev)!==navKey(h)){NAV.sheets.push(prev);if(NAV.sheets.length>8)NAV.sheets.shift()}}}catch(x){}return _s.apply(this,arguments)}}
 if(typeof closeSheet=='function'){const _c=closeSheet;window.closeSheet=closeSheet=function(){NAV.sheets=[];return _c.apply(this,arguments)}}
 /* ---- أداة: تشغيل زر موجود بالاسم (يستعمل نفس معالجات الأزرار الأصلية) ---- */
 const act=(a,d)=>{const b=document.createElement('button');b.dataset.act=a;if(d)for(const k in d)b.dataset[k]=d[k];b.style.display='none';document.body.appendChild(b);try{b.click()}finally{b.remove()}};
 /* ---- طبقة واحدة للرجوع؛ ترجع true إن تراجعت خطوة ---- */
 function back(){
  if($q('#lk'))return true;                                   /* شاشة القفل: لا شيء */
  if($q('#scam')){act('scclose');return true}                  /* الكاميرا */
  if($q('#scc')&&SC&&SC.cr){act('sccancel');return true}      /* شاشة قص الورقة: إلغاء هذه الصفحة بالطريقة الأصلية */
  if(sheetOpen()){
   const p=NAV.sheets.pop();
   if(p){NAV.busy=true;try{sheet(p)}finally{NAV.busy=false}}
   else act('close');
   return true}
  if((S.tab=='lib'||S.tab=='codes')&&typeof LV!='undefined'&&LV.stack&&LV.stack.length){act('lvback');return true}
  if(S.tab=='bc'&&typeof BC!='undefined'&&BC.g){act('bcback');return true}
  if(S.tab=='fav'&&S.cl){act('lback');return true}
  if(S.tab!='home'){const t=NAV.tabs.pop();NAV.busy=true;try{go(t&&t!=S.tab?t:'home')}finally{NAV.busy=false}NAV.last=S.tab;return true}
  return false}
 /* ---- تسليح السجل ---- */
 const arm=()=>{try{history.pushState({nav:'trap'},'',location.href)}catch(e){}};
 const st=history.state;
 if(!(st&&st.nav=='trap')){try{history.replaceState({nav:'root'},'',location.href)}catch(e){}arm()}
 addEventListener('popstate',e=>{
  const s=e.state;
  if(s&&s.nav=='trap')return;                                  /* تقدّم/وصول للمدخل العلوي: لا شيء */
  if(!(s&&s.nav=='root')){try{history.replaceState({nav:'trap'},'',location.href)}catch(x){}return}  /* مدخل غريب (مثل #…): ابقَ مسلّحاً */
  if(back()){arm();return}
  const now=Date.now();
  if(now-NAV.exitAt<2500){history.back();return}               /* الرجوع الثاني على الرئيسية: خروج */
  NAV.exitAt=now;toast('اضغط رجوع مرة أخرى للخروج',2200);arm()});
 /* روابط href="#" في التذييل تضيف مدخلاً للسجل وتُربك الرجوع: نمنع تنقّلها فقط (معالجات data-act تعمل كما هي) */
 document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href="#"]');if(a)e.preventDefault()},true);
})();
