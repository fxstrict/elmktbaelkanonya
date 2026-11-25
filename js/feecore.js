/* نواة الأتعاب (L3): حساب نقي بلا DOM ولا تخزين، يعمل في المتصفح وفي Node (tools/l3-test.js).
   كل المبالغ تُحسب بالقروش (أعداد صحيحة) ثم تُعاد بالجنيه، فلا انجراف عشري. التقريب «نصف لأعلى» على القرش. */
const FC = (() => {
  /* جنيه (عدد أو نص) → قروش صحيحة. toPrecision يعالج 1.005*100=100.49999999999999. غير الرقمي = 0 */
  const pc = x => { const n = Number(x); if (x === null || x === '' || !isFinite(n)) return 0; const s = n < 0 ? -1 : 1; return s * Math.round(Number((Math.abs(n) * 100).toPrecision(12))); };
  const fromPc = p => p / 100;
  const r2 = x => fromPc(Math.max(0, pc(x)));                       /* مبلغ إدخال: لا سالب */
  const sum = a => fromPc((a || []).reduce((t, x) => t + pc(x), 0));  /* جمع بالقروش (يقبل سالباً) */
  const rate = x => { const n = Number(x); return isFinite(n) && n >= 0 && n <= 100 ? n : 0; };
  /* ضريبة: mode='excl' المبلغ قبل الضريبة فتُضاف، 'incl' المبلغ شامل فتُستخرج. صافي + ضريبة = إجمالي دائماً */
  const vat = (amt, r, mode) => {
    const A = Math.max(0, pc(amt)), R = rate(r); let net, tax, gross;
    if (mode === 'incl') { gross = A; net = Math.round(A * 100 / (100 + R)); tax = gross - net; }
    else { net = A; tax = Math.round(A * R / 100); gross = net + tax; }
    return { net: fromPc(net), vat: fromPc(tax), gross: fromPc(gross), rate: R };
  };
  /* ---- الترقيم الرسمي: سلسلة لكل (نوع، سنة)، متصلة، لا يُعاد استعمال رقم (الملغى يحتفظ برقمه) ---- */
  const serials = (E, kind, year) => (E || []).filter(x => x && x.k === kind && x.sy == year && Number.isFinite(Number(x.sno)) && x.sno !== null).map(x => Number(x.sno));
  const nextSerial = (E, kind, year, start) => { const s = serials(E, kind, year), mx = s.length ? Math.max(...s) : 0, st = Number(start) > 0 ? Math.floor(Number(start)) : 1; return Math.max(mx + 1, st); };
  const fmtNo = (prefix, year, n) => String(prefix == null ? '' : prefix).replace(/\s+/g, '').slice(0, 8) + '-' + year + '-' + String(n).padStart(4, '0');
  const gaps = (E, kind, year) => { const s = [...new Set(serials(E, kind, year))].sort((a, b) => a - b), out = []; if (s.length < 2) return out; const have = new Set(s); for (let i = s[0]; i <= s[s.length - 1]; i++) if (!have.has(i)) out.push(i); return out; };
  /* ---- الرصيد وكشف الحساب ----
     L: قيود {k:'fee'|'exp'|'pay', amt, date, void?, vat?}. opts.from/to: 'YYYY-MM-DD' شاملان.
     opening = الرصيد قبل from، closing = الرصيد في نهاية الفترة. الملغى يظهر صفاً ولا أثر له. */
  const ledger = (L, opts) => {
    const o = opts || {}, from = o.from || '', to = o.to || '';
    const all = (L || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.id || '') < String(b.id || '') ? -1 : String(a.id || '') > String(b.id || '') ? 1 : 0));
    const sgn = x => x.void ? 0 : x.k === 'pay' ? -1 : 1;
    let bal = 0, opening = 0, f = 0, e = 0, p = 0, t = 0; const rows = [];
    for (const x of all) {
      if (to && x.date > to) continue;
      if (from && x.date < from) { bal += sgn(x) * pc(x.amt); opening = bal; continue; }
      if (!x.void) { const a = pc(x.amt); if (x.k === 'fee') { f += a; t += pc(x.vat); } else if (x.k === 'exp') e += a; else if (x.k === 'pay') p += a; bal += sgn(x) * a; }
      rows.push(Object.assign({}, x, { bal: fromPc(bal) }));
    }
    if (!from) opening = 0;
    return { opening: fromPc(opening), rows, fees: fromPc(f), exps: fromPc(e), pays: fromPc(p), vat: fromPc(t), closing: fromPc(bal), due: fromPc(bal) };
  };
  return { pc, r2, sum, rate, vat, nextSerial, fmtNo, gaps, ledger };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = FC;
