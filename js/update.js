/* التحديث التلقائي: عند فتح التطبيق يقارن رقم إصداره بملف version.json على الموقع، فإن وُجد أحدث يحدّث نفسه تلقائياً ويعيد التحميل
   (بياناتك المحفوظة على الجهاز لا تُمَس). لا يقاطع عملاً جارياً: إن كانت نافذة مفتوحة أو تكتب في حقل يعرض شريط «تحديث الآن» بدل إعادة التحميل.
   يعمل عند الفتح، وعند العودة للتطبيق، وكل 30 دقيقة، وبزر «التحقق من تحديث». */
const vnum=v=>String(v).split('.').map(Number),vcmp=(a,b)=>{a=vnum(a);b=vnum(b);for(let i=0;i<3;i++){if((a[i]||0)!=(b[i]||0))return(a[i]||0)>(b[i]||0)?1:-1}return 0};
const updBusy=()=>{const s=document.querySelector('#sh'),a=document.activeElement;return !!((s&&s.classList&&s.classList.contains('open'))||(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName||'')))};
function showUpd(v){if(document.querySelector('#upd'))return;const b=document.createElement('div');b.id='upd';b.className='upd';
 b.innerHTML=`<span>🔔 يتوفر إصدار جديد (${v}) — أنت على ${APP.version}</span><button data-act="updnow">تحديث الآن</button><button class="x" data-act="updx" aria-label="إغلاق">✕</button>`;document.body.appendChild(b)}
async function checkUpdate(manual){try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();
 if(vcmp(j.version,APP.version)>0){let t=null;try{t=JSON.parse(localStorage.getItem('upd_try'))}catch(e){}
  const recent=t&&t.v===j.version&&Date.now()-t.t<10*60*1000;
  if(!manual&&!recent&&!updBusy())applyUpdate(j.version);else showUpd(j.version)}
 else if(manual)toast('أنت على أحدث إصدار ✔ ('+APP.version+')',2500)}catch(e){if(manual)toast('تعذّر التحقق — تأكد من الاتصال بالإنترنت',2500)}}
async function applyUpdate(v){toast('جارٍ تحديث التطبيق'+(v?' إلى الإصدار '+v:'')+'…',6000);try{localStorage.setItem('upd_try',JSON.stringify({v:v||'?',t:Date.now()}));if(v)localStorage.setItem('upd_to',v)}catch(e){}
 try{(await caches.keys()).forEach(k=>caches.delete(k));if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}}catch(e){}
 location.replace(location.pathname+'?u='+Date.now())}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='updnow')applyUpdate(localStorage.getItem('upd_try')?(JSON.parse(localStorage.getItem('upd_try'))||{}).v:'');else if(a=='updx'){const b=document.querySelector('#upd');if(b)b.remove()}else if(a=='upd'){e.preventDefault();checkUpdate(true)}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible')checkUpdate()});
/* رسالة تأكيد بعد التحديث التلقائي */
try{const to=localStorage.getItem('upd_to');if(to&&vcmp(APP.version,to)>=0){localStorage.removeItem('upd_to');setTimeout(()=>toast('✔ تم تحديث التطبيق إلى الإصدار '+APP.version,3500),700)}}catch(e){}
setTimeout(checkUpdate,800);setInterval(checkUpdate,30*60*1000);
