/* قفل اختياري برمز (PIN) على هذا الجهاز: يمنع شخصاً آخر يستعمل نفس الجهاز من فتح التطبيق وبياناتك (قوائم القضايا والمواعيد).
   ملاحظة: هذا قفل للجهاز فقط وليس حماية للموقع نفسه، فالموقع المنشور على جيت هب عام لمن يعرف رابطه. */
(function(){
const K='pinh',SALT='ll-v1:',ss=()=>{try{return sessionStorage}catch(e){return{getItem(){},setItem(){},removeItem(){}}}};
const hash=async p=>{try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(SALT+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){let h=5381;for(const c of SALT+p)h=(h*33+c.charCodeAt(0))>>>0;return'x'+h}};
const get=()=>{try{return localStorage.getItem(K)}catch(e){return null}},put=v=>{try{v?localStorage.setItem(K,v):localStorage.removeItem(K)}catch(e){}};
let fails=0,until=0;
function wipe(){try{localStorage.clear()}catch(e){}try{indexedDB.deleteDatabase('legal-lib')}catch(e){}}
function show(){if(document.querySelector('#lk'))return;const d=document.createElement('div');d.id='lk';d.className='lk';
 d.innerHTML='<div class="lkb"><div class="lkl">🔒</div><h2>المكتبة القانونية</h2><div class="lks">أدخل رمز الفتح</div><input id="lkp" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="••••"><div id="lkm" class="lks"></div><button class="btn pri wide" data-act="lkgo">فتح</button><button class="lnk" data-act="lkreset">نسيت الرمز؟</button></div>';
 document.body.appendChild(d);setTimeout(()=>{const i=document.querySelector('#lkp');if(i)i.focus()},50)}
async function tryOpen(){const i=document.querySelector('#lkp'),m=document.querySelector('#lkm');if(!i)return;
 if(Date.now()<until){m.textContent='محاولات كثيرة — انتظر '+Math.ceil((until-Date.now())/1000)+' ثانية';return}
 if(await hash(i.value)==get()){ss().setItem('unl','1');fails=0;const o=document.querySelector('#lk');if(o)o.remove()}
 else{fails++;i.value='';m.textContent='الرمز غير صحيح';if(fails>=5){until=Date.now()+30000;fails=0}}}
async function ask(msg){const p=prompt(msg);return p===null?null:p}
async function setPin(){const a=await ask('اكتب رمزاً من 4 إلى 12 رقماً');if(a===null)return;if(!/^\d{4,12}$/.test(a)){toast('الرمز يجب أن يكون أرقاماً (4 إلى 12)');return}
 const b=await ask('أعد كتابة الرمز للتأكيد');if(b!==a){toast('الرمزان غير متطابقين');return}put(await hash(a));ss().setItem('unl','1');toast('🔒 تم تفعيل القفل');lockSheet()}
async function checkCur(){const c=await ask('اكتب الرمز الحالي');if(c===null)return false;if(await hash(c)==get())return true;toast('الرمز غير صحيح');return false}
function lockSheet(){const on=!!get();sheet(`<h2 class="sht">🔒 قفل التطبيق برمز</h2><div class="shm">${on?'القفل مفعّل: يُطلب الرمز كلما فتحت التطبيق من جديد.':'اجعل التطبيق يطلب رمزاً عند فتحه، لحماية قوائم قضاياك ومواعيدك من أي شخص يستعمل جهازك.'}</div><div class="acts one">${on?'<button class="btn pri" data-act="lknow">🔒 قفل الآن</button><button class="btn" data-act="lkchg">🔑 تغيير الرمز</button><button class="btn" data-act="lkoff">🔓 إلغاء القفل</button>':'<button class="btn pri" data-act="lkset">تفعيل القفل</button>'}</div><div class="shm" style="margin-top:12px">هذا قفل لهذا الجهاز فقط، وليس حماية للموقع نفسه: صيغ المكتبة متاحة لمن يملك رابط الموقع.</div>`)}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='lock')lockSheet();else if(a=='lkset')await setPin();
 else if(a=='lkchg'){if(await checkCur())await setPin()}
 else if(a=='lkoff'){if(await checkCur()){put(null);ss().removeItem('unl');toast('تم إلغاء القفل');lockSheet()}}
 else if(a=='lknow'){ss().removeItem('unl');closeSheet();show()}
 else if(a=='lkgo')tryOpen();
 else if(a=='lkreset'&&confirm('سيمسح هذا كل بياناتك المحفوظة على هذا الجهاز (قوائم القضايا والمواعيد والملفات المحفوظة) ويلغي القفل. هل تريد المتابعة؟')){wipe();const o=document.querySelector('#lk');if(o)o.remove();location.reload()}});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target&&e.target.id=='lkp')tryOpen()});
if(get()&&!ss().getItem('unl'))show();
})();
