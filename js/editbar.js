/* شريط المحرر المبوّب (R4 — 1.16.15): يجمع أزرار شاشة «تعديل الصفحة» المتراصة في خمسة تبويبات: قص | تحسين | تعليق | نص | المزيد.
   تنظيم واجهة فقط: لا خوارزميات ولا تخزين ولا مفاتيح جديدة ولا تغيير في أي data-act قائم.
   الفكرة: يُحمَّل هذا الملف بعد كل الوحدات التي تحقن أزرارها في المحرر (enhance وautoscan وstudio)، فنلفّ dpEditView مرة أخيرة
   وننقل العناصر الموجودة فعلاً (نقلاً لا استنساخاً، فتبقى معالجات اللمس والمنزلقات والمقارنة كما هي) إلى لوحات التبويبات.
   أسماء data-act الجديدة فقط: edtab (تبديل التبويب) وedrm (حذف الصفحة بتأكيد). الأزرار الموجودة لا تُعاد تسميتها. */
(function(){
 const q=s=>document.querySelector(s);
 const ET={tab:'crop'};
 const TABS=[['crop','✂️','قص'],['enh','✨','تحسين'],['ann','🖋','تعليق'],['txt','🔤','نص'],['more','⋯','المزيد']];
 const HINT={crop:'اختر أداة: قص أو تدوير أو قص تلقائي.',enh:'اختر تحسيناً؛ كل خطوة قابلة للتراجع (↩ في الشريط).',ann:'طمس أو تعليق وتوقيع على هذه الصفحة.',txt:'استخراج النص (OCR) وقراءة رموز QR.',more:'إجراءات على هذه الصفحة: تكرار، نقل، حذف.'};
 const actOf=b=>b.dataset.act+(b.dataset.m?':'+b.dataset.m:'');
 const has=(g,re)=>g.some(e=>[e,...e.querySelectorAll('[data-act]')].some(b=>b.dataset&&b.dataset.act&&re.test(actOf(b))));
 const tabOf=g=>has(g,/^(asautocrop|asfix|asskew|asflip|asbook|scquad)/)?'crop':has(g,/^stann/)?'ann':has(g,/^(enf|enadj|dpfil|dpm:erase)/)?'enh':'more';
 const btn=(act,txt,extra)=>`<button class="btn" data-act="${act}" ${extra||''}>${txt}</button>`;
 function show(t){
  const sh=q('#sh');if(!sh)return;ET.tab=t;
  sh.querySelectorAll('.edp').forEach(p=>{p.hidden=p.dataset.p!==t});
  sh.querySelectorAll('.edtab[data-t]').forEach(b=>{const on=b.dataset.t===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
  const h=q('#dph');if(h&&!(typeof DPE!='undefined'&&DPE.mode))h.textContent=HINT[t]||''}
 function mount(){
  const sh=q('#sh'),it=typeof DP!='undefined'&&DP.items[DPE.i];
  if(!sh||!it||!q('#dpe')||sh.querySelector('#edbar'))return;
  const kids=[...sh.children];
  const base=kids.find(e=>e.classList.contains('acts')&&e.querySelector('[data-act="dpm"][data-m="crop"]'));
  if(!base)return;
  const n=DP.items.length,i=DPE.i;
  /* عنوان موحّد: الصفحات قد تكون صوراً أو صفحات PDF */
  const t=sh.querySelector('.sht');if(t)t.textContent='✏️ تعديل الصفحة '+(i+1)+' من '+n;
  /* الأزرار الأصلية: «طمس» إلى تبويب التعليق، و«تراجع» إلى الشريط الثابت (يلزم من كل التبويبات) */
  const mask=base.querySelector('[data-act="dpm"][data-m="mask"]'),undo=base.querySelector('[data-act="dpundo"]');
  if(undo)undo.remove();
  const P={};TABS.forEach(([k])=>{const d=document.createElement('div');d.className='edp';d.dataset.p=k;d.hidden=true;P[k]=d});
  P.crop.appendChild(base);
  if(mask){const a=document.createElement('div');a.className='acts';a.appendChild(mask);P.ann.appendChild(a)}
  /* كل كتلة «ترويسة .mws + ما يليها» تذهب إلى تبويبها بحسب الأزرار التي تحويها (وما لا يُعرف يذهب إلى «المزيد» فلا يضيع شيء) */
  const groups=[];let g=null;
  kids.slice(kids.indexOf(base)+1).forEach(e=>{if(e.classList.contains('mws')||!g){g=[];groups.push(g)}g.push(e)});
  groups.forEach(g=>{const p=P[tabOf(g)];g.forEach(e=>p.appendChild(e))});
  const hasOcr=DP.items.some(x=>x._ocr);
  P.txt.insertAdjacentHTML('beforeend','<div class="acts one">'+btn('ocropen','🔤 التعرف على النص (OCR)')+btn('qropen','🔳 قارئ QR')+(hasOcr?btn('ocrres','📄 عرض نتائج النص'):'')+'</div><div class="shm" style="margin-top:8px">التعرف على النص يعمل على كل الصفحات أو المحدَّدة من قائمة الصفحات، ويعمل على جهازك دون رفع شيء.</div>');
  P.more.insertAdjacentHTML('beforeend','<div class="shm">'+(it.ops.length?it.ops.length+' تعديل على هذه الصفحة':'لا تعديلات على هذه الصفحة بعد')+'</div><div class="acts">'
   +btn('stdup','⧉ تكرار الصفحة','data-i="'+i+'"')+btn('stblank','📄 صفحة بيضاء بعدها','data-i="'+i+'"')
   +btn('dpup','⬆ نقل للأعلى','data-i="'+i+'"'+(i>0?'':' disabled'))+btn('dpdn','⬇ نقل للأسفل','data-i="'+i+'"'+(i<n-1?'':' disabled'))
   +btn('edrm','🗑 حذف الصفحة','data-i="'+i+'"')+btn('dpdone','🗂 قائمة الصفحات')+'</div>');
  const bar=document.createElement('div');bar.className='edbar';bar.id='edbar';bar.setAttribute('role','tablist');
  bar.innerHTML=`<button class="edtab${it.ops.length?'':' dim'}" data-act="dpundo" aria-label="تراجع"><b>↩</b>تراجع</button><span class="edsep"></span>`
   +TABS.map(([k,ic,tx])=>`<button class="edtab" role="tab" data-act="edtab" data-t="${k}" aria-selected="false"><b>${ic}</b>${tx}</button>`).join('');
  TABS.forEach(([k])=>sh.appendChild(P[k]));sh.appendChild(bar);
  show(DPE.mode=='crop'?'crop':DPE.mode=='mask'?'ann':DPE.mode=='erase'?'enh':ET.tab)}
 if(typeof dpEditView=='function'){const _v=dpEditView;window.dpEditView=dpEditView=function(){const r=_v.apply(this,arguments);try{mount()}catch(e){}return r}}
 document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a=='edtab'){show(el.dataset.t);return}
  if(a=='edrm'){const i=+el.dataset.i;if(!confirm('حذف هذه الصفحة من المشروع؟'))return;
   const b=document.createElement('button');b.dataset.act='dpdel';b.dataset.i=i;document.body.appendChild(b);b.click();b.remove()}});
})();
