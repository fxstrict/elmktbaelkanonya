/* الحسام سكان — المرحلة N3 (1.16.7): اكتشاف حواف الورقة تلقائياً، إزالة الميلان، ضبط الاتجاه، وضع الكتاب (فصل صفحتين)، والصورة الشخصية بمقاس رسمي.
   JS نقي بلا OpenCV ولا مكتبات. إضافة فقط: لا يُعدَّل docprep.js ولا scan.js؛ نلفّ دوالّهما (scCropView وscIngest وdpFilter وdpEditView وdpWork وscHome وcloseSheet) كما فعل enhance.js.
   الدوال النقية في AS.core تعمل على مصفوفة RGBA (Uint8ClampedArray) فتُختبر في Node بلا canvas (tools/n3-test.js). الاكتشاف تقريبي ويبقى القص اليدوي متاحاً دائماً. كل المعالجة على الجهاز. */
const AS={core:{},opt:{orient:true,skew:true},sp:null,ph:{sz:'4x6',n:8}};
(function(){
 const C=AS.core;
 /* ---------------- أدوات أساسية ---------------- */
 C.gray=(d,n)=>{const L=new Uint8ClampedArray(n);for(let i=0,p=0;i<n;i++,p+=4)L[i]=0.299*d[p]+0.587*d[p+1]+0.114*d[p+2];return L};
 /* تصغير بمتوسط الصناديق إلى أكبر بُعد m؛ sx,sy = معامل الرجوع إلى الأصل */
 C.shrink=function(d,w,h,m){const k=Math.min(1,m/Math.max(w,h));if(k>=1)return{d,w,h,sx:1,sy:1};
  const nw=Math.max(1,Math.round(w*k)),nh=Math.max(1,Math.round(h*k)),O=new Uint8ClampedArray(nw*nh*4);
  for(let y=0;y<nh;y++){const y0=Math.floor(y*h/nh),y1=Math.max(y0+1,Math.floor((y+1)*h/nh));
   for(let x=0;x<nw;x++){const x0=Math.floor(x*w/nw),x1=Math.max(x0+1,Math.floor((x+1)*w/nw));let r=0,g=0,b=0,c=0;
    for(let yy=y0;yy<y1;yy++){let p=(yy*w+x0)*4;for(let xx=x0;xx<x1;xx++,p+=4){r+=d[p];g+=d[p+1];b+=d[p+2];c++}}
    const o=(y*nw+x)*4;O[o]=r/c;O[o+1]=g/c;O[o+2]=b/c;O[o+3]=255}}
  return{d:O,w:nw,h:nh,sx:w/nw,sy:h/nh}};
 const clampI=(v,n)=>v<0?0:v>=n?n-1:v;
 /* تنعيم صندوقي منفصل بنصف قطر r مع تكرار الحواف */
 function boxBlur(A,w,h,r){const n=w*h,T=new Float32Array(n),O=new Uint8ClampedArray(n),win=2*r+1;
  for(let y=0;y<h;y++){const row=y*w;let s=0;for(let k=-r;k<=r;k++)s+=A[row+clampI(k,w)];for(let x=0;x<w;x++){T[row+x]=s;s+=A[row+clampI(x+r+1,w)]-A[row+clampI(x-r,w)]}}
  for(let x=0;x<w;x++){let s=0;for(let k=-r;k<=r;k++)s+=T[clampI(k,h)*w+x];for(let y=0;y<h;y++){O[y*w+x]=s/(win*win);s+=T[clampI(y+r+1,h)*w+x]-T[clampI(y-r,h)*w+x]}}
  return O}
 function otsu(A,n){const hs=new Uint32Array(256);for(let i=0;i<n;i++)hs[A[i]]++;let sum=0;for(let v=0;v<256;v++)sum+=v*hs[v];let sb=0,wb=0,mx=-1,th=128;
  for(let v=0;v<256;v++){wb+=hs[v];if(!wb)continue;const wf=n-wb;if(!wf)break;sb+=v*hs[v];const mb=sb/wb,mf=(sum-sb)/wf,bc=wb*wf*(mb-mf)*(mb-mf);if(bc>mx){mx=bc;th=v}}return th}
 /* توسيع/تآكل ثنائي بنافذة مربعة (تكرار الحواف فلا تُؤكل الورقة الملاصقة لحافة الصورة) */
 function morph(M,w,h,r,dil){const T=new Int32Array(w*h),O=new Uint8Array(w*h),win=2*r+1;
  for(let y=0;y<h;y++){const row=y*w;let s=0;for(let k=-r;k<=r;k++)s+=M[row+clampI(k,w)];for(let x=0;x<w;x++){T[row+x]=s;s+=M[row+clampI(x+r+1,w)]-M[row+clampI(x-r,w)]}}
  for(let x=0;x<w;x++){let s=0;for(let k=-r;k<=r;k++)s+=T[clampI(k,h)*w+x];for(let y=0;y<h;y++){O[y*w+x]=dil?(s>0?1:0):(s>=win*win?1:0);s+=T[clampI(y+r+1,h)*w+x]-T[clampI(y-r,h)*w+x]}}
  return O}
 /* أكبر مكوّن متصل (4 جيران) */
 function biggest(M,w,h){const n=w*h,lab=new Int32Array(n),st=new Int32Array(n);let best=0,bs=0,id=0;
  for(let i=0;i<n;i++){if(!M[i]||lab[i])continue;id++;let sp=0,cnt=0;st[sp++]=i;lab[i]=id;
   while(sp){const p=st[--sp];cnt++;const x=p%w,y=(p/w)|0;
    if(x>0&&M[p-1]&&!lab[p-1]){lab[p-1]=id;st[sp++]=p-1}
    if(x<w-1&&M[p+1]&&!lab[p+1]){lab[p+1]=id;st[sp++]=p+1}
    if(y>0&&M[p-w]&&!lab[p-w]){lab[p-w]=id;st[sp++]=p-w}
    if(y<h-1&&M[p+w]&&!lab[p+w]){lab[p+w]=id;st[sp++]=p+w}}
   if(cnt>bs){bs=cnt;best=id}}
  const O=new Uint8Array(n);if(best)for(let i=0;i<n;i++)if(lab[i]==best)O[i]=1;return{M:O,area:bs}}
 /* ملء الثقوب (النص داخل الورقة): كل ما لا تصله الخلفية من الحافة يصبح مقدّمة */
 function fillHoles(M,w,h){const n=w*h,B=new Uint8Array(n),st=new Int32Array(n);let sp=0;const push=p=>{if(!M[p]&&!B[p]){B[p]=1;st[sp++]=p}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
  while(sp){const p=st[--sp],x=p%w,y=(p/w)|0;if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w)}
  const O=new Uint8Array(n);let a=0;for(let i=0;i<n;i++)if(!B[i]){O[i]=1;a++}return{M:O,area:a}}
 /* الغلاف المحدّب (Andrew) */
 function hull(P){P.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];for(const p of P){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(let i=P.length-1;i>=0;i--){const p=P[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  lo.pop();up.pop();return lo.concat(up)}
 /* تقاطع المستقيمين a-b و c-d: النقطة + المعاملان t (على الأول) وs (على الثاني) */
 function lineX(a,b,c,d){const r0=b[0]-a[0],r1=b[1]-a[1],q0=d[0]-c[0],q1=d[1]-c[1],den=r0*q1-r1*q0;if(Math.abs(den)<1e-9)return null;
  const t=((c[0]-a[0])*q1-(c[1]-a[1])*q0)/den,s=((c[0]-a[0])*r1-(c[1]-a[1])*r0)/den;return[a[0]+t*r0,a[1]+t*r1,t,s]}
 /* اختزال مضلع محدّب إلى رباعي يحيط به: نحذف الضلع الذي يضيف أقل مساحة بمدّ جاريه حتى يلتقيا */
 function toQuad(H){const V=H.slice();
  while(V.length>4){const n=V.length;let bi=-1,bc=1e18,bp=null;
   for(let i=0;i<n;i++){const A=V[(i-1+n)%n],B=V[i],E=V[(i+1)%n],D=V[(i+2)%n],X=lineX(A,B,E,D);
    if(X&&X[2]>=1-1e-9&&X[3]<=1e-9){const ar=Math.abs((B[0]-X[0])*(E[1]-X[1])-(B[1]-X[1])*(E[0]-X[0]))/2;if(ar<bc){bc=ar;bi=i;bp=[X[0],X[1]]}}}
   if(bi<0){let m=1e18,mi=0;for(let i=0;i<n;i++){const A=V[(i-1+n)%n],B=V[i],E=V[(i+1)%n],ar=Math.abs((B[0]-A[0])*(E[1]-A[1])-(B[1]-A[1])*(E[0]-A[0]))/2;if(ar<m){m=ar;mi=i}}V.splice(mi,1);continue}
   if(bi<n-1)V.splice(bi,2,bp);else{V.splice(n-1,1);V.shift();V.push(bp)}}
  return V}
 const polyArea=P=>{let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-a[1]*b[0]}return Math.abs(s)/2};
 /* ترتيب الزوايا: أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار (مع اتجاه عقارب الساعة على الشاشة) */
 C.order=function(q){const cx=q.reduce((s,p)=>s+p[0],0)/4,cy=q.reduce((s,p)=>s+p[1],0)/4,s=q.slice().sort((a,b)=>Math.atan2(a[1]-cy,a[0]-cx)-Math.atan2(b[1]-cy,b[0]-cx));
  let k=0,m=1e18;s.forEach((p,i)=>{const v=p[0]+p[1];if(v<m){m=v;k=i}});return[0,1,2,3].map(i=>s[(k+i)%4])};
 /* زوايا الرباعي الداخلية (درجات) */
 function angles(q){return q.map((p,i)=>{const a=q[(i+3)%4],b=q[(i+1)%4],u=[a[0]-p[0],a[1]-p[1]],v=[b[0]-p[0],b[1]-p[1]];return Math.acos(Math.max(-1,Math.min(1,(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1))))*180/Math.PI})}
 /* دعم الحواف: على طول كل ضلع نقارن سطوع ما بداخله بما خارجه؛ الضلع المنطبق على حافة الصورة (ورقة تخرج من الإطار) يُحسب مسنوداً */
 function edgeSupport(q,L,w,h){let tot=0,ok=0;const off=Math.max(2,Math.round(Math.min(w,h)/90));
  for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=dy/len,ny=-dx/len;
   for(let s=1;s<=28;s++){const t=s/29,px=a[0]+dx*t,py=a[1]+dy*t;tot++;
    if(px<=off||py<=off||px>=w-1-off||py>=h-1-off){ok++;continue}
    const xi=px-nx*off,yi=py-ny*off,xo=px+nx*off,yo=py+ny*off;if(xi<0||yi<0||xo<0||yo<0||xi>=w||xo>=w||yi>=h||yo>=h){ok++;continue}
    const li=L[(yi|0)*w+(xi|0)],lo=L[(yo|0)*w+(xo|0)];if(Math.abs(li-lo)>9)ok++}}
  return ok/tot}
 /* ---------------- 1) اكتشاف حدود الورقة ----------------
    نُجرّب عدة أقنعة (أفتح من العتبة، أغمق، مختلف عن لون إطار الصورة) ← أكبر مكوّن ← ملء الثقوب ← غلاف محدّب ← رباعي محيط ← نقيّم كل مرشّح ونختار الأفضل.
    يعيد {pts:[TL,TR,BR,BL] بإحداثيات الصورة الأصلية، conf:0..1} أو {pts:null,conf} إن لم يجد ورقة معقولة (مثلاً الورقة تملأ الإطار). */
 C.OK=0.72;C.WEAK=0.5; /* ثقة ≥ OK: نقبل الاكتشاف تلقائياً؛ بين WEAK وOK: نعرضه مع تنبيه «تحقّق»؛ دونها: يدوي */
 C.detect=function(d,w,h){const s=C.shrink(d,w,h,360),W=s.w,H=s.h,n=W*H,Lr=C.gray(s.d,n),L=boxBlur(Lr,W,H,1);
  const cands=[],R=Math.max(2,Math.round(Math.min(W,H)/70));
  const add=(M,kind)=>{let c=morph(morph(M,W,H,R,true),W,H,R,false);c=morph(morph(c,W,H,1,false),W,H,1,true);const b=biggest(c,W,H);if(b.area<n*0.08)return;
   const f=fillHoles(b.M,W,H),M2=f.M,P=[];
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;if(!M2[i])continue;if(x==0||y==0||x==W-1||y==H-1||!M2[i-1]||!M2[i+1]||!M2[i-W]||!M2[i+W])P.push([x+0.5,y+0.5])}
   if(P.length<8)return;const hl=hull(P);if(hl.length<3)return;let q=hl.length>4?toQuad(hl):hl.slice();if(q.length!=4)return;q=C.order(q);
   const qa=polyArea(q),frac=qa/n,sol=f.area/Math.max(1,qa),an=angles(q),amin=Math.min(...an),amax=Math.max(...an),es=edgeSupport(q,L,W,H);
   if(frac<0.1||frac>0.99||(kind=='diff'&&es<0.6))return;
   const angOk=amin>=50&&amax<=130?1:amin>=38&&amax<=145?0.5:0,solS=Math.max(0,Math.min(1,(sol-0.7)/0.28)),fracS=frac<0.2?frac/0.2:1;
   const conf=0.34*solS+0.4*es+0.18*angOk+0.08*fracS;cands.push({q,conf,kind,frac,sol,es})};
  const th=otsu(L,n);let M=new Uint8Array(n),D=new Uint8Array(n);for(let i=0;i<n;i++){if(L[i]>th)M[i]=1;else D[i]=1}
  add(M,'bright');add(D,'dark');
  /* قناع الاختلاف عن لون إطار الصورة (وسيط كل قناة على شريط الحافة) */
  const bw=Math.max(2,Math.round(Math.min(W,H)/25)),med=[[],[],[]];for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x<bw||y<bw||x>=W-bw||y>=H-bw){const p=(y*W+x)*4;med[0].push(s.d[p]);med[1].push(s.d[p+1]);med[2].push(s.d[p+2])}}
  const md=med.map(a=>a.sort((p,q)=>p-q)[a.length>>1]),dist=new Uint8ClampedArray(n);
  for(let i=0,p=0;i<n;i++,p+=4)dist[i]=Math.min(255,Math.hypot(s.d[p]-md[0],s.d[p+1]-md[1],s.d[p+2]-md[2])*0.8);
  const db=boxBlur(dist,W,H,1),dt=Math.max(16,otsu(db,n));let E=new Uint8Array(n);for(let i=0;i<n;i++)if(db[i]>dt)E[i]=1;add(E,'diff');
  if(!cands.length)return{pts:null,conf:0};cands.sort((a,b)=>b.conf-a.conf);const b=cands[0];
  return{pts:b.q.map(p=>[p[0]*s.sx,p[1]*s.sy]),conf:b.conf,kind:b.kind,frac:b.frac,sol:b.sol,es:b.es}};
 /* ---------------- خريطة الحبر (للميلان والاتجاه والكتاب) ----------------
    حبر = أغمق من متوسط جواره (نافذة صغيرة) بفارق مطلق ونسبي؛ النافذة الصغيرة تتجاهل الظلال العريضة (كظل تجليد الكتاب) وتلتقط خطوط الحروف الرفيعة. */
 C.ink=function(d,w,h,m){const s=C.shrink(d,w,h,m||1000),W=s.w,H=s.h,n=W*H,L=C.gray(s.d,n),I=new Float64Array((W+1)*(H+1));
  for(let y=0;y<H;y++){let r=0;for(let x=0;x<W;x++){r+=L[y*W+x];I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+r}}
  const R=Math.max(4,Math.round(Math.min(W,H)/70)),M=new Uint8Array(n);
  for(let y=0;y<H;y++){const y0=Math.max(0,y-R),y1=Math.min(H,y+R+1);for(let x=0;x<W;x++){const x0=Math.max(0,x-R),x1=Math.min(W,x+R+1),a=(I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0])/((x1-x0)*(y1-y0)),v=L[y*W+x];if(a-v>Math.max(16,a*0.12))M[y*W+x]=1}}
  return{M,w:W,h:H,sx:s.sx,sy:s.sy}};
 /* تدوير خريطة الحبر بزاوية deg (باتجاه عقارب الساعة) بأقرب جار — يوسّع الإطار ليحوي كل شيء */
 function rotMap(M,W,H,deg){const t=deg*Math.PI/180,c=Math.cos(t),s=Math.sin(t),nw=Math.max(1,Math.round(Math.abs(W*c)+Math.abs(H*s))),nh=Math.max(1,Math.round(Math.abs(W*s)+Math.abs(H*c))),O=new Uint8Array(nw*nh),cx=W/2,cy=H/2,nx=nw/2,ny=nh/2;
  for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){const dx=x+0.5-nx,dy=y+0.5-ny,sx=Math.floor(dx*c+dy*s+cx),sy=Math.floor(-dx*s+dy*c+cy);if(sx>=0&&sy>=0&&sx<W&&sy<H&&M[sy*W+sx])O[y*nw+x]=1}
  return{M:O,w:nw,h:nh}}
 /* إسقاط نقاط الحبر على المحور العمودي بعد تدوير زاوية phi: أحدّ قمة (مجموع مربعات الصناديق) = اتجاه الأسطر */
 function pts(k){const W=k.w,H=k.h,xs=[],ys=[];let c=0;for(let i=0;i<W*H;i++)if(k.M[i])c++;const stp=Math.max(1,Math.floor(c/70000));let j=0;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(k.M[y*W+x]&&(j++%stp==0)){xs.push(x);ys.push(y)}return{xs,ys,N:xs.length,c,W,H}}
 function projScore(P){const{xs,ys,N,W,H}=P,cx=W/2,cy=H/2,off=Math.hypot(W,H)/2+3,nb=Math.ceil(2*off)+4,bins=new Float32Array(nb);
  return deg=>{const th=deg*Math.PI/180,co=Math.cos(th),si=Math.sin(th);bins.fill(0);for(let i=0;i<N;i++)bins[((ys[i]-cy)*co-(xs[i]-cx)*si+off)|0]++;let s=0;for(let i=0;i<nb;i++)s+=bins[i]*bins[i];return s}}
 /* أفضل زاوية في مجال [lo,hi] بخطوة 0.5 ثم تدقيق 0.1 */
 function bestAngle(sc,lo,hi){let best=lo,bs=-1,tot=0,cnt=0;for(let a=lo;a<=hi+1e-9;a+=0.5){const v=sc(a);tot+=v;cnt++;if(v>bs){bs=v;best=a}}let b2=best,s2=bs;for(let a=best-0.5;a<=best+0.5+1e-9;a+=0.1){const v=sc(a);if(v>s2){s2=v;b2=a}}return{a:b2,s:s2,mean:tot/cnt}}
 /* ---------------- 2) إزالة الميلان (أفقي فقط): a = الدرجات التي تُدار بها الصورة (مع عقارب الساعة) لتصبح الأسطر أفقية ---------------- */
 C.skew=function(d,w,h,maxA){maxA=maxA||15;const k=C.ink(d,w,h,1000),P=pts(k);if(P.c<250)return{a:0,conf:0,n:P.c};const r=bestAngle(projScore(P),-maxA,maxA);return{a:-r.a,conf:r.s/r.mean-1,n:P.N}};
 /* ---------------- 3) الاتجاه (0/90/180/270) + الميلان معاً ----------------
    أ) المحور: نبحث عن أحدّ قمة إسقاط في مجالَي الأسطر الأفقية [-15°,15°] والعمودية [75°,105°]؛ الأحدّ يحدد محور الأسطر وزاوية ميلها.
    ب) الجهة (مستقيمة أم مقلوبة): إشارتان مستقلتان عن اللغة والخط نحسبهما على الخريطة بعد تقويمها:
       «الفقرة»: آخر سطر في الفقرة أقصر من أولها (وليس العكس)؛ «الخط الأساسي»: ينخفض الحبر تحت خط الأساس بحدّة أكبر من ارتفاعه فوقه (أضعف، تُستعمل عند غياب الفقرات وبعتبة عالية).
    rot = الدرجات (0/90/180/270) التي تُدار بها الصورة مع عقارب الساعة؛ skew = ما يُضاف بعدها (مع عقارب الساعة) لإزالة الميلان. flip.known=false إن لم تتضح الجهة. */
 function asym(P){const n=P.length,S=new Float32Array(n);for(let i=0;i<n;i++){let a=0,c=0;for(let k=-1;k<=1;k++){const j=i+k;if(j>=0&&j<n){a+=P[j];c++}}S[i]=a/c}
  let mx=0;for(let i=0;i<n;i++)if(S[i]>mx)mx=S[i];const t=mx*0.18;let pos=0,neg=0,i=0;
  while(i<n){if(S[i]<=t){i++;continue}let j=i;while(j<n&&S[j]>t)j++;if(j-i>=5){let p=0,q=0;for(let y=i;y<=j&&y<n;y++){const dd=(y>0?S[y]-S[y-1]:0);if(dd>0)p+=dd*dd;else q+=dd*dd}pos+=p;neg+=q}i=j}
  return pos+neg>0?(neg-pos)/(neg+pos):0}
 /* مقاطع الأسطر من إسقاط الصفوف: [[y0,y1,left,right],…] */
 function lines(M,W,H){const R=new Float32Array(H);for(let y=0;y<H;y++){let c=0;for(let x=0;x<W;x++)c+=M[y*W+x];R[y]=c}
  const S=new Float32Array(H);for(let y=0;y<H;y++){let a=0,c=0;for(let k=-1;k<=1;k++){const j=y+k;if(j>=0&&j<H){a+=R[j];c++}}S[y]=a/c}
  const so=Array.from(S).sort((a,b)=>a-b),t=Math.max(2,(so[Math.floor(H*0.95)]||1)*0.1),L=[];let y=0;
  while(y<H){if(S[y]<=t){y++;continue}let j=y;while(j<H&&S[j]>t)j++;if(L.length&&y-L[L.length-1][1]<=3)L[L.length-1][1]=j-1;else L.push([y,j-1]);y=j}
  const hs=L.map(l=>l[1]-l[0]+1).sort((a,b)=>a-b),mh=hs[hs.length>>1]||1,out=[];
  for(const l of L){if(l[1]-l[0]+1<Math.max(3,mh*0.45))continue;const cn=new Float32Array(W);let tot=0;for(let yy=l[0];yy<=l[1];yy++)for(let x=0;x<W;x++)if(M[yy*W+x]){cn[x]++;tot++}
   if(tot<10)continue;let a=0,lo=0,hi=W-1;for(let x=0;x<W;x++){a+=cn[x];if(a>=tot*0.015){lo=x;break}}a=0;for(let x=W-1;x>=0;x--){a+=cn[x];if(a>=tot*0.015){hi=x;break}}out.push([l[0],l[1],lo,hi])}
  return out}
 /* إشارة الفقرات: >0 يعني أن الخريطة مستقيمة (آخر سطر في الفقرة أقصر من أول سطر) */
 function paraCue(M,W,H){const L=lines(M,W,H);if(L.length<6)return{s:0,n:0};const gaps=[];for(let i=0;i+1<L.length;i++)gaps.push(L[i+1][0]-L[i][1]-1);
  const mg=Math.max(1,gaps.slice().sort((a,b)=>a-b)[gaps.length>>1]),ws=L.map(l=>l[3]-l[2]).sort((a,b)=>a-b),wref=Math.max(1,ws[Math.floor(ws.length*0.9)]);
  const blocks=[];let cur=[0];for(let i=0;i<gaps.length;i++){if(gaps[i]>mg*1.5+1){blocks.push(cur);cur=[i+1]}else cur.push(i+1)}blocks.push(cur);
  let sum=0,n=0;for(const b of blocks){if(b.length<3)continue;const f=L[b[0]],l=L[b[b.length-1]],v=((f[3]-f[2])-(l[3]-l[2]))/wref;sum+=Math.max(-1,Math.min(1,v));n++}
  return{s:n?sum/n:0,n}}
 C.fixup=function(d,w,h){const k=C.ink(d,w,h,1000),P=pts(k);if(P.c<400)return{rot:0,skew:0,axisConf:0,flip:{known:false},why:'نص قليل'};
  const sc=projScore(P),H0=bestAngle(sc,-15,15),V0=bestAngle(sc,75,105),horiz=H0.s>=V0.s,B=horiz?H0:V0,axisConf=Math.max(H0.s,V0.s)/Math.max(1,Math.min(H0.s,V0.s))-1,peak=B.s/B.mean-1;
  const phi=B.a,R1=-phi,m=rotMap(k.M,k.w,k.h,R1),cB=paraCue(m.M,m.w,m.h),Rr=new Float32Array(m.h);for(let y=0;y<m.h;y++){let c=0;for(let x=0;x<m.w;x++)c+=m.M[y*m.w+x];Rr[y]=c}
  const cA=asym(Rr);let sign=0,src='';
  if(cB.n>=2&&Math.abs(cB.s)>=0.1){sign=cB.s>0?1:-1;src='para'}else if(Math.abs(cA)>=0.25){sign=cA>0?1:-1;src='base'}
  const known=sign!=0,up=sign>=0; /* مجهول → نبقي الاتجاه الحالي (R1) */
  let rot=((Math.round(R1/90)*90)%360+360)%360,skew=R1-Math.round(R1/90)*90;if(!up)rot=(rot+180)%360;
  /* strong: دليل كافٍ لقلب صفحة أفقية 180° (معظم الصفحات مستقيمة أصلاً، فالقلب الخاطئ أسوأ من تركها) */
  const strong=(src=='para'&&Math.abs(cB.s)>=0.15)||(src=='base'&&Math.abs(cA)>=0.35);
  return{rot,skew,phi,horiz,axisConf,peak,flip:{known,strong,src,para:cB,base:cA}}};
 /* ---------------- 4) وضع الكتاب: موضع التجليد بين الصفحتين ----------------
    في وسط الصورة نبحث عن أضيق عمود حبراً مع ظل التجليد (أغمق). يعيد x بكسل في الصورة الأصلية وconf. */
 C.gutter=function(d,w,h){const k=C.ink(d,w,h,900),s=C.shrink(d,w,h,900),W=k.w,H=k.h,L=C.gray(s.d,W*H),ink=new Float32Array(W),br=new Float32Array(W);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(k.M[y*W+x])ink[x]++;br[x]+=L[y*W+x]}
  for(let x=0;x<W;x++)br[x]/=H;
  const sm=(A,r)=>{const O=new Float32Array(W);for(let x=0;x<W;x++){let a=0,c=0;for(let j=-r;j<=r;j++){const q=x+j;if(q>=0&&q<W){a+=A[q];c++}}O[x]=a/c}return O},r=Math.max(2,Math.round(W/150)),I=sm(ink,r),B=sm(br,r);
  const a0=Math.floor(W*0.3),a1=Math.ceil(W*0.7);let imx=0,bmx=0;for(let x=0;x<W;x++){if(I[x]>imx)imx=I[x];if(B[x]>bmx)bmx=B[x]}
  const sc=new Float32Array(W);let best=-1,bv=1e9;
  for(let x=a0;x<=a1;x++){sc[x]=I[x]/(imx||1)*1.0+(B[x]/(bmx||1))*0.9+Math.abs(x-W/2)/W*0.12;if(sc[x]<bv){bv=sc[x];best=x}}
  /* مركز الوادي: امتداد المنطقة الخالية من الحبر حول أدنى نقطة (نتوسّطها) */
  const lim=Math.max(imx*0.12,0.5);let lo=best,hi=best;while(lo>a0&&I[lo-1]<=lim)lo--;while(hi<a1&&I[hi+1]<=lim)hi++;
  const dark=B[best]<bmx*0.92,valley=(lo+hi)/2,pos=dark?best*0.5+valley*0.5:valley,conf=Math.max(0,Math.min(1,(1-bv/2)+(dark?0.2:0)));
  return{x:pos*s.sx,conf,dark,lo:lo*s.sx,hi:hi*s.sx}};
 /* ---------------- 5) الصورة الشخصية: مقاسات وتخطيط ورقة طباعة ----------------
    الورقة تمثّل «المساحة القابلة للطباعة» لصفحة A4 بهوامش 18 نقطة (وهذا ما يفعله dpPdf في وضع «A4 بهوامش»)، بدقة 300 نقطة/إنش،
    فإذا صُدِّر PDF بهذا الوضع طُبعت الصور بمقاسها الحقيقي. */
 C.PH={'4x6':[4,6,'4×6 سم'],'3x4':[3,4,'3×4 سم'],'35x45':[3.5,4.5,'3.5×4.5 سم'],'5x5':[5,5,'5×5 سم']};
 C.sheet={dpi:300,w:2329,h:3358,cm:{w:2329/300*2.54,h:3358/300*2.54}};
 C.layout=function(wcm,hcm,want){const dpi=C.sheet.dpi,pw=Math.round(wcm/2.54*dpi),ph=Math.round(hcm/2.54*dpi),gap=Math.round(0.3/2.54*dpi),W=C.sheet.w,H=C.sheet.h,
   cols=Math.max(0,Math.floor((W+gap)/(pw+gap))),rows=Math.max(0,Math.floor((H+gap)/(ph+gap))),max=cols*rows,n=Math.min(want||max,max),pos=[];
  if(!n)return{pw,ph,cols,rows,max,n:0,pos};const useC=Math.min(cols,n),useR=Math.ceil(n/useC),gw=useC*pw+(useC-1)*gap,gh=useR*ph+(useR-1)*gap,x0=Math.round((W-gw)/2),y0=Math.round((H-gh)/2);
  for(let i=0;i<n;i++)pos.push([x0+(i%useC)*(pw+gap),y0+Math.floor(i/useC)*(ph+gap)]);return{pw,ph,cols,rows,max,n,pos}};
})();

