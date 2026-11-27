/* L2 — حاسبة المواعيد: العطلات الرسمية (ثابتة + شم النسيم محسوبة + عطلات يضيفها المستخدم) وميعاد المسافة (م16–17 مرافعات).
   إضافة فوق calcDeadline/calcUpdate/calcSheet دون تغيير توقيعها (الوسيط الرابع اختياري). للاسترشاد: تحقق من نص القانون وقرارات العطلات المعلنة. */
const HOL=_l('hol',[]),DX={mode:'0',km:0,last:null},HOLF=[[1,7,'عيد الميلاد المجيد'],[1,25,'عيد الثورة وعيد الشرطة'],[4,25,'عيد تحرير سيناء'],[5,1,'عيد العمال'],[6,30,'ذكرى ثورة 30 يونيو'],[7,23,'ذكرى ثورة 23 يوليو'],[10,6,'عيد القوات المسلحة']];
const holSave=()=>_s('hol',HOL);
/* عيد القيامة الأرثوذكسي (التقويم اليولياني +13 يوماً، صحيح 1900–2099) وشم النسيم = اليوم التالي */
function dlxEaster(y){const a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7,t=d+e+114,m=Math.floor(t/31),day=t%31+1;return new Date(y,m-1,day+13,12)}
function dlxHolName(d){const m=d.getMonth()+1,dd=d.getDate(),k=isoD(d);
 const f=HOLF.find(h=>h[0]==m&&h[1]==dd);if(f)return f[2];
 const sn=dlxEaster(d.getFullYear());sn.setDate(sn.getDate()+1);if(isoD(sn)==k)return 'شم النسيم';
 const u=HOL.find(h=>h.date==k);if(u)return u.name||'عطلة';
 if(d.getDay()==5||d.getDay()==6)return 'عطلة أسبوعية';return null}
/* م16: يوم لكل 50 كم، وما زاد من الكسور على 30 كم يوم، بحد أقصى 4 أيام. حدودي 15، خارج مصر 60 (م17) */
function dlxDist(mode,km){if(mode=='b')return 15;if(mode=='f')return 60;if(mode!='km')return 0;km=Math.max(0,+km||0);return Math.min(4,Math.floor(km/50)+(km%50>30?1:0))}
const _cd0=calcDeadline;
window.calcDeadline=calcDeadline=function(start,n,u,o){const raw0=addPeriod(start,n,u),dist=o&&o.dist!=null?o.dist:dlxDist(DX.mode,DX.km),raw=new Date(raw0);raw.setDate(raw.getDate()+dist);
 const end=new Date(raw),skipped=[];let g=0;while(g++<40){const nm=dlxHolName(end);if(!nm)break;skipped.push([isoD(end),nm]);end.setDate(end.getDate()+1)}
 const r={raw,end,moved:skipped.length>0,dist,raw0,skipped};DX.last=r;return r}
const _cu0=calcUpdate;
window.calcUpdate=calcUpdate=function(){_cu0.apply(this,arguments);const el=$('#co'),L=DX.last;if(!el||!CALC||!L)return;
 const off=L.skipped.filter(x=>x[1]!='عطلة أسبوعية').map(x=>x[1]);
 el.insertAdjacentHTML('beforeend',(L.dist?`<small>أُضيف ميعاد مسافة ${L.dist} ${L.dist==1?'يوم':'يوماً'}</small>`:'')+(off.length?`<small>امتد لمصادفة عطلة رسمية: ${esc2(off.join('، '))}</small>`:''))}
