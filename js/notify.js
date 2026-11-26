/* L1 — التنبيهات: بلا خادم. طبقات: (1) ملف ICS بتنبيهات من تقويم الجهاز (الأوثق بلا إنترنت) (2) تنبيه وشارة عند فتح البرنامج
   (3) تنبيه دوري بالخلفية حيث يدعمه المتصفح (Chrome المثبَّت) عبر عامل الخدمة. تعتمد على js/ntfcore.js (مشتركة مع sw.js). */
const NT={cfg:_l('ntf',{on:false,lead:1,badge:true}),snap:'ntf-snapshot.json',st:'ntf-state.json'};
const ntfSave=()=>_s('ntf',NT.cfg),ntfUrl=n=>new URL(n,document.baseURI).href;
function ntfItems(){const it=[],t=NTFC.iso(new Date());
 CLS.forEach(c=>(c.sessions||[]).forEach(s=>{if(!s.done&&s.date)it.push({id:s.id,k:'s',title:s.note||'جلسة',cn:c.name,date:s.date,time:s.time||''})}));
 DLS.forEach(x=>{if(x.end&&x.end>=t)it.push({id:x.id,k:'d',title:x.title,cn:x.case&&CLS.find(c=>c.id==x.case)?CLS.find(c=>c.id==x.case).name:'',date:x.end,time:''})});
 if(typeof PA!='undefined')PA.forEach(x=>{if(x.alert&&(x.status||'ساري')=='ساري')it.push({id:x.id,k:'p',title:'تنبيه توكيل: '+x.client,cn:'',date:x.alert,time:''})});return it}
async function ntfCache(){try{return await caches.open('ntf-data')}catch(e){return null}}
async function ntfGet(n){const c=await ntfCache();if(!c)return null;const r=await c.match(ntfUrl(n));return r?r.json():null}
async function ntfPut(n,v){const c=await ntfCache();if(c)await c.put(ntfUrl(n),new Response(JSON.stringify(v),{headers:{'content-type':'application/json'}}))}
/* لقطة بيانات يقرؤها عامل الخدمة (لا يصل إلى localStorage) */
async function ntfSnapshot(){try{await ntfPut(NT.snap,{on:!!NT.cfg.on,lead:NT.cfg.lead,items:ntfItems(),saved:Date.now()})}catch(e){}}
function ntfBadge(){try{if(!navigator.setAppBadge)return;const n=NT.cfg.badge?NTFC.badge(ntfItems(),NTFC.iso(new Date())):0;n?navigator.setAppBadge(n):navigator.clearAppBadge()}catch(e){}}
async function ntfShow(m){const o={body:m.body,tag:m.tag,icon:'icons/icon-192.png',badge:'icons/favicon-64.png',dir:'rtl',lang:'ar',data:{url:'./'}};
 try{const r=await navigator.serviceWorker.getRegistration();if(r){await r.showNotification(m.title,o);return true}}catch(e){}
 try{new Notification(m.title,o);return true}catch(e){return false}}
const ntfCan=()=>'Notification' in window&&Notification.permission=='granted';
/* عند الفتح/العودة للتطبيق: تنبيه بما يستحق ولم يُنبَّه عنه اليوم */
async function ntfCheck(force){ntfBadge();await ntfSnapshot();if(!NT.cfg.on||!ntfCan())return 0;
 const today=NTFC.iso(new Date()),items=ntfItems(),st=await ntfGet(NT.st)||{},list=force?NTFC.due(items,today,NT.cfg.lead):NTFC.fresh(NTFC.due(items,today,NT.cfg.lead),st,today);
 if(!list.length)return 0;await ntfShow(NTFC.msg(list,NTFC.overdue(items,today).length));await ntfPut(NT.st,NTFC.mark(st,list,today));return list.length}
async function ntfPeriodic(){try{const r=await navigator.serviceWorker.ready;if(!r.periodicSync)return false;
 if(NT.cfg.on){await r.periodicSync.register('ntf-check',{minInterval:12*36e5});return true}await r.periodicSync.unregister('ntf-check');return false}catch(e){return false}}
