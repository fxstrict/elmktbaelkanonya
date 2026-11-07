/* قائمة مستندات القضية قبل الرفع الإلكتروني. القوائم عامة ومقترحة من المعرفة العامة وليست من دليل المنصة أو المحكمة؛ عدّلها بما يُطلب فعلاً. */
const CHKT=[
{id:'civ',t:'دعوى مدنية / تجارية',i:['صحيفة الدعوى (أصل ونسخة لكل خصم)','سند الوكالة الساري (خاص أو عام في القضايا)','مستندات الدعوى (صور واضحة مرتبة)','كشف أو مذكرة بالمستندات','بيانات الخصوم كاملة (الاسم والموطن) وصور بطاقاتهم إن توفرت','الإنذار السابق وما يثبت إعلانه (إن وُجد)','ما يثبت سداد الرسوم','التأكد من الاختصاص المحلي والنوعي']},
{id:'fam',t:'أحوال شخصية / أسرة',i:['وثيقة الزواج (أو الطلاق)','شهادات ميلاد الأبناء','صور بطاقات الرقم القومي للطرفين','ما يثبت الدخل والعنوان ومستوى المعيشة','طلب تسوية المنازعات الأسرية وما يفيد انتهاءه (أو الاستثناء منه)','صحيفة الدعوى','سند الوكالة','ما يثبت سداد الرسوم']},
{id:'crim',t:'جنحة مباشرة / بلاغ',i:['صحيفة الجنحة المباشرة أو البلاغ','المستند محل الجريمة (الشيك أو الإيصال…) ومنه صورة واضحة','ما يثبت الواقعة (إفادة البنك أو الإنذار أو الشهود)','سند الوكالة (خاص أو عام في القضايا)','بيانات المتهم كاملة','ما يلزم من رسوم أو أمانة']},
{id:'app',t:'استئناف',i:['صورة رسمية من الحكم المستأنف','ما يثبت تاريخ الصدور أو الإعلان (لحساب الميعاد)','صحيفة الاستئناف','سند وكالة يشمل الاستئناف','مستندات الدرجة الأولى والمستندات الجديدة','مذكرة بأسباب الاستئناف','ما يثبت سداد الرسوم']},
{id:'cass',t:'طعن بالنقض',i:['صورة رسمية من الحكم المطعون فيه','ما يثبت ميعاد الطعن','صحيفة الطعن موقعة من محام مقبول أمام النقض','سند وكالة خاص بالطعن','إيصال الكفالة والرسوم','مستندات الطعن','مذكرة بأسباب الطعن']},
{id:'exec',t:'تنفيذ وإشكال',i:['الحكم أو السند التنفيذي بالصيغة التنفيذية','إعلان السند والتنبيه بالوفاء','ما يثبت إعلان المحكوم عليه','صحيفة الإشكال أو طلب التنفيذ','مستندات الإشكال','سند الوكالة']},
{id:'adm',t:'إداري / تظلم',i:['القرار المطعون فيه أو ما يثبت العلم به','التظلم وما يثبت تقديمه وتاريخه','صحيفة الدعوى','مستندات المدعي','سند الوكالة','ما يثبت ميعاد الدعوى']},
{id:'gen',t:'قائمة عامة',i:['الصحيفة أو الطلب','سند الوكالة','المستندات المؤيدة','صور بطاقات الأطراف','ما يثبت سداد الرسوم']}];
const chkDone=c=>c.chk?c.chk.items.filter(x=>x.d).length:0;
function chkCaseBlock(c){if(!c.chk)return `<div class="cph"><b>📋 مستندات الرفع</b><button class="lnk" data-act="chk">➕ إنشاء قائمة</button></div>`;
 return `<div class="cph"><b>📋 مستندات الرفع</b><span class="cst">${chkDone(c)}/${c.chk.items.length}</span><button class="lnk" data-act="chk">فتح</button></div>`}
function chkSheet(){const c=curCase();if(!c)return;
 if(!c.chk){sheet(`<h2 class="sht">📋 مستندات الرفع</h2><div class="shm">اختر نوع القضية لتبدأ بقائمة مقترحة، ثم عدّلها بما تطلبه المحكمة والمنصة.</div>`+CHKT.map(t=>`<button class="mrow" data-act="chkt" data-id="${t.id}"><span>${t.t}</span><span>‹</span></button>`).join(''));return}
 const n=c.chk.items.length,d=chkDone(c);
 sheet(`<div class="shh"><h2 class="sht">📋 مستندات الرفع</h2><button class="lnk" data-act="chkchg">تغيير النوع</button></div><div class="shm">${esc2(c.name)} — ${esc2((CHKT.find(t=>t.id==c.chk.tpl)||{}).t||'قائمة')}</div><div class="cres"><b id="chkp">${d} / ${n} جاهز</b></div>`+c.chk.items.map((x,i)=>`<div class="pr"><label class="mwk" style="flex:1;margin:0"><input type="checkbox" data-ck="${i}" ${x.d?'checked':''}> <span>${esc2(x.t)}</span></label><button class="pb" data-act="chkdel" data-i="${i}" aria-label="حذف">✕</button></div>`).join('')+`<label class="fld" style="margin-top:10px"><span>إضافة بند</span><input id="chkn" placeholder="مستند آخر مطلوب"></label><div class="acts"><button class="btn" data-act="chkadd">➕ إضافة</button><button class="btn" data-act="dp">🗂 تجهيز المستندات</button></div><div class="shm" style="margin-top:10px">قوائم عامة مقترحة وليست من دليل المنصة؛ اجعلها تطابق ما تطلبه المحكمة والمنصة فعلاً.</div>`)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const a=el.dataset.act,c=curCase();
 if(a=='chk')chkSheet();
 else if(a=='chkt'&&c){const t=CHKT.find(x=>x.id==el.dataset.id);if(t){c.chk={tpl:t.id,items:t.i.map(x=>({t:x,d:false}))};_s('lists',CLS);render();chkSheet()}}
 else if(a=='chkchg'&&c){if(confirm('تغيير النوع يستبدل القائمة الحالية. متابعة؟')){delete c.chk;_s('lists',CLS);chkSheet()}}
 else if(a=='chkadd'&&c&&c.chk){const i=document.querySelector('#chkn'),v=i&&i.value.trim();if(v){c.chk.items.push({t:v.slice(0,120),d:false});_s('lists',CLS);render();chkSheet()}}
 else if(a=='chkdel'&&c&&c.chk){c.chk.items.splice(+el.dataset.i,1);_s('lists',CLS);render();chkSheet()}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.ck!=null){const c=curCase();if(c&&c.chk&&c.chk.items[+el.dataset.ck]){c.chk.items[+el.dataset.ck].d=el.checked;_s('lists',CLS);const p=document.querySelector('#chkp');if(p)p.textContent=chkDone(c)+' / '+c.chk.items.length+' جاهز';render()}}});
