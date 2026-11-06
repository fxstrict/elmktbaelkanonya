/* تجهيز المستندات: ١) تصغير الصورة بحجم مستهدف ٢) تحويل الصيغة ٣) صور إلى PDF ٤) تحسين تصوير المستند ٥) طمس وعلامة مائية وترقيم.
   كل المعالجة داخل المتصفح (canvas) ولا يُرفع أي ملف لأي خادم. الطمس يُدمج في البكسلات فلا يمكن استرجاع ما تحته. */
const DP={items:[],out:'pdf',fmt:'jpeg',kb:'',maxd:'1600',page:'a4',wm:'',num:false,gray:false,name:'',res:null},DPMAX=2800,DPE={i:-1,mode:'',sel:null,k:1};let _dpid=0;
const dpq=s=>document.querySelector(s),dpCv=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
const dpKB=n=>n>=1048576?(n/1048576).toFixed(2)+' م.ب':Math.max(1,Math.round(n/1024))+' ك.ب';
function dpScale(c,k){if(k>=1)return c;const n=dpCv(c.width*k,c.height*k),x=n.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,n.width,n.height);return n}
async function dpLoad(file){let b;try{b=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){try{b=await createImageBitmap(file)}catch(e2){return null}}
 const k=Math.min(1,DPMAX/Math.max(b.width,b.height)),c=dpCv(b.width*k,b.height*k),x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(b,0,0,c.width,c.height);if(b.close)b.close();
 return{id:++_dpid,name:(file.name||'مستند').replace(/\.[^.]+$/,'')||'مستند',orig:c,ops:[],size:file.size,th:null}}
/* ---------- تحسين التصوير ---------- */
function dpFilter(cv,f){const w=cv.width,h=cv.height,x=cv.getContext('2d'),id=x.getImageData(0,0,w,h),d=id.data,n=w*h,L=new Uint8ClampedArray(n);
 for(let i=0,p=0;i<n;i++,p+=4)L[i]=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2];
 const levels=A=>{const hs=new Uint32Array(256);for(let i=0;i<n;i++)hs[A[i]]++;let s=0,lo=0,hi=255;const t=n*0.01;for(let v=0;v<256;v++){s+=hs[v];if(s>=t){lo=v;break}}s=0;for(let v=255;v>=0;v--){s+=hs[v];if(s>=t){hi=v;break}}return[lo,Math.max(hi,lo+1)]};
 const otsu=A=>{const hs=new Uint32Array(256);for(let i=0;i<n;i++)hs[A[i]]++;let sum=0;for(let v=0;v<256;v++)sum+=v*hs[v];let sb=0,wb=0,mx=0,th=128;for(let v=0;v<256;v++){wb+=hs[v];if(!wb)continue;const wf=n-wb;if(!wf)break;sb+=v*hs[v];const mb=sb/wb,mf=(sum-sb)/wf,bc=wb*wf*(mb-mf)*(mb-mf);if(bc>mx){mx=bc;th=v}}return th};
 if(f=='gray'){for(let i=0,p=0;i<n;i++,p+=4){d[p]=d[p+1]=d[p+2]=L[i]}}
 else if(f=='contrast'){const[lo,hi]=levels(L),k=255/(hi-lo);for(let p=0;p<d.length;p+=4){d[p]=Math.max(0,Math.min(255,(d[p]-lo)*k));d[p+1]=Math.max(0,Math.min(255,(d[p+1]-lo)*k));d[p+2]=Math.max(0,Math.min(255,(d[p+2]-lo)*k))}}
 else{ /* scan / bw: إزالة الظلال بقسمة الصورة على خلفيتها المقدَّرة */
  const sm=dpCv(Math.max(8,w/24),Math.max(8,h/24));sm.getContext('2d').drawImage(cv,0,0,sm.width,sm.height);const bg=dpCv(w,h),bx=bg.getContext('2d');bx.imageSmoothingEnabled=true;bx.imageSmoothingQuality='high';bx.drawImage(sm,0,0,w,h);const bd=bx.getImageData(0,0,w,h).data,V=new Uint8ClampedArray(n);
  for(let i=0,p=0;i<n;i++,p+=4){const b=Math.max(40,0.299*bd[p]+0.587*bd[p+1]+0.114*bd[p+2]);V[i]=Math.min(255,L[i]/b*255*1.04)}
  if(f=='bw'){const th=Math.min(235,otsu(V)+8);for(let i=0,p=0;i<n;i++,p+=4){const v=V[i]>th?255:0;d[p]=d[p+1]=d[p+2]=v}}
  else{const[lo,hi]=levels(V),k=255/(hi-lo);for(let i=0,p=0;i<n;i++,p+=4){const v=Math.max(0,Math.min(255,(V[i]-lo)*k));d[p]=d[p+1]=d[p+2]=v}}}
 x.putImageData(id,0,0)}
