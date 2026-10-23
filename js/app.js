/* منطق التطبيق: بحث، تصفح، تصفية (نافذة سفلية)، مفضلة، آخر المفتوح */
const $=s=>document.querySelector(s);
const nz=t=>t.replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
const D=DATA;enrich(D);D.forEach(d=>d.n=nz(d[1]+' '+d.t+' '+d.b+' '+d.p));
const byId=Object.fromEntries(D.map(d=>[d[0],d]));
const FA=[['b','الفرع','🏛️'],['t','النوع','📑'],['p','الموضوع','🏷️'],['s','المرحلة','⏱️'],['j','المحكمة / الجهة','⚖️']];
const TI={'إنذار':'⚠️','إعلان':'📢','دعوى':'⚖️','عقد':'📜','محضر':'📝','توكيل':'✍️','إشكال':'🛑','تظلم':'🗣️','طلب / مستندات':'📄','نموذج':'🗂️','مبادئ وأحكام':'📖'};
const BI={'أحوال شخصية':'👨‍👩‍👧','جنائي':'🚔','مدني وعقود':'🏛️','إيجارات':'🏠','تنفيذ وبيوع وشفعة':'🔨','تجاري وشركات':'💼','إداري':'🏢','ملكية وحيازة':'🗝️','حكومي وضرائب وتأمينات':'🧾','مرافعات وإجراءات':'📚'};
const icon=(k,v)=>k=='t'?TI[v]||'📄':k=='b'?BI[v]||'📁':k=='p'?'🏷️':k=='s'?'⏱️':'⚖️';
const ld=(k,x)=>{try{return JSON.parse(localStorage.getItem(k))||x}catch(e){return x}};
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let S={tab:'home',g:'b',f:{t:'',b:'',p:'',s:'',j:''},q:'',n:40},FAV=ld('fav',[]),REC=ld('rec',[]),TH=ld('theme','auto'),obs;
const uniq=k=>[...new Set(D.map(d=>d[k]))];
const match=(d,skip)=>{for(const k in S.f)if(k!==skip&&S.f[k]&&d[k]!==S.f[k])return false;return true};
const qm=d=>{const q=nz(S.q.trim());return !q||q.split(/\s+/).every(w=>d.n.includes(w))};
const nf=()=>Object.values(S.f).filter(Boolean).length;
const gd=id=>byId[id][1].includes('مستند جوجل');
const pv=id=>gd(id)?'https://docs.google.com/document/d/'+id+'/preview':'https://drive.google.com/file/d/'+id+'/preview',dl=id=>gd(id)?'https://docs.google.com/document/d/'+id+'/export?format=docx':'https://drive.google.com/uc?export=download&id='+id;
function list(){const b=S.tab=='fav'?FAV.map(i=>byId[i]).filter(Boolean):S.tab=='rec'?REC.map(i=>byId[i]).filter(Boolean):D;
 return b.filter(d=>qm(d)&&(S.tab=='all'||S.tab=='home'?match(d):true))}
