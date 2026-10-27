/* تعبئة الصيغة ثم تنزيلها Word على جهاز المستخدم.
   المصدر: Drive API (إن وُجد DRIVE_KEY) أو ملف يختاره المستخدم من جهازه. لا يُرسَل شيء إلى أي خادم. */
const WD=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const KP=['lawyer','office','court','bailiff'],KC=['A','B','A_addr','B_addr','circuit','caseno'];
const KN={dayname:'اليوم',date:'تاريخ',time:'الساعة',A:'اسم الطرف الأول',B:'اسم الطرف الثاني',A_addr:'عنوان الطرف الأول',B_addr:'عنوان الطرف الثاني',lawyer:'المحامي',office:'عنوان المكتب',bailiff:'المحضر',court:'المحكمة',circuit:'الدائرة',caseno:'رقم الدعوى',misc:''};
const hx=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let FS=null;
async function driveBuf(id){if(typeof DRIVE_KEY=='undefined'||!DRIVE_KEY)return null;
 const m='application%2Fvnd.openxmlformats-officedocument.wordprocessingml.document',u=gd(id)?`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${m}&key=${DRIVE_KEY}`:`https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${DRIVE_KEY}`;
 const r=await fetch(u);if(!r.ok)throw new Error('http'+r.status);return r.arrayBuffer()}
function pickSheet(id,msg){const d=byId[id];
 sheet(`<h2 class="sht">تعبئة: ${hx(d[1])}</h2>${msg?`<div class="wn">${msg}</div>`:''}<div class="shm">نزّل الصيغة أولاً ثم اخترها هنا ليملأ التطبيق فراغاتها، ويحفظ لك ملف Word جاهزاً على جهازك.</div><div class="acts one"><a class="btn" data-act="rec" data-dl="1" data-id="${id}" href="${dl(id)}">⬇ 1) تنزيل الصيغة الأصلية</a><label class="btn pri">📂 2) اختيار الملف الذي نزّلته<input type="file" id="fpick" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden></label></div>`);
 $('#fpick').onchange=async e=>{const f=e.target.files[0];if(f)start(id,await f.arrayBuffer())}}