/* ---------- إعادة بناء الصورة من العمليات ---------- */
function dpRender(it){let c=dpCv(it.orig.width,it.orig.height);c.getContext('2d').drawImage(it.orig,0,0);
 for(const o of it.ops){if(o.t=='rot'){const sw=o.d%180!=0,n=dpCv(sw?c.height:c.width,sw?c.width:c.height),x=n.getContext('2d');x.translate(n.width/2,n.height/2);x.rotate(o.d*Math.PI/180);x.drawImage(c,-c.width/2,-c.height/2);c=n}
  else if(o.t=='crop'){const n=dpCv(o.w,o.h);n.getContext('2d').drawImage(c,o.x,o.y,o.w,o.h,0,0,n.width,n.height);c=n}
  else if(o.t=='mask'){const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(o.x,o.y,o.w,o.h)}
  else if(o.t=='filter')dpFilter(c,o.f)}
 return c}
function dpThumb(it){const c=dpRender(it),t=dpScale(c,160/Math.max(c.width,c.height));return t.toDataURL('image/jpeg',0.7)}
/* ---------- علامة مائية وترقيم ---------- */
function dpWatermark(c,t){const x=c.getContext('2d');let fs=Math.max(18,Math.round(Math.min(c.width,c.height)/9));x.save();x.translate(c.width/2,c.height/2);x.rotate(-Math.PI/6);x.font='bold '+fs+'px Arial, sans-serif';const lim=Math.hypot(c.width,c.height)*0.8,w=x.measureText(t).width;if(w>lim){fs=Math.max(12,Math.floor(fs*lim/w));x.font='bold '+fs+'px Arial, sans-serif'}x.globalAlpha=.22;x.fillStyle='#c0392b';x.textAlign='center';x.textBaseline='middle';x.fillText(t,0,0);x.restore()}
function dpNumber(c,n,tot){const x=c.getContext('2d'),fs=Math.max(14,Math.round(c.height/55)),s='صفحة '+n+' من '+tot;x.save();x.font=fs+'px Arial, sans-serif';const w=x.measureText(s).width;x.fillStyle='rgba(255,255,255,.88)';x.fillRect(c.width/2-w/2-8,c.height-fs*2.1,w+16,fs*1.7);x.fillStyle='#222';x.textAlign='center';x.textBaseline='middle';x.fillText(s,c.width/2,c.height-fs*1.25);x.restore()}
function dpFinal(it,i,N){let c=dpRender(it);const md=parseInt(DP.maxd)||0,lf=[...it.ops].reverse().find(o=>o.t=='filter');if(md&&Math.max(c.width,c.height)>md){c=dpScale(c,md/Math.max(c.width,c.height));if(lf&&lf.f=='bw')dpFilter(c,'bw')}
 if(DP.gray)dpFilter(c,'gray');if(DP.wm.trim())dpWatermark(c,DP.wm.trim());if(DP.num)dpNumber(c,i+1,N);return c}
