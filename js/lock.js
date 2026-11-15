/* قفل اختياري برمز على هذا الجهاز: لوحة أرقام خاصة بالتطبيق (بدون أي خانة «كلمة مرور»)، فلا يتدخل مدير كلمات المرور في المتصفح
   ولا تظهر تحذيرات «التحقق من كلمات المرور» التي تنتج عن خانات password. الرمز يُحفظ مشفّراً (SHA-256) على الجهاز فقط ولا يُرسل لأي جهة.
   هذا قفل للجهاز وليس حماية للموقع نفسه (الموقع المنشور على جيت هب عام لمن يعرف رابطه). */
(function(){
const K='pinh',KL='pinl',SALT='ll-v1:',ss=()=>{try{return sessionStorage}catch(e){return{getItem(){},setItem(){},removeItem(){}}}};
const hash=async p=>{try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(SALT+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){let h=5381;for(const c of SALT+p)h=(h*33+c.charCodeAt(0))>>>0;return'x'+h}};
const get=()=>{try{return localStorage.getItem(K)}catch(e){return null}},put=v=>{try{v?localStorage.setItem(K,v):(localStorage.removeItem(K),localStorage.removeItem(KL))}catch(e){}},plen=()=>{try{return +localStorage.getItem(KL)||0}catch(e){return 0}};
/* رموز سهلة التخمين: أرقام مكررة أو متتابعة أو شائعة */
const weak=p=>/^(\d)\1+$/.test(p)||'01234567890123456789'.includes(p)||'98765432109876543210'.includes(p)||['2580','1357','2468','1212','1122','1313','1004','2000','2024','2025','2026','0852','1379','1590'].includes(p);
let fails=0,until=0,PAD=null;
function wipe(){try{localStorage.clear()}catch(e){}try{indexedDB.deleteDatabase('legal-lib');indexedDB.deleteDatabase('legal-live')}catch(e){}}
function padClose(){const o=document.querySelector('#lk');if(o)o.remove();document.removeEventListener('keydown',padKey,true);PAD=null}
function padOpen(o){padClose();PAD={o,pin:'',busy:false};const d=document.createElement('div');d.id='lk';d.className='lk';
 d.innerHTML=`<div class="lkb"><div class="lkl">🔒</div><h2>${o.title}</h2><div class="lks">${o.sub||''}</div><div class="pdots" id="pdt"></div><div class="lks lkm" id="pms"></div><div class="pad" dir="ltr">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-pd="${n}">${n}</button>`).join('')}<button type="button" class="alt" data-pd="del" aria-label="مسح رقم">⌫</button><button type="button" data-pd="0">0</button><button type="button" class="alt ok" data-pd="ok" aria-label="تأكيد">✔</button></div>${o.extra||''}${o.cancel?'<button type="button" class="lnk" data-pd="cancel" style="margin-top:14px">إلغاء</button>':''}</div>`;
 document.body.appendChild(d);padDots();document.addEventListener('keydown',padKey,true)}
function padDots(){const el=document.querySelector('#pdt');if(!el||!PAD)return;const n=Math.max(PAD.o.len||6,PAD.pin.length);el.innerHTML=Array.from({length:n},(_,i)=>`<i class="${i<PAD.pin.length?'f':''}"></i>`).join('')}
function padMsg(t){const e=document.querySelector('#pms');if(e)e.textContent=t||''}
async function padSubmit(){if(!PAD||PAD.busy)return;const p=PAD.pin;if(p.length<4){padMsg('الرمز 4 أرقام على الأقل');return}PAD.busy=true;const me=PAD;let r;try{r=await me.o.onDone(p)}catch(e){r={err:'حدث خطأ، حاول مرة أخرى'}}
 if(r&&r.err){me.busy=false;if(PAD===me){me.pin='';padDots();padMsg(r.err);const b=document.querySelector('#lk .lkb');if(b){b.classList.remove('shk');void b.offsetWidth;b.classList.add('shk')}}return}
 if(!(r&&r.keep)&&PAD===me)padClose();if(r&&r.after)r.after()}
function padPress(k){if(!PAD||PAD.busy)return;
 if(k=='forgot'){if(confirm('سيمسح هذا كل بياناتك المحفوظة على هذا الجهاز (قوائم القضايا والمواعيد والحسابات والملفات المحفوظة) ويلغي القفل. هل تريد المتابعة؟')){wipe();padClose();location.reload()}return}
 if(k=='cancel'){const c=PAD.o.onCancel;padClose();if(c)c();return}
 if(k=='ok'){padSubmit();return}
 if(k=='del')PAD.pin=PAD.pin.slice(0,-1);else if(/^\d$/.test(k)&&PAD.pin.length<12)PAD.pin+=k;
 padMsg('');padDots();if(k!='del'&&PAD.o.len&&PAD.pin.length==PAD.o.len)padSubmit()}
function padKey(e){if(!PAD)return;if(/^\d$/.test(e.key)){e.preventDefault();padPress(e.key)}else if(e.key=='Backspace'){e.preventDefault();padPress('del')}else if(e.key=='Enter'){e.preventDefault();padPress('ok')}else if(e.key=='Escape'&&PAD.o.cancel){padPress('cancel')}}
function show(){padOpen({title:'المكتبة القانونية',sub:'أدخل رمز الفتح',len:plen(),extra:'<button type="button" class="lnk" data-pd="forgot" style="margin-top:14px">نسيت الرمز؟</button>',
 onDone:async p=>{if(Date.now()<until)return{err:'محاولات كثيرة — انتظر '+Math.ceil((until-Date.now())/1000)+' ثانية'};if(await hash(p)==get()){ss().setItem('unl','1');fails=0;return{}}fails++;if(fails>=5){until=Date.now()+30000;fails=0}return{err:'الرمز غير صحيح'}}})}
function setPin(){return new Promise(res=>{let first='';padOpen({title:'اختر رمز القفل',sub:'من 4 إلى 12 رقماً',cancel:true,onCancel:()=>res(false),
 onDone:async p=>{if(weak(p))return{err:'الرمز سهل التخمين — اختر رمزاً أصعب'};first=p;
  padOpen({title:'أعد كتابة الرمز',sub:'للتأكيد',cancel:true,onCancel:()=>res(false),onDone:async q=>{if(q!==first)return{err:'الرمزان غير متطابقين'};put(await hash(first));try{localStorage.setItem(KL,String(first.length))}catch(e){}ss().setItem('unl','1');return{after:()=>{toast('🔒 تم تفعيل القفل');res(true)}}}});return{keep:true}}})})}
function checkCur(){return new Promise(res=>padOpen({title:'الرمز الحالي',sub:'أدخل رمز القفل الحالي',len:plen(),cancel:true,onCancel:()=>res(false),onDone:async c=>{if(await hash(c)==get())return{after:()=>res(true)};return{err:'الرمز غير صحيح'}}}))}
function lockSheet(){const on=!!get();sheet(`<h2 class="sht">🔒 قفل التطبيق برمز</h2><div class="shm">${on?'القفل مفعّل: يُطلب الرمز كلما فتحت التطبيق من جديد.':'اجعل التطبيق يطلب رمزاً عند فتحه، لحماية قوائم قضاياك ومواعيدك وحساباتك من أي شخص يستعمل جهازك.'}</div><div class="acts one">${on?'<button class="btn pri" data-act="lknow">🔒 قفل الآن</button><button class="btn" data-act="lkchg">🔑 تغيير الرمز</button><button class="btn" data-act="lkoff">🔓 إلغاء القفل</button>':'<button class="btn pri" data-act="lkset">تفعيل القفل</button>'}</div><div class="shm" style="margin-top:12px">الرمز يُحفظ مشفّراً على جهازك فقط ولا يُرسل لأي جهة. هو قفل لهذا الجهاز وليس حماية للموقع نفسه: صيغ المكتبة متاحة لمن يملك رابط الموقع.</div>`)}
document.addEventListener('click',async e=>{const pd=e.target.closest('[data-pd]');if(pd){padPress(pd.dataset.pd);return}
 const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='lock')lockSheet();
 else if(a=='lkset'){closeSheet();if(await setPin())lockSheet()}
 else if(a=='lkchg'){closeSheet();if(await checkCur()){if(await setPin())lockSheet()}else lockSheet()}
 else if(a=='lkoff'){closeSheet();if(await checkCur()){put(null);ss().removeItem('unl');toast('تم إلغاء القفل')}lockSheet()}
 else if(a=='lknow'){ss().removeItem('unl');closeSheet();show()}});
if(get()&&!ss().getItem('unl'))show();
})();
