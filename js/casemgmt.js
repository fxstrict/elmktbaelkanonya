/* L5 (1.26.0) — إدارة القضايا: قرار لكل جلسة مع جلسة تالية تلقائية، جدول الجلسات بالمدى (Word/نسخ)، سجل القرارات، سجل الوقت بمؤقت وأجر ساعة، وفحص تعارض المصالح.
   إضافة فقط: يلفّ casePanel وsessRow وtoolsSheet بعد تحميلها ولا يغيّر عقداً قائماً. كل البيانات داخل القضية نفسها في المفتاح lists (مشفّر مع الخزنة وفي النسخة الاحتياطية):
   session.dec = {t,n,nd,at,nid} · case.tl = [{id,d,m,n,b}] · case.hr = أجر الساعة · case.tmr = وقت بدء المؤقت. حقول اختيارية فتبقى القضايا والجلسات القديمة صالحة بلا ترحيل.
   المنطق كله في casecore.js (CM). يُحمَّل بعد legal.js وfees2.js وdlx.js وقبل vault-ui.js. */
const L5 = { tl: '', self: '', dc: null, rg: '7d' };
const l5Save = () => _s('lists', CLS), l5Today = () => isoD(today12()), l5Find = id => CLS.find(c => c.id == id);
const l5Open = () => { const s = document.querySelector('#sh'); return !!(s && s.classList.contains('open')) };
/* استبدال محتوى الشاشة المفتوحة في مكانها (بلا إضافة إلى سجل الرجوع)، وإلا تُفتح شاشة جديدة */
const l5Re = h => { const s = document.querySelector('#sh'); if (l5Open()) s.innerHTML = '<div class="grab"></div>' + h; else sheet(h) };
const l5V = i => ((document.querySelector(i) || {}).value || '').trim();
const l5Hm = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') };
const l5Pa = () => (typeof PA != 'undefined' ? PA : []);
const l5CaseTitle = c => c.name + (c.no ? ' رقم ' + c.no + (c.year ? ' لسنة ' + c.year : '') : '') + (c.court ? ' — ' + c.court : '');

/* ================= ملف القضية: الكتلة وصف الجلسة ================= */
function l5Block(c) {
  const tl = c.tl || [], tot = CM.tlTotal(tl), run = CM.tmrRun(CLS), mine = run && run.cid == c.id;
  const hi = CM.conflicts(CLS, l5Pa(), { client: c.client, opp: c.opp, selfId: c.id }).filter(x => x.lv == 'hi').length;
  const tm = tl.length ? 'الإجمالي ' + CM.fmtDur(tot.min) + (tot.bill != tot.min ? ' · القابل للفوترة ' + CM.fmtDur(tot.bill) : '') : 'لا وقت مسجّل بعد.';
  return `<div class="l5"><div class="cph"><b>⏱ سجل الوقت</b>${!run ? `<button class="lnk" data-act="tmrstart" data-cc="${c.id}">▶️ مؤقت</button>` : ''}<button class="lnk" data-act="tlopen" data-cc="${c.id}">${tl.length ? 'فتح' : '➕ تسجيل'}</button></div>`
    + `<div class="shm">${tm}${mine ? ` · <b style="color:#c0392b">⏱ يعمل منذ ${l5Hm(run.start)}</b> <button class="lnk" data-act="tmrstop" data-cc="${c.id}">إيقاف</button>` : run ? ' · ⏱ المؤقت يعمل على قضية أخرى' : ''}</div>`
    + `<div class="cph"><b>⚖️ تعارض المصالح</b><button class="lnk" data-act="cfopen" data-cc="${c.id}">فحص</button></div>`
    + (hi ? `<div class="shm" style="color:#c0392b">⚠ تعارض محتمل (${hi}) — راجع قبل المتابعة</div>` : '<div class="shm">لا تعارض ظاهر بين الموكل والخصم وباقي القضايا والتوكيلات.</div>') + '</div>';
}
const _casePanel = casePanel;
casePanel = function (c) { const h = _casePanel(c), b = l5Block(c), i = h.lastIndexOf('<div class="acts"'); return i > 0 ? h.slice(0, i) + b + h.slice(i) : h + b };
const _sessRow = sessRow;
sessRow = function (s, t) {
  let h = _sessRow(s, t);
  if (s.dec) h = h.replace('</span>', `<br><small>⚖️ ${esc2(s.dec.t)}${s.dec.n ? ': ' + esc2(s.dec.n) : ''}${s.dec.nd ? ' — التالية ' + fshort(s.dec.nd) : ''}</small></span>`);
  return h.replace('<button class="pb" data-act="sdone"', `<button class="pb" data-act="sdec" data-k="${s.id}" aria-label="قرار الجلسة">⚖️</button><button class="pb" data-act="sdone"`);
};
const _toolsSheet = toolsSheet;
toolsSheet = function () { _toolsSheet(); const a = document.querySelector('#sh .acts'); if (a && !document.querySelector('#sh [data-act="l5sch"]')) a.insertAdjacentHTML('beforeend', '<button class="btn" data-act="l5sch">📋 جدول الجلسات</button><button class="btn" data-act="l5dec">⚖️ سجل القرارات</button><button class="btn" data-act="l5time">⏱ سجل الوقت</button><button class="btn" data-act="l5cf">🛡 تعارض المصالح</button>') };

