/* الحسام سكان — المرحلة N11 (1.20.0): تحضير الصورة قبل التعرف على النص (OCR) محلياً.
   السبب: Tesseract يقرأ الصور النظيفة جيداً لكنه يتعثر مع المسح الضعيف (خلفية رمادية، ميل، أختام، توقيعات، إطارات، خط يدوي)،
   فيقرأ الأختام والتوقيعات «كلاماً» ويخلط ترتيب الأسطر. هذا الملف يضيف خط معالجة قبل OCR، كله في المتصفح بلا رفع ولا إنترنت:
   1) تسوية الإضاءة لكل قناة لونية ثم إزالة الحبر الملوّن (أختام زرقاء/حمراء، أقلام ملوّنة) مع بقاء الأسود،
   2) تحويل تكيّفي إلى أبيض/أسود (Sauvola) مع مكوّنات متصلة، تقدير ارتفاع النص، حذف الغبار وخطوط الجداول والإطارات
      والكتل الكبيرة (أختام سوداء، توقيعات، حواف الماسح) وما بداخل الأختام الدائرية،
   3) تقدير الميلان بإسقاط الأسطر وتصحيحه، وضبط الحجم (تكبير الصغير وتصغير الضخم) ليناسب المحرك،
   4) تقطيع الصفحة إلى أسطر والتعرف على كل سطر وحده (يثبّت ترتيب الأسطر من الأعلى للأسفل) أو كتلة واحدة،
   5) تنظيف ما بعد OCR: حذف الكلمات القمامة منخفضة الثقة (رموز، حروف لاتينية قصيرة) من صفحة عربية.
   القسم الأول (OP.core) دوالّ نقية على مصفوفات لا تلمس DOM لتعمل في Node (tools/n11-test.js). إضافة فقط: لا يُعدَّل docprep.js. */
