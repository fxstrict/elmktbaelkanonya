/* واجهة Pro (P3): زر «⭐ Pro» وشارة الحالة وشاشة التفعيل. كل شيء مخفي ولا يعمل ما دام PRO.enabled=false. */
const PRO_PLAN_AR={pro:'اشتراك سنوي',event:'تذكرة ندوة (30 يوماً)'};
const PRO_ERR={bad:'الكود غير صحيح — تأكد من نسخه كاملاً',nokey:'التفعيل غير مهيّأ بعد في هذا الإصدار',sig:'الكود غير صالح (لم يصدر من جهتنا)',expired:'هذا الكود منتهي الصلاحية',revoked:'تم إبطال هذا الكود — تواصل معنا'};
const proExpDate=e=>new Date(PRO_EPOCH+e*864e5).toISOString().slice(0,10);
function proBadge(){const s=proStatus();
 if(s.state=='pro')return 'مفعّل · '+s.daysLeft+' يوماً';
 if(s.state=='trial')return 'تجربة · '+s.daysLeft+' يوماً';
 if(s.state=='expired')return s.revoked?'مُبطَل':'منتهٍ';
 return 'تفعيل'}
/* زر الأدوات: لا يظهر شيء إن كان النظام مغلقاً */
function proBtn(){if(typeof PRO=='undefined'||!PRO.enabled)return'';return `<button class="btn span2 acc" data-act="pro">⭐ Pro — ${proBadge()}</button>`}
function proSheet(msg){
 if(typeof PRO=='undefined'||!PRO.enabled)return;
 const s=proStatus(),wa='https://wa.me/'+(PRO.wa||CONTACT.wa)+'?text='+encodeURIComponent('أرغب في الحصول على كود اشتراك Pro في المكتبة القانونية');
 let card='';
 if(s.state=='pro')card=`<div class="pst"><b>⭐ مفعّل — ${PRO_PLAN_AR[s.plan]||''}</b><div>مرخَّص باسم: ${esc2(s.label||'—')}</div><small>ينتهي في ${proExpDate(s.exp)} (متبقٍ ${s.daysLeft} يوماً)</small>${typeof evUpgrade=='function'?evUpgrade(s):''}${typeof proRenewBtn=='function'?proRenewBtn(s):''}</div>`;
 else if(s.state=='trial')card=`<div class="pst"><b>⏳ فترة تجربة</b><small>متبقٍ ${s.daysLeft} يوماً — كل مزايا Pro متاحة خلالها</small></div>`;
 else if(s.state=='expired')card=`<div class="pst"><b>${s.revoked?'⛔ الكود مُبطَل':'⌛ انتهى الاشتراك'}</b>${s.label?`<div>مرخَّص باسم: ${esc2(s.label)}</div>`:''}<small>${s.plan?'انتهى في '+proExpDate(s.exp)+' — ':''}أدخل كوداً جديداً للتجديد. بياناتك ومزاياك المجانية كما هي.</small>${typeof proRenewBtn=='function'?proRenewBtn(s):''}</div>`;
 else card=`<div class="pst"><b>المكتبة والبحث والصيغ والأجندة مجانية دائماً</b><small>Pro يضيف المواريث والأتعاب والتصدير وقضايا غير محدودة. أدخل كوداً أو جرّب ${PRO.trialDays||14} يوماً مجاناً.</small></div>`;
 const m=msg?`<div class="pm ${msg.ok?'ok':'er'}">${esc2(msg.text)}</div>`:'';
 const act=s.state=='pro'?`<div class="acts one"><button class="btn wide2" data-act="prooff">إلغاء التفعيل على هذا الجهاز</button></div>`:
  `<label class="fld"><span>كود التفعيل (أو الصق رسالة الواتساب كاملة)</span><input id="pcode" dir="ltr" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="LL1.…"></label><div id="pmsg">${m}</div><div class="acts"><button class="btn pri" data-act="proact">✔ تفعيل</button><button class="btn" data-act="propaste">📋 لصق</button>${s.state=='off'&&!s.trialEnded?'<button class="btn span2" data-act="protrial">🎁 ابدأ تجربة '+(PRO.trialDays||14)+' يوماً</button>':''}<button class="btn span2" data-act="prosub">💳 الاشتراك والأسعار</button><a class="btn span2" target="_blank" rel="noopener" href="${wa}">💬 طلب كود عبر واتساب</a></div>`;
 sheet(`<h2 class="sht">⭐ Pro</h2>${card}${s.state=='pro'?m:''}${act}`)}
