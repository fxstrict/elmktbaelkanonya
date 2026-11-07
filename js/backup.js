/* نسخة احتياطية لبياناتك على الجهاز (قضايا وجلسات ومواعيد ومفضلة وإعدادات) واستعادتها أو دمجها. */
const BKEYS=['fav','rec','lists','dls','cnt','fp','fc','theme','pa','acc'];
let BKP=null;
const bkGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const bkDays=()=>{const s=localStorage.getItem('lastbk');return s?Math.floor((today12()-parseD(s))/864e5):null};
function bkCount(d){const g=k=>{try{return JSON.parse(d[k])}catch(e){return null}},L=g('lists')||[];return `${L.length} قضية/قائمة · ${L.reduce((a,c)=>a+((c.sessions||[]).length),0)} جلسة · ${(g('dls')||[]).length} ميعاد · ${(g('fav')||[]).length} مفضلة · ${(g('pa')||[]).length} توكيل · ${(g('acc')||[]).length} قيد حساب`}
function bkLocal(){const d={};BKEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!=null)d[k]=v});return d}
function bkSheet(){const loc=bkLocal(),dd=bkDays();
 sheet(`<h2 class="sht">💾 النسخة الاحتياطية</h2><div class="shm">بياناتك (القضايا والجلسات والمواعيد والمفضلة والإعدادات) محفوظة على هذا الجهاز فقط. احفظ نسخة قبل تغيير الهاتف أو مسح بيانات المتصفح.</div><div class="shm"><b>الموجود الآن:</b> ${bkCount(loc)}<br><b>آخر نسخة:</b> ${dd==null?'لم تُحفظ بعد':dd==0?'اليوم':'منذ '+dd+' يوماً'}</div><div class="acts one"><button class="btn pri" data-act="bkexp">⬇ حفظ نسخة احتياطية</button><label class="btn">📂 استعادة من نسخة<input type="file" id="bkf" accept=".json,application/json" hidden></label></div><div class="shm" style="margin-top:12px">تحتوي النسخة على أسماء الموكلين وبيانات القضايا، فاحفظها في مكان آمن. لا تشمل رمز القفل ولا ملفات التعبئة المحفوظة على الجهاز.</div>`)}
async function bkExport(){const o={app:'legal-library',ver:APP.version,date:new Date().toISOString(),data:bkLocal()},iso=isoD(new Date()),name='نسخة-المكتبة-'+iso+'.json',blob=new Blob([JSON.stringify(o)],{type:'application/json'}),file=new File([blob],name,{type:'application/json'});
 try{localStorage.setItem('lastbk',iso)}catch(e){}
 if(navigator.canShare&&navigator.canShare({files:[file]})&&/Android|iPhone|iPad/i.test(navigator.userAgent)){try{await navigator.share({files:[file],title:name});toast('تم حفظ النسخة — احتفظ بها في مكان آمن',3500);bkSheet();return}catch(x){if(x&&x.name=='AbortError')return}}
 const u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);toast('⬇ بدأ تنزيل النسخة — ستجدها في التنزيلات',4500);bkSheet()}
function bkParse(txt){let o;try{o=JSON.parse(txt)}catch(e){return null}if(!o||o.app!='legal-library'||!o.data||typeof o.data!='object')return null;const d={};
 BKEYS.forEach(k=>{if(typeof o.data[k]=='string'&&o.data[k].length<4e6){try{JSON.parse(o.data[k]);d[k]=o.data[k]}catch(e){}}});return{d,date:o.date,ver:o.ver}}
