/* المشاركة بالرابط (1.15.0): أي صيغة أو كتاب أو موسوعة أو ملف/قسم في المكتبة الحيّة يُشارَك برابط «البرنامج» لا برابط درايف.
   الرابط: https://الموقع/?s=<نوع><معرّف>[&n=الاسم][&m=d|s|p]   (يُقبل أيضاً #s=… بنفس الصيغة)
   (1.16.5) الرابط أقصر وبكلمات عربية مقروءة بلا رموز %: معرّف الصيغة/الباركود يُختصر لأقصر بادئة فريدة (8 أحرف أو أكثر) ويُقبل الطويل القديم، والاسم يُكتب عربياً بشرطات (باركود-أسرة-الخليفة-…) لتظهر الكلمات المفتاحية للمستلم ولمحركات البحث.
   النوع: i = صيغة/كتاب/موسوعة من data/ ، f = ملف من المكتبة الحيّة ، d = قسم (مجلد) من المكتبة الحيّة.
   عند الفتح: يعمل البرنامج ثم تُفتح الصيغة مباشرة مع بطاقة دعوة لتصفّح المكتبة وتجربة Pro. لا تخزين ولا تتبّع ولا مفاتيح جديدة. */
const SH={arrived:null};
const shOk=s=>/^[\w-]{10,90}$/.test(s||'');
/* ---- (1.16.5) روابط أقصر وأوضح ---- */
const shOkS=s=>/^[\w-]{6,90}$/.test(s||'');
/* ترميز مقروء: الحروف العربية والأرقام تبقى كما هي، والمسافة «+» (تُقرأ مسافة عند الاستقبال)، وغيرها يُرمَّز بالطريقة المعتادة */
function shQ(n){const ar=/^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+$/;
 return String(n||'').split(' ').map(w=>encodeURIComponent(w).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase()).replace(/(?:%[0-9A-F]{2})+/g,m=>{try{const d=decodeURIComponent(m);return ar.test(d)?d:m}catch(e){return m}})).join('+')}
