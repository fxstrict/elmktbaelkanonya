/* L4 (1.24.0): خزنة تشفير البيانات على هذا الجهاز — AES-GCM 256 بمفتاح مشتق من كلمة مرور (PBKDF2-SHA256، 600000 تكرار، ملح عشوائي 16 بايت).
   أول سكربت يُحمَّل (قبل lock.js وtools.js). لا يغيّر أي عقد قائم: يلفّ localStorage للمفاتيح الحساسة فقط (VK) فيبقى باقي التطبيق يقرأ ويكتب كما هو.
   - مفعّلة: القيم الحساسة لا تُخزَّن صريحة أبداً؛ تُحفظ مشفّرة في vx.<مفتاح> (iv عشوائي 12 بايت لكل كتابة، والبيانات الإضافية = اسم المفتاح فلا يُنقل مشفَّر لمفتاح آخر).
   - مقفولة: القراءة تعيد null والكتابة تُهمَل (فلا تُمحى البيانات المشفرة بحالة فارغة).
   - الفتح: يُفك التشفير في الذاكرة ثم تُعاد الصفحة، ويُسلَّم المفتاح والقيم للتحميل الجديد عبر window.name (ذاكرة التبويب فقط، لا تُكتب على القرص ولا في localStorage/sessionStorage) فيبقى التبويب مفتوحاً عند إعادة التحميل ويُقفل بإغلاقه.
   - لا يشمل: مكتبة المستندات الممسوحة (IndexedDB) ولا الملفات المحفوظة خارج localStorage. الواجهة (الإعداد والتغيير والإلغاء) في vault-ui.js. */
const VAULT=window.VAULT=(function(){
const VK=['lists','dls','pa','acc','fp','fc','hol','dek'],META='vault',PFX='vx.',BAD='vxbad.',FK='vxf',AK='vxal',HN='LLV1:',ITER=600000,OKTXT='ll-vault-ok';
const SP=Storage.prototype,og=SP.getItem,os=SP.setItem,orm=SP.removeItem,ocl=SP.clear,isLS=o=>{try{return o===window.localStorage}catch(e){return false}};
const R={get:k=>{try{return og.call(window.localStorage,k)}catch(e){return null}},set:(k,v)=>{try{os.call(window.localStorage,k,v);return true}catch(e){return false}},del:k=>{try{orm.call(window.localStorage,k)}catch(e){}}};
const sub=()=>{try{return crypto&&crypto.subtle}catch(e){return null}};
const TE=new TextEncoder(),TD=new TextDecoder();
const b2s=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)},s2b=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const V={on:false,unlocked:false,err:null};let MEM={},KEY=null,RAWK=null,META_O=null,keyReady=Promise.resolve(),FL=Promise.resolve();const dirty=new Set();let ft=0;
/* ---------- التشفير ---------- */
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
async function derive(pw,salt,it){const m=await sub().importKey('raw',TE.encode(String(pw).normalize('NFKC')),'PBKDF2',false,['deriveBits']);return new Uint8Array(await sub().deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:it},m,256))}
const ik=raw=>sub().importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
async function enc1(key,name,text){const iv=rnd(12),ct=new Uint8Array(await sub().encrypt({name:'AES-GCM',iv,additionalData:TE.encode(name)},key,TE.encode(text))),o=new Uint8Array(12+ct.length);o.set(iv);o.set(ct,12);return'v1.'+b2s(o)}
async function dec1(key,name,blob){if(typeof blob!='string'||!blob.startsWith('v1.'))throw new Error('fmt');const u=s2b(blob.slice(3));if(u.length<29)throw new Error('len');return TD.decode(await sub().decrypt({name:'AES-GCM',iv:u.subarray(0,12),additionalData:TE.encode(name)},key,u.subarray(12)))}
/* ---------- كلمة المرور ---------- */
const COMMON=['password','12345678','123456789','1234567890','qwertyui','qwertyuiop','11111111','iloveyou','password1','admin123','abcd1234','00000000','12341234','987654321','letmein1','welcome1'];
function weak(p){p=String(p||'');if(p.length<8)return'كلمة المرور 8 أحرف على الأقل (الجملة الطويلة أفضل)';if(new Set([...p]).size<4)return'كلمة المرور مكررة الأحرف — اختر أصعب';if(/^\d+$/.test(p))return'لا تكتفِ بالأرقام — أضف حروفاً';if(COMMON.includes(p.toLowerCase()))return'كلمة المرور شائعة وسهلة التخمين';return''}
/* تقييد المحاولات يبقى بعد إعادة التحميل: كل 5 أخطاء انتظار يتضاعف (30 ثانية ← ... ← ساعة تقريباً) */
const tf=()=>{try{return JSON.parse(R.get(FK))||{n:0,u:0,l:0}}catch(e){return{n:0,u:0,l:0}}};
const waitMsg=()=>{const t=tf();return Date.now()<t.u?'محاولات كثيرة — انتظر '+Math.ceil((t.u-Date.now())/1000)+' ثانية':''};
const failed=()=>{const t=tf();t.n++;if(t.n>=5){t.u=Date.now()+30000*Math.pow(2,Math.min(t.l,7));t.l++;t.n=0}R.set(FK,JSON.stringify(t))};
const okAttempt=()=>R.del(FK);
/* ---------- التسليم بين التحميلات (ذاكرة التبويب) ---------- */
function handoff(){if(V.unlocked&&RAWK){try{window.name=HN+JSON.stringify({k:RAWK,d:MEM})}catch(e){}}}
const clearHand=()=>{try{if(String(window.name).startsWith(HN))window.name=''}catch(e){}};
/* ---------- الحفظ المشفّر ---------- */
function mark(k){dirty.add(k);clearTimeout(ft);ft=setTimeout(flush,150)}
function flush(){clearTimeout(ft);FL=FL.then(async()=>{if(!V.unlocked||!dirty.size)return;await keyReady;if(!KEY)return;const ks=[...dirty];dirty.clear();
 for(const k of ks){try{if(k in MEM){if(!R.set(PFX+k,await enc1(KEY,k,MEM[k]))){dirty.add(k);V.err='quota'}else V.err=null}else R.del(PFX+k)}catch(e){dirty.add(k);V.err='crypto'}}
 handoff();if(V.err&&typeof toast=='function')toast('⚠️ تعذّر حفظ البيانات المشفّرة — احفظ نسخة احتياطية الآن',5000)}).catch(()=>{});return FL}