const row=d=>{const f=FAV.includes(d[0]);return `<div class="row" data-act="open" data-id="${d[0]}"><div class="ic">${icon('t',d.t)}</div><div class="rt"><div class="rn">${d[1]}</div><div class="rm">${d.t} · ${d.b}${d.p!='عام'?' · '+d.p:''}</div></div><button class="st ${f?'on':''}" data-act="fav" data-id="${d[0]}" aria-label="مفضلة">${f?'★':'☆'}</button></div>`};
function render(){
 document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab==S.tab));
 $('#fe').textContent=FAV.length||'';$('#fn').textContent=nf()||'';$('#fn').hidden=!nf();$('#clr').hidden=!S.q;
 const all=S.tab=='all',gn=FA.find(x=>x[0]==S.g)[1];
 $('#qt').hidden=!all;$('#qt').innerHTML=['',...uniq('t')].map(x=>`<button class="chip ${S.f.t==x?'on':''}" data-act="ftype" data-v="${x}">${x||'الكل'}</button>`).join('');
 const act=Object.entries(S.f).filter(([k,v])=>v&&k!='t');
 $('#af').hidden=!(all&&act.length);$('#af').innerHTML=act.map(([k,v])=>`<button class="chip x" data-act="rm" data-k="${k}">${v} ✕</button>`).join('')+(act.length>1?'<button class="chip" data-act="fclear">مسح الكل</button>':'');
 const m=$('#m');if(obs)obs.disconnect();
 if(S.tab=='home'){const c={};D.forEach(d=>c[d[S.g]]=(c[d[S.g]]||0)+1);
  m.innerHTML=`<div class="bar2"><span>تصفّح حسب</span><button class="pill" data-act="gmenu">${gn} ▾</button></div><div class="grid">`+Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([v,n])=>`<button class="cat" data-act="cat" data-v="${v}"><span class="ci">${icon(S.g,v)}</span><b>${v}</b><span>${n} صيغة</span></button>`).join('')+'</div>'}
 else{const L=list();let h=`<div class="bar2"><b>${L.length} صيغة</b>${S.tab=='rec'&&L.length?'<button class="lnk" data-act="recclr">مسح السجل</button>':''}</div>`;
  if(!L.length)h+=`<div class="em"><div>${S.tab=='fav'?'⭐':S.tab=='rec'?'🕘':'🔎'}</div>${S.tab=='fav'?'لم تضف صيغاً للمفضلة بعد.<br>اضغط ☆ بجانب أي صيغة':S.tab=='rec'?'ستظهر هنا آخر الصيغ التي فتحتها':'لا توجد نتائج مطابقة'}</div>`;
  h+=L.slice(0,S.n).map(row).join('');if(L.length>S.n)h+='<div class="more" id="more">جارٍ تحميل المزيد…</div>';m.innerHTML=h;
  const mo=$('#more');if(mo&&'IntersectionObserver' in window){obs=new IntersectionObserver(e=>{if(e[0].isIntersecting){S.n+=40;render()}},{rootMargin:'300px'});obs.observe(mo)}}
}
function sheet(h){$('#sh').innerHTML='<div class="grab"></div>'+h;$('#bd').hidden=false;requestAnimationFrame(()=>{$('#bd').classList.add('open');$('#sh').classList.add('open')});document.body.classList.add('lock')}
function closeSheet(){$('#bd').classList.remove('open');$('#sh').classList.remove('open');document.body.classList.remove('lock');setTimeout(()=>{if(!$('#sh').classList.contains('open'))$('#bd').hidden=true},250)}
function toast(t){const e=$('#ts');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1600)}
const wa=t=>'https://wa.me/'+CONTACT.wa+'?text='+encodeURIComponent(t);
function itemSheet(id){const d=byId[id],dlo=d[1].includes('تحميل فقط');
 sheet(`<h2 class="sht">${d[1]}</h2><div class="shm">${d.t} · ${d.b} · ${d.p} · ${d.j}</div><div class="acts">${dlo?`<a class="btn pri" data-act="rec" data-id="${id}" href="${dl(id)}">⬇ تحميل الملف</a><a class="btn" target="_blank" rel="noopener" href="${pv(id)}">🔗 فتح في درايف</a>`:`<a class="btn pri" data-act="rec" data-id="${id}" target="_blank" rel="noopener" href="${pv(id)}">👁 معاينة</a><a class="btn" data-act="rec" data-id="${id}" href="${dl(id)}">⬇ تحميل</a>`}<button class="btn" data-act="copy" data-id="${id}">🔗 نسخ الرابط</button><button class="btn" data-act="share" data-id="${id}">📤 مشاركة</button><a class="btn wide2" target="_blank" rel="noopener" href="${wa('أبلغ عن ملاحظة على صيغة في المكتبة القانونية:\n'+d[1]+'\n'+pv(id))}">⚠️ إبلاغ عن خطأ أو ملاحظة</a></div>`)}
