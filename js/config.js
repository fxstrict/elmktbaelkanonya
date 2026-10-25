/* إعدادات التطبيق — الإصدار الأول */
const APP={version:'1.2.0',name:'المكتبة القانونية'};
/* بيانات التواصل (واتساب / بريد) */
const CONTACT={wa:'201016000360',phone:'01016000360',mail:'hossammohamedlawyer@gmail.com'};
/* أنواع الصيغ: الرمز → الاسم (الرمز يُكتب في ملفات data/) */
const T={n:'إنذار',a:'إعلان',r:'طلب / مستندات',d:'دعوى',c:'عقد',m:'محضر',w:'توكيل',e:'إشكال',t:'تظلم',f:'نموذج',k:'مبادئ وأحكام',g:'دفوع ومذكرات',x:'مراجع وإجراءات',q:'تشريعات وقرارات'};
/* قائمة الصيغ تُملأ من ملفات data/ عبر addBranch(اسم الفرع، صفوف) */
const DATA=[];
function addBranch(name,rows){rows.forEach(r=>DATA.push([r[0],r[1],r[2],name]))}
/* مفتاح Google Drive API (اختياري) لجلب الصيغة مباشرة عند التعبئة. أنشئه من Google Cloud Console ← Credentials ← API key، فعّل Drive API، وقيّده بنطاق موقعك (HTTP referrer). بدونه يختار المستخدم الملف الذي نزّله من الجهاز. */
const DRIVE_KEY='';
