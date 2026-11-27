#!/usr/bin/env node
/* اختبار نواة L6 (1.28.0): قوالب المذكرات والصحف ودمجها ببيانات القضية. الاستعمال: node tools/l6-test.js (النواة نقية: js/doccore.js) */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
let DC; try { DC = require(path.join(root, 'js', 'doccore.js')); } catch (e) { console.log('✗ تعذّر تحميل js/doccore.js: ' + e.message); process.exit(1); }
let bad = 0; const T = (n, c, x) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + n + (x !== undefined && !c ? '  ' + JSON.stringify(x).slice(0, 300) : '')); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const all = bl => DC.text(bl);
const IDS = ['claim', 'defense', 'appeal', 'postpone', 'notice', 'annex'];

// ---- A) أدوات
T('A1 fmtD: ISO إلى «د / ش / سنة» بلا أصفار، وغير الصالح فارغ', DC.fmtD('2026-11-05') === '5 / 11 / 2026' && DC.fmtD('') === '' && DC.fmtD('غدا') === '' && DC.fmtD(null) === '' && DC.fmtD('2026-13-40') === '');
T('A2 lines: يقص الفراغات ويحذف الفارغ وعلامات القوائم والترقيم الأولي فقط', eq(DC.lines('  - أول \n\n• ثانٍ\n3) ثالث\n4. رابع\n* خامس\n'), ['أول', 'ثانٍ', 'ثالث', 'رابع', 'خامس']), DC.lines('  - أول \n\n• ثانٍ\n3) ثالث\n4. رابع\n* خامس\n'));
T('A3 lines: لا يقص سنة أو رقماً في أول السطر بلا نقطة/قوس (2026 لسنة…)', eq(DC.lines('2026 لسنة كذا\n15 جنيهاً'), ['2026 لسنة كذا', '15 جنيهاً']) && eq(DC.lines(null), []) && eq(DC.lines(''), []));
T('A4 courtLine: بلا تكرار «محكمة» وتُضاف عند غيابها وفارغ ← فارغ', DC.courtLine('محكمة الجيزة') === 'محكمة الجيزة' && DC.courtLine('الجيزة') === 'محكمة الجيزة' && DC.courtLine('') === '' && DC.courtLine('مجلس الدولة') === 'مجلس الدولة' && DC.courtLine('نيابة الدقي') === 'نيابة الدقي');
T('A5 circuitLine: «3» ← الدائرة 3، «الدائرة 5» و«دائرة 7» كما هي، و«الثالثة مدني» ← الدائرة الثالثة مدني', DC.circuitLine('3') === 'الدائرة 3' && DC.circuitLine('الدائرة 5') === 'الدائرة 5' && DC.circuitLine('دائرة 7') === 'دائرة 7' && DC.circuitLine('الثالثة مدني') === 'الدائرة الثالثة مدني' && DC.circuitLine('') === '');