function contactSheet(){sheet(`<h2 class="sht">تواصل مع المكتبة القانونية</h2><div class="shm">للاستفسار، أو إرسال صيغ جديدة لمراجعتها وإضافتها</div><div class="acts one"><a class="btn pri" target="_blank" rel="noopener" href="${wa('السلام عليكم، أرغب في الاستفسار بخصوص المكتبة القانونية.')}">💬 محادثة واتساب مباشرة</a><a class="btn" target="_blank" rel="noopener" href="${wa('السلام عليكم، لدي صيغة جديدة أرغب في مشاركتها لمراجعتها وإضافتها إلى المكتبة القانونية. سأرسل الملف في هذه المحادثة.')}">📤 مشاركة صيغة جديدة للمراجعة</a><a class="btn" href="mailto:${CONTACT.mail}?subject=${encodeURIComponent('المكتبة القانونية - مراسلة')}">✉️ مراسلة بالبريد الإلكتروني</a><a class="btn" href="tel:${CONTACT.phone}">📞 اتصال ${CONTACT.phone}</a></div><div class="shm" style="margin:14px 0 0">${CONTACT.mail}</div>`)}
function filterSheet(open){const sc=$('.fl')?$('.fl').scrollTop:0;
 const body=FA.map(([k,l,ic])=>{const c={};D.forEach(d=>{if(match(d,k)&&qm(d))c[d[k]]=(c[d[k]]||0)+1});const o=Object.entries(c).sort((a,b)=>b[1]-a[1]);if(S.f[k]&&!c[S.f[k]])o.unshift([S.f[k],0]);
  return `<details ${open==k?'open':''}><summary><span>${ic} ${l}</span><b>${S.f[k]||'الكل'}</b></summary><div class="opts">${o.map(([v,n])=>`<button class="opt ${S.f[k]==v?'on':''}" data-act="fset" data-k="${k}" data-v="${v}">${v}<i>${n}</i></button>`).join('')}</div></details>`}).join('');
 sheet(`<div class="shh"><h2 class="sht">تصفية النتائج</h2><button class="lnk" data-act="fclear2">مسح الكل</button></div><div class="fl">${body}</div><button class="btn pri wide" data-act="close">عرض ${list().length} نتيجة</button>`);
 const f=$('.fl');if(f)f.scrollTop=sc}
function groupSheet(){sheet('<h2 class="sht">تصفّح حسب</h2>'+FA.map(([k,l,ic])=>`<button class="mrow ${S.g==k?'on':''}" data-act="gset" data-k="${k}"><span>${ic} ${l}</span><span>${S.g==k?'✓':''}</span></button>`).join(''))}
function addRec(id){REC=[id,...REC.filter(x=>x!=id)].slice(0,40);sv('rec',REC)}
function copy(t){if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>toast('تم نسخ الرابط'),()=>toast(t));else toast(t)}
function applyTheme(){const r=document.documentElement;TH=='auto'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',TH);$('#theme').textContent={auto:'🌓',dark:'🌙',light:'☀️'}[TH]}
function go(tab){S.tab=tab;S.n=40;render();scrollTo(0,0)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id,k=el.dataset.k,v=el.dataset.v;
 if(a=='rec'){addRec(id);return}
 if(a=='open')itemSheet(id);
 else if(a=='fav'){const i=FAV.indexOf(id);i<0?FAV.push(id):FAV.splice(i,1);sv('fav',FAV);if(navigator.vibrate)navigator.vibrate(8);render()}
 else if(a=='tab')go(el.dataset.tab);
 else if(a=='cat'){S.f[S.g]=v;S.tab='all';S.n=40;render();scrollTo(0,0)}
 else if(a=='ftype'){S.f.t=v;S.n=40;render()}
 else if(a=='rm'){S.f[k]='';render()}
 else if(a=='fclear'){S.f={t:S.f.t,b:'',p:'',s:'',j:''};render()}
 else if(a=='fclear2'){S.f={t:'',b:'',p:'',s:'',j:''};if(S.tab=='home')S.tab='all';render();filterSheet()}
 else if(a=='filters')filterSheet('b');
 else if(a=='fset'){S.f[k]=S.f[k]==v?'':v;S.n=40;if(S.tab=='home')S.tab='all';render();filterSheet(k)}
 else if(a=='gmenu')groupSheet();
 else if(a=='gset'){S.g=k;closeSheet();render()}
 else if(a=='copy'){copy(pv(id))}
 else if(a=='share'){const d=byId[id];if(navigator.share)navigator.share({title:d[1],url:pv(id)}).catch(()=>{});else copy(pv(id))}
 else if(a=='recclr'){REC=[];sv('rec',REC);render()}
 else if(a=='theme'){TH=TH=='auto'?'dark':TH=='dark'?'light':'auto';sv('theme',TH);applyTheme()}
 else if(a=='clr'){$('#q').value='';S.q='';render()}
 else if(a=='contact')contactSheet();
 else if(a=='close')closeSheet()});
$('#q').addEventListener('input',e=>{S.q=e.target.value;S.n=40;if(S.q.trim()&&S.tab=='home')S.tab='all';render()});
document.addEventListener('keydown',e=>{if(e.key=='Escape')closeSheet()});
$('#q').placeholder='ابحث في '+D.length+' صيغة…';$('#cnt').textContent='صحف وصيغ ونماذج · '+D.length+' ملفاً';
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
const v=$('#ver');if(v)v.textContent='الإصدار '+APP.version;
applyTheme();render();
