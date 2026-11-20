/* نواة الترخيص (Pro) — دون واجهة. الصيغة: LL1.<payload base32>.<signature base32>
   payload: [0]=إصدار الصيغة(1) [1]=الخطة(1 pro,2 event) [2-3]=الانتهاء بأيام منذ 2026-01-01 (UTC، شاملاً) [4-7]=الرقم التسلسلي [8..]=التسمية UTF-8
   signature: ECDSA P-256 / SHA-256 بصيغة P1363 الخام (64 بايت) — المفتاح العام PRO.pub = نقطة غير مضغوطة (65 بايت) base64url */
const PRO_EPOCH=Date.UTC(2026,0,1),PRO_PLANS={1:'pro',2:'event'};
let _proRevoked=null,_proKey=null;
function proB32d(s){const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';s=String(s).toUpperCase().replace(/[^A-Z2-7]/g,'');let bits=0,v=0;const o=[];for(const ch of s){v=(v<<5)|A.indexOf(ch);bits+=5;if(bits>=8){bits-=8;o.push((v>>bits)&255);v&=(1<<bits)-1}}return new Uint8Array(o)}
function proB64u(s){s=String(s).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function proToday(){const n=new Date();return Math.floor((Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate())-PRO_EPOCH)/864e5)}
/* يقرأ الكود دون تحقق من التوقيع */
function proParse(code){
 const m=String(code||'').trim().replace(/\s+/g,'').split('.');
 if(m.length!=3||m[0].toUpperCase()!='LL1')return null;
 const p=proB32d(m[1]),sig=proB32d(m[2]);
 if(p.length<8||p.length>40||sig.length!=64||p[0]!=1)return null;
 const dv=new DataView(p.buffer,p.byteOffset);
 let label='';try{label=new TextDecoder().decode(p.slice(8))}catch(e){}
 return{payload:p,sig,plan:PRO_PLANS[p[1]],exp:dv.getUint16(2),serial:dv.getUint32(4),label}}
/* التحقق: توقيع + خطة معروفة. لا يفحص الانتهاء/الإبطال (يفحصهما proStatus) */
async function proVerify(code){
 try{
  const c=proParse(code);if(!c||!c.plan)return{ok:false,err:'bad'};
  if(typeof PRO=='undefined'||!PRO.pub)return{ok:false,err:'nokey'};
  if(!_proKey)_proKey=await crypto.subtle.importKey('raw',proB64u(PRO.pub),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const good=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},_proKey,c.sig,c.payload);
  if(!good)return{ok:false,err:'sig'};
  const r={ok:true,plan:c.plan,exp:c.exp,serial:c.serial,label:c.label};
  if(c.exp<proToday())r.expired=true;
  if(proIsRevoked(c.serial))r.revoked=true;
  return r
 }catch(e){return{ok:false,err:'bad'}}}
/* الإبطال: يقرأ data/revoked.json ({"revoked":[أرقام]}) ويحفظ نسخة محلية للعمل دون إنترنت */
function proIsRevoked(n){const l=_proRevoked||_l('revk',[]);return l.indexOf(n)>=0}
async function proLoadRevoked(){
 try{const r=await fetchT('data/revoked.json?t='+Date.now(),{cache:'no-store'},4000);if(!r.ok)throw 0;const j=await r.json();
  if(j&&Array.isArray(j.revoked)){_proRevoked=j.revoked.filter(x=>Number.isInteger(x));_s('revk',_proRevoked)}}catch(e){_proRevoked=_l('revk',[])}
 return _proRevoked}
/* التفعيل: يتحقق ثم يحفظ الكود في lic. لا يحفظ كوداً منتهياً أو مُبطَلاً */
async function proActivate(code){
 const v=await proVerify(code);
 if(!v.ok)return v;
 if(v.expired)return{ok:false,err:'expired',label:v.label};
 if(v.revoked)return{ok:false,err:'revoked',label:v.label};
 _s('lic',String(code).trim().replace(/\s+/g,''));return v}
function proDeactivate(){try{localStorage.removeItem('lic')}catch(e){}}
/* التجربة المحلية */
function proStartTrial(){if(!_l('trial0',0))_s('trial0',Date.now());return _l('trial0',0)}
function proTrialLeft(){const t=_l('trial0',0);if(!t)return 0;const d=(typeof PRO!='undefined'&&PRO.trialDays)||14;return Math.max(0,Math.ceil(d-(Date.now()-t)/864e5))}
/* الحالة (متزامنة): تعتمد على آخر نتيجة تحقق محفوظة في الذاكرة _proLic؛ استدعِ proInit() عند الفتح */
let _proLic=null;
async function proInit(){
 _proRevoked=_l('revk',[]);
 const slow=proLoadRevoked();
 const c=_l('lic','');_proLic=c?await proVerify(c):null;
 if(_proLic&&!_proLic.ok)_proLic=null;
 await Promise.race([slow,new Promise(r=>setTimeout(r,2500))]);
 return proStatus()}
function proStatus(){
 if(typeof PRO=='undefined'||!PRO.enabled)return{state:'off',daysLeft:0,label:''};
 const L=_proLic;
 if(L&&L.ok){const left=L.exp-proToday();
  if(!proIsRevoked(L.serial)&&left>=0)return{state:'pro',plan:L.plan,daysLeft:left,exp:L.exp,serial:L.serial,label:L.label};
  return{state:'expired',plan:L.plan,daysLeft:0,exp:L.exp,serial:L.serial,label:L.label,revoked:proIsRevoked(L.serial)}}
 const t=proTrialLeft();
 if(t>0)return{state:'trial',daysLeft:t,label:''};
 return{state:_l('trial0',0)?'expired':'off',daysLeft:0,label:'',trialEnded:!!_l('trial0',0)}}
function proActive(){const s=proStatus().state;return s=='pro'||s=='trial'}
