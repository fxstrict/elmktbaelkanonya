/* أدوات المكتبة: قوائم القضايا + حاسبة المواعيد والآجال + صيغ مرتبطة + الأكثر فتحاً.
   كل البيانات تُحفظ على جهاز المستخدم فقط (localStorage). يُحمَّل قبل app.js. */
const _l=(k,x)=>{try{return JSON.parse(localStorage.getItem(k))||x}catch(e){return x}},_s=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const CLS=_l('lists',[]),CNT=_l('cnt',{}),DLS=_l('dls',[]);
const esc2=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const NOREL='bvkxq',DLT=['دعوى','تظلم','إشكال','دفوع ومذكرات','إنذار','إعلان'];
/* ---------- الأكثر فتحاً ---------- */
function bumpOpen(id){CNT[id]=(CNT[id]||0)+1;_s('cnt',CNT)}
/* ---------- قوائم القضايا ---------- */
const clGet=id=>id=='fav'?{id:'fav',name:'المفضلة',items:FAV}:CLS.find(x=>x.id==id);
const rowX=d=>`<div class="row" data-act="open" data-id="${d[0]}"><div class="ic">${icon('t',d.t)}</div><div class="rt"><div class="rn">${BK.has(d[0])?'⚠️ ':''}${d[1]}</div><div class="rm">${d.t} · ${d.b}</div></div><button class="st" data-act="lrm" data-id="${d[0]}" aria-label="إزالة من القائمة">✕</button></div>`;
function casesView(){
 if(!S.cl){const all=[{id:'fav',name:'⭐ المفضلة',items:FAV},...CLS.map(c=>({...c,name:'📁 '+c.name}))];
  return `<div class="bar2"><b>قضاياي</b><button class="pill" data-act="lnew">➕ قائمة جديدة</button></div>`+all.map(c=>`<div class="row" data-act="lopen" data-id="${c.id}"><div class="rt"><div class="rn">${esc2(c.name)}</div><div class="rm">${c.items.filter(i=>byId[i]).length} صيغة</div></div><div class="ic">‹</div></div>`).join('')+(CLS.length?'':'<div class="em"><div>📂</div>أنشئ قائمة لكل قضية (مثل «قضية فلان») وضع فيها الصيغ التي تحتاجها بزر «➕ إضافة إلى قائمة قضية» داخل أي صيغة</div>')}
 const c=clGet(S.cl);if(!c){S.cl=null;return casesView()}
 const L=c.items.map(i=>byId[i]).filter(Boolean).filter(qm);
 return `<div class="bar2"><button class="lnk" data-act="lback">← قضاياي</button><b>${esc2(c.name)}</b><span>${c.items.filter(i=>byId[i]).length}</span></div><div class="acts">${c.id!='fav'?'<button class="btn" data-act="lren">✏️ تغيير الاسم</button><button class="btn" data-act="ldel">🗑 حذف القائمة</button>':''}<button class="btn" data-act="lshare">📤 مشاركة كنص</button><button class="btn" data-act="llink">🔗 رابط للاستيراد</button></div>`+(L.length?L.map(c.id=='fav'?row:rowX).join(''):`<div class="em"><div>📭</div>${S.q?'لا نتائج مطابقة':'القائمة فارغة — أضف صيغاً من داخل أي صيغة'}</div>`)}
function addSheet(id){const d=byId[id],opts=[{id:'fav',name:'⭐ المفضلة',items:FAV},...CLS.map(c=>({...c,name:'📁 '+c.name}))];
 sheet(`<div class="shh"><h2 class="sht">إضافة إلى قائمة</h2><button class="lnk" data-act="lnew" data-id="${id}">➕ جديدة</button></div><div class="shm">${esc2(d[1])}</div>`+opts.map(c=>`<button class="mrow ${c.items.includes(id)?'on':''}" data-act="ltog" data-id="${id}" data-k="${c.id}"><span>${esc2(c.name)}</span><span>${c.items.includes(id)?'✓':''}</span></button>`).join('')+'<button class="btn pri wide" data-act="close" style="margin-top:12px">تم</button>')}
