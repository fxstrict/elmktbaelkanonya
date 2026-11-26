/* الحسام سكان — المرحلة N5a (1.16.9): مكتبة محلية على جهازك (IndexedDB مستقلة باسم hscan-db).
   تحفظ مشاريع المسح (الصفحات الأصلية + العمليات + التواقيع التي تختار حفظها) وملفات PDF، مع حفظ تلقائي واسترجاع ومجلدات ووسوم وربط بالقضية.
   لا تلمس قاعدة legal-lib ولا legal-live ولا localStorage. لا شيء يُرفع لأي خادم. إضافة فقط: نلفّ dpHome وdpWork ونراقب نافذة التوقيع. */
const HD={db:null,cur:null,caseId:'',caseName:'',client:'',dtype:'',n:0,clientF:'',lim:false,last:'',busy:false,auto:true,off:false,q:'',folder:null,tag:'',caseF:'',wm:new WeakMap(),th:'',err:false,persisted:false};
(function(){
 const q=s=>document.querySelector(s),E=s=>esc2(String(s==null?'':s)),wait=ms=>new Promise(r=>setTimeout(r,ms));
 /* ---------- طبقة IndexedDB ---------- */
 const open=()=>HD.db?Promise.resolve(HD.db):new Promise((res,rej)=>{try{const r=indexedDB.open('hscan-db',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('docs',{keyPath:'id'});d.createObjectStore('blobs');d.createObjectStore('assets',{keyPath:'id'})};
  r.onsuccess=()=>{HD.db=r.result;HD.db.onclose=HD.db.onversionchange=()=>{HD.db=null};res(HD.db)};r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('blocked'))}catch(e){rej(e)}});
 const rq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
 const done=t=>new Promise((res,rej)=>{t.oncomplete=()=>res();t.onerror=t.onabort=()=>rej(t.error||new Error('abort'))});
 const get=async(s,k)=>{const d=await open();return DVX.dec(s,k,await rq(d.transaction(s).objectStore(s).get(k)))};
 const all=async s=>{const d=await open();return DVX.decAll(s,await rq(d.transaction(s).objectStore(s).getAll()))};
 const put=async(s,v,k)=>{const d=await open(),w=await DVX.enc(s,k===undefined?v.id:k,v),t=d.transaction(s,'readwrite');k===undefined?t.objectStore(s).put(w):t.objectStore(s).put(w,k);return done(t)};
 const clean=(o,keep)=>{};
 async function rmDoc(id){const d=await open(),t=d.transaction(['docs','blobs'],'readwrite');t.objectStore('docs').delete(id);t.objectStore('blobs').delete(IDBKeyRange.bound(id+'/',id+'/￿'));return done(t)}
 HD.get=get;HD.all=all;HD.put=put;
 const img=async blob=>{const b=await createImageBitmap(blob),c=dpCv(b.width,b.height),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(b,0,0);if(b.close)b.close();return c};
 const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h};
 const SET=['out','fmt','kb','maxd','page','wm','num','gray','name'];
 const stat=t=>{const e=q('#hdst');if(e)e.textContent=t};
 const caseLabel=c=>[c.name,c.no&&(c.no+(c.year?'-'+c.year:''))].filter(Boolean).join(' ');
 const rid=()=>'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 /* بصمة الحالة الحالية: تتغير بأي تعديل (عدد الصفحات، العمليات، الإعدادات، الاسم) */
 const sigOf=()=>DP.items.map(it=>it.id+'.'+it.orig.width+'x'+it.orig.height+'.'+hash(JSON.stringify(it.ops))+'.'+hash(it._ocr&&it._ocr.text||'')+'.'+it.name).join('|')+'|'+SET.map(k=>DP[k]).join(',')+'|'+HD.caseId;
 HD.sig=sigOf;
 /* ---------- الحفظ ---------- */
 async function save(force){
  if(HD.busy||HD.off||!DP.items.length)return;const sig=sigOf();if(!force&&sig==HD.last)return;HD.busy=true;stat('⏳ جارٍ الحفظ…');
  try{if(!HD.cur&&typeof proAllowed=='function'&&!proAllowed('hlib')){stat('⚠ بلغت حد المكتبة المجاني ('+HD.n+' مستندات) — احفظ ملف .hscan أو اشترك في Pro');if(!HD.lim){HD.lim=true;toast('بلغت حد المكتبة المجاني — لن يُحفظ هذا المشروع تلقائياً. صدّر .hscan أو اشترك',5000)}HD.busy=false;return}
   const id=HD.cur||(HD.cur=rid()),old=await get('docs',id).catch(()=>null),puts=[],keep=new Set(),items=[];let size=0;
   for(const it of DP.items){let m=HD.wm.get(it.orig);if(!m||m.id!=id){const b=await dpBlob(it.orig,'image/jpeg',0.95);m={id,k:id+'/p'+Date.now().toString(36)+puts.length+Math.random().toString(36).slice(2,4),s:b.size};puts.push([m.k,b]);HD.wm.set(it.orig,m)}
    keep.add(m.k);size+=m.s;items.push({name:it.name,k:m.k,w:it.orig.width,h:it.orig.height,txt:(it._ocr&&it._ocr.text)||'',ops:JSON.parse(JSON.stringify(it.ops,(kk,v)=>kk[0]=='_'?undefined:v))})}
   const used=new Set();items.forEach(i=>i.ops.forEach(o=>{if(o.t=='filter'&&String(o.f).startsWith('ann~')){try{JSON.parse(decodeURIComponent(o.f.slice(4))).forEach(a=>{if(a.i)used.add(a.i)})}catch(e){}}}));
   const sigs=[];for(const sid of used){const c=ST.img[sid];if(!c)continue;let m=HD.wm.get(c);if(!m||m.id!=id){const b=await dpBlob(c,'image/png');m={id,k:id+'/s-'+sid,s:b.size};puts.push([m.k,b]);HD.wm.set(c,m)}keep.add(m.k);size+=m.s;sigs.push({id:sid,k:m.k})}
   const f0=DP.items[0],t0=f0.id+'.'+hash(JSON.stringify(f0.ops));if(HD.th!=t0||!old||!old.thumb){HD.thv=dpThumb(f0);HD.th=t0}
   const settings={};SET.forEach(k=>settings[k]=DP[k]);
   const nm=(DP.name||'').trim()||(old&&old.name)||('مستند '+isoD(new Date())+' '+new Date().toTimeString().slice(0,5));
   const rec={id,kind:'scan',name:nm,caseId:HD.caseId||'',caseName:HD.caseName||'',text:items.map(i=>i.txt).filter(Boolean).join('\n'),client:HD.client||'',dtype:HD.dtype||'',tags:[...new Set([...((old&&old.tags)||[]),...(HD.dtype?[HD.dtype]:[])])],folder:(old&&old.folder)||'',created:(old&&old.created)||Date.now(),updated:Date.now(),pages:items.length,size,thumb:old&&HD.th==t0?old.thumb:HD.thv,items,sigs,settings};
   const ePuts=await Promise.all(puts.map(async([k,b])=>[k,await DVX.enc('blobs',k,b)])),eRec=await DVX.enc('docs',id,rec),d=await open(),t=d.transaction(['docs','blobs'],'readwrite'),bs=t.objectStore('blobs');ePuts.forEach(([k,b])=>bs.put(b,k));
   bs.openKeyCursor(IDBKeyRange.bound(id+'/',id+'/￿')).onsuccess=e=>{const c=e.target.result;if(c){if(!keep.has(c.key))bs.delete(c.key);c.continue()}};
   t.objectStore('docs').put(eRec);await done(t);
   if(!old)HD.n++;HD.last=sig;SC.saved=true;HD.err=false;HD.lim=false;stat('💾 محفوظ تلقائياً في مكتبتك ✓ '+new Date().toTimeString().slice(0,5));
   if(!HD.persisted&&navigator.storage&&navigator.storage.persist){HD.persisted=true;navigator.storage.persist().catch(()=>{})}
  }catch(e){stat('⚠ تعذّر الحفظ التلقائي');if(!HD.err){HD.err=true;toast(e&&e.name=='QuotaExceededError'?'مساحة الجهاز ممتلئة — تعذّر الحفظ في المكتبة. صدّر ملف المشروع (.hscan)':'تعذّر الحفظ في مكتبة الجهاز — احفظ ملف المشروع (.hscan)',5000)}}
  finally{HD.busy=false}}
 HD.save=save;
 /* حفظ ملف PDF في المكتبة (تستعمله أدوات PDF) */
 HD.addPdf=async(name,bytes,thumb)=>{if(HD.off)throw new Error('off');const id=rid(),k=id+'/pdf',b=new Blob([bytes],{type:'application/pdf'});
  const rec={id,kind:'pdf',name,caseId:HD.caseId||'',caseName:HD.caseName||'',client:HD.client||'',tags:[],folder:'',created:Date.now(),updated:Date.now(),pages:0,size:b.size,thumb:thumb||'',k},eb=await DVX.enc('blobs',k,b),er=await DVX.enc('docs',id,rec),d=await open(),t=d.transaction(['docs','blobs'],'readwrite');t.objectStore('blobs').put(eb,k);t.objectStore('docs').put(er);await done(t);HD.n++;return id};
 /* ---------- الفتح ---------- */
 async function openDoc(id){const r=await get('docs',id);if(!r){toast('المستند غير موجود',2000);return}
  if(r.kind=='pdf'){const b=await get('blobs',r.k);if(!b){toast('الملف مفقود',2000);return}if(typeof pxOpenBlob=='function')pxOpenBlob(b,r.name,r.id);return}
  if(DP.items.length&&HD.cur&&HD.cur!=id)await save(true);
  toast('⏳ جارٍ فتح المستند…',1500);await wait(30);
  try{const items=[];for(const m of r.items){const b=await get('blobs',m.k);if(!b)throw new Error('missing');const c=await img(b);HD.wm.set(c,{id,k:m.k,s:b.size});items.push({id:++_dpid,name:m.name||'صفحة',orig:c,ops:m.ops||[],size:0,th:null,_ocr:m.txt?{text:m.txt,words:null}:null})}
   for(const s of r.sigs||[]){const b=await get('blobs',s.k);if(b){const c=await img(b);ST.img[s.id]=c;HD.wm.set(c,{id,k:s.k,s:b.size})}}
   DP.items=items;DP.res=null;ST.sel.clear();Object.keys(r.settings||{}).forEach(k=>{if(SET.includes(k))DP[k]=r.settings[k]});DP.name=r.name||'';HD.cur=id;HD.caseId=r.caseId||'';HD.caseName=r.caseName||'';HD.client=r.client||'';HD.dtype=r.dtype||'';HD.last=sigOf();SC.saved=true;dpWork()}
  catch(e){toast('تعذّر فتح المستند (قد يكون تالفاً)',3500)}}
 /* ---------- تصدير .hscan من المكتبة ---------- */
 async function expDoc(id){const r=await get('docs',id);if(!r)return;
  if(r.kind=='pdf'){const b=await get('blobs',r.k);if(b)dpSave({name:r.name.replace(/\.pdf$/i,'')+'.pdf',blob:b});return}
  const mk=(name,u)=>({name,method:0,time:0,date:0x21,crc:crc32(u),cs:u.length,us:u.length,raw:u}),ents=[],items=[];let n=0;
  for(const m of r.items){const b=await get('blobs',m.k),fn='pages/p'+(++n)+'.jpg';ents.push(mk(fn,new Uint8Array(await b.arrayBuffer())));items.push({name:m.name,img:fn,w:m.w,h:m.h,ops:m.ops})}
  const sigs=[];for(const s of r.sigs||[]){const b=await get('blobs',s.k);if(b){const fn='sigs/'+s.id+'.png';ents.push(mk(fn,new Uint8Array(await b.arrayBuffer())));sigs.push({id:s.id,file:fn})}}
  const man={app:'hscan',v:1,ver:APP.version,created:new Date().toISOString(),settings:r.settings||{},items,sigs};ents.unshift(mk('manifest.json',new TextEncoder().encode(JSON.stringify(man))));
  dpSave({name:r.name+'.hscan',blob:new Blob([zipWrite(ents)],{type:'application/octet-stream'})})}
 /* ---------- واجهة المكتبة ---------- */
 const fmtD=t=>isoD(new Date(t));
 const row=d=>`<div class="dpt"><img src="${d.thumb||'icons/icon-192.png'}" alt=""><div class="dpn"><b>${d.kind=='pdf'?'📄 ':'🗂 '}${E(d.name)}</b><small>${d.kind=='pdf'?'PDF':d.pages+' صفحة'} · ${dpKB(d.size)} · ${fmtD(d.updated)}${d.caseName?' · ⚖️ '+E(d.caseName):''}${d.client?' · 👤 '+E(d.client):''}${d.folder?' · 📁 '+E(d.folder):''}</small>${(d.tags||[]).length?'<small style="display:block">🏷 '+d.tags.map(E).join('، ')+'</small>':''}<div class="dpb"><button class="pb" data-act="hdopen" data-id="${d.id}" aria-label="فتح">▶</button><button class="pb" data-act="hdinfo" data-id="${d.id}" aria-label="تفاصيل">✏️</button><button class="pb" data-act="hdexp" data-id="${d.id}" aria-label="تنزيل">⬇</button><button class="pb" data-act="hddel" data-id="${d.id}" aria-label="حذف">🗑</button></div></div></div>`;
 async function list(){const el=q('#hdl');if(!el)return;let ds=await all('docs');ds.sort((a,b)=>b.updated-a.updated);const qq=HD.q.trim().toLowerCase();
  if(HD.caseF)ds=ds.filter(d=>d.caseId==HD.caseF);if(HD.clientF)ds=ds.filter(d=>(d.client||'')==HD.clientF);if(HD.folder!==null)ds=ds.filter(d=>(d.folder||'')==HD.folder);if(HD.tag)ds=ds.filter(d=>(d.tags||[]).includes(HD.tag));
  if(qq)ds=ds.filter(d=>(d.name+' '+(d.tags||[]).join(' ')+' '+(d.caseName||'')+' '+(d.client||'')+' '+(d.folder||'')+' '+(d.text||'')).toLowerCase().includes(qq));
  el.innerHTML=ds.length?ds.map(row).join(''):'<div class="shm">لا مستندات مطابقة.</div>'}
 async function lib(){
  if(HD.off){sheet('<div class="shh"><h2 class="sht">🗄 مكتبتي</h2><button class="lnk" data-act="dp">← تجهيز</button></div><div class="wn">التخزين المحلي غير متاح في هذا المتصفح (قد تكون في نافذة خاصة). استعمل ملف المشروع .hscan للحفظ.</div>');return}
  let ds=[],sg=[];try{ds=await all('docs');sg=(await all('assets')).filter(a=>a.kind=='sig')}catch(e){HD.off=true;return lib()}
  HD.n=ds.length;const clients=[...new Set(ds.map(d=>d.client||'').filter(Boolean))].sort(),folders=[...new Set(ds.map(d=>d.folder||'').filter(Boolean))].sort(),tags=[...new Set(ds.flatMap(d=>d.tags||[]))].sort();
  let use='';try{const es=await navigator.storage.estimate();if(es&&es.usage!=null)use=' · المستخدم من التخزين '+dpKB(es.usage)+(es.quota?' من '+dpKB(es.quota):'')}catch(e){}
  const cn=HD.caseF&&(CLS.find(c=>c.id==HD.caseF)||{}).name;
  sheet(`<div class="shh"><h2 class="sht">🗄 مكتبتي (${ds.length})</h2><button class="lnk" data-act="dp">← تجهيز المستندات</button></div><div class="shm">مستنداتك محفوظة على هذا الجهاز فقط ولا تُرفع لأي خادم${use}. امسح بيانات المتصفح = تضيع؛ صدّر ملفات مهمة بزر ⬇.</div>
  <label class="fld"><span>بحث (الاسم، الوسم، القضية، المجلد، نص المستند بعد OCR)</span><input data-hd="q" value="${E(HD.q)}" placeholder="اكتب للبحث"></label>
  <div class="dkc"><button class="chip ${HD.folder===null?'on':''}" data-act="hdfold" data-v="*">الكل</button><button class="chip ${HD.folder===''?'on':''}" data-act="hdfold" data-v="">بلا مجلد</button>${folders.map(f=>`<button class="chip ${HD.folder===f?'on':''}" data-act="hdfold" data-v="${E(f)}">📁 ${E(f)}</button>`).join('')}</div>
  ${tags.length?`<div class="dkc">${tags.map(t=>`<button class="chip ${HD.tag==t?'on':''}" data-act="hdtag" data-v="${E(t)}">🏷 ${E(t)}</button>`).join('')}</div>`:''}
  ${clients.length?`<div class="dkc">${clients.map(c=>`<button class="chip ${HD.clientF==c?'on':''}" data-act="hdclient" data-v="${E(c)}">👤 ${E(c)}</button>`).join('')}</div>`:''}
  ${HD.caseF?`<div class="dkc"><button class="chip on" data-act="hdcasef" data-v="">⚖️ قضية: ${E(cn||'')} ✕</button></div>`:''}
  <div id="hdl"></div>
  <label class="mwk"><input type="checkbox" data-hd="auto" ${HD.auto?'checked':''}> حفظ تلقائي لمشروع المسح الجاري في المكتبة</label>
  ${sg.length?`<div class="shm mws">✒️ توقيعاتي المحفوظة (${sg.length})</div><div class="dkc">${sg.map(s=>`<span class="chip"><img src="${s.prev}" alt="" style="height:26px;vertical-align:middle;background:#fff;border-radius:4px"> <button class="lnk" data-act="hdsigdel" data-id="${s.id}" aria-label="حذف">🗑</button></span>`).join('')}</div>`:''}
  <div class="shm">التواقيع لا تُحفظ إلا بضغطك «حفظ هذا التوقيع» داخل استوديو التعليق.</div>`);list()}
 HD.lib=lib;
 async function info(id){const d=await get('docs',id);if(!d)return;
  sheet(`<div class="shh"><h2 class="sht">✏️ تفاصيل المستند</h2><button class="lnk" data-act="hdlib">← المكتبة</button></div><label class="fld"><span>الاسم</span><input id="hdn" value="${E(d.name)}"></label><label class="fld"><span>المجلد (اكتب اسماً جديداً أو اتركه فارغاً)</span><input id="hdf" value="${E(d.folder||'')}" list="hdfl"><datalist id="hdfl">${[...new Set((await all('docs')).map(x=>x.folder).filter(Boolean))].map(f=>`<option value="${E(f)}">`).join('')}</datalist></label><label class="fld"><span>الوسوم (افصل بفاصلة)</span><input id="hdt" value="${E((d.tags||[]).join('، '))}" placeholder="توكيل، حكم، إعلان"></label><label class="fld"><span>ربط بقضية</span><select id="hdc"><option value="">— بلا ربط —</option>${CLS.map(c=>`<option value="${E(c.id)}" ${c.id==d.caseId?'selected':''}>${E(caseLabel(c))}</option>`).join('')}</select></label><button class="btn pri wide" data-act="hdsavei" data-id="${id}">حفظ</button>`)}
 async function patch(id){const d=await get('docs',id);if(!d)return;const c=CLS.find(x=>x.id==q('#hdc').value);
  d.name=q('#hdn').value.trim()||d.name;d.folder=q('#hdf').value.trim();d.tags=q('#hdt').value.split(/[,،]/).map(s=>s.trim()).filter(Boolean);d.caseId=c?c.id:'';d.caseName=c?caseLabel(c):'';d.client=c?(c.client||''):'';d.updated=Date.now();await put('docs',d);
  if(HD.cur==id){DP.name=d.name;HD.caseId=d.caseId;HD.caseName=d.caseName;HD.client=d.client;HD.last=''}toast('✔ تم الحفظ',1500);lib()}
 /* ---------- التواقيع المحفوظة (اختيارية) داخل استوديو التعليق ---------- */
 const act=(a,d)=>{const b=document.createElement('button');b.dataset.act=a;if(d)for(const k in d)b.dataset[k]=d[k];b.style.display='none';document.body.appendChild(b);try{b.click()}finally{b.remove()}};
 const prevOf=s=>{const c=dpCv(160,Math.max(20,Math.round(160*s.a))),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);ST.paint(x,[Object.assign({k:'g',x:80,y:c.height/2,w:160},s.v?{v:s.v,a:s.a,c:s.c}:{i:s.i,a:s.a})]);return c.toDataURL('image/png')};
 async function sigBar(){const box=q('#hdsg');if(!box||HD.off)return;let sg=[];try{sg=(await all('assets')).filter(a=>a.kind=='sig')}catch(e){return}
  box.innerHTML=sg.map(s=>`<button class="chip" data-act="hdsiguse" data-id="${s.id}"><img src="${s.prev}" alt="" style="height:26px;background:#fff;border-radius:4px;vertical-align:middle"></button>`).join('')+(ST.sig?'<button class="chip" data-act="hdsigsave">💾 حفظ هذا التوقيع على جهازي</button>':'')+(sg.length||ST.sig?'':'<span class="shm">لا توقيعات محفوظة (اختياري).</span>')}
 new MutationObserver(()=>{const f=q('#stsigf');if(f&&!q('#hdsg')&&!HD.off){const a=f.closest('.acts');if(a){a.insertAdjacentHTML('afterend','<div class="shm" style="margin-top:6px">توقيعاتي المحفوظة على الجهاز:</div><div class="dkc" id="hdsg"></div>');sigBar()}}}).observe(document.body,{childList:true,subtree:true});
 /* ---------- لفّ الشاشات القائمة ---------- */
 {const _h=dpHome;window.dpHome=dpHome=function(){const r=_h.apply(this,arguments);try{const a=q('#sh .acts');if(a&&!HD.off){a.insertAdjacentHTML('beforeend','<button class="btn" data-act="hdlib">🗄 مكتبتي</button><button class="btn" data-act="pxhome">🧩 أدوات PDF</button>');
   all('docs').then(ds=>{const e=q('#sh .acts');if(!e||!ds.length)return;ds.sort((x,y)=>y.updated-x.updated);const t=ds.slice(0,3);e.insertAdjacentHTML('afterend','<div class="shm mws">↩ استكمال آخر عمل</div>'+t.map(row).join(''))}).catch(()=>{})}else if(a)a.insertAdjacentHTML('beforeend','<button class="btn" data-act="pxhome">🧩 أدوات PDF</button>')}catch(e){}return r}}
 {const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{const sh=q('#sh'),h=sh&&sh.querySelector('.shh');if(h&&sh.querySelector('[data-act="dprun"]')){h.insertAdjacentHTML('afterend','<div class="shm"><span id="hdst">'+(HD.off?'التخزين المحلي غير متاح — احفظ ملف المشروع':HD.auto?(HD.last==sigOf()?'💾 محفوظ تلقائياً في مكتبتك ✓':'⏳ سيُحفظ تلقائياً خلال ثوانٍ…'):'الحفظ التلقائي متوقف')+'</span> <button class="lnk" data-act="hdnow">💾 حفظ الآن</button> <button class="lnk" data-act="hdlib">🗄 مكتبتي</button></div>')}}catch(e){}return r}}
 /* ---------- الأحداث ---------- */
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id,v=el.dataset.v;
  try{
  if(a=='hdlib'){HD.q='';HD.tag='';HD.clientF='';lib()}
  else if(a=='hdcase'){const c=typeof curCase=='function'&&curCase();HD.q='';HD.tag='';HD.folder=null;HD.caseF=c?c.id:'';lib()}
  else if(a=='hdcasef'){HD.caseF='';lib()}
  else if(a=='hdfold'){HD.folder=v=='*'?null:v;lib()}
  else if(a=='hdclient'){HD.clientF=HD.clientF==v?'':v;lib()}
  else if(a=='hdtag'){HD.tag=HD.tag==v?'':v;lib()}
  else if(a=='hdopen')openDoc(id);
  else if(a=='hdinfo')info(id);
  else if(a=='hdsavei')patch(id);
  else if(a=='hdexp')expDoc(id);
  else if(a=='hddel'){const d=await get('docs',id);if(d&&confirm('حذف «'+d.name+'» من مكتبتك نهائياً؟')){await rmDoc(id);HD.n=Math.max(0,HD.n-1);if(HD.cur==id){HD.cur=null;HD.last=DP.items.length?sigOf():''}list();toast('🗑 حُذف',1500)}}
  else if(a=='hdnow'){if(!HD.cur&&typeof proGate=='function'&&!proGate('hlib'))return;await save(true);if(HD.last)toast('💾 تم الحفظ في المكتبة',1800)}
  else if(a=='hdsigdel'){if(confirm('حذف هذا التوقيع من جهازك؟')){const d=await open(),t=d.transaction('assets','readwrite');t.objectStore('assets').delete(id);await done(t);lib()}}
  else if(a=='hdsigsave'&&ST.sig){const s=ST.sig,rec={id:'sg'+Date.now().toString(36),kind:'sig',a:s.a,prev:prevOf(s),created:Date.now()};if(s.v){rec.v=s.v;rec.c=s.c}else{rec.png=await dpBlob(ST.img[s.i],'image/png')}await put('assets',rec);toast('✔ حُفظ التوقيع على جهازك فقط',2200);sigBar()}
  else if(a=='hdsiguse'){const s=await get('assets',id);if(!s)return;if(s.v)ST.sig={v:s.v,a:s.a,c:s.c};else{const sid='h'+id+(++ST.n);ST.img[sid]=await img(s.png);ST.sig={i:sid,a:s.a}}act('sttool',{v:'sig'})}
  }catch(x){toast('تعذّرت العملية',2500)}
  if(a=='scancase'&&typeof curCase=='function'&&!DP.items.length){const c=curCase();HD.cur=null;HD.last='';if(c){HD.caseId=c.id;HD.caseName=caseLabel(c);HD.client=c.client||'';HD.dtype=''}}});
 document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.hd=='q'){HD.q=el.value;list()}});
 document.addEventListener('change',async e=>{const el=e.target;if(el.dataset&&el.dataset.hd=='auto'){HD.auto=el.checked;try{await put('assets',{id:'cfg',kind:'cfg',auto:HD.auto})}catch(x){}toast(HD.auto?'الحفظ التلقائي مفعّل':'الحفظ التلقائي متوقف',1800)}});
 /* ---------- الحفظ التلقائي الدوري ---------- */
 setInterval(()=>{try{if(!DP.items.length){if(HD.cur){HD.cur=null;HD.caseId=HD.caseName=HD.client=HD.dtype='';HD.last=''}return}if(HD.auto&&!document.hidden&&!(typeof SC!='undefined'&&SC.cr))save()}catch(x){}},4000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&HD.auto&&DP.items.length)save()});
 if(!window.indexedDB)HD.off=true;else{get('assets','cfg').then(c=>{if(c)HD.auto=c.auto!==false}).catch(()=>{HD.off=true});all('docs').then(d=>{HD.n=d.length}).catch(()=>{})}
})();