/* ---------- لفّ localStorage للمفاتيح الحساسة فقط ---------- */
SP.getItem=function(k){if(V.on&&isLS(this)&&VK.indexOf(k)>=0)return k in MEM?MEM[k]:null;return og.call(this,k)};
SP.setItem=function(k,v){if(V.on&&isLS(this)&&VK.indexOf(k)>=0){if(!V.unlocked)return;MEM[k]=String(v);mark(k);return}return os.call(this,k,v)};
SP.removeItem=function(k){if(V.on&&isLS(this)&&VK.indexOf(k)>=0){if(!V.unlocked)return;delete MEM[k];mark(k);return}return orm.call(this,k)};
SP.clear=function(){if(isLS(this)&&(V.on||V.unlocked)){MEM={};V.on=false;V.unlocked=false;KEY=null;RAWK=null;dirty.clear();clearHand()}return ocl.call(this)};
/* ---------- الإعداد/الفتح/التغيير/الإلغاء ---------- */
const readMeta=()=>{try{const m=JSON.parse(R.get(META));return m&&m.v==1&&typeof m.s=='string'&&typeof m.c=='string'&&m.it>=1e5?m:null}catch(e){return null}};
const supported=()=>!!(sub()&&sub().deriveBits&&window.TextEncoder);
async function verifyPw(pw){const m=readMeta();if(!m)return{err:'الخزنة غير مفعّلة'};try{const kb=await derive(pw,s2b(m.s),m.it),key=await ik(kb);if(await dec1(key,'verify',m.c)!==OKTXT)throw 0;return{ok:true,key,kb,meta:m}}catch(e){return{err:'كلمة المرور غير صحيحة'}}}
async function enable(pw){if(V.on)return{err:'التشفير مفعّل بالفعل'};if(!supported())return{err:'المتصفح أو طريقة الاتصال لا تدعم التشفير (يلزم اتصال آمن https)'};const w=weak(pw);if(w)return{err:w};
 try{const salt=rnd(16),kb=await derive(pw,salt,ITER),key=await ik(kb),c=await enc1(key,'verify',OKTXT),mem={},blobs={};
  for(const k of VK){const v=R.get(k);if(v!=null){mem[k]=v;blobs[PFX+k]=await enc1(key,k,v);if(await dec1(key,k,blobs[PFX+k])!==v)throw new Error('roundtrip')}}
  const done=[];for(const n in blobs){if(!R.set(n,blobs[n])){done.forEach(R.del);return{err:'المساحة غير كافية لحفظ النسخة المشفرة'}}done.push(n)}
  const m={v:1,it:ITER,s:b2s(salt),c,t:Date.now()};if(!R.set(META,JSON.stringify(m))){done.forEach(R.del);return{err:'تعذّر حفظ إعدادات التشفير'}}
  VK.forEach(k=>{if(R.get(PFX+k)!=null)R.del(k)});
  MEM=mem;KEY=key;RAWK=b2s(kb);keyReady=Promise.resolve();V.on=true;V.unlocked=true;META_O=m;handoff();return{ok:true}}catch(e){return{err:'تعذّر التفعيل: '+(e&&e.message||e)}}}
