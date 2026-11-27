/* الحسام سكان — المرحلة N5b (1.16.9): أدوات PDF موجودة على جهازك.
   مكتبتان محليتان تُحمَّلان عند أول استعمال فقط (لا CDN): pdf-lib (MIT) لدمج/تقسيم/تنظيم/نماذج بلا فقد للنص، وPDF.js (Apache-2.0) للمعاينة والتحويل لصور والضغط.
   الأدوات: فتح PDF كصفحات في الاستوديو، دمج PDF وصور، معاينة وتنظيم (تدوير/حذف/ترتيب/استخراج)، تقسيم، ضغط، PDF إلى صور، تعبئة نموذج، حماية بكلمة مرور (AES-128).
   إضافة فقط: لا يُعدَّل docprep.js. كل المعالجة داخل المتصفح ولا يُرفع أي ملف. */
const PX={f:null,mg:[],org:null,th:{},tk:0,sp:{mode:'ranges',txt:'',n:'2'},cp:{lv:'mid',kb:''},im:{fmt:'jpeg',px:'1800',rng:''},ff:[],flat:false,back:'pxhome',zn:''};
(function(){
 const q=s=>document.querySelector(s),E=s=>esc2(String(s==null?'':s)),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const ver=()=>(typeof APP!='undefined'&&APP.version)||'';
 const ld=src=>PX['_'+src]||(PX['_'+src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src+'?v='+ver();s.onload=res;s.onerror=()=>{PX['_'+src]=null;rej(new Error('تعذّر تحميل المكتبة — تحقق من الاتصال (أول استعمال يحتاج إنترنت)'))};document.head.appendChild(s)}));
 const libPL=async()=>{await ld('lib/pdf-lib.min.js');return PDFLib};
 const libJS=async()=>{await ld('lib/pdf.min.js');if(!pdfjsLib.GlobalWorkerOptions.workerSrc)pdfjsLib.GlobalWorkerOptions.workerSrc='lib/pdf.worker.min.js?v='+ver();return pdfjsLib};
 /* ---------- أدوات أساسية ---------- */
 async function jsDoc(f){const js=await libJS();if(f._d)return f._d;
  for(;;){try{f._d=await js.getDocument({data:f.bytes.slice(),password:f.pw||undefined,isEvalSupported:false}).promise;return f._d}
   catch(e){if(e&&e.name=='PasswordException'){const p=prompt(e.code==2?'كلمة المرور غير صحيحة، أعد المحاولة:':'الملف محمي بكلمة مرور. اكتبها لفتحه:');if(p==null)throw new Error('cancel');f.pw=p;f.enc=true;continue}throw e}}}
 /* R1: ملف يفتحه PDF.js ويرفضه pdf-lib (مشفّر بكلمة فارغة، أو غير قياسي/مقطوع الذيل) لا يُسمّى «تالفاً»: تُحوَّل صفحاته لصور بجودة عالية (النص لا يبقى قابلاً للتحديد) ويُنبَّه المستخدم */
 async function rasterDoc(f,L){const n=(await jsDoc(f)).numPages,out=await L.PDFDocument.create();
  for(let p=1;p<=n;p++){pp('تحويل صفحات الملف إلى صور '+p+' / '+n);await wait(0);const c=await rend(f,p,1800),b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.85)),im=await out.embedJpg(new Uint8Array(await b.arrayBuffer())),pg=out.addPage([c._pw,c._ph]);pg.drawImage(im,{x:0,y:0,width:c._pw,height:c._ph});c.width=c.height=1}
  return out}
 async function plDoc(f){const L=await libPL();if(f.enc)throw new Error('enc');if(f._rs)return f._rs;
  try{return await L.PDFDocument.load(f.bytes)}catch(e0){
   try{const d=await rasterDoc(f,L);f._rs=d;f.rast=true;toast('ℹ️ «'+f.name+'» ملف مقيَّد أو غير قياسي: حُوِّلت صفحاته لصور (النص لن يكون قابلاً للتحديد)',6500);return d}
   catch(e1){throw new Error('تعذّرت قراءة «'+f.name+'»: '+String((e1&&e1.message)||e0.message).slice(0,70))}}}
 async function rend(f,p,maxPx){const d=await jsDoc(f),pg=await d.getPage(p),v1=pg.getViewport({scale:1}),k=Math.min(maxPx,3200)/Math.max(v1.width,v1.height),vp=pg.getViewport({scale:k}),c=dpCv(vp.width,vp.height),x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:vp}).promise;pg.cleanup();c._pw=v1.width;c._ph=v1.height;return c}
 async function readPdf(file){toast('⏳ جارٍ قراءة الملف…',1500);const bytes=new Uint8Array(await file.arrayBuffer()),f={name:(file.name||'ملف').replace(/\.pdf$/i,'')||'ملف',bytes,size:bytes.length,n:0,pw:'',enc:false,_d:null};
  try{f.n=(await jsDoc(f)).numPages}catch(e){if(e&&e.message=='cancel')return null;throw new Error('الملف ليس PDF صالحاً أو تالف')}return f}
 const fail=e=>{const m=e&&e.message;if(m=='cancel')return;if(m=='enc')toast('الملف محمي بكلمة مرور: هذه الأداة لا تعمل عليه. استعمل «فتح كصفحات» أو «PDF إلى صور» بعد إدخال كلمة المرور.',6000);else toast('تعذّرت العملية: '+String(m||e).slice(0,90),5000)};
 const prog=t=>sheet('<h2 class="sht">⏳ '+E(t)+'</h2><div class="shm" id="pxp"></div>');const pp=t=>{const e=q('#pxp');if(e)e.textContent=t};
 const chip=(a,v,t,on)=>`<button class="chip ${on?'on':''}" data-act="${a}" data-v="${E(v)}">${t}</button>`;
 const dig=s=>String(s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[،;؛\n]+/g,',');
 const pdfBlob=u=>new Blob([u],{type:'application/pdf'});
 /* مدى صفحات: «1-3, 5, 8-10» ← [[1,2,3],[5],[8,9,10]] أو null إن كان غير صالح */
 function parse(t,n){const out=[];for(const s of dig(t).split(',').map(x=>x.trim()).filter(Boolean)){const m=/^(\d+)(?:\s*[-–—]\s*(\d+))?$/.exec(s);if(!m)return null;const a=+m[1],b=m[2]?+m[2]:a;if(a<1||b<a||b>n)return null;const r=[];for(let i=a;i<=b;i++)r.push(i);out.push(r)}return out.length?out:null}
 PX.parse=parse;
 const rangeOf=(t,n)=>{if(!String(t).trim())return Array.from({length:n},(_,i)=>i+1);const r=parse(t,n);return r?r.flat():null};
 async function thumbOf(f){try{return(await rend(f,1,160)).toDataURL('image/jpeg',0.7)}catch(e){return''}}
 /* ---------- النتائج ---------- */
 function res(files,o){o=o||{};DP.res={files,target:0};PX.back=o.back||'pxhome';PX.zn=o.zip||(PX.f?PX.f.name:'ملفات');
  const cs=navigator.canShare&&(()=>{try{return navigator.canShare({files:files.map(f=>new File([f.blob],f.name,{type:f.type}))})}catch(e){return false}})();
  sheet(`<div class="shh"><h2 class="sht">✔ الملفات جاهزة</h2><button class="lnk" data-act="${PX.back}">← رجوع</button></div>${o.note?`<div class="shm">${o.note}</div>`:''}`+files.map((f,i)=>`<div class="pr"><span><b>${E(f.name)}</b><br><small>${dpKB(f.blob.size)}${f.pages?' · '+f.pages+' صفحة':''}</small></span>${f.type=='application/pdf'&&!HD.off?`<button class="pb" data-act="pxlibsave" data-i="${i}" aria-label="حفظ في مكتبتي">🗄</button>`:''}<button class="pb" data-act="dpsave" data-i="${i}" aria-label="تنزيل">⬇</button></div>`).join('')+`<div class="acts" style="margin-top:10px">${files.length>1?'<button class="btn" data-act="pxzip">🗜 تنزيل الكل (ZIP)</button>':''}${cs?'<button class="btn" data-act="dpshare">📤 مشاركة</button>':''}</div><div class="shm" style="margin-top:8px">راجع الملف قبل رفعه على المنصة.</div>`)}
 /* ---------- الشاشة الرئيسية ---------- */
 function home(){const f=PX.f;
  sheet(`<div class="shh"><h2 class="sht">🧩 أدوات PDF</h2><button class="lnk" data-act="dp">← تجهيز المستندات</button></div><div class="shm">تعمل على ملفات PDF الموجودة على جهازك، <b>بلا رفع لأي خادم</b>. مكتبات المعالجة (نحو 1.9 م.ب) تُحمَّل عند أول استعمال وتُحفظ للعمل دون اتصال.</div><div class="acts one"><label class="btn pri">📄 اختيار ملف PDF<input type="file" id="pxf" accept="application/pdf,.pdf" hidden></label><label class="btn">🔗 دمج عدة ملفات (PDF وصور)<input type="file" id="pxm" accept="application/pdf,.pdf,image/*" multiple hidden></label></div>`+
  (f?`<div class="dpt" style="margin-top:10px"><div class="dpn"><b>📄 ${E(f.name)}</b><small>${f.n} صفحة · ${dpKB(f.size)}${f.enc?' · 🔒 محمي (يُفتح بكلمة المرور)':''}</small></div></div>
  <div class="acts"><button class="btn" data-act="pxorg">👁 معاينة وتنظيم الصفحات</button><button class="btn" data-act="pxstudio">🖋 فتح كصفحات في الاستوديو</button><button class="btn" data-act="pxsplit">✂️ تقسيم</button><button class="btn" data-act="pxcomp">🗜 ضغط</button><button class="btn" data-act="pximg">🖼 PDF إلى صور</button><button class="btn" data-act="pxform">📝 تعبئة نموذج</button><button class="btn span2" data-act="pxlock">🔒 حماية بكلمة مرور</button>${HD.off?'':'<button class="btn span2" data-act="pxsavef">🗄 حفظ هذا الملف في مكتبتي</button>'}</div>`:''))}
 async function setFile(file){try{const f=await readPdf(file);if(f){PX.f=f;PX.org=null;PX.th={};PX.ff=[];home()}}catch(e){fail(e)}}
 PX.openBlob=async(b,name)=>{await setFile(new File([b],name+'.pdf',{type:'application/pdf'}))};
 window.pxOpenBlob=(b,name)=>PX.openBlob(b,name);
 /* ---------- فتح كصفحات في الاستوديو ---------- */
 function studioView(){const f=PX.f,mx=Math.min(f.n,30);
  sheet(`<div class="shh"><h2 class="sht">🖋 فتح كصفحات في الاستوديو</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div><div class="shm">تُحوَّل الصفحات إلى صور داخل مشروع الجلسة لتستعمل القص والتحسين والتعليق والتوقيع والأختام ثم تصدّر PDF جديداً. <b>النص يصبح صورة</b> (غير قابل للتحديد).</div><label class="fld"><span>الصفحات (فارغ = من 1 إلى ${mx}). الملف ${f.n} صفحة، والحد المقترح 30 صفحة لحماية ذاكرة الهاتف</span><input id="pxr" placeholder="مثال: 1-5, 9" value="${f.n>30?'1-30':''}"></label><div class="dkc">${chip('pxsq','1400','عادي (أخف)',PX.sq!='2000')}${chip('pxsq','2000','عالي الدقة',PX.sq=='2000')}</div><button class="btn pri wide" data-act="pxstudiorun">▶ فتح</button>`)}
 async function studioRun(){const f=PX.f,pg=rangeOf((q('#pxr')||{}).value||'',f.n);if(!pg||!pg.length){toast('مدى الصفحات غير صالح',3000);return}
  if(pg.length>60&&!confirm('عدد كبير ('+pg.length+' صفحة) قد يملأ ذاكرة الهاتف. متابعة؟'))return;prog('جارٍ تحويل الصفحات…');const add=[];
  try{for(let i=0;i<pg.length;i++){pp((i+1)+' / '+pg.length);await wait(10);const c=await rend(f,pg[i],+PX.sq||1400);add.push({id:++_dpid,name:f.name+' ص'+pg[i],orig:c,ops:[],size:0,th:null})}}catch(e){fail(e);home();return}
  if(DP.items.length&&!confirm('إضافة '+add.length+' صفحة إلى الصفحات الحالية؟ (إلغاء = استبدالها)'))DP.items=[];DP.items.push(...add);if(!DP.name)DP.name=f.name;DP.res=null;SC.saved=false;dpWork();toast('✔ أُضيفت '+add.length+' صفحة',2500)}
 /* R3: واجهة للمساحة الموحّدة (js/workspace.js): تحويل ملف PDF إلى عناصر صفحات جاهزة لـDP.items دون أي شاشة. تعيد null عند الإلغاء. */
 window.pxToItems=async(file,o)=>{o=o||{};const f=await readPdf(file);if(!f)return null;const mx=o.max||30;if(f.n>mx&&!confirm('«'+f.name+'» '+f.n+' صفحة؛ سيُفتح أول '+mx+' صفحة فقط لحماية ذاكرة الهاتف. متابعة؟'))return null;const n=Math.min(f.n,mx),add=[];for(let i=1;i<=n;i++){if(o.cb)o.cb(i,n);await wait(10);const c=await rend(f,i,+o.px||1400);add.push({id:++_dpid,name:f.name+' ص'+i,orig:c,ops:[],size:0,th:null})}return add};
 window.pxThumb=thumbOf;
 /* ---------- دمج ---------- */
 const MG_PDF=/pdf/i;
 async function mgAdd(files){let bad=0;const bn=[];for(const file of files){try{if(MG_PDF.test(file.type)||/\.pdf$/i.test(file.name)){const f=await readPdf(file);if(!f)continue;if(f.enc){toast('«'+f.name+'» محمي بكلمة مرور — فك الحماية غير مدعوم في الدمج',5000);continue}PX.mg.push(Object.assign(f,{k:'pdf'}))}
   else{const it=await dpLoad(file);if(!it){bad++;bn.push(file.name);continue}const b=await dpBlob(it.orig,'image/jpeg',0.9);PX.mg.push({k:'img',name:it.name,jpg:new Uint8Array(await b.arrayBuffer()),w:it.orig.width,h:it.orig.height,n:1})}}catch(e){bad++;bn.push(file.name)}}
  if(bad)toast('تعذّرت قراءة '+bad+' ملف: '+bn.join('، ').slice(0,120),5500);mgView()}
 function mgView(){const t=PX.mg.reduce((s,x)=>s+x.n,0);
  sheet(`<div class="shh"><h2 class="sht">🔗 دمج (${PX.mg.length} ملف · ${t} صفحة)</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div>`+PX.mg.map((s,i)=>`<div class="pr"><span><b>${s.k=='pdf'?'📄':'🖼'} ${E(s.name)}</b><br><small>${s.n} صفحة</small></span><button class="pb" data-act="pxmgmv" data-i="${i}" data-v="-1">⬆</button><button class="pb" data-act="pxmgmv" data-i="${i}" data-v="1">⬇</button><button class="pb" data-act="pxmgdel" data-i="${i}">🗑</button></div>`).join('')+`<div class="acts" style="margin-top:8px"><label class="btn">➕ إضافة ملفات<input type="file" id="pxma" accept="application/pdf,.pdf,image/*" multiple hidden></label><button class="btn" data-act="pxmgclr">🧹 مسح القائمة</button></div><label class="fld"><span>اسم الملف الناتج</span><input id="pxmn" value="${E(PX.mgn||'مدموج-'+isoD(new Date()))}"></label><button class="btn pri wide" data-act="pxmgrun" ${PX.mg.length<2?'disabled':''}>▶ دمج</button><div class="shm">الدمج بلا فقد: يبقى النص قابلاً للتحديد في ملفات PDF. الصور تُوضع كل صورة في صفحة A4.</div>`)}
 async function mgRun(){PX.mgn=(q('#pxmn')||{}).value;const L=await libPL().catch(fail);if(!L)return;prog('جارٍ الدمج…');
  try{const out=await L.PDFDocument.create();let i=0,okn=0,exp=0;const bad=[],rs=[];
   for(const s of PX.mg){pp((++i)+' / '+PX.mg.length+' — '+s.name);await wait(10);
    try{if(s.k=='pdf'){const src=await plDoc(s),idx=src.getPageIndices(),cp=await out.copyPages(src,idx);cp.forEach(p=>out.addPage(p));exp+=idx.length;okn++;if(s.rast)rs.push(s.name)}
     else{const im=await out.embedJpg(s.jpg),land=s.w>s.h,pw=land?842:595,ph=land?595:842,m=18,k=Math.min((pw-2*m)/s.w,(ph-2*m)/s.h),w=s.w*k,h=s.h*k,pg=out.addPage([pw,ph]);pg.drawImage(im,{x:(pw-w)/2,y:(ph-h)/2,width:w,height:h});exp++;okn++}}
    catch(e){bad.push(s.name+' — '+String((e&&e.message)||e).slice(0,80))}}
   if(!okn)throw new Error('لم يُدمج أي ملف: '+(bad[0]||''));
   if(out.getPageCount()!=exp)throw new Error('عدد صفحات الناتج لا يطابق المتوقع');
   const u=await out.save(),nm=(PX.mgn||'').trim()||'مدموج';
   let note='دُمج '+okn+' من '+PX.mg.length+' ملف ('+out.getPageCount()+' صفحة).';
   if(rs.length)note+='<br>🖼 حُوِّلت لصور لأنها مقيَّدة أو غير قياسية (النص غير قابل للتحديد): '+rs.map(E).join('، ');
   if(bad.length)note+='<br>⚠ تعذّر: '+bad.map(E).join('؛ ');
   res([{name:nm+'.pdf',type:'application/pdf',blob:pdfBlob(u),pages:out.getPageCount()}],{back:'pxmg',zip:nm,note})}
  catch(e){fail(e);mgView()}}
 /* ---------- معاينة وتنظيم ---------- */
 function orgInit(){PX.org={pages:Array.from({length:PX.f.n},(_,i)=>({p:i+1,rot:0,sel:false}))}}
 function orgView(){if(!PX.org)orgInit();const o=PX.org,tk=++PX.tk;
  sheet(`<div class="shh"><h2 class="sht">👁 ${E(PX.f.name)} (${o.pages.length} صفحة)</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div><div class="dkc"><button class="chip" data-act="pxosel" data-v="all">☑ الكل</button><button class="chip" data-act="pxosel" data-v="none">☐ إلغاء</button><button class="chip" data-act="pxorot">↻ تدوير المحدد</button><button class="chip" data-act="pxodel">🗑 حذف المحدد</button><button class="chip" data-act="pxoext">📤 استخراج المحدد</button><button class="chip" data-act="pxoreset">⟲ استعادة الأصل</button></div><div class="shm">المس الصورة لعرضها كبيرة. ثم احفظ PDF جديداً بالترتيب والتدوير والحذف الذي أجريته (بلا فقد للنص).</div><div class="pxg">${o.pages.map((g,i)=>`<div class="pxc ${g.sel?'sel':''}" data-c="${i}"><label class="pxk"><input type="checkbox" data-pxs="${i}" ${g.sel?'checked':''}> ${g.p}</label><div class="pxt" data-act="pxview" data-i="${i}"><img data-th="${g.p}" ${PX.th[g.p]?`src="${PX.th[g.p]}"`:''} style="transform:rotate(${g.rot}deg)" alt=""></div><div class="pxb"><button class="pb" data-act="pxomv" data-i="${i}" data-v="-1" aria-label="قبل">⏵</button><button class="pb" data-act="pxomv" data-i="${i}" data-v="1" aria-label="بعد">⏴</button></div></div>`).join('')}</div><button class="btn pri wide" data-act="pxosave" style="margin-top:10px">💾 حفظ PDF الجديد (${o.pages.length} صفحة)</button>`);thumbs(tk)}
 async function thumbs(tk){for(const g of PX.org.pages){if(PX.tk!=tk)return;if(PX.th[g.p])continue;try{PX.th[g.p]=(await rend(PX.f,g.p,220)).toDataURL('image/jpeg',0.7)}catch(e){PX.th[g.p]='icons/icon-192.png'}
   const im=q('[data-th="'+g.p+'"]');if(im&&PX.tk==tk)im.src=PX.th[g.p];await wait(0)}}
 async function buildOrg(pages){const L=await libPL(),src=await plDoc(PX.f),out=await L.PDFDocument.create(),cp=await out.copyPages(src,pages.map(g=>g.p-1));cp.forEach((pg,i)=>{const r=pages[i].rot%360;if(r)pg.setRotation(L.degrees((pg.getRotation().angle+r)%360));out.addPage(pg)});return out.save()}
 async function pageView(i){const g=PX.org.pages[i];if(!g)return;sheet(`<div class="shh"><h2 class="sht">صفحة ${g.p} من ${PX.f.n}</h2><button class="lnk" data-act="pxorg">← الصفحات</button></div><div class="dpcv" id="pxv"><div class="shm">⏳ جارٍ التحميل…</div></div><div class="acts"><button class="btn" data-act="pxview" data-i="${i-1}" ${i<1?'disabled':''}>→ السابقة</button><button class="btn" data-act="pxview" data-i="${i+1}" ${i>=PX.org.pages.length-1?'disabled':''}>التالية ←</button></div>`);
  try{const c=await rend(PX.f,g.p,Math.round(Math.min(1400,innerWidth*2.2))),v=q('#pxv');if(v)v.innerHTML='<img alt="" style="width:100%;background:#fff;transform:rotate('+g.rot+'deg)" src="'+c.toDataURL('image/jpeg',0.85)+'">'}catch(e){fail(e)}}
 /* ---------- تقسيم ---------- */
 function splitPlan(){const f=PX.f,S=PX.sp;let parts=null;if(S.mode=='ranges')parts=parse(S.txt,f.n);else if(S.mode=='every'){const n=Math.max(1,parseInt(S.n)||0);if(n){parts=[];for(let i=1;i<=f.n;i+=n)parts.push(Array.from({length:Math.min(n,f.n-i+1)},(_,k)=>i+k))}}else parts=Array.from({length:f.n},(_,i)=>[i+1]);return parts}
 function splitView(){const S=PX.sp,pl=splitPlan();
  sheet(`<div class="shh"><h2 class="sht">✂️ تقسيم «${E(PX.f.name)}» (${PX.f.n} صفحة)</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div><div class="dkc">${chip('pxspm','ranges','بمدى صفحات',S.mode=='ranges')}${chip('pxspm','every','كل N صفحة',S.mode=='every')}${chip('pxspm','each','كل صفحة ملف',S.mode=='each')}</div>`+(S.mode=='ranges'?`<label class="fld"><span>كل مدى يصير ملفاً مستقلاً (افصل بفاصلة)</span><input data-px="sptxt" value="${E(S.txt)}" placeholder="مثال: 1-3, 4-6, 7" inputmode="text"></label>`:S.mode=='every'?`<label class="fld"><span>عدد الصفحات في كل ملف</span><input data-px="spn" type="number" min="1" value="${E(S.n)}" inputmode="numeric"></label>`:'')+`<div class="shm" id="pxpl">${splitSum(pl)}</div><button class="btn pri wide" data-act="pxsprun">▶ تقسيم</button>`)}
 const splitSum=pl=>pl?(pl.length>100?'⚠ ':'')+'سيُنتج '+pl.length+' ملف: '+pl.slice(0,6).map(r=>r.length>1?r[0]+'–'+r[r.length-1]:r[0]).join(' · ')+(pl.length>6?' …':''):'⚠ مدى غير صالح (الصفحات من 1 إلى '+PX.f.n+')';
 async function splitRun(){const pl=splitPlan();if(!pl||!pl.length){toast('مدى غير صالح',2500);return}if(pl.length>100&&!confirm('سيُنتج '+pl.length+' ملفاً. متابعة؟'))return;prog('جارٍ التقسيم…');
  try{const L=await libPL(),src=await plDoc(PX.f),files=[];for(let i=0;i<pl.length;i++){pp((i+1)+' / '+pl.length);await wait(5);const r=pl[i],out=await L.PDFDocument.create();(await out.copyPages(src,r.map(p=>p-1))).forEach(p=>out.addPage(p));const u=await out.save();
    files.push({name:PX.f.name+'-ص'+(r.length>1?r[0]+'-'+r[r.length-1]:r[0])+'.pdf',type:'application/pdf',blob:pdfBlob(u),pages:r.length})}
   res(files,{back:'pxsplit'})}catch(e){fail(e);splitView()}}
 /* ---------- ضغط ---------- */
 function compView(){const C=PX.cp;
  sheet(`<div class="shh"><h2 class="sht">🗜 ضغط «${E(PX.f.name)}» (${dpKB(PX.f.size)})</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div><div class="dkc">${chip('pxcpl','light','خفيف (يحفظ النص)',C.lv=='light')}${chip('pxcpl','mid','متوسط',C.lv=='mid')}${chip('pxcpl','strong','قوي',C.lv=='strong')}</div><div class="shm">${C.lv=='light'?'إعادة حفظ بنيوي بلا تغيير للصور. يحفظ النص والروابط، لكن الفرق غالباً صغير.':C.lv=='mid'?'<b>يحوّل كل صفحة إلى صورة</b> بدقة متوسطة (1500 بكسل): ينقص الحجم كثيراً ويصبح النص غير قابل للتحديد.':'<b>يحوّل كل صفحة إلى صورة</b> بدقة أقل (1000 بكسل) لأقصى تصغير؛ جرّب قراءة النص بعدها.'}</div>${C.lv!='light'?`<label class="fld"><span>الحجم المستهدف بالكيلوبايت (اختياري)</span><input data-px="cpkb" type="number" inputmode="numeric" min="30" value="${E(C.kb)}" placeholder="مثال: 500"></label>`:''}<button class="btn pri wide" data-act="pxcprun">▶ ضغط</button>`)}
 async function compRun(){const f=PX.f,C=PX.cp;prog('جارٍ الضغط…');
  try{const L=await libPL();let u,note='';
   if(C.lv=='light'){const d=await plDoc(f);u=await d.save({useObjectStreams:true});if(u.length>=f.size){toast('الملف محسَّن بالفعل — جرّب «متوسط»',4000);compView();return}}
   else{const mx=C.lv=='mid'?1500:1000,N=f.n,tg=Math.round((parseFloat(C.kb)||0)*1024),per=tg?Math.max(6000,(tg-3000)/N):0,out=await L.PDFDocument.create();
    for(let p=1;p<=N;p++){pp(p+' / '+N);await wait(5);const c=await rend(f,p,mx),b=per?await dpEncode(c,'jpeg',per):await dpBlob(c,'image/jpeg',C.lv=='mid'?0.62:0.5),im=await out.embedJpg(new Uint8Array(await b.arrayBuffer())),pg=out.addPage([c._pw,c._ph]);pg.drawImage(im,{x:0,y:0,width:c._pw,height:c._ph})}
    u=await out.save();if(tg&&u.length>tg*1.05)note=' · لم يمكن بلوغ المستهدف '+dpKB(tg)+' دون تدهور شديد'}
   const r=Math.round((1-u.length/f.size)*100);res([{name:f.name+'-مضغوط.pdf',type:'application/pdf',blob:pdfBlob(u),pages:f.n}],{back:'pxcomp',note:'من '+dpKB(f.size)+' إلى '+dpKB(u.length)+(r>0?' (−'+r+'%)':' (لم ينقص)')+note})}
  catch(e){fail(e);compView()}}
 /* ---------- PDF إلى صور ---------- */
 function imgView(){const I=PX.im;
  sheet(`<div class="shh"><h2 class="sht">🖼 «${E(PX.f.name)}» إلى صور</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div><div class="dkc">${chip('pximf','jpeg','JPG (أصغر)',I.fmt=='jpeg')}${chip('pximf','png','PNG',I.fmt=='png')}</div><div class="dkc">${chip('pximp','1200','سريعة 1200',I.px=='1200')}${chip('pximp','1800','عادية 1800',I.px=='1800')}${chip('pximp','2400','عالية 2400',I.px=='2400')}</div><label class="fld"><span>الصفحات (فارغ = الكل، ${PX.f.n} صفحة)</span><input data-px="imrng" value="${E(I.rng)}" placeholder="مثال: 1-3, 7"></label><button class="btn pri wide" data-act="pximrun">▶ تحويل</button>`)}
 async function imgRun(){const f=PX.f,I=PX.im,pg=rangeOf(I.rng,f.n);if(!pg||!pg.length){toast('مدى الصفحات غير صالح',2500);return}prog('جارٍ التحويل…');const files=[],ext=I.fmt=='png'?'png':'jpg',w=String(f.n).length;
  try{for(let i=0;i<pg.length;i++){pp((i+1)+' / '+pg.length);await wait(5);const c=await rend(f,pg[i],+I.px),b=await dpBlob(c,I.fmt=='png'?'image/png':'image/jpeg',I.fmt=='png'?undefined:0.9);files.push({name:f.name+'-ص'+String(pg[i]).padStart(w,'0')+'.'+ext,type:I.fmt=='png'?'image/png':'image/jpeg',blob:b})}
   res(files,{back:'pximg'})}catch(e){fail(e);imgView()}}
 /* ---------- تعبئة نموذج ---------- */
 async function formView(){const f=PX.f;let fields=[];try{const d=await plDoc(f),L=PDFLib;fields=d.getForm().getFields().map(x=>{const nm=x.getName();
   if(x instanceof L.PDFTextField)return{t:'t',nm,v:x.getText()||''};if(x instanceof L.PDFCheckBox)return{t:'c',nm,v:x.isChecked()};
   if(x instanceof L.PDFDropdown||x instanceof L.PDFOptionList)return{t:'s',nm,o:x.getOptions(),v:(x.getSelected()||[])[0]||''};if(x instanceof L.PDFRadioGroup)return{t:'s',nm,o:x.getOptions(),v:x.getSelected()||''};return null}).filter(Boolean)}catch(e){fail(e);home();return}
  PX.ff=fields;
  if(!fields.length){sheet(`<div class="shh"><h2 class="sht">📝 تعبئة نموذج</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div><div class="wn">لا يحتوي هذا الملف حقول نموذج قابلة للتعبئة (AcroForm). قد يكون مستنداً ممسوحاً أو نموذجاً بتقنية XFA غير مدعومة.</div><div class="shm">البديل: افتحه كصفحات في الاستوديو وأضف النص بأداة «نص» في المكان الذي تريد.</div><button class="btn pri wide" data-act="pxstudio">🖋 فتح كصفحات في الاستوديو</button>`);return}
  sheet(`<div class="shh"><h2 class="sht">📝 تعبئة نموذج (${fields.length} حقل)</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div><div class="shm">اكتب القيم ثم احفظ. النص العربي يُرسم على الصفحة كصورة داخل مكان الحقل (يبقى الحقل غير قابل للتعديل لاحقاً)، أما الإنجليزي والأرقام فتبقى حقولاً حيّة.</div>`+fields.slice(0,150).map((e,i)=>e.t=='c'?`<label class="mwk"><input type="checkbox" data-pxfi="${i}" ${e.v?'checked':''}> ${E(e.nm)}</label>`:e.t=='s'?`<label class="fld"><span>${E(e.nm)}</span><select data-pxfi="${i}"><option value=""></option>${e.o.map(o=>`<option ${o==e.v?'selected':''}>${E(o)}</option>`).join('')}</select></label>`:`<label class="fld"><span>${E(e.nm)}</span><input data-pxfi="${i}" value="${E(e.v)}"></label>`).join('')+(fields.length>150?'<div class="shm">عُرض أول 150 حقلاً فقط.</div>':'')+`<label class="mwk"><input type="checkbox" data-px="flat"> تسطيح النموذج (لا يعود قابلاً للتعديل)</label><button class="btn pri wide" data-act="pxformrun">💾 حفظ النموذج</button>`)}
 async function drawField(doc,x,txt){const pages=doc.getPages();for(const w of x.acroField.getWidgets()){const r=w.getRectangle(),pg=pages.find(p=>{const an=p.node.Annots();return an&&an.asArray().some(ref=>doc.context.lookup(ref)===w.dict)});if(!pg)continue;
   const S=4,cw=Math.max(8,Math.round(r.width*S)),ch=Math.max(8,Math.round(r.height*S)),c=dpCv(cw,ch),cx=c.getContext('2d'),rtl=/[؀-ۿ]/.test(txt),pd=2*S;let fs=Math.min(ch*0.72,14*S);
   const F=z=>z+'px Tajawal,Tahoma,Arial,sans-serif';cx.font=F(fs);while(fs>8&&cx.measureText(txt).width>cw-2*pd){fs-=2;cx.font=F(fs)}
   cx.fillStyle='#000';cx.textBaseline='middle';cx.direction=rtl?'rtl':'ltr';cx.textAlign=rtl?'right':'left';cx.fillText(txt,rtl?cw-pd:pd,ch/2);
   const png=await doc.embedPng(new Uint8Array(await (await dpBlob(c,'image/png')).arrayBuffer()));pg.drawImage(png,{x:r.x,y:r.y,width:r.width,height:r.height})}}
 async function formRun(){prog('جارٍ حفظ النموذج…');
  try{const L=await libPL(),doc=await plDoc(PX.f),form=doc.getForm();let bad=0;
   for(const e of PX.ff){try{const x=form.getField(e.nm);if(e.t=='t'){if(/^[\x20-\x7E -ÿ]*$/.test(e.v))x.setText(e.v||undefined);else{await drawField(doc,x,e.v);form.removeField(x)}}else if(e.t=='c'){e.v?x.check():x.uncheck()}else if(e.v)x.select(e.v)}catch(er){bad++}}
   if(PX.flat)form.flatten();const u=await doc.save();res([{name:PX.f.name+'-معبّأ.pdf',type:'application/pdf',blob:pdfBlob(u),pages:doc.getPageCount()}],{back:'pxform',note:bad?'⚠ تعذّرت تعبئة '+bad+' حقل':''})}
  catch(e){fail(e);home()}}
 /* ---------- حماية بكلمة مرور (AES-128، معيار PDF 1.6) ---------- */
 const KK=Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0),SS=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
 function md5(m){const n=m.length,len=((n+8>>6)+1)<<6,b=new Uint8Array(len);b.set(m);b[n]=0x80;const dv=new DataView(b.buffer);dv.setUint32(len-8,(n*8)>>>0,true);dv.setUint32(len-4,Math.floor(n/536870912),true);
  let a0=0x67452301,b0=0xefcdab89|0,c0=0x98badcfe|0,d0=0x10325476;
  for(let o=0;o<len;o+=64){const M=[];for(let i=0;i<16;i++)M[i]=dv.getUint32(o+i*4,true);let A=a0,B=b0,C=c0,D=d0;
   for(let i=0;i<64;i++){let F,g;if(i<16){F=(B&C)|(~B&D);g=i}else if(i<32){F=(D&B)|(~D&C);g=(5*i+1)%16}else if(i<48){F=B^C^D;g=(3*i+5)%16}else{F=C^(B|~D);g=(7*i)%16}
    const s=SS[(i>>4)*4+(i%4)];F=(F+A+KK[i]+M[g])|0;A=D;D=C;C=B;B=(B+((F<<s)|(F>>>(32-s))))|0}
   a0=(a0+A)|0;b0=(b0+B)|0;c0=(c0+C)|0;d0=(d0+D)|0}
  const out=new Uint8Array(16),ov=new DataView(out.buffer);[a0,b0,c0,d0].forEach((v,i)=>ov.setUint32(i*4,v>>>0,true));return out}
 function rc4(key,data){const s=new Uint8Array(256);for(let i=0;i<256;i++)s[i]=i;let j=0;for(let i=0;i<256;i++){j=(j+s[i]+key[i%key.length])&255;const t=s[i];s[i]=s[j];s[j]=t}
  const o=new Uint8Array(data.length);let a=0,b=0;for(let k=0;k<data.length;k++){a=(a+1)&255;b=(b+s[a])&255;let t=s[a];s[a]=s[b];s[b]=t;o[k]=data[k]^s[(s[a]+s[b])&255]}return o}
 const cat=(...a)=>{const o=new Uint8Array(a.reduce((s,x)=>s+x.length,0));let p=0;a.forEach(x=>{o.set(x,p);p+=x.length});return o},hex=u=>[...u].map(b=>b.toString(16).padStart(2,'0')).join('');
 const PAD=Uint8Array.from([0x28,0xBF,0x4E,0x5E,0x4E,0x75,0x8A,0x41,0x64,0x00,0x4E,0x56,0xFF,0xFA,0x01,0x08,0x2E,0x2E,0x00,0xB6,0xD0,0x68,0x3E,0x80,0x2F,0x0C,0xA9,0xFE,0x64,0x53,0x69,0x7A]);
 const padPw=s=>cat(Uint8Array.from([...s].map(c=>c.charCodeAt(0)&255)),PAD).slice(0,32);
 PX.pwOk=s=>/^[\x20-\x7E]{1,32}$/.test(s||'');
 async function pxEncrypt(bytes,pw){if(!PX.pwOk(pw))throw new Error('كلمة المرور: أحرف وأرقام إنجليزية فقط (حتى 32) لتعمل في كل القارئات');
  const L=await libPL(),doc=await L.PDFDocument.load(bytes),ctx=doc.context,P=-4;
  let h=md5(padPw(pw));for(let i=0;i<50;i++)h=md5(h);const ok=h.slice(0,16);let O=rc4(ok,padPw(pw));for(let i=1;i<=19;i++)O=rc4(ok.map(b=>b^i),O);
  const ID=crypto.getRandomValues(new Uint8Array(16)),Pb=new Uint8Array(4);new DataView(Pb.buffer).setInt32(0,P,true);
  let k=md5(cat(padPw(pw),O,Pb,ID));for(let i=0;i<50;i++)k=md5(k.slice(0,16));k=k.slice(0,16);
  let U=rc4(k,md5(cat(PAD,ID)));for(let i=1;i<=19;i++)U=rc4(k.map(b=>b^i),U);U=cat(U,new Uint8Array(16));
  const isStr=v=>v instanceof L.PDFString||v instanceof L.PDFHexString;
  const walk=async(o,aes)=>{const D=o instanceof L.PDFStream?o.dict:o;
   if(D instanceof L.PDFDict){for(const[n,v]of D.entries()){if(isStr(v))D.set(n,L.PDFHexString.of(hex(await aes(v.asBytes()))));else if(v instanceof L.PDFDict||v instanceof L.PDFArray)await walk(v,aes)}}
   else if(D instanceof L.PDFArray){for(let i=0;i<D.size();i++){const v=D.get(i);if(isStr(v))D.set(i,L.PDFHexString.of(hex(await aes(v.asBytes()))));else if(v instanceof L.PDFDict||v instanceof L.PDFArray)await walk(v,aes)}}};
  const tyOf=o=>{const t=(o instanceof L.PDFStream?o.dict:o).get&&(o instanceof L.PDFStream?o.dict:o).get(L.PDFName.of('Type'));return t&&t.toString()};
  for(const[ref,o]of ctx.enumerateIndirectObjects()){if(o instanceof L.PDFStream){const t=tyOf(o);if(t=='/XRef'||t=='/ObjStm'){ctx.delete(ref);continue}}
   const n=ref.objectNumber,g=ref.generationNumber,ky=md5(cat(k,Uint8Array.of(n&255,(n>>8)&255,(n>>16)&255,g&255,(g>>8)&255,0x73,0x41,0x6C,0x54))).slice(0,16),ck=await crypto.subtle.importKey('raw',ky,'AES-CBC',false,['encrypt']);
   const aes=async d=>{const iv=crypto.getRandomValues(new Uint8Array(16));return cat(iv,new Uint8Array(await crypto.subtle.encrypt({name:'AES-CBC',iv},ck,d)))};
   await walk(o,aes);
   if(o instanceof L.PDFStream){if(o.updateDict)o.updateDict();const e=await aes(o.getContents());o.dict.set(L.PDFName.of('Length'),ctx.obj(e.length));ctx.assign(ref,L.PDFRawStream.of(o.dict,e))}}
  const enc=ctx.register(ctx.obj({Filter:'Standard',V:4,R:4,Length:128,CF:{StdCF:{AuthEvent:'DocOpen',CFM:'AESV2',Length:16}},StmF:'StdCF',StrF:'StdCF',O:L.PDFHexString.of(hex(O)),U:L.PDFHexString.of(hex(U)),P}));
  ctx.trailerInfo.Encrypt=enc;ctx.trailerInfo.ID=ctx.obj([L.PDFHexString.of(hex(ID)),L.PDFHexString.of(hex(ID))]);
  return doc.save({useObjectStreams:false})}
 window.pxEncrypt=pxEncrypt;window.pxLib=libPL;window.pxJs=libJS;
 function lockView(){const f=PX.f;
  sheet(`<div class="shh"><h2 class="sht">🔒 حماية «${E(f.name)}»</h2><button class="lnk" data-act="pxhome">← الأدوات</button></div>${f.enc?'<div class="wn">هذا الملف محمي أصلاً ولا يمكن إعادة حمايته هنا.</div>':`<div class="shm">يُشفَّر الملف بـAES-128 وتُطلب كلمة المرور لفتحه في أي قارئ. <b>إن نسيتها فلا يمكن استرجاع الملف</b>. استعمل أحرفاً وأرقاماً إنجليزية (حتى 32 حرفاً).</div><label class="fld"><span>كلمة المرور</span><input id="pxpw" type="password" autocomplete="new-password"></label><label class="fld"><span>أعد كتابتها</span><input id="pxpw2" type="password" autocomplete="new-password"></label><button class="btn pri wide" data-act="pxlockrun">🔒 حماية</button><div class="shm">الحماية تمنع الفتح بلا كلمة المرور، لكنها ليست حماية مطلقة ضد من يملك الملف وقدرة على التخمين؛ اختر كلمة قوية.</div>`}`)}
 async function lockRun(){const a=q('#pxpw').value,b=q('#pxpw2').value;if(a!=b){toast('كلمتا المرور غير متطابقتين',2500);return}if(!PX.pwOk(a)){toast('أحرف وأرقام إنجليزية فقط (حتى 32)',3500);return}prog('جارٍ التشفير…');
  try{const u=await pxEncrypt(PX.f.bytes,a);res([{name:PX.f.name+'-محمي.pdf',type:'application/pdf',blob:pdfBlob(u),pages:PX.f.n,enc:1}],{back:'pxhome',note:'🔒 الملف محمي بكلمة مرور. احتفظ بها في مكان آمن.'})}catch(e){fail(e);lockView()}}
 /* ---------- تصدير الاستوديو (PDF) بكلمة مرور ---------- */
 {const _r=dpRun;window.dpRun=dpRun=function(){if(DP.pw&&DP.out=='pdf'&&!PX.pwOk(DP.pw)){toast('كلمة مرور الملف: أحرف وأرقام إنجليزية فقط (حتى 32)',4000);return}return _r.apply(this,arguments)}}
 {const _d=dpResult;window.dpResult=dpResult=function(){const R=DP.res;if(DP.pw&&DP.out=='pdf'&&R&&R.files.some(f=>f.type=='application/pdf'&&!f.enc)){toast('🔒 جارٍ تشفير الملف…',4000);
   (async()=>{try{for(const f of R.files)if(f.type=='application/pdf'&&!f.enc){f.blob=pdfBlob(await pxEncrypt(new Uint8Array(await f.blob.arrayBuffer()),DP.pw));f.enc=1}}catch(e){toast('تعذّر التشفير: '+String(e.message).slice(0,80),5000);dpWork();return}_d.call(window);const m=q('#sh .shm');if(m)m.insertAdjacentHTML('beforeend',' · 🔒 محمي بكلمة مرور')})();return}
   return _d.apply(this,arguments)}}
 {const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{const sh=q('#sh'),b=sh&&sh.querySelector('[data-act="dprun"]');if(b&&DP.out=='pdf')b.insertAdjacentHTML('beforebegin','<label class="fld"><span>🔒 كلمة مرور لفتح الـPDF (اختياري — أحرف وأرقام إنجليزية)</span><input data-dp="pw" type="password" autocomplete="new-password" value="'+E(DP.pw||'')+'"></label>')}catch(e){}return r}}
 /* ---------- الأحداث ---------- */
 document.addEventListener('change',async e=>{const el=e.target,id=el.id;
  if(id=='pxf'){const f=el.files[0];el.value='';if(f)await setFile(f)}
  else if(id=='pxm'||id=='pxma'){const fl=[...el.files];el.value='';if(fl.length){if(id=='pxm')PX.mg=[];await mgAdd(fl)}}
  else if(el.dataset&&el.dataset.pxs!=null){const g=PX.org.pages[+el.dataset.pxs];if(g){g.sel=el.checked;const c=q('[data-c="'+el.dataset.pxs+'"]');if(c)c.classList.toggle('sel',g.sel)}}
  else if(el.dataset&&el.dataset.pxfi!=null){const g=PX.ff[+el.dataset.pxfi];if(g)g.v=el.type=='checkbox'?el.checked:el.value}
  else if(el.dataset&&el.dataset.px=='flat')PX.flat=el.checked});
 document.addEventListener('input',e=>{const el=e.target,k=el.dataset&&el.dataset.px;if(el.dataset&&el.dataset.pxfi!=null&&el.type!='checkbox'){const g=PX.ff[+el.dataset.pxfi];if(g)g.v=el.value}
  if(k=='sptxt'||k=='spn'){PX.sp[k=='sptxt'?'txt':'n']=el.value;const m=q('#pxpl');if(m)m.textContent=splitSum(splitPlan())}else if(k=='cpkb')PX.cp.kb=el.value;else if(k=='imrng')PX.im.rng=el.value});
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;if(a[0]!='p'||a[1]!='x')return;const i=+el.dataset.i,v=el.dataset.v;
  try{
  if(a=='pxhome')home();
  else if(a=='pxorg'){if(!PX.f)return;orgView()}
  else if(a=='pxstudio'){studioView()}else if(a=='pxsq'){PX.sq=v;studioView()}else if(a=='pxstudiorun')await studioRun();
  else if(a=='pxsplit')splitView();else if(a=='pxspm'){PX.sp.mode=v;splitView()}else if(a=='pxsprun')await splitRun();
  else if(a=='pxcomp')compView();else if(a=='pxcpl'){PX.cp.lv=v;compView()}else if(a=='pxcprun')await compRun();
  else if(a=='pximg')imgView();else if(a=='pximf'){PX.im.fmt=v;imgView()}else if(a=='pximp'){PX.im.px=v;imgView()}else if(a=='pximrun')await imgRun();
  else if(a=='pxform')await formView();else if(a=='pxformrun')await formRun();
  else if(a=='pxlock')lockView();else if(a=='pxlockrun')await lockRun();
  else if(a=='pxmg'){mgView()}else if(a=='pxmgrun')await mgRun();else if(a=='pxmgclr'){PX.mg=[];mgView()}
  else if(a=='pxmgdel'){PX.mg.splice(i,1);mgView()}else if(a=='pxmgmv'){const j=i+ +v;if(j>=0&&j<PX.mg.length){[PX.mg[i],PX.mg[j]]=[PX.mg[j],PX.mg[i]]}mgView()}
  else if(a=='pxview')pageView(i);
  else if(a=='pxosel'){PX.org.pages.forEach(g=>g.sel=v=='all');orgView()}
  else if(a=='pxorot'){const s=PX.org.pages.filter(g=>g.sel);if(!s.length)toast('حدّد صفحات أولاً',1800);else{s.forEach(g=>g.rot=(g.rot+90)%360);orgView()}}
  else if(a=='pxodel'){const s=PX.org.pages.filter(g=>g.sel);if(!s.length)toast('حدّد صفحات أولاً',1800);else if(s.length==PX.org.pages.length)toast('لا يمكن حذف كل الصفحات',2200);else{PX.org.pages=PX.org.pages.filter(g=>!g.sel);orgView()}}
  else if(a=='pxoreset'){orgInit();orgView()}
  else if(a=='pxomv'){const j=i+ +v,p=PX.org.pages;if(j>=0&&j<p.length){[p[i],p[j]]=[p[j],p[i]]}orgView()}
  else if(a=='pxoext'){const s=PX.org.pages.filter(g=>g.sel);if(!s.length){toast('حدّد صفحات أولاً',1800);return}prog('جارٍ الاستخراج…');try{const u=await buildOrg(s);res([{name:PX.f.name+'-مستخرج.pdf',type:'application/pdf',blob:pdfBlob(u),pages:s.length}],{back:'pxorg'})}catch(x){fail(x);orgView()}}
  else if(a=='pxosave'){prog('جارٍ الحفظ…');try{const u=await buildOrg(PX.org.pages);res([{name:PX.f.name+'-معدّل.pdf',type:'application/pdf',blob:pdfBlob(u),pages:PX.org.pages.length}],{back:'pxorg'})}catch(x){fail(x);orgView()}}
  else if(a=='pxzip'){const ents=[];for(const f of DP.res.files){const u8=new Uint8Array(await f.blob.arrayBuffer());ents.push({name:f.name,method:0,time:0,date:0x21,crc:crc32(u8),cs:u8.length,us:u8.length,raw:u8})}dpSave({name:(PX.zn||'ملفات')+'.zip',blob:new Blob([zipWrite(ents)],{type:'application/zip'})})}
  else if(a=='pxlibsave'){if(typeof proGate=='function'&&!proGate('hlib'))return;const f=DP.res.files[i];if(!f)return;const u=new Uint8Array(await f.blob.arrayBuffer());let th='';try{th=await thumbOf({bytes:u,pw:'',name:f.name})}catch(x){}await HD.addPdf(f.name.replace(/\.pdf$/i,''),u,th);toast('🗄 حُفظ في مكتبتك',2000)}
  else if(a=='pxsavef'){if(typeof proGate=='function'&&!proGate('hlib'))return;const f=PX.f;if(f){await HD.addPdf(f.name,f.bytes,await thumbOf(f));toast('🗄 حُفظ في مكتبتك',2000)}}
  }catch(x){fail(x)}});
})();
