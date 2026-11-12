/* المكتبة الحيّة: تصفّح مجلدات درايف مباشرة داخل التطبيق (أحكام، مذكرات ودفوع، أكواد القوانين، موسوعات وكتب…) كبطاقات كتب،
   وفتح الملف للقراءة داخل التطبيق دون الدخول لمجلد درايف. أي ملف أو مجلد يُضاف في درايف يظهر تلقائياً.
   الشرط: مفتاح Drive API في DRIVE_KEY (js/config.js) والمجلدات مشاركة «لأي شخص لديه الرابط». المجلدات المسجّلة في LIB (js/library.js). */
const LV={stack:[],cur:null,n:60,idx:null,busy:false,prog:'',shown:[]},LVAPI='https://www.googleapis.com',FOLD='application/vnd.google-apps.folder';
const lvKey=()=>(typeof DRIVE_KEY!='undefined'&&DRIVE_KEY)||(()=>{try{return localStorage.getItem('dkey')||''}catch(e){return''}})();
function lvdb(){return new Promise((res,rej)=>{try{const r=indexedDB.open('legal-live',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('dir');d.createObjectStore('idx')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
async function lvGet(s,k){try{const d=await lvdb();return await new Promise((res,rej)=>{const q=d.transaction(s).objectStore(s).get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch(e){return null}}
async function lvPut(s,k,v){try{const d=await lvdb();await new Promise((res,rej)=>{const t=d.transaction(s,'readwrite');t.objectStore(s).put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
async function lvFetch(id){const key=lvKey();let all=[],tok='';
 do{const u=`${LVAPI}/drive/v3/files?q=${encodeURIComponent(`'${id}' in parents and trashed=false`)}&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime)&pageSize=1000&orderBy=folder,name&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${encodeURIComponent(key)}${tok?'&pageToken='+encodeURIComponent(tok):''}`;
  const r=await fetch(u);if(!r.ok){const e=new Error('http'+r.status);e.status=r.status;throw e}const j=await r.json();all=all.concat(j.files||[]);tok=j.nextPageToken||''}while(tok);
 const F=[],B=[];all.forEach(f=>(f.mimeType==FOLD?F:B).push({id:f.id,n:f.name,m:f.mimeType,s:+f.size||0,t:f.modifiedTime}));
 const c=(a,b)=>a.n.localeCompare(b.n,'ar',{numeric:true});F.sort(c);B.sort(c);return{folders:F,files:B}}
/* قراءة من الذاكرة المحلية فوراً ثم تحديث في الخلفية إن مضى أكثر من نصف ساعة */
async function lvShow(){const top=LV.stack[LV.stack.length-1];if(!top)return;const id=top.id;LV.n=60;const c=await lvGet('dir',id);
 if(c){LV.cur={id,...c,err:null,loading:false};render()}else{LV.cur={id,folders:[],files:[],loading:true,err:null};render()}
 if(!c||Date.now()-c.t>30*60e3){try{const d=await lvFetch(id);d.t=Date.now();lvPut('dir',id,d);if(LV.stack.length&&LV.stack[LV.stack.length-1].id==id){LV.cur={id,...d,err:null,loading:false};render()}}
  catch(e){if(LV.stack.length&&LV.stack[LV.stack.length-1].id==id){if(!c)LV.cur={id,folders:[],files:[],loading:false,err:e.status||'net'};else LV.cur={...LV.cur,stale:true};render()}}}}
const lvPh=()=>LV.stack.length?'ابحث في هذا القسم…':LV.idx?'ابحث في كل المكتبة…':'ابحث في الأقسام…';
const lvExt=f=>{const m=(f.n.match(/\.([A-Za-z0-9]+)$/)||[])[1];return(m||'').toLowerCase()};
const lvType=f=>{const e=lvExt(f),mm=f.m||'';return e=='pdf'||mm=='application/pdf'?'PDF':/^docx?$/.test(e)||mm.includes('word')||mm=='application/vnd.google-apps.document'?'Word':/^xlsx?$/.test(e)||mm.includes('sheet')?'Excel':/^pptx?$/.test(e)?'PPT':/^(jpe?g|png|gif|webp)$/.test(e)?'صورة':/^(zip|rar|7z)$/.test(e)?'أرشيف':e?e.toUpperCase():'ملف'};
const lvName=f=>f.n.replace(/\.[A-Za-z0-9]{2,5}$/,'').trim();
const lvSize=n=>!n?'':n>=1048576?(n/1048576).toFixed(1)+' م.ب':Math.max(1,Math.round(n/1024))+' ك.ب';
const lvHue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h%360};
const lvPv=f=>f.m=='application/vnd.google-apps.document'?'https://docs.google.com/document/d/'+f.id+'/preview':f.m=='application/vnd.google-apps.spreadsheet'?'https://docs.google.com/spreadsheets/d/'+f.id+'/preview':f.m=='application/vnd.google-apps.presentation'?'https://docs.google.com/presentation/d/'+f.id+'/preview':'https://drive.google.com/file/d/'+f.id+'/preview';
const lvDl=f=>f.m=='application/vnd.google-apps.document'?'https://docs.google.com/document/d/'+f.id+'/export?format=docx':'https://drive.usercontent.google.com/download?id='+f.id+'&export=download';
function lvBook(f,i){const h=lvHue(f.n);return `<button class="bk" data-act="lvfile" data-i="${i}" style="--c1:hsl(${h} 42% 30%);--c2:hsl(${(h+30)%360} 48% 20%)"><span class="tp">${lvType(f)}</span><b>${esc2(lvName(f))}</b><small>${lvSize(f.s)||'&nbsp;'}</small></button>`}
const lvDirCard=(f,ic)=>`<button class="cat" data-act="lvdir" data-id="${f.id}" data-n="${esc2(f.n)}"><span class="ci">${ic||'📁'}</span><b>${esc2(f.n)}</b><span>فتح ‹</span></button>`;
function lvSetupBanner(){return lvKey()?'':`<div class="wn">لإظهار كل ملفات المكتبة (الأحكام والمذكرات والأكواد والكتب) داخل التطبيق كبطاقات منظمة، فعّل الاتصال المباشر بدرايف. <button class="lnk" data-act="lvsetup">كيف أفعّله؟</button></div>`}
function lvHome(){const q=nz((S.q||'').trim());let h=lvSetupBanner();
 if(q&&LV.idx)return lvSearchHtml(q);
 LIB.forEach(([g,items])=>{const it=items.filter(x=>!q||nz(x[1]).includes(q));if(it.length)h+=`<div class="bar2"><b>${g}</b><span>${it.length}</span></div><div class="grid">`+it.map(x=>`<button class="cat" data-act="lvdir" data-id="${x[0]}" data-n="${esc2(x[1])}"><span class="ci">${x[2]}</span><b>${x[1]}</b><span>${lvKey()?'فتح ‹':'فتح في درايف ↗'}</span></button>`).join('')+'</div>'});
 if(lvKey()){const t=LV.idx?`آخر فهرسة: ${new Date(LV.idx.t).toLocaleDateString('ar-EG')} — ${LV.idx.idx.length} عنصر`:'غير مفهرسة بعد';h+=`<div class="cp" style="margin-top:12px"><div class="cph"><b>🔎 البحث الشامل</b></div><div class="shm">${LV.busy?esc2(LV.prog):'الفهرسة تقرأ أسماء كل ملفات المكتبة مرة واحدة فيصبح البحث في الخانة العلوية شاملاً لكل الأقسام ('+t+').'}</div><div class="acts"><button class="btn${LV.busy?' busy':''}" data-act="lvcrawl">${LV.idx?'🔄 تحديث الفهرسة':'▶ فهرسة المكتبة'}</button><button class="btn" data-act="lvsetup">⚙️ إعداد الاتصال</button></div></div>`}
 return h||'<div class="em"><div>🔎</div>لا توجد أقسام مطابقة</div>'}
function lvFolderHtml(){const top=LV.stack[LV.stack.length-1],c=LV.cur,q=nz((S.q||'').trim());
 let h=`<div class="bar2"><button class="lnk" data-act="lvback">← رجوع</button><b style="flex:1;margin:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${LV.stack.map(x=>esc2(x.n)).join(' › ')}</b></div>`;
 if(!c||c.loading)return h+'<div class="em"><div>⏳</div>جارٍ تحميل المحتوى…</div>';
 if(c.err)return h+`<div class="wn">${c.err==403?'رفض درايف الطلب (403): تأكد أن المجلد مشارك «لأي شخص لديه الرابط»، وأن Drive API مفعّل، وأن المفتاح يسمح بنطاق موقعك.':c.err==400?'مفتاح Drive API غير صحيح.':c.err==404?'المجلد غير موجود.':'تعذّر الاتصال بدرايف — تأكد من الإنترنت.'} <button class="lnk" data-act="lvsetup">إعداد الاتصال</button></div>`;
 const fl=c.folders.filter(f=>!q||nz(f.n).includes(q)),fi=c.files.filter(f=>!q||nz(f.n).includes(q));
 if(!fl.length&&!fi.length)return h+`<div class="em"><div>${q?'🔎':'📭'}</div>${q?'لا نتائج مطابقة في هذا القسم':'هذا القسم فارغ'}</div>`;
 if(fl.length)h+=`<div class="bar2"><b>التصنيفات</b><span>${fl.length}</span></div><div class="grid">`+fl.map(f=>lvDirCard(f)).join('')+'</div>';
 LV.shown=fi.slice(0,LV.n);
 if(fi.length)h+=`<div class="bar2"><b>الكتب والملفات</b><span>${fi.length}</span></div><div class="bkg">`+LV.shown.map((f,i)=>lvBook(f,i)).join('')+'</div>'+(fi.length>LV.n?`<button class="btn wide" data-act="lvmore">عرض المزيد (${fi.length-LV.n})</button>`:'');
 return h+(c.stale?'<div class="shm">يعرض نسخة محفوظة (لا يوجد اتصال).</div>':'')}
function lvSearchHtml(q){const ws=q.split(/\s+/).filter(Boolean),R=LV.idx.idx.filter(e=>{if(e.nn===undefined)e.nn=nz(e[1]+' '+e[2]);return ws.every(w=>e.nn.includes(w))}).sort((a,b)=>b[3]-a[3]).slice(0,100);
 LV.found=R;return `<div class="bar2"><b>نتائج البحث الشامل</b><span>${R.length}${R.length==100?'+':''}</span></div>`+(R.length?R.map((e,i)=>`<div class="pr" data-act="lvres" data-i="${i}" style="cursor:pointer"><span>${e[3]?'📁':'📄'} <b>${esc2(e[3]?e[1]:lvName({n:e[1]}))}</b><br><small>${esc2(e[2])}</small></span></div>`).join(''):'<div class="em"><div>🔎</div>لا نتائج</div>')}
function liveHtml(){return LV.stack.length?lvFolderHtml():lvHome()}
function lvFileSheet(f){sheet(`<h2 class="sht">${esc2(lvName(f))}</h2><div class="shm">${lvType(f)}${f.s?' · '+lvSize(f.s):''}${f.t?' · آخر تعديل '+f.t.slice(0,10):''}</div><div class="acts"><button class="btn pri span2" data-act="lvread" data-id="${f.id}">📖 قراءة داخل التطبيق</button><a class="btn" data-act="rec" data-dl="1" href="${lvDl(f)}">⬇ تحميل الملف</a><button class="btn" data-act="lvcopy" data-id="${f.id}">🔗 نسخ الرابط</button></div>`);LV.file=f}
function lvRead(f){sheet(`<div class="shh"><h2 class="sht" style="font-size:15px">${esc2(lvName(f))}</h2><button class="lnk" data-act="lvfback">← رجوع</button></div><iframe class="rdr" src="${lvPv(f)}" allow="autoplay" loading="lazy"></iframe><div class="acts" style="margin-top:8px"><a class="btn" data-act="rec" data-dl="1" href="${lvDl(f)}">⬇ تحميل</a></div>`);LV.file=f}
function lvSetup(){sheet(`<h2 class="sht">⚙️ الاتصال المباشر بدرايف</h2><div class="shm">يقرأ التطبيق مجلدات المكتبة من درايف مباشرة فتظهر كل الملفات الحالية والمستقبلية منظمة كبطاقات. يلزم مفتاح Drive API (مجاني):</div><div class="shm">1) في console.cloud.google.com أنشئ مشروعاً ثم فعّل «Google Drive API».<br>2) من «Credentials» أنشئ «API key».<br>3) قيّده: Websites ثم أضف <b>${esc2(location.origin)}/*</b> ، وقيّد الـAPI على Drive API فقط.<br>4) الصق المفتاح في <b>DRIVE_KEY</b> داخل ملف <b>js/config.js</b> وارفع الملف ليعمل لكل مستخدم.<br>5) تأكد أن مجلدات المكتبة مشاركة «لأي شخص لديه الرابط».</div><label class="fld"><span>للتجربة على هذا الجهاز فقط: الصق المفتاح هنا</span><input id="lvk" value="${esc2(lvKey())}" placeholder="AIza…"></label><div class="acts"><button class="btn pri" data-act="lvsavekey">حفظ</button><button class="btn" data-act="lvtest">اختبار الاتصال</button></div><div id="lvt" class="shm"></div>`)}
async function lvCrawl(){if(LV.busy||!lvKey())return;LV.busy=true;LV.prog='جارٍ الفهرسة…';render();
 const roots=[],seen=new Set();LIB.forEach(([g,it])=>it.forEach(x=>{if(!seen.has(x[0])){seen.add(x[0]);roots.push({id:x[0],n:x[1],p:''})}}));
 const queue=[...roots],idx=[];let active=0,done=0,files=0,failed=0;
 const worker=async()=>{for(;;){const q=queue.shift();if(!q){if(active==0)return;await new Promise(r=>setTimeout(r,40));continue}
  active++;try{const d=await lvFetch(q.id);lvPut('dir',q.id,{...d,t:Date.now()});idx.push([q.id,q.n,q.p,1,'',0]);const path=q.p?q.p+' › '+q.n:q.n;d.folders.forEach(f=>{if(!seen.has(f.id)){seen.add(f.id);queue.push({id:f.id,n:f.n,p:path})}});d.files.forEach(f=>{idx.push([f.id,f.n,path,0,f.m,f.s]);files++});done++}catch(e){failed++}
  active--;if((done+failed)%8==0){LV.prog=`فُهرس ${done} مجلداً و${files} ملفاً…`;if(S.tab=='lib'&&!LV.stack.length)render()}}};
 await Promise.all(Array.from({length:6},worker));LV.idx={t:Date.now(),idx};await lvPut('idx','all',LV.idx);LV.busy=false;LV.prog='';
 toast(`تمت الفهرسة: ${done} مجلداً و${files} ملفاً${failed?' (تعذّر '+failed+')':''}`,3500);if(S.tab=='lib')render()}
(async()=>{LV.idx=await lvGet('idx','all')})();
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='lvdir'){if(!lvKey()){window.open('https://drive.google.com/drive/folders/'+el.dataset.id,'_blank','noopener');return}LV.stack.push({id:el.dataset.id,n:el.dataset.n});S.q='';const i=document.querySelector('#q');if(i)i.value='';scrollTo(0,0);lvShow()}
 else if(a=='lvback'){LV.stack.pop();LV.cur=null;S.q='';const i=document.querySelector('#q');if(i)i.value='';if(LV.stack.length)lvShow();else render();scrollTo(0,0)}
 else if(a=='lvmore'){LV.n+=60;render()}
 else if(a=='lvfile'){const f=LV.shown[+el.dataset.i];if(f)lvFileSheet(f)}
 else if(a=='lvread'){const f=LV.file&&LV.file.id==el.dataset.id?LV.file:null;if(f)lvRead(f)}
 else if(a=='lvfback'){if(LV.file)lvFileSheet(LV.file)}
 else if(a=='lvcopy'){const f=LV.file;if(f&&navigator.clipboard)navigator.clipboard.writeText(lvPv(f)).then(()=>toast('تم نسخ الرابط'),()=>toast('تعذّر النسخ'))}
 else if(a=='lvres'){const r=LV.found&&LV.found[+el.dataset.i];if(!r)return;if(r[3]){LV.stack=[{id:r[0],n:r[1]}];S.q='';const i=document.querySelector('#q');if(i)i.value='';lvShow()}else lvFileSheet({id:r[0],n:r[1],m:r[4],s:r[5]})}
 else if(a=='lvsetup')lvSetup();
 else if(a=='lvsavekey'){const v=(document.querySelector('#lvk')||{}).value||'';try{localStorage.setItem('dkey',v.trim())}catch(x){}toast(v.trim()?'تم حفظ المفتاح على هذا الجهاز':'تم مسح المفتاح');render()}
 else if(a=='lvtest'){const t=document.querySelector('#lvt'),k=(document.querySelector('#lvk')||{}).value||'';if(k.trim())try{localStorage.setItem('dkey',k.trim())}catch(x){}if(t)t.textContent='جارٍ الاختبار…';try{const d=await lvFetch(LIB[0][1][0][0]);if(t)t.textContent='✔ الاتصال يعمل — وُجد '+(d.folders.length+d.files.length)+' عنصراً في أول قسم.'}catch(x){if(t)t.textContent='✖ فشل الاتصال'+(x.status?' ('+x.status+')':'')+': تأكد من المفتاح وتفعيل Drive API ومشاركة المجلدات ونطاق الموقع.'}}
 else if(a=='lvcrawl')lvCrawl()});