// ---- B) دمج بيانات القضية
const C = { id: 'c1', name: 'قضية أحمد', client: 'أحمد علي', opp: 'محمود سعيد', no: '55', year: '2026', court: 'محكمة الجيزة', circuit: '3', ca: 'الجيزة شارع 1', oa: 'القاهرة شارع 2', sessions: [{ id: 's1', date: '2026-10-01', done: false }, { id: 's2', date: '2026-12-10', done: false }, { id: 's3', date: '2026-11-20', done: false }, { id: 's4', date: '2026-11-26', done: true }] };
const FP = { lawyer: 'سامي المحامي', office: 'القاهرة — المعادي' };
let m = DC.caseMap(C, FP, '2026-11-15');
T('B1 caseMap: الطرفان والعنوانان والمحكمة والدائرة ورقم الدعوى (رقم لسنة سنة) والمحامي والمكتب', m.A === 'أحمد علي' && m.B === 'محمود سعيد' && m.A_addr === 'الجيزة شارع 1' && m.B_addr === 'القاهرة شارع 2' && m.court === 'محكمة الجيزة' && m.circuit === '3' && m.caseno === '55 لسنة 2026' && m.lawyer === 'سامي المحامي' && m.office === 'القاهرة — المعادي', m);
T('B2 caseMap: الجلسة = أقرب جلسة مفتوحة من اليوم فصاعداً (2026-11-20) لا المغلقة ولا الفائتة', m.session === '2026-11-20', m.session);
T('B3 caseMap: لا جلسة قادمة ← آخر جلسة مفتوحة، ولا جلسات ← فارغ', DC.caseMap(C, FP, '2027-01-01').session === '2026-12-10' && DC.caseMap({ id: 'x' }, {}, '2026-11-15').session === '');
m = DC.caseMap({ id: 'c', no: '7' }, null, '2026-11-15'); T('B4 caseMap: قضية فقيرة وfp=null بلا أخطاء، «رقم» بلا سنة ← الرقم فقط', m.caseno === '7' && m.A === '' && m.lawyer === '' && m.court === '', m);
T('B5 caseMap: لا يغيّر القضية', (() => { const c2 = JSON.parse(JSON.stringify(C)); DC.caseMap(c2, FP, '2026-11-15'); return eq(c2, C) })());
const mg = DC.merge('defense', C, FP, '2026-11-15');
T('B6 merge: يضم بيانات القضية + الافتراضيات (صفة موكلي «المدعى عليه» في المذكرة) + تاريخ التحرير = اليوم', mg.A === 'أحمد علي' && mg.capA === 'المدعى عليه' && mg.capB === 'المدعي' && mg.date === '2026-11-15' && mg.session === '2026-11-20' && mg.lawyer === 'سامي المحامي', mg);
const mg2 = DC.merge('defense', C, FP, '2026-11-15', { f: { A: 'اسم معدّل', facts: 'نص محفوظ' } });
T('B7 merge: المسودة المحفوظة تتغلب على بيانات القضية', mg2.A === 'اسم معدّل' && mg2.facts === 'نص محفوظ' && mg2.B === 'محمود سعيد');
T('B8 defaults: الصفات تختلف بالقالب (صحيفة ← المدعي/المدعى عليه، استئناف ← المستأنف/المستأنف ضده، إنذار ← المنذر/المنذر إليه)', DC.merge('claim', C, FP, '2026-11-15').capA === 'المدعي' && DC.merge('appeal', C, FP, '2026-11-15').capB === 'المستأنف ضده' && DC.merge('notice', C, FP, '2026-11-15').capA === 'المنذر' && DC.merge('notice', C, FP, '2026-11-15').capB === 'المنذر إليه');
T('B9 merge بلا قضية (null) يعمل بقيم فارغة', DC.merge('claim', null, null, '2026-11-15').date === '2026-11-15' && DC.merge('claim', null, null, '2026-11-15').A === '');

