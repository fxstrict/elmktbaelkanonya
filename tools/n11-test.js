#!/usr/bin/env node
/* اختبار N11 (تحضير الصورة قبل OCR) على النواة النقية js/ocrprep.js في Node.
   الجزء أ: صفحات مولَّدة برمجياً (أشرطة تشبه كلمات) فيها ختم أزرق وختم أسود وإطار وخط جدول وحافة ماسح وغبار وميل — لقياس ما يُحذف وما يبقى بدقة.
   الجزء ب: صور tools/n11-fixtures.py إن وُجدت (python3 tools/n11-fixtures.py /tmp/n11fx) — صفحة عربية «سيئة» صناعية.
   الاستعمال: node tools/n11-test.js [/tmp/n11fx] */
const fs=require('fs'),OP=require('../js/ocrprep.js'),C=OP.core,FX=process.argv[2]||'/tmp/n11fx';
let P=0,F=0;const T=(n,ok,info)=>{ok?P++:F++;console.log((ok?'✓ ':'✗ ')+n+(info!==undefined?'  '+info:''))};
/* ---------- مولّد صفحات ---------- */
let seed=7;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
function mk(w,h,bg){const d=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){d[i*4]=bg[0];d[i*4+1]=bg[1];d[i*4+2]=bg[2];d[i*4+3]=255}return{d,w,h}}
const px=(im,x,y,c)=>{if(x<0||y<0||x>=im.w||y>=im.h)return;const p=(y*im.w+x)*4;im.d[p]=c[0];im.d[p+1]=c[1];im.d[p+2]=c[2]};
const rect=(im,x0,y0,x1,y1,c)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)px(im,x,y,c)};
const ring=(im,cx,cy,r,t,c)=>{for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){const d=Math.hypot(x-cx,y-cy);if(d<=r&&d>=r-t)px(im,x,y,c)}};
/* نص: lines أسطر، كل سطر عدة «كلمات» أشرطة سماكتها 4 وارتفاع جسم 26 مع نقطة 6×6 فوق بعضها (كنقاط الحروف) */
function text(im,x0,y0,lines,words,ink,pitch){const boxes=[];for(let l=0;l<lines;l++){let x=x0;const y=y0+l*pitch;for(let k=0;k<words;k++){const ww=50+((rnd()*110)|0);
   rect(im,x,y+22,x+ww,y+26,ink);for(let s=0;s<ww;s+=18)rect(im,x+s,y,x+s+4,y+26,ink);if(k%2==0)rect(im,x+10,y-12,x+15,y-7,ink);boxes.push([x,y-12,x+ww,y+26]);x+=ww+22}}return boxes}
const inkCount=(bin,x0,y0,x1,y1,w)=>{let n=0;for(let y=Math.max(0,y0);y<=y1;y++)for(let x=Math.max(0,x0);x<=x1;x++)if(bin[y*w+x])n++;return n};
const total=b=>{let n=0;for(let i=0;i<b.length;i++)n+=b[i];return n};
const prep=(im,o)=>{const f=C.flatten(im.d,im.w,im.h,o),bin=C.sauvola(f.g,im.w,im.h,Math.max(25,Math.round(Math.min(im.w,im.h)/38))|1,0.25);if(f.colorPx&&!(o&&o.color===false)){const dm=C.dilate(f.cm,im.w,im.h,3);for(let i=0;i<bin.length;i++)if(dm[i])bin[i]=0}return{f,bin}};
const W=1500,Hh=1800,BLK=[20,20,20],BLUE=[30,60,190];
console.log('— الجزء أ: صفحات مولَّدة —');
/* 1) صفحة نظيفة: لا يُحذف منها شيء تقريباً */
{const im=mk(W,Hh,[255,255,255]);text(im,200,150,16,6,BLK,90);const{bin}=prep(im),b0=total(bin),info=C.clean(bin,W,Hh,{}),b1=total(bin);
 T('صفحة نظيفة: يبقى ≥ 99.5% من الحبر ولا كتل/إطارات/حلقات',b1/b0>=0.995&&info.blobs==0&&info.frames==0&&info.rings==0&&info.inner==0,`${(b1/b0*100).toFixed(2)}% H=${info.H}`);
 T('تقدير ارتفاع النص معقول (20–60)',info.H>=20&&info.H<=60,info.H)}
