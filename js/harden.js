/* L0 (1.21.0): تحصين البيانات والعمل بلا إنترنت — إضافة فقط، لا يغيّر عقداً قائماً.
   1) طلب تخزين دائم من المتصفح كي لا يُخلي بيانات القضايا عند ضيق المساحة.
   2) شاشة «جاهزية بلا إنترنت»: حالة التخزين الدائم وأدوات PDF وOCR والنسخة الاحتياطية، وأزرار لإكمال الناقص.
   3) نسخة كاملة .zip تشمل مكتبة المستندات الممسوحة (IndexedDB: hscan-db) إلى جانب بيانات القضايا، مع استعادتها دمجاً أو استبدالاً.
   4) حارس «نسيت الرمز؟»: لا مسح قبل عرض نسخة احتياطية كاملة أو تأكيد صريح بعدم الحاجة إليها.
   يعتمد على: backup.js (bkLocal/bkParse/bkMerge/bkReplace) وdocx.js (zipWrite/zipRead/crc32) وapp.js (sheet/toast) وocr.js (OC.cached/OC.ensure). */
const HDN={persisted:null,allowForgot:false,Z:null};
(function(){
 const q=s=>document.querySelector(s),E=s=>esc2(String(s==null?'':s));
 const LIBS=['lib/pdf-lib.min.js','lib/pdf.min.js','lib/pdf.worker.min.js','lib/jsQR.js'];
 const ver=()=>(typeof APP!='undefined'&&APP.version)||'';
 const hasData=()=>{try{return !!((typeof CLS!='undefined'&&CLS.length)||(typeof DLS!='undefined'&&DLS.length)||(typeof ACC!='undefined'&&ACC.length)||(typeof PA!='undefined'&&PA.length))}catch(e){return false}};
 /* ---------- 1) التخزين الدائم ---------- */
 async function persisted(){try{return !!(navigator.storage&&navigator.storage.persisted&&await navigator.storage.persisted())}catch(e){return false}}
 async function askPersist(){try{if(!navigator.storage||!navigator.storage.persist)return HDN.persisted=null;if(await navigator.storage.persisted())return HDN.persisted=true;return HDN.persisted=!!(await navigator.storage.persist())}catch(e){return HDN.persisted=null}}
 HDN.askPersist=askPersist;
 /* عند التشغيل: فقط إن وُجدت بيانات للمستخدم تستحق الحماية (فلا يُسأل زائر جديد عن شيء) */
 setTimeout(()=>{if(hasData())askPersist()},1500);
 /* ---------- 2) الجاهزية بلا إنترنت ---------- */
 async function libsState(){let ok=0;try{for(const u of LIBS)if(await caches.match(u,{ignoreSearch:true}))ok++}catch(e){}return{ok,total:LIBS.length}}
 async function ocrState(){try{return !!(typeof OC!='undefined'&&OC.cached&&await OC.cached(OC.lang))}catch(e){return false}}
 async function quota(){try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();return{u:e.usage||0,q:e.quota||0}}}catch(x){}return null}
 const mb=n=>(n/1048576).toFixed(n>=1e8?0:1);
 async function status(){const[p,l,o,qt]=await Promise.all([persisted(),libsState(),ocrState(),quota()]);return{persist:p,libs:l,ocr:o,quota:qt,bk:typeof bkDays=='function'?bkDays():null}}
 HDN.status=status;
 const row=(ok,t,sub,btn)=>`<div class="pr"><span><b>${ok?'✅':'⚠️'} ${t}</b>${sub?`<br><small>${sub}</small>`:''}</span>${btn||''}</div>`;
 async function readySheet(){sheet('<h2 class="sht">📴 جاهزية العمل بلا إنترنت</h2><div class="shm" id="hdr">جارٍ الفحص…</div>');
  const s=await status();if(!q('#hdr'))return;
  const ready=s.persist&&s.libs.ok==s.libs.total;
  q('#sh').innerHTML='<div class="grab"></div>'+`<h2 class="sht">📴 جاهزية العمل بلا إنترنت</h2><div class="shm">${ready?'التطبيق جاهز: أدوات PDF محفوظة وبياناتك محمية من الإخلاء.':'أكمل البنود التالية مرة واحدة وأنت متصل بالإنترنت، ثم يعمل التطبيق بلا إنترنت.'}</div>`+
   row(s.persist,'تخزين دائم للبيانات',s.persist?'المتصفح لن يمسح بياناتك عند ضيق المساحة':'قد يمسح المتصفح بياناتك (خصوصاً على iPhone وعند امتلاء الذاكرة) — اطلب التخزين الدائم',s.persist?'':'<button class="pb" data-act="hdpersist">طلب</button>')+
   row(s.libs.ok==s.libs.total,'أدوات PDF وقارئ QR',s.libs.ok==s.libs.total?'محفوظة على الجهاز':`محفوظ ${s.libs.ok} من ${s.libs.total} — نحو 2.2 م.ب`,s.libs.ok==s.libs.total?'':'<button class="pb" data-act="hdlibs">تنزيل</button>')+
   row(s.ocr,'التعرف على النص العربي (OCR)',s.ocr?'محفوظ على الجهاز':'اختياري — نحو 16 م.ب مرة واحدة',s.ocr?'':'<button class="pb" data-act="hdocr">تنزيل</button>')+
   row(s.bk!=null&&s.bk<=30,'النسخة الاحتياطية',s.bk==null?'لم تُحفظ نسخة بعد':s.bk==0?'آخر نسخة اليوم':'آخر نسخة منذ '+s.bk+' يوماً','<button class="pb" data-act="hdfull">نسخة كاملة</button>')+
   (s.quota?`<div class="shm" style="margin-top:8px">المساحة المستعملة: ${mb(s.quota.u)} م.ب من ${mb(s.quota.q)} م.ب المتاحة للتطبيق.</div>`:'')+
   '<div class="shm" style="margin-top:8px">الصيغ والكتب المخزنة في درايف تحتاج إنترنت دائماً؛ المحفوظ هنا هو أدوات التطبيق وبياناتك.</div>'}
 async function warmLibs(){const c=await caches.open('siyagh-v'+ver());let n=0;for(const u of LIBS){if(await caches.match(u,{ignoreSearch:true})){n++;continue}
   const r=await fetch(u+'?v='+ver(),{cache:'reload'});if(!r.ok)throw new Error('http'+r.status);await c.put(u,r);n++}return n}
 HDN.warmLibs=warmLibs;
 /* ---------- 3) نسخة كاملة تشمل IndexedDB ---------- */
 const DBN='hscan-db';
 const idb=()=>new Promise((res,rej)=>{try{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('docs'))d.createObjectStore('docs',{keyPath:'id'});if(!d.objectStoreNames.contains('blobs'))d.createObjectStore('blobs');if(!d.objectStoreNames.contains('assets'))d.createObjectStore('assets',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('blocked'))}catch(e){rej(e)}});
 const rq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const tdone=t=>new Promise((res,rej)=>{t.oncomplete=()=>res();t.onerror=t.onabort=()=>rej(t.error||new Error('abort'))});
 async function ser(v,files){
  if(v instanceof Blob){files.push(new Uint8Array(await v.arrayBuffer()));return{$b:files.length-1,t:v.type}}
  if(v instanceof ArrayBuffer){files.push(new Uint8Array(v.slice(0)));return{$a:files.length-1}}
  if(ArrayBuffer.isView(v)){files.push(new Uint8Array(v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength)));return{$v:files.length-1,c:v.constructor.name}}
  if(v instanceof Date)return{$d:v.toISOString()};
  if(Array.isArray(v)){const o=[];for(const x of v)o.push(await ser(x,files));return o}
  if(v&&typeof v=='object'){const o={};for(const k of Object.keys(v))o[k]=await ser(v[k],files);return o}
  return v}
 function de(v,F){
  if(Array.isArray(v))return v.map(x=>de(x,F));
  if(v&&typeof v=='object'){
   if('$b' in v)return new Blob([F[v.$b]],{type:v.t||''});
   if('$a' in v)return F[v.$a].slice().buffer;
   if('$v' in v){const C=({Uint8Array,Int8Array,Uint16Array,Int16Array,Uint32Array,Int32Array,Float32Array,Float64Array,Uint8ClampedArray})[v.c]||Uint8Array,b=F[v.$v].slice().buffer;return new C(b)}
   if('$d' in v)return new Date(v.$d);
   const o={};for(const k of Object.keys(v))o[k]=de(v[k],F);return o}
  return v}
 const ent=(name,u8)=>({name,method:0,time:0,date:0x21,crc:crc32(u8),cs:u8.length,us:u8.length,raw:u8});
 async function buildFull(){
  const files=[],man={v:1,docs:[],assets:[],blobs:[]};let db=null;
  try{db=await idb()}catch(e){db=null}
  if(db){
   man.docs=await ser(await rq(db.transaction('docs').objectStore('docs').getAll()),files);
   man.assets=await ser(await rq(db.transaction('assets').objectStore('assets').getAll()),files);
   await new Promise((res,rej)=>{const c=db.transaction('blobs').objectStore('blobs').openCursor();const pend=[];
    c.onsuccess=()=>{const cur=c.result;if(!cur){Promise.all(pend).then(res,rej);return}const key=cur.key;pend.push(ser(cur.value,files).then(v=>{man.blobs.push({k:key,v})}));cur.continue()};c.onerror=()=>rej(c.error)});
   db.close()}
  const local={app:'legal-library',ver:(typeof APP!='undefined'&&APP.version)||'',date:new Date().toISOString(),data:bkLocal(),full:true};
  const ents=[ent('backup.json',_T.encode(JSON.stringify(local))),ent('hscan/manifest.json',_T.encode(JSON.stringify(man)))];
  files.forEach((u,i)=>ents.push(ent('hscan/f/'+i,u)));
  return{bytes:zipWrite(ents),counts:{docs:man.docs.length,assets:man.assets.length,blobs:man.blobs.length}}}
 HDN.buildFull=buildFull;
 function readFull(u8){
  const ents=zipRead(u8.buffer.slice(u8.byteOffset,u8.byteOffset+u8.byteLength)),by={};
  for(const e of ents){if(e.method!=0)throw new Error('method');by[e.name]=e.raw}
  if(!by['backup.json']||!by['hscan/manifest.json'])throw new Error('notfull');
  const p=bkParse(_D.decode(by['backup.json']));if(!p)throw new Error('badbackup');
  const man=JSON.parse(_D.decode(by['hscan/manifest.json'])),F=[];
  for(const n of Object.keys(by)){const m=/^hscan\/f\/(\d+)$/.exec(n);if(m)F[+m[1]]=by[n]}
  return{p,man,F}}
 HDN.readFull=readFull;
 async function applyIdb(Z,mode){
  const db=await idb(),docs=de(Z.man.docs,Z.F),assets=de(Z.man.assets,Z.F),blobs=Z.man.blobs.map(b=>({k:b.k,v:de(b.v,Z.F)})),n={docs:0,assets:0,blobs:0};
  if(mode=='replace'){const t=db.transaction(['docs','blobs','assets'],'readwrite');['docs','blobs','assets'].forEach(s=>t.objectStore(s).clear());await tdone(t)}
  for(const [s,L] of [['docs',docs],['assets',assets]])for(const o of L){const has=mode=='merge'&&await rq(db.transaction(s).objectStore(s).get(o.id));if(has)continue;const t=db.transaction(s,'readwrite');t.objectStore(s).put(o);await tdone(t);n[s]++}
  for(const b of blobs){const has=mode=='merge'&&await rq(db.transaction('blobs').objectStore('blobs').getKey(b.k))!==undefined;if(has)continue;const t=db.transaction('blobs','readwrite');t.objectStore('blobs').put(b.v,b.k);await tdone(t);n.blobs++}
  db.close();return n}
 HDN.applyIdb=applyIdb;
 function saveBytes(bytes,name){const u=URL.createObjectURL(new Blob([bytes],{type:'application/zip'})),l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),8000)}
 async function exportFull(silent){
  try{const r=await buildFull(),iso=isoD(new Date());saveBytes(r.bytes,'نسخة-كاملة-المكتبة-'+iso+'.zip');try{localStorage.setItem('lastbk',iso)}catch(e){}
   if(!silent)toast(`⬇ نسخة كاملة: ${r.counts.docs} مستند ممسوح — ستجدها في التنزيلات`,5000);return true}
  catch(e){toast('تعذّر إنشاء النسخة الكاملة: '+String(e&&e.message||e).slice(0,80),5000);return false}}
 HDN.exportFull=exportFull;
 /* زرا النسخة الكاملة والاستعادة داخل شاشة النسخة الاحتياطية (تغليف bkSheet) */
 if(typeof bkSheet=='function'){const _b=bkSheet;window.bkSheet=bkSheet=function(){const r=_b.apply(this,arguments);try{const a=q('#sh .acts');if(a&&!q('#hdfull'))a.insertAdjacentHTML('beforeend','<button class="btn" id="hdfull" data-act="hdfull">📦 نسخة كاملة (مع المستندات الممسوحة)</button><label class="btn">📂 استعادة نسخة كاملة<input type="file" id="hdzf" accept=".zip,application/zip" hidden></label>');const s=q('#sh .shm:last-of-type');if(s&&!q('#hdnote'))s.insertAdjacentHTML('afterend','<div class="shm" id="hdnote">النسخة العادية (.json) لا تشمل المستندات الممسوحة في مكتبة الماسح؛ استعمل «النسخة الكاملة» لحفظها (قد تكبر حسب عدد المستندات).</div>')}catch(e){}return r}}
 /* ---------- 4) حارس «نسيت الرمز؟» ---------- */
 function forgotFlow(btn){
  const old=q('#hdfg');if(old)old.remove();const dd=typeof bkDays=='function'?bkDays():null;
  const d=document.createElement('div');d.id='hdfg';d.style.cssText='position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:18px';
  d.innerHTML=`<div class="lkb" style="background:var(--sf);border-radius:18px;padding:20px;max-width:420px;width:100%;max-height:90vh;overflow:auto"><h2 style="margin:0 0 8px">⚠️ المسح لا رجعة فيه</h2><div class="shm">«نسيت الرمز» يمسح من هذا الجهاز القضايا والمواعيد والحسابات والتوكيلات والمستندات الممسوحة. ${dd==null?'<b>لم تحفظ أي نسخة احتياطية بعد.</b>':dd==0?'آخر نسخة احتياطية: اليوم.':'آخر نسخة احتياطية منذ '+dd+' يوماً.'}</div><div class="acts one"><button class="btn pri" data-hd="bk">⬇ احفظ نسخة كاملة أولاً</button></div><label class="shm" style="display:block;margin:10px 0"><input type="checkbox" id="hdok"> ${dd==null?'أؤكد أنني لا أحتاج هذه البيانات':'أؤكد أن لدي نسخة أحتفظ بها أو لا أحتاج هذه البيانات'}</label><div class="acts"><button class="btn" data-hd="go" id="hdgo" disabled>متابعة المسح</button><button class="btn" data-hd="no">إلغاء</button></div></div>`;
  document.body.appendChild(d);
  d.addEventListener('click',async e=>{const b=e.target.closest('[data-hd]');if(!b)return;const k=b.dataset.hd;
   if(k=='no')d.remove();
   else if(k=='bk'){b.disabled=true;const ok=await exportFull(true);b.disabled=false;if(ok){const c=q('#hdok');c.checked=true;q('#hdgo').disabled=false;b.textContent='✔ حُفظت النسخة — يمكنك المتابعة'}}
   else if(k=='go'&&q('#hdok').checked){d.remove();HDN.allowForgot=true;try{btn.click()}finally{HDN.allowForgot=false}}});
  d.addEventListener('change',e=>{if(e.target.id=='hdok')q('#hdgo').disabled=!e.target.checked})}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-pd="forgot"]');if(!b||HDN.allowForgot)return;e.stopImmediatePropagation();e.preventDefault();forgotFlow(b)},true);
 /* ---------- ربط الأزرار ---------- */
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  try{
   if(a=='hdready')await readySheet();
   else if(a=='hdpersist'){const ok=await askPersist();toast(ok?'✅ تم تفعيل التخزين الدائم':'لم يمنحه المتصفح الآن — جرّب بعد استعمال التطبيق أكثر أو ثبّته على الشاشة الرئيسية',5000);await readySheet()}
   else if(a=='hdlibs'){el.disabled=true;toast('جارٍ التنزيل…',2000);try{await warmLibs();toast('✅ حُفظت أدوات PDF',2500)}catch(x){toast('تعذّر التنزيل — تحقق من الاتصال',4000)}await readySheet()}
   else if(a=='hdocr'){if(typeof OC!='undefined'&&OC.ensure){const ok=await OC.ensure(OC.lang);if(ok)toast('✅ حُفظت ملفات OCR',2500)}await readySheet()}
   else if(a=='hdfull')await exportFull(false);
   else if(a=='hdzmerge'||a=='hdzrep'){const Z=HDN.Z;if(!Z)return;const rep=a=='hdzrep';if(rep&&!confirm('سيتم استبدال كل بياناتك الحالية (بما فيها المستندات الممسوحة) ببيانات النسخة. هل أنت متأكد؟'))return;
    const n=await applyIdb(Z,rep?'replace':'merge');if(rep)bkReplace(Z.p.d);else bkMerge(Z.p.d);if(typeof proRestore=='function')await proRestore(Z.p.d);HDN.Z=null;
    toast(`تمت الاستعادة — ${n.docs} مستند ممسوح`,2500);setTimeout(()=>location.reload(),900)}
  }catch(x){toast('تعذّرت العملية: '+String(x&&x.message||x).slice(0,80),4500)}});
 document.addEventListener('change',async e=>{if(e.target.id!='hdzf')return;const f=e.target.files[0];if(!f)return;
  try{const Z=readFull(new Uint8Array(await f.arrayBuffer()));HDN.Z=Z;
   sheet(`<h2 class="sht">📦 استعادة نسخة كاملة</h2><div class="shm">تاريخ النسخة: ${E((Z.p.date||'').slice(0,10)||'غير معروف')}<br>تحتوي: ${bkCount(Z.p.d)} · ${Z.man.docs.length} مستند ممسوح</div><div class="acts one"><button class="btn pri" data-act="hdzmerge">🔀 دمج مع بياناتي الحالية (الأسلم)</button><button class="btn" data-act="hdzrep">♻️ استبدال بياناتي بالنسخة</button></div><div class="shm" style="margin-top:10px">الدمج يضيف ما هو ناقص دون حذف شيء. الاستبدال يمسح بياناتك الحالية ويضع النسخة مكانها.</div>`)}
  catch(x){toast('الملف ليس نسخة كاملة صالحة من المكتبة',4000)}});
})();