/* ================= قرار الجلسة ================= */
function l5SessDec(c, s) {
  const d = s.dec || {}, lk = d.nid && c.sessions.find(x => x.id == d.nid), base = s.date > l5Today() ? s.date : l5Today();
  L5.dc = { cid: c.id, sid: s.id, base };
  sheet(`<h2 class="sht">⚖️ قرار الجلسة</h2><div class="shm"><b>${esc2(c.name)}</b> · ${fshort(s.date)}${s.time ? ' ' + esc2(s.time) : ''}${s.note ? ' · ' + esc2(s.note) : ''}</div>`
    + `<label class="fld"><span>القرار</span><select id="dc_t">${CM.DEC.map(t => `<option${t == d.t ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`
    + `<label class="fld"><span>نص القرار / ما تم في الجلسة (اختياري)</span><textarea id="dc_n" rows="2">${esc2(d.n || '')}</textarea></label>`
    + `<label class="fld"><span>الجلسة التالية (تاريخ)</span><input id="dc_d" type="date" value="${esc2(d.nd || '')}"></label>`
    + `<div style="display:flex;gap:8px;margin:-4px 0 10px">${[7, 14, 30].map(n => `<button class="chip" data-act="dcplus" data-n="${n}">+${n} يوماً</button>`).join('')}</div>`
    + `<label class="fld"><span>الساعة (اختياري)</span><input id="dc_tm" type="time" value="${esc2(lk ? lk.time || '' : '')}"></label>${fl('dc_nn', 'الغرض من الجلسة التالية', lk ? lk.note : '', 'مثال: لتقديم مذكرة')}`
    + `<label class="fld"><span><input id="dc_st" type="checkbox" checked> حدّث حالة القضية تلقائياً (حجز للحكم / صدور حكم / وقف)</span></label>`
    + `<button class="btn pri wide" data-act="dcsave" data-k="${s.id}">حفظ القرار</button>${s.done ? '' : `<button class="btn wide" data-act="dcclose" data-k="${s.id}">إغلاق بلا قرار</button>`}`);
}
/* ✔️ على جلسة مفتوحة تفتح شاشة القرار (التقاط مبكر)؛ إعادة الفتح ↩️ تمرّ للمعالج القديم كما هي */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="sdone"]'); if (!el) return; const c = curCase(); if (!c) return;
  const s = (c.sessions || []).find(x => x.id == el.dataset.k); if (!s || s.done) return; e.stopPropagation(); l5SessDec(c, s);
}, true);

/* ================= جدول الجلسات وسجل القرارات ================= */
const L5RG = [['today', 'اليوم'], ['tomorrow', 'غداً'], ['7d', '7 أيام'], ['month', 'الشهر'], ['late', 'فائتة']];
function l5SchedRows() { const t = l5Today(); if (L5.rg == 'late') return CM.schedule(CLS, { late: true, today: t }); const r = CM.range(L5.rg, t); return CM.schedule(CLS, { from: r.from, to: r.to, today: t }) }
const l5RgLabel = () => { if (L5.rg == 'late') return 'الجلسات الفائتة التي لم تُغلق'; const r = CM.range(L5.rg, l5Today()); return r.from == r.to ? 'جلسات يوم ' + r.from : 'جلسات من ' + r.from + ' إلى ' + r.to };
function l5Sched() {
  sheet(`<div class="shh"><h2 class="sht">📋 جدول الجلسات</h2></div><div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:10px">${L5RG.map(([k, l]) => `<button class="chip${L5.rg == k ? ' on' : ''}" data-act="l5rg" data-k="${k}">${l}</button>`).join('')}</div><div id="l5r"></div><div class="acts" style="margin-top:8px"><button class="btn pri" data-act="l5schdoc">📄 Word</button><button class="btn" data-act="l5schcopy">📋 نسخ</button></div><div class="shm" style="margin-top:8px">من بيانات هذا الجهاز؛ راجع الرول الرسمي للمحكمة للتأكد من الأدوار والتواريخ.</div>`);
  l5SchedRes();
}
function l5SchedRes() {
  const el = document.querySelector('#l5r'); if (!el) return; const rows = l5SchedRows(); document.querySelectorAll('#sh [data-act="l5rg"]').forEach(b => b.classList.toggle('on', b.dataset.k == L5.rg));
  if (!rows.length) { el.innerHTML = '<div class="em"><div>📋</div>لا جلسات في هذه الفترة.</div>'; return }
  let last = '', h = ''; rows.forEach(r => {
    if (r.date != last) { last = r.date; h += `<div class="shm" style="margin:10px 0 2px"><b>${fshort(r.date)}</b> · ${rows.filter(x => x.date == r.date).length} جلسة</div>` }
    h += `<div class="pr" data-act="cgo" data-id="${r.cid}" data-d="s" style="cursor:pointer"><span><b>${r.time ? esc2(r.time) + ' · ' : ''}${esc2(r.cname)}</b>${r.late ? ' <small style="color:#c0392b">فائتة</small>' : ''}<br><small>${[r.no && 'رقم ' + r.no + (r.year ? '/' + r.year : ''), r.court, r.circuit && 'دائرة ' + r.circuit, r.note, r.ended && '(القضية منتهية)'].filter(Boolean).map(esc2).join(' · ')}</small></span></div>`;
  }); el.innerHTML = h;
}
const l5RowLine = r => `${r.date}${r.time ? ' ' + r.time : ''} — ${r.cname}${r.no ? ' (' + r.no + (r.year ? '/' + r.year : '') + ')' : ''}${r.court ? ' — ' + r.court : ''}${r.circuit ? ' دائرة ' + r.circuit : ''}${r.client ? ' — الموكل: ' + r.client : ''}${r.note ? ' — ' + r.note : ''}`;
function l5SchedText() { return [l5RgLabel(), ...l5SchedRows().map(l5RowLine)].join('\n') }
function l5SchedDoc() {
  const rows = l5SchedRows(); if (!rows.length) { toast('لا جلسات للتصدير'); return }
  const lw = fxLawyer(), B = [{ t: 'h', x: 'جدول الجلسات' }, { t: 'p', x: l5RgLabel() + (lw ? '   |   المحامي: ' + lw : '') + '   |   التاريخ: ' + l5Today() },
    { t: 'tbl', rows: [['التاريخ', 'الوقت', 'القضية', 'الرقم/السنة', 'المحكمة/الدائرة', 'الموكل', 'الغرض'], ...rows.map(r => [AR_D[parseD(r.date).getDay()] + ' ' + r.date, r.time || '—', r.cname + (r.ended ? ' (منتهية)' : ''), r.no ? r.no + (r.year ? '/' + r.year : '') : '—', [r.court, r.circuit && 'دائرة ' + r.circuit].filter(Boolean).join(' — ') || '—', r.client || '—', r.note || '—'])] },
    { t: 'p', x: 'من بيانات تطبيق المكتبة القانونية على هذا الجهاز؛ راجع الرول الرسمي للمحكمة للتأكد من الأدوار والتواريخ.', sz: 18 }];
  return fxSend(docxBuild(B), 'جدول-جلسات-' + l5Today() + '.docx');
}
function l5DecSheet() {
  sheet(`<div class="shh"><h2 class="sht">⚖️ سجل القرارات</h2></div><label class="fld"><span>التصفية</span><select id="dl_t"><option value="">كل القرارات</option>${CM.DEC.map(t => `<option>${t}</option>`).join('')}<option value="nodec">مغلقة بلا قرار مسجّل</option></select></label><div id="dl_r"></div><div class="shm" style="margin-top:8px">القرار يُسجَّل عند إغلاق الجلسة بزر ✔️ أو ⚖️ في ملف القضية.</div>`);
  l5DecRes();
}
function l5DecRes() {
  const el = document.querySelector('#dl_r'); if (!el) return; const f = l5V('#dl_t'), rows = (f == 'nodec' ? CM.decLog(CLS, { nodec: true }) : CM.decLog(CLS, { type: f })).slice(0, 100);
  el.innerHTML = rows.length ? rows.map(r => `<div class="pr" data-act="cgo" data-id="${r.cid}" data-d="s" style="cursor:pointer"><span><b>${r.dec ? '⚖️ ' + esc2(r.dec.t) : 'أُغلقت بلا قرار'}</b> · ${fshort(r.date)}<br>${esc2(r.cname)}${r.note ? ' · ' + esc2(r.note) : ''}<br><small>${r.dec ? esc2(r.dec.n || '') + (r.dec.nd ? (r.dec.n ? ' — ' : '') + 'التالية ' + fshort(r.dec.nd) : '') : 'سجّل القرار من ⚖️ في ملف القضية'}</small></span></div>`).join('') : '<div class="em"><div>⚖️</div>لا شيء لعرضه.</div>';
}

/* ================= سجل الوقت ================= */
const l5TlOpts = () => ({ from: l5V('#tl_f'), to: l5V('#tl_t') });
function l5TimeSheet(cid) {
  const c = l5Find(cid); if (!c) return; L5.tl = cid; const run = CM.tmrRun(CLS), mine = run && run.cid == cid, oth = run && !mine ? l5Find(run.cid) : null;
  l5Re(`<div class="shh"><h2 class="sht">⏱ سجل الوقت</h2><button class="lnk" data-act="l5tov">← الأوقات</button></div><div class="shm"><b>${esc2(c.name)}</b>${c.client ? ' · ' + esc2(c.client) : ''}</div>`
    + (mine ? `<div class="cres"><span>⏱ المؤقت يعمل منذ ${l5Hm(run.start)}</span><button class="btn pri" data-act="tmrstop" data-cc="${cid}">⏹ إيقاف وتسجيل</button></div>` : (oth ? `<div class="shm" style="color:#c0392b">المؤقت يعمل الآن على «${esc2(oth.name)}»</div>` : '') + `<button class="btn wide" style="margin-top:0" data-act="tmrstart" data-cc="${cid}">▶️ بدء مؤقت</button>`)
    + `<label class="fld" style="margin-top:12px"><span>أجر الساعة (جنيه) — اختياري، لحساب القيمة التقديرية</span><input id="tl_hr" type="number" inputmode="decimal" min="0" step="0.01" value="${c.hr || ''}"></label>`
    + `<div class="cph"><b>➕ تسجيل وقت</b></div><div class="acts"><label class="fld"><span>ساعات</span><input id="tl_h" type="number" inputmode="numeric" min="0" max="24"></label><label class="fld"><span>دقائق</span><input id="tl_m" type="number" inputmode="numeric" min="0" max="59"></label></div>`
    + `<label class="fld"><span>التاريخ</span><input id="tl_d" type="date" value="${l5Today()}"></label>${fl('tl_n', 'البيان (اختياري)', '', 'مثال: مراجعة الملف / إعداد مذكرة')}<label class="fld"><span><input id="tl_b" type="checkbox" checked> قابل للفوترة</span></label><button class="btn pri wide" style="margin-top:0" data-act="tladd">حفظ الوقت</button>`
    + `<div class="cph"><b>📊 الملخص والسجل</b></div><div class="acts"><label class="fld"><span>من</span><input id="tl_f" type="date"></label><label class="fld"><span>إلى</span><input id="tl_t" type="date"></label></div><div id="tl_s" class="cres"></div><div id="tl_l"></div><div class="acts" style="margin-top:8px"><button class="btn pri" data-act="tldoc">📄 Word</button><button class="btn" data-act="tlcopy">📋 نسخ</button></div>`
    + '<div class="shm" style="margin-top:8px">سجل داخلي تقديري للمتابعة؛ القيمة لا تدخل في حسابات الأتعاب تلقائياً.</div>');
  l5TimeFill();
}
function l5TimeFill() {
  const c = l5Find(L5.tl), s = document.querySelector('#tl_s'), l = document.querySelector('#tl_l'); if (!c || !s || !l) return; const o = l5TlOpts(), tot = CM.tlTotal(c.tl, o), val = CM.tlValue(tot.bill, c.hr);
  s.innerHTML = `<span>${o.from || o.to ? 'الفترة: ' + (o.from || 'البداية') + ' → ' + (o.to || 'اليوم') : 'كل الفترات'} · ${tot.n} إدخال</span><span>الإجمالي: <b>${CM.fmtDur(tot.min)}</b> · القابل للفوترة: <b>${CM.fmtDur(tot.bill)}</b></span>${val > 0 ? `<span>القيمة التقديرية: <b>${fmtMoney(val)}</b> جنيه (القابل للفوترة × ${esc2(String(c.hr))} جنيه/ساعة)</span>` : ''}`;
  const L = (c.tl || []).filter(x => (!o.from || x.d >= o.from) && (!o.to || x.d <= o.to)).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  l.innerHTML = L.length ? L.map(x => `<div class="pr"><span><b>${esc2(x.d)}</b> · ${CM.fmtDur(x.m)}${x.b === false ? ' · <small>غير قابل للفوترة</small>' : ''}${x.n ? '<br><small>' + esc2(x.n) + '</small>' : ''}</span><button class="pb" data-act="tldel" data-k="${x.id}" aria-label="حذف">🗑</button></div>`).join('') : '<div class="shm">لا إدخالات في هذه الفترة.</div>';
}
function l5TimeDoc() {
  const c = l5Find(L5.tl); if (!c) return; const o = l5TlOpts(), L = (c.tl || []).filter(x => (!o.from || x.d >= o.from) && (!o.to || x.d <= o.to)).sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0);
  if (!L.length) { toast('لا إدخالات في هذه الفترة'); return } const tot = CM.tlTotal(c.tl, o), val = CM.tlValue(tot.bill, c.hr), per = o.from || o.to ? 'الفترة: ' + (o.from || 'البداية') + ' → ' + (o.to || 'اليوم') : 'كل الفترات';
  const B = [{ t: 'h', x: 'كشف سجل الوقت' }, { t: 'p', x: `القضية: ${l5CaseTitle(c)}   |   الموكل: ${c.client || '—'}   |   ${per}   |   التاريخ: ${l5Today()}` },
    { t: 'tbl', rows: [['التاريخ', 'البيان', 'المدة', 'قابل للفوترة'], ...L.map(x => [x.d, x.n || '—', CM.fmtDur(x.m), x.b === false ? 'لا' : 'نعم'])] },
    { t: 'p', x: `إجمالي الوقت: ${CM.fmtDur(tot.min)} — القابل للفوترة: ${CM.fmtDur(tot.bill)}` }];
  if (val > 0) B.push({ t: 'p', x: `القيمة التقديرية للوقت القابل للفوترة: ${fmtMoney(val)} جنيه مصري (على أساس ${c.hr} جنيه للساعة).` });
  B.push({ t: 'p', x: 'سجل داخلي تقديري صادر من تطبيق المكتبة القانونية؛ لا يمثل فاتورة ولا اتفاق أتعاب.', sz: 18 });
  return fxSend(docxBuild(B), 'سجل-وقت-' + (c.client || c.name).replace(/\s+/g, '-') + '.docx');
}
function l5TimeText() { const c = l5Find(L5.tl); if (!c) return ''; const o = l5TlOpts(), L = (c.tl || []).filter(x => (!o.from || x.d >= o.from) && (!o.to || x.d <= o.to)).sort((a, b) => a.d < b.d ? -1 : 1), t = CM.tlTotal(c.tl, o), v = CM.tlValue(t.bill, c.hr); return [`سجل الوقت — ${c.name}`, ...L.map(x => `${x.d} — ${CM.fmtDur(x.m)}${x.b === false ? ' (غير قابل للفوترة)' : ''}${x.n ? ' — ' + x.n : ''}`), `الإجمالي: ${CM.fmtDur(t.min)} — القابل للفوترة: ${CM.fmtDur(t.bill)}${v > 0 ? ' — القيمة التقديرية ' + fmtMoney(v) + ' جنيه' : ''}`].join('\n') }
function l5TimeOverview() {
  const m = l5V('#tv_m') || l5Today().slice(0, 7), run = CM.tmrRun(CLS), rc = run && l5Find(run.cid);
  sheet(`<h2 class="sht">⏱ سجل الوقت</h2>${rc ? `<div class="dlw" data-act="tlopen" data-cc="${rc.id}">⏱ المؤقت يعمل على <b>${esc2(rc.name)}</b> منذ ${l5Hm(run.start)} — افتح للإيقاف</div>` : ''}<label class="fld"><span>الشهر</span><input id="tv_m" type="month" value="${m}"></label><div id="tv_r"></div>`);
  l5TimeOvRes();
}
function l5TimeOvRes() {
  const el = document.querySelector('#tv_r'); if (!el) return; const m = l5V('#tv_m') || l5Today().slice(0, 7), from = m + '-01', to = CM.range('month', from).to;
  const rows = CLS.map(c => ({ c, t: CM.tlTotal(c.tl, { from, to }) })).filter(x => x.t.n);
  if (!rows.length) { el.innerHTML = '<div class="em"><div>⏱</div>لا وقت مسجّل في هذا الشهر. افتح أي قضية واضغط «➕ تسجيل» أو «▶️ مؤقت».</div>'; return }
  const all = CM.tlTotal(rows.flatMap(x => x.c.tl), { from, to });
  el.innerHTML = rows.map(x => `<div class="pr" data-act="tlopen" data-cc="${x.c.id}" style="cursor:pointer"><span><b>${esc2(x.c.name)}</b><br><small>${CM.fmtDur(x.t.min)} · قابل للفوترة ${CM.fmtDur(x.t.bill)}${x.c.hr ? ' · ' + fmtMoney(CM.tlValue(x.t.bill, x.c.hr)) + ' جنيه' : ''}</small></span></div>`).join('') + `<div class="cres"><span>إجمالي الشهر: <b>${CM.fmtDur(all.min)}</b> · القابل للفوترة: <b>${CM.fmtDur(all.bill)}</b></span></div>`;
}
function l5StopSheet(c, m) {
  const over = m > 720; l5Re(`<h2 class="sht">⏹ إيقاف المؤقت</h2><div class="shm"><b>${esc2(c.name)}</b> · بدأ ${l5Hm(c.tmr)} · المدة المحسوبة ${CM.fmtDur(m)}</div>${over ? '<div class="dlw">مرّت أكثر من 12 ساعة — يبدو أنك نسيت المؤقت. عدّل المدة قبل الحفظ.</div>' : ''}<label class="fld"><span>المدة (دقائق)</span><input id="ts_m" type="number" inputmode="numeric" min="1" max="1440" value="${Math.min(m, 1440)}"></label>${fl('ts_n', 'البيان (اختياري)', '', '')}<button class="btn pri wide" data-act="tmrsave" data-cc="${c.id}">حفظ في سجل الوقت</button><button class="btn wide" data-act="tmrdrop" data-cc="${c.id}">تجاهل بلا تسجيل</button>`);
}
function l5Refresh() { render(); if (l5Open() && document.querySelector('#tl_h') && L5.tl) l5TimeSheet(L5.tl) }

/* ================= تعارض المصالح ================= */
function l5ConfLine(x) {
  const st = x.cstatus && x.src == 'case' ? ' (' + x.cstatus + ')' : '', pt = x.mt == 'part' ? ' — تشابه جزئي في الاسم، تحقق يدوياً' : '', nm = '«' + x.mine + '»';
  return x.kind == 'client_vs_opp' ? `${nm} (الموكل) هو الخصم «${x.who}» في قضية «${x.cname}»${st}${pt}`
    : x.kind == 'opp_vs_client' ? `${nm} (الخصم) هو موكّلك «${x.who}» في قضية «${x.cname}»${st}${pt}`
    : x.kind == 'poa' ? `${nm} (الخصم) صاحب توكيل ${x.cstatus || 'ساري'} لك في أرشيف التوكيلات${pt}`
    : x.kind == 'poa_client' ? `${nm} لديك منه توكيل (${x.cstatus || 'ساري'}) في أرشيف التوكيلات${pt}`
    : x.kind == 'same_client' ? `${nm} موكّل أيضاً في قضية «${x.cname}»${st}${pt}` : `${nm} خصم أيضاً في قضية «${x.cname}»${st}${pt}`;
}
function l5ConfSheet(pre) {
  pre = pre || {}; L5.self = pre.self || '';
  sheet(`<h2 class="sht">🛡 فحص تعارض المصالح</h2><div class="shm">اكتب الموكل الجديد و/أو الخصم (يمكن عدة أسماء بفاصلة)؛ يُقارَن بقضاياك وتوكيلاتك المحفوظة على هذا الجهاز.</div>${fl('cf_c', 'الموكل', pre.client || '', '')}${fl('cf_o', 'الخصم', pre.opp || '', '')}<button class="btn pri wide" data-act="cfrun">فحص</button><div id="cf_r" style="margin-top:10px"></div>`);
}
function l5ConfRes() {
  const el = document.querySelector('#cf_r'); if (!el) return; const c = l5V('#cf_c'), o = l5V('#cf_o');
  if (!c && !o) { el.innerHTML = '<div class="shm">اكتب اسماً واحداً على الأقل.</div>'; return }
  const r = CM.conflicts(CLS, l5Pa(), { client: c, opp: o, selfId: L5.self }), hi = r.filter(x => x.lv == 'hi'), lo = r.filter(x => x.lv == 'lo'), li = x => `<div class="pr"><span>${esc2(l5ConfLine(x))}</span></div>`;
  el.innerHTML = (hi.length ? `<div class="shm" style="color:#c0392b"><b>⚠ تعارض مباشر محتمل (${hi.length})</b></div>` + hi.map(li).join('') : '<div class="shm">✅ لا تعارض ظاهر في البيانات المحفوظة.</div>')
    + (lo.length ? `<div class="shm" style="margin-top:8px">معلومات (ليست تعارضاً بذاتها)</div>` + lo.map(li).join('') : '')
    + '<div class="shm" style="margin-top:10px">الفحص مطابقة الأسماء فقط على بيانات هذا الجهاز: لا يقارن أرقام الهوية ولا الأقارب أو الشركات المرتبطة، وقد يفوته اختلاف الكتابة الكبير. لا يغني عن مراجعتك لقواعد المهنة وسجلاتك.</div>';
}
/* تحذير عند تغيير الموكل أو الخصم في بيانات القضية (التقاط مبكر؛ الرفض يمنع الحفظ) */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act="csaveinfo"]'); if (!el) return; const c = curCase(); if (!c) return;
  const nc = l5V('#ce_client'), no = l5V('#ce_opp'), chC = nc !== (c.client || ''), chO = no !== (c.opp || ''); if (!chC && !chO) return;
  const hi = CM.conflicts(CLS, l5Pa(), { client: chC ? nc : '', opp: chO ? no : '', selfId: c.id }).filter(x => x.lv == 'hi'); if (!hi.length) return;
  if (!confirm('⚠ تعارض مصالح محتمل:\n' + hi.slice(0, 4).map(l5ConfLine).join('\n') + (hi.length > 4 ? '\n… و' + (hi.length - 4) + ' أخرى' : '') + '\n\nهل تريد حفظ هذه البيانات رغم ذلك؟')) { e.stopPropagation(); e.preventDefault() }
}, true);

