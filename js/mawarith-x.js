/* امتدادات حاسبة المواريث: قسمة الأعيان وفروق التسوية، المناسخات، تصدير Word، والحفظ في ملف القضية. */
const MWX={assign:{},mk:'',h:{}};
const MW_MALE=['husband','sons','gsons','father','grandfather','fullBro','patBro','matBro','fullNephew','patNephew','fullUncle','patUncle','fullCousin','patCousin'];
const mwOk=()=>{const c=mwCompute();return c.res&&!c.res.out&&c.est&&!c.est.error?c:null};
const mwSigned=d=>d>0.005?'يدفع '+fmtMoney(d):d<-0.005?'يستلم '+fmtMoney(-d):'متعادل';
/* ---------- قسمة الأعيان ---------- */
function mwDivSheet(){const c=mwOk();if(!c){toast('أكمل بيانات الورثة والتركة أولاً');return}const est=c.est,assets=MW.assets.map((a,i)=>({i,n:a.n||('أصل '+(i+1)),v:mwN(a.q)*mwN(a.p)})).filter(a=>a.v>0);if(!assets.length){toast('أدخل أصولاً بقيمها أولاً');return}
 const rec=[...est.rows.filter(r=>r.f[0]>0n).map(r=>['h:'+r.key,r.label]),...est.wills.map((w,i)=>['w:'+i,'موصى له: '+w.n]),...(est.wj?est.wj.rows.map((x,i)=>['j:'+i,'وصية واجبة: '+x.n]):[])];
 sheet(`<div class="shh"><h2 class="sht">🧩 قسمة الأعيان</h2><button class="lnk" data-act="mwres">← النتيجة</button></div><div class="shm">وزّع كل أصل على من سيستلمه، فيظهر الفرق بين ما يستحقه كل طرف وقيمة ما أخذ لتسويته نقداً. الأصول غير الموزَّعة تبقى مشاعاً.</div>`+assets.map(a=>`<label class="fld"><span>${esc2(a.n)} — ${fmtMoney(a.v)}</span><select data-mwa="${a.i}"><option value="">مشاع (لم يُوزَّع)</option>${rec.map(r=>`<option value="${r[0]}" ${MWX.assign[a.i]==r[0]?'selected':''}>${esc2(r[1])}</option>`).join('')}</select></label>`).join('')+'<div id="mwdv"></div><div class="acts"><button class="btn span2" data-act="mwdvcopy">📋 نسخ جدول التسوية</button></div>');mwDivRes()}
function mwDivData(){const c=mwOk();return c?mwDivide(c.est,MW.assets,MWX.assign):null}
function mwDivRes(){const d=mwDivData(),el=document.querySelector('#mwdv');if(!d||!el)return;
 el.innerHTML=d.rows.map(r=>`<div class="mwx"><b>${esc2(r.label)}</b><div>يستحق: ${fmtMoney(r.due)} — أخذ بالأعيان: ${fmtMoney(r.got)}</div><div><b>${mwSigned(r.diff)}</b></div></div>`).join('')+`<div class="cres"><span>مجموع ما يُدفع للتركة: ${fmtMoney(d.pay)}</span><span>مجموع ما يُستلم: ${fmtMoney(d.recv)}</span><b>الباقي لسداد الديون والمصروفات: ${fmtMoney(d.toDebts)}</b>${d.unassigned>0?`<small>أصول مشاع لم تُوزَّع: ${fmtMoney(d.unassigned)}</small>`:''}</div><div class="shm">من يدفع يودع المبلغ في صندوق التركة، ومنه يُدفع للمستلمين وتُسدَّد الديون ومصروفات التجهيز.</div>`}
