/* المشاركة بالرابط (1.15.0): أي صيغة أو كتاب أو موسوعة أو ملف/قسم في المكتبة الحيّة يُشارَك برابط «البرنامج» لا برابط درايف.
   الرابط: https://الموقع/?s=<نوع><معرّف>[&n=الاسم][&m=d|s|p]   (يُقبل أيضاً #s=… بنفس الصيغة)
   النوع: i = صيغة/كتاب/موسوعة من data/ ، f = ملف من المكتبة الحيّة ، d = قسم (مجلد) من المكتبة الحيّة.
   عند الفتح: يعمل البرنامج ثم تُفتح الصيغة مباشرة مع بطاقة دعوة لتصفّح المكتبة وتجربة Pro. لا تخزين ولا تتبّع ولا مفاتيح جديدة. */
const SH={arrived:null};
const shOk=s=>/^[\w-]{10,90}$/.test(s||'');
/* عنوان الموقع الأساسي: SHARE_SITE في config.js إن وُجد وإلا عنوان الصفحة الحالي بلا استعلام */
function shBase(){let b=(typeof SHARE_SITE!='undefined'&&SHARE_SITE)||(location.origin+location.pathname);return b.replace(/index\.html$/,'').split('#')[0].split('?')[0]}
/* تقصير اسم الملف مع إبقاء الامتداد (لتبقى أيقونة النوع صحيحة عند المستلم) */
function shName(n){n=String(n||'').trim();if(n.length<=70)return n;const m=n.match(/\.[A-Za-z0-9]{2,5}$/),x=m?m[0]:'';return n.slice(0,70-x.length)+x}
const shMime=m=>m=='application/vnd.google-apps.document'?'d':m=='application/vnd.google-apps.spreadsheet'?'s':m=='application/vnd.google-apps.presentation'?'p':'';
const shUnMime=c=>c=='d'?'application/vnd.google-apps.document':c=='s'?'application/vnd.google-apps.spreadsheet':c=='p'?'application/vnd.google-apps.presentation':'';
const shItemUrl=id=>shBase()+'?s=i'+id;
const shLvUrl=f=>shBase()+'?s=f'+f.id+'&n='+encodeURIComponent(shName(f.n))+(shMime(f.m)?'&m='+shMime(f.m):'');
const shDirUrl=(id,n)=>shBase()+'?s=d'+id+'&n='+encodeURIComponent(shName(n));
/* نص الرسالة المصاحبة للرابط (العنوان يظهر في الرسالة لأن معاينة الرابط في واتساب/فيسبوك ثابتة للموقع كله) */
function shText(title,sub,url){return '📌 «'+title+'»\n'+sub+'\nافتحها مباشرة داخل المكتبة القانونية ⚖️👇\n'+url}
function shInfo(id){const d=byId[id];return{title:d[1].replace(/\s*\(\d+ جزءاً\)$/,''),sub:'📂 '+d.t+' · '+d.b,url:shItemUrl(id)}}
function shCopy(url){if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(()=>toast('✔ تم نسخ رابط المشاركة'),()=>toast(url,4000));else toast(url,4000)}
/* مشاركة: نافذة النظام إن وُجدت (واتساب/فيسبوك/تيليجرام…) وإلا نافذة أزرار */
function shGo(i){const t=shText(i.title,i.sub,i.url);
 if(navigator.share){navigator.share({title:i.title,text:t}).catch(e=>{if(e&&e.name!='AbortError')shSheet(i)});return}
 shSheet(i)}
function shSheet(i){const t=shText(i.title,i.sub,i.url),e=encodeURIComponent;
 sheet(`<h2 class="sht">📤 مشاركة</h2><div class="shm">${esc2(i.title)}</div><div class="shm">من يفتح الرابط يدخل <b>المكتبة القانونية</b> وتُفتح له هذه الصيغة مباشرة.</div><div class="acts"><a class="btn pri" target="_blank" rel="noopener" href="https://wa.me/?text=${e(t)}">💬 واتساب</a><a class="btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${e(i.url)}">📘 فيسبوك</a><a class="btn" target="_blank" rel="noopener" href="https://t.me/share/url?url=${e(i.url)}&text=${e('📌 «'+i.title+'»\n'+i.sub)}">✈️ تيليجرام</a><button class="btn" data-act="shcopyt" data-t="${esc2(t)}">📋 نسخ الرسالة</button><button class="btn wide2" data-act="shcopyu" data-t="${esc2(i.url)}">🔗 نسخ الرابط فقط</button></div>`)}
