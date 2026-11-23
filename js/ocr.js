/* الحسام سكان — المرحلة N7 (1.16.11): التعرف على النص (OCR) محلياً وقارئ QR.
   Tesseract.js (Apache-2.0) داخل المشروع في lib/ocr/. ملفاته (~16 م.ب: المحرك + بيانات العربية والإنجليزية) تُنزَّل مرة واحدة بموافقتك وتُحفظ في كاش دائم باسم hscan-ocr
   (لا يُمسح عند تحديث التطبيق) ثم يعمل OCR دون إنترنت. لا يُرفع أي مستند لأي خادم.
   التصدير: TXT وWord (RTL) وPDF قابل للبحث (طبقة نص غير مرئية). تصحيح النص يدوياً. قارئ QR/باركود (BarcodeDetector ثم jsQR). إضافة فقط: لا يُعدَّل docprep.js. */
const OC={lang:'ara+eng',run:false,words:0,prep:true,mode:'block'};
(function(){
 const q=s=>document.querySelector(s),E=s=>esc2(String(s==null?'':s)),wait=ms=>new Promise(r=>setTimeout(r,ms));
 const BASE=new URL('lib/ocr/',location.href).href,CACHE='hscan-ocr';
 const SIMD=[0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11],RELAX=[0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,15,1,13,0,65,1,253,15,65,2,253,15,253,128,2,11];
 const core=()=>{try{if(WebAssembly.validate(Uint8Array.from(RELAX)))return'relaxedsimd-lstm'}catch(e){}try{if(WebAssembly.validate(Uint8Array.from(SIMD)))return'simd-lstm'}catch(e){}return'lstm'};
 const need=l=>['tesseract.min.js','worker.min.js','core/tesseract-core-'+core()+'.wasm.js',...l.split('+').map(x=>'lang/'+x+'.traineddata.gz')];
 const loadJs=src=>OC['_'+src]||(OC['_'+src]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>{OC['_'+src]=null;rej(new Error('تعذّر تحميل '+src))};document.head.appendChild(s)}));
 /* ---------- ملفات OCR: التحقق من وجودها وتنزيلها بموافقتك ---------- */
 async function cached(l){try{const c=await caches.open(CACHE);for(const f of need(l))if(!await c.match(BASE+f))return false;return true}catch(e){return false}}
 async function prefetch(l,upd){const c=await caches.open(CACHE),fs=need(l);let i=0;
  for(const f of fs){upd(f,i,fs.length);if(!await c.match(BASE+f)){const r=await fetch(BASE+f);if(!r.ok)throw new Error('تعذّر تنزيل '+f);await c.put(BASE+f,r.clone());await r.arrayBuffer().catch(()=>{})}i++}upd('',fs.length,fs.length)}
 async function ensure(l){if(await cached(l))return true;
  const mb=l=='ara+eng'?'نحو 16':l=='ara'?'نحو 8':'نحو 9';
  if(!confirm('التعرف على النص يحتاج تنزيل ملفات المحرك واللغة ('+mb+' م.ب) مرة واحدة، ثم يعمل دون إنترنت. تنزيلها يستهلك باقة الإنترنت. متابعة؟'))return false;
  sheet('<h2 class="sht">⬇ تنزيل ملفات التعرف على النص</h2><div class="shm" id="ocp">…</div>');
  try{await prefetch(l,(f,i,n)=>{const e=q('#ocp');if(e)e.textContent=(i+1>n?n:i+1)+' / '+n+(f?' — '+f.split('/').pop():'')})}catch(e){toast('تعذّر التنزيل: '+String(e.message).slice(0,80)+' — تحقق من الاتصال',5000);return false}
  return true}
 async function worker(l,logger){await loadJs(BASE+'tesseract.min.js');return Tesseract.createWorker(l.split('+'),1,{workerPath:BASE+'worker.min.js',corePath:BASE+'core',langPath:BASE+'lang',cacheMethod:'none',workerBlobURL:false,gzip:true,logger})}
 /* ---------- التشغيل ---------- */
 const ocrCanvas=it=>{let c=dpRender(it);const m=Math.max(c.width,c.height);if(m>3000)c=dpScale(c,3000/m);return c};
 /* Tesseract يعيد كلمات العربية بترتيب «بصري» (معكوسة)، وسطر النص بترتيب منطقي؛ نعيد الكلمة إلى الترتيب المنطقي ليعمل البحث والنسخ في PDF */
 const fixRtl=t=>/[\u0600-\u06FF]/.test(t)?[...t].reverse().join('').replace(/[0-9A-Za-z\u0660-\u0669\u06F0-\u06F9][0-9A-Za-z\u0660-\u0669\u06F0-\u06F9.,:\/@_-]*/g,m=>[...m].reverse().join('')):t;
 OC.fixRtl=fixRtl;
 function parseWords(d){const w=[];for(const b of d.blocks||[])for(const p of b.paragraphs||[])for(const l of p.lines||[]){const ws=(l.words||[]).filter(x=>x.text&&x.text.trim());ws.forEach((x,i)=>w.push({t:fixRtl(x.text.trim()),x0:x.bbox.x0,y0:x.bbox.y0,x1:x.bbox.x1,y1:x.bbox.y1,e:i==ws.length-1}))}return w}
 async function runOcr(idx){const l=OC.lang;if(OC.run)return;if(!await ensure(l)){ocrHome();return}OC.run=true;
  sheet('<h2 class="sht">🔤 جارٍ التعرف على النص…</h2><div class="shm" id="ocp">تحضير المحرك…</div>');let w=null;
  try{let cur='',pct=0,note='';const upd=()=>{const e=q('#ocp');if(e)e.textContent=cur+(note?' — '+note:'')+' — '+pct+'%'};
   w=await worker(l,m=>{if(m.status=='recognizing text'){pct=Math.round(m.progress*100);upd()}});
   for(let k=0;k<idx.length;k++){const it=DP.items[idx[k]];cur='الصفحة '+(k+1)+' من '+idx.length;pct=0;upd();await wait(10);
    const c=ocrCanvas(it);let o=null;note='';
    /* N11: تحضير الصورة (إزالة أختام/ظلال/إطارات، تصحيح الميل والحجم) ثم التعرف؛ أي فشل ⇒ المسار القديم نفسه */
    if(OC.prep!==false&&typeof OP!='undefined'&&OP.recognize){try{const r=await OP.recognize(w,c,{mode:OC.mode,fixRtl,stage:m=>{note=m;upd()}});
      o={text:r.text,words:r.words,w:c.width,h:c.height,conf:r.conf,lang:l,dropped:r.dropped,pi:r.info};it._ocrPrev=OP.preview()}catch(e){console.warn('N11 prep failed',e);o=null;it._ocrPrev=null}}
    if(!o){if(typeof OP!='undefined'&&OP.setPsm)await OP.setPsm(w,3);const b=await dpBlob(c,'image/png'),r=await w.recognize(b,{},{blocks:true,text:true});
     o={text:(r.data.text||'').replace(/\r/g,'').trim(),words:parseWords(r.data),w:c.width,h:c.height,conf:Math.round(r.data.confidence||0),lang:l}}
    it._ocr=o}
   OC.idx=idx;SC.saved=false;ocrRes()}
  catch(e){toast('تعذّر التعرف على النص: '+String(e&&e.message||e).slice(0,100),6000);ocrHome()}
  finally{OC.run=false;if(w)try{await w.terminate()}catch(x){}}}
 /* ---------- الشاشات ---------- */
 const nSel=()=>DP.items.filter(i=>ST.sel.has(i.id)).length;
 function ocrHome(){
  sheet(`<div class="shh"><h2 class="sht">🔤 التعرف على النص (OCR)</h2><button class="lnk" data-act="dpwork">← الصفحات</button></div><div class="shm">يستخرج النص العربي والإنجليزي من الصفحات على جهازك، ثم تصحّحه وتصدّره Word أو TXT أو PDF قابلاً للبحث. أفضل نتيجة مع صورة واضحة مقصوصة ومستقيمة (استعمل «🪄 قص + اتجاه + ميلان» و«مسح ضوئي» قبلها).</div><div class="dkc">${[['ara+eng','عربي + إنجليزي'],['ara','عربي فقط'],['eng','إنجليزي فقط']].map(x=>`<button class="chip ${OC.lang==x[0]?'on':''}" data-act="ocrlang" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><div class="shm"><b>تحسين الصورة قبل التعرف (N11)</b> — يزيل الأختام والتواقيع الكبيرة والإطارات والظلال ويصحّح الميل والحجم تلقائياً قبل قراءة النص.</div><div class="dkc"><button class="chip ${OC.prep!==false?'on':''}" data-act="ocrprep" data-v="1">✔ تحسين مفعّل</button><button class="chip ${OC.prep===false?'on':''}" data-act="ocrprep" data-v="0">بدون تحسين</button></div>${OC.prep!==false?`<div class="dkc"><button class="chip ${OC.mode!='lines'?'on':''}" data-act="ocrmode" data-v="block">كتلة (الأنسب غالباً)</button><button class="chip ${OC.mode=='lines'?'on':''}" data-act="ocrmode" data-v="lines">سطراً سطراً (ترتيب صارم)</button></div>`:''}<div class="acts one"><button class="btn pri" data-act="ocrrun" data-v="all">▶ التعرف على كل الصفحات (${DP.items.length})</button>${nSel()?`<button class="btn" data-act="ocrrun" data-v="sel">▶ المحددة فقط (${nSel()})</button>`:''}${DP.items.some(i=>i._ocr)?'<button class="btn" data-act="ocrres">📄 عرض النتائج الحالية</button>':''}</div><div class="shm">الدقة تتفاوت: الطباعة الواضحة جيدة، والخط اليدوي والصور الضعيفة تحتاج مراجعتك. راجع الأرقام والأسماء دائماً قبل الاعتماد عليها.</div>`)}
 function ocrRes(){const idx=DP.items.map((it,i)=>it._ocr?i:-1).filter(i=>i>=0);
  if(!idx.length){ocrHome();return}
  sheet(`<div class="shh"><h2 class="sht">📄 نتائج النص (${idx.length} صفحة)</h2><button class="lnk" data-act="dpwork">← الصفحات</button></div><div class="shm">صحّح النص هنا مباشرة؛ تعديلاتك تُستعمل في كل التصديرات وتُحفظ في مكتبتك.</div>`+idx.map(i=>{const it=DP.items[i],o=it._ocr;return`<label class="fld"><span>${E(it.name)} — ثقة ${o.conf==null?'—':o.conf+'%'}${o.conf!=null&&o.conf<70?' ⚠ راجع بعناية':''}</span><textarea class="octa" data-oc="${i}" rows="8" dir="auto">${E(o.text)}</textarea></label>${o.dropped&&o.dropped.length?`<div class="shm">استُبعد ${o.dropped.length} مقطعاً قليل الثقة (غالباً أختام أو خط يدوي): <span dir="auto">${E(o.dropped.slice(0,6).join(' ؛ ').slice(0,160))}</span></div>`:''}${it._ocrPrev?`<button class="btn" data-act="ocprev" data-i="${i}">🔍 ما رآه المحرك (الصورة بعد التحضير)</button>`:''}`}).join('')+`<div class="acts"><button class="btn" data-act="occopy">📋 نسخ الكل</button><button class="btn" data-act="octxt">⬇ TXT</button><button class="btn" data-act="ocdocx">📝 Word</button><button class="btn" data-act="ocpdf">📄 PDF قابل للبحث</button><button class="btn span2" data-act="exopen">🧾 استخراج بيانات قانونية (تواريخ · قضايا · أطراف · جداول)</button><button class="btn span2" data-act="ocropen">🔁 إعادة التعرف / لغة أخرى</button></div>`)}
 function ocPrev(i){const it=DP.items[i],o=it&&it._ocr;if(!it||!it._ocrPrev){ocrRes();return}const p=o.pi||{};
  const rows=[['ارتفاع النص المقدَّر',p.H?p.H+' بكسل':'—'],['الميلان المصحَّح',p.rotated?p.skew+'°':'لا حاجة'],['تكبير/تصغير',p.scale&&p.scale!=1?'×'+p.scale:'لا'],['أختام وتواقيع وكتل محذوفة',(p.blobs||0)+(p.inner?' (+'+p.inner+' داخل ختم)':'')],['خطوط وإطارات محذوفة',(p.lines||0)+(p.frames||0)+(p.runPx?' (+خطوط طويلة)':'')],['حبر ملوّن ممحو',p.colorFrac?(p.colorFrac*100).toFixed(2)+'% من الصفحة':(p.colorOff?'معطّل (صفحة ملوّنة)':'لا')],['غبار محذوف',p.specks||0],['وقت التحضير',p.ms?p.ms+' م.ث':'—']];
  sheet(`<div class="shh"><h2 class="sht">🔍 ما رآه المحرك — ${E(it.name)}</h2><button class="lnk" data-act="ocrres">← النتائج</button></div><div class="shm">هذه الصورة التي قرأ منها المحرك بعد التحضير. إن ظهر فيها نص ناقص أو ختم باقٍ فأرسل لي الصورة الأصلية مع هذه الصورة.</div><img src="${it._ocrPrev}" alt="" style="width:100%;border-radius:10px;border:1px solid #8884;background:#fff">`+rows.map(r=>`<div class="pr"><span>${r[0]}</span><b>${E(r[1])}</b></div>`).join(''))}
 const allText=()=>DP.items.map(it=>it._ocr&&it._ocr.text).filter(t=>t!=null);
 /* ---------- TXT وWord ---------- */
 const txtOut=()=>{const p=DP.items.filter(i=>i._ocr).map((it,k,a)=>(a.length>1?'— '+it.name+' —\n\n':'')+it._ocr.text);return p.join('\n\n\n')};
 const xe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
 function docxBytes(pages){const ar=t=>{const a=(t.match(/[؀-ۿ]/g)||[]).length,l=(t.match(/[A-Za-z]/g)||[]).length;return a>=l};
  const paras=t=>t.split(/\n\s*\n/).map(x=>x.replace(/\s*\n\s*/g,' ').trim()).filter(Boolean).map(x=>{const r=ar(x);return`<w:p><w:pPr>${r?'<w:bidi/>':''}</w:pPr><w:r><w:rPr>${r?'<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:bidi="ar-SA"/>':'<w:sz w:val="24"/>'}</w:rPr><w:t xml:space="preserve">${xe(x)}</w:t></w:r></w:p>`}).join('')||'<w:p/>';
  const body=pages.map((t,i)=>paras(t)+(i<pages.length-1?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':'')).join('');
  const TE=new TextEncoder(),mk=(n,s)=>{const u=TE.encode(s);return{name:n,method:0,time:0,date:0x21,crc:crc32(u),cs:u.length,us:u.length,raw:u}};
  return zipWrite([mk('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
   mk('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
   mk('word/document.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>')])}
 OC.docxBytes=docxBytes;
 /* ---------- PDF قابل للبحث: صورة الصفحة + طبقة نص غير مرئية بخط بلا رسوم (GlyphLess) ---------- */
 const u16=cp=>{if(cp>0xFFFF){const v=cp-0x10000;return(0xD800+(v>>10)).toString(16).padStart(4,'0')+(0xDC00+(v&0x3FF)).toString(16).padStart(4,'0')}return cp.toString(16).padStart(4,'0')};
 async function searchablePdf(){const idx=DP.items.map((it,i)=>it._ocr?i:-1).filter(i=>i>=0);if(!idx.length){toast('لا نتائج OCR بعد',2000);return}
  const miss=idx.filter(i=>!DP.items[i]._ocr.words);
  if(miss.length){if(!confirm('بعض الصفحات (من مكتبتك) بلا مواضع الكلمات اللازمة للـPDF القابل للبحث. سيُعاد التعرف عليها ('+miss.length+' صفحة) وقد يستبدل ذلك تصحيحاتك اليدوية لها. متابعة؟'))return;OC.after='pdf';await runOcr(miss);return ocrPdfRun(idx)}
  return ocrPdfRun(idx)}
 async function ocrPdfRun(idx){const N=idx.length;sheet('<h2 class="sht">📄 جارٍ بناء PDF قابل للبحث…</h2><div class="shm" id="ocp">…</div>');
  try{const L=await pxLib(),doc=await L.PDFDocument.create(),ctx=doc.context,chars=new Map();
   for(const i of idx)for(const w of DP.items[i]._ocr.words)for(const ch of w.t+' ')if(!chars.has(ch))chars.set(ch,chars.size+1);
   const ents=[...chars.entries()];let cm='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';
   for(let k=0;k<ents.length;k+=100){const ch=ents.slice(k,k+100);cm+=ch.length+' beginbfchar\n'+ch.map(([c,n])=>'<'+n.toString(16).padStart(4,'0')+'> <'+u16(c.codePointAt(0))+'>').join('\n')+'\nendbfchar\n'}cm+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';
   const tu=ctx.register(ctx.stream(cm)),fd=ctx.register(ctx.obj({Type:'FontDescriptor',FontName:'GlyphLessFont',Flags:4,FontBBox:[0,0,500,1000],ItalicAngle:0,Ascent:1000,Descent:0,CapHeight:1000,StemV:80})),
    cid=ctx.register(ctx.obj({Type:'Font',Subtype:'CIDFontType2',BaseFont:'GlyphLessFont',CIDSystemInfo:{Registry:L.PDFString.of('Adobe'),Ordering:L.PDFString.of('Identity'),Supplement:0},FontDescriptor:fd,DW:500,CIDToGIDMap:'Identity'})),
    font=ctx.register(ctx.obj({Type:'Font',Subtype:'Type0',BaseFont:'GlyphLessFont',Encoding:'Identity-H',DescendantFonts:[cid],ToUnicode:tu}));
   const all=DP.items.length;
   for(let k=0;k<N;k++){const i=idx[k],it=DP.items[i],o=it._ocr,e=q('#ocp');if(e)e.textContent=(k+1)+' / '+N;await wait(10);
    const c=dpFinal(it,i,all),jb=await dpBlob(c,'image/jpeg',0.9),im=await doc.embedJpg(new Uint8Array(await jb.arrayBuffer()));let pw,ph,x,y,w,h;
    if(DP.page=='fit'){pw=c.width*0.75;ph=c.height*0.75;x=0;y=0;w=pw;h=ph}else{const land=c.width>c.height;pw=land?842:595;ph=land?595:842;const m=18,kk=Math.min((pw-2*m)/c.width,(ph-2*m)/c.height);w=c.width*kk;h=c.height*kk;x=(pw-w)/2;y=(ph-h)/2}
    const pg=doc.addPage([pw,ph]);pg.drawImage(im,{x,y,width:w,height:h});
    const kx=w/o.w,ky=h/o.h;let ops='BT\n3 Tr\n';const nm=pg.node.newFontDictionary('Fgl',font);
    for(const wd of o.words){const bw=(wd.x1-wd.x0)*kx,bh=(wd.y1-wd.y0)*ky,s=wd.t+(wd.e?'':' '),cs=[...s],fs=Math.max(4,bh*0.8),tz=Math.max(5,Math.min(500,bw/(cs.length*fs*0.5)*100)),X=x+wd.x0*kx,Y=y+h-wd.y1*ky+bh*0.18;
     ops+=nm.toString()+' '+fs.toFixed(2)+' Tf '+tz.toFixed(1)+' Tz 1 0 0 1 '+X.toFixed(2)+' '+Y.toFixed(2)+' Tm <'+cs.map(ch=>chars.get(ch).toString(16).padStart(4,'0')).join('')+'> Tj\n'}
    ops+='ET';pg.node.addContentStream(ctx.register(ctx.stream(ops)))}
   doc.setTitle(dpBase());doc.setProducer('الحسام سكان');let u=await doc.save();
   if(DP.pw&&pxPwOk(DP.pw))u=await pxEncrypt(u,DP.pw);
   const f={name:dpBase()+'-قابل-للبحث.pdf',type:'application/pdf',blob:new Blob([u],{type:'application/pdf'}),pages:N};DP.res={files:[f],target:0};
   sheet(`<div class="shh"><h2 class="sht">✔ PDF قابل للبحث جاهز</h2><button class="lnk" data-act="ocrres">← النتائج</button></div><div class="pr"><span><b>${E(f.name)}</b><br><small>${dpKB(f.blob.size)} · ${N} صفحة</small></span><button class="pb" data-act="dpsave" data-i="0" aria-label="تنزيل">⬇</button></div><div class="shm">يمكنك البحث والنسخ من النص داخل أي قارئ PDF. النص طبقة غير مرئية فوق صورة الصفحة، وجودته من جودة التعرف.${DP.pw?' 🔒 محمي بكلمة المرور.':''}</div>`)}
  catch(e){toast('تعذّر بناء PDF: '+String(e&&e.message||e).slice(0,90),5000);ocrRes()}}
 const pxPwOk=s=>typeof PX!='undefined'&&PX.pwOk?PX.pwOk(s):false;
 /* ---------- قارئ QR / باركود ---------- */
 async function decode(c){
  if('BarcodeDetector' in window){try{const d=new BarcodeDetector(),r=await d.detect(c);if(r.length)return r.map(x=>({t:x.rawValue,f:x.format}))}catch(e){}}
  await loadJs('lib/jsQR.js');const out=[];
  for(const k of [1,0.5,0.25]){const m=Math.max(c.width,c.height),cc=k==1?c:dpScale(c,Math.min(1,(m*k)/m)),g=cc.getContext('2d').getImageData(0,0,cc.width,cc.height),r=jsQR(g.data,g.width,g.height,{inversionAttempts:'attemptBoth'});if(r&&r.data){out.push({t:r.data,f:'qr_code'});break}}
  return out}
 OC.decode=decode;
 const isUrl=t=>/^https?:\/\/[^\s]+$/i.test(t);
 const qrRow=(r,pg)=>`<div class="pr"><span><b dir="auto" style="word-break:break-all">${E(r.t)}</b><br><small>${E(r.f)}${pg?' · '+E(pg):''}</small></span><button class="pb" data-act="qrcopy" data-t="${E(r.t)}" aria-label="نسخ">📋</button>${isUrl(r.t)?`<a class="pb" href="${E(r.t)}" target="_blank" rel="noopener noreferrer" aria-label="فتح الرابط" style="text-decoration:none">🔗</a>`:''}</div>`;
 function qrHome(rs){sheet(`<div class="shh"><h2 class="sht">🔳 قارئ QR والباركود</h2><button class="lnk" data-act="${DP.items.length?'dpwork':'dp'}">← رجوع</button></div><div class="shm">يقرأ QR (والباركودات الشائعة إن دعمها متصفحك) من صفحات المشروع أو بالكاميرا. تأكد من الرابط قبل فتحه.</div><div class="acts"><button class="btn" data-act="qrpages" ${DP.items.length?'':'disabled'}>🖼 من صفحات المشروع</button><button class="btn" data-act="qrcam">📷 بالكاميرا</button><label class="btn span2">📁 من صورة على الجهاز<input type="file" id="qrf" accept="image/*" hidden></label></div><div id="qrr">${(rs||[]).map(x=>qrRow(x.r,x.pg)).join('')}</div>`)}
 async function qrPages(){const rs=[];toast('⏳ جارٍ البحث عن رموز QR…',1500);for(let i=0;i<DP.items.length;i++){await wait(10);try{const c=ocrCanvas(DP.items[i]);for(const r of await decode(c))rs.push({r,pg:DP.items[i].name})}catch(e){}}
  qrHome(rs);if(!rs.length)q('#qrr').innerHTML='<div class="shm">لم أجد رمزاً مقروءاً. جرّب صورة أوضح أو أقرب للرمز.</div>'}
 async function qrFile(f){const b=await createImageBitmap(f),c=dpCv(b.width,b.height);c.getContext('2d').drawImage(b,0,0);if(b.close)b.close();const rs=(await decode(c)).map(r=>({r,pg:f.name}));qrHome(rs);if(!rs.length)q('#qrr').innerHTML='<div class="shm">لم أجد رمزاً مقروءاً في الصورة.</div>'}
 async function qrCam(){let st;try{st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false})}catch(e){toast('تعذّر فتح الكاميرا — اسمح بالإذن أو اختر صورة',4000);return}
  sheet('<div class="shh"><h2 class="sht">📷 وجّه الكاميرا إلى الرمز</h2><button class="lnk" data-act="qropen">← إغلاق</button></div><div class="dpcv"><video id="qrv" playsinline muted autoplay style="width:100%;border-radius:12px;background:#000"></video></div><div class="shm" id="qrs">جارٍ البحث…</div>');
  const v=q('#qrv');v.srcObject=st;try{await v.play()}catch(e){}const stop=()=>{try{st.getTracks().forEach(t=>t.stop())}catch(e){}};let found=null;
  while(q('#qrv')===v&&!found){await wait(250);if(!v.videoWidth)continue;const c=dpCv(Math.min(960,v.videoWidth),v.videoHeight*Math.min(960,v.videoWidth)/v.videoWidth);c.getContext('2d').drawImage(v,0,0,c.width,c.height);try{const r=await decode(c);if(r.length)found=r}catch(e){}}
  stop();if(found){if(navigator.vibrate)navigator.vibrate(60);qrHome(found.map(r=>({r,pg:'الكاميرا'})))}}
 OC.stopCam=()=>{const v=q('#qrv');if(v&&v.srcObject)v.srcObject.getTracks().forEach(t=>t.stop())};
 /* ---------- لفّ شاشة الصفحات ---------- */
 {const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{const sh=q('#sh'),h=sh&&sh.querySelector('.shh');if(h&&sh.querySelector('[data-act="dprun"]')&&!sh.querySelector('#ocb')){const a=sh.querySelector('#hdst'),box='<div class="acts" id="ocb"><button class="btn" data-act="ocropen">🔤 التعرف على النص (OCR)</button><button class="btn" data-act="qropen">🔳 قارئ QR</button></div>';(a&&a.parentElement?a.parentElement:h).insertAdjacentHTML('afterend',box)}}catch(e){}return r}}
 {const _h=dpHome;window.dpHome=dpHome=function(){const r=_h.apply(this,arguments);try{const a=q('#sh .acts');if(a)a.insertAdjacentHTML('beforeend','<button class="btn" data-act="qropen">🔳 قارئ QR</button>')}catch(e){}return r}}
 /* ---------- الأحداث ---------- */
 document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.oc!=null){const it=DP.items[+el.dataset.oc];if(it&&it._ocr)it._ocr.text=el.value}});
 document.addEventListener('change',e=>{const el=e.target;if(el.id=='qrf'){const f=el.files[0];el.value='';if(f)qrFile(f).catch(()=>toast('تعذّرت قراءة الصورة',3000))}});
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,v=el.dataset.v;if(a.slice(0,2)!='oc'&&a.slice(0,2)!='qr')return;
  try{
  if(a=='ocropen')ocrHome();
  else if(a=='ocrlang'){OC.lang=v;ocrHome()}
  else if(a=='ocrrun'){const idx=v=='sel'?DP.items.map((it,i)=>ST.sel.has(it.id)?i:-1).filter(i=>i>=0):DP.items.map((_,i)=>i);if(idx.length)await runOcr(idx)}
  else if(a=='ocrres')ocrRes();
  else if(a=='ocrprep'){OC.prep=v=='1';ocrHome()}
  else if(a=='ocrmode'){OC.mode=v=='lines'?'lines':'block';ocrHome()}
  else if(a=='ocprev')ocPrev(+el.dataset.i);
  else if(a=='occopy'){const t=txtOut();try{await navigator.clipboard.writeText(t);toast('📋 نُسخ النص',1800)}catch(x){toast('تعذّر النسخ — استعمل TXT',2500)}}
  else if(a=='octxt'){dpSave({name:dpBase()+'.txt',blob:new Blob(['﻿'+txtOut()],{type:'text/plain;charset=utf-8'})})}
  else if(a=='ocdocx'){dpSave({name:dpBase()+'.docx',blob:new Blob([docxBytes(allText())],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'})})}
  else if(a=='ocpdf')await searchablePdf();
  else if(a=='qropen'){OC.stopCam();qrHome()}
  else if(a=='qrpages')await qrPages();
  else if(a=='qrcam')await qrCam();
  else if(a=='qrcopy'){try{await navigator.clipboard.writeText(el.dataset.t);toast('📋 نُسخ',1500)}catch(x){toast('تعذّر النسخ',2000)}}
  }catch(x){toast('تعذّرت العملية: '+String(x&&x.message||x).slice(0,80),4000)}});
})();
