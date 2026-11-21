/* التجديد والإبطال (P8): تنبيه قبل انتهاء الاشتراك بـ14 يوماً، لافتة الانتهاء/الإبطال، شاشة التجديد، وإعادة فحص data/revoked.json عند العودة للتطبيق.
   لا أثر ما دام PRO.enabled=false. الإبطال نفسه (قراءة revoked.json وتخزين revk) في pro.js. */
const PRO_WARN_DAYS=14,PRO_WARN_EVENT=7;
const rnwDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
/* هل تلزم لافتة/تنبيه؟ — {kind:'soon'|'expired'|'revoked',days,s} أو null. لا تنبيه للتجربة ولا لمن لم يشترك قط */
function proRenewInfo(s){
 if(typeof PRO=='undefined'||!PRO.enabled)return null;s=s||proStatus();
 if(s.state=='pro'){const lim=s.plan=='event'?PRO_WARN_EVENT:(PRO.warnDays||PRO_WARN_DAYS);return s.daysLeft<=lim?{kind:'soon',days:s.daysLeft,s}:null}
 if(s.state=='expired'&&s.plan)return{kind:s.revoked?'revoked':'expired',days:0,s};
 return null}
const rnwLeft=d=>d<=0?'ينتهي اشتراكك اليوم':d==1?'ينتهي اشتراكك غداً':'ينتهي اشتراكك خلال '+d+' يوماً';
function proRenewBtn(s){const i=proRenewInfo(s);return i&&i.kind!='revoked'?'<div class="acts one"><button class="btn pri" data-act="prorenew">🔄 تجديد الاشتراك</button></div>':(i?'<div class="acts one"><button class="btn" data-act="prorenew">💬 تواصل معنا</button></div>':'')}
function proRenewPrice(){return PRO.renewPrice>0?PRO.renewPrice:(typeof proPrice=='function'?proPrice():PRO.price)}
/* لافتة الرئيسية — تُخفى لبقية اليوم بزر ✕ */
function rnwHtml(){
 const i=proRenewInfo();if(!i||_l('rnwd','')===rnwDay())return '';
 const t=i.kind=='soon'?'⏰ '+rnwLeft(i.days):i.kind=='revoked'?'⛔ تم إبطال كود الاشتراك':'⌛ انتهى اشتراك Pro',
  b=i.kind=='revoked'?'تواصل معنا':'🔄 جدّد الآن';
 return `<div class="evn rnw"><button class="rx" data-act="rnwx" aria-label="إخفاء">✕</button><b>${t}</b><small>مزاياك المجانية وبياناتك كما هي${i.kind=='soon'?' — جدّد قبل الانتهاء لتستمر مزايا Pro':''}</small><div class="acts one"><button class="btn pri" data-act="prorenew">${b}</button></div></div>`}
function rnwRefresh(){
 const m=document.querySelector('#m');if(!m)return;const o=m.querySelector('.rnw');if(o)o.remove();
 if(typeof S=='undefined'||S.tab!='home')return;const h=rnwHtml();if(h)m.insertAdjacentHTML('afterbegin',h)}
