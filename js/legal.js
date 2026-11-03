/* قائمة الأدوات + حاسبة الفوائد القانونية + بطاقة «رقم المادة» في البحث. */
const fmtMoney=n=>n.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2});
function toolsSheet(){sheet(`<h2 class="sht">🧰 الأدوات</h2><div class="acts">
<button class="btn span2" data-act="mw">🕌 حاسبة المواريث</button><button class="btn" data-act="guide">🧭 ماذا أفعل؟</button><button class="btn" data-act="calc">📅 حاسبة المواعيد</button>
<button class="btn" data-act="int">💰 حاسبة الفوائد</button><button class="btn" data-act="dir">📍 دليل العناوين</button>
<button class="btn" data-act="agenda">🗓 الأجندة</button><button class="btn" data-act="bk">💾 نسخة احتياطية</button><button class="btn" data-act="lock">🔒 قفل التطبيق</button><button class="btn" data-act="upd">🔄 تحقق من تحديث</button></div>`)}
/* ---------- الفوائد القانونية (م 226 و227 و232 مدني) ---------- */
let INT=null;
function intSheet(){const t=isoD(new Date());
 sheet(`<h2 class="sht">💰 حاسبة الفوائد القانونية</h2><label class="fld"><span>المبلغ (جنيه)</span><input id="ip" type="number" inputmode="decimal" min="0"></label><label class="fld"><span>نوع الفائدة</span><select id="ir"><option value="4">قانونية مدنية — 4%</option><option value="5">قانونية تجارية — 5%</option><option value="c">اتفاقية (أدخل النسبة)</option></select></label><label class="fld" id="icw" hidden><span>النسبة السنوية %</span><input id="ic" type="number" inputmode="decimal" step="0.1" min="0"></label><label class="fld"><span>من تاريخ (المطالبة القضائية أو الاستحقاق)</span><input id="ifd" type="date"></label><label class="fld"><span>إلى تاريخ</span><input id="itd" type="date" value="${t}"></label><div id="io" class="cres"><span>أدخل المبلغ وتاريخ البداية</span></div><div class="acts"><button class="btn" data-act="icopy">📋 نسخ النتيجة</button></div><div class="shm" style="margin-top:12px">للاسترشاد: الفائدة القانونية 4% في المسائل المدنية و5% في التجارية، وتسري من تاريخ المطالبة القضائية ما لم يحدد الاتفاق أو العرف تاريخاً آخر (م 226 مدني). أقصى فائدة اتفاقية 7% (م 227). لا فوائد على متجمد الفوائد، ولا يزيد مجموع الفوائد عن رأس المال (م 232). الحساب بسيط على أساس 365 يوماً.</div>`)}
function intUpdate(){const g=id=>document.querySelector(id),ty=g('#ir').value;g('#icw').hidden=ty!='c';
 const p=parseFloat(g('#ip').value),r=ty=='c'?parseFloat(g('#ic').value):+ty,a=g('#ifd').value,b=g('#itd').value;
 if(!(p>0)||!(r>=0)||!a||!b){INT=null;g('#io').innerHTML='<span>أدخل المبلغ وتاريخ البداية'+(ty=='c'?' والنسبة':'')+'</span>';return}
 const days=Math.round((parseD(b)-parseD(a))/864e5);if(days<0){INT=null;g('#io').innerHTML='<span>تاريخ النهاية قبل البداية</span>';return}
 const it=p*r/100*days/365,tot=p+it;INT={p,r,days,it,tot,a,b};
 g('#io').innerHTML=`<span>الفوائد عن ${days} يوماً (${(days/365).toFixed(2)} سنة) بنسبة ${r}%</span><b>${fmtMoney(it)} جنيه</b><span>الإجمالي مع أصل الدين: ${fmtMoney(tot)}</span>${it>p?'<small>تنبيه: الفوائد تجاوزت رأس المال، وم 232 مدني تمنع أن يزيد مجموع الفوائد عن رأس المال</small>':''}${ty=='c'&&r>7?'<small>تنبيه: الفائدة الاتفاقية فوق 7% تُخفَّض إلى 7% (م 227)</small>':''}`}