const OP={core:{},on:true,mode:'lines',strength:'normal',last:{}};
(function(){
 const C=OP.core,cl=(v,a,b)=>v<a?a:v>b?b:v;
 /* ---------- تسوية الإضاءة + إزالة الحبر الملوّن ---------- */
 /* شبكة كتل: المئين pct لقناة ch من البيانات d (RGBA)، ثم تنعيم 3×3 */
 function gridPct(d,w,h,ch,B,pct){const gw=Math.ceil(w/B),gh=Math.ceil(h/B),G=new Float32Array(gw*gh),hs=new Uint32Array(256),st=Math.max(1,Math.floor(B/12));
  for(let by=0;by<gh;by++)for(let bx=0;bx<gw;bx++){const x0=bx*B,y0=by*B,x1=Math.min(w,x0+B),y1=Math.min(h,y0+B);hs.fill(0);let n=0;
   for(let y=y0;y<y1;y+=st){let p=(y*w+x0)*4+ch;for(let x=x0;x<x1;x+=st,p+=4*st){hs[d[p]]++;n++}}
   const t=n*pct;let s=0,r=255;for(let v=0;v<256;v++){s+=hs[v];if(s>=t){r=v;break}}G[by*gw+bx]=r}
  const o=new Float32Array(G.length);for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){let s=0,n=0;for(let j=-1;j<=1;j++){const yy=y+j;if(yy<0||yy>=gh)continue;for(let i=-1;i<=1;i++){const xx=x+i;if(xx<0||xx>=gw)continue;s+=G[yy*gw+xx];n++}}o[y*gw+x]=s/n}
  return{G:o,gw,gh,B}}
 function rowSampler(g,w){const{G,gw,gh,B}=g,X0=new Int32Array(w),X1=new Int32Array(w),WX=new Float32Array(w);
  for(let x=0;x<w;x++){let fx=(x+0.5)/B-0.5;fx=fx<0?0:fx>gw-1?gw-1:fx;const a=Math.floor(fx);X0[x]=a;X1[x]=Math.min(gw-1,a+1);WX[x]=fx-a}
  return(y,out)=>{let fy=(y+0.5)/B-0.5;fy=fy<0?0:fy>gh-1?gh-1:fy;const y0=Math.floor(fy),y1=Math.min(gh-1,y0+1),wy=fy-y0,r0=y0*gw,r1=y1*gw;
   for(let x=0;x<w;x++){const a=X0[x],b=X1[x],wx=WX[x],t=G[r0+a]+(G[r0+b]-G[r0+a])*wx,u=G[r1+a]+(G[r1+b]-G[r1+a])*wx;out[x]=t+(u-t)*wy}}}
 /* flatten: صورة رمادية ورقها أبيض (255) وحبرها داكن، والألوان المشبعة (أختام/أقلام ملوّنة) تُمحى إلى الأبيض.
    opt.color=false يُبقي الألوان (يُحوَّل إلى رمادي فقط). يعيد {g, colorPx, colorFrac} */
 C.flatten=function(d,w,h,opt){opt=opt||{};const B=Math.max(16,Math.round(Math.min(w,h)/22)),gr=[0,1,2].map(c=>rowSampler(gridPct(d,w,h,c,B,0.9),w)),
   bg=[new Float32Array(w),new Float32Array(w),new Float32Array(w)],g=new Uint8Array(w*h),cm=new Uint8Array(w*h),kill=opt.color!==false;let colorPx=0,dark=0,cdark=0,p=0;
  const lo=opt.chromaLo==null?24:opt.chromaLo,hi=opt.chromaHi==null?46:opt.chromaHi,span=hi-lo;
  for(let y=0;y<h;y++){gr[0](y,bg[0]);gr[1](y,bg[1]);gr[2](y,bg[2]);const o=y*w;
   for(let x=0;x<w;x++,p+=4){const b0=bg[0][x]<40?40:bg[0][x],b1=bg[1][x]<40?40:bg[1][x],b2=bg[2][x]<40?40:bg[2][x];
    let r=d[p]*255/b0,gg=d[p+1]*255/b1,b=d[p+2]*255/b2;r=r>255?255:r;gg=gg>255?255:gg;b=b>255?255:b;
    let L=0.299*r+0.587*gg+0.114*b;
    if(L<150)dark++;
    if(kill){const mx=r>gg?(r>b?r:b):(gg>b?gg:b),mn=r<gg?(r<b?r:b):(gg<b?gg:b),ch=mx-mn;
     if(ch>lo){const t=ch>=hi?1:(ch-lo)/span;if(L<150&&t>0.35)cdark++;L=L+(255-L)*t;if(t>0.35){colorPx++;cm[o+x]=1}}}
    g[o+x]=L}}
  return{g,cm,colorPx,colorFrac:colorPx/(w*h),dark,cdark,colorShare:dark?cdark/dark:0}};
 /* توسيع قناع بمربع نصف قطره r (أقصى مفصول بنافذة منزلقة) */
 C.dilate=function(m,w,h,r){const t=new Uint8Array(w*h),o=new Uint8Array(w*h);
  for(let y=0;y<h;y++){const b=y*w;let c=0;for(let x=0;x<Math.min(w,r+1);x++)c+=m[b+x];for(let x=0;x<w;x++){if(x+r<w&&x>0)c+=m[b+x+r];else if(x==0&&false)c+=0;if(x-r-1>=0)c-=m[b+x-r-1];t[b+x]=c>0?1:0}}
  const cs=new Int32Array(w);for(let y=0;y<Math.min(h,r+1);y++)for(let x=0;x<w;x++)cs[x]+=t[y*w+x];
  for(let y=0;y<h;y++){if(y>0){if(y+r<h)for(let x=0;x<w;x++)cs[x]+=t[(y+r)*w+x];if(y-r-1>=0)for(let x=0;x<w;x++)cs[x]-=t[(y-r-1)*w+x]}const b=y*w;for(let x=0;x<w;x++)o[b+x]=cs[x]>0?1:0}
  return o};
 /* حواف الماسح/الخلفية الداكنة: شريط معتم عند أحد الجوانب الأربعة (عمود/صف أغلبه داكن) يُبيَّض مع هامش. يعيد عدد البكسلات المبيّضة */
 C.edges=function(g,w,h){let n=0;const lim=Math.round(0.08*Math.max(w,h)),dk=v=>v<105;
  const colFrac=x=>{let c=0,t=0;for(let y=0;y<h;y+=3){t++;if(dk(g[y*w+x]))c++}return c/t},rowFrac=y=>{let c=0,t=0;for(let x=0;x<w;x+=3){t++;if(dk(g[y*w+x]))c++}return c/t};
  const clearCols=(a,b)=>{for(let y=0;y<h;y++){g.fill(255,y*w+a,y*w+b+1)}n+=(b-a+1)*h},clearRows=(a,b)=>{g.fill(255,a*w,(b+1)*w);n+=(b-a+1)*w};
  const sideC=(from,step)=>{let x=from,k=0;while(x>=0&&x<w&&k<lim&&colFrac(x)>0.55){x+=step;k++}if(k>=3){const a=from,b=Math.min(w-1,Math.max(0,from+step*(k+5)));clearCols(Math.min(a,b),Math.max(a,b))}};
  const sideR=(from,step)=>{let y=from,k=0;while(y>=0&&y<h&&k<lim&&rowFrac(y)>0.55){y+=step;k++}if(k>=3){const a=from,b=Math.min(h-1,Math.max(0,from+step*(k+5)));clearRows(Math.min(a,b),Math.max(a,b))}};
  sideC(0,1);sideC(w-1,-1);sideR(0,1);sideR(h-1,-1);return n};
 /* تنعيم 3×3 (متوسط) لخفض ضجيج JPEG والحبوب قبل التحويل إلى أبيض/أسود */
 C.blur3=function(g,w,h){const o=new Uint8Array(w*h),t=new Uint16Array(w*h);
  for(let y=0;y<h;y++){const b=y*w;for(let x=0;x<w;x++){const a=x>0?g[b+x-1]:g[b+x],c=x<w-1?g[b+x+1]:g[b+x];t[b+x]=a+g[b+x]*2+c}}
  for(let y=0;y<h;y++){const u=(y>0?y-1:y)*w,m=y*w,d=(y<h-1?y+1:y)*w,b=y*w;for(let x=0;x<w;x++)o[b+x]=(t[u+x]+t[m+x]*2+t[d+x])>>4}
  return o};
 /* ---------- Sauvola بنوافذ منزلقة (ذاكرة قليلة: لا مصفوفات تكاملية كاملة) ---------- */
 C.sauvola=function(g,w,h,win,k){const r=win>>1,bin=new Uint8Array(w*h),cS=new Float64Array(w),cQ=new Float64Array(w),pre=new Float64Array(w+1),pq=new Float64Array(w+1);
  const addRow=(y,sg)=>{const b=y*w;pre[0]=0;pq[0]=0;for(let x=0;x<w;x++){const v=g[b+x];pre[x+1]=pre[x]+v;pq[x+1]=pq[x]+v*v}
   for(let x=0;x<w;x++){const a=x-r<0?0:x-r,e=x+r+1>w?w:x+r+1;cS[x]+=sg*(pre[e]-pre[a]);cQ[x]+=sg*(pq[e]-pq[a])}};
  const kk=k==null?0.25:k;let top=-1,bot=-1;
  for(let y=0;y<h;y++){const nt=Math.max(0,y-r),nb=Math.min(h-1,y+r);
   if(y==0){for(let yy=0;yy<=nb;yy++)addRow(yy,1);top=0;bot=nb}else{if(nb>bot){addRow(nb,1);bot=nb}if(nt>top){addRow(top,-1);top=nt}}
   const rows=bot-top+1,b=y*w;
   for(let x=0;x<w;x++){const a=x-r<0?0:x-r,e=x+r+1>w?w:x+r+1,n=(e-a)*rows,m=cS[x]/n,v=cQ[x]/n-m*m,s=v>0?Math.sqrt(v):0,thr=m*(1+kk*(s/128-1)),gv=g[b+x];
    if(gv<thr&&m-gv>14&&gv<200)bin[b+x]=1}}
  return bin};
 /* ---------- مكوّنات متصلة بالأشواط (8 اتجاهات) ---------- */
 C.cc=function(bin,w,h){let cap=1<<15,RY=new Int32Array(cap),RA=new Int32Array(cap),RB=new Int32Array(cap),P=new Int32Array(cap),nr=0;
  const grow=()=>{cap*=2;const f=a=>{const n=new Int32Array(cap);n.set(a);return n};RY=f(RY);RA=f(RA);RB=f(RB);P=f(P)};
  const find=a=>{while(P[a]!=a){P[a]=P[P[a]];a=P[a]}return a};
  let ps=0,pe=0;
  for(let y=0;y<h;y++){const cs=nr,b=y*w;let x=0,pp=ps;
   while(x<w){if(!bin[b+x]){x++;continue}const x0=x;while(x<w&&bin[b+x])x++;const x1=x-1;
    if(nr>=cap)grow();RY[nr]=y;RA[nr]=x0;RB[nr]=x1;P[nr]=nr;const me=nr;nr++;
    while(pp<pe&&RB[pp]<x0-1)pp++;
    for(let q=pp;q<pe&&RA[q]<=x1+1;q++){const a=find(me),c=find(q);if(a!=c){if(a<c)P[c]=a;else P[a]=c}}}
   ps=cs;pe=nr}
  const id=new Int32Array(nr).fill(-1);let n=0;const root=new Int32Array(nr);
  for(let i=0;i<nr;i++){const r=find(i);if(id[r]<0)id[r]=n++;root[i]=id[r]}
  const X0=new Int32Array(n).fill(1<<30),Y0=new Int32Array(n).fill(1<<30),X1=new Int32Array(n).fill(-1),Y1=new Int32Array(n).fill(-1),A=new Int32Array(n);
  for(let i=0;i<nr;i++){const c=root[i];if(RA[i]<X0[c])X0[c]=RA[i];if(RB[i]>X1[c])X1[c]=RB[i];if(RY[i]<Y0[c])Y0[c]=RY[i];if(RY[i]>Y1[c])Y1[c]=RY[i];A[c]+=RB[i]-RA[i]+1}
  return{n,nr,RY,RA,RB,root,x0:X0,y0:Y0,x1:X1,y1:Y1,area:A,w,h}};
 /* يمسح من bin كل مكوّن علامته في flag */
 C.clear=function(bin,cc,flag){const w=cc.w;for(let i=0;i<cc.nr;i++)if(flag[cc.root[i]]){const b=cc.RY[i]*w;bin.fill(0,b+cc.RA[i],b+cc.RB[i]+1)}};
 /* ارتفاع النص النموذجي: وسيط ارتفاع المكوّنات «الشبيهة بالكلمات» (مرجّحاً بالمساحة حتى لا تغلب النقاط) */
 C.estH=function(cc,h){const hs=new Float64Array(512);let tot=0;
  for(let c=0;c<cc.n;c++){const bh=cc.y1[c]-cc.y0[c]+1,bw=cc.x1[c]-cc.x0[c]+1;if(cc.area[c]<24||bh<9||bh>Math.min(400,h*0.2)||bw>bh*25)continue;hs[bh]+=cc.area[c];tot+=cc.area[c]}
  if(!tot)return 0;let s=0;for(let v=0;v<512;v++){s+=hs[v];if(s>=tot/2)return v}return 0};
 /* مسح الأشواط الطويلة (خطوط جداول وإطارات وتسطير): أفقياً ثم رأسياً. يعيد عدد البكسلات الممسوحة */
 C.longRuns=function(bin,w,h,L){let n=0;
  for(let y=0;y<h;y++){const b=y*w;let x=0;while(x<w){if(!bin[b+x]){x++;continue}const x0=x;while(x<w&&bin[b+x])x++;if(x-x0>=L){bin.fill(0,b+x0,b+x);n+=x-x0}}}
  const run=new Int32Array(w);
  for(let y=0;y<=h;y++){const b=y*w;for(let x=0;x<w;x++){const on=y<h&&bin[b+x];if(on)run[x]++;else{const r=run[x];if(r>=L){for(let k=y-r;k<y;k++)bin[k*w+x]=0;n+=r}run[x]=0}}}
  return n};
 /* ---------- قواعد التنظيف ---------- */
 const STR={soft:{blob:3.6,ring:5.5,thin:true},normal:{blob:2.8,ring:4,thin:true},strong:{blob:2.1,ring:3,thin:true}};
 C.clean=function(bin,w,h,opt){opt=opt||{};const S=STR[opt.strength||'normal']||STR.normal;let cc=C.cc(bin,w,h),H=C.estH(cc,h),info={H,specks:0,lines:0,blobs:0,inner:0,frames:0,runPx:0};
  if(!H)H=Math.max(14,Math.round(Math.min(w,h)/60));info.H=H;
  /* 1) الأشواط الطويلة (جداول/إطارات/تسطير) ثم إعادة التجميع */
  info.runPx=C.longRuns(bin,w,h,Math.max(60,Math.round(9*H)));if(info.runPx)cc=C.cc(bin,w,h);
  const flag=new Uint8Array(cc.n),spk=Math.max(4,Math.round(0.006*H*H));
  for(let c=0;c<cc.n;c++){const bw=cc.x1[c]-cc.x0[c]+1,bh=cc.y1[c]-cc.y0[c]+1,a=cc.area[c];
   if(a<spk){flag[c]=1;info.specks++;continue}
   if(S.thin&&((bh<=Math.max(3,0.18*H)&&bw>=4*H)||(bw<=Math.max(3,0.5*H)&&bh>=3.5*H))){flag[c]=1;info.lines++;continue}
   if(bw>0.4*w&&bh>0.4*h){flag[c]=1;info.frames++;continue}
   const edge=cc.x0[c]<=1||cc.y0[c]<=1||cc.x1[c]>=w-2||cc.y1[c]>=h-2;
   if((cc.x0[c]<=2||cc.x1[c]>=w-3)&&bw<1.3*H&&bh>3*H){flag[c]=1;info.frames++;continue}
   {const nb=Math.round(0.03*Math.max(w,h));if((cc.x1[c]<nb||cc.x0[c]>w-nb||cc.y1[c]<nb||cc.y0[c]>h-nb)&&((bh>2.2*H&&bw<1.6*H)||(bw>2.2*H&&bh<1.6*H))){flag[c]=1;info.frames++;continue}}
   if(edge&&(bw>0.6*w||bh>0.6*h)){flag[c]=1;info.frames++;continue}
   if(bh>S.blob*H&&bw>1.2*H){flag[c]=1;info.blobs++;continue}
   if(bh>6*H&&bw<2.5*H){flag[c]=1;info.lines++;continue}}
  /* غبار معزول: مكوّن صغير بلا أي مكوّن «كبير» في جواره (النقاط الأصلية للحروف تقع قرب حروفها) */
  {const cs=Math.max(8,Math.round(1.6*H)),gw=Math.ceil(w/cs)+2,gh=Math.ceil(h/cs)+2,big=new Uint8Array(gw*gh),bigA=0.04*H*H;
   for(let c=0;c<cc.n;c++)if(!flag[c]&&cc.area[c]>=bigA)big[(((cc.y0[c]+cc.y1[c])>>1)/cs+1|0)*gw+(((cc.x0[c]+cc.x1[c])>>1)/cs+1|0)]=1;
   for(let c=0;c<cc.n;c++){if(flag[c]||cc.area[c]>=bigA)continue;const gx=(((cc.x0[c]+cc.x1[c])>>1)/cs+1)|0,gy=(((cc.y0[c]+cc.y1[c])>>1)/cs+1)|0;let near=false;for(let j=-1;j<=1&&!near;j++)for(let i=-1;i<=1;i++)if(big[(gy+j)*gw+gx+i]){near=true;break}if(!near){flag[c]=1;info.specks++}}}
  /* 2) ما بداخل الأختام الدائرية/البيضاوية المحذوفة (نص الختم الصغير) */
  const rings=[];for(let c=0;c<cc.n;c++)if(flag[c]){const bw=cc.x1[c]-cc.x0[c]+1,bh=cc.y1[c]-cc.y0[c]+1,asp=bw/bh;if(bw>S.ring*H&&bh>S.ring*H&&asp>0.5&&asp<2&&bw<0.4*w&&bh<0.4*h&&cc.area[c]/(bw*bh)<0.4)rings.push(c)}
  if(rings.length)for(let c=0;c<cc.n;c++){if(flag[c])continue;for(const r of rings)if(cc.x0[c]>=cc.x0[r]&&cc.x1[c]<=cc.x1[r]&&cc.y0[c]>=cc.y0[r]&&cc.y1[c]<=cc.y1[r]){flag[c]=1;info.inner++;break}}
  C.clear(bin,cc,flag);info.rings=rings.length;
  return info};
 /* ---------- الميلان ---------- */
 /* يقدّر زاوية سطر النص (بالدرجات؛ الموجبة = السطر يرتفع نحو اليمين كما يظهر على الشاشة) بتعظيم حدّة مدرج الإسقاط. يعيد {a, conf} */
 C.skew=function(bin,w,h,range){range=range||12;let tot=0;for(let i=0;i<bin.length;i++)tot+=bin[i];if(tot<200)return{a:0,conf:0};
  const sx=Math.max(1,Math.ceil(tot/90000)),xs=new Float32Array(Math.ceil(tot/sx)+8),ys=new Float32Array(xs.length);let n=0,k=0;
  for(let y=0;y<h;y++){const b=y*w;for(let x=0;x<w;x++)if(bin[b+x]){if(k++%sx==0){xs[n]=x-w/2;ys[n]=y-h/2;n++}}}
  const NB=w+h+4,hist=new Int32Array(NB),off=(w+h)/2+1;
  const score=deg=>{const t=deg*Math.PI/180,c=Math.cos(t),s=Math.sin(t);hist.fill(0);for(let i=0;i<n;i++){hist[(ys[i]*c+xs[i]*s+off)|0]++}let sc=0;for(let i=1;i<NB;i++){const dv=hist[i]-hist[i-1];sc+=dv*dv}return sc};
  /* موجبة = السطر يرتفع يميناً (y يقل مع x) ⇒ الإسقاط على y*cos+x*sin يجب أن يكون ثابتاً لـ y=-x*tan(a) ⇒ نبحث عن θ=a */
  let best=0,bs=-1,s0=score(0),all=[];
  for(let a=-range;a<=range+1e-9;a+=0.5){const s=score(a);all.push(s);if(s>bs){bs=s;best=a}}
  let b2=best,s2=bs;for(let a=best-0.6;a<=best+0.6+1e-9;a+=0.1){const s=score(a);if(s>s2){s2=s;b2=a}}
  const med=all.slice().sort((p,q)=>p-q)[all.length>>1];
  return{a:+b2.toFixed(2),conf:med>0?s2/med:0,gain:s0>0?s2/s0:0}};
 /* تدوير رمادي بالاستيفاء الثنائي مع تكبير اللوحة لتتسع. deg>0 = تدوير مع عقارب الساعة على الشاشة. يعيد {g,w,h,cx,cy,ox,oy,deg} */
 C.rotate=function(g,w,h,deg,fill){fill=fill==null?255:fill;const t=deg*Math.PI/180,c=Math.cos(t),s=Math.sin(t),nw=Math.ceil(Math.abs(w*c)+Math.abs(h*s)),nh=Math.ceil(Math.abs(w*s)+Math.abs(h*c)),o=new Uint8Array(nw*nh);
  const cx=w/2,cy=h/2,ncx=nw/2,ncy=nh/2;
  for(let y=0;y<nh;y++){const dy=y+0.5-ncy;for(let x=0;x<nw;x++){const dx=x+0.5-ncx,sx=dx*c+dy*s+cx-0.5,sy=-dx*s+dy*c+cy-0.5;
   if(sx<0||sy<0||sx>=w-1||sy>=h-1){o[y*nw+x]=(sx<-1||sy<-1||sx>w||sy>h)?fill:g[(sy<0?0:sy>h-1?h-1:sy|0)*w+(sx<0?0:sx>w-1?w-1:sx|0)];continue}
   const x0=sx|0,y0=sy|0,fx=sx-x0,fy=sy-y0,i=y0*w+x0,v=g[i]*(1-fx)*(1-fy)+g[i+1]*fx*(1-fy)+g[i+w]*(1-fx)*fy+g[i+w+1]*fx*fy;o[y*nw+x]=v}}
  return{g:o,w:nw,h:nh,cx,cy,ncx,ncy,deg}};
 /* إحداثيات نقطة من الصورة المدارة إلى الصورة قبل التدوير */
 C.unrotate=function(r,x,y){const t=r.deg*Math.PI/180,c=Math.cos(t),s=Math.sin(t),dx=x-r.ncx,dy=y-r.ncy;return[dx*c+dy*s+r.cx,-dx*s+dy*c+r.cy]};
 /* ---------- الصورة النهائية للمحرك: الحبر المحتفظ به بتدرّجه الأصلي، والباقي أبيض ---------- */
 C.compose=function(g,bin,w,h,rad){const o=new Uint8Array(w*h).fill(255),r=rad==null?2:rad;
  for(let y=0;y<h;y++){const b=y*w;for(let x=0;x<w;x++)if(bin[b+x]){const x0=x-r<0?0:x-r,x1=x+r>=w?w-1:x+r,y0=y-r<0?0:y-r,y1=y+r>=h?h-1:y+r;
   for(let yy=y0;yy<=y1;yy++){const bb=yy*w;for(let xx=x0;xx<=x1;xx++)o[bb+xx]=g[bb+xx]}}}
  /* تعميق الحبر قليلاً: يرفع التباين دون تقسية الحواف */
  for(let i=0;i<o.length;i++){const v=o[i];if(v<255){const t=(v-40)*(255/190);o[i]=t<0?0:t>255?255:t}}
  return o};
 /* ---------- تقطيع الأسطر ---------- */
 /* g رمادي بعد المعالجة (255 ورق). يعيد أشرطة الأسطر [{y0,y1,x0,x1,multi}] */
 C.bands=function(g,w,h,H){const prof=new Float32Array(h),dark=v=>v<150;
  for(let y=0;y<h;y++){let n=0;const b=y*w;for(let x=0;x<w;x++)if(dark(g[b+x]))n++;prof[y]=n}
  const sm=new Float32Array(h),k=Math.max(1,Math.round(H/12));for(let y=0;y<h;y++){let s=0,c=0;for(let j=-k;j<=k;j++){const yy=y+j;if(yy>=0&&yy<h){s+=prof[yy];c++}}sm[y]=s/c}
  const sorted=Array.from(sm).filter(v=>v>0).sort((a,b)=>a-b),p90=sorted.length?sorted[Math.floor(sorted.length*0.9)]:0,thr=Math.max(2,p90*0.07);
  let rows=[],y=0;while(y<h){if(sm[y]>thr){const y0=y;while(y<h&&sm[y]>thr)y++;rows.push([y0,y-1])}else y++}
  const gap=Math.max(2,Math.round(H*0.14)),mg=[];for(const r of rows){const L=mg[mg.length-1];if(L&&r[0]-L[1]-1<=gap)L[1]=r[1];else mg.push(r.slice())}
  const out=[];for(const r of mg){if(r[1]-r[0]+1<Math.max(5,H*0.4))continue;let x0=w,x1=-1;for(let yy=r[0];yy<=r[1];yy++){const b=yy*w;for(let x=0;x<w;x++)if(dark(g[b+x])){if(x<x0)x0=x;break}for(let x=w-1;x>=0;x--)if(dark(g[b+x])){if(x>x1)x1=x;break}}
   if(x1<0)continue;out.push({y0:r[0],y1:r[1],x0,x1,multi:(r[1]-r[0]+1)>H*2.3})}
  return out};
 /* نسبة الحبر الداكن (g<140) الواقع داخل صناديق الكلمات المقروءة (موسّعة قليلاً). boxes: [{x0,y0,x1,y1}] */
 C.coverage=function(g,w,h,boxes){const m=new Uint8Array(w*h),e=6;for(const b of boxes){const x0=Math.max(0,Math.floor(b.x0)-e),x1=Math.min(w-1,Math.ceil(b.x1)+e),y0=Math.max(0,Math.floor(b.y0)-e),y1=Math.min(h-1,Math.ceil(b.y1)+e);for(let y=y0;y<=y1;y++)m.fill(1,y*w+x0,y*w+x1+1)}
  let t=0,c=0;for(let i=0;i<g.length;i++)if(g[i]<140){t++;if(m[i])c++}return t?c/t:1};
 /* ---------- خط المعالجة الكامل على RGBA ---------- */
 C.pipeline=function(d,w,h,opt){opt=opt||{};const t0=Date.now();let f=C.flatten(d,w,h,{color:opt.color!==false}),colorOff=false;
  /* مستند كل حبره تقريباً ملوّن (قلم أزرق، طباعة ملوّنة) أو صفحة ملوّنة: لا نمحو الألوان حتى لا يضيع النص. الأختام وحدها تبقى أقل من 60% من الحبر الداكن */
  if(f.colorShare>0.6||f.colorFrac>0.15){f=C.flatten(d,w,h,{color:false});colorOff=true}
  const edgePx=C.edges(f.g,w,h);
  const bin=C.sauvola(opt.blur===false?f.g:C.blur3(f.g,w,h),w,h,Math.max(25,Math.round(Math.min(w,h)/38))|1,0.25);
  if(f.colorPx>0&&!colorOff){const dm=C.dilate(f.cm,w,h,4);for(let i=0;i<bin.length;i++)if(dm[i])bin[i]=0}
  const info=C.clean(bin,w,h,{strength:opt.strength});info.colorOff=colorOff;info.edgePx=edgePx;
  info.colorFrac=f.colorFrac;let sk={a:0,conf:0};if(opt.deskew!==false)sk=C.skew(bin,w,h);
  info.skew=sk.a;info.skewConf=+sk.conf.toFixed(1);info.skewGain=sk.gain==null?0:+sk.gain.toFixed(2);
  let out=C.compose(f.g,bin,w,h,2),ow=w,oh=h,rot=null;
  /* لا نُدير إلا إن كان الميلان ثابتاً (ثقة كافية) وأكبر من 0.25° */
  if(Math.abs(sk.a)>=0.25&&sk.conf>=2.2&&sk.gain>1.04){rot=C.rotate(out,w,h,sk.a);out=rot.g;ow=rot.w;oh=rot.h;info.rotated=true}else info.rotated=false;
  info.ms=Date.now()-t0;return{g:out,w:ow,h:oh,rot,info,bin}};
 /* ---------- ما بعد OCR: حذف الكلمات القمامة ---------- */
 const AR=/[\u0600-\u06FF]/,LAT=/[A-Za-z]/,DIG=/[0-9\u0660-\u0669]/;
 /* words: [{t,c,…}] لسطر واحد. arPage: الصفحة عربية غالباً. يعيد الكلمات المحتفظ بها */
 C.cleanLine=function(words,arPage){const keep=[],drop=[];for(const w of words){const t=w.t,c=w.c==null?100:w.c,hasAr=AR.test(t),hasLat=LAT.test(t),hasDig=DIG.test(t),only=!/[\u0600-\u06FFA-Za-z0-9\u0660-\u0669]/.test(t);
   let bad=false;
   if(only&&t.length<=3&&c<80)bad=true;                             // رموز فقط: ~ * | — …
   else if(arPage&&!hasAr&&!hasDig&&hasLat&&t.length<=4&&c<80)bad=true; // لاتينية قصيرة في صفحة عربية (غالباً كلمة عربية أُسيئت قراءتها)
   else if(c<25&&t.length<=2)bad=true;
   else if(arPage&&!hasAr&&!hasDig&&hasLat&&c<35)bad=true;
   (bad?drop:keep).push(w)}
  return{keep,drop}};
 C.arabicShare=function(txt){const a=(txt.match(/[\u0600-\u06FF]/g)||[]).length,l=(txt.match(/[A-Za-z]/g)||[]).length;return a+l?a/(a+l):0};
 /* اختيار مقياس التكبير/التصغير من ارتفاع النص المقدَّر */
 C.pickScale=function(H){if(!H)return 1;if(H<26)return Math.min(2.5,38/H);if(H>72)return 52/H;return 1};
})();