/* ---------- الترميز بحجم مستهدف ---------- */
const dpBlob=(c,t,q)=>new Promise(r=>c.toBlob(r,t,q)),DPT={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
async function dpEncode(c,fmt,target){const t=DPT[fmt]||DPT.jpeg;if(!target)return dpBlob(c,t,fmt=='png'?undefined:0.92);let sc=1,cur=c;
 for(let r=0;r<9;r++){if(fmt=='png'){const b=await dpBlob(cur,t);if(b.size<=target||Math.max(cur.width,cur.height)<320)return b}
  else{let b=await dpBlob(cur,t,0.2);if(b.size<=target){let lo=0.2,hi=0.95,best=b;for(let i=0;i<7;i++){const m=(lo+hi)/2;b=await dpBlob(cur,t,m);if(b.size<=target){best=b;lo=m}else hi=m}return best}
   if(Math.max(cur.width,cur.height)<320)return b}
  sc*=0.8;cur=dpScale(c,sc)}
 return dpBlob(cur,t,fmt=='png'?undefined:0.2)}
/* ---------- كتابة PDF (صفحات من صور JPEG) ---------- */
function dpPdf(pages,mode){const E=new TextEncoder(),ch=[];let off=0;const offs=[],push=b=>{const u=typeof b=='string'?E.encode(b):b;ch.push(u);off+=u.length},N=2+pages.length*3;
 push(new Uint8Array([0x25,0x50,0x44,0x46,0x2D,0x31,0x2E,0x34,0x0A,0x25,0xE2,0xE3,0xCF,0xD3,0x0A]));
 const obj=(n,fn)=>{offs[n]=off;push(n+' 0 obj\n');fn();push('\nendobj\n')};
 obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>push('<< /Type /Pages /Kids ['+pages.map((p,i)=>(3+i*3)+' 0 R').join(' ')+'] /Count '+pages.length+' >>'));
 pages.forEach((p,i)=>{const po=3+i*3,co=po+1,io=po+2;let pw,ph,x,y,w,h;
  if(mode=='fit'){pw=p.w*0.75;ph=p.h*0.75;x=0;y=0;w=pw;h=ph}else{const land=p.w>p.h;pw=land?842:595;ph=land?595:842;const m=18,k=Math.min((pw-2*m)/p.w,(ph-2*m)/p.h);w=p.w*k;h=p.h*k;x=(pw-w)/2;y=(ph-h)/2}
  const f=v=>v.toFixed(2),cs='q '+f(w)+' 0 0 '+f(h)+' '+f(x)+' '+f(y)+' cm /Im0 Do Q';
  obj(po,()=>push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+f(pw)+' '+f(ph)+'] /Resources << /XObject << /Im0 '+io+' 0 R >> >> /Contents '+co+' 0 R >>'));
  obj(co,()=>push('<< /Length '+cs.length+' >>\nstream\n'+cs+'\nendstream'));
  obj(io,()=>{push('<< /Type /XObject /Subtype /Image /Width '+p.w+' /Height '+p.h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+p.jpg.length+' >>\nstream\n');push(p.jpg);push('\nendstream')})});
 const xo=off;push('xref\n0 '+(N+1)+'\n0000000000 65535 f \n');for(let n=1;n<=N;n++)push(String(offs[n]).padStart(10,'0')+' 00000 n \n');push('trailer\n<< /Size '+(N+1)+' /Root 1 0 R >>\nstartxref\n'+xo+'\n%%EOF');
 const out=new Uint8Array(off);let p=0;ch.forEach(u=>{out.set(u,p);p+=u.length});return out}
