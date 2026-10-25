/* عامل الخدمة — الإصدار 1.1.0. عند تغيير أي ملف زِد رقم الإصدار ليتحدث التطبيق عند المستخدمين */
const C='siyagh-v1.1.0',A=["./", "index.html", "manifest.json", "icons/icon.svg", "css/style.css", "js/config.js", "js/rules.js", "js/engine.js", "js/library.js", "js/app.js", "data/01-ahwal-shakhsia.js", "data/02-jinai.js", "data/03-madani-uqud.js", "data/04-ijarat.js", "data/05-tanfeez-buyu.js", "data/06-tijari-sharikat.js", "data/07-idari.js", "data/08-milkia-hiyaza.js", "data/09-hukumi-daraib.js", "data/10-murafaat-ijraat.js", "data/11-ummali.js", "data/12-tashreeat.js", "data/broken.js"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);
if(u.origin===location.origin){e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))}});
