#!/usr/bin/env node
/* اختبار نواة L3 (1.25.0): دقة عشرية بالقروش، ضريبة القيمة المضافة، ترقيم رسمي متسلسل، كشف الحساب.
   الاستعمال: node tools/l3-test.js   — النواة نقية (js/feecore.js) فلا تحتاج متصفحاً. */
const fs = require('fs'), path = require('path');
let FC;
try { FC = require(path.join(__dirname, '..', 'js', 'feecore.js')); } catch (e) { console.log('✗ تعذّر تحميل js/feecore.js: ' + e.message); process.exit(1); }
let bad = 0; const T = (n, c, x) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + n + (x !== undefined && !c ? '  ' + JSON.stringify(x) : '')); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// A) الدقة العشرية
T('A1 r2: 1.005→1.01 و2.675→2.68 و1.004→1.00', eq([FC.r2(1.005), FC.r2(2.675), FC.r2(1.004)], [1.01, 2.68, 1]), [FC.r2(1.005), FC.r2(2.675), FC.r2(1.004)]);
T('A2 r2 يقبل نصاً ويرفض غير الرقمي (0)', eq([FC.r2('12.345'), FC.r2('abc'), FC.r2(NaN), FC.r2(-5)], [12.35, 0, 0, 0]), [FC.r2('12.345'), FC.r2('abc'), FC.r2(NaN), FC.r2(-5)]);
T('A3 sum: 0.1+0.2 = 0.3 تماماً (لا 0.30000000000000004)', FC.sum([0.1, 0.2]) === 0.3, FC.sum([0.1, 0.2]));
T('A4 sum: عشر مرات 0.1 = 1 و1000 مرة 0.01 = 10', FC.sum(Array(10).fill(0.1)) === 1 && FC.sum(Array(1000).fill(0.01)) === 10);
T('A5 sum: يقبل سالباً (لرصيد) ويحفظ القرش', FC.sum([100, -33.33, -66.67]) === 0 && FC.sum([10.01, -0.02]) === 9.99);
T('A6 sum: قائمة فارغة = 0 وقيم غير رقمية تُهمَل', FC.sum([]) === 0 && FC.sum([5, 'x', null, undefined, 2.5]) === 7.5);

// B) الضريبة
let v = FC.vat(1000, 14, 'excl');
T('B1 قبل الضريبة: 1000 + 14% = 140 → 1140', eq([v.net, v.vat, v.gross, v.rate], [1000, 140, 1140, 14]), v);
v = FC.vat(1140, 14, 'incl');
T('B2 شامل الضريبة: 1140 → صافي 1000 وضريبة 140', eq([v.net, v.vat, v.gross], [1000, 140, 1140]), v);
v = FC.vat(333.33, 14, 'excl');
T('B3 تقريب الضريبة للقرش: 333.33 → 46.67 (46.6662)', eq([v.vat, v.gross], [46.67, 380]), v);
v = FC.vat(100, 14, 'incl');
T('B4 شامل: 100 → صافي 87.72 وضريبة 12.28 (المجموع 100)', eq([v.net, v.vat, v.gross], [87.72, 12.28, 100]), v);
let ok = true, first = null;
for (let i = 0; i < 6000; i++) { const a = Math.round(Math.random() * 5e7) / 100, r = [0, 5, 10, 14][i % 4], m = i % 2 ? 'incl' : 'excl', x = FC.vat(a, r, m); if (FC.r2(x.net + x.vat) !== x.gross || (m == 'incl' && x.gross !== a) || (m == 'excl' && x.net !== a)) { ok = false; first = first || [a, r, m, x]; } }
T('B5 خاصية: صافي + ضريبة = إجمالي دائماً (6000 حالة، نسب 0/5/10/14)', ok, first);
v = FC.vat(500, 0, 'excl'); T('B6 نسبة 0: لا ضريبة', eq([v.net, v.vat, v.gross], [500, 0, 500]), v);
T('B7 نسبة غير صالحة (-1 أو 101 أو NaN) ← 0 لا استثناء', eq([FC.vat(100, -1, 'excl').vat, FC.vat(100, 101, 'excl').vat, FC.vat(100, 'x', 'excl').vat], [0, 0, 0]));
T('B8 rate: يقبل 14 و"14" و10.5 ويرفض خارج 0–100', eq([FC.rate(14), FC.rate('14'), FC.rate(10.5), FC.rate(120), FC.rate(-3), FC.rate('')], [14, 14, 10.5, 0, 0, 0]));

