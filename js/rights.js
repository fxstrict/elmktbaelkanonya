/* L7 (1.29.0) — حقوق النشر وإزالة المحتوى.
   • data/takedown.json = {"ids":[معرّفات ملفات درايف المطلوب إخفاؤها]}؛ يُقرأ كل فتح بمهلة 4 ث ويُحفظ نسخة محلية في المفتاح tkd
     (محلي للجهاز، خارج النسخ الاحتياطية عمداً)، وتُطبَّق القائمة المحفوظة قبل بناء الواجهة فتعمل بلا إنترنت.
   • ما في القائمة يُحذف من DATA وPARTS قبل app.js؛ القوائم والمفضلة تتجاهله أصلاً (تصفّي بـ byId). تغيّر القائمة يُطبَّق عند إعادة فتح التطبيق.
   • واجهة: إشعار حقوق النشر + «طلب إزالة» لكل صيغة (واتساب/بريد برسالة جاهزة) + تنبيه على الكتب والموسوعات. إضافة فقط: يلفّ itemSheet وcontactSheet.
   النواة (RT) نقية وتعمل في Node (tools/l7-test.js). يُحمَّل بعد data/broken.js وقبل tools.js. */
const RT = (() => {
  const S = x => String(x == null ? '' : x).trim();
  const ID = /^[A-Za-z0-9_-]{10,80}$/;
  /* ids صالحة فقط، بلا تكرار، بترتيب أول ظهور؛ أي مُدخل غير متوقع ← [] */
  const clean = j => { const a = j && Array.isArray(j.ids) ? j.ids : Array.isArray(j) ? j : []; const o = [], s = new Set(); a.forEach(x => { x = S(x); if (ID.test(x) && !s.has(x)) { s.add(x); o.push(x) } }); return o };
  /* يحذف من data (مصفوفة صفوف [id,title,type,branch]) ومن parts (كائن) في مكانهما؛ يرجع عدد المحذوف من data */
  const apply = (data, parts, ids) => { const s = new Set(ids || []); if (!s.size) return 0; let n = 0; for (let i = data.length - 1; i >= 0; i--) if (s.has(data[i][0])) { data.splice(i, 1); n++ } if (parts) s.forEach(id => { delete parts[id] }); return n };
  const same = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  /* نص طلب الإزالة/الإبلاغ برسالة جاهزة */
  const msg = (title, id, link) => 'السلام عليكم، طلب بخصوص حقوق النشر في المكتبة القانونية.\nالمادة: ' + S(title) + '\nالمعرّف: ' + S(id) + (link ? '\nالرابط: ' + S(link) : '') + '\nصفتي (مؤلف/ناشر/وكيل صاحب الحق): ....\nالمطلوب: إزالة هذه المادة من المكتبة.\nما يثبت ملكية الحق: ....';
  /* هل المادة مصنَّف منسوب لمؤلف (كتاب/موسوعة) فيستحق تنبيهاً ظاهراً؟ */
  const authored = t => t === 'b' || t === 'v';
  return { ID, clean, apply, same, msg, authored };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = RT;

/* ---------- ربط المتصفح ---------- */
if (typeof document !== 'undefined' && typeof DATA !== 'undefined') {
  const rtGet = () => { try { return RT.clean({ ids: JSON.parse(localStorage.getItem('tkd')) }) } catch (e) { return [] } };
  const rtHidden = rtGet(); RT.apply(DATA, typeof PARTS !== 'undefined' ? PARTS : null, rtHidden);
  window.RTX = { hidden: rtHidden.slice(), pending: false };
  /* تحديث القائمة من الشبكة؛ لا يكتب شيئاً إن لم تتغير */
  window.rtRefresh = async () => {
    try {
      const r = await fetchT('data/takedown.json?t=' + Date.now(), { cache: 'no-store' }, 4000); if (!r.ok) return false;
      const ids = RT.clean(await r.json());
      if (RT.same(ids, rtGet())) return false;
      localStorage.setItem('tkd', JSON.stringify(ids)); RTX.pending = !RT.same(ids, RTX.hidden);
      if (RTX.pending && typeof toast == 'function') toast('تحديث في المحتوى — يُطبَّق عند إعادة فتح التطبيق', 4000);
      return true;
    } catch (e) { return false }
  };
  setTimeout(() => { try { rtRefresh() } catch (e) {} }, 1500);
  /* واجهة: تُركَّب بعد تحميل كل السكربتات (itemSheet وcontactSheet يُعرَّفان في app.js المتأخر) */
  const rtUi = () => {
  const rtLink = id => { try { return pv(id) } catch (e) { return '' } };
  const rtBtn = (t, id) => `<a class="btn" target="_blank" rel="noopener" href="${wa(RT.msg(t, id, rtLink(id)))}">©️ طلب إزالة / حقوق نشر</a>`;
  window.rtSheet = () => sheet(`<h2 class="sht">حقوق النشر وطلب الإزالة</h2>
<div class="shm">المكتبة القانونية تجمع روابط لمستندات وكتب منشورة على الإنترنت وتنظّمها للاطلاع المهني، ولا تدّعي ملكيتها. الصيغ المنسوخة للتعبئة تُعدَّل على مسؤولية المحامي.</div>
<div class="wn">إن كنتَ مؤلفاً أو ناشراً أو صاحب حق ويرد في المكتبة ما تعترض عليه، أرسل اسم المادة وما يثبت صفتك وسنُخفيها من التطبيق لدى كل المستخدمين عبر تحديث القائمة.</div>
<div class="acts one"><a class="btn pri" target="_blank" rel="noopener" href="${wa('السلام عليكم، طلب بخصوص حقوق النشر في المكتبة القانونية.\nالمادة: ....\nصفتي: ....\nالمطلوب: إزالة المادة.')}">💬 إرسال طلب عبر واتساب</a><a class="btn" href="mailto:${CONTACT.mail}?subject=${encodeURIComponent('طلب إزالة مادة — المكتبة القانونية')}">✉️ إرسال بالبريد الإلكتروني</a></div>
<div class="shm" style="margin-top:12px">لإبلاغ عن مادة بعينها افتحها واضغط «طلب إزالة / حقوق نشر».</div>`);
  document.addEventListener('click', e => { const el = e.target.closest('[data-act=rtnotice]'); if (el) { e.preventDefault(); rtSheet() } });
  if (typeof itemSheet == 'function') {
    const _is = itemSheet;
    window.itemSheet = itemSheet = function (id) {
      const r = _is.apply(this, arguments);
      try {
        const d = byId[id], sh = document.querySelector('#sh'), a = sh && sh.querySelector('.acts'); if (!d || !a) return r;
        const note = RT.authored(d[2]) ? '<div class="shm rtn" style="margin:8px 0 0">📚 مصنَّف منسوب لمؤلفه، مُتاح للاطلاع المهني. لصاحب الحق طلب إزالته.</div>' : '';
        a.insertAdjacentHTML('afterend', note + `<div class="acts one rtb" style="margin-top:6px">${rtBtn(d[1], id)}</div>`);
      } catch (e) {} return r;
    };
  }
  if (typeof contactSheet == 'function') {
    const _cs = contactSheet;
    window.contactSheet = contactSheet = function () {
      const r = _cs.apply(this, arguments);
      try { const a = document.querySelector('#sh .acts'); if (a) a.insertAdjacentHTML('beforeend', '<button class="btn" data-act="rtnotice">©️ حقوق النشر وطلب الإزالة</button>') } catch (e) {} return r;
    };
  }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rtUi); else rtUi();
}