/* ---------- التنفيذ ---------- */
const dpBase=()=>(DP.name||'').trim()||'مستندات-'+isoD(new Date());
async function dpRun(){if(!DP.items.length){toast('أضف صوراً أولاً');return}const N=DP.items.length,target=Math.round((parseFloat(DP.kb)||0)*1024);
 sheet('<h2 class="sht">⏳ جارٍ التنفيذ…</h2><div class="shm" id="dpp">0 / '+N+'</div>');const files=[];
 try{const cvs=[];for(let i=0;i<N;i++){const e=dpq('#dpp');if(e)e.textContent=(i+1)+' / '+N;await new Promise(r=>setTimeout(r,15));cvs.push(dpFinal(DP.items[i],i,N))}
  if(DP.out=='pdf'){let f=1,pdf=null;for(let a=0;a<5;a++){const per=target?Math.max(15000,(target-2500)*f/N):0,pages=[];for(const c of cvs){const b=await dpEncode(c,'jpeg',per);pages.push({jpg:new Uint8Array(await b.arrayBuffer()),w:c.width,h:c.height})}pdf=dpPdf(pages,DP.page);if(!target||pdf.length<=target)break;f*=0.82}
   files.push({name:dpBase()+'.pdf',type:'application/pdf',blob:new Blob([pdf],{type:'application/pdf'}),pages:N})}
  else{const ext={jpeg:'jpg',png:'png',webp:'webp'}[DP.fmt];for(let i=0;i<N;i++){const b=await dpEncode(cvs[i],DP.fmt,target);files.push({name:DP.items[i].name+(DP.out=='img'&&(target||DP.fmt!='jpeg')?'':'')+'.'+ext,type:DPT[DP.fmt],blob:b,from:DP.items[i].size})}}
 }catch(e){toast('تعذّر التنفيذ — جرّب صوراً أصغر');dpWork();return}
 DP.res={files,target};dpResult()}
function dpResult(){const R=DP.res,tot=R.files.reduce((s,f)=>s+f.blob.size,0),from=DP.items.reduce((s,i)=>s+i.size,0),over=R.target&&R.files.some(f=>f.blob.size>R.target&&R.files.length==1);
 const cs=navigator.canShare&&R.files.length&&(()=>{try{return navigator.canShare({files:R.files.map(f=>new File([f.blob],f.name,{type:f.type}))})}catch(e){return false}})();
 sheet(`<div class="shh"><h2 class="sht">✔ الملفات جاهزة</h2><button class="lnk" data-act="dpwork">← تعديل</button></div><div class="shm">الحجم الإجمالي ${dpKB(tot)}${from?' (الأصل '+dpKB(from)+')':''}${R.target?' — المستهدف '+dpKB(R.target)+(over?' — لم يمكن بلوغه دون تدهور شديد للجودة':''):''}</div>`+R.files.map((f,i)=>`<div class="pr"><span><b>${esc2(f.name)}</b><br><small>${dpKB(f.blob.size)}${f.pages?' · '+f.pages+' صفحة':''}${f.from?' · كان '+dpKB(f.from):''}</small></span><button class="pb" data-act="dpsave" data-i="${i}" aria-label="تنزيل">⬇</button></div>`).join('')+`<div class="acts" style="margin-top:10px">${R.files.length>1?'<button class="btn" data-act="dpzip">🗜 تنزيل الكل (ZIP)</button>':''}${cs?'<button class="btn" data-act="dpshare">📤 مشاركة</button>':''}</div><div class="shm" style="margin-top:8px">راجع الملف بنفسك قبل رفعه على المنصة، خصوصاً وضوح النص بعد التصغير.</div>`)}
function dpSave(f){const u=URL.createObjectURL(f.blob),l=document.createElement('a');l.href=u;l.download=f.name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);toast('⬇ بدأ تنزيل «'+f.name+'» — افتحه من إشعار التنزيلات',4500)}
async function dpZip(){const ents=[];for(const f of DP.res.files){const u8=new Uint8Array(await f.blob.arrayBuffer());ents.push({name:f.name,method:0,time:0,date:0x21,crc:crc32(u8),cs:u8.length,us:u8.length,raw:u8})}
 dpSave({name:dpBase()+'.zip',blob:new Blob([zipWrite(ents)],{type:'application/zip'})})}