function shItem(id){if(byId[id])shGo(shInfo(id))}
function shLv(f){shGo({title:lvName(f),sub:'📖 '+lvType(f)+' من المكتبة القانونية',url:shLvUrl(f)})}
function shDir(id,n){shGo({title:n,sub:'📁 قسم من المكتبة القانونية',url:shDirUrl(id,n)})}

/* ---------- الاستقبال: فتح الرابط المُشارَك ---------- */
function shParse(){let p;try{p=new URLSearchParams(location.search)}catch(e){return null}
 let s=p.get('s'),n=p.get('n')||'',m=p.get('m')||'';
 if(!s){const h=/[#&]s=([^&]+)/.exec(location.hash||'');if(h){s=decodeURIComponent(h[1]);const hn=/[#&]n=([^&]+)/.exec(location.hash),hm=/[#&]m=([^&]+)/.exec(location.hash);n=hn?decodeURIComponent(hn[1]):'';m=hm?hm[1]:''}}
 if(!s||s.length<11||!'ifd'.includes(s[0])||!shOk(s.slice(1)))return null;
 return{k:s[0],id:s.slice(1),n:n.slice(0,100),m:/^[dsp]$/.test(m)?m:''}}
function shClean(){try{history.replaceState(null,'',location.pathname)}catch(e){}}
/* بطاقة دعوة تظهر لمن وصلته الصيغة بالرابط: تصفّح المكتبة + تجربة Pro / اشتراك (للمجاني فقط) */
function shPromo(){let k=null;try{k=typeof wlKind=='function'?wlKind():null}catch(e){}
 const trial=k=='free'||k=='ended'?`<button class="btn" data-act="wltrial">🎁 جرّب Pro ${PRO.trialDays||14} يوماً</button>`:'',sub=k?'<button class="btn" data-act="prosub">💳 اشترك</button>':'';
 return `<div class="evn shp"><b>📚 المكتبة القانونية — ${D.length} صيغة وكتاب</b><small>وصلتك هذه الصيغة عبر المكتبة. التصفّح والبحث والتحميل مجانيان، ويضيف Pro المواريث والأتعاب وتجهيز المستندات.</small><div class="acts"><button class="btn pri" data-act="shbrowse">📚 تصفّح المكتبة</button>${trial}${sub}</div></div>`}
function shPromoAdd(){const a=document.querySelector('#sh .acts');if(a)a.insertAdjacentHTML('afterend',shPromo())}
function shOpen(r){SH.arrived=r;
 if(r.k=='i'){if(!byId[r.id]){toast('هذه الصيغة غير موجودة في هذا الإصدار — حدّث التطبيق أو تصفّح المكتبة',4000);return}itemSheet(r.id);shPromoAdd();return}
 if(r.k=='f'){lvFileSheet({id:r.id,n:r.n||'ملف',m:shUnMime(r.m),s:0,t:''});shPromoAdd();return}
 if(r.k=='d'){const n=r.n||'قسم من المكتبة';
  if(typeof lvKey=='function'&&lvKey()){go('lib');LV.stack=[{id:r.id,n}];S.q='';lvShow();toast('📁 '+n,2500);return}
  sheet(`<h2 class="sht">📁 ${esc2(n)}</h2><div class="shm">قسم من المكتبة القانونية — يُفتح في درايف.</div><div class="acts one"><a class="btn pri" target="_blank" rel="noopener" href="https://drive.google.com/drive/folders/${r.id}">📂 فتح القسم</a></div>`);shPromoAdd()}}
function shArrive(tries){tries=tries||0;const r=SH.pend;if(!r)return;
 if(document.querySelector('#lk')){if(tries<240)setTimeout(()=>shArrive(tries+1),500);return}
 SH.pend=null;shOpen(r)}
(function(){const r=shParse();if(!r)return;window._shArr=true;SH.pend=r;shClean();setTimeout(shArrive,150)})();
addEventListener('hashchange',()=>{const r=shParse();if(r){SH.pend=r;shClean();shArrive()}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='shbrowse'){closeSheet();go('home')}
 else if(a=='shcopyt'||a=='shcopyu'){if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(el.dataset.t||'').then(()=>toast('✔ تم النسخ'),()=>toast('تعذّر النسخ'));else toast('تعذّر النسخ')}
 else if(a=='lvshare'){if(LV.file)shLv(LV.file)}
 else if(a=='shfolder'){const t=LV.stack[LV.stack.length-1];if(t)shDir(t.id,t.n)}});
