#!/usr/bin/env node
/* اختبار N9a في Node: عامل التحسينات (js/fxworker.js) يقتطع EN.core من enhance.js وينتج بايتات مطابقة تماماً للتنفيذ المباشر لكل فلتر.
   الاستعمال: node tools/n9-test.js [--v] */
const fs=require('fs'),vm=require('vm'),path=require('path'),V=process.argv.includes('--v'),J=p=>path.join(__dirname,'..','js',p);
let P=0,F=0;const T=(n,ok,i)=>{ok?P++:F++;if(!ok||V)console.log((ok?'✓ ':'✗ ')+n+(i!==undefined?'  '+i:''))};
const enSrc=fs.readFileSync(J('enhance.js'),'utf8');
/* مرجع: EN.core من الملف كاملاً بلا ربط الواجهة */
const refCtx=vm.createContext({console,Math});vm.runInContext(enSrc.slice(0,enSrc.indexOf('\nEN.names=')),refCtx);const REF=vm.runInContext('EN',refCtx);
/* العامل: نحاكي self وfetch ونشغّل fxworker.js كما هو */
const out=[];const wctx=vm.createContext({console,Math,Uint8ClampedArray,Float32Array,Uint32Array,Int32Array,Uint8Array,Uint16Array,Function,
 fetch:async u=>({ok:true,status:200,text:async()=>enSrc}),setTimeout});wctx.self=wctx;wctx.postMessage=(m)=>out.push(m);
vm.runInContext(fs.readFileSync(J('fxworker.js'),'utf8'),wctx);
const send=async m=>{out.length=0;await wctx.onmessage({data:m});return out[0]};
(async()=>{
 T('علامة الاقتطاع «EN.names=» موجودة في enhance.js مرة واحدة',enSrc.split('\nEN.names=').length==2);
 T('نواة enhance.js لا تلمس DOM (لا document/window قبل العلامة)',!/\b(document|window|localStorage)\b/.test(enSrc.slice(0,enSrc.indexOf('\nEN.names='))));
 let r=await send({id:1,cmd:'run',f:'magic',w:2,h:2,buf:new ArrayBuffer(16)});T('run قبل init يُرفض برسالة خطأ',r&&r.err&&/not initialised/.test(r.err),JSON.stringify(r));
 r=await send({id:2,cmd:'init',url:'x'});T('init ينجح',r&&r.ok===1,JSON.stringify(r));
 r=await send({id:3,cmd:'run',f:'nope',w:2,h:2,buf:new ArrayBuffer(16)});T('فلتر مجهول يُرفض',r&&/unknown filter/.test(r.err||''),JSON.stringify(r));
 r=await send({id:4,cmd:'run',f:'constructor',w:2,h:2,buf:new ArrayBuffer(16)});T('اسم من سلسلة النموذج («constructor») لا يُنفَّذ',r&&/unknown filter/.test(r.err||''),JSON.stringify(r));
 r=await send({id:5,cmd:'ping'});T('ping',r&&r.ok===1);
 const w=900,h=1200,base=new Uint8ClampedArray(w*h*4);let sd=7;const rnd=()=>(sd=(sd*1103515245+12345)&0x7fffffff)/0x7fffffff;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4,ink=((x>>3)+(y>>4))%5==0,sh=Math.round(30*x/w),t=(ink?40:230-sh)+Math.round((rnd()-.5)*14);base[p]=t;base[p+1]=t-6+(y>h/2?30:0);base[p+2]=t-12;base[p+3]=255}
 const ops=['magic','adapt','shadow','bgclean','denoise:14','glare','inkoff','adj:10:20:30','erase:100:100:200:120','pdoc','pid','ppass','preceipt','pcontract','pminutes','pjudg'];
 for(const f of ops){const p=f.split(':'),a=new Uint8ClampedArray(base);REF.core[p[0]](a,w,h,p.slice(1).map(Number));
  const buf=base.slice().buffer;const res=await send({id:100,cmd:'run',f,w,h,buf});
  const b=res&&res.buf?new Uint8ClampedArray(res.buf):null;let same=!!b&&b.length==a.length;if(same)for(let i=0;i<a.length;i++)if(a[i]!==b[i]){same=false;break}
  T('مطابقة بايتية: '+f,same,res&&res.err)}
 console.log(`\nنجح ${P} وفشل ${F}`);process.exit(F?1:0)})();
