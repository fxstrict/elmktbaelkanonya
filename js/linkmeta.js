/* الحسام سكان — المرحلة N6 (1.16.10): الربط بالقضية والموكل بالاسم والبيانات الوصفية.
   1) نوع المستند (توكيل، صحيفة، حكم…) يُسمّي الملف «اسم القضية – النوع» ويُضاف وسماً تلقائياً.
   2) PDF الناتج عن الاستوديو يحمل بيانات وصفية (العنوان، الموضوع: القضية والموكل، الكلمات المفتاحية) بتحديث تزايدي صالح لكل القارئات.
   لا مفاتيح جديدة في localStorage ولا تعديل لشكل القضايا. إضافة فقط: نلفّ dpWork وdpPdf. */
(function(){
 const q=s=>document.querySelector(s),E=s=>esc2(String(s==null?'':s));
 const TYPES=['توكيل','صحيفة دعوى','مذكرة','حكم','محضر جلسة','إعلان','عقد','إيصال','هوية','مستند'];
 const sub=s=>typeof scName=='function'?scName(s):s;
 /* ---------- نوع المستند ---------- */
 {const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{const sh=q('#sh'),b=sh&&sh.querySelector('[data-act="dprun"]');
   if(b&&!sh.querySelector('#lmty'))b.insertAdjacentHTML('beforebegin',`<div id="lmty"><div class="shm mws">نوع المستند ${HD.caseName?'(يُسمّي الملف «'+E(HD.caseName)+' – النوع»)':'(يُضاف وسماً ويُسمّي الملف)'}</div><div class="dkc">${TYPES.map(t=>`<button class="chip ${HD.dtype==t?'on':''}" data-act="lmtype" data-v="${t}">${t}</button>`).join('')}</div></div>`)}catch(e){}return r}}
 document.addEventListener('click',e=>{const el=e.target.closest('[data-act="lmtype"]');if(!el)return;const t=el.dataset.v;HD.dtype=HD.dtype==t?'':t;
  if(HD.dtype){DP.name=sub((HD.caseName?HD.caseName+' – ':'')+HD.dtype)}else if(HD.caseName&&DP.name.endsWith(t))DP.name=sub(HD.caseName);
  dpWork()});
 /* ---------- بيانات PDF الوصفية (تحديث تزايدي للملف الذي يكتبه docprep) ---------- */
 const hexU=s=>{let o='<FEFF';for(const ch of String(s)){const c=ch.codePointAt(0);if(c>0xFFFF){const v=c-0x10000;o+=((0xD800+(v>>10)).toString(16)+(0xDC00+(v&0x3FF)).toString(16)).toUpperCase().padStart(8,'0')}else o+=c.toString(16).toUpperCase().padStart(4,'0')}return o+'>'};
 const dstr=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return '(D:'+d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())+'Z)'};
 function addInfo(u,m){const tail=new TextDecoder('latin1').decode(u.subarray(Math.max(0,u.length-400))),sx=/startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail),sz=/\/Size\s+(\d+)/.exec(tail);if(!sx||!sz)return u;
  const n=+sz[1],E8=new TextEncoder(),ent=[['Title',m.title],['Subject',m.subject],['Keywords',m.keywords],['Author',m.author]].filter(x=>x[1]).map(x=>'/'+x[0]+' '+hexU(x[1])).join(' ');
  const o1=E8.encode('\n'+n+' 0 obj\n<< '+ent+' /Producer '+hexU('الحسام سكان')+' /CreationDate '+dstr()+' >>\nendobj\n'),off=u.length+1,xo=u.length+o1.length;
  const x2=E8.encode('xref\n'+n+' 1\n'+String(off).padStart(10,'0')+' 00000 n \ntrailer\n<< /Size '+(n+1)+' /Root 1 0 R /Info '+n+' 0 R /Prev '+sx[1]+' >>\nstartxref\n'+xo+'\n%%EOF\n');
  const out=new Uint8Array(u.length+o1.length+x2.length);out.set(u);out.set(o1,u.length);out.set(x2,u.length+o1.length);return out}
 window.lmAddInfo=addInfo;
 {const _p=dpPdf;window.dpPdf=dpPdf=function(pages,mode){const u=_p.apply(this,arguments);try{const tags=[HD.dtype,HD.caseName].filter(Boolean);
   return addInfo(u,{title:(DP.name||'').trim()||'مستند ممسوح',subject:[HD.caseName&&'القضية: '+HD.caseName,HD.client&&'الموكل: '+HD.client].filter(Boolean).join(' — '),keywords:tags.join('، ')})}catch(e){return u}}}
})();