function proMsg(r){return r.ok?{ok:1,text:'تم التفعيل ✔ — مرخَّص باسم: '+(r.label||'—')}:{ok:0,text:(PRO_ERR[r.err]||PRO_ERR.bad)+(r.label&&r.err!='bad'?' ('+r.label+')':'')}}
const proCode=v=>{const m=String(v||'').match(/LL1\.[A-Za-z2-7]+\.[A-Za-z2-7]+/);return m?m[0]:String(v||'').trim()};
async function proDoActivate(v){
 const r=await proActivate(proCode(v));
 if(r.ok)await proInit();
 return r}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='pro')proSheet();
 else if(a=='proact'){const i=document.querySelector('#pcode'),v=i?i.value.trim():'';
  if(!v){toast('الصق الكود أولاً');return}
  const r=await proDoActivate(v);
  if(r.ok){toast('تم التفعيل ✔',2000);proSheet(proMsg(r))}
  else{const b=document.querySelector('#pmsg'),x=proMsg(r);if(b)b.innerHTML=`<div class="pm er">${esc2(x.text)}</div>`}}
 else if(a=='propaste'){try{const t=await navigator.clipboard.readText(),i=document.querySelector('#pcode');if(i&&t){i.value=proCode(t)}else toast('الحافظة فارغة')}catch(x){toast('تعذّر اللصق — الصق يدوياً في الخانة')}}
 else if(a=='protrial'){proStartTrial();toast('بدأت التجربة ✔',2000);proSheet()}
 else if(a=='prooff')proOffAsk();
 else if(a=='prooffgo')await proOffGo()});
/* إلغاء التفعيل: تحذير صريح + رمز القفل إن كان مفعّلاً (وإلا زر تأكيد) */
function proOffAsk(){const hp=typeof llHasPin=='function'&&llHasPin(),wa='https://wa.me/'+(PRO.wa||CONTACT.wa)+'?text='+encodeURIComponent('السلام عليكم، أحتاج مساعدة في إعادة تفعيل اشتراكي في المكتبة القانونية.');
 sheet(`<h2 class="sht">⚠️ إلغاء التفعيل</h2><div class="wn"><b>تحذير:</b> سيُمسح الكود من هذا الجهاز وتعود ميزات Pro مقفلة فوراً. لا يمكن التراجع تلقائياً: لإعادة التفعيل يجب إدخال الكود نفسه مرة أخرى، وإن لم يكن معك فتواصل مع الدعم عبر واتساب.</div><div class="shm">${hp?'سيُطلب منك رمز قفل التطبيق للتأكيد.':'نصيحة: فعّل «قفل التطبيق» برمز من الأدوات لتحمي اشتراكك من الإلغاء غير المقصود.'}</div><div class="acts"><button class="btn pri span2" data-act="pro">← تراجع</button><button class="btn span2" data-act="prooffgo">🗑 نعم، ألغِ التفعيل</button><a class="btn span2" target="_blank" rel="noopener" href="${wa}">💬 تواصل مع الدعم</a></div>`)}
async function proOffGo(){if(typeof llHasPin=='function'&&llHasPin()){closeSheet();const ok=await llCheckPin();if(!ok){proSheet();return}}
 proDeactivate();await proInit();toast('تم إلغاء التفعيل على هذا الجهاز',3000);proSheet()}
/* رابط التفعيل: https://الموقع/#act=الكود — يُمسح من العنوان فور قراءته */
async function proHash(){
 const m=/[#&]act=([^&]+)/.exec(location.hash);if(!m)return;
 let code='';try{code=decodeURIComponent(m[1])}catch(e){code=m[1]}
 try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
 if(!PRO.enabled){toast('نظام Pro غير مفعّل بعد',3000);return}
 await _proReady;
 const r=await proDoActivate(code);proSheet(proMsg(r))}
const _proReady=(typeof PRO!='undefined'&&PRO.enabled)?proInit().catch(()=>{}):Promise.resolve();
_proReady.then(proHash);
addEventListener('hashchange',proHash);
/* استعادة النسخة الاحتياطية: لا يُستعاد كود منتهٍ/مُبطَل/غير صالح، ولا يُستبدل كود أحدث بأقدم، ولا تُعاد التجربة للأمام */
async function proRestore(b){
 try{
  if(b.trial0){const t=JSON.parse(b.trial0),c=_l('trial0',0);if(Number.isFinite(t)&&t>0&&(!c||t<c))_s('trial0',t)}
  if(b.lic){const code=JSON.parse(b.lic),v=await proVerify(code);
   if(v.ok&&!v.expired&&!v.revoked){const cur=proParse(_l('lic',''));if(!cur||v.exp>cur.exp)_s('lic',code)}}
 }catch(e){}}
