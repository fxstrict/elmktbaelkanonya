/* الحسام سكان — N9a (1.18.0): تشغيل تحسينات الصورة الثقيلة (EN.core) في Web Worker كي لا تتجمّد الواجهة (0.2–3 ثوانٍ على الحاسوب ولعلها أضعاف ذلك على الهاتف).
   لا يُغيَّر عقد docprep المتزامن (dpRender/dpFilter): نحسب النتيجة مسبقاً في العامل ثم نضعها في ذاكرة EN.rc نفسها التي يقرؤها dpRender، فيجدها جاهزة.
   أي فشل (لا عامل، لا ذاكرة، خطأ) يعود بصمت إلى المسار المتزامن القديم نفسه. إضافة فقط. */
const FX={ready:false,dead:'',w:null,q:new Map(),n:0,init:null,stat:{ok:0,fb:0},tc:new Map()};
(function(){
 const ver=()=>(typeof APP!='undefined'&&APP.version)||'';
 const call=(m,tr)=>new Promise((res,rej)=>{if(!FX.w)return rej(new Error('no worker'));const id=++FX.n;FX.q.set(id,{res,rej});try{FX.w.postMessage(Object.assign({id},m),tr||[])}catch(x){FX.q.delete(id);rej(x)}});
 function kill(why){FX.dead=why||'down';FX.ready=false;try{FX.w&&FX.w.terminate()}catch(e){}FX.w=null;FX.q.forEach(p=>p.rej(new Error('worker down')));FX.q.clear()}
 FX.kill=kill;
 FX.start=()=>{if(FX.init)return FX.init;
  FX.init=new Promise(res=>{try{if(typeof Worker=='undefined')throw new Error('no Worker');const w=FX.w=new Worker('js/fxworker.js?v='+ver());
   w.onmessage=e=>{const m=e.data,p=FX.q.get(m.id);if(!p)return;FX.q.delete(m.id);m.err?p.rej(new Error(m.err)):p.res(m)};
   w.onerror=e=>kill(String(e&&e.message||'worker error'));
   call({cmd:'init',url:new URL('js/enhance.js?v='+ver(),location.href).href}).then(()=>{FX.ready=true;res(true)},x=>{kill(x.message);res(false)})}catch(x){kill(x.message);res(false)}});
  return FX.init};
 const isEn=f=>typeof EN!='undefined'&&EN.core.hasOwnProperty(String(f).split(':')[0]);
 /* فلتر واحد على لوحة: ننقل مخزن البكسلات (بلا نسخ) ونعيده */
 FX.filter=async(cv,f)=>{const x=cv.getContext('2d'),id=x.getImageData(0,0,cv.width,cv.height),r=await call({cmd:'run',f,w:cv.width,h:cv.height,buf:id.data.buffer},[id.data.buffer]);x.putImageData(new ImageData(new Uint8ClampedArray(r.buf),cv.width,cv.height),0,0)};
 /* نسخة غير متزامنة من حلقة dpRender (الخطوات الهندسية كما هي، والتحسينات في العامل). يحرسها اختبار التطابق البكسلي في tools/n9-e2e.py */
 FX.render=async(it,ops)=>{let c=dpCv(it.orig.width,it.orig.height);c.getContext('2d').drawImage(it.orig,0,0);
  for(const o of ops){if(o.t=='rot'){const sw=o.d%180!=0,n=dpCv(sw?c.height:c.width,sw?c.width:c.height),x=n.getContext('2d');x.translate(n.width/2,n.height/2);x.rotate(o.d*Math.PI/180);x.drawImage(c,-c.width/2,-c.height/2);c=n}
   else if(o.t=='crop'){const n=dpCv(o.w,o.h);n.getContext('2d').drawImage(c,o.x,o.y,o.w,o.h,0,0,n.width,n.height);c=n}
   else if(o.t=='quad')c=scWarp(c,o);
   else if(o.t=='mask'){const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(o.x,o.y,o.w,o.h)}
   else if(o.t=='filter'){if(isEn(o.f))await FX.filter(c,o.f);else dpFilter(c,o.f)}}
  return c};
 const tkey=(it,ops)=>it.id+'|'+it.orig.width+'x'+it.orig.height+'|'+JSON.stringify(ops);
 /* يحسب نتيجة (العمليات الحالية + op) في العامل ويضعها في EN.rc؛ يُرجع اللوحة أو false للعودة إلى المسار المتزامن */
 FX.warm=async(it,op)=>{try{if(FX.dead||!isEn(op.f)||!(await FX.start()))return false;
   const ops=[...it.ops,op],key=tkey(it,ops),c=await FX.render(it,ops);
   EN.rc=(EN.rc||[]).filter(x=>x.id!=it.id);EN.rc.push({key,id:it.id,cv:c});if(EN.rc.length>2)EN.rc.shift();
   try{FX.tc.set(key,dpScale(c,160/Math.max(c.width,c.height)).toDataURL('image/jpeg',0.7))}catch(e){}
   FX.stat.ok++;return c}catch(e){FX.stat.fb++;return false}};
 /* مصغّرات: ذاكرة بمفتاح (الصورة+العمليات) فلا تُعاد المعالجة الثقيلة كلما أعاد dpWork الرسم أو صفّر it.th */
 if(typeof dpThumb=='function'){const _t=dpThumb;window.dpThumb=dpThumb=function(it){if(!it||!it.ops||!it.ops.some(o=>o.t=='filter'))return _t(it);
  const k=tkey(it,it.ops);let v=FX.tc.get(k);if(!v){v=_t(it);FX.tc.set(k,v);if(FX.tc.size>60)FX.tc.delete(FX.tc.keys().next().value)}return v}}
})();