// ---- C) القوالب
T('C1 ستة قوالب بمعرفات فريدة بالأسماء والحقول (مفتاح فريد، نوع معروف)', eq(DC.TPL.map(t => t.id).sort(), IDS.slice().sort()) && DC.TPL.every(t => t.name && t.f.length > 5 && new Set(t.f.map(x => x.k)).size === t.f.length && t.f.every(x => x.k && x.l && ['text', 'area', 'date', 'num'].includes(x.t))), DC.TPL.map(t => [t.id, t.f.length]));
T('C2 كل قالب يحوي الحقول المشتركة (المحكمة، الأطراف، المحامي، التاريخ)', DC.TPL.every(t => ['court', 'A', 'B', 'lawyer', 'date'].every(k => t.f.some(x => x.k == k))));
T('C3 tpl(id) يعيد القالب والمجهول null', DC.tpl('claim').id === 'claim' && DC.tpl('zzz') === null);
const FULL = { court: 'الجيزة', circuit: '3', caseno: '55 لسنة 2026', session: '2026-11-20', A: 'أحمد علي', A_addr: 'الجيزة ش1', capA: 'المدعي', B: 'محمود سعيد', B_addr: 'القاهرة ش2', capB: 'المدعى عليه', lawyer: 'سامي المحامي', office: 'المعادي', date: '2026-11-15', subject: 'مطالبة بمبلغ مالي', value: '50000', facts: 'وقعت الواقعة الأولى\nثم الثانية', grounds: 'المادة كذا\n- المبدأ كذا', defenses: 'الدفع الأول\nالدفع الثاني', requests: 'الحكم بالمبلغ\nالمصروفات', annex: 'عقد البيع | 3\nإيصال', judgment: 'محكمة الجيزة الابتدائية في الدعوى 10 لسنة 2025', judgDate: '2026-09-01', reasons: 'مرض المحامي\nعدم اكتمال المستندات', requested: '2026-12-20', demands: 'سداد المبلغ\nتسليم المستندات', days: '15', consequences: 'المطالبة بالتعويض', items: 'عقد | 4\nإيصال سداد | 1\nصورة ضوئية' };
for (const id of IDS) {
  const b = DC.build(id, FULL), t = all(b);
  T(`C4[${id}] يبني كتلاً صالحة (h/p/li/tbl) وبعنوان وبأسماء الطرفين والمحامي وتاريخ التحرير`, Array.isArray(b) && b.length > 5 && b.every(x => ['h', 'p', 'li', 'tbl'].includes(x.t)) && b[0].t && t.includes('أحمد علي') && t.includes('سامي المحامي') && t.includes('15 / 11 / 2026'), t.slice(0, 200));
  T(`C5[${id}] لا يظهر undefined ولا null ولا [object] مع بيانات كاملة`, !/undefined|null|\[object/.test(t));
  const e = all(DC.build(id, {}));
  T(`C6[${id}] مع حقول فارغة تماماً: نقاط التنقيط بدل الفراغ، بلا undefined، وبلا استثناء`, e.includes('......') && !/undefined|null|\[object/.test(e));
}
const cl = all(DC.build('claim', FULL));
T('C7 صحيفة الدعوى: محكمة الجيزة (بلا تكرار) والدائرة 3 والموضوع والقيمة والأقسام الأربعة', cl.includes('محكمة الجيزة') && !cl.includes('محكمة محكمة') && cl.includes('الدائرة 3') && cl.includes('مطالبة بمبلغ مالي') && cl.includes('50000') && ['الوقائع', 'الأسانيد القانونية', 'الطلبات', 'المستندات'].every(h => cl.includes(h)), cl);
T('C8 الترقيم: الوقائع «1) …» «2) …» والتنظيف من علامات القوائم', cl.includes('1) وقعت الواقعة الأولى') && cl.includes('2) ثم الثانية') && cl.includes('2) المبدأ كذا') && !cl.includes('- المبدأ'), cl);
T('C9 الطلبات تُختم بحفظ الحقوق', cl.includes('حفظ') && cl.includes('حقوق'));
const df = all(DC.build('defense', FULL));
T('C10 مذكرة الدفاع: عنوانها بصفة الموكل واسمه، ورقم الدعوى والجلسة والدفوع والطلبات', df.includes('مذكرة بدفاع') && df.includes('المدعي') && df.includes('55 لسنة 2026') && df.includes('20 / 11 / 2026') && df.includes('الدفع الأول') && df.includes('الطلبات'), df);
const ap = all(DC.build('appeal', FULL));
T('C11 صحيفة الاستئناف: الحكم المستأنف وتاريخه وأسباب الاستئناف والطلبات', ap.includes('صحيفة استئناف') && ap.includes('محكمة الجيزة الابتدائية في الدعوى 10 لسنة 2025') && ap.includes('1 / 9 / 2026') && ap.includes('أسباب الاستئناف') && ap.includes('الطلبات'), ap);
const pp = all(DC.build('postpone', FULL));
T('C12 طلب التأجيل: الجلسة الحالية والمطلوبة والأسباب', pp.includes('طلب تأجيل') && pp.includes('20 / 11 / 2026') && pp.includes('20 / 12 / 2026') && pp.includes('1) مرض المحامي'), pp);
const nt = all(DC.build('notice', FULL));
T('C13 الإنذار: الموضوع والمهلة بعدد الأيام والمطالب والنتيجة', nt.includes('إنذار') && nt.includes('15') && nt.includes('يوماً') && nt.includes('1) سداد المبلغ') && nt.includes('المطالبة بالتعويض') && nt.includes('محمود سعيد'), nt);
const nt0 = all(DC.build('notice', { ...FULL, days: '' })); T('C14 الإنذار بلا مهلة: نقاط بدل الرقم', /\.{6,}\s*يوماً|يوماً/.test(nt0) && nt0.includes('......'), nt0);
const an = DC.build('annex', FULL), tb = an.find(x => x.t == 'tbl');
T('C15 حافظة المستندات: جدول (م، بيان المستند، عدد الأوراق) بسطور البنود، و«|» يفصل عدد الأوراق، وبلا عدد ← «—»', tb && eq(tb.rows[0], ['م', 'بيان المستند', 'عدد الأوراق']) && eq(tb.rows[1], ['1', 'عقد', '4']) && eq(tb.rows[3], ['3', 'صورة ضوئية', '—']) && tb.rows.length === 4, tb);
T('C16 الحافظة بلا بنود: صف فارغ منقّط واحد على الأقل', DC.build('annex', {}).find(x => x.t == 'tbl').rows.length >= 2);
const dd = Object.freeze({ ...FULL }); T('C17 البناء لا يغيّر المُدخل (يعمل على نسخة مجمّدة) وعودياً ثابت', IDS.every(id => eq(DC.build(id, dd), DC.build(id, { ...FULL }))));
T('C18 رموز HTML/XML في النص تمرّ كما هي للبناء (التهريب في docxBuild)', all(DC.build('claim', { ...FULL, A: 'شركة <أ> & "ب"' })).includes('شركة <أ> & "ب"'));
T('C19 حقل بمسافات فقط يُعامل كفارغ (نقاط)', all(DC.build('claim', { ...FULL, court: '   ', facts: ' \n ' })).includes('......'));
T('C20 text() يجمع العنوان والفقرات والجدول', all(an).includes('عقد') && all(an).includes('|'));

// ---- D) التحقق
T('D1 validate: قالب فارغ يعيد الحقول الإلزامية الناقصة بتسمياتها العربية', DC.validate('claim', {}).length >= 4 && DC.validate('claim', {}).every(x => typeof x == 'string' && x.length > 1), DC.validate('claim', {}));
T('D2 validate: بيانات كاملة ← لا نقص لكل القوالب', IDS.every(id => DC.validate(id, FULL).length === 0), IDS.map(id => DC.validate(id, FULL)));
T('D3 validate: حقل بمسافات فقط يُعدّ ناقصاً، والمجهول يعيد []', DC.validate('claim', { ...FULL, facts: '  ' }).length === 1 && eq(DC.validate('zzz', {}), []));

// ---- E) المسودات
const cc = { id: 'k1' }; const d1 = DC.saveDraft(cc, { t: 'claim', f: { A: 'أ', court: 'الجيزة' } }, '2026-11-15');
T('E1 saveDraft: ينشئ مسودة بمعرّف وقالب وبيانات وتاريخ واسم يحوي اسم القالب', cc.dr.length === 1 && d1.id && d1.t === 'claim' && d1.f.A === 'أ' && d1.at === '2026-11-15' && d1.n.includes('صحيفة') && d1.n.includes('أ'), d1);
const d2 = DC.saveDraft(cc, { did: d1.id, t: 'claim', f: { A: 'ب' } }, '2026-11-16'); T('E2 الحفظ بنفس المعرّف يحدّث ولا يكرّر، ويبقى تاريخ الإنشاء ويتغير التعديل', cc.dr.length === 1 && cc.dr[0].f.A === 'ب' && cc.dr[0].at === '2026-11-15' && cc.dr[0].up === '2026-11-16', cc.dr);
DC.saveDraft(cc, { t: 'defense', f: {} }, '2026-11-17'); T('E3 مسودة قالب آخر ← عنصر ثانٍ، والأحدث أولاً', cc.dr.length === 2 && cc.dr[0].t === 'defense', cc.dr.map(x => x.t));
for (let i = 0; i < 40; i++) DC.saveDraft(cc, { t: 'notice', f: { A: 'x' + i } }, '2026-11-18'); T('E4 الحد الأقصى 30 مسودة (تُحذف الأقدم)', cc.dr.length === 30 && cc.dr[0].f.A === 'x39', cc.dr.length);
T('E5 saveDraft بقالب مجهول ← null بلا تغيير، وحقول تتجاوز 5000 حرف تُقصّ', (() => { const c3 = { id: 'z' }; const r = DC.saveDraft(c3, { t: 'zzz', f: {} }, '2026-11-18'); const r2 = DC.saveDraft(c3, { t: 'claim', f: { facts: 'ن'.repeat(9000) } }, '2026-11-18'); return r === null && c3.dr.length === 1 && r2.f.facts.length === 5000 })());
const did = cc.dr[0].id; T('E6 delDraft: يحذف الموجود ويعيد true، والمجهول false', DC.delDraft(cc, did) === true && !cc.dr.some(x => x.id === did) && DC.delDraft(cc, 'nope') === false && DC.delDraft({}, 'a') === false);
T('E7 saveDraft يحفظ نسخة لا مرجعاً (تغيير الأصل بعد الحفظ لا يمسّ المسودة)', (() => { const f = { A: 'أ' }, c4 = { id: 'q' }; DC.saveDraft(c4, { t: 'claim', f }, '2026-11-18'); f.A = 'تغيّر'; return c4.dr[0].f.A === 'أ' })());
T('E8 draftName: اسم القالب + الطرف الأول + التاريخ', DC.draftName('claim', { A: 'أحمد' }, '2026-11-15').includes('صحيفة دعوى') && DC.draftName('claim', { A: 'أحمد' }, '2026-11-15').includes('أحمد') && DC.draftName('claim', {}, '2026-11-15').includes('15 / 11 / 2026'));

// ---- F) ملفات المشروع
const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), pos = f => idx.indexOf('js/' + f + '?v=');
T('F1 الترتيب: doccore بعد casecore، وdocgen بعد casemgmt وfill وقبل vault-ui', pos('doccore.js') > pos('casecore.js') && pos('docgen.js') > pos('casemgmt.js') && pos('docgen.js') > pos('fill.js') && pos('docgen.js') < pos('vault-ui.js') && pos('doccore.js') > 0, [pos('casecore.js'), pos('doccore.js'), pos('fill.js'), pos('casemgmt.js'), pos('docgen.js'), pos('vault-ui.js')]);
T('F2 الملفان في sw.js', sw.includes('"js/doccore.js"') && sw.includes('"js/docgen.js"'));
let g = ''; try { g = fs.readFileSync(path.join(root, 'js', 'docgen.js'), 'utf8') } catch (e) { }
const keys = [...g.matchAll(/_s\(\s*'([^']+)'/g)].map(x => x[1]);
T('F3 docgen.js: التخزين عبر lists وfp فقط (لا مفاتيح جديدة، ولا localStorage مباشرة)', g.length > 0 && keys.every(k => k === 'lists') && !/localStorage\s*[.\[]/.test(g) && [...g.matchAll(/\b(?:sv|ld)\(\s*'([^']+)'/g)].every(x => x[1] === 'fp'), [keys, g.length]);
const v = fs.readFileSync(path.join(root, 'version.json'), 'utf8').match(/"version":"([\d.]+)"/)[1], cfg = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8').match(/version:'([\d.]+)'/)[1], swv = sw.match(/siyagh-v([\d.]+)/)[1], ge = (a, b) => a.split('.').map(Number).reduce((r, x, i) => r || (x - Number(b.split('.')[i])), 0) >= 0;
T('F4 اتساق الإصدار وهو ≥ 1.28.0', v === cfg && cfg === swv && ge(v, '1.28.0'), [v, cfg, swv]);
console.log(bad ? `\n✗ ${bad} فشل` : '\n✓ كل الفحوص نجحت'); process.exit(bad ? 1 : 0);
