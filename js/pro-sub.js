/* شاشة الاشتراك والدفع (P5). لا تظهر ولا تعمل ما دام PRO.enabled=false. */
const proSeats=()=>Math.max(0,(PRO.founders||0)-(PRO.foundersSold||0));
const proPrice=()=>proSeats()>0?PRO.price:PRO.priceNext;
function proPayList(){const L=[];
 if(PRO.insta)L.push(['إنستا باي',PRO.insta]);if(PRO.wallet)L.push(['محفظة إلكترونية',PRO.wallet]);if(PRO.bank)L.push(['تحويل بنكي',PRO.bank]);return L}
function proSubSheet(){
 if(typeof PRO=='undefined'||!PRO.enabled)return;
 const seats=proSeats(),pay=proPayList(),ft=Object.values(PRO_FEATURES).map(f=>`<li><b>${f.t}</b> — ${f.d}</li>`).join('');
 const price=seats>0?`<div class="cres"><b>${PRO.price} جنيه / سنة</b><span>سعر المؤسسين — متبقٍ ${seats} مقعد من ${PRO.founders}</span><small>ثم ${PRO.priceNext} جنيه سنوياً بعد اكتمال المقاعد</small></div>`:`<div class="cres"><b>${PRO.priceNext} جنيه / سنة</b><span>اشتراك سنوي</span></div>`;
 const pm=pay.length?pay.map((p,i)=>`<div class="pr"><span><b>${esc2(p[0])}</b><br><small dir="ltr">${esc2(p[1])}</small></span><button class="pill" data-act="procopy" data-i="${i}">نسخ</button></div>`).join(''):'<div class="shm">تواصل معنا عبر واتساب لمعرفة وسيلة الدفع المناسبة.</div>';
 sheet(`<div class="shh"><h2 class="sht">💳 اشتراك Pro</h2><button class="lnk" data-act="pro">← لديّ كود</button></div>${price}
<div class="shm">ما يضيفه Pro (والباقي مجاني دائماً):</div><ul class="pl">${ft}</ul>
<div class="shm" style="margin-top:10px">طريقة الدفع</div>${pm}${PRO.pay?`<div class="acts one"><a class="btn pri" target="_blank" rel="noopener" href="${esc2(PRO.pay)}">💳 ادفع أونلاين</a></div>`:''}
<label class="fld"><span>اسمك (يظهر في «مرخَّص باسم»)</span><input id="psn" maxlength="30" autocomplete="name"></label>
<div class="shm">بعد الدفع أرسل لنا إيصال التحويل عبر واتساب وسنرد بكود التفعيل خلال ساعات.</div>
<div class="acts"><button class="btn pri span2" data-act="prowa">💬 أرسل الإيصال عبر واتساب</button><button class="btn span2" data-act="pro">🔑 لصق كود التفعيل</button></div>
<details class="pol"><summary>سياسة الاسترجاع والخصوصية</summary><div class="shm"><b>الاسترجاع:</b> يمكنك طلب استرداد المبلغ خلال 7 أيام من التفعيل ما لم تكن استعملت الميزات المدفوعة بكثافة، بالتواصل عبر واتساب.<br><b>الخصوصية:</b> لا نجمع منك سوى اسم/تسمية تظهر على الكود. بياناتك وقضاياك محفوظة على جهازك فقط ولا تصل إلينا، ولا نبيع بيانات ولا نعرض إعلانات خارجية.<br><b>الكود:</b> شخصي لكل مشترك وصالح سنة من تاريخ إصداره.</div></details>`)}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||typeof PRO=='undefined'||!PRO.enabled)return;const a=el.dataset.act;
 if(a=='prosub')proSubSheet();
 else if(a=='procopy'){const p=proPayList()[+el.dataset.i];if(p){try{navigator.clipboard.writeText(p[1]);toast('تم النسخ ✔')}catch(x){toast('تعذّر النسخ')}}}
 else if(a=='prowa'){const n=((document.querySelector('#psn')||{}).value||'').trim();
  if(!n){toast('اكتب اسمك أولاً');return}
  const t=`السلام عليكم، أرغب في اشتراك Pro السنوي في المكتبة القانونية.\nالخطة: اشتراك سنوي (${proPrice()} جنيه)\nالاسم: ${n}\nأرفق إيصال الدفع.`;
  open('https://wa.me/'+(PRO.wa||CONTACT.wa)+'?text='+encodeURIComponent(t),'_blank')}});