const _cs0=calcSheet;
window.calcSheet=calcSheet=function(){DX.mode='0';DX.km=0;_cs0.apply(this,arguments);const co=$('#co');if(!co)return;
 const lb=co.previousElementSibling;if(!lb)return;
 lb.insertAdjacentHTML('afterend',`<label class="fld"><span>ميعاد المسافة (م16–17 مرافعات)</span><select id="cdm"><option value="0">بلا</option><option value="km">بالكيلومتر بين موطنك والمحكمة</option><option value="b">موطن في منطقة حدودية (15 يوماً)</option><option value="f">موطن في الخارج (60 يوماً)</option></select></label><label class="fld" id="ckw" hidden><span>المسافة بالكيلومتر</span><input id="ckm" type="number" min="0" inputmode="numeric"></label><button class="lnk" data-act="holsh">🗓 العطلات الرسمية المحسوبة</button>`);
 document.querySelectorAll('.shm').forEach(e=>{if(e.textContent.includes('الأعياد الرسمية ومواعيد المسافة غير محتسبة'))e.textContent=e.textContent.replace('وإذا وافق آخر الميعاد الجمعة أو السبت يمتد لأول يوم عمل. الأعياد الرسمية ومواعيد المسافة غير محتسبة.','وإذا وافق آخر الميعاد الجمعة أو السبت أو عطلة رسمية يمتد لأول يوم عمل (م18). العطلات الثابتة وشم النسيم محسوبة؛ أما الأعياد الدينية المتغيرة وما يُعلن من إجازات استثنائية فأضفها يدوياً من «العطلات الرسمية المحسوبة» وإلا لم تُحتسب. ميعاد المسافة اختياري ويُحسب بحسب موطن من يلزمه الإجراء.')});calcUpdate()}
function holSheet(){const y=new Date().getFullYear(),fx=HOLF.map(h=>`${h[1]}/${h[0]} — ${h[2]}`),sn=dlxEaster(y);sn.setDate(sn.getDate()+1);
 sheet(`<h2 class="sht">🗓 العطلات الرسمية المحسوبة</h2><div class="shm"><b>مدمجة (كل سنة):</b><br>${fx.map(esc2).join('<br>')}<br>شم النسيم ${y}: ${sn.getDate()}/${sn.getMonth()+1}<br>الجمعة والسبت عطلة أسبوعية.</div><div class="shm" style="margin-top:8px"><b>الأعياد الدينية المتغيرة</b> (الفطر، الأضحى، وقفة عرفات، رأس السنة الهجرية، المولد النبوي) وأي إجازة تُعلنها الحكومة: أضفها هنا بحسب القرار المعلن.</div><label class="fld"><span>اسم العطلة</span><input id="hl_n"></label><label class="fld"><span>من تاريخ</span><input id="hl_d" type="date"></label><label class="fld"><span>عدد الأيام</span><input id="hl_c" type="number" min="1" max="15" value="1"></label><button class="btn pri wide" data-act="holadd">➕ إضافة</button><div id="hl_l">${holList()}</div><button class="btn wide" data-act="holback" style="margin-top:10px">← رجوع للحاسبة</button>`)}
function holList(){const L=HOL.slice().sort((a,b)=>a.date<b.date?-1:1);return L.length?L.map(h=>`<div class="pr"><span>${esc2(h.name||'عطلة')}<br><small>${fshort(h.date)}</small></span><button class="pb" data-act="holdel" data-id="${h.id}" aria-label="حذف">🗑</button></div>`).join(''):'<div class="shm">لا عطلات مضافة.</div>'}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='holsh')holSheet();
 else if(a=='holback')calcSheet();
 else if(a=='holadd'){const d=($('#hl_d')||{}).value,n=(($('#hl_n')||{}).value||'').trim().slice(0,40),c=Math.min(15,Math.max(1,+($('#hl_c')||{}).value||1));if(!d){toast('اختر تاريخ العطلة');return}
  for(let i=0;i<c;i++){const x=parseD(d);x.setDate(x.getDate()+i);const k=isoD(x);if(!HOL.some(h=>h.date==k))HOL.push({id:'h'+Date.now().toString(36)+i,date:k,name:n||'عطلة'})}holSave();$('#hl_l').innerHTML=holList();toast('أُضيفت العطلة')}
 else if(a=='holdel'){const i=HOL.findIndex(h=>h.id==el.dataset.id);if(i>=0){HOL.splice(i,1);holSave();$('#hl_l').innerHTML=holList()}}});
const dlxIn=e=>{const t=e.target;if(t.id=='cdm'){DX.mode=t.value;const w=$('#ckw');if(w)w.hidden=t.value!='km';calcUpdate()}else if(t.id=='ckm'){DX.km=+t.value||0;calcUpdate()}};
document.addEventListener('input',dlxIn);document.addEventListener('change',dlxIn);
window.dlxHolName=dlxHolName;window.dlxDist=dlxDist;window.dlxEaster=dlxEaster;