async function unlock(pw){const m=readMeta();if(!m)return{err:'الخزنة غير مفعّلة'};const wm=waitMsg();if(wm)return{err:wm};
 const v=await verifyPw(pw);if(!v.ok){failed();return{err:waitMsg()||v.err}}okAttempt();
 const mem={},bad=[];for(const k of VK){const b=R.get(PFX+k);if(b==null)continue;try{mem[k]=await dec1(v.key,k,b)}catch(e){bad.push(k);R.set(BAD+k,b);R.del(PFX+k)}}
 MEM=mem;KEY=v.key;RAWK=b2s(v.kb);keyReady=Promise.resolve();V.unlocked=true;META_O=m;handoff();return{ok:true,bad}}
async function change(oldPw,newPw){if(!V.on||!V.unlocked)return{err:'افتح الخزنة أولاً'};const v=await verifyPw(oldPw);if(!v.ok)return{err:v.err};const w=weak(newPw);if(w)return{err:w};
 try{await flush();const salt=rnd(16),kb=await derive(newPw,salt,ITER),key=await ik(kb),c=await enc1(key,'verify',OKTXT),blobs={};for(const k in MEM)blobs[PFX+k]=await enc1(key,k,MEM[k]);
  const m={v:1,it:ITER,s:b2s(salt),c,t:Date.now()},old={};[META,...Object.keys(blobs)].forEach(n=>old[n]=R.get(n));
  /* كتابات متزامنة متتالية بلا انتظار بينها؛ عند الفشل تُستعاد القيم القديمة كاملة */
  let ok=true;for(const n in blobs)if(!R.set(n,blobs[n])){ok=false;break}if(ok)ok=R.set(META,JSON.stringify(m));
  if(!ok){for(const n in old){if(old[n]==null)R.del(n);else R.set(n,old[n])}return{err:'المساحة غير كافية — لم يتغيّر شيء'}}
  KEY=key;RAWK=b2s(kb);META_O=m;handoff();Object.keys(MEM).forEach(mark);return{ok:true}}catch(e){return{err:'تعذّر التغيير: '+(e&&e.message||e)}}}
async function disable(pw){if(!V.on||!V.unlocked)return{err:'افتح الخزنة أولاً'};const v=await verifyPw(pw);if(!v.ok)return{err:v.err};await flush();
 const k0=Object.keys(MEM);for(const k of k0)if(!R.set(k,MEM[k])){k0.forEach(x=>{if(R.get(PFX+x)!=null)R.del(x)});return{err:'المساحة غير كافية لإعادة البيانات صريحة — لم يتغيّر شيء'}}
 VK.forEach(k=>R.del(PFX+k));R.del(META);R.del(FK);V.on=false;V.unlocked=false;MEM={};KEY=null;RAWK=null;META_O=null;dirty.clear();clearHand();return{ok:true}}