/* =====================  الربط بالواجهة (المتصفح فقط)  ===================== */
(function(){
 if(typeof document=='undefined'||typeof dpFilter!='function'||typeof scCropView!='function'||typeof scIngest!='function')return;
 const C=AS.core,q=s=>document.querySelector(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
 /* نسخة مصغّرة من canvas كمصفوفة RGBA مع معاملات الرجوع للأصل */
 const asData=(cv,m)=>{const k=Math.min(1,m/Math.max(cv.width,cv.height)),t=k<1?dpScale(cv,k):cv,id=t.getContext('2d').getImageData(0,0,t.width,t.height);return{d:id.data,w:t.width,h:t.height,fx:cv.width/t.width,fy:cv.height/t.height}};
 const asDetect=cv=>{const s=asData(cv,720),r=C.detect(s.d,s.w,s.h);if(r.pts)r.pts=r.pts.map(p=>[Math.max(0,Math.min(cv.width,p[0]*s.fx)),Math.max(0,Math.min(cv.height,p[1]*s.fy))]);return r};
 /* ---- مرشّح الميلان داخل dpFilter: deskew:زاوية — يدوّر الصورة (مع عقارب الساعة) ويوسّع الإطار بخلفية بيضاء بلا قص للمحتوى ---- */
 function asDeskew(cv,deg){if(!deg||Math.abs(deg)>20)return;const w=cv.width,h=cv.height,t=deg*Math.PI/180,c=Math.abs(Math.cos(t)),s=Math.abs(Math.sin(t)),nw=Math.round(w*c+h*s),nh=Math.round(w*s+h*c),tmp=dpCv(w,h);
  tmp.getContext('2d').drawImage(cv,0,0);cv.width=nw;cv.height=nh;const x=cv.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,nw,nh);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.translate(nw/2,nh/2);x.rotate(t);x.drawImage(tmp,-w/2,-h/2)}
 AS.deskew=asDeskew;
 {const _f=dpFilter;window.dpFilter=dpFilter=function(cv,f){const m=String(f).split(':');if(m[0]=='deskew')return asDeskew(cv,+m[1]);return _f(cv,f)}}
 /* ---- 1) شاشة القص: اكتشاف تلقائي للحدود ---- */
 function asCropAuto(manual){const r=SC.cr;if(!r||!q('#scc'))return;const d=asDetect(r.cv);let msg,cls;
  if(d.pts&&d.conf>=C.WEAK&&scConvex(d.pts)){r.pts=d.pts;if(d.conf>=C.OK){msg='✔ اكتُشفت حدود الورقة تلقائياً — عدّل الدوائر إن لزم ثم اضغط «قص».';cls='ok'}else{msg='⚠ اكتشاف غير مؤكد — راجع الزوايا الأربع قبل القص.';cls='wn'}}
  else{msg=manual?'تعذّر اكتشاف الحدود في هذه الصورة — حدّد الزوايا بإصبعك.':'لم تُكتشف حدود واضحة (قد تملأ الورقة الصورة أو التباين ضعيف) — حدّد الزوايا بإصبعك.';cls='wn'}
  const b=q('#asn');if(b){b.textContent=msg;b.className='shm asn '+cls}scCropDraw()}
 {const _v=scCropView;window.scCropView=scCropView=function(){const r=_v.apply(this,arguments);
   try{const c=q('#scc');if(c){const bx=c.closest('.dpcv');if(bx)bx.insertAdjacentHTML('afterend','<div class="shm asn" id="asn">⏳ جارٍ اكتشاف حدود الورقة…</div>');const a=q('#sh [data-act="scok"]');if(a&&a.parentNode)a.parentNode.insertAdjacentHTML('beforeend','<button class="btn" data-act="asdet">🔍 اكتشاف تلقائي</button>');setTimeout(()=>asCropAuto(false),30)}}catch(e){}return r}}
 /* ---- 2) الاتجاه والميلان لصفحة: تُضاف عمليات rot وdeskew فوق عمليات الصفحة ---- */
 async function asFix(it,force){const cv=dpRender(it),s=asData(cv,1000),r=C.fixup(s.d,s.w,s.h),res={rot:0,skew:0,guess:false,why:''};
  if(r.why||r.peak<0.6){res.why='نص قليل';return res}
  const vert=!r.horiz,oN=force||AS.opt.orient,kN=force||AS.opt.skew;
  if(oN){if(vert&&r.axisConf>=0.15){res.rot=r.rot;res.guess=!r.flip.known}else if(!vert&&r.rot==180&&r.flip.known&&r.flip.strong)res.rot=180}
  if(kN&&(!vert||res.rot)&&Math.abs(r.skew)>=0.5&&Math.abs(r.skew)<=15)res.skew=r.skew;
  if(res.rot)dpOp(it,{t:'rot',d:res.rot});if(res.skew)dpOp(it,{t:'filter',f:'deskew:'+res.skew.toFixed(2)});return res}
 const fixMsg=r=>[r.rot?('دُوِّرت '+r.rot+'°'+(r.guess?' (الجهة تخمين — إن كانت مقلوبة اضغط ⇅)':'')):'',r.skew?('أُزيل ميلان '+Math.abs(r.skew).toFixed(1)+'°'):''].filter(Boolean).join(' · ');
 {const _in=scIngest;window.scIngest=scIngest=async function(it){
   if(SC.mode=='book')return asBookIngest(it);if(SC.mode=='photo')return asPhotoIngest(it);
   const n0=DP.items.length,ok=await _in(it);
   if(ok&&DP.items.length>n0&&DP.items[DP.items.length-1]===it&&(AS.opt.orient||AS.opt.skew)){try{const r=await asFix(it);if(fixMsg(r))toast('🧭 '+fixMsg(r),3500)}catch(e){}}
   return ok}}
 /* ---- 3) وضع الكتاب ---- */
 SCM.book=['📖','كتاب (صفحتان)',0];SCM.photo=['👤','صورة شخصية',0];
 async function asBookIngest(it){const r=await scCrop(it.orig,'📖 حدّد حدود الصفحتين معاً');if(!r)return false;r.ops.forEach(o=>it.ops.push(o));const parts=await asSplit(it);if(!parts)return false;parts.forEach((p,i)=>{p.name='صفحة '+(DP.items.length+1);DP.items.push(p)});SC.saved=false;return true}
 function asSplit(it){return new Promise(res=>{const cv=dpRender(it),s=asData(cv,900),g=C.gutter(s.d,s.w,s.h);AS.sp={it,cv,x:g.x*s.fx,conf:g.conf,rtl:true,res};asSplitShow()})}
 function asSplitShow(){const s=AS.sp,cv=s.cv,k=Math.min(Math.min(innerWidth-40,560)/cv.width,(innerHeight*0.45)/cv.height,1.5);s.k=k;const good=s.conf>=0.6;
  sheet(`<div class="shh"><h2 class="sht">📖 فصل الصفحتين</h2><button class="lnk" data-act="asspskip">صفحة واحدة ←</button></div><div class="dpcv"><canvas id="asc" width="${Math.round(cv.width*k)}" height="${Math.round(cv.height*k)}"></canvas></div><div class="shm asn ${good?'ok':'wn'}">${good?'✔ حُدِّد موضع التجليد تلقائياً — اسحب الخط الذهبي إن لزم.':'⚠ لم يتضح موضع التجليد — اسحب الخط الذهبي إلى منتصف الكتاب.'}</div><div class="dkc"><button class="chip ${s.rtl?'on':''}" data-act="asspord" data-v="1">الأولى: اليمنى (كتاب عربي)</button><button class="chip ${s.rtl?'':'on'}" data-act="asspord" data-v="0">الأولى: اليسرى</button></div><div class="acts" style="margin-top:8px"><button class="btn pri" data-act="asspok">✂️ فصل</button></div>`);
  const c=q('#asc');c.style.touchAction='none';let dr=false;const mv=e=>{const b=c.getBoundingClientRect();s.x=Math.max(cv.width*0.1,Math.min(cv.width*0.9,(e.clientX-b.left)/b.width*cv.width));asSplitDraw()};
  c.onpointerdown=e=>{dr=true;try{c.setPointerCapture(e.pointerId)}catch(x){}mv(e)};c.onpointermove=e=>{if(dr)mv(e)};c.onpointerup=c.onpointercancel=()=>{dr=false};asSplitDraw()}
 function asSplitDraw(){const s=AS.sp,c=q('#asc');if(!s||!c)return;const x=c.getContext('2d'),k=s.k,gx=s.x*k;x.clearRect(0,0,c.width,c.height);x.drawImage(s.cv,0,0,c.width,c.height);
  x.fillStyle='rgba(232,176,74,.16)';x.fillRect(0,0,gx,c.height);x.fillStyle='rgba(74,144,232,.16)';x.fillRect(gx,0,c.width-gx,c.height);
  x.strokeStyle='#e8b04a';x.lineWidth=3;x.beginPath();x.moveTo(gx,0);x.lineTo(gx,c.height);x.stroke();x.beginPath();x.arc(gx,c.height/2,14,0,7);x.fillStyle='#e8b04a';x.fill();
  x.font='bold 26px Arial';x.textAlign='center';x.fillStyle='#000';x.fillText(s.rtl?'٢':'١',gx/2,34);x.fillText(s.rtl?'١':'٢',gx+(c.width-gx)/2,34)}
 function asSplitParts(){const s=AS.sp,W=s.cv.width,H=s.cv.height,x=Math.round(s.x),mk=c=>({id:++_dpid,name:'صفحة',orig:s.it.orig,ops:[...s.it.ops,Object.assign({t:'crop',y:0,h:H},c)],size:0,th:null}),L=mk({x:0,w:x}),R=mk({x:x,w:W-x});return s.rtl?[R,L]:[L,R]}
 /* ---- 4) الصورة الشخصية بمقاس رسمي + ورقة طباعة ---- */
 function asPhotoIngest(it){return new Promise(res=>{AS.pc={it,cv:it.orig,res,sz:AS.ph.sz,n:AS.ph.n,z:0.85,cx:0.5,cy:0.4};asPhotoShow()})}
 function asFrame(s){const[wc,hc]=C.PH[s.sz],r=wc/hc,W=s.cv.width,H=s.cv.height,mw=Math.min(W,H*r),w=mw*s.z,h=w/r,cx=Math.max(w/2,Math.min(W-w/2,s.cx*W)),cy=Math.max(h/2,Math.min(H-h/2,s.cy*H));return{x:cx-w/2,y:cy-h/2,w,h}}
 function asPhotoShow(){const s=AS.pc,cv=s.cv,k=Math.min(Math.min(innerWidth-40,560)/cv.width,(innerHeight*0.42)/cv.height,1.5);s.k=k;const[wc,hc]=C.PH[s.sz],L=C.layout(wc,hc,s.n);
  const chips=(a,cur,act)=>a.map(([v,t])=>`<button class="chip ${String(cur)==String(v)?'on':''}" data-act="${act}" data-v="${v}">${t}</button>`).join('');
  sheet(`<div class="shh"><h2 class="sht">👤 صورة شخصية</h2></div><div class="dpcv"><canvas id="asp" width="${Math.round(cv.width*k)}" height="${Math.round(cv.height*k)}"></canvas></div><div class="shm">اسحب الإطار ليحيط بالوجه والكتفين، وغيّر حجمه بالمنزلق. المقاس: <b>${C.PH[s.sz][2]}</b>.</div><label class="fld"><span>حجم الإطار</span><input type="range" id="asz" min="30" max="100" value="${Math.round(s.z*100)}"></label><div class="shm mws">المقاس</div><div class="dkc">${chips(Object.entries(C.PH).map(([k,v])=>[k,v[2]]),s.sz,'asphsz')}</div><div class="shm mws">عدد النسخ في ورقة A4 (تتسع ${L.max})</div><div class="dkc">${chips([[4,'4'],[6,'6'],[8,'8'],[12,'12'],[0,'الأقصى']],s.n,'asphn')}</div><div class="acts" style="margin-top:8px"><button class="btn pri" data-act="asphok">✅ إنشاء ورقة الصور</button></div><div class="shm">للطباعة بالمقاس الحقيقي: صدّر PDF بوضع «A4 بهوامش» واطبعه بنسبة 100% (الحجم الفعلي) دون «ملاءمة الصفحة». تأكّد من اشتراطات الجهة المصدِرة (الخلفية والمقاس) قبل التقديم؛ التطبيق لا يغيّر خلفية الصورة.</div>`);
  const c=q('#asp');c.style.touchAction='none';let dr=false;const mv=e=>{const b=c.getBoundingClientRect();s.cx=(e.clientX-b.left)/b.width;s.cy=(e.clientY-b.top)/b.height;asPhotoDraw()};
  c.onpointerdown=e=>{dr=true;try{c.setPointerCapture(e.pointerId)}catch(x){}mv(e)};c.onpointermove=e=>{if(dr)mv(e)};c.onpointerup=c.onpointercancel=()=>{dr=false};
  const z=q('#asz');if(z)z.oninput=()=>{s.z=z.value/100;asPhotoDraw()};asPhotoDraw()}
 function asPhotoDraw(){const s=AS.pc,c=q('#asp');if(!s||!c)return;const x=c.getContext('2d'),k=s.k,f=asFrame(s);x.clearRect(0,0,c.width,c.height);x.drawImage(s.cv,0,0,c.width,c.height);x.fillStyle='rgba(0,0,0,.5)';x.fillRect(0,0,c.width,c.height);
  x.drawImage(s.cv,f.x,f.y,f.w,f.h,f.x*k,f.y*k,f.w*k,f.h*k);x.strokeStyle='#e8b04a';x.lineWidth=2;x.setLineDash([6,4]);x.strokeRect(f.x*k,f.y*k,f.w*k,f.h*k)}
 function asPhotoMake(){const s=AS.pc,[wc,hc]=C.PH[s.sz],L=C.layout(wc,hc,s.n),f=asFrame(s),sh=dpCv(C.sheet.w,C.sheet.h),x=sh.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,sh.width,sh.height);
  const ph=dpCv(L.pw,L.ph),px=ph.getContext('2d');px.imageSmoothingEnabled=true;px.imageSmoothingQuality='high';px.drawImage(s.cv,f.x,f.y,f.w,f.h,0,0,L.pw,L.ph);
  L.pos.forEach(([X,Y])=>{x.drawImage(ph,X,Y);x.strokeStyle='#c9c9c9';x.lineWidth=1;x.strokeRect(X+.5,Y+.5,L.pw-1,L.ph-1)});
  return{id:++_dpid,name:'صور شخصية '+C.PH[s.sz][2]+' ×'+L.n,orig:sh,ops:[],size:0,th:null}}
 /* ---- مقبض الإغلاق: لا نترك وعداً معلّقاً إن أُغلقت النافذة (زر الرجوع مثلاً) ---- */
 /* closeSheet يُعرَّف في app.js (بعد هذا الملف) فنلفّه عند اكتمال التحميل */
 const wrapClose=()=>{if(typeof closeSheet!='function'||closeSheet._as)return;const _c=closeSheet;window.closeSheet=closeSheet=function(){if(AS.sp){const r=AS.sp.res;AS.sp=null;r(null)}if(AS.pc){const r=AS.pc.res;AS.pc=null;r(null)}return _c.apply(this,arguments)};closeSheet._as=1};
 if(document.readyState=='complete')wrapClose();else addEventListener('load',wrapClose);
 /* ---- واجهة: شاشة المسح (خيارات)، المحرر (أزرار)، شاشة الصفحات (معالجة جماعية) ---- */
 {const _h=scHome;window.scHome=scHome=function(){const r=_h.apply(this,arguments);try{const a=q('#sh .acts');if(a)a.insertAdjacentHTML('beforebegin',`<div class="dkc" style="margin-top:6px"><button class="chip ${AS.opt.orient?'on':''}" data-act="asopt" data-k="orient">🧭 ضبط الاتجاه تلقائياً</button><button class="chip ${AS.opt.skew?'on':''}" data-act="asopt" data-k="skew">📏 إزالة الميلان تلقائياً</button></div>`)}catch(e){}return r}}
 {const _e=dpEditView;window.dpEditView=dpEditView=function(){const r=_e.apply(this,arguments);try{const sh=q('#sh');if(sh&&q('#dpe'))sh.insertAdjacentHTML('beforeend','<div class="shm mws">قص واتجاه تلقائي</div><div class="dkc"><button class="chip" data-act="asautocrop">🔍 قص تلقائي</button><button class="chip" data-act="asfix">🧭 اتجاه + ميلان</button><button class="chip" data-act="asskew">📏 إزالة الميلان</button><button class="chip" data-act="asflip">⇅ قلب 180°</button><button class="chip" data-act="asbook">📖 فصل صفحتين</button></div>')}catch(e){}return r}}
 {const _w=dpWork;window.dpWork=dpWork=function(){const r=_w.apply(this,arguments);try{const sh=q('#sh');if(sh&&DP.items.length&&sh.querySelector('[data-act="dprun"]'))sh.insertAdjacentHTML('beforeend','<div class="shm mws">معالجة تلقائية لكل الصفحات</div><div class="acts one"><button class="btn" data-act="asall">🪄 قص + اتجاه + ميلان لكل الصفحات</button></div><div class="shm">يقصّ الصفحات غير المقصوصة إن وُجدت حدودها بثقة، ثم يضبط الاتجاه والميلان. التراجع لكل صفحة من المحرر.</div>')}catch(e){}return r}}
 async function asAll(){const N=DP.items.length;let cr=0,ro=0,sk=0;sheet('<h2 class="sht">⏳ معالجة تلقائية…</h2><div class="shm" id="asprg">0 / '+N+'</div>');
  for(let i=0;i<N;i++){const it=DP.items[i],e=q('#asprg');if(e)e.textContent=(i+1)+' / '+N;await wait(20);
   try{if(!it.ops.some(o=>o.t=='quad'||o.t=='crop')){const d=asDetect(dpRender(it));if(d.pts&&d.conf>=C.OK&&scConvex(d.pts)){const[w,h]=scSize(d.pts);dpOp(it,{t:'quad',p:d.pts,w,h});cr++}}
    const r=await asFix(it,true);if(r.rot)ro++;if(r.skew)sk++}catch(x){}}
  DP.items.forEach(x=>x.th=null);dpWork();toast(`🪄 قُصَّت ${cr} · دُوِّرت ${ro} · عُدِّل ميلان ${sk} (من ${N})`,4500)}
 document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,m=el.dataset.m;if(a=='scmode'&&(m=='book'||m=='photo'))SC.batch=false},true);
 document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
  if(a=='asdet')asCropAuto(true);
  else if(a=='asopt'){AS.opt[el.dataset.k]=!AS.opt[el.dataset.k];el.classList.toggle('on',AS.opt[el.dataset.k])}
  else if(a=='asautocrop'){const it=DP.items[DPE.i];if(!it)return;toast('⏳ جارٍ اكتشاف الحدود…',1200);await wait(30);const d=asDetect(dpRender(it));
   if(d.pts&&d.conf>=C.WEAK&&scConvex(d.pts)){const[w,h]=scSize(d.pts);dpOp(it,{t:'quad',p:d.pts,w,h});dpEditView();toast(d.conf>=C.OK?'✔ قُصّت الصفحة تلقائياً':'⚠ قُصّت باكتشاف غير مؤكد — راجع الناتج أو تراجع',3000)}else toast('تعذّر اكتشاف حدود الورقة — استعمل «قص بالزوايا»',3500)}
  else if(a=='asfix'){const it=DP.items[DPE.i];if(!it)return;toast('⏳ جارٍ التحليل…',1200);await wait(30);const r=await asFix(it,true);dpEditView();toast(fixMsg(r)?'🧭 '+fixMsg(r):(r.why?'نص قليل — لا يمكن تحديد الاتجاه':'الصفحة مستقيمة'),3500)}
  else if(a=='asskew'){const it=DP.items[DPE.i];if(!it)return;await wait(10);const s=asData(dpRender(it),1000),r=C.skew(s.d,s.w,s.h);
   if(r.conf<0.5)toast('لا أسطر نص كافية لتقدير الميلان',3000);else if(Math.abs(r.a)<0.3)toast('الصفحة مستقيمة',2000);else{dpOp(it,{t:'filter',f:'deskew:'+r.a.toFixed(2)});dpEditView();toast('📏 أُزيل ميلان '+Math.abs(r.a).toFixed(1)+'°',3000)}}
  else if(a=='asflip'){const it=DP.items[DPE.i];if(it){dpOp(it,{t:'rot',d:180});dpEditView()}}
  else if(a=='asbook'){const i=DPE.i,it=DP.items[i];if(!it)return;const parts=await asSplit(it);if(parts){parts.forEach(p=>p.name=it.name);DP.items.splice(i,1,...parts);SC.saved=false;dpWork();toast('📖 فُصلت الصفحتان',2500)}else dpEditView()}
  else if(a=='asspord'){AS.sp.rtl=el.dataset.v=='1';asSplitShow()}
  else if(a=='asspok'){const p=asSplitParts(),r=AS.sp.res;AS.sp=null;r(p)}
  else if(a=='asspskip'){const r=AS.sp.res,it=AS.sp.it;AS.sp=null;r([it])}
  else if(a=='asphsz'){AS.pc.sz=el.dataset.v;AS.ph.sz=el.dataset.v;asPhotoShow()}
  else if(a=='asphn'){AS.pc.n=+el.dataset.v;AS.ph.n=+el.dataset.v;asPhotoShow()}
  else if(a=='asphok'){const s=AS.pc,item=asPhotoMake();AS.pc=null;DP.items.push(item);DP.page='a4';DP.maxd='0';SC.saved=false;s.res(true);toast('✔ أُنشئت ورقة الصور (حُدِّد وضع «A4 بهوامش» والأبعاد الأصلية للطباعة بالمقاس)',5000)}
  else if(a=='asall')asAll()});
})();
if(typeof module!='undefined')module.exports=AS;
