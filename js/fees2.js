/* L3 (1.25.0) — الأتعاب والمحاسبة: ضريبة القيمة المضافة على الأتعاب، ترقيم رسمي متسلسل للإيصالات والفواتير (لا يُحذف مرقَّم بل يُلغى)، دقة بالقروش، كشف حساب مفصّل بفترة ورصيد افتتاحي وكل قضايا الموكل.
   إضافة فقط: يلفّ دوال fees.js بعد تحميلها ولا يغيّر عقداً قائماً. الحقول الجديدة على قيد acc اختيارية (net, vat, vr, sno, sy, sp, void, vd, vw) فتبقى القيود القديمة كما هي. الإعدادات في fp.fin (مشفّرة مع الخزنة وفي النسخة الاحتياطية). الحساب كله في feecore.js. */
const FIN_DEF = { vat: false, rate: 14, mode: 'excl', tax: '', rp: 'R', fp: 'F', rs: 1, fs: 1 };
const finGet = () => Object.assign({}, FIN_DEF, (_l('fp', {}).fin) || {});
const finSet = o => { const p = _l('fp', {}); p.fin = Object.assign({}, FIN_DEF, o); _s('fp', p) };
const feeNo = x => FC.fmtNo(x.sp || (x.k == 'pay' ? 'R' : 'F'), x.sy, x.sno);
const feeYear = d => +String(d || isoD(new Date())).slice(0, 4);
/* موكل واحد بعد تطبيع الكتابة (الهمزات والياء والتشكيل والألقاب)؛ التشابه الجزئي لا يُعدّ نفس الموكل */
const feeSameClient = (a, b) => !!a && !!b && (a == b || CM.match(a, b) == 'exact');
const feeAddHtml = h => { const s = document.querySelector('#sh'); if (s) s.insertAdjacentHTML('beforeend', h) };
/* ---- مجاميع بالقروش، تستثني الملغى ---- */
accSum = function (cid) { const all = ACC.filter(x => x.case == cid), L = all.filter(x => !x.void), s = k => FC.sum(L.filter(x => x.k == k).map(x => x.amt)), f = s('fee'), p = s('pay'), e = s('exp'); return { fees: f, pays: p, exps: e, due: FC.sum([f, e, -p]), n: all.length, vat: FC.sum(L.filter(x => x.k == 'fee').map(x => x.vat)) } };
feeMonthData = function (m) { return CLS.map(c => { const L = ACC.filter(x => x.case == c.id && !x.void && String(x.date).startsWith(m)), s = k => FC.sum(L.filter(x => x.k == k).map(x => x.amt)); return { c, fee: s('fee'), pay: s('pay'), exp: s('exp'), vat: FC.sum(L.filter(x => x.k == 'fee').map(x => x.vat)), n: L.length } }).filter(o => o.n) };
const _feeMonthRes = feeMonthRes;
feeMonthRes = function () { _feeMonthRes(); const m = (document.querySelector('#fm_m') || {}).value, el = document.querySelector('#fm_r'); if (!m || !el) return; const v = FC.sum(feeMonthData(m).map(o => o.vat)); if (v > 0) el.insertAdjacentHTML('beforeend', '<div class="shm">منها ضريبة قيمة مضافة على أتعاب الشهر: <b>' + fmtMoney(v) + '</b></div>') };
/* ---- واجهة الحساب: أزرار الإعدادات والكشف، وعلامات القيود ---- */
function feePost() {
  const sh = document.querySelector('#sh'); if (!sh) return;
  sh.querySelectorAll('.pr').forEach(r => {
    const b = r.querySelector('[data-act="fdel"]'); if (!b) return; const x = ACC.find(y => y.id == b.dataset.id); if (!x) return;
    const sp = r.querySelector('span'), sm = sp && sp.querySelector('small'), bits = [];
    if (x.sno != null) bits.push(feeNo(x)); if (x.vat != null) bits.push('منها ضريبة ' + fmtMoney(x.vat) + ' (' + x.vr + '%)'); if (x.void) bits.push('ملغى' + (x.vw ? ': ' + x.vw : ''));
    if (sm && bits.length) sm.insertAdjacentHTML('beforeend', '<br>' + esc2(bits.join(' · ')));
    if (x.void && sp) { sp.style.textDecoration = 'line-through'; sp.style.opacity = '.55'; const rc = r.querySelector('[data-act="frec"]'); if (rc) rc.remove() }
    if (x.sno != null) { b.textContent = '⛔'; b.setAttribute('aria-label', 'إلغاء') }
    if (x.k == 'fee' && x.sno != null && !x.void) b.insertAdjacentHTML('beforebegin', `<button class="pb" data-act="finv" data-id="${x.id}" aria-label="فاتورة">🧾</button>`)
  })
}
const _feeSheet = feeSheet;
feeSheet = function (cid) { _feeSheet(cid); if (!document.querySelector('#sh [data-act="fadd"]')) return; feePost(); feeAddHtml('<div class="acts" style="margin-top:8px"><button class="btn" data-act="fst2">📑 كشف حساب مفصّل</button><button class="btn" data-act="fset">⚙ الضريبة والترقيم</button></div>') };
const _feesOverview = feesOverview;
feesOverview = function () { _feesOverview(); feeAddHtml('<div class="acts" style="margin-top:8px"><button class="btn span2" data-act="fset">⚙ الضريبة والترقيم</button></div>') };
/* ---- إضافة اتفاق أتعاب بضريبة ---- */
const _feeAdd = feeAdd;
feeAdd = function (kind) {
  _feeAdd(kind); const F = finGet(), w = document.querySelector('#fa_w'); if (kind != 'fee' || !F.vat || !w) return;
  w.insertAdjacentHTML('beforebegin', `<label class="fld"><span><input id="fa_vat" type="checkbox" checked> تخضع للضريبة (${F.rate}%)</span></label><label class="fld"><span>المبلغ المكتوب أعلاه</span><select id="fa_vm"><option value="excl"${F.mode == 'excl' ? ' selected' : ''}>قبل الضريبة (تُضاف عليه)</option><option value="incl"${F.mode == 'incl' ? ' selected' : ''}>شامل الضريبة</option></select></label><div id="fa_vp" class="shm"></div>`)
};
function feeVatPrev() {
  const p = document.querySelector('#fa_vp'); if (!p) return; const a = accNum((document.querySelector('#fa_amt') || {}).value), on = (document.querySelector('#fa_vat') || {}).checked, F = finGet();
  if (!a) { p.textContent = ''; return } if (!on) { p.textContent = ''; return }
  const x = FC.vat(a, F.rate, document.querySelector('#fa_vm').value); p.innerHTML = `الصافي ${fmtMoney(x.net)} + الضريبة ${fmtMoney(x.vat)} = <b>الإجمالي ${fmtMoney(x.gross)}</b><br><small>${esc2(tafqeet(x.gross))}</small>`
}
/* ---- حفظ/إلغاء القيود (التقاط مبكر يحلّ محل المعالج القديم لهاتين الحالتين فقط) ---- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="fsave"],[data-act="fdel"]'); if (!el) return; const v = i => (document.querySelector(i) || {}).value || '';
  if (el.dataset.act == 'fsave') {
    e.stopPropagation(); const kind = el.dataset.kind, amt0 = accNum(v('#fa_amt')); if (!amt0) { toast('اكتب مبلغاً صحيحاً'); return }
    const F = finGet(), date = v('#fa_date') || isoD(new Date()), yr = feeYear(date), vc = document.querySelector('#fa_vat');
    const ent = { id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), case: FEE.cid, k: kind, amt: FC.r2(amt0), date, note: v('#fa_note').trim().slice(0, 100) };
    if (kind == 'pay') ent.rno = accNextRno(FEE.cid);
    if (kind == 'fee' && F.vat && vc && vc.checked) { const x = FC.vat(amt0, F.rate, v('#fa_vm') || F.mode); ent.net = x.net; ent.vat = x.vat; ent.vr = x.rate; ent.amt = x.gross }
    if (kind == 'pay' || ent.vat != null) { ent.sy = yr; ent.sp = kind == 'pay' ? F.rp : F.fp; ent.sno = FC.nextSerial(ACC, kind, yr, kind == 'pay' ? F.rs : F.fs) }
    ACC.push(ent); accSave(); render(); toast(ent.sno != null ? 'تم الحفظ — ' + feeNo(ent) : 'تم الحفظ'); feeSheet(FEE.cid); return
  }
  e.stopPropagation(); const x = ACC.find(y => y.id == el.dataset.id); if (!x) return;
  if (x.sno != null) { if (x.void) { toast('القيد ملغى ومحفوظ برقمه'); return } const why = prompt('سبب الإلغاء؟ يبقى القيد برقمه ولا يُحسب في الأرصدة.'); if (why === null) return; x.void = true; x.vd = isoD(new Date()); x.vw = String(why).trim().slice(0, 100); accSave(); render(); feeSheet(FEE.cid); return }
  if (confirm('حذف هذا القيد؟')) { const i = ACC.findIndex(y => y.id == x.id); if (i >= 0) { ACC.splice(i, 1); accSave(); render(); feeSheet(FEE.cid) } }
}, true);
/* ---- إيصال بالرقم الرسمي (القديم بلا رقم رسمي يبقى برقمه لكل قضية) ---- */
feeReceipt = function (id) {
  const x = ACC.find(y => y.id == id), c = x && CLS.find(y => y.id == x.case); if (!c) return; if (x.void) { toast('هذا الإيصال ملغى'); return }
  const n = x.sno != null ? feeNo(x) : String(x.rno || accOf(c.id).filter(y => y.k == 'pay').findIndex(y => y.id == id) + 1).padStart(3, '0'), lw = fxLawyer() || '..............................', cl = c.client || '..............................';
  const B = [{ t: 'h', x: 'إيصال استلام مبلغ' }, { t: 'p', x: 'رقم الإيصال: ' + n + ' — التاريخ: ' + x.date }, { t: 'p', x: `استلمتُ أنا الأستاذ/ ${lw} المحامي، من السيد/ ${cl}، مبلغ ${fmtMoney(x.amt)} جنيه مصري (${tafqeet(x.amt)})، وذلك ${x.note ? x.note : 'دفعة من أتعاب المحاماة'} عن القضية/الموضوع: ${c.name}${c.no ? ' رقم ' + c.no + (c.year ? ' لسنة ' + c.year : '') : ''}${c.court ? ' — ' + c.court : ''}.`, sz: 26 }, { t: 'p', x: '' }, { t: 'p', x: 'المستلم: ..............................        التوقيع: ..............................' }, { t: 'p', x: 'اسم المسلِّم: ..............................        التوقيع: ..............................' }, { t: 'p', x: 'نموذج إيصال صادر من تطبيق المكتبة القانونية — راجع بياناته قبل التوقيع.', sz: 18 }];
  return fxSend(docxBuild(B), 'إيصال-' + n + '-' + (c.client || c.name).replace(/\s+/g, '-') + '.docx')
};
/* ---- فاتورة أتعاب بضريبة (مستند مرجعي) ---- */
function feeInvoice(id) {
  const x = ACC.find(y => y.id == id), c = x && CLS.find(y => y.id == x.case); if (!c || x.sno == null || x.vat == null) return; if (x.void) { toast('هذه الفاتورة ملغاة'); return }
  const F = finGet(), n = feeNo(x), lw = fxLawyer() || '..............................', cl = c.client || '..............................', subj = c.name + (c.no ? ' رقم ' + c.no + (c.year ? ' لسنة ' + c.year : '') : '') + (c.court ? ' — ' + c.court : '');
  const B = [{ t: 'h', x: 'فاتورة أتعاب محاماة' }, { t: 'p', x: 'رقم الفاتورة: ' + n + ' — التاريخ: ' + x.date }, { t: 'p', x: `مقدّم الخدمة: الأستاذ/ ${lw} المحامي — رقم التسجيل الضريبي: ${F.tax || '..............................'}` }, { t: 'p', x: `العميل: السيد/ ${cl}` }, { t: 'p', x: 'القضية/الموضوع: ' + subj },
    { t: 'tbl', rows: [['البيان', 'القيمة قبل الضريبة', 'نسبة الضريبة', 'قيمة الضريبة', 'الإجمالي'], [x.note || 'أتعاب محاماة', fmtMoney(x.net), x.vr + '%', fmtMoney(x.vat), fmtMoney(x.amt)]] },
    { t: 'p', x: `إجمالي الفاتورة: ${fmtMoney(x.amt)} جنيه مصري (${tafqeet(x.amt)}).`, sz: 26 }, { t: 'p', x: '' }, { t: 'p', x: 'التوقيع: ..............................' },
    { t: 'p', x: 'مستند مرجعي من تطبيق المكتبة القانونية؛ لا يغني عن الفاتورة الإلكترونية المعتمدة من مصلحة الضرائب متى كان إصدارها واجباً عليك. راجع محاسبك قبل الاعتماد.', sz: 18 }];
  return fxSend(docxBuild(B), 'فاتورة-' + n + '-' + (c.client || c.name).replace(/\s+/g, '-') + '.docx')
}
/* ---- إعدادات الضريبة والترقيم ---- */
function feeSettings() {
  const F = finGet(), y = feeYear(), nr = FC.nextSerial(ACC, 'pay', y, F.rs), nf = FC.nextSerial(ACC, 'fee', y, F.fs), gp = FC.gaps(ACC, 'pay', y), gf = FC.gaps(ACC, 'fee', y);
  sheet(`<div class="shh"><h2 class="sht">⚙ الضريبة والترقيم</h2><button class="lnk" data-act="fovr">← الحسابات</button></div>
<label class="fld"><span><input id="fn_on" type="checkbox"${F.vat ? ' checked' : ''}> أضف ضريبة القيمة المضافة على اتفاقات الأتعاب الجديدة</span></label>
<label class="fld"><span>نسبة الضريبة %</span><input id="fn_r" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="${F.rate}"></label>
<label class="fld"><span>المبلغ يُكتب عادةً</span><select id="fn_m"><option value="excl"${F.mode == 'excl' ? ' selected' : ''}>قبل الضريبة</option><option value="incl"${F.mode == 'incl' ? ' selected' : ''}>شاملاً الضريبة</option></select></label>
<label class="fld"><span>رقم التسجيل الضريبي (يظهر في الفاتورة)</span><input id="fn_tax" value="${esc2(F.tax)}"></label>
<label class="fld"><span>بادئة الإيصالات</span><input id="fn_rp" maxlength="8" value="${esc2(F.rp)}"></label>
<label class="fld"><span>بادئة الفواتير</span><input id="fn_fp" maxlength="8" value="${esc2(F.fp)}"></label>
<label class="fld"><span>أول رقم إيصال (للاستمرار من دفترك الورقي)</span><input id="fn_rs" type="number" inputmode="numeric" min="1" step="1" value="${F.rs}"></label>
<label class="fld"><span>أول رقم فاتورة</span><input id="fn_fs" type="number" inputmode="numeric" min="1" step="1" value="${F.fs}"></label>
<div class="shm">التالي هذا العام: إيصال <b>${esc2(FC.fmtNo(F.rp, y, nr))}</b> · فاتورة <b>${esc2(FC.fmtNo(F.fp, y, nf))}</b>${gp.length || gf.length ? '<br><b style="color:#c0392b">تنبيه: أرقام مفقودة في السلسلة (إيصالات: ' + (gp.join('، ') || '—') + ' · فواتير: ' + (gf.join('، ') || '—') + ') — غالباً نتيجة دمج نسخة احتياطية أو حذف خارجي.</b>' : ''}</div>
<button class="btn pri wide" data-act="fnsave">حفظ</button>
<div class="shm" style="margin-top:10px">يسري على القيود الجديدة فقط؛ القديمة تبقى كما هي. الترقيم متسلسل لكل سنة ولكل نوع، ولا يُعاد استعمال رقم: القيد المرقَّم يُلغى بسبب مكتوب ولا يُحذف. النسبة العامة 14% في القانون، وقد تختلف معاملة بعض الخدمات المهنية وإلزام المحامين بالتسجيل والفاتورة الإلكترونية محل مراجعة؛ اسأل محاسبك أو مصلحة الضرائب قبل التفعيل.</div>`)
}
/* ---- كشف حساب مفصّل ---- */
function feeStmtData(cid, o) {
  const c = CLS.find(y => y.id == cid), cs = o.all && c.client ? CLS.filter(y => feeSameClient(y.client, c.client)) : [c], ids = cs.map(y => y.id), nm = {}; cs.forEach(y => nm[y.id] = y.name);
  const L = ACC.filter(x => ids.includes(x.case)), s = FC.ledger(L, { from: o.from, to: o.to }); return { c, cs, s, nm }
}
const fstOpts = () => { const v = i => (document.querySelector(i) || {}).value || ''; return { from: v('#fs_f'), to: v('#fs_t'), all: !!(document.querySelector('#fs_a') || {}).checked } };
function feeStmtSheet(cid) {
  const c = CLS.find(y => y.id == cid); if (!c) return; FEE.cid = cid; const n = c.client ? CLS.filter(y => feeSameClient(y.client, c.client)).length : 1;
  sheet(`<div class="shh"><h2 class="sht">📑 كشف حساب مفصّل</h2><button class="lnk" data-act="fcase" data-id="${cid}">← الحساب</button></div><label class="fld"><span>من تاريخ (اختياري)</span><input id="fs_f" type="date"></label><label class="fld"><span>إلى تاريخ (اختياري)</span><input id="fs_t" type="date"></label>${n > 1 ? `<label class="fld"><span><input id="fs_a" type="checkbox"> كل قضايا الموكل (${n} قضايا)</span></label>` : ''}<div id="fs_r"></div><div class="acts"><button class="btn pri" data-act="fstdoc">📄 Word</button><button class="btn" data-act="fstcopy">📋 نسخ</button></div>`); feeStmtPrev()
}
function feeStmtPrev() {
  const el = document.querySelector('#fs_r'); if (!el || !FEE.cid) return; const { s } = feeStmtData(FEE.cid, fstOpts()), live = s.rows.filter(r => !r.void).length;
  el.innerHTML = `<div class="cres">${s.opening ? `<span>رصيد افتتاحي: ${fmtMoney(s.opening)}</span>` : ''}<span>قيود الفترة: ${live}${s.rows.length > live ? ' (+' + (s.rows.length - live) + ' ملغى)' : ''}</span><span>أتعاب ${fmtMoney(s.fees)} · مصروفات ${fmtMoney(s.exps)} · مستلم ${fmtMoney(s.pays)}${s.vat ? ' · ضريبة ' + fmtMoney(s.vat) : ''}</span><b>${s.closing > 0.005 ? 'المتبقي على الموكل: ' + fmtMoney(s.closing) : s.closing < -0.005 ? 'دفعات زائدة: ' + fmtMoney(-s.closing) : 'الحساب مسدَّد'}</b></div>`
}
const feeRowDesc = (x, nm, multi) => (multi ? '[' + nm[x.case] + '] ' : '') + (x.void ? 'ملغى — ' : '') + ACCK[x.k] + (x.sno != null ? ' (' + feeNo(x) + ')' : '') + (x.note ? ' — ' + x.note : '');
function feeStmtDoc() {
  const o = fstOpts(), { c, cs, s, nm } = feeStmtData(FEE.cid, o), multi = cs.length > 1, hasV = s.rows.some(r => r.vat != null && !r.void), per = (o.from || o.to) ? `الفترة: ${o.from || 'البداية'} → ${o.to || 'اليوم'}` : 'كل الفترات';
  const head = ['التاريخ', 'البيان']; if (hasV) head.push('منها ضريبة'); head.push('مستحق', 'مدفوع', 'الرصيد');
  const rows = []; if (o.from) rows.push(['', 'رصيد افتتاحي', ...(hasV ? [''] : []), '', '', fmtMoney(s.opening)]);
  s.rows.forEach(x => { const sk = x.void; rows.push([x.date, feeRowDesc(x, nm, multi), ...(hasV ? [!sk && x.vat != null ? fmtMoney(x.vat) : '—'] : []), sk || x.k == 'pay' ? '—' : fmtMoney(x.amt), sk || x.k != 'pay' ? '—' : fmtMoney(x.amt), fmtMoney(x.bal)]) });
  rows.push(['', 'الإجمالي', ...(hasV ? [fmtMoney(s.vat)] : []), fmtMoney(FC.sum([s.fees, s.exps])), fmtMoney(s.pays), fmtMoney(s.closing)]);
  const B = [{ t: 'h', x: 'كشف حساب' }, { t: 'p', x: `الموكل: ${c.client || '—'}   |   ${multi ? 'جميع قضايا الموكل (' + cs.length + ')' : 'القضية: ' + c.name + (c.no ? ' رقم ' + c.no + (c.year ? ' لسنة ' + c.year : '') : '')}   |   ${per}   |   التاريخ: ${isoD(new Date())}` }, { t: 'tbl', rows: [head, ...rows] },
    { t: 'p', x: s.closing > 0.005 ? `المتبقي على الموكل: ${fmtMoney(s.closing)} جنيه (${tafqeet(s.closing)}).` : s.closing < -0.005 ? `دفعات زائدة لصالح الموكل: ${fmtMoney(-s.closing)} جنيه.` : 'الحساب مسدَّد بالكامل.' }];
  if (s.vat > 0) B.push({ t: 'p', x: `منها ضريبة قيمة مضافة على الأتعاب في الفترة: ${fmtMoney(s.vat)} جنيه.` });
  B.push({ t: 'p', x: 'القيود الملغاة تظهر للشفافية ولا تدخل في الأرصدة. كشف مرجعي صادر من تطبيق المكتبة القانونية.', sz: 18 });
  return fxSend(docxBuild(B), 'كشف-حساب-' + (c.client || c.name).replace(/\s+/g, '-') + '.docx')
}
function feeStmtText() {
  const o = fstOpts(), { c, cs, s, nm } = feeStmtData(FEE.cid, o), multi = cs.length > 1;
  return 'كشف حساب — ' + (c.client || c.name) + (multi ? ' (كل القضايا)' : '') + '\n' + (o.from ? 'رصيد افتتاحي: ' + fmtMoney(s.opening) + '\n' : '') + s.rows.map(x => x.date + ' · ' + feeRowDesc(x, nm, multi) + ' · ' + (x.void ? 'ملغى' : fmtMoney(x.amt)) + ' · الرصيد ' + fmtMoney(x.bal)).join('\n') + '\nالرصيد الختامي: ' + fmtMoney(s.closing)
}
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, v = i => (document.querySelector(i) || {}).value || '';
  if (a == 'fset') feeSettings();
  else if (a == 'fnsave') { const old = finGet(), pos = x => Math.max(1, Math.floor(Number(x)) || 1); finSet({ vat: !!document.querySelector('#fn_on').checked, rate: FC.rate(v('#fn_r')), mode: v('#fn_m') == 'incl' ? 'incl' : 'excl', tax: v('#fn_tax').trim().slice(0, 30), rp: v('#fn_rp').replace(/\s+/g, '').slice(0, 8) || old.rp, fp: v('#fn_fp').replace(/\s+/g, '').slice(0, 8) || old.fp, rs: pos(v('#fn_rs')), fs: pos(v('#fn_fs')) }); toast('تم الحفظ'); feeSettings() }
  else if (a == 'fst2') feeStmtSheet(FEE.cid)
  else if (a == 'fstdoc') await feeStmtDoc()
  else if (a == 'fstcopy') { if (navigator.clipboard) navigator.clipboard.writeText(feeStmtText()).then(() => toast('تم النسخ'), () => toast('تعذّر النسخ')) }
  else if (a == 'finv') await feeInvoice(el.dataset.id)
});
document.addEventListener('change', e => { if (['fs_f', 'fs_t', 'fs_a'].includes(e.target.id)) feeStmtPrev(); if (['fa_vat', 'fa_vm'].includes(e.target.id)) feeVatPrev() });
document.addEventListener('input', e => { if (e.target.id == 'fa_amt') feeVatPrev() });