/* ====================== القسم الثاني: الربط بالمتصفح (DOM) ====================== */
if(typeof document!='undefined')(function(){
 const wait=ms=>new Promise(r=>setTimeout(r,ms)),C=OP.core;
 const cv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
 const fromGray=(g,w,h)=>{const c=cv(w,h),x=c.getContext('2d'),im=x.createImageData(w,h),d=im.data;for(let i=0,p=0;i<w*h;i++,p+=4){d[p]=d[p+1]=d[p+2]=g[i];d[p+3]=255}x.putImageData(im,0,0);return c};
 const toBlob=c=>new Promise(r=>c.toBlob(r,'image/png'));
 const scaled=(src,s)=>{const c=cv(Math.round(src.width*s),Math.round(src.height*s)),x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);return c};
 /* يحضّر صفحة: يعيد {canvas, info, scale, toOrig(x,y)} حيث toOrig يحوّل نقطة من صورة المحرك إلى لوحة الصفحة الأصلية */
 OP.prepare=async function(src,opt){opt=opt||{};const stage=opt.stage||(()=>{});let cur=src,sc=1,res=null;
  for(let pass=0;pass<2;pass++){stage('تحضير الصورة…');await wait(15);
   const x=cur.getContext('2d'),id=x.getImageData(0,0,cur.width,cur.height);
   res=C.pipeline(id.data,cur.width,cur.height,{strength:opt.strength||OP.strength,color:opt.color});
   if(pass==0){const k=C.pickScale(res.info.H),mx=Math.max(src.width,src.height)*k;
    if(Math.abs(k-1)>0.15&&mx<=4200&&mx>=900){sc=k;cur=scaled(src,k);continue}}
   break}
  const rot=res.rot,canvas=fromGray(res.g,res.w,res.h);
  const toOrig=(x,y)=>{if(rot){const p=C.unrotate(rot,x,y);x=p[0];y=p[1]}return[x/sc,y/sc]};
  res.info.scale=+sc.toFixed(2);res.info.src=[src.width,src.height];res.info.out=[res.w,res.h];
  return{canvas,g:res.g,w:res.w,h:res.h,info:res.info,scale:sc,toOrig}};
 /* معاينة مصغّرة (JPEG) لآخر صورة حُضّرت */
 OP.preview=function(){const c=OP.last.canvas;if(!c)return null;const k=Math.min(1,1000/Math.max(c.width,c.height)),o=cv(Math.round(c.width*k),Math.round(c.height*k)),x=o.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(c,0,0,o.width,o.height);try{return o.toDataURL('image/jpeg',0.72)}catch(e){return null}};
 /* ---------- قراءة نتيجة Tesseract إلى أسطر وكلمات ---------- */
 const MARKS=/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
 function linesOf(d){const out=[];for(const b of d.blocks||[])for(const p of b.paragraphs||[]){let first=true;for(const l of p.lines||[]){const ws=(l.words||[]).filter(x=>x.text&&x.text.replace(MARKS,'').trim()).map(x=>({t:x.text.replace(MARKS,'').trim(),c:x.confidence==null?100:x.confidence,b:x.bbox}));if(ws.length)out.push({ws,para:first});first=false}}return out}
 /* تنظيف الأسطر: حذف الكلمات القمامة ثم الأسطر التي لم يبقَ فيها ما يوثق به. يعيد {lines:[{ws,para}], dropped:[نص]} */
 function tidy(lines,arPage){const keep=[],dropped=[];
  for(const L of lines){const r=C.cleanLine(L.ws,arPage);const kept=r.keep,txt=kept.map(w=>w.t).join(' ');
   if(r.drop.length)dropped.push(r.drop.map(w=>w.t).join(' '));
   if(!kept.length)continue;
   const avg=kept.reduce((a,w)=>a+w.c,0)/kept.length,sh=C.arabicShare(txt);
   /* سطر قليل الثقة كله (خط يدوي/ختم): يُستبعد ويُعرض في قائمة المستبعد */
   const best=Math.max(...kept.map(w=>w.c));
   if(((avg<42&&kept.length<=5)||avg<28)&&best<60){dropped.push(txt);continue}
   keep.push({ws:kept,para:L.para,avg})}
  return{lines:keep,dropped:dropped.filter(x=>x.trim())}}
 const joinText=lines=>{let o='';lines.forEach((L,i)=>{if(i&&L.para)o+='\n';o+=(i?'\n':'')+L.ws.map(w=>w.t).join(' ')});return o.trim()};
 /* ---------- التعرف على صفحة ---------- */
 /* لا نضبط preserve_interword_spaces (قيمة 1 تلصق الكلمات العربية ببعضها — قيس ذلك). نضبط الدقة 300 لتجنّب تقدير Tesseract لها وتحذيره */
 OP.setPsm=async(w,psm)=>{await w.setParameters({tessedit_pageseg_mode:String(psm),user_defined_dpi:'300'})};
 /* w: عامل Tesseract، src: لوحة الصفحة (ocrCanvas). opt: {mode:'block'|'lines', fixRtl, stage(msg)}. يعيد نفس شكل it._ocr مع prep */
 OP.recognize=async function(w,src,opt){opt=opt||{};const stage=opt.stage||(()=>{}),mode=opt.mode||OP.mode||'block';
  const pr=await OP.prepare(src,{strength:opt.strength,stage});OP.last.canvas=pr.canvas;OP.last.info=pr.info;
  const fx=opt.fixRtl||(t=>t);let lines=[],conf=0,raw=0,fell=false;
  const runLines=async()=>{const out=[],H=pr.info.H,bands=C.bands(pr.g,pr.w,pr.h,H),pad=Math.round(H*0.45);let k=0,gapPrev=null;
   for(const b of bands){k++;stage('السطر '+k+' من '+bands.length);await wait(0);
    const y0=Math.max(0,b.y0-pad),y1=Math.min(pr.h-1,b.y1+pad),x0=Math.max(0,b.x0-pad),x1=Math.min(pr.w-1,b.x1+pad),cw=x1-x0+1,ch=y1-y0+1,c=cv(cw,ch),x=c.getContext('2d');
    x.fillStyle='#fff';x.fillRect(0,0,cw,ch);x.drawImage(pr.canvas,x0,y0,cw,ch,0,0,cw,ch);
    const blob=await toBlob(c);let r=null,ls=[];
    /* سطر واحد (7)، فإن لم يُقرأ شيء (أعمدة متباعدة في جدول مثلاً) نجرّب كتلة (6) ثم نصاً متفرقاً (11) */
    for(const ps of(b.multi?[6,11]:[7,6,11])){await OP.setPsm(w,ps);r=await w.recognize(blob,{},{text:true,blocks:true});ls=linesOf(r.data);if(ls.length)break}
    raw+=(r.data.text||'').length;const newPara=gapPrev!=null&&(b.y0-gapPrev)>H*1.9;
    ls.forEach((L,i)=>{L.ws.forEach(ww=>{ww.b={x0:ww.b.x0+x0,x1:ww.b.x1+x0,y0:ww.b.y0+y0,y1:ww.b.y1+y0}});L.para=(i==0?newPara:false);out.push(L)});gapPrev=b.y1}
   return out};
  if(mode=='lines')lines=await runLines();
  else{await OP.setPsm(w,3);stage('التعرف على النص…');const r=await w.recognize(await toBlob(pr.canvas),{},{text:true,blocks:true});raw=(r.data.text||'').length;lines=linesOf(r.data);
   /* حارس التغطية: إن بقي حبر كثير خارج كل الكلمات المقروءة (جدول/أعمدة أسقطها تحليل التخطيط) نعيد القراءة سطراً سطراً */
   const cov=C.coverage(pr.g,pr.w,pr.h,lines.map(L=>L.ws.map(x=>x.b)).flat());pr.info.coverage=+cov.toFixed(3);
   if(cov<0.88){stage('إعادة القراءة سطراً سطراً (جزء من الصفحة لم يُقرأ)…');const l2=await runLines();if(l2.length){lines=l2;fell=true}}}
  const all=lines.map(L=>L.ws.map(x=>x.t).join(' ')).join(' ');const ar=C.arabicShare(all)>0.5;
  const t=tidy(lines,ar);lines=t.lines;
  const words=[];lines.forEach(L=>L.ws.forEach((x,i)=>{const o0=pr.toOrig(x.b.x0,x.b.y0),o1=pr.toOrig(x.b.x1,x.b.y0),o2=pr.toOrig(x.b.x0,x.b.y1),o3=pr.toOrig(x.b.x1,x.b.y1),xs=[o0[0],o1[0],o2[0],o3[0]],ys=[o0[1],o1[1],o2[1],o3[1]];
   words.push({t:fx(x.t),x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys),e:i==L.ws.length-1})}));
  let n=0,s=0;lines.forEach(L=>L.ws.forEach(x=>{n++;s+=x.c}));conf=n?Math.round(s/n):0;
  const info=Object.assign({},pr.info,{mode:fell?'lines (تلقائي)':mode,droppedN:t.dropped.length});
  return{text:joinText(lines),words,conf,dropped:t.dropped,info}};
})();
if(typeof module!='undefined'&&module.exports)module.exports=OP;
