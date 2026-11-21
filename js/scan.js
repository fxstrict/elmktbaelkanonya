/* الحسام سكان — المرحلة N1: ماسح المستندات.
   كاميرا مباشرة (مع بديل إدخال الملف)، استيراد من المعرض، صفحات متعددة، تصوير دفعي، قص بأربع نقاط مع تصحيح المنظور، وضع بطاقة الهوية (وجهان في صفحة A4).
   بلا قاعدة بيانات: العمل في ذاكرة الجلسة (DP.items من docprep.js) والأصل محفوظ دائماً (التعديلات عمليات فوقه). كل المعالجة على الجهاز. */
const SC={mode:'doc',batch:false,grid:true,saved:true,stream:null,track:null,n:0,id:null,cr:null};
const SCM={doc:['📄','مستند',0],id:['🪪','بطاقة هوية',1.586],pass:['🛂','جواز سفر',1.42],rec:['🧾','إيصال',0]};
const scq=s=>document.querySelector(s),scName=s=>String(s||'').replace(/[\\\/:*?"<>|]/g,'-').replace(/\s+/g,' ').trim();
function scFromCanvas(cv,name){const k=Math.min(1,DPMAX/Math.max(cv.width,cv.height));if(k<1)cv=dpScale(cv,k);return{id:++_dpid,name:name||('صفحة '+(DP.items.length+1)),orig:cv,ops:[],size:0,th:null}}
/* ---------- هندسة: تحويل رباعي إلى مستطيل (تصحيح المنظور) ---------- */
/* يحوّل مربع الوحدة (u,v) إلى الرباعي p بالترتيب: أعلى-يمين-منظور… p=[[x,y]×4] = TL,TR,BR,BL */
function scH(p){const[x0,y0]=p[0],[x1,y1]=p[1],[x2,y2]=p[2],[x3,y3]=p[3],dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;let g=0,h=0;
 if(Math.abs(dx3)>1e-9||Math.abs(dy3)>1e-9){const den=dx1*dy2-dx2*dy1;g=(dx3*dy2-dx2*dy3)/den;h=(dx1*dy3-dx3*dy1)/den}
 return[x1-x0+g*x1,x3-x0+h*x3,x0,y1-y0+g*y1,y3-y0+h*y3,y0,g,h]}
const scDist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function scSize(p){let w=Math.max(scDist(p[0],p[1]),scDist(p[3],p[2])),h=Math.max(scDist(p[0],p[3]),scDist(p[1],p[2])),k=Math.min(1,DPMAX/Math.max(w,h,1));return[Math.max(8,Math.round(w*k)),Math.max(8,Math.round(h*k))]}
function scConvex(p){let s=0;for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4],c=p[(i+2)%4],z=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);if(Math.abs(z)<1e-6)return false;const q=z>0?1:-1;if(!s)s=q;else if(s!=q)return false}return true}
/* قلب المعالجة (يعمل على بيانات الصورة مباشرة فيُختبر بلا canvas) */
function scWarpData(S,sw,sh,p,w,h){const[a,b,c,d,e,f,g,hh]=scH(p),O=new Uint8ClampedArray(w*h*4);
 for(let j=0;j<h;j++){const v=(j+.5)/h;for(let i=0;i<w;i++){const u=(i+.5)/w,z=g*u+hh*v+1,x=(a*u+b*v+c)/z-.5,y=(d*u+e*v+f)/z-.5;let x0=Math.floor(x),y0=Math.floor(y);const fx=x-x0,fy=y-y0;
  let x1=x0+1,y1=y0+1;x0=x0<0?0:x0>sw-1?sw-1:x0;x1=x1<0?0:x1>sw-1?sw-1:x1;y0=y0<0?0:y0>sh-1?sh-1:y0;y1=y1<0?0:y1>sh-1?sh-1:y1;
  const i00=(y0*sw+x0)*4,i10=(y0*sw+x1)*4,i01=(y1*sw+x0)*4,i11=(y1*sw+x1)*4,o=(j*w+i)*4,w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
  O[o]=S[i00]*w00+S[i10]*w10+S[i01]*w01+S[i11]*w11;O[o+1]=S[i00+1]*w00+S[i10+1]*w10+S[i01+1]*w01+S[i11+1]*w11;O[o+2]=S[i00+2]*w00+S[i10+2]*w10+S[i01+2]*w01+S[i11+2]*w11;O[o+3]=255}}
 return O}
