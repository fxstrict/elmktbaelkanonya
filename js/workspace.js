/* مساحة عمل موحّدة وشاشة نتيجة موحّدة (R3 — 1.16.14). تنظيم واجهة فقط: لا خوارزميات جديدة ولا مفاتيح تخزين.
   1) أي ملف (صور أو PDF) يدخل كصفحات في DP.items عبر زر واحد «📄 إضافة ملفات» (في المركز وتجهيز المستندات وشاشة الصفحات).
      الـPDF يُحوَّل صفحاته إلى صور (النص يصبح صورة) بحد 30 صفحة، ويخضع لضبط FREE/PRO نفسه الخاص بـ«فتح كصفحات» (مفتاح pdftools).
   2) شاشة «✔ الملفات جاهزة» (من docprep وأدوات PDF معاً) تحمل شريطاً واحداً: متابعة التحرير · أدوات PDF لهذا الملف · حفظ في مكتبتي · ربط بقضية.
   إضافة فقط: نلفّ dpHome وdpWork وsheet، ولا نغيّر أي data-act قائم. */
(function(){
 const q=s=>document.querySelector(s),WS={saved:new Map()};
 const isPdf=f=>/pdf/i.test(f.type||'')||/\.pdf$/i.test(f.name||'');
 const b=(a,t)=>`<button class="btn" data-act="${a}">${t}</button>`;
 const act=(a,d)=>{const x=document.createElement('button');x.dataset.act=a;if(d)for(const k in d)x.dataset[k]=d[k];x.style.display='none';document.body.appendChild(x);try{x.click()}finally{x.remove()}};
 const INP='<input type="file" id="wsf" accept="image/*,application/pdf,.pdf" multiple hidden>';
 /* ---------- إضافة ملفات مختلطة ---------- */
 async function addFiles(fl){
  let bad=0,added=0,denied=false;const first=fl[0]&&String(fl[0].name||'').replace(/\.[^.]+$/,'');
  for(const f of fl){
   try{
    if(isPdf(f)){
     if(typeof proGate=='function'&&!proGate('pdftools')){denied=true;break}
     if(typeof pxToItems!='function'){bad++;continue}
     const it=await pxToItems(f,{cb:(i,n)=>toast('⏳ تحويل صفحة '+i+' / '+n,900)});
     if(it&&it.length){DP.items.push(...it);added+=it.length}
    }else{const it=await dpLoad(f);if(it){DP.items.push(it);added++}else bad++}
   }catch(e){bad++}
  }
  if(denied)return;
  if(added){DP.res=null;SC.saved=false;if(!DP.name&&first)DP.name=first}
  if(bad)toast('تعذّرت قراءة '+bad+' ملف',4000);
  else if(added)toast('✔ أُضيفت '+added+' صفحة',2200);
  if(DP.items.length)dpWork();else dpHome()}
 window.wsAddFiles=addFiles;
 document.addEventListener('change',e=>{const el=e.target;if(!el||el.id!='wsf')return;const fl=[...el.files];el.value='';if(fl.length)addFiles(fl)});
 {const _h=dpHome;window.dpHome=dpHome=function(){const r=_h.apply(this,arguments);try{const a=q('#sh .acts');if(a&&!q('#wsf'))a.insertAdjacentHTML('beforeend','<label class="btn">📄 إضافة ملفات (صور أو PDF)'+INP+'</label>')}catch(e){}return r}}
 {const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{const sh=q('#sh'),h=sh&&sh.querySelector('.shh');if(h&&sh.querySelector('[data-act="dprun"]')&&!q('#wsf'))h.insertAdjacentHTML('beforeend','<label class="lnk">📄 PDF'+INP+'</label>')}catch(e){}return r}}
 /* ---------- شريط الخطوة التالية في شاشة النتيجة ---------- */
 function bar(){
  const R=DP.res,sh=q('#sh');if(!R||!sh||q('#wsres'))return;
  const pdfs=R.files.filter(f=>f.type=='application/pdf'),off=typeof HD!='undefined'&&HD.off,note=sh.lastElementChild;if(!note)return;
  let h='<div id="wsres"><div class="shm mws">الخطوة التالية</div><div class="acts">'+b('wscont','✏️ متابعة التحرير');
  if(pdfs.length==1)h+=b('wsuse','🧩 أدوات PDF لهذا الملف');
  if(pdfs.length&&!off)h+=b('wslib','🗄 حفظ في مكتبتي')+b('wscase','⚖️ ربط بقضية');
  note.insertAdjacentHTML('beforebegin',h+'</div></div>')}
 {const _s=sheet;window.sheet=sheet=function(h){const r=_s.apply(this,arguments);try{if(typeof h=='string'&&h.indexOf('الملفات جاهزة')>-1)bar()}catch(e){}return r}}
 async function saveLib(){
  if(typeof proGate=='function'&&!proGate('hlib'))return null;
  const R=DP.res;if(!R)return null;const ids=[];
  for(const f of R.files){if(f.type!='application/pdf')continue;
   if(WS.saved.has(f.blob)){ids.push(WS.saved.get(f.blob));continue}
   const u=new Uint8Array(await f.blob.arrayBuffer());let th='';try{th=await pxThumb({bytes:u,pw:'',name:f.name})}catch(x){}
   const id=await HD.addPdf(f.name.replace(/\.pdf$/i,''),u,th);WS.saved.set(f.blob,id);ids.push(id)}
  return ids}
 document.addEventListener('click',async e=>{
  const el=e.target.closest&&e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a=='wsadd'){
   const i=document.createElement('input');i.type='file';i.accept='image/*,application/pdf,.pdf';i.multiple=true;i.style.display='none';
   i.addEventListener('change',()=>{const fl=[...(i.files||[])];i.remove();if(fl.length)addFiles(fl)});i.addEventListener('cancel',()=>i.remove());
   document.body.appendChild(i);i.click()}
  else if(a=='wscont'){
   if(DP.items.length){dpWork();return}
   const R=DP.res,p=R&&R.files.find(f=>f.type=='application/pdf');
   if(p)await addFiles([new File([p.blob],p.name,{type:'application/pdf'})]);else toast('لا توجد صفحات لمتابعة تحريرها',2500)}
  else if(a=='wsuse'){const R=DP.res,p=R&&R.files.find(f=>f.type=='application/pdf');if(p&&typeof pxOpenBlob=='function')pxOpenBlob(p.blob,p.name.replace(/\.pdf$/i,''))}
  else if(a=='wslib'){try{const ids=await saveLib();if(ids&&ids.length)toast('🗄 حُفظ في مكتبتك',2000)}catch(x){toast('تعذّر الحفظ في المكتبة',3000)}}
  else if(a=='wscase'){try{const ids=await saveLib();if(!ids||!ids.length)return;if(ids.length==1)act('hdinfo',{id:ids[0]});else act('hdlib')}catch(x){toast('تعذّر الحفظ في المكتبة',3000)}}
 });
})();
