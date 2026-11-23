/* واجهة «الباركودات» (1.16.0): باركودات أجندات الجلسات والمحاكم حسب المحافظة (زر «ادخل هنا» يفتح تليجرام/درايف مباشرة). البيانات في data/16-barcodes.js.
   اختيار محافظة ← بطاقات الباركود (صورة + رابط فتح + مشاركة). المشاركة برابط البرنامج (انظر share.js) وبصورة الباركود نفسها إن أمكن. */
const BC={g:null,t:'',n:30,blob:{}};
const BCT=['أسرة','جنح','جنح مستأنف','جنايات','مدني','نيابات','مجلس الدولة','أخرى'];
function bcType(t){return t.startsWith('أسرة')?'أسرة':t.includes('جنايات')?'جنايات':t.includes('مجلس الدولة')?'مجلس الدولة':t.startsWith('جنح مستأنف')?'جنح مستأنف':t.startsWith('جنح')?'جنح':t.includes('مدني')?'مدني':t.startsWith('نيابة')?'نيابات':'أخرى'}
const bcTh=(id,w)=>'https://drive.google.com/thumbnail?id='+id+'&sz=w'+(w||480);
const bcView=id=>'https://drive.google.com/file/d/'+id+'/view';
const bcDl=id=>'https://drive.usercontent.google.com/download?id='+id+'&export=download&confirm=t';
function bcFind(id){for(const g of BARCODES){const r=g.items.find(x=>x[0]==id);if(r)return{id,t:r[1],g:g.g,k:bcType(r[1]),u:r[2]||''}}return null}
/* زر «ادخل هنا»: يذهب مباشرة إلى تليجرام أو درايف (الرابط المفكوك من الـQR) وإلا يفتح صورة الباركود */
const bcGo=u=>/^https?:\/\/(t\.me|telegram\.me)\//.test(u)?'✈️ تليجرام':/google\.com/.test(u)?'📂 درايف':'🔗 رابط';
const bcSafe=u=>/^https:\/\//.test(u||'')?u:''
const bcCard=(g,r)=>`<div class="bcc"><button class="bci" data-act="bcopen" data-id="${r[0]}" aria-label="تكبير"><img src="${bcTh(r[0])}" alt="${esc2(r[1])}" loading="lazy" decoding="async"></button><div class="bct">${esc2(r[1])}</div><div class="bca"><a class="btn pri" data-act="rec" target="_blank" rel="noopener noreferrer" href="${bcSafe(r[2])||bcView(r[0])}">ادخل هنا ${r[2]?bcGo(r[2]):''}</a><button class="btn" data-act="bcshare" data-id="${r[0]}" aria-label="مشاركة">📤</button></div></div>`;
function bcHtml(){
 if(!BC.g){const n=BARCODES.reduce((a,g)=>a+g.items.length,0);
  return `<div class="shm" style="margin:10px 12px">باركودات أجندات الجلسات والمحاكم والنيابات — اختر المحافظة ثم امسح الباركود أو افتحه أو شاركه. (${n} باركود)</div><div class="bar2"><b>المحافظات</b><span>${BARCODES.length}</span></div><div class="grid">`+BARCODES.map(g=>`<button class="cat" data-act="bcg" data-v="${esc2(g.g)}"><span class="ci">📟</span><b>${esc2(g.g)}</b><span>${g.items.length} باركود</span></button>`).join('')+`</div><div class="shm" style="margin:12px">باقي المحافظات تُضاف تباعاً.</div>`}
 const G=BARCODES.find(x=>x.g==BC.g);if(!G){BC.g=null;return bcHtml()}
 const q=nz((S.q||'').trim()),all=G.items.filter(r=>!q||nz(r[1]).includes(q)),kinds=BCT.filter(k=>G.items.some(r=>bcType(r[1])==k)),
  L=all.filter(r=>!BC.t||bcType(r[1])==BC.t);
 let h=`<div class="bar2"><button class="lnk" data-act="bcback">← المحافظات</button><b style="flex:1;margin:0 8px">${esc2(G.g)}</b><span>${L.length}</span></div><div class="strip bcs">`+['',...kinds].map(k=>`<button class="chip ${BC.t==k?'on':''}" data-act="bct" data-v="${k}">${k||'الكل'}</button>`).join('')+'</div>';
 if(!L.length)return h+'<div class="em"><div>🔎</div>لا توجد باركودات مطابقة</div>';
 h+='<div class="bcg">'+L.slice(0,BC.n).map(r=>bcCard(G.g,r)).join('')+'</div>';
 return h+(L.length>BC.n?`<button class="btn wide" data-act="bcmore">عرض المزيد (${L.length-BC.n})</button>`:'')}
/* تحميل مسبق لصورة الباركود لتكون المشاركة بالصورة فورية (تبقى ضمن لحظة لمس المستخدم) */
function bcPrefetch(id){if(BC.blob[id]!==undefined)return;BC.blob[id]=null;
 try{fetchT('https://lh3.googleusercontent.com/d/'+id+'=w1000',{},8000).then(r=>r.ok?r.blob():null).then(b=>{if(b&&b.size>1000)BC.blob[id]=b;else delete BC.blob[id]}).catch(()=>{delete BC.blob[id]})}catch(e){delete BC.blob[id]}}
function bcSheet(o){const f=bcFind(o.id)||{id:o.id,t:o.t||'باركود',g:'',k:''};BC.cur=f;bcPrefetch(f.id);
 sheet(`<h2 class="sht">${esc2(f.t)}</h2><div class="shm">📟 باركود جلسات${f.k?' · '+esc2(f.k):''}${f.g?' · محافظة '+esc2(f.g):''}</div><img class="bcimg" src="${bcTh(f.id,900)}" alt="${esc2(f.t)}"><div class="acts">${bcSafe(f.u)?`<a class="btn pri span2" data-act="rec" target="_blank" rel="noopener noreferrer" href="${bcSafe(f.u)}">ادخل هنا ${bcGo(f.u)}</a>`:`<a class="btn pri span2" data-act="rec" target="_blank" rel="noopener noreferrer" href="${bcView(f.id)}">🔗 فتح الباركود</a>`}<button class="btn" data-act="bcshare" data-id="${f.id}">📤 مشاركة</button><a class="btn" data-act="rec" data-dl="1" data-id="${f.id}" href="${bcDl(f.id)}">⬇ تحميل الصورة</a></div>`)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,v=el.dataset.v,id=el.dataset.id;
 if(a=='bcg'){BC.g=v;BC.t='';BC.n=30;S.q='';const i=document.querySelector('#q');if(i)i.value='';render();scrollTo(0,0)}
 else if(a=='bcback'){BC.g=null;S.q='';const i=document.querySelector('#q');if(i)i.value='';render();scrollTo(0,0)}
 else if(a=='bct'){BC.t=v;BC.n=30;render()}
 else if(a=='bcmore'){BC.n+=30;render()}
 else if(a=='bcopen'){const f=bcFind(id);if(f)bcSheet({id})}
 else if(a=='bcshare'){const f=bcFind(id)||(BC.cur&&BC.cur.id==id?BC.cur:null);if(f)shBc(f)}});