/* ---------- المناسخات ---------- */
function mwMunSheet(){const c=mwOk();if(!c){toast('أكمل بيانات الورثة والتركة أولاً');return}const gs=c.res.rows.filter(r=>r.f[0]>0n);if(!gs.length){toast('لا وارث له نصيب');return}if(!gs.some(r=>r.key==MWX.mk)){MWX.mk=gs[0].key;MWX.h={}}
 const fem=!MW_MALE.includes(MWX.mk);
 sheet(`<div class="shh"><h2 class="sht">🔁 مناسخة</h2><button class="lnk" data-act="mwres">← النتيجة</button></div><div class="shm">وارث توفي قبل قسمة التركة: يُحسب نصيبه من التركة الأولى، ثم يُوزَّع على ورثته هو. اختر الوارث المتوفى ثم أدخل ورثته.</div><label class="fld"><span>الوارث الذي توفي</span><select id="mwmk">${gs.map(r=>`<option value="${r.key}" ${r.key==MWX.mk?'selected':''}>${esc2(mwLab(r.key,1))}</option>`).join('')}</select></label>`+MWS.map(([t,ks])=>`<div class="shm mws">${t}</div>`+ks.filter(k=>!(k=='husband'&&!fem)&&!(k=='wives'&&fem)).map(k=>{const v=parseInt(MWX.h[k])||0;return `<div class="mwr"><span>${mwLab(k,1)}${mwLab(k,2)!=mwLab(k,1)?' / '+mwLab(k,2):''}</span><span class="mwc"><button data-act="mwq" data-k="${k}" data-d="-1">−</button><b id="mq_${k}">${v}</b><button data-act="mwq" data-k="${k}" data-d="1">+</button></span></div>`}).join('')).join('')+'<div id="mwmr" style="margin-top:10px"></div>');mwMunRes()}
function mwMunRes(){const c=mwOk(),el=document.querySelector('#mwmr');if(!c||!el)return;const fem=!MW_MALE.includes(MWX.mk),has=MW_KEYS.some(k=>(parseInt(MWX.h[k])||0)>0&&!(k=='husband'&&!fem)&&!(k=='wives'&&fem));
 if(!has){el.innerHTML='<div class="shm">أدخل ورثة المتوفى ثانياً لتظهر النتيجة.</div>';return}
 const r2=mwSolve(MWX.h,fem);if(r2.out){el.innerHTML=`<div class="wn">${esc2(r2.out)}</div>`;return}
 const r1=c.res.rows.find(x=>x.key==MWX.mk),m1=c.est.rows.find(x=>x.key==MWX.mk),L=mwMun(c.res,c.est,MWX.mk,r2);
 el.innerHTML=`<div class="cres"><span>نصيب المتوفى ثانياً من التركة الأولى</span><b>${fstr(r1.per)}${m1?' = '+fmtMoney(m1.each):''}</b></div>`+L.map(x=>`<div class="mwx"><b>${esc2(x.label)}${x.count>1?' × '+x.count:''}</b><div>من التركة الأولى: <b>${fstr(x.fracFirst)}</b>${x.money!=null?' = '+fmtMoney(x.money):''}${x.count>1?' — لكل فرد '+fstr(x.fracEach)+(x.each!=null?' = '+fmtMoney(x.each):''):''}</div><small>${esc2(x.why)}</small></div>`).join('')+'<div class="shm">إن كان أحد هؤلاء وارثاً أيضاً في المسألة الأولى فاجمع نصيبيه. تُوزَّع التركة الثانية بعد الوصايا والديون الخاصة بالمتوفى ثانياً، ولم تُحسب هنا.</div>'}