/* يُستدعى من dpRender عند عملية t:'quad' — النتيجة تُخزَّن في العملية لتفادي إعادة الحساب */
function scWarp(src,o){if(o._c)return o._c;const out=dpCv(o.w,o.h),sx=src.getContext('2d'),S=sx.getImageData(0,0,src.width,src.height).data;
 out.getContext('2d').putImageData(new ImageData(scWarpData(S,src.width,src.height,o.p,o.w,o.h),o.w,o.h),0,0);o._c=out;return out}
/* ---------- شاشة القص بأربع نقاط ---------- */
function scCrop(cv,title){return new Promise(res=>{SC.cr={cv,res,rot:0,title:title||'✂️ حدّد حدود الورقة'};scCropView()})}
function scCropView(){const r=SC.cr,cv=r.cv,k=Math.min(Math.min(innerWidth-40,560)/cv.width,(innerHeight*0.5)/cv.height,1.6);r.k=k;
 r.pts=[[.04,.04],[.96,.04],[.96,.96],[.04,.96]].map(([x,y])=>[x*cv.width,y*cv.height]);
 sheet(`<div class="shh"><h2 class="sht">${r.title}</h2><button class="lnk" data-act="scfull">الصورة كاملة ←</button></div><div class="dpcv"><canvas id="scc" width="${Math.round(cv.width*k)}" height="${Math.round(cv.height*k)}"></canvas></div><div class="shm">اسحب الدوائر الأربع إلى زوايا الورقة ثم اضغط «قص». يُصحَّح المنظور تلقائياً ويبقى الأصل محفوظاً.</div><div class="acts"><button class="btn pri" data-act="scok">✂️ قص وتصحيح</button><button class="btn" data-act="scrot">↻ تدوير</button></div><button class="lnk" data-act="sccancel" style="margin-top:6px">إلغاء هذه الصفحة</button>`);
 const c=scq('#scc');c.style.touchAction='none';let dr=-1;
 const xy=e=>{const b=c.getBoundingClientRect();return[(e.clientX-b.left)/b.width*cv.width,(e.clientY-b.top)/b.height*cv.height]};
 c.onpointerdown=e=>{const q=xy(e);let best=-1,bd=1e9;r.pts.forEach((p,i)=>{const d=scDist(p,q)*k;if(d<bd){bd=d;best=i}});if(bd<56){dr=best;try{c.setPointerCapture(e.pointerId)}catch(x){}}};
 c.onpointermove=e=>{if(dr<0)return;const q=xy(e);r.pts[dr]=[Math.max(0,Math.min(cv.width,q[0])),Math.max(0,Math.min(cv.height,q[1]))];scCropDraw()};
 c.onpointerup=c.onpointercancel=()=>{dr=-1};scCropDraw()}
function scCropDraw(){const r=SC.cr,c=scq('#scc');if(!c)return;const x=c.getContext('2d'),k=r.k,P=r.pts.map(p=>[p[0]*k,p[1]*k]);x.clearRect(0,0,c.width,c.height);x.drawImage(r.cv,0,0,c.width,c.height);
 x.save();x.beginPath();x.rect(0,0,c.width,c.height);x.moveTo(P[0][0],P[0][1]);P.slice(1).forEach(p=>x.lineTo(p[0],p[1]));x.closePath();x.fillStyle='rgba(0,0,0,.5)';x.fill('evenodd');x.restore();
 x.strokeStyle='#e8b04a';x.lineWidth=2;x.beginPath();x.moveTo(P[0][0],P[0][1]);P.slice(1).forEach(p=>x.lineTo(p[0],p[1]));x.closePath();x.stroke();
 P.forEach(p=>{x.beginPath();x.arc(p[0],p[1],13,0,7);x.fillStyle='rgba(232,176,74,.35)';x.fill();x.lineWidth=2;x.stroke();x.beginPath();x.arc(p[0],p[1],3,0,7);x.fillStyle='#e8b04a';x.fill()})}
