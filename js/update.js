/* إشعار الإصدار الجديد: يقارن رقم الإصدار الحالي بملف version.json على الموقع، ويحدّث بضغطة واحدة.
   يعمل عند الفتح، وعند العودة للتطبيق، وكل 30 دقيقة، وبزر «التحقق من تحديث» في أسفل الصفحة. */
const vnum=v=>String(v).split('.').map(Number),vcmp=(a,b)=>{a=vnum(a);b=vnum(b);for(let i=0;i<3;i++){if((a[i]||0)!=(b[i]||0))return(a[i]||0)>(b[i]||0)?1:-1}return 0};
function showUpd(v){if(document.querySelector('#upd'))return;const b=document.createElement('div');b.id='upd';b.className='upd';
 b.innerHTML=`<span>🔔 يتوفر إصدار جديد (${v}) — أنت على ${APP.version}</span><button data-act="updnow">تحديث الآن</button><button class="x" data-act="updx" aria-label="إغلاق">✕</button>`;document.body.appendChild(b)}
async function checkUpdate(manual){try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json();
 if(vcmp(j.version,APP.version)>0)showUpd(j.version);else if(manual)toast('أنت على أحدث إصدار ✔ ('+APP.version+')',2500)}catch(e){if(manual)toast('تعذّر التحقق — تأكد من الاتصال بالإنترنت',2500)}}
async function applyUpdate(){toast('جارٍ التحديث…',6000);try{(await caches.keys()).forEach(k=>caches.delete(k));if(navigator.serviceWorker){const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()))}}catch(e){}
 location.replace(location.pathname+'?u='+Date.now())}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='updnow')applyUpdate();else if(a=='updx'){const b=document.querySelector('#upd');if(b)b.remove()}else if(a=='upd'){e.preventDefault();checkUpdate(true)}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible')checkUpdate()});
setTimeout(checkUpdate,2500);setInterval(checkUpdate,30*60*1000);
