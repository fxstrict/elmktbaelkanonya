/* إعدادات التطبيق — الإصدار الأول */
const APP={version:'1.16.1',name:'المكتبة القانونية'};
/* بيانات التواصل (واتساب / بريد) */
const CONTACT={wa:'201016000360',phone:'01016000360',mail:'hossammohamedlawyer@gmail.com'};
/* أنواع الصيغ: الرمز → الاسم (الرمز يُكتب في ملفات data/) */
const T={n:'إنذار',a:'إعلان',r:'طلب / مستندات',d:'دعوى',c:'عقد',m:'محضر',w:'توكيل',e:'إشكال',t:'تظلم',f:'نموذج',k:'مبادئ وأحكام',g:'دفوع ومذكرات',x:'مراجع وإجراءات',q:'تشريعات وقرارات',v:'موسوعة',b:'كتاب'};
/* قائمة الصيغ تُملأ من ملفات data/ عبر addBranch(اسم الفرع، صفوف) */
const DATA=[];
function addBranch(name,rows){rows.forEach(r=>DATA.push([r[0],r[1],r[2],name]))}
/* الموسوعات متعددة الأجزاء: سجل واحد يفتح بكامل أجزائه. e={f:معرّف مجلد الموسوعة، t:العنوان، p:[[معرّف الجزء، اسمه]...]} */
const PARTS={};
function addEnc(name,list){list.forEach(e=>{PARTS[e.f]=e.p;DATA.push([e.f,e.t+' ('+e.p.length+' جزءاً)','v',name])})}
/* مفتاح Google Drive API (اختياري) لجلب الصيغة مباشرة عند التعبئة. أنشئه من Google Cloud Console ← Credentials ← API key، فعّل Drive API، وقيّده بنطاق موقعك (HTTP referrer). بدونه يختار المستخدم الملف الذي نزّله من الجهاز. */
const DRIVE_KEY='';

/* نظام Pro — مغلق حتى مرحلة الإطلاق L1. pub = المفتاح العام (base64url لنقطة P-256 غير مضغوطة) تصدره أداة الأكواد. لا تضع المفتاح الخاص هنا أبداً. */
const PRO={enabled:true,pub:'BOevJtwBrTY1clJuTBtFXjBSI_R0ivkevY8cFPAigC_HFiBa6DheaNc1FMx7KkPCfwu_SpFYhvAttDpVNoblyjA',price:250,priceNext:500,founders:1000,wa:'201016000360',insta:'',wallet:'01000902058',bank:'5078035059175515',trialDays:14,foundersSold:0,pay:'https://www.paypal.com/ncp/payment/PA4A87T7VZMA4',renewPrice:0,warnDays:14};
/* الرعاة (P6) — لغير المحامين فقط (مادة 71 قانون المحاماة). القائمة فارغة = لا يظهر شيء.
   كل راعٍ: {name:'اسم الشركة',url:'https://…',logo:'🖨️',text:'سطر قصير',end:'2026-12-31',place:'home'|'sec'|'all',nl:true}
   place: home=الرئيسية، sec=صفحات الأقسام (كل الصيغ)، all=الاثنان. nl:true إقرار بأن الراعي ليس محامياً ولا مكتباً. */
const SPONSORS=[];
/* الندوة (P7) — تُملأ عند تحديد الموعد (T1). فارغة = لا بانر. title وdate إلزاميان؛ date بتوقيت جهاز المستخدم (YYYY-MM-DDTHH:MM)؛ end اختياري (الافتراضي +ساعتان)؛ url رابط التسجيل https؛ host مثل «بتأييد نقابة المحامين الفرعية بـ…»؛ price=0 مجانية. بعد end يختفي البانر ويظهر عرض الترقية لحاملي تذكرة الندوة. */
const EVENT={title:'',date:'',end:'',place:'',price:0,url:'',host:''};
/* عنوان موقعك الأساسي لروابط المشاركة (اختياري). فارغ = يُؤخذ تلقائياً من عنوان الصفحة. مثال: 'https://اسمك.github.io/legal-library/' */
const SHARE_SITE='';
/* fetch بمهلة: لا يعلّق التطبيق على شبكة ضعيفة أو منقطعة */
function fetchT(u,o,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||8000);return fetch(u,Object.assign({},o||{},{signal:c.signal})).finally(()=>clearTimeout(t))}