/* شاشة التجديد */
function proRenewSheet(){
 if(typeof PRO=='undefined'||!PRO.enabled)return;
 const s=proStatus();
 if(!s.plan){if(typeof proSubSheet=='function')proSubSheet();return}
 const wa='https://wa.me/'+(PRO.wa||CONTACT.wa),dt=proExpDate(s.exp),pay=typeof proPayList=='function'?proPayList():[];
 if(s.revoked){
  sheet(`<div class="shh"><h2 class="sht">⛔ الكود مُبطَل</h2><button class="lnk" data-act="pro">← لديّ كود</button></div><div class="pst"><b>تم إبطال هذا الكود</b><div>مرخَّص باسم: ${esc2(s.label||'—')}</div><small>الرقم التسلسلي ${s.serial}. تواصل معنا لمعرفة السبب أو لإصدار كود جديد.</small></div><div class="acts one"><button class="btn pri" data-act="prorwa" data-k="rev">💬 تواصل عبر واتساب</button></div>`);return}
 const price=proRenewPrice(),st=s.state=='pro'?`ينتهي في ${dt} (متبقٍ ${s.daysLeft} يوماً)`:`انتهى في ${dt}`;
 const pm=pay.length?pay.map((p,i)=>`<div class="pr"><span><b>${esc2(p[0])}</b><br><small dir="ltr">${esc2(p[1])}</small></span><button class="pill" data-act="procopy" data-i="${i}">نسخ</button></div>`).join(''):'<div class="shm">تواصل معنا عبر واتساب لمعرفة وسيلة الدفع المناسبة.</div>';
 sheet(`<div class="shh"><h2 class="sht">🔄 تجديد Pro</h2><button class="lnk" data-act="pro">← لديّ كود</button></div>
<div class="pst"><b>${s.state=='pro'?'⭐ اشتراكك فعّال':'⌛ انتهى اشتراكك'}</b><div>مرخَّص باسم: ${esc2(s.label||'—')}</div><small>${st}</small></div>
<div class="cres"><b>${price} جنيه / سنة</b><span>تجديد الاشتراك السنوي</span></div>
<div class="shm">طريقة الدفع</div>${pm}${PRO.pay?`<div class="acts one"><a class="btn pri" target="_blank" rel="noopener" href="${esc2(PRO.pay)}">💳 ادفع أونلاين</a></div>`:''}
<label class="fld"><span>الاسم (كما في الترخيص)</span><input id="rnn" maxlength="30" autocomplete="name" value="${esc2(s.label||'')}"></label>
<div class="shm">بعد الدفع أرسل الإيصال عبر واتساب وسنرد بكود التجديد. الصق الكود الجديد في «لديّ كود».</div>
<div class="acts"><button class="btn pri span2" data-act="prorwa" data-k="renew">💬 أرسل الإيصال عبر واتساب</button><button class="btn span2" data-act="pro">🔑 لصق كود التجديد</button></div>`)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||typeof PRO=='undefined'||!PRO.enabled)return;const a=el.dataset.act;
 if(a=='prorenew')proRenewSheet();
 else if(a=='rnwx'){_s('rnwd',rnwDay());const o=document.querySelector('.rnw');if(o)o.remove()}
 else if(a=='prorwa'){const s=proStatus();let t;
  if(el.dataset.k=='rev')t=`السلام عليكم، كود اشتراكي في المكتبة القانونية (رقم ${s.serial}) ظهر كمُبطَل. أرجو التواصل.\nالاسم: ${s.label||'—'}`;
  else{const n=((document.querySelector('#rnn')||{}).value||'').trim()||s.label||'';
   if(!n){toast('اكتب اسمك أولاً');return}
   t=`السلام عليكم، أرغب في تجديد اشتراك Pro في المكتبة القانونية.\nالاسم: ${n}\nالرقم التسلسلي: ${s.serial}\n${s.state=='pro'?'ينتهي':'انتهى'} في: ${proExpDate(s.exp)}\nالمبلغ: ${proRenewPrice()} جنيه\nأرفق إيصال الدفع.`}
  open('https://wa.me/'+(PRO.wa||CONTACT.wa)+'?text='+encodeURIComponent(t),'_blank')}});
/* ربط: بعد كل proInit (فتح/تفعيل/إلغاء) حدّث اللافتة؛ وعند العودة للتطبيق أعد قراءة revoked.json كل 6 ساعات على الأكثر */
(function(){
 if(typeof PRO=='undefined')return;
 if(typeof proInit=='function'){const p0=proInit;proInit=async function(){const r=await p0.apply(this,arguments);try{rnwRefresh()}catch(e){}return r}}
 if(typeof render=='function'){const r0=render;render=function(){r0.apply(this,arguments);try{rnwRefresh()}catch(e){}}}
 if(typeof _proReady!='undefined')_proReady.then(()=>{try{rnwRefresh()}catch(e){}});
 let last=Date.now();
 document.addEventListener('visibilitychange',async()=>{
  if(document.hidden||!PRO.enabled)return;
  if(Date.now()-last>=6*36e5){last=Date.now();try{await proLoadRevoked()}catch(e){}}
  try{rnwRefresh()}catch(e){}})})();