/* نص بكلمات مفتاحية بشرطات: بلا تشكيل ولا علامات، بحد أقصى max حرفاً مع القطع عند حدّ كلمة */
function shSlug(t,max){max=max||64;let s=String(t||'').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[&?#%=+\/\\"'`<>«»()\[\]{}|^~:;,،؛؟!.…•·–—]/g,' ').trim().replace(/[\s_-]+/g,'-').replace(/^-+|-+$/g,'');
 if(s.length>max){s=s.slice(0,max);const i=s.lastIndexOf('-');if(i>max*0.5)s=s.slice(0,i)}return s}
/* عكس الشرطات إلى مسافات عند العرض (عنوان احتياطي إن لم تُوجد الصيغة محلياً) */
const shUnslug=n=>String(n||'').replace(/-+/g,' ').replace(/\s+/g,' ').trim();
/* أقصر بادئة فريدة (8 أحرف أو أكثر) لمعرّف ضمن قائمة معرّفات */
function shShort(id,keys){id=String(id||'');for(let L=8;L<id.length;L++){const p=id.slice(0,L);let c=0;for(const k of keys){if(k.startsWith(p)&&++c>1)break}if(c<2)return p}return id}
function shKeys(k){if(k=='i')return Object.keys(byId);if(!SH.bk){SH.bk=[];if(typeof BARCODES!='undefined')BARCODES.forEach(g=>g.items.forEach(r=>SH.bk.push(r[0])))}return SH.bk}
/* استرجاع المعرّف الكامل من البادئة (ويقبل الكامل) */
function shFull(k,id){const L=shKeys(k);if(L.includes(id))return id;if(id.length<6)return id;return L.find(x=>x.startsWith(id))||id}
/* عنوان الموقع الأساسي: SHARE_SITE في config.js إن وُجد وإلا عنوان الصفحة الحالي بلا استعلام */
function shBase(){let b=(typeof SHARE_SITE!='undefined'&&SHARE_SITE)||(location.origin+location.pathname);return b.replace(/index\.html$/,'').split('#')[0].split('?')[0]}
/* تقصير اسم الملف مع إبقاء الامتداد (لتبقى أيقونة النوع صحيحة عند المستلم) */
function shName(n){n=String(n||'').trim();if(n.length<=70)return n;const m=n.match(/\.[A-Za-z0-9]{2,5}$/),x=m?m[0]:'';return n.slice(0,70-x.length)+x}
const shMime=m=>m=='application/vnd.google-apps.document'?'d':m=='application/vnd.google-apps.spreadsheet'?'s':m=='application/vnd.google-apps.presentation'?'p':'';
const shUnMime=c=>c=='d'?'application/vnd.google-apps.document':c=='s'?'application/vnd.google-apps.spreadsheet':c=='p'?'application/vnd.google-apps.presentation':'';
const shItemUrl=id=>{const d=byId[id];return shBase()+'?s=i'+shShort(id,shKeys('i'))+(d?'&n='+shQ(shSlug('صيغة '+d[1].replace(/\s*\(\d+ جزءاً\)$/,'')+' '+(d.b||d[3]||''))):'')};
const shLvUrl=f=>shBase()+'?s=f'+f.id+'&n='+shQ(shName(f.n))+(shMime(f.m)?'&m='+shMime(f.m):'');
const shDirUrl=(id,n)=>shBase()+'?s=d'+id+'&n='+shQ(shName(n));
/* نص الرسالة المصاحبة للرابط (العنوان يظهر في الرسالة لأن معاينة الرابط في واتساب/فيسبوك ثابتة للموقع كله) */
function shText(title,sub,url,cta){return '📌 «'+title+'»\n'+sub+'\n'+(cta||'افتحها مباشرة داخل المكتبة القانونية ⚖️👇')+'\n'+url}
function shInfo(id){const d=byId[id];return{title:d[1].replace(/\s*\(\d+ جزءاً\)$/,''),sub:'📂 '+d.t+' · '+d.b,url:shItemUrl(id)}}
function shCopy(url){if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(()=>toast('✔ تم نسخ رابط المشاركة'),()=>toast(url,4000));else toast(url,4000)}
/* مشاركة: نافذة النظام إن وُجدت (واتساب/فيسبوك/تيليجرام…) وإلا نافذة أزرار */
function shGo(i){if(i.img&&navigator.share&&typeof File!='undefined')return shImg(i);const t=shText(i.title,i.sub,i.url,i.cta);
 if(navigator.share){navigator.share({title:i.title,text:t}).catch(e=>{if(e&&e.name!='AbortError')shSheet(i)});return}
 shSheet(i)}
function shSheet(i){const t=shText(i.title,i.sub,i.url,i.cta),e=encodeURIComponent;
 sheet(`<h2 class="sht">📤 مشاركة</h2><div class="shm">${esc2(i.title)}</div><div class="shm">من يفتح الرابط يدخل <b>المكتبة القانونية</b> وتُفتح له هذه الصيغة مباشرة.</div><div class="acts"><a class="btn pri" target="_blank" rel="noopener" href="https://wa.me/?text=${e(t)}">💬 واتساب</a><a class="btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${e(i.url)}">📘 فيسبوك</a><a class="btn" target="_blank" rel="noopener" href="https://t.me/share/url?url=${e(i.url)}&text=${e('📌 «'+i.title+'»\n'+i.sub)}">✈️ تيليجرام</a><button class="btn" data-act="shcopyt" data-t="${esc2(t)}">📋 نسخ الرسالة</button><button class="btn wide2" data-act="shcopyu" data-t="${esc2(i.url)}">🔗 نسخ الرابط فقط</button></div>`)}
const shBcUrl=f=>shBase()+'?s=b'+shShort(f.id,shKeys('b'))+'&n='+shQ(shSlug('باركود '+(f.t||'')+(f.g?' '+f.g:'')));
/* مشاركة باركود: صورة البطاقة نفسها + تحتها «ادخل هنا» والرابط (إن لم تتوفر مشاركة الملفات تُرسل الرسالة بالرابط فقط) */
function shBc(f){shGo({title:f.t,sub:'📟 باركود جلسات'+(f.k?' · '+f.k:'')+(f.g?' · محافظة '+f.g:''),cta:'👇 ادخل هنا لفتح الباركود من المكتبة القانونية ⚖️',url:shBcUrl(f),img:f.id})}
async function shImg(i){const t=shText(i.title,i.sub,i.url,i.cta);let b=typeof BC!='undefined'&&BC.blob[i.img];
 if(!b){try{const r=await fetchT('https://lh3.googleusercontent.com/d/'+i.img+'=w1000',{},3500);if(r.ok)b=await r.blob()}catch(e){}}
 try{if(b){const f=new File([b],'barcode.jpg',{type:b.type||'image/jpeg'});if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:i.title,text:t});return}}
  await navigator.share({title:i.title,text:t})}catch(e){if(e&&e.name!='AbortError')shSheet(i)}}