function ntfIcs(){const items=ntfItems().filter(x=>x.date>=NTFC.iso(new Date())||x.k=='s');if(!items.length){toast('لا توجد جلسات أو مواعيد لتصديرها');return 0}
 const b=new Blob([NTFC.ics(items,{lead:NT.cfg.lead})],{type:'text/calendar'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='مواعيد-المكتبة-القانونية.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);
 toast('📅 افتح الملف لإضافة '+items.length+' موعد إلى التقويم بتنبيهات. أعد تصديره بعد أي تعديل (لا يتكرر شيء).',6000);return items.length}
function ntfSheet(){const perm='Notification' in window?Notification.permission:'unsupported',stand=matchMedia('(display-mode: standalone)').matches||navigator.standalone,iph=/iPhone|iPad/.test(navigator.userAgent),per='serviceWorker' in navigator&&'periodicSync' in ServiceWorkerRegistration.prototype;
 const st=perm=='granted'?'✅ مسموح':perm=='denied'?'⛔ محظور من إعدادات المتصفح':perm=='unsupported'?'غير مدعوم في هذا المتصفح':'لم يُطلب بعد';
 sheet(`<h2 class="sht">🔔 التنبيهات</h2>
<div class="shm"><b>1) تقويم الجهاز (الأوثق، يعمل بلا إنترنت):</b> يصدّر كل الجلسات والمواعيد والتوكيلات بتنبيه قبلها، فيذكّرك تقويم هاتفك حتى لو لم تفتح البرنامج.</div>
<button class="btn pri wide" data-act="ntfics">📅 تنزيل كل المواعيد إلى التقويم (ICS)</button>
<div class="shm" style="margin-top:14px"><b>2) تنبيهات داخل البرنامج:</b> إذن الإشعارات: ${st}</div>
<label class="fld"><span><input type="checkbox" id="ntf_on" ${NT.cfg.on&&perm=='granted'?'checked':''}> تفعيل التنبيه عند فتح البرنامج${per?' وبالخلفية':''}</span></label>
<label class="fld"><span>التنبيه قبل الموعد بـ</span><select id="ntf_lead">${[[0,'يوم الموعد فقط'],[1,'يوم واحد'],[3,'3 أيام'],[7,'7 أيام']].map(o=>`<option value="${o[0]}" ${NT.cfg.lead==o[0]?'selected':''}>${o[1]}</option>`).join('')}</select></label>
<label class="fld"><span><input type="checkbox" id="ntf_badge" ${NT.cfg.badge?'checked':''}> رقم على أيقونة التطبيق (المثبَّت) بعدد ما يستحق اليوم/غداً</span></label>
<div class="acts"><button class="btn" data-act="ntftest">🔔 تجربة تنبيه</button></div>
<div class="shm" style="margin-top:10px">${per?'التنبيه بالخلفية متاح في متصفحك لكن توقيته يحدده المتصفح (غالباً كل 12 ساعة أو أكثر ولا يعمل للتطبيق غير المثبَّت).':'التنبيه بالخلفية غير متاح في متصفحك؛ يصلك التنبيه عند فتح البرنامج أو عبر التقويم.'}${iph&&!stand?' على iPhone ثبّت البرنامج على الشاشة الرئيسية أولاً.':''}<br>لا يوجد خادم: لا شيء يغادر جهازك. للتنبيه المضمون في الوقت المحدد استعمل التقويم (1).</div>`)}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='ntf')ntfSheet();
 else if(a=='ntfics')ntfIcs();
 else if(a=='ntftest'){if(!('Notification' in window)){toast('المتصفح لا يدعم الإشعارات');return}if(Notification.permission=='default')await Notification.requestPermission();
  if(!ntfCan()){toast('الإشعارات غير مسموحة — فعّلها من إعدادات الموقع');ntfSheet();return}await ntfShow({title:'⚖️ تجربة التنبيه',body:'التنبيهات تعمل على هذا الجهاز ✅',tag:'ntf-test'});toast('أُرسل تنبيه تجريبي')}});
document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.id)return;
 if(t.id=='ntf_on'){if(t.checked){if(!('Notification' in window)){t.checked=false;toast('المتصفح لا يدعم الإشعارات');return}const p=Notification.permission=='default'?await Notification.requestPermission():Notification.permission;
   if(p!='granted'){t.checked=false;NT.cfg.on=false;ntfSave();toast('لم يُسمح بالإشعارات');ntfSheet();return}NT.cfg.on=true}else NT.cfg.on=false;ntfSave();await ntfPeriodic();await ntfSnapshot();toast(NT.cfg.on?'فُعّلت التنبيهات':'أُوقفت التنبيهات')}
 else if(t.id=='ntf_lead'){NT.cfg.lead=+t.value;ntfSave();ntfSnapshot()}
 else if(t.id=='ntf_badge'){NT.cfg.badge=t.checked;ntfSave();ntfBadge()}});
/* تحديث اللقطة والشارة بعد أي تعديل (مؤجَّل) وعند الفتح والعودة */
let ntfT=0;const ntfLater=()=>{clearTimeout(ntfT);ntfT=setTimeout(()=>{ntfBadge();ntfSnapshot()},1500)};
if(typeof render=='function'){const _r=render;window.render=render=function(){const r=_r.apply(this,arguments);ntfLater();return r}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='visible')ntfCheck(false)});
setTimeout(()=>{ntfCheck(false);if(NT.cfg.on)ntfPeriodic()},2500);
window.NT=NT;window.ntfCheck=ntfCheck;window.ntfItems=ntfItems;window.ntfIcs=ntfIcs;
