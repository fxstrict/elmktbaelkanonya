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
async function fillOpen(id){const d=byId[id];sheet(`<h2 class="sht">${hx(d[1])}</h2><div class="shm">جارٍ تجهيز الصيغة…</div>`);
 let buf=null;try{buf=await driveBuf(id)}catch(e){return pickSheet(id,'تعذّر جلب الملف مباشرة من درايف.')}
 buf?start(id,buf):pickSheet(id,'')}
async function start(id,buf){let sc;try{sc=await docxScan(buf)}catch(e){return pickSheet(id,'هذا الملف ليس Word حديثاً (docx)، فلا يمكن تعبئته تلقائياً. نزّله كما هو وعدّله يدوياً.')}
 if(!sc.blanks.length)return pickSheet(id,'لم أجد فراغات منقّطة (.....) في هذه الصيغة. نزّلها كما هي.');
 const fp=ld('fp',{}),fc=ld('fc',{}),now=new Date(),iso=now.toISOString().slice(0,10);let first=true;
 const vals=sc.blanks.map((b,i)=>{let v='';if(KP.includes(b.kind))v=fp[b.kind]||'';else if(KC.includes(b.kind))v=fc[b.kind]||'';
  else if(b.kind=='dayname'&&first)v=WD[now.getDay()];else if(b.kind=='date'&&first){v=iso;first=false}return v});
 FS={id,sc,vals,buf};const d=byId[id];
 const rows=sc.blanks.map((b,i)=>{const t=b.kind=='date'?'date':b.kind=='time'?'time':'text',lab=(KN[b.kind]?KN[b.kind]+' — ':'')+'…'+hx(b.label||'');
  return `<label class="fld${KN[b.kind]&&b.kind!='misc'?' k':''}"><span>${lab}</span><input type="${t}" data-fi="${i}" data-kind="${b.kind}" value="${hx(vals[i])}"></label>`}).join('');
 sheet(`<div class="shh"><h2 class="sht">${hx(d[1])}</h2><button class="lnk" data-act="fclr">مسح بيانات القضية</button></div><div class="shm">${sc.blanks.length} فراغ — اترك الفراغ فارغاً ليبقى منقّطاً. بيانات المحامي والمحكمة تُحفظ على جهازك للمرة القادمة.</div><div class="fl2">${rows}</div><button class="btn pri wide" data-act="fdl">⬇ تنزيل ملف Word</button>`)}
const fmt=(k,v)=>{if(!v)return'';if(k=='date'){const m=v.match(/^(\d{4})-(\d\d)-(\d\d)$/);return m?`${+m[3]} / ${+m[2]} / ${m[1]}`:v}return v};
document.addEventListener('input',e=>{const el=e.target;if(!el.dataset||el.dataset.fi==null||!FS)return;const k=el.dataset.kind;el.dataset.t=1;FS.vals[+el.dataset.fi]=el.value;
 const shared=!['misc','date','time','dayname'].includes(k);
 if(shared)document.querySelectorAll(`[data-kind="${k}"]`).forEach(o=>{if(o!==el&&!o.dataset.t){o.value=el.value;FS.vals[+o.dataset.fi]=el.value}});
 if(k=='date'&&el.value){const all=[...document.querySelectorAll('[data-fi]')],i=all.indexOf(el),p=all[i-1];if(p&&p.dataset.kind=='dayname'&&!p.dataset.t){const w=WD[new Date(el.value+'T12:00:00').getDay()];if(w){p.value=w;FS.vals[+p.dataset.fi]=w}}}});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='fill')fillOpen(el.dataset.id);
 else if(a=='fclr'){sv('fc',{});toast('تم مسح بيانات القضية');if(FS)start(FS.id,FS.buf);}
 else if(a=='fdl'&&FS){const o=el.innerHTML;el.innerHTML='<span class="spin"></span> جارٍ تجهيز الملف…';el.classList.add('busy');
  const out=FS.sc.blanks.map((b,i)=>fmt(b.kind,FS.vals[i])),fp=ld('fp',{}),fc=ld('fc',{});
  FS.sc.blanks.forEach((b,i)=>{const v=FS.vals[i];if(!v)return;if(KP.includes(b.kind))fp[b.kind]=v;if(KC.includes(b.kind))fc[b.kind]=v});sv('fp',fp);sv('fc',fc);
  try{const u8=await docxFill(FS.sc,out),name=(byId[FS.id][1]+(fc.A?' - '+fc.A:'')).replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim()+'.docx',type='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
   FS.out={u8,name,blob:new Blob([u8],{type}),file:new File([u8],name,{type}),text:null};resultSheet()}catch(x){el.classList.remove('busy');el.innerHTML=o;toast('تعذّر إنشاء الملف')}}
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