function shItem(id){if(byId[id])shGo(shInfo(id))}
function shLv(f){shGo({title:lvName(f),sub:'📖 '+lvType(f)+' من المكتبة القانونية',url:shLvUrl(f)})}
function shDir(id,n){shGo({title:n,sub:'📁 قسم من المكتبة القانونية',url:shDirUrl(id,n)})}

/* ---------- الاستقبال: فتح الرابط المُشارَك ---------- */
function shParse(){let p;try{p=new URLSearchParams(location.search)}catch(e){return null}
 let s=p.get('s'),n=p.get('n')||'',m=p.get('m')||'';
 if(!s){const h=/[#&]s=([^&]+)/.exec(location.hash||'');if(h){s=decodeURIComponent(h[1]);const hn=/[#&]n=([^&]+)/.exec(location.hash),hm=/[#&]m=([^&]+)/.exec(location.hash);n=hn?decodeURIComponent(hn[1]):'';m=hm?hm[1]:''}}
 if(!s||s.length<7||!'ifdb'.includes(s[0])||!((s[0]=='i'||s[0]=='b')?shOkS:shOk)(s.slice(1)))return null;
 return{k:s[0],id:s.slice(1),n:n.slice(0,120),m:/^[dsp]$/.test(m)?m:''}}
function shClean(){try{history.replaceState(null,'',location.pathname)}catch(e){}}
/* بطاقة دعوة تظهر لمن وصلته الصيغة بالرابط: تصفّح المكتبة + تجربة Pro / اشتراك (للمجاني فقط) */
function shPromo(){let k=null;try{k=typeof wlKind=='function'?wlKind():null}catch(e){}
 const trial=k=='free'||k=='ended'?`<button class="btn" data-act="wltrial">🎁 جرّب Pro ${PRO.trialDays||14} يوماً</button>`:'',sub=k?'<button class="btn" data-act="prosub">💳 اشترك</button>':'';
 return `<div class="evn shp"><b>📚 المكتبة القانونية — ${D.length} صيغة وكتاب</b><small>وصلتك هذه الصيغة عبر المكتبة. التصفّح والبحث والتحميل مجانيان، ويضيف Pro المواريث والأتعاب وتجهيز المستندات.</small><div class="acts"><button class="btn pri" data-act="shbrowse">📚 تصفّح المكتبة</button>${trial}${sub}</div></div>`}
function shPromoAdd(){const a=document.querySelector('#sh .acts');if(a)a.insertAdjacentHTML('afterend',shPromo())}
function shOpen(r){SH.arrived=r;if(r.k=='i'||r.k=='b'){r.id=shFull(r.k,r.id);r.n=shUnslug(r.n)}
 if(r.k=='i'){if(!byId[r.id]){toast('هذه الصيغة غير موجودة في هذا الإصدار — حدّث التطبيق أو تصفّح المكتبة',4000);return}itemSheet(r.id);shPromoAdd();return}
 if(r.k=='b'){bcSheet({id:r.id,t:r.n});shPromoAdd();return}
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
