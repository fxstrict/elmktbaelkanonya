/* الحسام سكان — N9a (1.18.0): عامل (Web Worker) لتحسينات الصورة الثقيلة. لا نسخة ثانية من الخوارزميات: يجلب نص enhance.js
   ويقتطع منه نواة EN.core النقية فقط (ما قبل «EN.names=»)، فيبقى مصدر الحقيقة واحداً وتبقى النتيجة مطابقة بكسلاً بكسل لمسار الخيط الرئيسي. */
let EN=null;
self.onmessage=async e=>{const m=e.data;
 try{
  if(m.cmd=='init'){const rs=await fetch(m.url);if(!rs.ok)throw new Error('enhance.js '+rs.status);const t=await rs.text(),i=t.indexOf('\nEN.names=');if(i<0)throw new Error('enhance core marker missing');EN=new Function(t.slice(0,i)+';return EN')();self.postMessage({id:m.id,ok:1})}
  else if(m.cmd=='run'){if(!EN)throw new Error('not initialised');const p=String(m.f).split(':'),fn=EN.core.hasOwnProperty(p[0])&&EN.core[p[0]];if(!fn)throw new Error('unknown filter '+p[0]);
   const d=new Uint8ClampedArray(m.buf);fn(d,m.w,m.h,p.slice(1).map(Number));self.postMessage({id:m.id,buf:d.buffer},[d.buffer])}
  else if(m.cmd=='ping')self.postMessage({id:m.id,ok:1})
 }catch(x){self.postMessage({id:m.id,err:String(x&&x.message||x)})}};