// C) الترقيم الرسمي
const E = [
  { id: 'a', k: 'pay', sno: 1, sy: 2026 }, { id: 'b', k: 'pay', sno: 2, sy: 2026, void: true }, { id: 'c', k: 'fee', sno: 1, sy: 2026 },
  { id: 'd', k: 'pay', sno: 5, sy: 2025 }, { id: 'e', k: 'pay', rno: 9 /* قديم بلا رقم رسمي */ }
];
T('C1 التالي بعد 1 و2(ملغى) = 3: الملغى يحتفظ برقمه', FC.nextSerial(E, 'pay', 2026) === 3);
T('C2 كل نوع له سلسلته: الفواتير تبدأ بعد 1 → 2', FC.nextSerial(E, 'fee', 2026) === 2);
T('C3 كل سنة سلسلتها: 2027 تبدأ 1 و2025 بعد 5 → 6', FC.nextSerial(E, 'pay', 2027) === 1 && FC.nextSerial(E, 'pay', 2025) === 6);
T('C4 رقم البداية يرفع السلسلة فقط ولا يخفضها (start=100 → 100، start=1 → 3)', FC.nextSerial(E, 'pay', 2026, 100) === 100 && FC.nextSerial(E, 'pay', 2026, 1) === 3);
T('C5 القيود القديمة بلا رقم رسمي لا تؤثر', FC.nextSerial([{ k: 'pay', rno: 40 }], 'pay', 2026) === 1);
T('C6 fmtNo: R-2026-0007 و F-2027-0123 ويتسع لأكثر من 4 أرقام', eq([FC.fmtNo('R', 2026, 7), FC.fmtNo('F', 2027, 123), FC.fmtNo('R', 2026, 12345)], ['R-2026-0007', 'F-2027-0123', 'R-2026-12345']));
T('C7 fmtNo يقبل بادئة مخصصة ويقص الغريب منها', FC.fmtNo('م/أ', 2026, 3) === 'م/أ-2026-0003' && FC.fmtNo('  R 1 ', 2026, 3) === 'R1-2026-0003');
T('C8 الفجوات: gaps يكتشف رقماً مفقوداً (حذف خارجي)', eq(FC.gaps([{ k: 'pay', sno: 1, sy: 2026 }, { k: 'pay', sno: 3, sy: 2026 }, { k: 'pay', sno: 4, sy: 2026 }], 'pay', 2026), [2]));
T('C9 gaps: سلسلة متصلة أو فارغة ← []', eq(FC.gaps(E.filter(x => x.k == 'pay' && x.sy == 2026), 'pay', 2026), []) && eq(FC.gaps([], 'pay', 2026), []));

// D) الرصيد وكشف الحساب
const L = [
  { id: '1', k: 'fee', amt: 1140, net: 1000, vat: 140, vr: 14, date: '2026-01-10' },
  { id: '2', k: 'exp', amt: 200.5, date: '2026-01-15' },
  { id: '3', k: 'pay', amt: 500, date: '2026-02-01' },
  { id: '4', k: 'pay', amt: 300, date: '2026-02-05', void: true },
  { id: '5', k: 'pay', amt: 340.5, date: '2026-03-01' },
  { id: '6', k: 'fee', amt: 570, net: 500, vat: 70, vr: 14, date: '2026-03-10' }
];
let s = FC.ledger(L);
T('D1 الإجماليات تستثني الملغى: أتعاب 1710 مصروفات 200.5 مستلم 840.5 ضريبة 210 ← المتبقي 1070', eq([s.fees, s.exps, s.pays, s.vat, s.due], [1710, 200.5, 840.5, 210, 1070]), s);
T('D2 صفوف الكشف مرتبة بالتاريخ والرصيد الجاري صحيح', eq(s.rows.filter(r => !r.void).map(r => r.bal), [1140, 1340.5, 840.5, 500, 1070]), s.rows.map(r => r.bal));
T('D3 الملغى يظهر صفاً بلا أثر على الرصيد', s.rows.length === 6 && s.rows.find(r => r.id == '4').void === true && s.rows.find(r => r.id == '4').bal === 840.5);
s = FC.ledger(L, { from: '2026-02-01', to: '2026-02-28' });
T('D4 فترة فبراير: رصيد افتتاحي 1340.5 وصف واحد (الدفعة 500) وختامي 840.5', eq([s.opening, s.rows.filter(r => !r.void).length, s.closing], [1340.5, 1, 840.5]), s);
T('D5 حدود الفترة شاملة (من = يوم القيد، إلى = يوم القيد)', FC.ledger(L, { from: '2026-02-01', to: '2026-02-01' }).rows.length === 1 && FC.ledger(L, { from: '2026-03-10', to: '2026-03-10' }).rows.length === 1);
s = FC.ledger(L, { from: '2027-01-01' }); T('D6 فترة بلا قيود: افتتاحي = ختامي = 1070', eq([s.opening, s.closing, s.rows.length], [1070, 1070, 0]), s);
s = FC.ledger([{ k: 'fee', amt: 0.1, date: '2026-01-01' }, { k: 'fee', amt: 0.2, date: '2026-01-02' }, { k: 'pay', amt: 0.3, date: '2026-01-03' }]);
T('D7 لا انجراف عشري: 0.1+0.2−0.3 = 0 تماماً ← مسدَّد', s.due === 0 && s.closing === 0, s);
s = FC.ledger([{ k: 'fee', amt: 100, date: '2026-01-01' }, { k: 'pay', amt: 150, date: '2026-01-02' }]); T('D8 دفعات زائدة ← رصيد سالب (لصالح الموكل)', s.due === -50, s);
T('D9 نفس اليوم: الترتيب ثابت بالمعرّف (لا تقلب الأرصدة)', eq(FC.ledger([{ id: 'b', k: 'pay', amt: 5, date: '2026-01-01' }, { id: 'a', k: 'fee', amt: 10, date: '2026-01-01' }]).rows.map(r => r.id), ['a', 'b']));

// E) ملفات المشروع
const root = path.join(__dirname, '..'), idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pos = f => idx.indexOf('js/' + f + '?v=');
T('E1 feecore.js وfees2.js في index.html بالترتيب: feecore < fees < fees2', pos('feecore.js') > 0 && pos('feecore.js') < pos('fees.js') && pos('fees.js') < pos('fees2.js'), [pos('feecore.js'), pos('fees.js'), pos('fees2.js')]);
T('E2 الملفان في قائمة sw.js', sw.includes('"js/feecore.js"') && sw.includes('"js/fees2.js"'));
console.log(bad ? `\n✗ ${bad} فشل` : '\n✓ كل الفحوص نجحت'); process.exit(bad ? 1 : 0);
