/* اختبار منطق pro.js:  node tools/pro-test.js  (من جذر المشروع) */
const vm=require('vm'),fs=require('fs'),{webcrypto:wc}=require('crypto');
const mem={};const ls={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}};
let revokedFile={revoked:[]};
const ctx=vm.createContext({localStorage:ls,crypto:wc,TextDecoder,TextEncoder,atob,btoa,Uint8Array,DataView,Date,Math,JSON,Array,Number,String,console,
 fetch:async()=>({ok:true,json:async()=>revokedFile})});
const run=f=>vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32=u=>{let bits=0,v=0,o='';for(const x of u){v=(v<<8)|x;bits+=8;while(bits>=5){bits-=5;o+=A[(v>>bits)&31];v&=(1<<bits)-1}}if(bits)o+=A[(v<<(5-bits))&31];return o};
const b64u=u=>Buffer.from(u).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
let fails=0;const T=(n,c)=>{console.log((c?'✓ ':'✗ ')+n);if(!c)fails++};
(async()=>{
 const kp=await wc.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const pub=b64u(new Uint8Array(await wc.subtle.exportKey('raw',kp.publicKey)));
 const mk=async(plan,exp,serial,label)=>{const lb=new TextEncoder().encode(label),p=new Uint8Array(8+lb.length);const dv=new DataView(p.buffer);p[0]=1;p[1]=plan;dv.setUint16(2,exp);dv.setUint32(4,serial);p.set(lb,8);
  const sig=new Uint8Array(await wc.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,p));return'LL1.'+b32(p)+'.'+b32(sig)};
 vm.runInContext("const _l=(k,x)=>{try{return JSON.parse(localStorage.getItem(k))||x}catch(e){return x}},_s=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};",ctx);
 run('js/config.js');run('js/pro.js');
 const ev=c=>vm.runInContext(c,ctx);
 const today=ev('proToday()');
 ev('PRO.pub='+JSON.stringify(pub)+';PRO.enabled=true');
 const good=await mk(1,today+100,1001,'أحمد محمد'),old=await mk(1,today-1,1002,'منتهٍ'),rev=await mk(2,today+30,1003,'ندوة'),last=await mk(1,today,1004,'آخر يوم');
 ctx.G=good;ctx.O=old;ctx.R=rev;ctx.L=last;
 let v=await ev('proVerify(G)');T('كود صالح',v.ok&&v.plan=='pro'&&v.serial==1001&&v.label=='أحمد محمد'&&!v.expired&&!v.revoked);
 T('قبول حروف صغيرة ومسافات',(await ev('proVerify(G.toLowerCase().replace("ll1","LL1").replace(/(.{12})/g,"$1 "))')).ok);
 T('خطة event',(await ev('proVerify(R)')).plan=='event');
 v=await ev('proVerify(O)');T('منتهٍ يُعلَّم expired',v.ok&&v.expired);
 T('آخر يوم ما زال صالحاً',!(await ev('proVerify(L)')).expired);
 const t=good.split('.');t[1]=t[1].slice(0,10)+(t[1][10]=='A'?'B':'A')+t[1].slice(11);ctx.X=t.join('.');
 T('معبَّث بالحمولة مرفوض',(await ev('proVerify(X)')).err=='sig');
 const s2=good.split('.');s2[2]=s2[2].slice(0,5)+(s2[2][5]=='A'?'B':'A')+s2[2].slice(6);ctx.Y=s2.join('.');
 T('معبَّث بالتوقيع مرفوض',!(await ev('proVerify(Y)')).ok);
 T('نص عشوائي مرفوض',!(await ev('proVerify("hello")')).ok&&!(await ev('proVerify("")')).ok&&!(await ev('proVerify(null)')).ok);
 const kp2=await wc.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const pub2=b64u(new Uint8Array(await wc.subtle.exportKey('raw',kp2.publicKey)));
 ev('PRO.pub='+JSON.stringify(pub2)+';_proKey=null');T('مفتاح عام مختلف يرفض',!(await ev('proVerify(G)')).ok);
 ev('PRO.pub='+JSON.stringify(pub)+';_proKey=null');
 // الحالة
 T('بلا ترخيص ولا تجربة: off',ev('proStatus().state')=='off'&&!ev('proActive()'));
 ev('proStartTrial()');T('تجربة: trial 14 يوماً',ev('proStatus().state')=='trial'&&ev('proStatus().daysLeft')==14&&ev('proActive()'));
 ls.setItem('trial0',String(Date.now()-15*864e5));T('تجربة منتهية: expired',ev('proStatus().state')=='expired'&&!ev('proActive()'));
 T('تفعيل كود منتهٍ مرفوض',(await ev('proActivate(O)')).err=='expired'&&!ls.getItem('lic'));
 T('تفعيل كود صالح',(await ev('proActivate(G)')).ok&&!!ls.getItem('lic'));
 await ev('proInit()');let st=ev('proStatus()');T('بعد proInit: pro',st.state=='pro'&&st.daysLeft==100&&st.label=='أحمد محمد');
 T('الترخيص يتفوق على التجربة المنتهية',st.state=='pro');
 revokedFile={revoked:[1001]};await ev('proInit()');st=ev('proStatus()');T('مُبطَل: expired+revoked',st.state=='expired'&&st.revoked===true);
 T('تفعيل كود مُبطَل مرفوض',(await ev('proActivate(G)')).err=='revoked');
 ctx.fetch=async()=>{throw new Error('offline')};await ev('proLoadRevoked()');T('دون إنترنت: يستعمل قائمة الإبطال المحفوظة',ev('proIsRevoked(1001)'));
 revokedFile={revoked:[]};ctx.fetch=async()=>({ok:true,json:async()=>revokedFile});await ev('proInit()');T('رفع الإبطال: pro',ev('proStatus().state')=='pro');
 ev('proDeactivate()');await ev('proInit()');T('إلغاء التفعيل',ev('proStatus().state')=='expired'&&!ls.getItem('lic'));
 ev('PRO.enabled=false');T('PRO.enabled=false: off دائماً ولا شيء يعمل',ev('proStatus().state')=='off'&&!ev('proActive()'));
 console.log(fails?'FAILED '+fails:'ALL PASSED');process.exit(fails?1:0)
})().catch(e=>{console.error(e);process.exit(1)});