/* ---------- بطاقة رقم المادة ---------- */
const LAWS0=[['مدني','القانون المدني',['مدني','مدنيه']],['مرافعات','قانون المرافعات المدنية والتجارية',['مرافعات','مرافعه']],['عقوبات','قانون العقوبات',['عقوبات','عقوبه']],['اجراءات جنائيه','قانون الإجراءات الجنائية',['اجراءات جنائيه','اجراءات جنائية','اجراءات','ج']],['اثبات','قانون الإثبات في المواد المدنية والتجارية',['اثبات']],['تجاره','قانون التجارة',['تجاره','تجاري']],['شركات','قانون الشركات',['شركات']],['ايجار','قوانين الإيجار',['ايجار','ايجارات','اجار']],['احوال شخصيه','الأحوال الشخصية والأسرة',['احوال شخصيه','احوال','اسره','اسرة']],['عمل','قانون العمل',['عمل','عمال']],['مرور','قانون المرور',['مرور']],['مخدرات','قانون مكافحة المخدرات',['مخدرات']],['ضرائب','قوانين الضرائب',['ضرائب','ضريبه']]];
const LAWS=LAWS0.map(l=>[l[0],l[1],l[2].filter(k=>k!='ج').map(nz)]);
const LAWS_FOLDER='1-h6vQro9V7_b_fy7WAo1QOBg9zlwsBRJ';
function artCard(q){q=nz((q||'').trim()).replace(/[()«»"]/g,' ').replace(/\s+/g,' ').trim();if(!q)return'';let m=q.match(/^(?:ماده|م)\s*(\d{1,4})\s*(?:مكرر\s*\w*)?\s*(?:من|ف)?\s*(?:قانون|القانون|ق)?\s*(.*)$/),num,rest;
 if(m){num=m[1];rest=m[2]}else{m=q.match(/^(\d{1,4})\s+(?:من\s+)?(?:قانون\s+|القانون\s+)?(.+)$/);if(!m)return'';num=m[1];rest=m[2]}
 rest=rest.replace(/^ال/,'').trim();const law=LAWS.find(l=>l[2].some(k=>rest==k||rest==nz('ال'+k)||(rest.length>=3&&k.startsWith(rest))));
 if(!law&&/^\d/.test(q)&&!m)return'';
 const name=law?law[1]:null,gq=encodeURIComponent('نص المادة '+num+' '+(name||rest||'')+' مصر'),p=law?parseQ(law[0]):null;
 const files=p?D.filter(d=>'vbqkx'.includes(d[2])&&score(d,p)>0).sort((a,b)=>score(b,p)-score(a,p)).slice(0,3):[];
 return `<div class="acard"><b>📖 مادة ${num}${name?' — '+name:''}</b>${name?'':'<div class="shm">اكتب اسم القانون مع رقم المادة، مثل: «مادة 226 مدني»</div>'}<div class="acts"><a class="btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${gq}">🌐 نص المادة على الويب</a><a class="btn" target="_blank" rel="noopener" href="https://drive.google.com/drive/folders/${LAWS_FOLDER}">📚 أكواد القوانين (درايف)</a></div>${files.length?'<div class="shm" style="margin:8px 0 4px">في مكتبتك عن هذا القانون:</div>'+files.map(d=>`<div class="pr" data-act="open" data-id="${d[0]}" style="cursor:pointer"><span>${d[1]}</span><small>${d.t}</small></div>`).join(''):''}<div class="shm" style="margin-top:6px">لا يمكن فتح المادة نفسها داخل ملف درايف؛ افتح القانون ثم ابحث عن رقم المادة.</div></div>`}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act;
 if(a=='tools')toolsSheet();else if(a=='int')intSheet();
 else if(a=='icopy'){if(INT&&navigator.clipboard){const x=INT;navigator.clipboard.writeText(`فوائد قانونية ${x.r}% على مبلغ ${fmtMoney(x.p)} جنيه من ${x.a} إلى ${x.b} (${x.days} يوماً): ${fmtMoney(x.it)} جنيه — الإجمالي ${fmtMoney(x.tot)}`).then(()=>toast('تم نسخ النتيجة'),()=>toast('تعذّر النسخ'))}else toast('أكمل البيانات أولاً')}});
document.addEventListener('input',e=>{if(['ip','ic','ifd','itd'].includes(e.target.id))intUpdate()});
document.addEventListener('change',e=>{if(['ir','ip','ic','ifd','itd'].includes(e.target.id))intUpdate()});