/* ---------- الواجهة ---------- */
function dpHome(){sheet(`<h2 class="sht">🗂 تجهيز المستندات</h2><div class="shm">صغّر الصور بحجم تحدده، حوّل صيغتها، اجمعها في PDF واحد، حسّن تصوير المستند، اطمس البيانات الحساسة، وأضف علامة مائية وترقيماً. <b>تتم المعالجة على جهازك ولا يُرفع أي ملف لأي خادم.</b></div><div class="acts one"><label class="btn pri">🖼 اختيار صور من الجهاز<input type="file" id="dpf" accept="image/*" multiple hidden></label><label class="btn">📷 تصوير بالكاميرا<input type="file" id="dpc" accept="image/*" capture="environment" hidden></label></div><div class="shm" style="margin-top:10px">الخطوات: اختر الصور ← عدّلها (قص، طمس، تحسين) ← اختر الإخراج (PDF أو صور) والحجم المستهدف ← نفّذ.</div>`)}
function dpWork(){if(!DP.items.length){dpHome();return}
 const o=(v,t,c)=>`<option value="${v}" ${c==v?'selected':''}>${t}</option>`;
 sheet(`<div class="shh"><h2 class="sht">🗂 ${DP.items.length} صورة</h2><label class="lnk">➕ إضافة<input type="file" id="dpf" accept="image/*" multiple hidden></label></div>`+DP.items.map((it,i)=>{if(!it.th)it.th=dpThumb(it);return `<div class="dpt"><img src="${it.th}" alt=""><div class="dpn"><b>${esc2(it.name)}</b><small>${it.ops.length?it.ops.length+' تعديل':'بلا تعديل'}</small><div class="dpb"><button class="pb" data-act="dpedit" data-i="${i}" aria-label="تعديل">✏️</button><button class="pb" data-act="dprot" data-i="${i}" aria-label="تدوير">↻</button><button class="pb" data-act="dpup" data-i="${i}" aria-label="أعلى">⬆</button><button class="pb" data-act="dpdn" data-i="${i}" aria-label="أسفل">⬇</button><button class="pb" data-act="dpdel" data-i="${i}" aria-label="حذف">🗑</button></div></div></div>`}).join('')+`<div class="shm mws">الإخراج</div><label class="fld"><span>الناتج</span><select data-dp="out">${o('pdf','ملف PDF واحد',DP.out)}${o('img','صور منفصلة',DP.out)}</select></label><label class="fld" ${DP.out=='pdf'?'hidden':''} id="dpfm"><span>صيغة الصور</span><select data-dp="fmt">${o('jpeg','JPG (الأصغر حجماً)',DP.fmt)}${o('png','PNG',DP.fmt)}${o('webp','WebP',DP.fmt)}</select></label><label class="fld"><span>الحجم المستهدف بالكيلوبايت (${DP.out=='pdf'?'للـPDF كله':'لكل صورة'}) — اتركه فارغاً بلا حد</span><input data-dp="kb" type="number" inputmode="numeric" min="20" value="${esc2(DP.kb)}" placeholder="مثال: 500"></label><div id="dpnote"></div><div class="dkc">${[200,500,1000,2000].map(k=>`<button class="chip ${DP.kb==k?'on':''}" data-act="dpkb" data-v="${k}">${k>=1000?(k/1000)+' م.ب':k+' ك.ب'}</button>`).join('')}<button class="chip" data-act="dpkb" data-v="">بلا حد</button></div><label class="fld"><span>أقصى بُعد للصورة (بكسل)</span><select data-dp="maxd">${o('0','الأصلي',DP.maxd)}${o('2400','2400',DP.maxd)}${o('1600','1600 (مناسب للمستندات)',DP.maxd)}${o('1200','1200',DP.maxd)}${o('800','800',DP.maxd)}</select></label><label class="fld" ${DP.out=='pdf'?'':'hidden'} id="dppg"><span>مقاس صفحة PDF</span><select data-dp="page">${o('a4','A4 بهوامش',DP.page)}${o('fit','بمقاس الصورة',DP.page)}</select></label><label class="mwk"><input type="checkbox" data-dp="gray" ${DP.gray?'checked':''}> أبيض وأسود (تدرج رمادي) لتقليل الحجم</label><label class="mwk"><input type="checkbox" data-dp="num" ${DP.num?'checked':''}> ترقيم الصفحات («صفحة 1 من 5»)</label><label class="fld"><span>علامة مائية (اختياري، مثال: للاطلاع فقط)</span><input data-dp="wm" value="${esc2(DP.wm)}" placeholder="نص يُكتب بشكل مائل"></label><label class="fld"><span>اسم الملف</span><input data-dp="name" value="${esc2(DP.name)}" placeholder="مستندات-${isoD(new Date())}"></label><button class="btn pri wide" data-act="dprun">▶ تنفيذ</button><button class="btn wide" data-act="dpclear" style="margin-top:8px">🗑 مسح الصور والبدء من جديد</button>`);dpNote()}
