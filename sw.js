/* عامل الخدمة — الإصدار 1.25.0 عند تغيير أي ملف زِد رقم الإصدار (node tools/bump.js X.Y.Z) ليتحدث التطبيق عند المستخدمين */
importScripts('js/ntfcore.js');
const C='siyagh-v1.25.0',A=["./", "index.html", "manifest.json", "icons/icon.svg", "icons/icon-192.png", "icons/favicon-64.png", "icons/apple-touch-icon.png", "css/style.css", "js/vault.js", "js/lock.js", "js/config.js", "js/rules.js", "js/engine.js", "js/library.js", "data/01-ahwal-shakhsia.js", "data/02-jinai.js", "data/03-madani-uqud.js", "data/04-ijarat.js", "data/05-tanfeez-buyu.js", "data/06-tijari-sharikat.js", "data/07-idari.js", "data/08-milkia-hiyaza.js", "data/09-hukumi-daraib.js", "data/10-murafaat-ijraat.js", "data/11-ummali.js", "data/12-tashreeat.js", "data/13-mawsuat.js", "data/14-kutub.js", "data/15-addresses.js", "data/16-barcodes.js", "data/broken.js", "js/tools.js", "js/cases.js", "js/backup.js", "js/mawarith.js", "js/mawarith-ui.js", "js/mawarith-x.js", "js/docprep.js", "js/scan.js", "js/enhance.js", "js/fx.js", "js/fxworker.js", "js/autoscan.js", "js/studio.js", "js/hdb.js", "js/pdftools.js", "js/linkmeta.js", "js/ocrprep.js", "js/ocr.js", "js/extract.js", "js/live.js", "js/tafqeet.js", "js/chk.js", "js/poa.js", "js/feecore.js", "js/fees.js", "js/fees2.js", "js/legal.js", "js/directory.js", "js/guide.js", "js/app.js", "js/docx.js", "js/fill.js","js/update.js","js/pro.js","js/pro-ui.js", "js/pro-gate.js", "js/pro-sub.js", "js/sponsors.js", "js/event.js","js/pro-renew.js","js/pro-welcome.js","js/barcodes.js","js/share.js","js/workspace.js","js/xcase.js", "js/hub.js", "js/editbar.js","js/nav.js","js/harden.js","js/ntfcore.js","js/notify.js","js/dlx.js", "js/vault-ui.js","lib/pdf-lib.min.js","lib/pdf.min.js","lib/pdf.worker.min.js","lib/jsQR.js","icons/icon-512.png","icons/icon-maskable-192.png","icons/icon-maskable-512.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.allSettled(A.map(u=>c.add(new Request(u,{cache:'reload'}))))));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!=='hscan-ocr'&&x!=='ntf-data').map(x=>caches.delete(x)))));self.clients.claim()});
/* الاستراتيجية: الملفات المرقّمة (?v=) من الذاكرة فوراً دون شبكة؛ الصفحة الرئيسية من الذاكرة ثم تحديثها بالخلفية؛ version/revoked من الشبكة بمهلة 4 ثوانٍ. أي مهلة أو انقطاع لا يعلّق التطبيق. */
/* ملفات OCR الكبيرة (/lib/ocr/): كاش دائم مستقل لا يُمسح عند رفع الإصدار، فلا تُنزَّل 16 م.ب من جديد كل تحديث */
const OC=u=>/\/lib\/ocr\//.test(u.pathname);
const T=(q,ms)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(q,{cache:'no-cache',signal:c.signal}).finally(()=>clearTimeout(t))};
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const u=new URL(q.url);if(u.origin!==location.origin)return;
if(OC(u)){e.respondWith(caches.open('hscan-ocr').then(c=>c.match(q.url).then(h=>h||fetch(q).then(r=>{if(r.ok)c.put(q.url,r.clone());return r}))));return}
if(/\/(version|revoked)\.json$/.test(u.pathname)){e.respondWith(T(q,4000).catch(()=>new Response('',{status:503})));return}
e.respondWith(caches.match(q,{ignoreSearch:true}).then(hit=>{
 if(hit&&u.searchParams.has('v'))return hit;
 const net=T(q,hit?15000:7000).then(r=>{if(r.ok){const x=r.clone();caches.open(C).then(c=>c.put(q,x))}return r});
 if(hit){e.waitUntil(net.catch(()=>{}));return hit}
 return net.catch(()=>q.mode==='navigate'?caches.match('index.html',{ignoreSearch:true}).then(r=>r||new Response('offline',{status:503})):new Response('',{status:503}))}))});
/* L1: تنبيه دوري بالخلفية (Chrome المثبَّت) + نقر التنبيه. اللقطة والحالة في كاش ntf-data تكتبها الصفحة. */
async function ntfRun(){const c=await caches.open('ntf-data'),u=n=>new URL(n,self.registration.scope).href,g=async n=>{const r=await c.match(u(n));return r?r.json():null};
 const s=await g('ntf-snapshot.json');if(!s||!s.on)return 0;const today=NTFC.iso(new Date());let st=await g('ntf-state.json')||{};
 const list=NTFC.fresh(NTFC.due(s.items,today,s.lead),st,today);if(!list.length)return 0;const m=NTFC.msg(list,NTFC.overdue(s.items,today).length);
 await self.registration.showNotification(m.title,{body:m.body,tag:m.tag,icon:'icons/icon-192.png',badge:'icons/favicon-64.png',dir:'rtl',lang:'ar',data:{url:'./'}});
 await c.put(u('ntf-state.json'),new Response(JSON.stringify(NTFC.mark(st,list,today))));return list.length}
self.addEventListener('periodicsync',e=>{if(e.tag==='ntf-check')e.waitUntil(ntfRun())});
self.addEventListener('message',e=>{if(e.data&&e.data.t==='ntf-run'){e.waitUntil(ntfRun().then(n=>e.source&&e.source.postMessage({t:'ntf-done',n})))}});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>L.length?L[0].focus():self.clients.openWindow('./')))});