/* 2) ختم أزرق (حلقة + نص أزرق داخله) فوق خلفية رمادية متدرجة: يُمحى كله والنص الأسود يبقى */
{const im=mk(W,Hh,[255,255,255]);for(let y=0;y<Hh;y++)for(let x=0;x<W;x++){const v=225-30*x/W;px(im,x,y,[v,v,v-6])}
 const tb=text(im,200,150,10,6,BLK,90);const cx=420,cy=1400,r=150;ring(im,cx,cy,r,10,BLUE);ring(im,cx,cy,r-26,4,BLUE);text(im,cx-90,cy-40,3,2,BLUE,40);
 const{bin,f}=prep(im);const textInk0=(()=>{let n=0;for(const b of tb)n+=inkCount(bin,b[0],b[1],b[2],b[3],W);return n})();C.clean(bin,W,Hh,{});
 const inStamp=inkCount(bin,cx-r-5,cy-r-5,cx+r+5,cy+r+5,W),textInk1=(()=>{let n=0;for(const b of tb)n+=inkCount(bin,b[0],b[1],b[2],b[3],W);return n})();
 T('ختم أزرق (حلقتان + نص) على خلفية متدرّجة: يُمحى (≤ 0.5% من حبره)',inStamp<=60,`بقي ${inStamp} بكسل`);T('…والنص الأسود يبقى ≥ 98%',textInk1/textInk0>=0.98,`${(textInk1/textInk0*100).toFixed(1)}%`);
 T('نسبة الحبر الملوّن مرصودة',f.colorPx>3000&&f.colorShare<0.6,`ملوّن=${f.colorPx} حصة=${f.colorShare.toFixed(2)}`)}
/* 3) ختم أسود (بلا ألوان): تُحذف حلقته وما بداخله */
{const im=mk(W,Hh,[250,250,250]);const tb=text(im,200,150,10,6,BLK,90);const cx=1000,cy=1350,r=130;ring(im,cx,cy,r,9,BLK);ring(im,cx,cy,r-24,4,BLK);text(im,cx-70,cy-30,2,2,BLK,40);
 const{bin}=prep(im),i0=inkCount(bin,cx-r-5,cy-r-5,cx+r+5,cy+r+5,W);const info=C.clean(bin,W,Hh,{}),i1=inkCount(bin,cx-r-5,cy-r-5,cx+r+5,cy+r+5,W);
 T('ختم أسود: حُذف مع نصه الداخلي',i0>2000&&i1<=40&&info.rings>=1&&info.inner>=1,`قبل ${i0} بعد ${i1} حلقات ${info.rings} داخلي ${info.inner}`);
 let n=0;for(const b of tb)n+=inkCount(bin,b[0],b[1],b[2],b[3],W);T('…والنص حول الختم سليم',n>0)}
/* 4) توقيع: خربشة متصلة كبيرة */
{const im=mk(W,Hh,[255,255,255]);const tb=text(im,200,150,8,6,BLK,90);let sx=900,sy=1000;const pts=[];for(let i=0;i<60;i++){sx+=10*(Math.sin(i*1.7)+0.5);sy+=22*Math.cos(i*2.3)+3;pts.push([sx,sy])}
 for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let k=0;k<=n;k++){const x=Math.round(a[0]+(b[0]-a[0])*k/n),y=Math.round(a[1]+(b[1]-a[1])*k/n);rect(im,x,y,x+3,y+3,[15,15,15])}}
 const{bin}=prep(im),s0=inkCount(bin,850,900,1500,1500,W),info=C.clean(bin,W,Hh,{}),s1=inkCount(bin,850,900,1500,1500,W);
 T('توقيع كبير متصل: يُحذف',s0>1500&&s1<=0.05*s0,`قبل ${s0} بعد ${s1} كتل ${info.blobs}`)}
