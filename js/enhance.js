/* تحسين الصورة (N2 — 1.16.6): ألوان سحرية، أبيض/أسود تكيّفي، إزالة الظلال، تنظيف الخلفية، تقليل التشويش والوهج، إزالة الحبر الملوّن،
   سطوع/تباين/حدّة، ممحاة يدوية، مقارنة بالأصل، وأوضاع جاهزة (مستند، هوية، جواز، إيصال، عقد، محضر، حكم).
   إضافة فقط: لا يُعدَّل docprep.js. كل تحسين «عملية» filter فوق الصورة الأصلية (فيبقى الأصل محفوظاً ويعمل التراجع)، وتُنفَّذ عبر لفّ dpFilter:
   الاسم أو «الاسم:رقم:رقم» مثل adj:10:20:30 و erase:x:y:w:h. أي اسم قديم (gray/contrast/scan/bw) يمر إلى الدالة الأصلية كما هو.
   المعالجة كلها في المتصفح بلا رفع. الدوال النقية في EN.core تعمل على مصفوفة RGBA (Uint8ClampedArray) لسهولة الاختبار. */
const EN={core:{},cmp:null};
(function(){
 const C=EN.core,cl=v=>v<0?0:v>255?255:v;
 /* ---- شبكة كتل: لكل كتلة B×B المئين pct (0..1) لكل قناة، أو المتوسط إن كان pct<0؛ ثم تنعيم 3×3 مرتين ---- */
 function grid(d,step,nch,w,h,pct,B,ch0){ch0=ch0||0;const gw=Math.ceil(w/B),gh=Math.ceil(h/B),G=[];for(let c=0;c<nch;c++)G.push(new Float32Array(gw*gh));
  const st=Math.max(1,Math.floor(B/14)),hs=new Uint16Array(256);
  for(let by=0;by<gh;by++)for(let bx=0;bx<gw;bx++){const x0=bx*B,y0=by*B,x1=Math.min(w,x0+B),y1=Math.min(h,y0+B);
   for(let c=0;c<nch;c++){let cnt=0,sum=0;if(pct>=0)hs.fill(0);
    for(let y=y0;y<y1;y+=st){let p=(y*w+x0)*step+c+ch0;for(let x=x0;x<x1;x+=st,p+=step*st){const v=d[p];if(pct>=0)hs[v]++;else sum+=v;cnt++}}
    let r=128;if(pct<0)r=sum/Math.max(1,cnt);else{const t=cnt*pct;let s=0;for(let v=0;v<256;v++){s+=hs[v];if(s>=t){r=v;break}}}
    G[c][by*gw+bx]=r}}
  for(let c=0;c<nch;c++)for(let pass=0;pass<2;pass++){const a=G[c],o=new Float32Array(a.length);
   for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){let s=0,n=0;for(let j=-1;j<=1;j++){const yy=y+j;if(yy<0||yy>=gh)continue;for(let i=-1;i<=1;i++){const xx=x+i;if(xx<0||xx>=gw)continue;s+=a[yy*gw+xx];n++}}o[y*gw+x]=s/n}
   G[c]=o}
  const X0=new Int32Array(w),X1=new Int32Array(w),WX=new Float32Array(w);for(let x=0;x<w;x++){let fx=(x+0.5)/B-0.5;fx=fx<0?0:fx>gw-1?gw-1:fx;const a=Math.floor(fx);X0[x]=a;X1[x]=Math.min(gw-1,a+1);WX[x]=fx-a}
  return{gw,gh,B,G,X0,X1,WX}}
 /* قيم الخلفية المستوفاة (bilinear) لصف y كاملاً: تملأ out[x*nch+c] */
 function rowBg(g,w,y,out){const{gw,gh,B,G,X0,X1,WX}=g,nch=G.length;let fy=(y+0.5)/B-0.5;fy=fy<0?0:fy>gh-1?gh-1:fy;const y0=Math.floor(fy),y1=Math.min(gh-1,y0+1),wy=fy-y0,r0=y0*gw,r1=y1*gw;
  for(let c=0;c<nch;c++){const a=G[c];for(let x=0;x<w;x++){const x0=X0[x],x1=X1[x],wx=WX[x],t=a[r0+x0]+(a[r0+x1]-a[r0+x0])*wx,b=a[r1+x0]+(a[r1+x1]-a[r1+x0])*wx;out[x*nch+c]=t+(b-t)*wy}}}
 const blk=(w,h)=>Math.max(12,Math.round(Math.min(w,h)/28));
 /* ---- إزالة الظلال: قسمة كل قناة على خلفيتها المقدَّرة (يحافظ على الألوان ويضبط توازن الأبيض) ---- */
 C.shadow=function(d,w,h){const g=grid(d,4,3,w,h,0.85,blk(w,h)),bg=new Float32Array(w*3);
  for(let y=0;y<h;y++){rowBg(g,w,y,bg);let p=y*w*4;for(let x=0,j=0;x<w;x++,p+=4,j+=3){const b0=bg[j]<40?40:bg[j],b1=bg[j+1]<40?40:bg[j+1],b2=bg[j+2]<40?40:bg[j+2];d[p]=d[p]*260.1/b0;d[p+1]=d[p+1]*260.1/b1;d[p+2]=d[p+2]*260.1/b2}}}
 /* مدّ المستويات حسب سطوع الصورة (1% و99.5%) على كل القنوات بالتساوي */
 function stretch(d,w,h,hiPct){const n=w*h,hs=new Uint32Array(256);for(let p=0;p<n*4;p+=4)hs[(0.299*d[p]+0.587*d[p+1]+0.114*d[p+2])|0]++;
  let s=0,lo=0,hi=255;const t1=n*0.01,t2=n*(1-(hiPct||0.005));for(let v=0;v<256;v++){s+=hs[v];if(s>=t1){lo=v;break}}s=0;for(let v=0;v<256;v++){s+=hs[v];if(s>=t2){hi=v;break}}
  hi=Math.max(hi,lo+20);const k=255/(hi-lo);for(let p=0;p<n*4;p+=4){d[p]=cl((d[p]-lo)*k);d[p+1]=cl((d[p+1]-lo)*k);d[p+2]=cl((d[p+2]-lo)*k)}}
 function saturate(d,n,f){for(let p=0;p<n*4;p+=4){const L=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2];d[p]=cl(L+(d[p]-L)*f);d[p+1]=cl(L+(d[p+1]-L)*f);d[p+2]=cl(L+(d[p+2]-L)*f)}}
 C.magic=function(d,w,h){C.shadow(d,w,h);stretch(d,w,h);saturate(d,w*h,1.18)};
 /* ---- تنظيف الخلفية: إزالة الظلال ثم دفع الأبيض المائل للرمادي إلى أبيض نقي مع بقاء الألوان ---- */
 C.bgclean=function(d,w,h){C.shadow(d,w,h);const k=255/(222-22);for(let p=0;p<w*h*4;p+=4){d[p]=cl((d[p]-22)*k);d[p+1]=cl((d[p+1]-22)*k);d[p+2]=cl((d[p+2]-22)*k)}};
 /* ---- أبيض وأسود تكيّفي: إزالة الظلال ثم عتبة محلية (حبر = أغمق من متوسط جواره بنسبة وبفارق كافٍ) ---- */
 C.adapt=function(d,w,h){C.shadow(d,w,h);const n=w*h,B=blk(w,h),g=grid(d,4,1,w,h,-1,Math.max(8,B),1),m=new Float32Array(w);
  for(let y=0;y<h;y++){rowBg(g,w,y,m);let p=y*w*4;for(let x=0;x<w;x++,p+=4){const L=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2],mu=Math.max(m[x],60),ink=L<mu*0.86&&mu-L>14&&L<225;const v=ink?0:255;d[p]=d[p+1]=d[p+2]=v}}};
 /* ---- متوسط 3×3 لقناة ch ← out (Uint8) ---- */
 function box3(d,w,h,ch,out,tmp){const n=w*h;
  for(let y=0;y<h;y++){const r=y*w;for(let x=0;x<w;x++){const a=d[(r+(x>0?x-1:x))*4+ch],b=d[(r+x)*4+ch],c=d[(r+(x<w-1?x+1:x))*4+ch];tmp[r+x]=a+b+c}}
  for(let y=0;y<h;y++){const r0=(y>0?y-1:y)*w,r1=y*w,r2=(y<h-1?y+1:y)*w;for(let x=0;x<w;x++)out[r1+x]=(tmp[r0+x]+tmp[r1+x]+tmp[r2+x])/9}}
 /* ---- تقليل التشويش: تنعيم المناطق المستوية فقط (الفرق عن متوسط الجوار < T) فتبقى حواف الحروف ---- */
 C.denoise=function(d,w,h,a){const T=a&&a[0]>0?a[0]:22,n=w*h,out=new Uint8ClampedArray(n),tmp=new Uint16Array(n);
  for(let c=0;c<3;c++){box3(d,w,h,c,out,tmp);for(let i=0,p=c;i<n;i++,p+=4){const m=out[i];if(Math.abs(d[p]-m)<T)d[p]=m}}};
 /* ---- تقليل الوهج (جزئي): تخفيف البقع الأفتح من إضاءة الصورة العامة ثم ضغط الدرجات الساطعة جداً. لا يستعيد تفاصيل ضاعت بالسطوع الكامل ---- */
 C.glare=function(d,w,h){const g=grid(d,4,1,w,h,0.5,Math.max(16,blk(w,h)*2),1),all=Array.from(g.G[0]).sort((a,b)=>a-b),T=all[all.length>>1]||128,m=new Float32Array(w);
  for(let y=0;y<h;y++){rowBg(g,w,y,m);let p=y*w*4;for(let x=0;x<w;x++,p+=4){const I=m[x];if(I>T*1.06){const f=Math.max(0.6,T*1.06/I);d[p]=cl(d[p]*f);d[p+1]=cl(d[p+1]*f);d[p+2]=cl(d[p+2]*f)}
    for(let c=0;c<3;c++){const v=d[p+c];if(v>225)d[p+c]=225+(v-225)*0.5}}}
  stretch(d,w,h,0.002)};
 /* ---- إزالة الحبر الملوّن (جزئي): الأزرق والأحمر المشبعان يُستبدلان بلون الورقة. لا يزيل الخط بالحبر الأسود/الداكن ---- */
 C.inkoff=function(d,w,h){const n=w*h,g=grid(d,4,3,w,h,0.85,blk(w,h)),M=new Uint8Array(n);
  for(let i=0,p=0;i<n;i++,p+=4){const r=d[p],gg=d[p+1],b=d[p+2],L=0.299*r+0.587*gg+0.114*b;
   if(L<200&&((b>r+22&&b>gg+8)||(r>gg+55&&r>b+45)))M[i]=1}
  const D=new Uint8Array(n);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(M[i]){D[i]=1;continue}let f=0;
   for(let j=-1;j<=1&&!f;j++){const yy=y+j;if(yy<0||yy>=h)continue;for(let k=-1;k<=1;k++){const xx=x+k;if(xx<0||xx>=w)continue;if(M[yy*w+xx]){f=1;break}}}D[i]=f}
  const bg=new Float32Array(w*3);for(let y=0;y<h;y++){rowBg(g,w,y,bg);let p=y*w*4,i=y*w;for(let x=0;x<w;x++,p+=4,i++){if(D[i]){d[p]=bg[x*3];d[p+1]=bg[x*3+1];d[p+2]=bg[x*3+2]}}}};
 /* ---- سطوع/تباين/حدّة: adj:سطوع:تباين:حدّة (كل منها -100..100، والحدّة 0..100) ---- */
 C.adj=function(d,w,h,a){const b=(a&&a[0]||0)*2.55,c2=(a&&a[1]||0)*2.55,s=Math.max(0,(a&&a[2]||0))/50,f=(259*(c2+255))/(255*(259-c2)),L=new Uint8ClampedArray(256);
  for(let v=0;v<256;v++)L[v]=cl(f*(v-128+b)+128);
  const n=w*h;if(s>0){const out=new Uint8ClampedArray(n),tmp=new Uint16Array(n);for(let c=0;c<3;c++){box3(d,w,h,c,out,tmp);for(let i=0,p=c;i<n;i++,p+=4){const v=d[p];d[p]=L[cl(v+s*(v-out[i]))]}}}
  else for(let p=0;p<n*4;p+=4){d[p]=L[d[p]];d[p+1]=L[d[p+1]];d[p+2]=L[d[p+2]]}};
 /* ---- الممحاة: تلوين المستطيل بلون الورقة المقدَّر من إطار حوله (الوسيط لكل قناة) ---- */
 C.erase=function(d,w,h,a){let x=Math.round(a[0]),y=Math.round(a[1]),rw=Math.round(a[2]),rh=Math.round(a[3]);x=Math.max(0,x);y=Math.max(0,y);rw=Math.min(w-x,rw);rh=Math.min(h-y,rh);if(rw<1||rh<1)return;
  const m=Math.max(4,Math.round(Math.min(w,h)*0.012)),X0=Math.max(0,x-m),Y0=Math.max(0,y-m),X1=Math.min(w,x+rw+m),Y1=Math.min(h,y+rh+m),V=[[],[],[]],st=Math.max(1,Math.floor(Math.sqrt((X1-X0)*(Y1-Y0)/3000)));
  for(let yy=Y0;yy<Y1;yy+=st)for(let xx=X0;xx<X1;xx+=st){if(xx>=x&&xx<x+rw&&yy>=y&&yy<y+rh)continue;const p=(yy*w+xx)*4;V[0].push(d[p]);V[1].push(d[p+1]);V[2].push(d[p+2])}
  const med=A=>A.length?A.sort((p,q)=>p-q)[A.length>>1]:255,r=med(V[0]),g=med(V[1]),b=med(V[2]);
  for(let yy=y;yy<y+rh;yy++){let p=(yy*w+x)*4;for(let xx=0;xx<rw;xx++,p+=4){d[p]=r;d[p+1]=g;d[p+2]=b;d[p+3]=255}}};
 /* ---- أوضاع جاهزة: نقاط بداية مناسبة لكل نوع مستند (تُعدَّل بعدها يدوياً) ---- */
 C.pdoc=(d,w,h)=>{C.bgclean(d,w,h);C.denoise(d,w,h,[14])};                 /* مستند عام: ظلال + خلفية + تنعيم خفيف، يبقى ملوّناً */
 C.pid=(d,w,h)=>{C.magic(d,w,h)};                                           /* بطاقة هوية: ألوان زاهية واضحة */
 C.ppass=(d,w,h)=>{C.magic(d,w,h);C.adj(d,w,h,[0,0,30])};                  /* جواز سفر: ألوان + حدّة لقراءة البيانات */
 C.preceipt=(d,w,h)=>{C.denoise(d,w,h,[26]);C.adapt(d,w,h)};              /* إيصال/ورق حراري باهت: تنعيم ثم أبيض وأسود تكيّفي */
 C.pcontract=(d,w,h)=>{C.bgclean(d,w,h);for(let p=0;p<w*h*4;p+=4){const L=(0.299*d[p]+0.587*d[p+1]+0.114*d[p+2]);d[p]=d[p+1]=d[p+2]=L}C.adj(d,w,h,[0,12,35])}; /* عقد: رمادي نظيف بنص حادّ */
 C.pminutes=(d,w,h)=>{C.bgclean(d,w,h);C.adj(d,w,h,[0,8,20])};             /* محضر: يُبقي ألوان الأختام والتوقيعات */
 C.pjudg=(d,w,h)=>{C.denoise(d,w,h,[20]);C.adapt(d,w,h)};                  /* حكم/صورة مصوّرة ضوئياً: أبيض وأسود تكيّفي */
})();
/* N9a: إضافة عملية تحسين بعد حسابها مسبقاً في العامل (FX) إن وُجد؛ وإلا المسار المتزامن القديم كما هو */
EN.fxOp=(it,op)=>EN._q=(EN._q||Promise.resolve()).then(async()=>{try{if(typeof FX!='undefined')await FX.warm(it,op)}catch(e){}dpOp(it,op)});
EN.names={pdoc:'📄 مستند',pid:'🪪 بطاقة هوية',ppass:'🛂 جواز سفر',preceipt:'🧾 إيصال',pcontract:'📜 عقد',pminutes:'📝 محضر',pjudg:'⚖️ حكم'};
EN.tools=[['magic','✨ ألوان سحرية'],['adapt','◐ أبيض وأسود تكيّفي'],['shadow','🌫 إزالة الظلال'],['bgclean','🧹 تنظيف الخلفية'],['denoise','🔇 تقليل التشويش'],['glare','💡 تقليل الوهج (تقريبي)'],['inkoff','✍️ إزالة الحبر الملوّن (تقريبي)']];
EN.label={magic:'ألوان سحرية',adapt:'أبيض وأسود تكيّفي',shadow:'إزالة الظلال',bgclean:'تنظيف الخلفية',denoise:'تقليل التشويش',glare:'تقليل الوهج',inkoff:'إزالة الحبر الملوّن',adj:'سطوع/تباين/حدّة',erase:'ممحاة'};
/* ---- ربط بـ docprep: لفّ dpFilter فقط؛ الأسماء القديمة تمر كما هي ---- */
(function(){
 if(typeof dpFilter!='function')return;
 const _f=dpFilter;
 window.dpFilter=dpFilter=function(cv,f){const m=String(f).split(':'),fn=EN.core[m[0]];if(!fn||!EN.core.hasOwnProperty(m[0]))return _f(cv,f);
  const x=cv.getContext('2d'),id=x.getImageData(0,0,cv.width,cv.height);fn(id.data,cv.width,cv.height,m.slice(1).map(Number));x.putImageData(id,0,0)};
 const busy=async t=>{toast('⏳ '+(t||'جارٍ المعالجة…'),1800);await new Promise(r=>setTimeout(r,40))};
 const q=s=>document.querySelector(s);
/* ذاكرة مؤقتة صغيرة (آخر صورتين) لنتيجة dpRender عند وجود تحسينات: فلا تُعاد المعالجة الثقيلة عند كل إعادة رسم للمحرر أو المصغّرات */
 if(typeof dpRender=='function'){const _r=dpRender;EN.rc=[];window.dpRender=dpRender=function(it){
  if(!it||!it.ops||!it.ops.some(o=>o.t=='filter'))return _r(it);
  const key=it.id+'|'+it.orig.width+'x'+it.orig.height+'|'+JSON.stringify(it.ops);let e=EN.rc.find(x=>x.key==key),c;
  if(!e){c=_r(it);EN.rc=EN.rc.filter(x=>x.id!=it.id);EN.rc.push({key,id:it.id,cv:c});if(EN.rc.length>2)EN.rc.shift();e=EN.rc[EN.rc.length-1]}
  const o=dpCv(e.cv.width,e.cv.height);o.getContext('2d').drawImage(e.cv,0,0);return o}}
 /* واجهة المحرر: نُلحق كتلتنا بعد رسم المحرر الأصلي دون استبداله (فتبقى معالجات اللمس الأصلية على اللوحة) */
 if(typeof dpEditView=='function'){const _v=dpEditView;window.dpEditView=dpEditView=function(){const r=_v.apply(this,arguments);try{enMount()}catch(e){}return r}}
 if(typeof dpWork=='function'){const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{enMountAll()}catch(e){}return r}}
 function enMount(){const sh=q('#sh'),it=DP.items[DPE.i];if(!sh||!it||!q('#dpe'))return;
  const chips=o=>o.map(([k,t])=>`<button class="chip" data-act="enf" data-f="${k}">${t}</button>`).join('');
  const hint=DPE.mode=='erase'?'ارسم المستطيل الذي تريد مسحه ثم اضغط «تطبيق»؛ يُملأ بلون الورقة المحيط. يمكن التراجع.':'';
  if(hint){const h=q('#dph');if(h)h.textContent=hint}
  sh.insertAdjacentHTML('beforeend',`<div class="shm mws">أوضاع جاهزة (نقطة بداية حسب نوع المستند)</div><div class="dkc">${chips(Object.entries(EN.names))}</div>`
   +`<div class="shm mws">تحسين متقدم</div><div class="dkc">${chips(EN.tools)}</div>`
   +`<div class="shm mws">سطوع وتباين وحدّة</div><div class="enadj"><label>☀ سطوع <input type="range" id="enb" min="-60" max="60" value="0"></label><label>◑ تباين <input type="range" id="enc" min="-60" max="60" value="0"></label><label>🔍 حدّة <input type="range" id="ens" min="0" max="100" value="0"></label></div><div class="acts"><button class="btn pri" data-act="enadj">✅ تطبيق الضبط</button><button class="btn" data-act="enadjr">إعادة ضبط</button></div>`
   +`<div class="acts" style="margin-top:8px"><button class="btn ${DPE.mode=='erase'?'pri':''}" data-act="dpm" data-m="erase">🧽 ممحاة</button><button class="btn" id="encmp">👁 اضغط مع الاستمرار: الأصل</button></div><div class="shm">«المقارنة» تعرض الصورة قبل التحسينات (بعد القص والتدوير). ما كُتب «تقريبي» لا يضمن نتيجة مثالية في كل صورة.</div>`);
  const cb=q('#encmp');if(cb){const on=e=>{e.preventDefault();enCompare(true)},off=()=>enCompare(false);cb.onpointerdown=on;cb.onpointerup=cb.onpointerleave=cb.onpointercancel=off;cb.oncontextmenu=e=>e.preventDefault()}}
 function enMountAll(){const sh=q('#sh');if(!sh||!DP.items.length)return;if(!sh.querySelector('[data-act="dprun"]'))return;
  sh.insertAdjacentHTML('beforeend',`<div class="shm mws">تحسين كل الصفحات دفعة واحدة</div><div class="dkc">${Object.entries(EN.names).map(([k,t])=>`<button class="chip" data-act="enall" data-f="${k}">${t}</button>`).join('')}</div>`)}
 /* مقارنة بالأصل: نعرض الصورة بعد العمليات الهندسية فقط (بلا تحسينات) ما دام الإصبع على الزر */
 function enCompare(on){const cv=q('#dpe'),it=DP.items[DPE.i];if(!cv||!it)return;if(!on){dpDraw();return}
  const key=it.id+':'+it.ops.filter(o=>o.t!='filter').length;if(!EN.cmp||EN.cmp.key!=key){EN.cmp={key,cv:dpRender({orig:it.orig,ops:it.ops.filter(o=>o.t!='filter')})}}
  const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.drawImage(EN.cmp.cv,0,0,cv.width,cv.height)}
 /* معاينة حيّة للسطوع والتباين والحدّة على لوحة المحرر (بدقة العرض) */
 let raf=0;function enPrev(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const cv=q('#dpe'),it=DP.items[DPE.i];if(!cv||!it||!it.cv)return;const a=[+q('#enb').value,+q('#enc').value,+q('#ens').value];
  const t=document.createElement('canvas');t.width=cv.width;t.height=cv.height;const x=t.getContext('2d');x.drawImage(it.cv,0,0,t.width,t.height);const id=x.getImageData(0,0,t.width,t.height);EN.core.adj(id.data,t.width,t.height,a);cv.getContext('2d').putImageData(id,0,0)})}
 document.addEventListener('input',e=>{if(e.target&&/^en[bcs]$/.test(e.target.id||''))enPrev()});
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  /* الممحاة: «تطبيق» الأصلي يكتب عملية باسم erase لا يعرفها dpRender، فنعترضها ونكتبها كعملية filter */
  if(a=='dpapply'&&DPE.mode=='erase'){e.stopImmediatePropagation();const it=DP.items[DPE.i],s=DPE.sel;if(it&&s&&s.w>8&&s.h>8){await EN.fxOp(it,{t:'filter',f:'erase:'+[s.x,s.y,s.w,s.h].map(Math.round).join(':')});DPE.sel=null;dpEditView()}return}
  if(a=='enf'){const it=DP.items[DPE.i];if(!it)return;await busy('جارٍ التحسين…');await EN.fxOp(it,{t:'filter',f:el.dataset.f});dpEditView();return}
  if(a=='enadj'){const it=DP.items[DPE.i],v=[+q('#enb').value,+q('#enc').value,+q('#ens').value];if(!it)return;if(!v[0]&&!v[1]&&!v[2]){toast('حرّك أحد المنزلقات أولاً');return}await busy();await EN.fxOp(it,{t:'filter',f:'adj:'+v.join(':')});dpEditView();return}
  if(a=='enadjr'){['enb','enc','ens'].forEach(i=>{const s=q('#'+i);if(s)s.value=0});dpDraw();return}
  if(a=='enall'){if(!DP.items.length)return;await busy('جارٍ تحسين '+DP.items.length+' صفحة…');let k=0;for(const it of DP.items){toast('⏳ صفحة '+(++k)+' من '+DP.items.length,1500);await EN.fxOp(it,{t:'filter',f:el.dataset.f})}dpWork();toast('✔ طُبّق «'+(EN.names[el.dataset.f]||'')+'» على كل الصفحات',2500)}},true);
})();
