/* مركز أدوات المستندات (R2 — 1.16.13): شاشة واحدة بخمس مجموعات تجمع الماسح وتجهيز المستندات وأدوات PDF والتحرير وOCR/QR والمكتبة.
   تنظيم واجهة فقط: لا خوارزميات ولا تخزين ولا مفاتيح جديدة، ولا تغيير في أي data-act قائم. أسماء الأزرار الجديدة فقط: hub (فتح المركز)، hubedit، hubhscan.
   المركز نافذة «ثابتة» (أزرار بلا حقول إدخال) فيسترجعها nav.js بزر الرجوع تلقائياً من أي أداة فُتحت منه. */
(function(){
 const q=s=>document.querySelector(s);
 const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const b=(act,txt,cls)=>`<button class="btn${cls?' '+cls:''}" data-act="${act}">${txt}</button>`;
 const g=(t,h)=>`<div class="shm mws">${t}</div><div class="acts">${h}</div>`;
 function hubHtml(){
  const n=(typeof DP!='undefined'&&DP.items)?DP.items.length:0,off=(typeof HD!='undefined')&&HD.off;
  let c=null;try{c=typeof curCase=='function'?curCase():null}catch(e){}
  return `<h2 class="sht">🧰 أدوات المستندات</h2><div class="shm">كل ما تحتاجه لتجهيز المستندات في مكان واحد. المعالجة كلها على جهازك دون رفع لأي خادم.</div>`
  +(c?g('⚖️ القضية المفتوحة: '+esc(c.name||''),b('scancase','📸 مسح مستند لهذه القضية')+(off?'':b('hdcase','🗄 مستندات هذه القضية'))):'')
  +g('📸 مسح واستيراد',b('scan','📸 مسح بالكاميرا أو من المعرض','pri span2')+b('dp','🗂 تجهيز الصور (تصغير، تحويل، PDF)','span2')+b('wsadd','📄 إضافة ملفات (صور أو PDF) إلى مساحة العمل','span2')+(n?b('dpwork','📑 صفحات الجلسة ('+n+')','span2'):''))
  +g('🧩 ملفات PDF',b('pxhome','🧩 فتح ملف PDF: دمج · تقسيم · ضغط · تنظيم · صور · نماذج · حماية','span2'))
  +g('✍️ تحرير',b('hubedit','✍️ تعليق · توقيع · أختام · طمس · علامة مائية · ترقيم','span2'))
  +g('🔤 نص وبيانات',b('ocropen','🔤 التعرف على النص (OCR)')+b('qropen','🔳 قارئ QR'))
  +g('🗄 مستنداتي',(off?'':b('hdlib','🗄 مكتبتي'))+b('hubhscan','📂 فتح ملف مشروع (.hscan)',off?'span2':''))
  +`<div class="shm" style="margin-top:10px">التعليق والتوقيع والأختام تُطبَّق على صفحات الجلسة من زر 🖋 بجانب كل صفحة أو من محرر الصفحة.</div>`}
 function hub(){sheet(hubHtml())}
 window.hubOpen=hub;
 document.addEventListener('click',e=>{
  const el=e.target.closest&&e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a=='hub')hub();
  else if(a=='hubedit'){
   if(typeof DP!='undefined'&&DP.items&&DP.items.length)dpWork();
   else{dpHome();toast('أضف صفحات أولاً (مسح بالكاميرا أو اختيار صور) ثم افتح التحرير',3500)}}
  else if(a=='hubhscan'){
   if(typeof stLoad!='function'){toast('فتح المشاريع غير متاح',2500);return}
   const i=document.createElement('input');i.type='file';i.accept='.hscan,application/zip,application/octet-stream';i.style.display='none';
   i.addEventListener('change',()=>{const f=i.files&&i.files[0];i.remove();if(f)stLoad(f)});
   i.addEventListener('cancel',()=>i.remove());
   document.body.appendChild(i);i.click()}
 });
})();
