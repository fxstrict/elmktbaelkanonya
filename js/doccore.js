/* نواة قوالب المذكرات والصحف (L6): منطق نقي بلا DOM ولا تخزين، يعمل في المتصفح وفي Node (tools/l6-test.js).
   القوالب هيكلية للاستئناس: العناوين والترتيب والصياغة المعتادة مع فراغات منقّطة لما لم يُملأ، ولا تتضمن أرقام مواد ولا مواعيد قانونية (تُكتب من المحامي وتُراجَع قبل التقديم).
   النتيجة كتل لـ docxBuild: {t:'h'|'p'|'li'|'tbl', x, rows, sz}. المسودات تُحفظ داخل القضية في c.dr (مفتاح lists) ولا مفاتيح تخزين جديدة. */
const DC = (() => {
  const DOT = '................';
  const S = x => String(x == null ? '' : x).trim();
  const fmtD = iso => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(S(iso)); if (!m) return ''; const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return (t.getUTCFullYear() == +m[1] && t.getUTCMonth() == +m[2] - 1 && t.getUTCDate() == +m[3]) ? `${+m[3]} / ${+m[2]} / ${m[1]}` : '' };
  /* أسطر غير فارغة بلا علامات القوائم (- • *) ولا ترقيم أولي «3)» أو «4.»؛ الرقم بلا نقطة/قوس (سنة أو مبلغ) يبقى */
  const lines = t => S(t) ? String(t).split(/\r?\n/).map(s => S(s).replace(/^(?:[-•*]\s*|[\d٠-٩]+[.)]\s+)/, '').trim()).filter(Boolean) : [];
  const courtLine = s => { s = S(s); return !s ? '' : /^(?:ال)?(?:محكمة|مجلس|نيابة|هيئة)/.test(s) ? s : 'محكمة ' + s };
  const circuitLine = s => { s = S(s); return !s ? '' : /^(?:ال)?دائرة/.test(s) ? s : 'الدائرة ' + s };

  /* ---------- دمج بيانات القضية ---------- */
  const nextSession = (c, today) => {
    const o = ((c && c.sessions) || []).filter(s => s && !s.done && /^\d{4}-\d\d-\d\d$/.test(s.date || '')).map(s => s.date).sort();
    return o.find(d => d >= today) || o[o.length - 1] || '';
  };
  const caseMap = (c, fp, today) => {
    c = c || {}; fp = fp || {};
    return { A: S(c.client), B: S(c.opp), A_addr: S(c.ca), B_addr: S(c.oa), court: S(c.court), circuit: S(c.circuit), caseno: S(c.no) ? S(c.no) + (S(c.year) ? ' لسنة ' + S(c.year) : '') : '', lawyer: S(fp.lawyer), office: S(fp.office), session: nextSession(c, today || '') };
  };

  /* ---------- القوالب ---------- */
  const F = (k, l, t, h) => ({ k, l, t: t || 'text', h: h || '' });
  const COMMON = [F('court', 'المحكمة'), F('circuit', 'الدائرة'), F('caseno', 'رقم الدعوى (مثال: 55 لسنة 2026)'), F('session', 'تاريخ الجلسة', 'date'),
    F('A', 'اسم موكلي'), F('A_addr', 'عنوان موكلي'), F('capA', 'صفة موكلي'), F('B', 'اسم الخصم'), F('B_addr', 'عنوان الخصم'), F('capB', 'صفة الخصم'),
    F('lawyer', 'المحامي'), F('office', 'عنوان المكتب'), F('date', 'تاريخ التحرير', 'date')];
  const TPL = [
    { id: 'claim', name: 'صحيفة دعوى', desc: 'افتتاح دعوى: الأطراف والموضوع والوقائع والأسانيد والطلبات', capA: 'المدعي', capB: 'المدعى عليه', req: ['court', 'A', 'B', 'facts', 'requests'],
      f: [...COMMON, F('subject', 'موضوع الدعوى'), F('value', 'قيمة الدعوى (اختياري)'), F('facts', 'الوقائع (كل سطر نقطة)', 'area'), F('grounds', 'الأسانيد القانونية (كل سطر)', 'area', 'اكتب المواد والمبادئ بنفسك وراجعها'), F('requests', 'الطلبات (كل سطر)', 'area'), F('annex', 'المستندات المرفقة (كل سطر)', 'area')] },
    { id: 'defense', name: 'مذكرة بدفاع', desc: 'مذكرة للجلسة: الوقائع والدفوع والطلبات', capA: 'المدعى عليه', capB: 'المدعي', req: ['court', 'caseno', 'A', 'B', 'requests'],
      f: [...COMMON, F('facts', 'الوقائع (كل سطر نقطة)', 'area'), F('defenses', 'الدفوع والدفاع (كل سطر)', 'area'), F('requests', 'الطلبات (كل سطر)', 'area'), F('annex', 'المستندات المرفقة (كل سطر)', 'area')] },
    { id: 'appeal', name: 'صحيفة استئناف', desc: 'استئناف حكم: بيانات الحكم والأسباب والطلبات', capA: 'المستأنف', capB: 'المستأنف ضده', req: ['court', 'A', 'B', 'judgment', 'grounds', 'requests'],
      f: [...COMMON, F('judgment', 'الحكم المستأنف (المحكمة/رقم الدعوى)'), F('judgDate', 'تاريخ الحكم', 'date', 'راجع ميعاد الاستئناف في أداة المواعيد'), F('facts', 'موجز الوقائع (كل سطر)', 'area'), F('grounds', 'أسباب الاستئناف (كل سطر)', 'area'), F('requests', 'الطلبات (كل سطر)', 'area'), F('annex', 'المستندات المرفقة (كل سطر)', 'area')] },
    { id: 'postpone', name: 'طلب تأجيل', desc: 'طلب تأجيل نظر الدعوى لجلسة أخرى بأسباب', capA: '', capB: '', req: ['court', 'caseno', 'A', 'reasons'],
      f: [...COMMON, F('requested', 'الجلسة المطلوبة', 'date'), F('reasons', 'أسباب التأجيل (كل سطر)', 'area')] },
    { id: 'notice', name: 'إنذار رسمي', desc: 'إنذار بالوفاء أو بالقيام بعمل خلال مهلة', capA: 'المنذر', capB: 'المنذر إليه', req: ['A', 'B', 'demands'],
      f: [...COMMON, F('subject', 'موضوع الإنذار'), F('demands', 'المطلوب من المنذر إليه (كل سطر)', 'area'), F('days', 'المهلة بالأيام', 'num'), F('consequences', 'ما يترتب عند عدم التنفيذ (اختياري، كل سطر)', 'area')] },
    { id: 'annex', name: 'حافظة مستندات', desc: 'قائمة مستندات مقدمة للمحكمة بعدد أوراق كل مستند', capA: '', capB: '', req: ['A', 'items'],
      f: [...COMMON, F('items', 'المستندات (كل سطر: اسم المستند | عدد الأوراق)', 'area')] }
  ];
  const tpl = id => TPL.find(t => t.id === id) || null;
  const defaults = (id, today) => { const t = tpl(id) || {}; return { capA: t.capA || '', capB: t.capB || '', date: today || '' } };
  /* القيم الأولية للنموذج: الافتراضيات ثم بيانات القضية ثم المسودة المحفوظة (الأقوى) */
  const merge = (id, c, fp, today, draft) => Object.assign({}, defaults(id, today), caseMap(c, fp, today), (draft && draft.f) || {});

  /* ---------- البناء ---------- */
  const build = (id, f) => {
    const t = tpl(id); if (!t) return [];
    f = f || {}; const v = k => S(f[k]), dot = k => v(k) || DOT, B = [];
    const p = (x, sz) => B.push(sz ? { t: 'p', x, sz } : { t: 'p', x }), h = (x, sz) => B.push({ t: 'h', x, sz: sz || 26 });
    const party = (n, a, c) => `السيد/ ${n || DOT}${a ? ' — المقيم ' + a : ''}${c ? ' (' + c + ')' : ''}`;
    const pa = () => party(v('A'), v('A_addr'), v('capA')), pb = () => party(v('B'), v('B_addr'), v('capB'));
    const head = (o) => { p(courtLine(v('court')) || 'محكمة ' + DOT); p(circuitLine(v('circuit')) || 'الدائرة ' + DOT); if (o.caseno) p('في الدعوى رقم ' + dot('caseno')); if (o.session && v('session')) p('جلسة ' + fmtD(v('session'))) };
    const sec = (title, text, num) => { h(title); const L = lines(text); if (L.length) L.forEach((s, i) => p(num === false ? s : `${i + 1}) ${s}`)); else p(DOT + DOT) };
    const sign = () => { p(''); p('وكيل ' + (v('capA') ? v('capA') + ' ' : '') + 'المحامي/ ' + dot('lawyer')); if (v('office')) p(v('office')); p('تحريراً في ' + (fmtD(v('date')) || DOT)) };
    const annexNames = () => lines(v('annex')).map(s => S(s.split('|')[0]));
    if (id === 'claim') {
      h('صحيفة دعوى', 34); head({ session: false });
      p(`إنه في يوم ${fmtD(v('date')) || DOT} بناءً على طلب ${pa()} ومحله المختار مكتب الأستاذ/ ${dot('lawyer')} المحامي${v('office') ? ' الكائن ' + v('office') : ''}.`);
      p('أُقيمت هذه الدعوى ضد: ' + pb()); p('الموضوع: ' + dot('subject'));
      if (v('value')) p('قيمة الدعوى: ' + (/^[\d٠-٩.,\s]+$/.test(v('value')) ? v('value') + ' جنيهاً' : v('value')));
      sec('الوقائع', v('facts')); sec('الأسانيد القانونية', v('grounds')); sec('الطلبات', v('requests'));
      p(`مع حفظ كافة حقوق ${v('capA') || 'موكلي'} الأخرى أياً كانت.`);
      if (annexNames().length) sec('المستندات', annexNames().join('\n'));
      sign();
    } else if (id === 'defense') {
      h('مذكرة بدفاع ' + (v('capA') ? v('capA') + ' ' : '') + 'السيد/ ' + dot('A'), 32); head({ caseno: true, session: true });
      p('مقدمة من: ' + pa()); p('ضد: ' + pb());
      sec('الوقائع', v('facts')); sec('الدفاع', v('defenses')); sec('الطلبات', v('requests'));
      if (annexNames().length) sec('حافظة المستندات', annexNames().join('\n'));
      p('وتفضلوا بقبول فائق الاحترام،،،'); sign();
    } else if (id === 'appeal') {
      h('صحيفة استئناف', 34); head({ caseno: false });
      p(`استئنافاً للحكم الصادر من ${dot('judgment')}${v('judgDate') ? ' بجلسة ' + fmtD(v('judgDate')) : ''}.`);
      p('المستأنف: ' + pa()); p('المستأنف ضده: ' + pb());
      sec('موجز الوقائع', v('facts')); sec('أسباب الاستئناف', v('grounds')); sec('الطلبات', v('requests'));
      p(`مع حفظ كافة حقوق ${v('capA') || 'موكلي'} الأخرى أياً كانت.`);
      if (annexNames().length) sec('المستندات', annexNames().join('\n'));
      sign();
    } else if (id === 'postpone') {
      h('طلب تأجيل', 34); head({ caseno: true });
      p('السيد الأستاذ/ رئيس الدائرة'); p('تحية طيبة وبعد،');
      p(`يتشرف الأستاذ/ ${dot('lawyer')} المحامي ${v('capA') ? 'عن ' + v('capA') + ' ' : 'عن '}السيد/ ${dot('A')} بأن يتقدم لعدالتكم بطلب تأجيل نظر الدعوى رقم ${dot('caseno')} المحددة لنظرها بجلسة ${fmtD(v('session')) || DOT} إلى جلسة ${fmtD(v('requested')) || DOT}، وذلك للأسباب الآتية:`);
      const L = lines(v('reasons')); if (L.length) L.forEach((s, i) => p(`${i + 1}) ${s}`)); else p(DOT + DOT);
      p('وتفضلوا بقبول فائق الاحترام،،،'); sign();
    } else if (id === 'notice') {
      h('إنذار رسمي', 34); p('مقدم من: ' + pa()); p('إلى: ' + pb()); p('الموضوع: ' + dot('subject'));
      p(`نُنذر المنذر إليه بالقيام بالآتي خلال ${v('days') || DOT} يوماً من تاريخ إعلانه بهذا الإنذار:`);
      const L = lines(v('demands')); if (L.length) L.forEach((s, i) => p(`${i + 1}) ${s}`)); else p(DOT + DOT);
      const C = lines(v('consequences'));
      if (C.length) { p('وإلا اضطر المنذر إلى اتخاذ كافة الإجراءات القانونية، ومنها:'); C.forEach((s, i) => p(`${i + 1}) ${s}`)) } else p('وإلا اضطر المنذر إلى اتخاذ كافة الإجراءات القانونية لاقتضاء حقوقه مع تحميل المنذر إليه المصروفات.');
      sign();
    } else if (id === 'annex') {
      h('حافظة مستندات', 34); head({ caseno: true }); p('مقدمة من: ' + pa()); p('ضد: ' + pb());
      const L = lines(v('items')), rows = [['م', 'بيان المستند', 'عدد الأوراق']];
      if (L.length) L.forEach((s, i) => { const [n, g] = s.split('|'); rows.push([String(i + 1), S(n) || DOT, S(g) || '—']) }); else rows.push(['1', DOT, '—']);
      B.push({ t: 'tbl', rows }); sign();
    }
    return B;
  };
  const text = bl => (bl || []).map(b => b.t === 'tbl' ? b.rows.map(r => r.join(' | ')).join('\n') : (b.t === 'li' ? '• ' : '') + b.x).join('\n');
  const validate = (id, f) => { const t = tpl(id); if (!t) return []; f = f || {}; return t.req.filter(k => !S(f[k])).map(k => t.f.find(x => x.k === k).l) };

  /* ---------- المسودات ---------- */
  const draftName = (t, f, now) => { const x = tpl(t); return (x ? x.name : '') + (S(f && f.A) ? ' — ' + S(f.A) : '') + ' (' + (fmtD(now) || '') + ')' };
  const clean = (t, f) => { const o = {}; tpl(t).f.forEach(x => { if (f && f[x.k] != null && S(f[x.k]) !== '') o[x.k] = String(f[x.k]).slice(0, 5000) }); return o };
  const rid = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  /* يحفظ (ينشئ أو يحدّث بـ did) مسودة في c.dr؛ الأحدث أولاً وحدّها 30. يعيد المسودة أو null لقالب مجهول */
  const saveDraft = (c, d, now) => {
    if (!c || !d || !tpl(d.t)) return null; if (!Array.isArray(c.dr)) c.dr = [];
    const f = clean(d.t, d.f), old = d.did && c.dr.find(x => x.id === d.did);
    if (old) { old.t = d.t; old.f = f; old.n = draftName(d.t, f, now); old.up = now; return old }
    const n = { id: rid(), t: d.t, n: draftName(d.t, f, now), f, at: now, up: now }; c.dr.unshift(n); if (c.dr.length > 30) c.dr.length = 30; return n;
  };
  const delDraft = (c, id) => { if (!c || !Array.isArray(c.dr)) return false; const i = c.dr.findIndex(x => x.id === id); if (i < 0) return false; c.dr.splice(i, 1); return true };
  return { DOT, fmtD, lines, courtLine, circuitLine, caseMap, TPL, tpl, defaults, merge, build, text, validate, draftName, saveDraft, delDraft };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DC;