/* ---------- تصدير Word ---------- */
function mwBlocks(){const{res,est}=mwCompute(),B=[{t:'h',x:'مسألة مواريث'},{t:'p',x:'المتوفى: '+(MW.female?'أنثى':'ذكر')+' — التاريخ: '+isoD(new Date())}];
 if(res.out){B.push({t:'p',x:res.out});return B}
 if(est&&!est.error){B.push({t:'h',x:'التركة',sz:26},{t:'tbl',rows:[['البند','المبلغ (جنيه)'],['إجمالي الأصول',fmtMoney(est.A)],['الديون ومصروفات التجهيز',fmtMoney(est.D)],['صافي التركة',fmtMoney(est.net)],['ثلث الصافي',fmtMoney(est.third)]]});
  if(est.wj&&est.wj.rows.length)B.push({t:'h',x:'الوصية الواجبة (م 76–80 من قانون الوصية 71/1946)',sz:26},{t:'tbl',rows:[['الولد المتوفى','نصيبه لو كان حياً','المنفذ'],...est.wj.rows.map(x=>[x.n+' ('+x.t+')',fstr(x.share)+' = '+fmtMoney(x.gross),fmtMoney(x.paid)])]});
  if(est.W>0)B.push({t:'h',x:'الوصايا الاختيارية (م 37)',sz:26},{t:'tbl',rows:[['الموصى له','الصفة','الموصى به','المنفذ'],...est.wills.map(w=>[w.n,w.t,fmtMoney(w.amt),fmtMoney(w.got)])]},{t:'p',x:est.exceed?`الزيادة على الثلث ${fmtMoney(est.E)} تتوقف على إجازة الورثة؛ نُفذ منها بالإجازة ${fmtMoney(est.P)}.`:'الوصايا في حدود الثلث وتنفذ كاملة.',sz:22})}
 else if(est&&est.error)B.push({t:'p',x:est.error});
 B.push({t:'h',x:'الورثة وأنصبتهم (أصل المسألة: '+res.base+')',sz:26},{t:'tbl',rows:[['الوارث','العدد','النصيب','النسبة','المبلغ','لكل فرد'],...res.rows.map(r=>{const m=est&&!est.error?est.rows.find(x=>x.key==r.key):null;return[r.label,String(r.count),fstr(r.f),mwPct(r.f),m&&r.f[0]>0n?fmtMoney(m.money):'—',m&&r.f[0]>0n?fmtMoney(m.each):'—']})]});
 res.rows.forEach(r=>B.push({t:'li',x:r.label+': '+r.why}));
 res.notes.forEach(n=>B.push({t:'li',x:n}));
 B.push({t:'p',x:'أداة استرشادية وفق قانون المواريث 77 لسنة 1943 وقانون الوصية 71 لسنة 1946، ولا تغني عن الإعلام الشرعي من المحكمة ولا عن مراجعة المختص.',sz:20});return B}
async function mwSend(u8,name,type){const blob=new Blob([u8],{type}),file=new File([u8],name,{type});
 if(navigator.canShare&&navigator.canShare({files:[file]})&&/Android|iPhone|iPad/i.test(navigator.userAgent)){try{await navigator.share({files:[file],title:name});toast('تم',2000);return}catch(x){if(x&&x.name=='AbortError')return}}
 const u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),8000);toast('⬇ بدأ تنزيل «'+name+'» — افتحه من إشعار التنزيلات',5000)}