/* 5) إطار وخط جدول وحافة ماسح */
{const im=mk(W,Hh,[255,255,255]);const tb=text(im,200,150,14,6,BLK,90);rect(im,40,40,W-40,45,BLK);rect(im,40,Hh-46,W-40,Hh-41,BLK);rect(im,40,40,45,Hh-40,BLK);rect(im,W-46,40,W-41,Hh-40,BLK);rect(im,100,900,W-100,903,BLK);rect(im,0,0,22,Hh,[30,30,30]);
 const{bin}=prep(im),t0=total(bin);let n0=0;for(const b of tb)n0+=inkCount(bin,b[0],b[1],b[2],b[3],W);const info=C.clean(bin,W,Hh,{});let n1=0;for(const b of tb)n1+=inkCount(bin,b[0],b[1],b[2],b[3],W);
 const edge=inkCount(bin,0,0,60,Hh,W),frame=inkCount(bin,30,30,W-30,60,W)+inkCount(bin,30,Hh-60,W-30,Hh-30,W);
 T('إطار الصفحة وخط الجدول وحافة الماسح: تُحذف',edge<=60&&frame<=200,`حافة ${edge} إطار ${frame}`);
 T('…والنص يبقى ≥ 98% (الخط يقطع سطراً واحداً جزئياً)',n1/n0>=0.98,`${(n1/n0*100).toFixed(1)}%`)}
/* 6) غبار معزول مقابل نقاط قرب الحروف */
{const im=mk(W,Hh,[255,255,255]);const tb=text(im,200,200,10,6,BLK,90);const dust=[];for(let i=0;i<150;i++){const x=(rnd()*(W-40)+20)|0,y=(rnd()*(Hh-40)+20)|0;if(y>150&&y<1150&&x>150&&x<1150)continue;dust.push([x,y]);rect(im,x,y,x+2,y+2,[60,60,60])}
 const{bin}=prep(im);let before=0;for(const[x,y]of dust)before+=inkCount(bin,x,y,x+2,y+2,W)>0?1:0;C.clean(bin,W,Hh,{});let after=0;for(const[x,y]of dust)after+=inkCount(bin,x,y,x+2,y+2,W)>0?1:0;
 T('غبار معزول: يُحذف ≥ 95%',before>=80&&after<=0.05*before,`${before} → ${after}`);
 let dots=0,dk=0;for(const b of tb){dots++;dk+=inkCount(bin,b[0]+10,b[1],b[0]+15,b[1]+6,W)>0?1:0}T('نقاط الحروف قرب الكلمات تبقى ≥ 90%',dk>=0.9*(dots/2),`${dk}/${dots/2}`)}
/* 7) ميل: توليد صفحة ثم تدويرها وتقدير الزاوية وتصحيحها */
{const base=mk(W,Hh,[255,255,255]);text(base,200,150,16,6,BLK,90);const g=new Uint8Array(W*Hh);for(let i=0;i<W*Hh;i++)g[i]=base.d[i*4];
 let worst=0,okc=0;const angs=[-6,-3.2,-1.1,0.7,2.4,5.5];
 for(const a of angs){const r=C.rotate(g,W,Hh,a),bin=new Uint8Array(r.w*r.h);for(let i=0;i<bin.length;i++)bin[i]=r.g[i]<128?1:0;const s=C.skew(bin,r.w,r.h),e=Math.abs(s.a+a);worst=Math.max(worst,e);if(e<=0.3)okc++}
 T(`تقدير الميلان ضمن 0.3° في ${okc}/${angs.length} زاوية (أسوأ ${worst.toFixed(2)}°)`,okc==angs.length);
 const r=C.rotate(g,W,Hh,3),bin=new Uint8Array(r.w*r.h);for(let i=0;i<bin.length;i++)bin[i]=r.g[i]<128?1:0;const s=C.skew(bin,r.w,r.h),r2=C.rotate(r.g,r.w,r.h,s.a),b2=C.bands(r2.g,r2.w,r2.h,30);
 T('بعد التصحيح: 16 سطراً بالضبط وبلا أشرطة مدمجة',b2.length==16&&b2.every(b=>!b.multi),b2.length+' شريطاً');
 const f0=C.skew(new Uint8Array(W*Hh).map((_,i)=>base.d[i*4]<128?1:0),W,Hh);T('صفحة مستقيمة: الزاوية ≈ 0',Math.abs(f0.a)<=0.3,f0.a);
 /* التدوير العكسي للإحداثيات */
 const rr=C.rotate(g,W,Hh,-4.3);let me=0;for(const[x,y]of[[100,100],[1400,300],[700,1700],[10,1790]]){const a=-4.3*Math.PI/180,dx=x-rr.cx,dy=y-rr.cy,nx=dx*Math.cos(a)-dy*Math.sin(a)+rr.ncx,ny=dx*Math.sin(a)+dy*Math.cos(a)+rr.ncy,u=C.unrotate(rr,nx,ny);me=Math.max(me,Math.hypot(u[0]-x,u[1]-y))}
 T('unrotate يعيد النقطة إلى مكانها (خطأ < 0.01 بكسل)',me<0.01,me.toFixed(5))}