/* تخزين النسخة الأصلية على الجهاز (IndexedDB): لا يحتاج المستخدم لاختيار الملف في كل مرة، ويعمل بدون إنترنت */
const IDBN='legal-lib',IDBS='files';
function idbo(){return new Promise((res,rej)=>{try{const r=indexedDB.open(IDBN,1);r.onupgradeneeded=()=>r.result.createObjectStore(IDBS);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}})}
async function idbGet(k){try{const d=await idbo();return await new Promise((res,rej)=>{const q=d.transaction(IDBS).objectStore(IDBS).get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}catch(e){return null}}
async function idbPut(k,v){try{const d=await idbo();await new Promise((res,rej)=>{const t=d.transaction(IDBS,'readwrite');t.objectStore(IDBS).put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
async function idbDel(k){try{const d=await idbo();await new Promise((res,rej)=>{const t=d.transaction(IDBS,'readwrite');t.objectStore(IDBS).delete(k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
async function fillOpen(id){const d=byId[id];sheet(`<h2 class="sht">${hx(d[1])}</h2><div class="shm">جارٍ تجهيز الصيغة…</div>`);
 let buf=await idbGet(id);const stored=!!buf;
 if(!buf){try{buf=await driveBuf(id)}catch(e){return pickSheet(id,'تعذّر جلب الملف مباشرة من درايف.')}}
 buf?start(id,buf,stored):pickSheet(id,'')}
async function start(id,buf,stored){let sc;try{sc=await docxScan(buf)}catch(e){if(stored)idbDel(id);return pickSheet(id,'هذا الملف ليس Word حديثاً (docx)، فلا يمكن تعديله تلقائياً. نزّله كما هو وعدّله يدوياً.')}
 if(!stored)idbPut(id,buf);
 const fp=ld('fp',{}),fc=ld('fc',{}),now=new Date(),iso=now.toISOString().slice(0,10);let first=true;
 const vals=sc.blanks.map(b=>{let v='';if(KP.includes(b.kind))v=fp[b.kind]||'';else if(KC.includes(b.kind))v=fc[b.kind]||'';
  else if(b.kind=='dayname'&&first)v=WD[now.getDay()];else if(b.kind=='date'&&first){v=iso;first=false}return v});
 FS={id,sc,vals,buf,pairs:[['',''],['',''],['','']],out:null};
 sc.blanks.length?formSheet():repSheet('لا توجد فراغات منقّطة (.....) في هذه الصيغة، فاستخدم «بحث واستبدال» لتعديل النص مباشرة.')}
function formSheet(){const{sc,vals}=FS,d=byId[FS.id];
 const rows=sc.blanks.map((b,i)=>{const t=b.kind=='date'?'date':b.kind=='time'?'time':'text',lab=(KN[b.kind]?KN[b.kind]+' — ':'')+'…'+hx(b.label||'');
  return `<label class="fld${KN[b.kind]&&b.kind!='misc'?' k':''}"><span>${lab}</span><input type="${t}" data-fi="${i}" data-kind="${b.kind}" value="${hx(vals[i])}"></label>`}).join('');
 sheet(`<div class="shh"><h2 class="sht">${hx(d[1])}</h2><button class="lnk" data-act="fclr">مسح بيانات القضية</button></div><div class="shm">${sc.blanks.length} فراغ — اترك الفراغ فارغاً ليبقى منقّطاً. بيانات المحامي والمحكمة تُحفظ على جهازك للمرة القادمة.</div><div class="fl2">${rows}</div><button class="btn pri wide" data-act="fdl">⬇ تنزيل ملف Word</button><div class="acts" style="margin-top:8px"><button class="btn" data-act="frep">🔁 بحث واستبدال</button><button class="btn" data-act="fchg">📂 تغيير الملف المحفوظ</button></div>`)}
function repSheet(msg){const d=byId[FS.id];
 sheet(`<div class="shh"><h2 class="sht">🔁 بحث واستبدال</h2>${FS.sc.blanks.length?'<button class="lnk" data-act="fback">← الفراغات</button>':''}</div>${msg?`<div class="wn">${msg}</div>`:''}<div class="shm">${hx(d[1])}<br>اكتب النص كما هو في الصيغة ثم النص الذي تريده مكانه؛ يُستبدل في كل المواضع.</div><div class="fl2">${FS.pairs.map((p,i)=>`<div class="fld"><input data-rf="${i}" placeholder="النص الموجود" value="${hx(p[0])}"><input data-rr="${i}" placeholder="يُستبدل بـ" value="${hx(p[1])}" style="margin-top:6px"><span id="rc${i}"></span></div>`).join('')}</div><div class="shm" id="rct"></div><div class="acts"><button class="btn" data-act="fradd">➕ سطر آخر</button><button class="btn pri" data-act="frdl">⬇ تنزيل Word</button></div>`);repCount()}
function repCount(){const c=replaceDoc(FS.sc.xml,FS.pairs,false).counts;FS.pairs.forEach((p,i)=>{const e=document.querySelector('#rc'+i);if(e)e.textContent=p[0]?(c[i]?c[i]+' موضع':'هذا النص غير موجود'):''});const t=c.reduce((a,b)=>a+b,0),e=document.querySelector('#rct');if(e)e.textContent=t?'سيتم استبدال '+t+' موضع':''}
function makeOut(u8,name){const type='application/vnd.openxmlformats-officedocument.wordprocessingml.document';name=name.replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim()+'.docx';
 FS.out={u8,name,blob:new Blob([u8],{type}),file:new File([u8],name,{type}),text:null};resultSheet()}
const fmt=(k,v)=>{if(!v)return'';if(k=='date'){const m=v.match(/^(\d{4})-(\d\d)-(\d\d)$/);return m?`${+m[3]} / ${+m[2]} / ${m[1]}`:v}return v};
document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&FS&&(el.dataset.rf!=null||el.dataset.rr!=null)){const f=el.dataset.rf!=null;FS.pairs[+(f?el.dataset.rf:el.dataset.rr)][f?0:1]=el.value;repCount();return}
 if(!el.dataset||el.dataset.fi==null||!FS)return;const k=el.dataset.kind;el.dataset.t=1;FS.vals[+el.dataset.fi]=el.value;
 const shared=!['misc','date','time','dayname'].includes(k);
 if(shared)document.querySelectorAll(`[data-kind="${k}"]`).forEach(o=>{if(o!==el&&!o.dataset.t){o.value=el.value;FS.vals[+o.dataset.fi]=el.value}});
 if(k=='date'&&el.value){const all=[...document.querySelectorAll('[data-fi]')],i=all.indexOf(el),p=all[i-1];if(p&&p.dataset.kind=='dayname'&&!p.dataset.t){const w=WD[new Date(el.value+'T12:00:00').getDay()];if(w){p.value=w;FS.vals[+p.dataset.fi]=w}}}});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='fill')fillOpen(el.dataset.id);
 else if(a=='fclr'){sv('fc',{});toast('تم مسح بيانات القضية');if(FS)start(FS.id,FS.buf,true)}
 else if(a=='frep'&&FS)repSheet('');
 else if(a=='fback'&&FS)formSheet();
 else if(a=='fradd'&&FS){FS.pairs.push(['','']);repSheet('')}
 else if(a=='fchg'&&FS){await idbDel(FS.id);pickSheet(FS.id,'اختر الملف الجديد ليُحفظ على جهازك بدل القديم.')}
 else if(a=='frdl'&&FS){const t=replaceDoc(FS.sc.xml,FS.pairs,false).counts.reduce((x,y)=>x+y,0);if(!t){toast('لا يوجد نص مطابق للاستبدال');return}
  try{makeOut(await docxReplace(FS.sc,FS.pairs),byId[FS.id][1]+' (معدّل)')}catch(x){toast('تعذّر إنشاء الملف')}}
 else if(a=='fdl'&&FS){const o=el.innerHTML;el.innerHTML='<span class="spin"></span> جارٍ تجهيز الملف…';el.classList.add('busy');
  const out=FS.sc.blanks.map((b,i)=>fmt(b.kind,FS.vals[i])),fp=ld('fp',{}),fc=ld('fc',{});
  FS.sc.blanks.forEach((b,i)=>{const v=FS.vals[i];if(!v)return;if(KP.includes(b.kind))fp[b.kind]=v;if(KC.includes(b.kind))fc[b.kind]=v});sv('fp',fp);sv('fc',fc);
  try{makeOut(await docxFill(FS.sc,out),byId[FS.id][1]+(fc.A?' - '+fc.A:''))}catch(x){el.classList.remove('busy');el.innerHTML=o;toast('تعذّر إنشاء الملف')}}
 else if(a=='fres'&&FS&&FS.out)resultSheet();
 else if(a=='fshare'&&FS&&FS.out){try{await navigator.share({files:[FS.out.file],title:FS.out.name})}catch(x){if(!x||x.name!='AbortError')saveOut(el)}}
 else if(a=='fsave'&&FS&&FS.out)saveOut(el);
 else if(a=='fview'&&FS&&FS.out){if(FS.out.text==null)FS.out.text=await docxText(FS.out.u8);
  sheet(`<div class="shh"><h2 class="sht">عرض الصيغة بعد التعبئة</h2><button class="lnk" data-act="fres">رجوع</button></div><div class="pvx" dir="rtl">${hx(FS.out.text)}</div><div class="acts"><button class="btn" data-act="fcopy">📋 نسخ النص</button><button class="btn pri" data-act="fsave">⬇ تنزيل Word</button></div>`)}
 else if(a=='fcopy'&&FS&&FS.out){try{await navigator.clipboard.writeText(FS.out.text);toast('تم نسخ النص')}catch(x){toast('تعذّر النسخ')}}});
function canShareFile(){try{return !!(navigator.canShare&&FS&&FS.out&&navigator.canShare({files:[FS.out.file]}))}catch(e){return false}}
function resultSheet(){const n=FS.out.name,cs=canShareFile();
 sheet(`<h2 class="sht">✔ الملف جاهز</h2><div class="shm" style="word-break:break-all">${hx(n)}</div><div class="acts one">${cs?'<button class="btn pri" data-act="fshare">📤 فتح في تطبيق Word / مشاركة</button>':''}<button class="btn${cs?'':' pri'}" data-act="fsave">⬇ تنزيل على الجهاز</button><button class="btn" data-act="fview">👁 عرض الصيغة داخل البرنامج</button></div><div class="shm" style="margin-top:12px">${cs?'زر «فتح في تطبيق Word» يعرض لك قائمة التطبيقات لفتح الملف مباشرة.':'بعد التنزيل افتح الملف من شريط التنزيلات في المتصفح.'}</div>`)}
function saveOut(el){const o=FS.out,url=URL.createObjectURL(o.blob),l=document.createElement('a');l.href=url;l.download=o.name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);
 toast('⬇ بدأ تنزيل «'+o.name+'» — افتحه من إشعار التنزيلات',5000);if(el&&el.innerHTML){const h=el.innerHTML;el.innerHTML='✔ بدأ التنزيل — افتحه من التنزيلات';setTimeout(()=>el.innerHTML=h,5000)}}
