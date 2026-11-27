/* نواة إدارة القضايا (L5): منطق نقي بلا DOM ولا تخزين، يعمل في المتصفح وفي Node (tools/l5-test.js).
   يشمل: تطبيع الأسماء وفحص تعارض المصالح، تسجيل قرار الجلسة وإنشاء الجلسة التالية، جدول الجلسات بالمدى، سجل القرارات، وحسابات سجل الوقت.
   التواريخ نصوص ISO (YYYY-MM-DD) تُحسب بتوقيت UTC فلا يتأثر الحساب بمنطقة الجهاز. الحساب المالي عبر FC (قروش) من feecore.js. */
const CM = (() => {
  const _FC = (typeof FC !== 'undefined') ? FC : require('./feecore.js');
  const clip = (x, n) => String(x == null ? '' : x).trim().slice(0, n);

  /* ---------- التواريخ ---------- */
  const iso = t => t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(t.getUTCDate()).padStart(2, '0');
  const validDate = s => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  };
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return iso(new Date(Date.UTC(y, m - 1, d + n))); };
  /* مدى جاهز من «اليوم»: today | tomorrow | 7d (اليوم + 6) | month (الشهر التقويمي لليوم). المجهول = اليوم */
  const range = (kind, today) => {
    if (kind === 'tomorrow') { const t = addDays(today, 1); return { from: t, to: t }; }
    if (kind === '7d') return { from: today, to: addDays(today, 6) };
    if (kind === 'month') { const [y, m] = today.split('-').map(Number); return { from: today.slice(0, 8) + '01', to: iso(new Date(Date.UTC(y, m, 0))) }; }
    return { from: today, to: today };
  };

  /* ---------- الأسماء وتعارض المصالح ---------- */
  const TITLES = new Set(['السيد', 'السيده', 'الاستاذ', 'الاستاذه', 'المهندس', 'المهندسه', 'الدكتور', 'الدكتوره', 'الحاج', 'الحاجه', 'المدعو', 'المدعي']);
  /* تطبيع: تشكيل/تطويل، توحيد الألف والياء والتاء المربوطة، أرقام هندية، حذف الترقيم، ضم «عبد» لما بعدها، حذف الألقاب من البداية */
  const norm = x => {
    if (x === null || x === undefined) return '';
    let s = String(x).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    s = s.replace(/[\u064B-\u0652\u0640\u0670]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
    s = s.toLowerCase().replace(/[^\u0621-\u064A0-9a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/(^| )عبد (?=\S)/g, '$1عبد');
    let t = s.split(' ');
    while (t.length > 1 && TITLES.has(t[0])) t.shift();
    return t.join(' ');
  };
  /* حقل أطراف → قائمة أسماء (فاصلة، فاصلة عربية، «؛»، «/»، سطر جديد، « و » و« ضد » بمسافات حولها) */
  const names = f => (f === null || f === undefined) ? [] : String(f).split(/[،,؛;\/\n\r]+|\s+و\s+|\s+ضد\s+/).map(x => x.trim()).filter(Boolean);
  /* exact: الاسم نفسه بعد التطبيع. part: الأقصر (≥ كلمتين) مجموعة جزئية من الأطول. غير ذلك ''. الترتيب المختلف بالطول نفسه ليس تطابقاً */
  const match = (a, b) => {
    const na = norm(a), nb = norm(b); if (!na || !nb) return '';
    if (na === nb) return 'exact';
    const ta = na.split(' '), tb = nb.split(' '), sh = ta.length <= tb.length ? ta : tb, lo = ta.length <= tb.length ? tb : ta;
    if (sh.length < 2 || sh.length === lo.length) return '';
    const set = new Set(lo); return sh.every(t => set.has(t)) ? 'part' : '';
  };
  /* o: {client, opp, selfId}. النتيجة: [{lv:'hi'|'lo', kind, mt, mine, who, cid, cname, cstatus, src:'case'|'poa'}] التعارض المباشر أولاً.
     hi: موكل جديد = خصم سابق، أو خصم جديد = موكل سابق، أو خصم جديد = صاحب توكيل ساري. lo: معلومة (الموكل/الخصم نفسه في قضية أخرى، توكيل غير ساري). لا تُستثنى القضايا المنتهية (واجب السرية باقٍ) */
  const conflicts = (cases, pas, o) => {
    o = o || {}; const qc = names(o.client), qo = names(o.opp), got = new Map();
    const add = r => { const k = r.kind + '|' + r.cid + '|' + norm(r.who), old = got.get(k); if (!old || (old.mt === 'part' && r.mt === 'exact')) got.set(k, r); };
    const chk = (mine, theirs, kind, lv, base) => mine.forEach(m => names(theirs).forEach(w => { const mt = match(m, w); if (mt) add(Object.assign({ lv, kind, mt, mine: m, who: w }, base)); }));
    (cases || []).forEach(c => {
      if (!c || c.id === o.selfId) return;
      const base = { cid: c.id, cname: c.name || '', cstatus: c.status || '', src: 'case' };
      chk(qc, c.opp, 'client_vs_opp', 'hi', base); chk(qo, c.client, 'opp_vs_client', 'hi', base);
      chk(qc, c.client, 'same_client', 'lo', base); chk(qo, c.opp, 'same_opp', 'lo', base);
    });
    (pas || []).forEach(p => {
      if (!p) return; const base = { cid: p.case || '', cname: '', cstatus: p.status || '', src: 'poa', pid: p.id };
      chk(qo, p.client, 'poa', (p.status || 'ساري') === 'ساري' ? 'hi' : 'lo', base); chk(qc, p.client, 'poa_client', 'lo', base);
    });
    const rk = r => (r.lv === 'hi' ? 0 : 2) + (r.mt === 'exact' ? 0 : 1);
    return [...got.values()].map((r, i) => [r, i]).sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1]).map(x => x[0]);
  };

  /* ---------- قرارات الجلسات ---------- */
  const DEC = ['تأجيل', 'حجز للحكم', 'صدور حكم', 'شطب', 'وقف', 'إحالة', 'أخرى'];
  /* ما يُحدَّث في حالة القضية بقرار (الشطب والتأجيل والإحالة لا تغيّر الحالة: الشطب قابل للتجديد) */
  const STATUS = { 'حجز للحكم': 'محجوزة للحكم', 'صدور حكم': 'صدر فيها حكم', 'وقف': 'مؤجلة' };
  const newId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  /* يغلق الجلسة sid بقرار d={t,n,nd,nt,nn,st} ويُنشئ الجلسة التالية (أو يحدّث التي أنشأها قرار سابق لهذه الجلسة، أو يربط جلسة مفتوحة قائمة بالتاريخ نفسه).
     ذرّي: كل التحقق قبل أي تغيير. يعيد {ok,created,status,nid} أو {ok:false,err}. now = تاريخ اليوم ISO */
  const decide = (c, sid, d, now) => {
    d = d || {};
    if (!c || !Array.isArray(c.sessions)) return { ok: false, err: 'لا جلسات في هذه القضية' };
    const s = c.sessions.find(x => x && x.id === sid); if (!s) return { ok: false, err: 'الجلسة غير موجودة' };
    if (DEC.indexOf(d.t) < 0) return { ok: false, err: 'اختر نوع القرار' };
    const nd = d.nd ? String(d.nd) : '', nt = clip(d.nt, 5);
    if (nd) {
      if (!validDate(nd)) return { ok: false, err: 'تاريخ الجلسة التالية غير صالح' };
      if (validDate(s.date) && nd < s.date) return { ok: false, err: 'تاريخ الجلسة التالية قبل تاريخ هذه الجلسة' };
    }
    const prev = s.dec || null; let created = null, nid = (prev && prev.nid) || '';
    if (nd) {
      const linked = nid && c.sessions.find(x => x && x.id === nid);
      if (linked && !linked.done) { linked.date = nd; linked.time = nt; if (d.nn !== undefined) linked.note = clip(d.nn, 100); }
      else {
        const dup = c.sessions.find(x => x && x !== s && !x.done && x.date === nd && (x.time === nt || !x.time || !nt));
        if (dup) nid = dup.id;
        else { created = { id: newId(), date: nd, time: nt, note: clip(d.nn, 100), done: false }; c.sessions.push(created); nid = created.id; }
      }
    }
    s.done = true;
    s.dec = { t: d.t, n: clip(d.n, 300), nd, at: (prev && prev.at) || now || '' };
    if (nid) s.dec.nid = nid;
    let status = null; if (d.st && STATUS[d.t]) { c.status = status = STATUS[d.t]; }
    return { ok: true, created, status, nid: nid || null };
  };

  /* ---------- جدول الجلسات وسجل القرارات ---------- */
  /* o: {from,to,today,done,late}. late = المفتوحة قبل اليوم (تتجاهل from/to). مرتبة بالتاريخ ثم الوقت (الموقّتة أولاً وغير الموقّتة آخر اليوم) */
  const schedule = (cases, o) => {
    o = o || {}; const today = o.today || '', rows = [];
    (cases || []).forEach(c => {
      if (!c || !Array.isArray(c.sessions)) return;
      c.sessions.forEach(s => {
        if (!s || !validDate(s.date)) return;
        if (s.done && !o.done) return;
        if (o.late) { if (s.done || !(s.date < today)) return; }
        else { if (o.from && s.date < o.from) return; if (o.to && s.date > o.to) return; }
        rows.push({ sid: s.id, cid: c.id, cname: c.name || '', no: c.no || '', year: c.year || '', court: c.court || '', circuit: c.circuit || '', client: c.client || '', date: s.date, time: s.time || '', note: s.note || '', done: !!s.done, late: !s.done && s.date < today, ended: c.status === 'منتهية', dec: s.dec || null });
      });
    });
    return rows.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time && !b.time) ? -1 : (!a.time && b.time) ? 1 : a.time < b.time ? -1 : a.time > b.time ? 1 : 0);
  };
  /* القرارات المسجّلة الأحدث أولاً. o.type لفلترة النوع، o.nodec = الجلسات المغلقة بلا قرار مسجّل */
  const decLog = (cases, o) => {
    o = o || {}; const rows = [];
    (cases || []).forEach(c => {
      if (!c || !Array.isArray(c.sessions)) return;
      c.sessions.forEach(s => {
        if (!s) return;
        if (o.nodec) { if (!(s.done && !s.dec)) return; }
        else { if (!s.dec) return; if (o.type && s.dec.t !== o.type) return; }
        rows.push({ sid: s.id, cid: c.id, cname: c.name || '', date: s.date || '', note: s.note || '', dec: s.dec || null, at: (s.dec && s.dec.at) || s.date || '' });
      });
    });
    return rows.sort((a, b) => a.at < b.at ? 1 : a.at > b.at ? -1 : a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  };

  /* ---------- سجل الوقت ---------- */
  const fmtDur = m => { m = Math.round(Number(m)); if (!isFinite(m) || m <= 0) return '0 د'; const h = Math.floor(m / 60), r = m % 60; return !h ? r + ' د' : !r ? h + ' س' : h + ' س ' + String(r).padStart(2, '0') + ' د'; };
  /* إدخال وقت: التاريخ صالح، الساعات والدقائق صحيحة غير سالبة، المدة 1..1440 دقيقة. b غير المحدد = قابل للفوترة */
  const tlEntry = (i, id) => {
    i = i || {}; if (!validDate(i.d)) return { ok: false, err: 'التاريخ غير صالح' };
    const nv = v => Number(v === '' || v == null ? 0 : v), h = nv(i.h), m = nv(i.m);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0) return { ok: false, err: 'اكتب الساعات والدقائق أعداداً صحيحة' };
    const t = h * 60 + m; if (t < 1) return { ok: false, err: 'اكتب مدة أكبر من صفر' }; if (t > 1440) return { ok: false, err: 'المدة لا تزيد على 24 ساعة في إدخال واحد' };
    return { ok: true, e: { id, d: i.d, m: t, n: clip(i.n, 100), b: i.b !== false } };
  };
  const tlTotal = (L, o) => {
    o = o || {}; let min = 0, bill = 0, n = 0;
    (L || []).forEach(x => { if (!x || !validDate(x.d)) return; const m = Number(x.m); if (!Number.isInteger(m) || m <= 0) return; if (o.from && x.d < o.from) return; if (o.to && x.d > o.to) return; min += m; n++; if (x.b !== false) bill += m; });
    return { min, bill, n };
  };
  /* قيمة الوقت = دقائق × أجر الساعة ÷ 60، تُقرَّب مرة واحدة على المجموع (نصف لأعلى على القرش) فلا انجراف */
  const tlValue = (min, rate) => { const r = Number(rate); return (isFinite(r) && r > 0 && min > 0) ? _FC.r2(min * r / 60) : 0; };
  /* مدة المؤقت بالدقائق: أقل من 30 ثانية (أو ساعة رجعت للخلف أو قيمة تالفة) = 0، وإلا تُقرَّب لأقرب دقيقة (نصف لأعلى) وحدها الأدنى 1 */
  const tmrMin = (start, now) => { const s = Number(start), n = Number(now); if (!isFinite(s) || s <= 0 || !isFinite(n)) return 0; const sec = (n - s) / 1000; return sec < 30 ? 0 : Math.max(1, Math.round(sec / 60 + 1e-9)); };
  const tmrRun = cases => { const c = (cases || []).find(x => x && Number.isFinite(x.tmr) && x.tmr > 0); return c ? { cid: c.id, start: c.tmr } : null; };

  return { iso, validDate, addDays, range, norm, names, match, conflicts, DEC, STATUS, decide, schedule, decLog, fmtDur, tlEntry, tlTotal, tlValue, tmrMin, tmrRun };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CM;