function bkMerge(b){const pj=k=>{try{return JSON.parse(b[k])}catch(e){return null}},set=(k,v)=>localStorage.setItem(k,JSON.stringify(v)),uni=(a,c)=>[...new Set([...(a||[]),...(c||[])])];
 const fa=pj('fav');if(Array.isArray(fa))set('fav',uni(bkGet('fav'),fa));
 const ra=pj('rec');if(Array.isArray(ra))set('rec',uni(bkGet('rec'),ra).slice(0,30));
 const bl=pj('lists');if(Array.isArray(bl)){const l=bkGet('lists')||[];bl.forEach(c=>{const m=l.find(x=>x.id==c.id);if(!m)l.push(c);else{m.items=uni(m.items,c.items);const sm=new Map((m.sessions||[]).map(s=>[s.id,s]));(c.sessions||[]).forEach(s=>{if(!sm.has(s.id))sm.set(s.id,s)});m.sessions=[...sm.values()];['no','year','court','circuit','client','opp','notes','status','mw','chk'].forEach(f=>{if(!m[f]&&c[f])m[f]=c[f]})}});set('lists',l)}
 const bd=pj('dls');if(Array.isArray(bd)){const l=bkGet('dls')||[];bd.forEach(x=>{if(!l.some(y=>y.id==x.id))l.push(x)});set('dls',l)}
 ['pa','acc'].forEach(k=>{const b=pj(k);if(Array.isArray(b)){const l=bkGet(k)||[];b.forEach(x=>{if(!l.some(y=>y.id==x.id))l.push(x)});set(k,l)}});
 const bc=pj('cnt');if(bc&&typeof bc=='object'){const l=bkGet('cnt')||{};for(const i in bc)l[i]=Math.max(l[i]||0,bc[i]||0);set('cnt',l)}
 ['fp','fc'].forEach(k=>{const x=pj(k);if(x&&typeof x=='object'){const l=bkGet(k)||{};for(const i in x)if(!l[i])l[i]=x[i];set(k,l)}})}
function bkReplace(b){BKEYS.forEach(k=>{if(k in b)localStorage.setItem(k,b[k]);else localStorage.removeItem(k)})}
function bkBanner(){const dd=bkDays(),x=localStorage.getItem('bkx'),has=(typeof CLS!='undefined'&&CLS.length)||(typeof DLS!='undefined'&&DLS.length);
 if(!has)return'';if(x&&Math.floor((today12()-parseD(x))/864e5)<14)return'';if(dd!=null&&dd<=30)return'';
 return `<div class="dlw" data-act="bk">💾 ${dd==null?'لم تحفظ نسخة احتياطية من قضاياك بعد':'آخر نسخة احتياطية منذ '+dd+' يوماً'} — اضغط للحفظ <button class="lnk" data-act="bkx" style="float:left">لاحقاً</button></div>`}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='bk')bkSheet();else if(a=='bkexp')await bkExport();
 else if(a=='bkx'){e.stopPropagation();try{localStorage.setItem('bkx',isoD(new Date()))}catch(x){}render()}
 else if(a=='bkmerge'&&BKP){bkMerge(BKP.d);toast('تم دمج البيانات',2000);setTimeout(()=>location.reload(),700)}
 else if(a=='bkrep'&&BKP&&confirm('سيتم استبدال كل بياناتك الحالية ببيانات النسخة. هل أنت متأكد؟')){bkReplace(BKP.d);toast('تمت الاستعادة',2000);setTimeout(()=>location.reload(),700)}});
document.addEventListener('change',async e=>{if(e.target.id!='bkf')return;const f=e.target.files[0];if(!f)return;const p=bkParse(await f.text());
 if(!p){toast('الملف ليس نسخة صالحة من المكتبة',3500);return}BKP=p;
 sheet(`<h2 class="sht">📂 استعادة نسخة</h2><div class="shm">تاريخ النسخة: ${esc2((p.date||'').slice(0,10)||'غير معروف')}<br>تحتوي: ${bkCount(p.d)}</div><div class="acts one"><button class="btn pri" data-act="bkmerge">🔀 دمج مع بياناتي الحالية (الأسلم)</button><button class="btn" data-act="bkrep">♻️ استبدال بياناتي بالنسخة</button></div><div class="shm" style="margin-top:10px">الدمج يضيف ما هو ناقص دون حذف شيء. الاستبدال يمسح بياناتك الحالية ويضع النسخة مكانها.</div>`)});