function shareList(c){const t='قائمة: '+c.name+'\n'+c.items.map(i=>byId[i]).filter(Boolean).map((d,n)=>(n+1)+') '+d[1]+'\n'+pv(d[0])).join('\n');
 if(navigator.share)navigator.share({title:c.name,text:t}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>toast('تم نسخ القائمة'),()=>toast('تعذّر النسخ'))}
/* ---------- حاسبة المواعيد والآجال (للاسترشاد) ---------- */
const DR=[
['مدني وتجاري',[['civ_app','استئناف مدني وتجاري',40,'d','من تاريخ صدور الحكم (أو إعلانه بحسب نوع الحكم)'],['civ_urg','استئناف المواد المستعجلة',15,'d','من تاريخ صدور الحكم'],['civ_cass','الطعن بالنقض (مدني وتجاري)',60,'d','من تاريخ صدور الحكم'],['civ_retr','التماس إعادة النظر',40,'d','من تاريخ صدور الحكم أو ظهور سببه'],['renew','تجديد الدعوى من الشطب',60,'d','من تاريخ الشطب'],['res_pen','التعجيل من الوقف الجزائي',15,'d','من تاريخ انتهاء مدة الوقف'],['res_agr','التعجيل من الوقف الاتفاقي',8,'d','من تاريخ انتهاء مدة الوقف'],['forg','إعلان شواهد التزوير',8,'d','من تاريخ التقرير بالطعن'],['fees','التظلم من أمر تقدير مصاريف الدعوى',8,'d','من تاريخ إعلان الأمر'],['nonotice','اعتبار الدعوى كأن لم تكن لعدم إعلان الصحيفة',90,'d','من تاريخ إيداع الصحيفة بقلم الكتاب']]],
['جنائي',[['pen_app','استئناف الجنح والمخالفات',10,'d','من تاريخ النطق بالحكم الحضوري'],['pen_opp','المعارضة في الجنح والمخالفات',10,'d','من تاريخ إعلان الحكم الغيابي'],['pen_cass','الطعن بالنقض (جنائي)',60,'d','من تاريخ صدور الحكم'],['compl','تقديم الشكوى (جرائم الشكوى)',3,'m','من العلم بالجريمة ومرتكبها']]],
['أحوال شخصية',[['ps_app','استئناف الأحوال الشخصية',40,'d','من تاريخ صدور الحكم أو إعلانه'],['obed','الاعتراض على إنذار الطاعة',30,'d','من تاريخ استلام الإعلان']]],
['إداري ودستوري',[['adm_court','الطعن في أحكام القضاء الإداري والمحاكم التأديبية',60,'d','من تاريخ صدور الحكم'],['adm_cancel','التظلم من قرار إداري / دعوى الإلغاء',60,'d','من نشر القرار أو إعلانه أو العلم به'],['constit','رفع دعوى عدم الدستورية بعد الدفع',3,'m','من تاريخ إبداء الدفع بتصريح المحكمة']]],
['مخصص',[['custom_d','مدة أخرى بالأيام',0,'d','من تاريخ بدء المدة'],['custom_m','مدة أخرى بالأشهر',0,'m','من تاريخ بدء المدة']]]];
const DRF=DR.flatMap(g=>g[1]),AR_D=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const pad2=n=>String(n).padStart(2,'0'),isoD=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`,parseD=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c,12)};
function addPeriod(s,n,u){const d=parseD(s);if(u=='m'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0,12).getDate()))}else d.setDate(d.getDate()+n);return d}
/* لا يُحسب يوم البدء؛ وإن صادف آخر يوم الجمعة أو السبت امتد لأول يوم عمل (الأحد). الأعياد الرسمية ومواعيد المسافة غير محتسبة. */
function calcDeadline(start,n,u){const raw=addPeriod(start,n,u),end=new Date(raw);let moved=false;while(end.getDay()==5||end.getDay()==6){end.setDate(end.getDate()+1);moved=true}return{raw,end,moved}}
const fmtD=d=>AR_D[d.getDay()]+' '+d.getDate()+' / '+(d.getMonth()+1)+' / '+d.getFullYear();
const today12=()=>{const t=new Date();t.setHours(12,0,0,0);return t};
const daysLeft=d=>Math.round((d-today12())/864e5);
const leftTxt=n=>n<0?'انقضى منذ '+(-n)+' يوم':n==0?'ينتهي اليوم':'باقي '+n+' يوم';
let CALC=null;
function dlsHtml(){if(!DLS.length)return'<div class="shm">لا توجد مواعيد محفوظة بعد.</div>';
 return DLS.slice().sort((a,b)=>a.end<b.end?-1:1).map(x=>{const n=daysLeft(parseD(x.end));return `<div class="pr"><span>${esc2(x.title)}<br><small>${fmtD(parseD(x.end))} · <b style="color:${n<0?'var(--mu)':n<=7?'#c0392b':'var(--ac)'}">${leftTxt(n)}</b></small></span><button class="pb" data-act="cics" data-k="${x.id}" aria-label="تقويم">📅</button><button class="pb" data-act="cdel" data-k="${x.id}" aria-label="حذف">🗑</button></div>`}).join('')}
function calcSheet(pre){const rid=pre=='جنائي'?'pen_app':pre=='أحوال شخصية'?'ps_app':pre=='إداري'?'adm_court':'civ_app';
 sheet(`<h2 class="sht">📅 حاسبة المواعيد والآجال</h2><label class="fld"><span>نوع الميعاد</span><select id="cr">${DR.map(g=>`<optgroup label="${g[0]}">${g[1].map(r=>`<option value="${r[0]}" ${r[0]==rid?'selected':''}>${r[1]}${r[2]?' — '+r[2]+(r[3]=='m'?' أشهر':' يوماً'):''}</option>`).join('')}</optgroup>`).join('')}</select></label><label class="fld" id="cnw" hidden><span>عدد الأيام / الأشهر</span><input id="cn" type="number" min="1" inputmode="numeric"></label><label class="fld"><span id="cs"></span><input id="cd" type="date" value="${isoD(new Date())}"></label><div id="co" class="cres"></div><div class="acts"><button class="btn pri" data-act="csave">💾 حفظ الميعاد</button><button class="btn" data-act="cics">📅 إضافة للتقويم</button></div><h3 class="sht" style="margin:16px 0 6px">مواعيدي المحفوظة</h3><div id="dls">${dlsHtml()}</div><div class="shm" style="margin-top:12px">للاسترشاد فقط: المدد من مصادر قانونية منشورة. تحقق دائماً من نص القانون وتاريخ بدء الميعاد في قضيتك. لا يُحتسب يوم البدء، وإذا وافق آخر الميعاد الجمعة أو السبت يمتد لأول يوم عمل. الأعياد الرسمية ومواعيد المسافة غير محتسبة.</div>`);calcUpdate()}
function calcUpdate(){const r=DRF.find(x=>x[0]==$('#cr').value);if(!r)return;const cust=r[0].startsWith('custom'),n=cust?+$('#cn').value||0:r[2];$('#cnw').hidden=!cust;$('#cs').textContent=r[4];
 const s=$('#cd').value;if(!s||!n){$('#co').innerHTML='<span>'+(cust?'أدخل المدة وتاريخ البدء':'اختر تاريخ البدء')+'</span>';CALC=null;return}
 const c=calcDeadline(s,n,r[3]),left=daysLeft(c.end);CALC={r,n,s,end:c.end};
 $('#co').innerHTML=`<span>آخر يوم للإجراء</span><b>${fmtD(c.end)}</b><span style="color:${left<0?'var(--mu)':left<=7?'#c0392b':'var(--ac)'}">${leftTxt(left)}</span>${c.moved?`<small>وافق آخر الميعاد ${AR_D[c.raw.getDay()]} (${c.raw.getDate()}/${c.raw.getMonth()+1}) فامتد لأول يوم عمل</small>`:''}`}
function icsFor(title,endISO){const e=parseD(endISO),nx=new Date(e);nx.setDate(nx.getDate()+1);const f=d=>d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate());
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//legal-library//AR','BEGIN:VEVENT','UID:'+Date.now()+Math.random().toString(36).slice(2)+'@legal-library','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z','DTSTART;VALUE=DATE:'+f(e),'DTEND;VALUE=DATE:'+f(nx),'SUMMARY:'+title.replace(/[\r\n,;]/g,' '),'BEGIN:VALARM','TRIGGER:-P2D','ACTION:DISPLAY','DESCRIPTION:تذكير بميعاد قانوني','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n')}
function saveIcs(title,endISO){const blob=new Blob([icsFor(title,endISO)],{type:'text/calendar'}),url=URL.createObjectURL(blob),l=document.createElement('a');l.href=url;l.download='ميعاد.ics';document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);toast('📅 افتح الملف لإضافة الميعاد إلى التقويم (مع تنبيه قبله بيومين)',4500)}
/* ---------- صيغ مرتبطة ---------- */
const TORD=['إنذار','إعلان','طلب / مستندات','دعوى','دفوع ومذكرات','إشكال','تظلم','محضر','توكيل','عقد','نموذج'];
function relatedHtml(id){const d=byId[id];if(!d||NOREL.includes(d[2]))return'';
 const R=D.filter(x=>x!==d&&x.b==d.b&&!NOREL.includes(x[2])&&(d.p!='عام'?x.p==d.p:(x.s&&x.s==d.s))).sort((a,b)=>{const i=TORD.indexOf(a.t),j=TORD.indexOf(b.t);return(i<0?99:i)-(j<0?99:j)||(a[1]<b[1]?-1:1)}).slice(0,6);
 if(!R.length)return'';return '<div class="shm" style="margin:14px 0 6px">صيغ مرتبطة بنفس الموضوع</div>'+R.map(x=>`<div class="pr" data-act="open" data-id="${x[0]}" style="cursor:pointer"><span>${x[1]}</span><small>${x.t}</small></div>`).join('')}
/* ---------- الرئيسية ---------- */
function homeExtras(){let h='';const soon=DLS.map(x=>({...x,n:daysLeft(parseD(x.end))})).filter(x=>x.n>=0&&x.n<=14).sort((a,b)=>a.n-b.n);
 if(soon.length)h+=`<div class="dlw" data-act="calc">⏰ <b>${esc2(soon[0].title)}</b> — ${soon[0].n==0?'ينتهي اليوم':'باقي '+soon[0].n+' يوم'}${soon.length>1?' (+'+(soon.length-1)+' مواعيد أخرى)':''}</div>`;
 const top=Object.entries(CNT).filter(([i,n])=>n>=2&&byId[i]).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>byId[x[0]]);
 if(top.length)h+='<div class="bar2"><b>🔥 الأكثر فتحاً</b></div>'+top.map(row).join('');return h}
/* ---------- الأحداث ---------- */
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,id=el.dataset.id,k=el.dataset.k;
 if(a=='lopen'){S.cl=id;render();scrollTo(0,0)}
 else if(a=='lback'){S.cl=null;render()}
 else if(a=='lnew'){const n=prompt('اسم القائمة (مثال: قضية فلان)');if(n&&n.trim()){const c={id:'l'+Date.now().toString(36),name:n.trim().slice(0,60),items:id?[id]:[]};CLS.push(c);_s('lists',CLS);render();if(id)addSheet(id);else toast('تم إنشاء القائمة')}}
 else if(a=='addto')addSheet(id);
 else if(a=='ltog'){const c=clGet(k);if(c){const i=c.items.indexOf(id);i<0?c.items.push(id):c.items.splice(i,1);k=='fav'?sv('fav',FAV):_s('lists',CLS);render();addSheet(id)}}
 else if(a=='lrm'){e.stopPropagation();const c=clGet(S.cl);if(c){c.items=c.items.filter(x=>x!=id);_s('lists',CLS);render();toast('أُزيلت من القائمة')}}
 else if(a=='lren'){const c=clGet(S.cl),n=c&&prompt('الاسم الجديد',c.name);if(n&&n.trim()){c.name=n.trim().slice(0,60);_s('lists',CLS);render()}}
 else if(a=='ldel'){const c=clGet(S.cl);if(c&&confirm('حذف القائمة «'+c.name+'»؟ الصيغ نفسها لن تُحذف.')){CLS.splice(CLS.indexOf(c),1);_s('lists',CLS);S.cl=null;render()}}
 else if(a=='lshare'){const c=clGet(S.cl);if(c)shareList(c)}
 else if(a=='llink'){const c=clGet(S.cl);if(c){const u=location.href.split('#')[0]+'#list='+encodeURIComponent(c.name)+'~'+c.items.filter(i=>byId[i]).join(',');if(navigator.share)navigator.share({title:c.name,url:u}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(u).then(()=>toast('تم نسخ رابط القائمة'),()=>toast('تعذّر النسخ'))}}
 else if(a=='limp'){const ids=id.split(',').filter(i=>byId[i]);CLS.push({id:'l'+Date.now().toString(36),name:k,items:ids});_s('lists',CLS);closeSheet();S.tab='fav';S.cl=null;render();toast('تم استيراد القائمة')}
 else if(a=='calc')calcSheet(el.dataset.b);
 else if(a=='csave'){if(!CALC){toast('أكمل بيانات الميعاد أولاً');return}const t=prompt('اسم الميعاد (مثال: استئناف قضية فلان)',CALC.r[1]);if(t&&t.trim()){DLS.push({id:'d'+Date.now().toString(36),title:t.trim().slice(0,80),end:isoD(CALC.end)});_s('dls',DLS);$('#dls').innerHTML=dlsHtml();toast('تم حفظ الميعاد')}}
 else if(a=='cics'){if(k){const x=DLS.find(y=>y.id==k);if(x)saveIcs(x.title,x.end)}else if(CALC)saveIcs(CALC.r[1],isoD(CALC.end));else toast('أكمل بيانات الميعاد أولاً')}
 else if(a=='cdel'){const i=DLS.findIndex(y=>y.id==k);if(i>=0&&confirm('حذف هذا الميعاد؟')){DLS.splice(i,1);_s('dls',DLS);$('#dls').innerHTML=dlsHtml()}}});
document.addEventListener('input',e=>{if(['cr','cd','cn'].includes(e.target.id))calcUpdate()});
document.addEventListener('change',e=>{if(['cr','cd','cn'].includes(e.target.id))calcUpdate()});

/* ---------- استيراد قائمة من رابط (#list=الاسم~معرّفات) ---------- */
function checkHash(){if(typeof location=='undefined')return;const m=location.hash.match(/^#list=([^~]*)~(.*)$/);if(!m)return;let name='قائمة مستوردة';try{name=decodeURIComponent(m[1])||name}catch(e){}
 const ids=m[2].split(',').filter(i=>byId[i]);try{history.replaceState(null,'',location.href.split('#')[0])}catch(e){}
 if(!ids.length){toast('القائمة لا تحتوي صيغاً موجودة في هذا الإصدار',3000);return}
 sheet(`<h2 class="sht">📥 استيراد قائمة</h2><div class="shm">«${esc2(name)}» — ${ids.length} صيغة</div><div class="acts one"><button class="btn pri" data-act="limp" data-id="${ids.join(',')}" data-k="${esc2(name.slice(0,60))}">استيراد إلى قضاياي</button><button class="btn" data-act="close">إلغاء</button></div>`)}
window.addEventListener('load',()=>setTimeout(checkHash,500));