function dpNote(){const n=dpq('#dpnote');if(n)n.innerHTML=DP.out=='img'&&DP.fmt=='png'&&DP.kb?'<div class="wn">PNG لا يُضغط بخفض الجودة، فيُصغَّر حجمه بتقليل الأبعاد. للمستندات الممسوحة JPG أنسب.</div>':'';document.querySelectorAll('[data-act="dpkb"]').forEach(c=>c.classList.toggle('on',String(c.dataset.v)==String(DP.kb)))}
/* ---------- محرر الصورة ---------- */
function dpEdit(i){DPE.i=i;DPE.mode='';DPE.sel=null;dpEditView()}
function dpEditView(){const it=DP.items[DPE.i];it.cv=dpRender(it);const k=Math.min((Math.min(innerWidth-56,560))/it.cv.width,(innerHeight*0.42)/it.cv.height,1.5);DPE.k=k;
 sheet(`<div class="shh"><h2 class="sht">✏️ تعديل الصورة</h2><button class="lnk" data-act="dpdone">تم ←</button></div><div class="dpcv"><canvas id="dpe" width="${Math.round(it.cv.width*k)}" height="${Math.round(it.cv.height*k)}"></canvas></div><div class="shm" id="dph">${DPE.mode=='crop'?'ارسم بإصبعك المنطقة التي تريد الاحتفاظ بها ثم اضغط «تطبيق».':DPE.mode=='mask'?'ارسم المربع الذي تريد طمسه ثم اضغط «تطبيق». الطمس نهائي ولا يمكن استرجاعه من الملف الناتج.':'اختر أداة: قص أو طمس أو تدوير أو تحسين.'}</div><button class="btn pri wide" data-act="dpapply" id="dpap" hidden>✅ تطبيق</button><div class="acts" style="margin-top:8px"><button class="btn ${DPE.mode=='crop'?'pri':''}" data-act="dpm" data-m="crop">✂️ قص</button><button class="btn ${DPE.mode=='mask'?'pri':''}" data-act="dpm" data-m="mask">⬛ طمس</button><button class="btn" data-act="dprot" data-i="${DPE.i}" data-e="1">↻ تدوير</button><button class="btn" data-act="dpundo">↩ تراجع</button></div><div class="shm mws">تحسين تصوير المستند</div><div class="dkc"><button class="chip" data-act="dpfil" data-f="gray">رمادي</button><button class="chip" data-act="dpfil" data-f="contrast">تباين</button><button class="chip" data-act="dpfil" data-f="scan">مسح ضوئي (يزيل الظلال)</button><button class="chip" data-act="dpfil" data-f="bw">أبيض وأسود</button></div>`);
 const cv=dpq('#dpe');cv.style.touchAction='none';let dr=null;const pt=e=>{const r=cv.getBoundingClientRect();return{x:Math.max(0,Math.min(it.cv.width,(e.clientX-r.left)/r.width*it.cv.width)),y:Math.max(0,Math.min(it.cv.height,(e.clientY-r.top)/r.height*it.cv.height))}};
 cv.onpointerdown=e=>{if(!DPE.mode)return;try{cv.setPointerCapture(e.pointerId)}catch(x){}dr=pt(e);DPE.sel=null;dpDraw()};
 cv.onpointermove=e=>{if(!dr)return;const p=pt(e);DPE.sel={x:Math.min(dr.x,p.x),y:Math.min(dr.y,p.y),w:Math.abs(p.x-dr.x),h:Math.abs(p.y-dr.y)};dpDraw()};
 cv.onpointerup=()=>{dr=null;dpDraw()};dpDraw()}