const scRotOps=r=>r.rot%4?[{t:'rot',d:(r.rot%4)*90}]:[];
function scRotCv(cv){const n=dpCv(cv.height,cv.width),x=n.getContext('2d');x.translate(n.width/2,n.height/2);x.rotate(Math.PI/2);x.drawImage(cv,-cv.width/2,-cv.height/2);return n}
/* ---------- إدخال الصفحة إلى الجلسة ---------- */
async function scIngest(it){const r=await scCrop(it.orig);if(!r)return false;r.ops.forEach(o=>it.ops.push(o));
 if(SC.mode=='id'){(SC.id=SC.id||[]).push(dpRender(it));if(SC.id.length==2){scComposeId();}return true}
 DP.items.push(it);SC.saved=false;return true}
function scComposeId(){const[a,b]=SC.id,W=1240,H=1754,cv=dpCv(W,H),x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);const cw=1000,ah=Math.round(cw*a.height/a.width),bh=Math.round(cw*b.height/b.width),gap=110,top=Math.max(60,Math.round((H-ah-bh-gap)/2));
 x.drawImage(a,(W-cw)/2,top,cw,ah);x.drawImage(b,(W-cw)/2,top+ah+gap,cw,bh);x.strokeStyle='#bbb';x.lineWidth=2;x.strokeRect((W-cw)/2,top,cw,ah);x.strokeRect((W-cw)/2,top+ah+gap,cw,bh);
 DP.items.push({id:++_dpid,name:'بطاقة هوية (وجهان)',orig:cv,ops:[],size:0,th:null});SC.id=null;SC.saved=false}
function scAfter(){if(SC.mode=='id'&&SC.id&&SC.id.length==1){sheet(`<h2 class="sht">🪪 الوجه الخلفي</h2><div class="shm">تم قص الوجه الأمامي. صوّر الوجه الخلفي أو اخترْه من المعرض ليوضع الوجهان في صفحة A4 واحدة.</div><div class="acts"><button class="btn pri" data-act="scam">📷 تصوير</button><button class="btn" data-act="scgal">🖼 من المعرض</button></div><button class="lnk" data-act="scidskip" style="margin-top:6px">الاكتفاء بوجه واحد</button>`);return}scNext()}
function scNext(){const n=DP.items.length;sheet(`<h2 class="sht">✅ تمت الإضافة</h2><div class="shm">عدد الصفحات الآن: <b>${n}</b>. لا يُحفظ شيء داخل التطبيق: عند الانتهاء صدّر الملف (PDF أو صور) وسيُحفظ على جهازك.</div><div class="acts"><button class="btn" data-act="scam">📷 صفحة أخرى</button><button class="btn" data-act="scgal">🖼 استيراد</button><button class="btn pri span2" data-act="dpwork">متابعة: ترتيب وتحسين وتصدير ←</button></div>`)}
/* ---------- الاستيراد من المعرض أو بديل الكاميرا ---------- */
function scPick(capture){const i=document.createElement('input');i.type='file';i.accept='image/*';if(capture)i.setAttribute('capture','environment');else i.multiple=true;i.style.display='none';document.body.appendChild(i);
 i.onchange=async()=>{const fl=[...i.files];i.remove();if(fl.length)await scFiles(fl)};i.addEventListener('cancel',()=>i.remove());i.click()}
async function scFiles(fl){toast('جارٍ قراءة الصور…',1500);let bad=0,ok=0;for(const f of fl){const it=await dpLoad(f);if(!it){bad++;continue}it.name=SC.mode=='id'?'بطاقة':'صفحة '+(DP.items.length+1);if(await scIngest(it))ok++}
 if(bad)toast('تعذّرت قراءة '+bad+' ملف (قد تكون HEIC غير مدعومة في هذا المتصفح)',4500);if(ok||SC.id)scAfter();else if(DP.items.length)dpWork();else scHome()}