/* ================= الأحداث ================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, k = el.dataset.k, cc = el.dataset.cc;
  if (a == 'sdec') { const c = curCase(), s = c && (c.sessions || []).find(x => x.id == k); if (s) l5SessDec(c, s) }
  else if (a == 'dcplus') { const d = document.querySelector('#dc_d'); if (d && L5.dc) d.value = CM.addDays(L5.dc.base, Number(el.dataset.n)) }
  else if (a == 'dcsave' || a == 'dcclose') {
    const c = L5.dc && l5Find(L5.dc.cid), s = c && c.sessions.find(x => x.id == L5.dc.sid); if (!s) return;
    if (a == 'dcclose') { s.done = true; l5Save(); closeSheet(); render(); toast('أُغلقت الجلسة'); return }
    const r = CM.decide(c, s.id, { t: l5V('#dc_t'), n: l5V('#dc_n'), nd: l5V('#dc_d'), nt: l5V('#dc_tm'), nn: l5V('#dc_nn'), st: !!(document.querySelector('#dc_st') || {}).checked }, l5Today());
    if (!r.ok) { toast(r.err, 3000); return }
    l5Save(); closeSheet(); render(); toast('تم تسجيل القرار' + (r.created ? ' وإضافة الجلسة التالية' : '') + (r.status ? ' — حالة القضية: ' + r.status : ''), 3200);
  }
  else if (a == 'l5sch') { L5.rg = '7d'; l5Sched() }
  else if (a == 'l5rg') { L5.rg = k; l5SchedRes() }
  else if (a == 'l5schdoc') l5SchedDoc();
  else if (a == 'l5schcopy') { if (navigator.clipboard) navigator.clipboard.writeText(l5SchedText()).then(() => toast('تم النسخ'), () => toast('تعذّر النسخ')) }
  else if (a == 'l5dec') l5DecSheet();
  else if (a == 'l5time' || a == 'l5tov') l5TimeOverview();
  else if (a == 'tlopen') l5TimeSheet(cc || L5.tl);
  else if (a == 'tladd') {
    const c = l5Find(L5.tl); if (!c) return; const r = CM.tlEntry({ d: l5V('#tl_d') || l5Today(), h: l5V('#tl_h'), m: l5V('#tl_m'), n: l5V('#tl_n'), b: !!(document.querySelector('#tl_b') || {}).checked }, 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    if (!r.ok) { toast(r.err, 2500); return } (c.tl = c.tl || []).push(r.e); l5Save(); ['#tl_h', '#tl_m', '#tl_n'].forEach(i => { const x = document.querySelector(i); if (x) x.value = '' }); const b = document.querySelector('#tl_b'); if (b) b.checked = true; l5TimeFill(); render(); toast('تم تسجيل ' + CM.fmtDur(r.e.m));
  }
  else if (a == 'tldel') { const c = l5Find(L5.tl), i = c ? (c.tl || []).findIndex(x => x.id == k) : -1; if (i >= 0 && confirm('حذف هذا الإدخال من سجل الوقت؟')) { c.tl.splice(i, 1); l5Save(); l5TimeFill(); render() } }
  else if (a == 'tldoc') l5TimeDoc();
  else if (a == 'tlcopy') { if (navigator.clipboard) navigator.clipboard.writeText(l5TimeText()).then(() => toast('تم النسخ'), () => toast('تعذّر النسخ')) }
  else if (a == 'tmrstart') {
    const cid = cc || L5.tl, c = l5Find(cid), run = CM.tmrRun(CLS); if (!c) return;
    if (run && run.cid != cid) { toast('المؤقت يعمل الآن على «' + ((l5Find(run.cid) || {}).name || '') + '» — أوقفه أولاً', 3500); return } if (run) return;
    c.tmr = Date.now(); l5Save(); render(); toast('بدأ المؤقت'); if (l5Open() && document.querySelector('#tl_h')) l5TimeSheet(cid);
  }
  else if (a == 'tmrstop') {
    const cid = cc || L5.tl, c = l5Find(cid); if (!c || !c.tmr) return; L5.tl = cid; const m = CM.tmrMin(c.tmr, Date.now());
    if (!m) { delete c.tmr; l5Save(); toast('أقل من نصف دقيقة — لم يُسجَّل شيء', 2500); l5Refresh(); return } l5StopSheet(c, m);
  }
  else if (a == 'tmrsave') {
    const c = l5Find(cc || L5.tl); if (!c || !c.tmr) return; const r = CM.tlEntry({ d: isoD(new Date(c.tmr)), h: 0, m: l5V('#ts_m'), n: l5V('#ts_n'), b: true }, 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    if (!r.ok) { toast(r.err, 2500); return } (c.tl = c.tl || []).push(r.e); delete c.tmr; l5Save(); render(); toast('تم تسجيل ' + CM.fmtDur(r.e.m)); l5TimeSheet(c.id);
  }
  else if (a == 'tmrdrop') { const c = l5Find(cc || L5.tl); if (!c) return; delete c.tmr; l5Save(); toast('تم تجاهل المؤقت'); render(); l5TimeSheet(c.id) }
  else if (a == 'l5cf') l5ConfSheet({});
  else if (a == 'cfopen') { const c = l5Find(cc); if (!c) return; l5ConfSheet({ client: c.client || '', opp: c.opp || '', self: c.id }); l5ConfRes() }
  else if (a == 'cfrun') l5ConfRes();
});
const l5Live = e => {
  const id = e.target && e.target.id;
  if (id == 'tl_hr') { const c = l5Find(L5.tl); if (!c) return; const n = Number(e.target.value); if (n > 0 && isFinite(n)) c.hr = FC.r2(n); else delete c.hr; l5Save(); l5TimeFill() }
  else if (id == 'tl_f' || id == 'tl_t') l5TimeFill();
  else if (id == 'tv_m') l5TimeOvRes();
  else if (id == 'dl_t') l5DecRes();
};
document.addEventListener('input', l5Live); document.addEventListener('change', l5Live);
/* زر تصدير كل المواعيد إلى التقويم (ICS) داخل الأجندة: يستعمل ntfIcs القائمة (UID ثابت فلا تتكرر عند إعادة التصدير) */
if (typeof agendaSheet == 'function' && typeof ntfIcs == 'function') { const _agendaSheet = agendaSheet; agendaSheet = function () { _agendaSheet(); const s = document.querySelector('#sh'); if (s && !s.querySelector('[data-act="ntfics"]')) s.insertAdjacentHTML('beforeend', '<div class="acts" style="margin-top:10px"><button class="btn span2" data-act="ntfics">📅 تصدير كل المواعيد إلى التقويم (ICS)</button></div>') } }
