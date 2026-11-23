#!/usr/bin/env node
/* اختبار خوارزميات N3 (الحواف، الميلان، الاتجاه، الكتاب، تخطيط الصور) على صور tools/n3-fixtures.py.
   الاستعمال: python3 tools/n3-fixtures.py /tmp/n3 && node tools/n3-test.js /tmp/n3 [--v] */
const fs=require('fs'),AS=require('../js/autoscan.js'),C=AS.core,dir=process.argv[2]||'/tmp/n3',V=process.argv.includes('--v'),GT=JSON.parse(fs.readFileSync(dir+'/gt.json','utf8'));
const load=n=>{const g=GT[n];return{d:new Uint8ClampedArray(fs.readFileSync(`${dir}/${n}.rgba`)),w:g.w,h:g.h,g}};
let F=0,P=0;const T=(name,ok,info)=>{ok?P++:F++;if(!ok||V)console.log((ok?'✓ ':'✗ ')+name+(info?'  '+info:''))};
const names=Object.keys(GT);
/* --- 1) اكتشاف الحواف: IoU بين الرباعي المكتشف ورباعي الحقيقة مقصوصاً بحدود الصورة (تُقاس على شبكة) --- */
console.log('— اكتشاف الحواف —');
const inPoly=(P,x,y)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!=(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
const iou=(A,B,w,h)=>{let i=0,u=0;for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4){const a=inPoly(A,x+2,y+2),b=inPoly(B,x+2,y+2);if(a&&b)i++;if(a||b)u++}return u?i/u:0};
const GTv=n=>{const g=GT[n];return C.order(g.quad)};
for(const n of names.filter(x=>GT[x].kind=='scene')){const{d,w,h,g}=load(n);const t0=Date.now(),r=C.detect(d,w,h),ms=Date.now()-t0,diag=Math.hypot(w,h);
 g._r=r;g._iou=r.pts?iou(r.pts,GTv(n),w,h):0;
 console.log(`  ${n.padEnd(28)} ثقة=${r.conf.toFixed(2)} ${(r.kind||'-').padEnd(6)} ${r.pts?'IoU='+g._iou.toFixed(3):'(لا رباعي)'} ${ms}ms`)}
for(const n of ['sc01_en_dark','sc02_ar_wood','sc07_ar_dark_shadow','sc08_yellow_paper','sc10_en_green_desk','sc09_card_on_wood','sc03_ar_gray_lowcontrast','sc04_en_white_verylow','sc05_cutoff'])T('اكتشاف صحيح (IoU≥0.97، ثقة≥0.72): '+n,GT[n]._r.pts&&GT[n]._iou>=0.97&&GT[n]._r.conf>=C.OK,`IoU=${GT[n]._iou.toFixed(3)} conf=${GT[n]._r.conf.toFixed(2)}`);
{const r=GT['sc06_fills_frame']._r;T('ورقة تملأ الإطار: لا اكتشاف واثق خاطئ',!r.pts||r.conf<C.OK||GT['sc06_fills_frame']._iou>=0.97,`conf=${r.conf.toFixed(2)}`)}
/* --- 2) الميلان --- */
console.log('— الميلان —');let sk=0,skn=0,worst=0;
for(const n of names.filter(x=>GT[x].kind=='skew')){const{d,w,h,g}=load(n),t0=Date.now(),r=C.skew(d,w,h),e=Math.abs(r.a+g.skew_deg);skn++;if(e<=0.5)sk++;worst=Math.max(worst,e);if(V||e>0.5)console.log(`  ${n.padEnd(14)} متوقع ${(-g.skew_deg).toFixed(1)} وجد ${r.a.toFixed(2)} conf=${r.conf.toFixed(2)} ${Date.now()-t0}ms`)}
T(`الميلان ضمن 0.5° في ${sk}/${skn} (أسوأ خطأ ${worst.toFixed(2)}°)`,sk==skn);
/* صفحة مستقيمة لا تُدار */
{const{d,w,h}=load('skew_en_0'),r=C.skew(d,w,h);T('صفحة مستقيمة: |a|<0.4',Math.abs(r.a)<0.4,'a='+r.a.toFixed(2))}
/* --- 3) الاتجاه + الميلان معاً (fixup) --- */
console.log('— الاتجاه —');const stat={};let axisOk=0,axisN=0;
for(const n of names.filter(x=>/^ori2?$/.test(GT[x].kind))){const{d,w,h,g}=load(n),r=C.fixup(d,w,h),ok=r.rot==g.rot,axis=(r.rot%180)==(g.rot%180),key=g.kind+'/'+(g.tag||'basic')+'/'+g.lang;
 const s=stat[key]=stat[key]||{n:0,right:0,wrong:0,unk:0};s.n++;axisN++;if(axis)axisOk++;
 if(!r.flip.known){s.unk++}else if(ok)s.right++;else s.wrong++;
 if(V&&!ok)console.log(`  ${n} متوقع ${g.rot} وجد ${r.rot} (${r.flip.known?r.flip.src:'مجهول'}) para=${r.flip.para.s.toFixed(2)}/${r.flip.para.n} base=${r.flip.base.toFixed(2)}`)}