/* ---------- الكاميرا المباشرة ---------- */
function scStop(){if(SC.stream){SC.stream.getTracks().forEach(t=>t.stop())}SC.stream=null;SC.track=null;const o=scq('#scam');if(o)o.remove();document.body.classList.remove('lock')}
async function scCam(){if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('الكاميرا المباشرة غير مدعومة هنا — سيفتح تطبيق الكاميرا',3500);scPick(true);return}
 closeSheet();scStop();let st;
 try{st=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:3840},height:{ideal:2160}},audio:false})}
 catch(e){try{st=await navigator.mediaDevices.getUserMedia({video:true,audio:false})}catch(e2){toast(e2&&e2.name=='NotAllowedError'?'لم تسمح بالكاميرا (فعّلها من إعدادات الموقع) — سيفتح تطبيق الكاميرا':'تعذّر فتح الكاميرا — سيفتح تطبيق الكاميرا',4500);scPick(true);return}}
 SC.stream=st;SC.track=st.getVideoTracks()[0];SC.n=0;const cap=(SC.track.getCapabilities&&SC.track.getCapabilities())||{},m=SCM[SC.mode],o=document.createElement('div');o.id='scam';
 o.innerHTML=`<video id="scv" autoplay playsinline muted></video><div class="scg ${SC.grid?'':'off'}" id="scgd"></div>${m[2]?`<div class="scf" style="aspect-ratio:${m[2]}"></div>`:''}<div class="scfl" id="scfl"></div><div class="sctop"><button class="scb" data-act="scclose" aria-label="إغلاق">✕</button><span>${m[0]} ${m[1]}</span><span class="scn" id="scn"></span></div><div class="scside"><button class="scb" data-act="scbatch" id="scbt" aria-label="تصوير دفعي">${SC.batch?'📚':'📄'}</button><button class="scb" data-act="scgrid" aria-label="الشبكة">▦</button><button class="scb" data-act="sctorch" id="sctc" aria-label="الفلاش" ${cap.torch?'':'hidden'}>🔦</button></div>${cap.zoom?`<input type="range" id="sczm" min="${cap.zoom.min}" max="${cap.zoom.max}" step="${cap.zoom.step||0.1}" value="${cap.zoom.min}" aria-label="التقريب">`:''}<div class="scbot"><button class="scb" data-act="scgal" aria-label="المعرض">🖼</button><button class="scshut" data-act="scshot" aria-label="التقاط"></button><button class="scb" data-act="scdone" id="scdn" aria-label="تم" hidden>✔</button></div>`;
 document.body.appendChild(o);document.body.classList.add('lock');const v=scq('#scv');v.srcObject=st;v.play&&v.play().catch(()=>{});
 const z=scq('#sczm');if(z)z.oninput=()=>{try{SC.track.applyConstraints({advanced:[{zoom:+z.value}]})}catch(e){}}}
async function scShot(){const v=scq('#scv');if(!v||!v.videoWidth){toast('الكاميرا لم تجهز بعد',1200);return}
 const cv=dpCv(v.videoWidth,v.videoHeight);cv.getContext('2d').drawImage(v,0,0);const f=scq('#scfl');if(f){f.classList.remove('on');void f.offsetWidth;f.classList.add('on')}
 const it=scFromCanvas(cv,SC.mode=='id'?'بطاقة':undefined);
 if(SC.batch&&SC.mode!='id'){DP.items.push(it);SC.saved=false;SC.n++;const n=scq('#scn'),d=scq('#scdn');if(n)n.textContent=SC.n+' صفحة';if(d)d.hidden=false;return}
 scStop();if(await scIngest(it))scAfter();else scHome()}
/* ---------- الشاشات ---------- */
function scHome(){const ch=Object.entries(SCM).map(([k,m])=>`<button class="chip ${SC.mode==k?'on':''}" data-act="scmode" data-m="${k}">${m[0]} ${m[1]}</button>`).join('');
 sheet(`<h2 class="sht">📸 ماسح المستندات</h2><div class="shm">صوّر المستند أو استورده، ثم حدّد حدود الورقة ليُصحَّح المنظور. الأصل يبقى محفوظاً أثناء الجلسة، ولا يُرفع شيء لأي خادم. <b>لا يُخزَّن شيء داخل التطبيق</b>؛ بعد الانتهاء صدّر PDF أو صوراً ليُحفظ على جهازك.</div><div class="shm mws">نوع المستند</div><div class="dkc">${ch}</div><div class="dkc" style="margin-top:6px"><button class="chip ${SC.batch?'on':''}" data-act="scbatch2">📚 تصوير دفعي متتالٍ</button></div><div class="acts" style="margin-top:10px"><button class="btn pri" data-act="scam">📷 فتح الكاميرا</button><button class="btn" data-act="scgal">🖼 استيراد من المعرض</button></div>${DP.items.length?`<button class="btn wide" data-act="dpwork" style="margin-top:8px">متابعة الصفحات الحالية (${DP.items.length}) ←</button>`:''}`)}
