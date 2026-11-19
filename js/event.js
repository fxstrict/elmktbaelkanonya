/* الندوة والتذاكر (P7): بانر الندوة في الرئيسية + «أضف للتقويم» (ICS) + عرض ترقية حاضري الندوة لاشتراك المؤسسين.
   يعتمد على EVENT في config.js. EVENT فارغ/غير مكتمل ⇒ لا أثر. */
function evCfg(){
 if(typeof EVENT=='undefined'||!EVENT||!EVENT.title||!EVENT.date)return null;
 const s=new Date(EVENT.date);if(isNaN(s))return null;
 let e=EVENT.end?new Date(EVENT.end):new Date(s.getTime()+2*36e5);if(isNaN(e)||e<=s)e=new Date(s.getTime()+2*36e5);
 return{s,e}}
const evUp=()=>{const c=evCfg();return !!c&&Date.now()<c.e.getTime()};
const evEnded=()=>{const c=evCfg();return !c||Date.now()>=c.e.getTime()};
function evWhen(d){try{return d.toLocaleString('ar-EG',{weekday:'long',day:'numeric',month:'long',hour:'numeric',minute:'2-digit'})}catch(x){return d.toISOString().slice(0,16).replace('T',' ')}}
function evHtml(){
 if(!evUp())return '';const c=evCfg(),E=EVENT,ok=/^https:\/\//i.test(E.url||'');
 const pr=E.price>0?`التذكرة ${E.price} جنيه`:(E.price===0?'حضور مجاني':'');
 const perk=(typeof PRO!='undefined'&&PRO.enabled&&E.price>0)?'<small>التذكرة تشمل 30 يوماً من مزايا Pro</small>':'';
 return `<div class="evn"><em>ندوة</em><b>🎓 ${esc2(E.title)}</b><div class="evm">📅 ${esc2(evWhen(c.s))}${E.place?' · 📍 '+esc2(E.place):''}</div>${E.host?`<small>${esc2(E.host)}</small>`:''}${pr?`<div class="evm"><b>${pr}</b></div>`:''}${perk}<div class="acts">${ok?`<a class="btn pri" target="_blank" rel="noopener" href="${esc2(E.url)}">سجّل الآن</a>`:''}<button class="btn" data-act="evics">📅 أضف للتقويم</button></div></div>`}
/* عرض الترقية: لحامل تذكرة ندوة (plan=event) بعد انتهاء الندوة */
function evUpgrade(s){
 if(typeof PRO=='undefined'||!PRO.enabled||typeof proStatus!='function')return '';s=s||proStatus();
 if(s.state!='pro'||s.plan!='event'||!evEnded()||typeof proSeats!='function')return '';
 const f=proSeats()>0;
 return `<div class="evn up"><b>شكراً لحضورك 🙏</b><div class="evm">${f?`رقِّ لاشتراك المؤسسين السنوي بـ <b>${PRO.price} جنيه</b> (متبقٍ ${proSeats()} مقعد)`:`رقِّ للاشتراك السنوي بـ <b>${PRO.priceNext} جنيه</b>`}</div><div class="acts one"><button class="btn pri" data-act="prosub">⭐ ترقية للاشتراك السنوي</button></div></div>`}
function evIcs(){
 const c=evCfg();if(!c)return '';const z=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
 const t=x=>String(x||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
 const al=m=>`BEGIN:VALARM\r\nTRIGGER:-PT${m}M\r\nACTION:DISPLAY\r\nDESCRIPTION:${t(EVENT.title)}\r\nEND:VALARM`;
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//legal-library//event//AR','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:ev-'+z(c.s)+'@legal-library','DTSTAMP:'+z(new Date()),'DTSTART:'+z(c.s),'DTEND:'+z(c.e),'SUMMARY:'+t(EVENT.title),'LOCATION:'+t(EVENT.place),'DESCRIPTION:'+t((EVENT.host||'')+(EVENT.url?'\n'+EVENT.url:'')),al(1440),al(60),'END:VEVENT','END:VCALENDAR'].join('\r\n')}
function evDownload(){
 const x=evIcs();if(!x){toast('لا توجد ندوة');return}
 try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([x],{type:'text/calendar;charset=utf-8'}));a.download='seminar.ics';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);toast('تم تجهيز الملف — افتحه لإضافته للتقويم',3000)}catch(e){toast('تعذّر إنشاء الملف')}}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act="evics"]');if(el)evDownload()});
function evInject(){
 const m=document.querySelector('#m');if(!m||typeof S=='undefined'||S.tab!='home'||m.querySelector('.evn'))return;
 const h=evHtml()||evUpgrade();if(h)m.insertAdjacentHTML('afterbegin',h)}
(function(){
 if(typeof render!='function')return;const r0=render;
 render=function(){r0.apply(this,arguments);try{evInject()}catch(e){}};
 /* الترخيص يُقرأ بشكل غير متزامن عند الفتح: أدرج عرض الترقية بعد اكتماله دون إعادة رسم الصفحة */
 if(typeof _proReady!='undefined')_proReady.then(()=>{try{evInject()}catch(e){}});
 if(evUp())render()})();
