/* الترحيب والتنبيهات (1.14.2): نافذة عند أول فتح تعرض «اشترك / جرّب 14 يوماً / لديّ كود»، ولافتة في الرئيسية عند كل فتح لمن هو على
   المجاني أو التجربة أو بعد انتهاء التجربة. لا أثر ما دام PRO.enabled=false، ولا تظهر لمشترك Pro فعّال. */
const wlDay=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
let _wlx=false;
function wlKind(s){if(typeof PRO=='undefined'||!PRO.enabled)return null;s=s||proStatus();
 if(s.state=='pro')return null;if(s.state=='expired'&&s.plan)return null;
 return s.state=='trial'?'trial':(s.trialEnded?'ended':'free')}
function wlHtml(){const s=proStatus(),k=wlKind(s);if(!k||_wlx)return '';
 const sub='<button class="btn pri" data-act="prosub">💳 اشترك الآن</button>',code='<button class="btn" data-act="pro">🔑 لديّ كود</button>',tr='<button class="btn" data-act="wltrial">🎁 جرّب '+(PRO.trialDays||14)+' يوماً</button>';
 const x='<button class="rx" data-act="wlx" aria-label="إخفاء">✕</button>';
 if(k=='trial')return `<div class="evn wlb">${x}<b>⏳ تجربة Pro — متبقٍ ${s.daysLeft} ${s.daysLeft==1?'يوم':'أيام'}</b><small>للاشتراك الدائم أو إدخال كود التفعيل اضغط هنا</small><div class="acts">${sub}${code}</div></div>`;
 if(k=='ended')return `<div class="evn wlb wend">${x}<b>⌛ انتهت فترة التجربة</b><small>المزايا المجانية وبياناتك كما هي — اشترك لإعادة تشغيل مزايا Pro</small><div class="acts">${sub}${code}</div></div>`;
 return `<div class="evn wlb">${x}<b>🎁 جرّب Pro ${PRO.trialDays||14} يوماً مجاناً</b><small>المواريث والأتعاب وتجهيز المستندات وقضايا غير محدودة</small><div class="acts">${tr}${sub}</div></div>`}
function wlRefresh(){const m=document.querySelector('#m');if(!m)return;const o=m.querySelector('.wlb');if(o)o.remove();
 if(typeof S=='undefined'||S.tab!='home')return;const h=wlHtml();if(h)m.insertAdjacentHTML('afterbegin',h)}
/* النافذة المنبثقة */
function wlSheet(k,s){const price=typeof proPrice=='function'?proPrice():PRO.price,
 t=k=='trial'?`⏳ تنتهي تجربتك خلال ${s.daysLeft} ${s.daysLeft==1?'يوم':'أيام'}`:k=='ended'?'⌛ انتهت فترة التجربة':'👋 مرحباً بك في المكتبة القانونية',
 d=k=='free'?'المكتبة والبحث والصيغ والأجندة وحاسبة المواعيد والنسخة الاحتياطية <b>مجانية دائماً</b>. أما <b>Pro</b> فيضيف: المواريث، الأتعاب والحسابات، تجهيز المستندات (التصدير)، تعبئة بلا حدود، وقضايا وتوكيلات غير محدودة.':'المزايا المجانية وبياناتك كما هي. اشترك في Pro لتستمر مزايا المواريث والأتعاب والتصدير والتعبئة غير المحدودة.';
 sheet(`<h2 class="sht">${t}</h2><div class="pst"><div>${d}</div></div><div class="acts"><button class="btn pri span2" data-act="prosub">💳 اشترك الآن — ${price} جنيه / سنة</button>${k=='free'?'<button class="btn span2" data-act="wltrial">🎁 جرّب '+(PRO.trialDays||14)+' يوماً مجاناً</button>':''}<button class="btn" data-act="pro">🔑 لديّ كود</button><button class="btn" data-act="pgclose">${k=='free'?'متابعة بالمجاني':'لاحقاً'}</button></div>`)}
function wlOpen(tries){tries=tries||0;if(typeof PRO=='undefined'||!PRO.enabled)return;
 if(document.querySelector('#lk')||(document.querySelector('#sh')||{classList:{contains:()=>false}}).classList.contains('open')){if(tries<240)setTimeout(()=>wlOpen(tries+1),500);return}
 const s=proStatus(),k=wlKind(s);if(!k)return;const d=wlDay();
 if(k=='free'){if(_l('wlc','')){return}_s('wlc',d)}
 else if(k=='ended'){if(_l('wld','')===d)return;_s('wld',d)}
 else{if(s.daysLeft>3||_l('wld','')===d)return;_s('wld',d)}
 wlSheet(k,s)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||typeof PRO=='undefined'||!PRO.enabled)return;const a=el.dataset.act;
 if(a=='wltrial'){proStartTrial();closeSheet();toast('بدأت تجربة Pro — '+(PRO.trialDays||14)+' يوماً ✔ كل المزايا مفتوحة',3500);wlRefresh()}
 else if(a=='wlx'){_wlx=true;const o=document.querySelector('.wlb');if(o)o.remove()}});
(function(){if(typeof PRO=='undefined'||!PRO.enabled)return;
 if(typeof render=='function'){const r0=render;render=function(){r0.apply(this,arguments);try{wlRefresh()}catch(e){}}}
 const go=()=>{try{wlRefresh()}catch(e){}setTimeout(wlOpen,900)};
 if(typeof _proReady!='undefined')_proReady.then(go);else go();
 if(typeof proInit=='function'){const p0=proInit;proInit=async function(){const r=await p0.apply(this,arguments);try{wlRefresh()}catch(e){}return r}}})();