function scStart(ctx){if(ctx&&!DP.items.length)DP.name=ctx;SC.id=null;scHome()}
/* ---------- الأحداث ---------- */
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='scan'||a=='scancase'){let ctx='';if(a=='scancase'&&typeof curCase=='function'){const c=curCase();if(c)ctx=scName([c.name,c.no&&(c.no+(c.year?'-'+c.year:''))].filter(Boolean).join(' '))}scStart(ctx)}
 else if(a=='scmode'){SC.mode=el.dataset.m;SC.id=null;scHome()}
 else if(a=='scbatch2'){SC.batch=!SC.batch;scHome()}
 else if(a=='scam')scCam();
 else if(a=='scgal'){if(scq('#scam')){scStop()}scPick(false)}
 else if(a=='scshot')scShot();
 else if(a=='scclose'){scStop();if(DP.items.length)dpWork();else scHome()}
 else if(a=='scdone'){scStop();dpWork()}
 else if(a=='scbatch'){SC.batch=!SC.batch;el.textContent=SC.batch?'📚':'📄';toast(SC.batch?'التصوير الدفعي: تُضاف الصفحات دون قص (يمكن قصها لاحقاً)':'تصوير صفحة بصفحة مع القص',2200)}
 else if(a=='scgrid'){SC.grid=!SC.grid;const g=scq('#scgd');if(g)g.classList.toggle('off',!SC.grid)}
 else if(a=='sctorch'){SC.torch=!SC.torch;try{await SC.track.applyConstraints({advanced:[{torch:SC.torch}]});el.classList.toggle('on',SC.torch)}catch(x){toast('الفلاش غير متاح',1500)}}
 else if(a=='scok'&&SC.cr){const r=SC.cr;if(!scConvex(r.pts)){toast('الزوايا متقاطعة — رتّبها: أعلى يمين… ثم أسفل',3000);return}const[w,h]=scSize(r.pts);SC.cr=null;r.res({ops:[...scRotOps(r),{t:'quad',p:r.pts.map(p=>[p[0],p[1]]),w,h}]})}
 else if(a=='scfull'&&SC.cr){const r=SC.cr;SC.cr=null;r.res({ops:scRotOps(r)})}
 else if(a=='sccancel'&&SC.cr){const r=SC.cr;SC.cr=null;r.res(null)}
 else if(a=='scrot'&&SC.cr){SC.cr.cv=scRotCv(SC.cr.cv);SC.cr.rot++;scCropView()}
 else if(a=='scidskip'){if(SC.id&&SC.id.length==1){const c=SC.id[0];DP.items.push({id:++_dpid,name:'بطاقة هوية',orig:c,ops:[],size:0,th:null});SC.id=null;SC.saved=false}scNext()}
 else if(a=='scquad'){const it=DP.items[+el.dataset.i];if(!it)return;DPE.i=+el.dataset.i;const r=await scCrop(dpRender(it),'📐 قص بالزوايا');if(r)r.ops.forEach(o=>dpOp(it,o));dpEditView()}
 else if(a=='dpshare'||a=='dpzip')SC.saved=true});
document.addEventListener('change',e=>{const i=e.target.id;if(i=='dpf'||i=='dpc')SC.saved=false});
const _scSave=window.dpSave;window.dpSave=function(f){SC.saved=true;return _scSave(f)};
window.addEventListener('beforeunload',e=>{if(DP.items.length&&!SC.saved){e.preventDefault();e.returnValue=''}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&SC.stream)scStop()});