/* 8) مستند بحبر ملوّن كله (قلم أزرق): لا يُمحى */
{const im=mk(W,Hh,[255,255,255]);text(im,200,150,12,6,BLUE,90);const r=C.pipeline(im.d,W,Hh,{}),i1=r.g.reduce((a,v)=>a+(v<140?1:0),0);
 T('مستند أزرق كله: الألوان لا تُمحى (colorOff) والنص يبقى',r.info.colorOff===true&&i1>8000,`colorOff=${r.info.colorOff} ink=${i1}`)}
/* 9) pickScale وcleanLine */
T('تقدير المقياس: صغير يُكبَّر، كبير يُصغَّر، عادي يبقى',C.pickScale(15)>2&&C.pickScale(15)<=2.5&&C.pickScale(40)==1&&C.pickScale(100)<0.6&&C.pickScale(0)==1);
{const L=[['بالاستئناف',90],['em',22],['~',40],['Sy',30],['pad',70],['العالي',88],['AVAVAVAVAN',20],['2026',70],['of',50]].map(([t,c])=>({t,c})),r=C.cleanLine(L,true);
 T('cleanLine (صفحة عربية): تُحذف الرموز واللاتينية القصيرة المنخفضة وتبقى العربية والأرقام',r.keep.map(w=>w.t).join('|')=='بالاستئناف|العالي|2026'&&r.drop.length==6,r.keep.map(w=>w.t).join('|'));
 const r2=C.cleanLine([{t:'Case',c:90},{t:'123',c:88},{t:'of',c:85}],false);T('cleanLine (صفحة إنجليزية): لا يُحذف نص سليم',r2.keep.length==3)}
/* ---------- الجزء ب: الصور الصناعية ---------- */
if(fs.existsSync(FX+'/gt.json')){console.log('— الجزء ب: صور عربية صناعية سيئة —');const GT=JSON.parse(fs.readFileSync(FX+'/gt.json','utf8')),F=F2=>F2;
 for(const n of Object.keys(GT)){const g=GT[n],d=new Uint8ClampedArray(fs.readFileSync(`${FX}/${n}.rgba`)),t0=Date.now(),r=C.pipeline(d,g.w,g.h,{}),ms=Date.now()-t0;
  const err=Math.abs(r.info.skew+g.tilt);T(`${n}: ميل ${g.tilt}° ← قُدِّر ${-r.info.skew}° (خطأ ${err.toFixed(2)}°) ${ms}ms`,err<=0.35||Math.abs(g.tilt)<0.3&&Math.abs(r.info.skew)<=0.3);
  const bands=C.bands(r.g,r.w,r.h,r.info.H),exp=g.lines.length;T(`${n}: أشرطة الأسطر ≥ ${exp} ولا مدمجة`,bands.length>=exp&&bands.length<=exp+4&&bands.every(b=>!b.multi),bands.length);
  /* ما بقي في الجزء السفلي (الأختام) يجب أن يكون شبه فارغ */
  if(g.blue||g.black){const y0=Math.round(r.h*0.55);let dark=0;for(let y=y0;y<r.h-5;y++)for(let x=70;x<r.w-5;x++)if(r.g[y*r.w+x]<120)dark++;T(`${n}: منطقة الأختام السفلى بعد التحضير شبه فارغة (≤ 600 بكسل داكن)`,dark<=600,dark)}}}
else console.log('(لا صور صناعية في '+FX+' — تخطّيت الجزء ب)');
console.log(`\n${P} نجح، ${F} فشل`);process.exit(F?1:0);