/* ---------- الحفظ في ملف القضية ---------- */
const mwSnap=()=>JSON.stringify({female:MW.female,h:MW.h,assets:MW.assets,debts:MW.debts,wills:MW.wills,wj:MW.wj,appr:MW.appr});
function mwSaveSheet(){const L=CLS;sheet(`<h2 class="sht">💾 حفظ المسألة في ملف قضية</h2><div class="shm">تُحفظ النتيجة وبياناتها داخل ملف القضية فتعيد فتحها وتعديلها لاحقاً، وتدخل ضمن النسخة الاحتياطية.</div>`+(L.length?L.map(c=>`<button class="mrow" data-act="mwsc" data-id="${c.id}"><span>📁 ${esc2(c.name)}${c.mw?' <small>(فيها مسألة محفوظة ستُستبدل)</small>':''}</span><span>‹</span></button>`).join(''):'<div class="shm">لا توجد قضايا بعد.</div>')+'<button class="btn pri wide" data-act="mwsnew" style="margin-top:10px">➕ قضية جديدة</button>')}
function mwSaveTo(c){c.mw={d:isoD(new Date()),t:mwText().slice(0,3500),s:mwSnap()};_s('lists',CLS);closeSheet();toast('تم الحفظ في ملف «'+c.name+'»',3000);render()}
function mwCaseBlock(c){return `<div class="cph"><b>🕌 مسألة مواريث محفوظة</b><span class="cst">${esc2(c.mw.d||'')}</span></div><div class="acts"><button class="btn" data-act="mwopen">فتح وتعديل</button><button class="btn" data-act="mwcopyc">📋 نسخ</button><button class="btn span2" data-act="mwdelc">🗑 حذف المسألة المحفوظة</button></div>`}
/* ---------- الأحداث ---------- */
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='mwdiv')mwDivSheet();else if(a=='mwmun')mwMunSheet();
 else if(a=='mwres'){MW.step=4;mwRender()}
 else if(a=='mwq'){const k=el.dataset.k,v=Math.max(0,Math.min(MWMAX[k]||20,(parseInt(MWX.h[k])||0)+(+el.dataset.d)));MWX.h[k]=v;const b=document.querySelector('#mq_'+k);if(b)b.textContent=v;mwMunRes()}
 else if(a=='mwdvcopy'){const d=mwDivData();if(d&&navigator.clipboard)navigator.clipboard.writeText('تسوية قسمة الأعيان\n'+d.rows.map(r=>'• '+r.label+': يستحق '+fmtMoney(r.due)+' — أخذ '+fmtMoney(r.got)+' — '+mwSigned(r.diff)).join('\n')+'\nالباقي لسداد الديون: '+fmtMoney(d.toDebts)).then(()=>toast('تم النسخ'),()=>toast('تعذّر النسخ'))}
 else if(a=='mwdoc'){if(!mwCompute().res){return}try{await mwSend(docxBuild(mwBlocks()),'مسألة-مواريث-'+isoD(new Date())+'.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document')}catch(x){toast('تعذّر إنشاء الملف')}}
 else if(a=='mwsave'){if(!mwOk()){toast('أكمل بيانات الورثة والتركة أولاً');return}mwSaveSheet()}
 else if(a=='mwsc'){const c=CLS.find(x=>x.id==el.dataset.id);if(c)mwSaveTo(c)}
 else if(a=='mwsnew'){const n=prompt('اسم القضية الجديدة');if(n&&n.trim()){const c={id:'l'+Date.now().toString(36),name:n.trim().slice(0,60),items:[]};CLS.push(c);mwSaveTo(c)}}
 else if(a=='mwopen'){const c=curCase();if(c&&c.mw){try{const s=JSON.parse(c.mw.s);Object.assign(MW,{female:!!s.female,h:s.h||{},assets:s.assets||[{n:'',q:'1',p:''}],debts:s.debts||[],wills:s.wills||[],wj:s.wj||[],appr:s.appr||{},step:4});mwRender()}catch(x){toast('تعذّر فتح المسألة المحفوظة')}}}
 else if(a=='mwcopyc'){const c=curCase();if(c&&c.mw&&navigator.clipboard)navigator.clipboard.writeText(c.mw.t).then(()=>toast('تم النسخ'),()=>toast('تعذّر النسخ'))}
 else if(a=='mwdelc'){const c=curCase();if(c&&c.mw&&confirm('حذف المسألة المحفوظة من هذه القضية؟')){delete c.mw;_s('lists',CLS);render()}}});
document.addEventListener('change',e=>{const el=e.target;
 if(el.dataset&&el.dataset.mwa!=null){MWX.assign[el.dataset.mwa]=el.value;mwDivRes()}
 else if(el.id=='mwmk'){MWX.mk=el.value;MWX.h={};mwMunSheet()}});