async function lockNow(){await flush();clearHand();V.unlocked=false;MEM={};location.reload()}
/* ---------- قفل تلقائي بعد الغياب ---------- */
const autoMin=()=>{const v=R.get(AK);return v==null?15:Math.max(0,+v||0)};
const setAuto=m=>{R.set(AK,String(Math.max(0,+m||0)))};
const autoDue=(min,ms)=>min>0&&ms>=min*60000;
let HID=0;document.addEventListener('visibilitychange',()=>{if(document.visibilityState=='hidden'){HID=Date.now();if(V.unlocked)flush()}else if(V.on&&V.unlocked&&HID&&autoDue(autoMin(),Date.now()-HID))lockNow()});
addEventListener('pagehide',handoff);addEventListener('beforeunload',handoff);
/* ---------- شاشة الفتح (بداية التشغيل) ---------- */
const q=s=>document.querySelector(s);
function wipeAll(){try{localStorage.clear()}catch(e){}try{['legal-lib','legal-live','hscan-db'].forEach(n=>indexedDB.deleteDatabase(n))}catch(e){}try{caches.delete('ntf-data')}catch(e){}clearHand()}
function showLock(){if(!V.on||V.unlocked)return;if(!document.body){document.addEventListener('DOMContentLoaded',showLock,{once:true});return}if(q('#vx'))return;
 const d=document.createElement('div');d.id='vx';d.className='lk';const t=(()=>{try{return CSS.supports('-webkit-text-security','disc')}catch(e){return false}})()?'text':'password';
 d.innerHTML=`<div class="lkb"><div class="lkl">🔐</div><h2>المكتبة القانونية</h2><div class="lks">بياناتك مشفّرة على هذا الجهاز — اكتب كلمة المرور لفتحها</div><input id="vx_pw" class="vxin" type="${t}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" dir="auto" name="vx${Date.now()%1e6}" placeholder="كلمة المرور" data-lpignore="true" data-1p-ignore="true" aria-label="كلمة مرور الخزنة"><div class="lks lkm" id="vx_m" role="status"></div><button type="button" class="btn pri wide" data-vx="go">فتح</button><button type="button" class="lnk" data-vx="eye" style="margin-top:8px">👁 إظهار / إخفاء</button><button type="button" class="lnk" data-vx="forgot" style="margin-top:8px">نسيت كلمة المرور؟</button></div>`;
 document.body.appendChild(d);const i=q('#vx_pw');if(i){i.addEventListener('keydown',e=>{if(e.key=='Enter'){e.preventDefault();go()}});setTimeout(()=>{try{i.focus()}catch(e){}},50)}}
let busy=false;
async function go(){if(busy)return;const i=q('#vx_pw'),m=q('#vx_m');if(!i||!m)return;if(!i.value){m.textContent='اكتب كلمة المرور';return}busy=true;m.textContent='جارٍ الفتح…';const r=await unlock(i.value);i.value='';busy=false;
 if(!r.ok){m.textContent=r.err;const b=q('#vx .lkb');if(b){b.classList.remove('shk');void b.offsetWidth;b.classList.add('shk')}return}location.reload()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-vx]');if(!b||!q('#vx')||!q('#vx').contains(b))return;const k=b.dataset.vx;
 if(k=='go')go();
 else if(k=='eye'){const i=q('#vx_pw');if(i){if(i.type=='password')i.type='text';else i.classList.toggle('show')}}
 else if(k=='forgot'){if(confirm('بياناتك مشفّرة، ولا يمكن لأي أحد استرجاعها بدون كلمة المرور (ولا حتى المطوّر).\n\nإن لم تتذكر الكلمة فالمتاح هو مسح كل بيانات المكتبة من هذا الجهاز (القضايا والمواعيد والحسابات والمستندات الممسوحة) ثم استعادة نسخة احتياطية سبق حفظها إن وُجدت.\n\nهل تريد المسح الآن؟')&&confirm('تأكيد أخير: المسح لا رجعة فيه. متابعة؟')){wipeAll();location.reload()}}});
/* ---------- التشغيل ---------- */
const m0=readMeta();V.on=!!m0;META_O=m0;
if(V.on){
 /* تنظيف أي نص صريح متبقٍّ لمفتاح له نسخة مشفرة (انقطاع أثناء التفعيل) */
 VK.forEach(k=>{if(R.get(PFX+k)!=null&&R.get(k)!=null)R.del(k)});
 try{const w=String(window.name);if(w.startsWith(HN)){const h=JSON.parse(w.slice(HN.length));if(h&&typeof h.k=='string'&&h.d&&typeof h.d=='object'){MEM={};VK.forEach(k=>{if(typeof h.d[k]=='string')MEM[k]=h.d[k]});RAWK=h.k;V.unlocked=true}}}catch(e){}
 if(V.unlocked){
  /* تأكيد أن المفتاح المسلَّم ما زال يطابق الخزنة (قد تُغيَّر الكلمة من تبويب آخر)، ثم إعادة حفظ كل شيء مشفّراً */
  keyReady=(async()=>{try{KEY=await ik(s2b(RAWK));if(await dec1(KEY,'verify',m0.c)!==OKTXT)throw 0;Object.keys(MEM).forEach(k=>dirty.add(k));flush()}catch(e){V.unlocked=false;KEY=null;MEM={};clearHand();location.reload()}})()}
 else showLock()}
else clearHand();
return Object.assign(V,{VK,weak,enable,unlock,change,disable,lockNow,setAuto,autoMin,autoDue,supported,flush,wipeAll,verifyPw,handoff});
})();