function dpDraw(){const it=DP.items[DPE.i],cv=dpq('#dpe');if(!cv)return;const x=cv.getContext('2d'),k=DPE.k;x.clearRect(0,0,cv.width,cv.height);x.drawImage(it.cv,0,0,cv.width,cv.height);const s=DPE.sel;
 if(s&&s.w>2&&s.h>2){if(DPE.mode=='crop'){x.fillStyle='rgba(0,0,0,.5)';x.fillRect(0,0,cv.width,cv.height);x.drawImage(it.cv,s.x,s.y,s.w,s.h,s.x*k,s.y*k,s.w*k,s.h*k)}else{x.fillStyle='rgba(0,0,0,.55)';x.fillRect(s.x*k,s.y*k,s.w*k,s.h*k)}x.strokeStyle='#e8b04a';x.lineWidth=2;x.setLineDash([6,4]);x.strokeRect(s.x*k,s.y*k,s.w*k,s.h*k)}
 const b=dpq('#dpap');if(b)b.hidden=!(DPE.mode&&s&&s.w>8&&s.h>8)}
const dpOp=(it,o)=>{it.ops.push(o);it.th=null};
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,i=+el.dataset.i;
 if(a=='dp')dpHome();else if(a=='dpwork')dpWork();
 else if(a=='dpedit')dpEdit(i);
 else if(a=='dpdone'){DP.items.forEach(x=>x.th=null);dpWork()}
 else if(a=='dprot'){const it=DP.items[i];if(it){dpOp(it,{t:'rot',d:90});el.dataset.e?dpEditView():dpWork()}}
 else if(a=='dpup'&&i>0){[DP.items[i-1],DP.items[i]]=[DP.items[i],DP.items[i-1]];dpWork()}
 else if(a=='dpdn'&&i<DP.items.length-1){[DP.items[i+1],DP.items[i]]=[DP.items[i],DP.items[i+1]];dpWork()}
 else if(a=='dpdel'){DP.items.splice(i,1);dpWork()}
 else if(a=='dpclear'){if(confirm('مسح كل الصور؟')){DP.items=[];DP.res=null;dpHome()}}
 else if(a=='dpm'){DPE.mode=DPE.mode==el.dataset.m?'':el.dataset.m;DPE.sel=null;dpEditView()}
 else if(a=='dpundo'){const it=DP.items[DPE.i];if(it&&it.ops.length){it.ops.pop();it.th=null;DPE.sel=null;dpEditView()}}
 else if(a=='dpfil'){const it=DP.items[DPE.i];if(it){dpOp(it,{t:'filter',f:el.dataset.f});dpEditView()}}
 else if(a=='dpapply'){const it=DP.items[DPE.i],s=DPE.sel;if(it&&s&&s.w>8&&s.h>8){const o={t:DPE.mode,x:Math.round(s.x),y:Math.round(s.y),w:Math.round(s.w),h:Math.round(s.h)};dpOp(it,o);DPE.sel=null;if(o.t=='crop')DPE.mode='';dpEditView()}}
 else if(a=='dpkb'){DP.kb=el.dataset.v;dpWork()}
 else if(a=='dprun')dpRun();
 else if(a=='dpsave'){const f=DP.res&&DP.res.files[i];if(f)dpSave(f)}
 else if(a=='dpzip')dpZip();
 else if(a=='dpshare'){const fs=DP.res.files.map(f=>new File([f.blob],f.name,{type:f.type}));try{await navigator.share({files:fs,title:dpBase()})}catch(x){}}});
document.addEventListener('change',async e=>{const el=e.target;
 if(el.id=='dpf'||el.id=='dpc'){const fl=[...el.files];if(!fl.length)return;toast('جارٍ قراءة الصور…',1500);let bad=0;for(const f of fl){const it=await dpLoad(f);if(it)DP.items.push(it);else bad++}if(bad)toast('تعذّرت قراءة '+bad+' ملف (قد تكون صيغة HEIC غير مدعومة في هذا المتصفح)',4500);el.value='';dpWork();return}
 if(el.dataset&&el.dataset.dp){const k=el.dataset.dp;DP[k]=el.type=='checkbox'?el.checked:el.value;if(k=='out'||k=='fmt')dpWork()}});
document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.dp&&['kb','wm','name'].includes(el.dataset.dp)){DP[el.dataset.dp]=el.value;if(el.dataset.dp=='kb')dpNote()}});