for(const[k,v]of Object.entries(stat))console.log(`  ${k.padEnd(22)} من ${v.n}: صحيح ${v.right} · خاطئ ${v.wrong} · غير متأكد ${v.unk}`);
T(`محور الأسطر (أفقي/عمودي) صحيح ${axisOk}/${axisN}`,axisOk==axisN);
const all=Object.values(stat).reduce((a,v)=>({n:a.n+v.n,right:a.right+v.right,wrong:a.wrong+v.wrong,unk:a.unk+v.unk}),{n:0,right:0,wrong:0,unk:0});
console.log(`  المجموع: ${all.n} صورة → صحيح ${all.right} · خاطئ ${all.wrong} · غير متأكد ${all.unk}`);
T('لا قرار خاطئ واثق في الجهة (0/180) إلا نادراً (≤3%)',all.wrong/all.n<=0.03,`خاطئ=${all.wrong}`);
/* أخطاء ميلان الصفحات الأفقية بعد fixup */
{let e=0,c=0;for(const n of names.filter(x=>GT[x].kind=='skew')){const{d,w,h,g}=load(n),r=C.fixup(d,w,h);c++;if(r.rot==0&&Math.abs(r.skew+g.skew_deg)<=0.5)e++}T(`fixup يعيد الميلان الصحيح ويبقي rot=0: ${e}/${c}`,e==c)}
/* --- 4) الكتاب --- */
console.log('— الكتاب —');for(const n of names.filter(x=>GT[x].kind=='book')){const{d,w,h,g}=load(n),r=C.gutter(d,w,h),e=Math.abs(r.x-g.gx)/w*100;T(`وسط الكتاب ${n}: خطأ ${e.toFixed(1)}% من العرض`,e<=2.5,`conf=${r.conf.toFixed(2)} x=${Math.round(r.x)} متوقع ${g.gx}`)}
/* --- 5) تخطيط الصور --- */
console.log('— الصور الشخصية —');for(const k of Object.keys(C.PH)){const[wc,hc]=C.PH[k],L=C.layout(wc,hc,0);let ov=false,out=false;L.pos.forEach(([x,y],i)=>{if(x<0||y<0||x+L.pw>C.sheet.w||y+L.ph>C.sheet.h)out=true;L.pos.forEach(([x2,y2],j)=>{if(j>i&&x<x2+L.pw&&x2<x+L.pw&&y<y2+L.ph&&y2<y+L.ph)ov=true})});
 const realW=L.pw/C.sheet.dpi*2.54;T(`تخطيط ${k}: ${L.n} صور (${L.cols}×${L.rows}) بلا تداخل/خروج، العرض الفعلي ${realW.toFixed(2)} سم`,!ov&&!out&&L.n>0&&Math.abs(realW-wc)<0.02)}
{const L=C.layout(4,6,6);T('طلب 6 نسخ من 4×6 يعطي 6',L.n==6)}
console.log(`\nنجح ${P} — فشل ${F}`);process.exit(F?1:0);
