#!/usr/bin/env node
/* اختبار نواة L5 (1.26.0): إدارة القضايا — جدول الجلسات، قرارات الجلسات، سجل الوقت، تعارض المصالح.
   الاستعمال: node tools/l5-test.js   — النواة نقية (js/casecore.js) فلا تحتاج متصفحاً. */
const fs = require('fs'), path = require('path');
let CM;
try { CM = require(path.join(__dirname, '..', 'js', 'casecore.js')); } catch (e) { console.log('✗ تعذّر تحميل js/casecore.js: ' + e.message); process.exit(1); }
let bad = 0; const T = (n, c, x) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + n + (x !== undefined && !c ? '  ' + JSON.stringify(x) : '')); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- A) تطبيع الأسماء والمطابقة ----------
T('A1 norm: ألف/همزة/ياء/تاء مربوطة/تشكيل/مسافات', CM.norm('  أَحمد   مُحمّد ') === CM.norm('احمد محمد') && CM.norm('أمينة') === CM.norm('امينه') && CM.norm('مصطفى') === CM.norm('مصطفي'), [CM.norm('  أَحمد   مُحمّد '), CM.norm('احمد محمد')]);
T('A2 norm: «عبد الله» = «عبدالله» و«عبد الرحمن» = «عبدالرحمن»', CM.norm('عبد الله') === CM.norm('عبدالله') && CM.norm('عبد الرحمن') === CM.norm('عبدالرحمن'));
T('A3 norm: الألقاب لا تُغيّر الهوية (السيد/ الأستاذ/ المهندس/ الدكتور/ الحاج)', ['السيد/ ', 'الأستاذ ', 'المهندس ', 'الدكتور ', 'الحاج ', 'السيدة '].every(p => CM.norm(p + 'خالد منصور') === CM.norm('خالد منصور')), CM.norm('السيد/ خالد منصور'));
T('A4 norm: لا تُسقط «شركة» ولا الأسماء التي تبدأ بحرف الواو', CM.norm('شركة النور') !== CM.norm('النور') && CM.norm('وليد سعيد').startsWith('وليد'), [CM.norm('شركة النور'), CM.norm('وليد سعيد')]);
T('A5 norm: أرقام هندية وعلامات ترقيم', CM.norm('شركة ٥ نجوم، المحدودة.') === CM.norm('شركة 5 نجوم المحدودة'), CM.norm('شركة ٥ نجوم، المحدودة.'));
T('A6 norm: غير النص = فارغ', CM.norm(null) === '' && CM.norm(undefined) === '' && CM.norm(12) === '12');
T('A7 names: فصل الأطراف بالفاصلة والفاصلة العربية و«/» وسطر جديد و« و » المحاطة بمسافات', eq(CM.names('سمير حسن، ورثة فلان / علي سالم\nمنى و ليلى'), ['سمير حسن', 'ورثة فلان', 'علي سالم', 'منى', 'ليلى']), CM.names('سمير حسن، ورثة فلان / علي سالم\nمنى و ليلى'));
T('A8 names: اسم يبدأ بواو لا يُقسَّم، وفارغ ← []', eq(CM.names('وليد وائل'), ['وليد وائل']) && eq(CM.names(''), []) && eq(CM.names(null), []));
T('A9 match: تطابق تام', CM.match('السيد/ أحمد علي', 'احمد علي') === 'exact');
T('A10 match: الأقصر مجموعة جزئية من الأطول (≥ كلمتين) ← part', CM.match('محمد أحمد علي', 'محمد أحمد علي حسن') === 'part' && CM.match('شركة النور للتجارة', 'شركة النور') === 'part');
T('A11 match: كلمة واحدة لا تُطابق جزئياً، وترتيب مختلف ليس تطابقاً', CM.match('محمد', 'محمد أحمد') === '' && CM.match('محمد علي', 'علي محمد') === '' && CM.match('', 'أحمد علي') === '' && CM.match('أحمد علي', '') === '');
T('A12 match: اسمان مختلفان ← فارغ', CM.match('أحمد علي', 'محمود سعيد') === '');

// ---------- B) تعارض المصالح ----------
const CS = [
  { id: 'c1', name: 'قضية 1', client: 'أحمد علي', opp: 'محمود سعيد', status: 'متداولة' },
  { id: 'c2', name: 'قضية 2', client: 'محمود سعيد', opp: 'شركة الأمل', status: 'متداولة' },
  { id: 'c3', name: 'قضية 3', client: 'هبة كمال', opp: 'سمير حسن، ورثة فلان', status: 'منتهية' },
  { id: 'c4', name: 'قضية 4', client: 'أحمد علي', opp: '' }
];
const PA = [{ id: 'p1', client: 'خالد منصور', status: 'ساري' }, { id: 'p2', client: 'نادر فؤاد', status: 'ملغي' }];
let r = CM.conflicts(CS, PA, { client: 'محمود سعيد', opp: 'جهة أخرى' });
T('B1 موكل جديد = خصم في قضية سابقة ← تعارض مباشر (hi) من نوع client_vs_opp', r.some(x => x.lv === 'hi' && x.kind === 'client_vs_opp' && x.cid === 'c1' && x.mt === 'exact'), r);
T('B2 الموكل نفسه في قضية أخرى ← معلومة (lo) same_client', r.some(x => x.lv === 'lo' && x.kind === 'same_client' && x.cid === 'c2'), r);
T('B3 التعارض المباشر يسبق المعلومات في الترتيب', r[0].lv === 'hi', r.map(x => x.lv));
r = CM.conflicts(CS, PA, { client: 'س', opp: 'أحمد علي' });
T('B4 خصم جديد = موكل في قضيتين ← hi مرتين (c1 وc4)', r.filter(x => x.lv === 'hi' && x.kind === 'opp_vs_client').map(x => x.cid).sort().join() === 'c1,c4', r);
r = CM.conflicts(CS, PA, { client: 'لا أحد', opp: 'السيد خالد منصور' });
T('B5 خصم جديد = موكل بتوكيل ساري ← hi من نوع poa', r.some(x => x.lv === 'hi' && x.kind === 'poa' && x.src === 'poa' && x.cstatus === 'ساري'), r);
r = CM.conflicts(CS, PA, { client: 'لا أحد', opp: 'نادر فؤاد' });
T('B6 توكيل ملغي ← معلومة lo فقط (لا hi)', r.some(x => x.kind === 'poa' && x.lv === 'lo') && !r.some(x => x.lv === 'hi'), r);
r = CM.conflicts(CS, PA, { client: 'سمير حسن', opp: '' });
T('B7 تعدد الأطراف: «سمير حسن» ضمن خصوم قضية 3 المنتهية ← hi وتظهر حالتها «منتهية» (واجب السرية باقٍ)', r.some(x => x.lv === 'hi' && x.cid === 'c3' && x.cstatus === 'منتهية'), r);
r = CM.conflicts(CS, PA, { client: 'أحمد علي', opp: 'شركة الأمل', selfId: 'c1' });
T('B8 selfId يستثني القضية نفسها: موكل أحمد علي في c4 فقط (c1 مستثناة)', r.filter(x => x.kind === 'same_client').map(x => x.cid).join() === 'c4' && !r.some(x => x.cid === 'c1'), r);
T('B9 خصم مشترك: شركة الأمل خصم في c2 ← same_opp (lo)', r.some(x => x.kind === 'same_opp' && x.cid === 'c2' && x.lv === 'lo'), r);
r = CM.conflicts(CS, PA, { client: 'محمود سعيد علي', opp: '' });
T('B10 تشابه جزئي يُوسَم mt=part (أقصر ≥ كلمتين ضمن الأطول)', r.some(x => x.mt === 'part' && x.cid === 'c1'), r);
T('B11 مدخلات فارغة ← لا نتائج', eq(CM.conflicts(CS, PA, { client: '', opp: '' }), []) && eq(CM.conflicts([], [], { client: 'س س', opp: 'ص ص' }), []) && eq(CM.conflicts(null, null, { client: 'أ ب' }), []));
r = CM.conflicts(CS, PA, { client: 'محمود سعيد', opp: 'محمود سعيد' });
T('B12 لا تكرار لنفس (النوع، القضية، الاسم)', new Set(r.map(x => x.kind + '|' + x.cid + '|' + x.who)).size === r.length, r);
const cs2 = JSON.parse(JSON.stringify(CS)); CM.conflicts(cs2, PA, { client: 'محمود سعيد', opp: 'ب ب' }); T('B13 الفحص لا يغيّر البيانات', eq(cs2, CS));

// ---------- C) قرارات الجلسات ----------
const mk = () => ({ id: 'k1', status: 'متداولة', sessions: [{ id: 's1', date: '2026-11-25', time: '10:00', note: 'مرافعة', done: false }, { id: 's2', date: '2026-12-30', note: '', done: false }] });
T('C1 قائمة الأنواع', eq(CM.DEC, ['تأجيل', 'حجز للحكم', 'صدور حكم', 'شطب', 'وقف', 'إحالة', 'أخرى']), CM.DEC);
let c = mk(), d = CM.decide(c, 's1', { t: 'تأجيل', n: 'للإعلان', nd: '2026-12-10', nt: '09:30', nn: 'لتقديم المذكرة' }, '2026-11-25');
T('C2 تأجيل بتاريخ: تُغلق الجلسة وتُسجَّل القرار وتُنشأ جلسة تالية', d.ok && c.sessions[0].done === true && c.sessions[0].dec.t === 'تأجيل' && c.sessions[0].dec.n === 'للإعلان' && c.sessions[0].dec.nd === '2026-12-10' && c.sessions[0].dec.at === '2026-11-25' && d.created && d.created.date === '2026-12-10' && d.created.time === '09:30' && d.created.note === 'لتقديم المذكرة' && d.created.done === false && c.sessions.length === 3 && c.sessions[0].dec.nid === d.created.id, [d, c]);
c = mk(); d = CM.decide(c, 's1', { t: 'تأجيل', nd: '2026-11-20' }, '2026-11-25');
T('C3 تاريخ تالٍ قبل تاريخ الجلسة ← خطأ ولا تغيير (ذرّية)', !d.ok && !!d.err && c.sessions[0].done === false && !c.sessions[0].dec && c.sessions.length === 2, [d, c]);
c = mk(); d = CM.decide(c, 's1', { t: 'تأجيل', nd: '2026-13-45' }, '2026-11-25');
T('C4 تاريخ غير صالح ← خطأ ولا تغيير', !d.ok && c.sessions[0].done === false && c.sessions.length === 2, d);
c = mk(); d = CM.decide(c, 's1', { t: 'خرافة' }, '2026-11-25'); T('C5 نوع قرار غير معروف ← خطأ', !d.ok && c.sessions[0].done === false, d);
c = mk(); d = CM.decide(c, 'nope', { t: 'تأجيل' }, '2026-11-25'); T('C6 جلسة غير موجودة ← خطأ', !d.ok);
c = mk(); d = CM.decide(c, 's1', { t: 'تأجيل', nd: '2026-12-30' }, '2026-11-25');
T('C7 منع التكرار: جلسة مفتوحة قائمة بالتاريخ نفسه (s2) ← لا إنشاء وتُربط nid=s2', d.ok && d.created === null && c.sessions.length === 2 && c.sessions[0].dec.nid === 's2', [d, c.sessions]);
c = mk(); d = CM.decide(c, 's1', { t: 'حجز للحكم', nd: '2026-12-20', st: true }, '2026-11-25');
T('C8 حجز للحكم مع st ← حالة القضية «محجوزة للحكم» وجلسة النطق تُنشأ', d.ok && c.status === 'محجوزة للحكم' && d.status === 'محجوزة للحكم' && d.created.date === '2026-12-20', [d, c.status]);
c = mk(); d = CM.decide(c, 's1', { t: 'صدور حكم', st: true }, '2026-11-25'); T('C9 صدور حكم ← «صدر فيها حكم» بلا جلسة جديدة', c.status === 'صدر فيها حكم' && d.created === null && c.sessions.length === 2, c);
c = mk(); d = CM.decide(c, 's1', { t: 'وقف', st: true }, '2026-11-25'); T('C10 وقف ← «مؤجلة»', c.status === 'مؤجلة', c.status);
c = mk(); d = CM.decide(c, 's1', { t: 'تأجيل', st: true }, '2026-11-25'); const cz = mk(); CM.decide(cz, 's1', { t: 'شطب', st: true }, '2026-11-25');
T('C11 تأجيل لا يغيّر الحالة، وشطب كذلك (الشطب قابل للتجديد فلا يُعدّ إنهاءً)', c.status === 'متداولة' && cz.status === 'متداولة' && cz.sessions[0].done === true, [c.status, cz.status]);
c = mk(); d = CM.decide(c, 's1', { t: 'حجز للحكم', st: false }, '2026-11-25'); T('C12 st=false ← الحالة كما هي', c.status === 'متداولة' && d.status === null, [c.status, d]);
c = mk(); d = CM.decide(c, 's1', { t: 'أخرى', n: 'ن'.repeat(500) }, '2026-11-25'); T('C13 نص القرار يُقصّ عند 300 حرف', c.sessions[0].dec.n.length === 300, c.sessions[0].dec.n.length);
c = mk(); CM.decide(c, 's1', { t: 'تأجيل', nd: '2026-12-10' }, '2026-11-25'); const nid = c.sessions[0].dec.nid;
d = CM.decide(c, 's1', { t: 'تأجيل', n: 'تعديل', nd: '2026-12-15' }, '2026-11-26');
T('C14 تعديل قرار جلسة مغلقة: الجلسة التالية المفتوحة تُحدَّث لا تُكرَّر', d.ok && c.sessions.length === 3 && c.sessions.find(x => x.id === nid).date === '2026-12-15' && c.sessions[0].dec.nd === '2026-12-15' && d.created === null && c.sessions[0].dec.n === 'تعديل', [d, c.sessions]);
c.sessions.find(x => x.id === nid).done = true; d = CM.decide(c, 's1', { t: 'تأجيل', nd: '2027-01-05' }, '2026-11-27');
T('C15 إن أُغلقت الجلسة التالية فالتعديل ينشئ جديدة ولا يمسّ المغلقة', d.ok && d.created && d.created.date === '2027-01-05' && c.sessions.find(x => x.id === nid).date === '2026-12-15', [d, c.sessions]);
c = mk(); CM.decide(c, 's1', { t: 'تأجيل', nd: '2026-12-10' }, '2026-11-25'); const before = JSON.stringify(c.sessions[1]);
T('C16 لا تُمَسّ بقية الجلسات', JSON.stringify(c.sessions[1]) === before && c.sessions[1].id === 's2');
c = mk(); delete c.sessions; d = CM.decide(c, 's1', { t: 'تأجيل' }, '2026-11-25'); T('C17 قضية بلا مصفوفة جلسات ← خطأ لا استثناء', !d.ok);
c = mk(); d = CM.decide(c, 's1', { t: 'تأجيل', nd: '2026-11-25' }, '2026-11-25'); T('C18 التاريخ التالي = تاريخ الجلسة نفسه مقبول (جلسة في اليوم نفسه)', d.ok);

// ---------- D) جدول الجلسات ----------
const SC = [
  { id: 'c1', name: 'قضية 1', no: '5', year: '2026', court: 'محكمة أ', circuit: '3', client: 'موكل أ', sessions: [{ id: 's1', date: '2026-11-26', time: '10:00', note: 'مرافعة' }, { id: 's2', date: '2026-11-25', note: 'اليوم' }, { id: 's3', date: '2026-11-20', note: 'فائتة' }, { id: 's4', date: '2026-11-27', done: true, note: 'منتهية' }, { id: 's7', date: '2026-11-26', time: '08:00', note: 'مبكرة' }] },
  { id: 'c2', name: 'قضية 2', client: 'موكل ب', sessions: [{ id: 's5', date: '2026-11-26', note: 'بلا وقت' }, { id: 's6', date: '2026-12-05' }] },
  { id: 'c3', name: 'قضية 3', status: 'منتهية', sessions: [{ id: 's8', date: '2026-11-28', note: 'قديمة' }] },
  { id: 'c4', name: 'قضية 4' }
];
let rows = CM.schedule(SC, { from: '2026-11-25', to: '2026-11-27', today: '2026-11-25' });
T('D1 الجلسات المفتوحة ضمن المدى فقط، مرتبة بالتاريخ ثم بالوقت (الموقّتة أولاً وغير الموقّتة آخر اليوم)', rows.map(x => x.sid).join() === 's2,s7,s1,s5', rows.map(x => x.sid));
T('D2 حقول الصف: القضية والرقم والسنة والمحكمة والدائرة والموكل والغرض', eq([rows[1].cid, rows[1].cname, rows[1].no, rows[1].year, rows[1].court, rows[1].circuit, rows[1].client, rows[1].note, rows[1].date, rows[1].time], ['c1', 'قضية 1', '5', '2026', 'محكمة أ', '3', 'موكل أ', 'مبكرة', '2026-11-26', '08:00']), rows[1]);
rows = CM.schedule(SC, { from: '2026-11-25', to: '2026-11-27', today: '2026-11-25', done: true }); T('D3 done:true تُضيف المغلقة (s4)', rows.some(x => x.sid === 's4') && rows.length === 5, rows.map(x => x.sid));
rows = CM.schedule(SC, { late: true, today: '2026-11-25' }); T('D4 late: المفتوحة قبل اليوم فقط', rows.map(x => x.sid).join() === 's3' && rows[0].late === true, rows);
rows = CM.schedule(SC, { from: '2026-11-28', to: '2026-11-28', today: '2026-11-25' }); T('D5 جلسة قضية منتهية تظهر بعلامة ended', rows.length === 1 && rows[0].ended === true && rows[0].sid === 's8', rows);
T('D6 قضية بلا جلسات أو قوائم فارغة/null ← []', eq(CM.schedule([], { from: 'a', to: 'b', today: '2026-11-25' }), []) && eq(CM.schedule(null, { from: '2026-01-01', to: '2026-12-31', today: '2026-11-25' }), []));
T('D7 range: today/tomorrow', eq(CM.range('today', '2026-11-25'), { from: '2026-11-25', to: '2026-11-25' }) && eq(CM.range('tomorrow', '2026-11-25'), { from: '2026-11-26', to: '2026-11-26' }), [CM.range('today', '2026-11-25'), CM.range('tomorrow', '2026-11-25')]);
T('D8 range: 7d تعبر حدّ السنة', eq(CM.range('7d', '2026-12-28'), { from: '2026-12-28', to: '2027-01-03' }), CM.range('7d', '2026-12-28'));
T('D9 range: month (30 يوماً، شباط كبيس، 31 يوماً)', eq(CM.range('month', '2026-11-25'), { from: '2026-11-01', to: '2026-11-30' }) && CM.range('month', '2028-02-10').to === '2028-02-29' && CM.range('month', '2026-12-31').to === '2026-12-31', [CM.range('month', '2028-02-10')]);
T('D10 range: نوع مجهول ← اليوم', eq(CM.range('xx', '2026-11-25'), { from: '2026-11-25', to: '2026-11-25' }));
T('D11 addDays عبر الشهر والسنة وشباط', CM.addDays('2026-11-30', 1) === '2026-12-01' && CM.addDays('2026-12-31', 1) === '2027-01-01' && CM.addDays('2028-02-28', 1) === '2028-02-29' && CM.addDays('2026-03-01', -1) === '2026-02-28');
T('D12 validDate: يرفض 2026-02-30 و2026-13-01 والنص', CM.validDate('2026-02-28') && !CM.validDate('2026-02-30') && !CM.validDate('2026-13-01') && !CM.validDate('') && !CM.validDate('غدا'));
const SC0 = JSON.stringify(SC); CM.schedule(SC, { from: '2026-01-01', to: '2026-12-31', today: '2026-11-25' }); T('D13 الجدولة لا تغيّر البيانات', JSON.stringify(SC) === SC0);

// ---------- E) سجل القرارات ----------
const DC = [
  { id: 'a', name: 'قضية أ', sessions: [{ id: 'x1', date: '2026-10-01', done: true, dec: { t: 'تأجيل', n: 'ن1', nd: '2026-10-15', at: '2026-10-01' } }, { id: 'x2', date: '2026-10-15', done: true, dec: { t: 'حجز للحكم', n: '', nd: '2026-11-15', at: '2026-10-15' } }, { id: 'x3', date: '2026-09-01', done: true }, { id: 'x4', date: '2026-12-01', done: false }] },
  { id: 'b', name: 'قضية ب', sessions: [{ id: 'y1', date: '2026-10-20', done: true, dec: { t: 'تأجيل', n: 'ن3', at: '2026-10-20' } }] }
];
rows = CM.decLog(DC, {}); T('E1 كل القرارات الأحدث أولاً (y1 ثم x2 ثم x1) والمفتوحة والمغلقة بلا قرار مستبعدة', rows.map(x => x.sid).join() === 'y1,x2,x1', rows.map(x => x.sid));
rows = CM.decLog(DC, { type: 'تأجيل' }); T('E2 فلتر النوع', rows.map(x => x.sid).join() === 'y1,x1' && rows[1].cname === 'قضية أ' && rows[1].dec.n === 'ن1', rows);
rows = CM.decLog(DC, { nodec: true }); T('E3 المغلقة بلا قرار مسجّل (x3 فقط)', rows.map(x => x.sid).join() === 'x3', rows);
T('E4 decLog بلا بيانات ← []', eq(CM.decLog(null, {}), []) && eq(CM.decLog([{ id: 'z' }], {}), []));

// ---------- F) سجل الوقت ----------
T('F1 fmtDur', CM.fmtDur(0) === '0 د' && CM.fmtDur(45) === '45 د' && CM.fmtDur(60) === '1 س' && CM.fmtDur(125) === '2 س 05 د' && CM.fmtDur(1500) === '25 س', [CM.fmtDur(0), CM.fmtDur(45), CM.fmtDur(60), CM.fmtDur(125), CM.fmtDur(1500)]);
T('F2 fmtDur: غير صالح ← 0 د', CM.fmtDur(-5) === '0 د' && CM.fmtDur(NaN) === '0 د' && CM.fmtDur(null) === '0 د');
let e = CM.tlEntry({ d: '2026-11-25', h: 2, m: 30, n: 'مراجعة الملف', b: true }, 't1');
T('F3 tlEntry: ساعتان ونصف = 150 دقيقة والقيمة الافتراضية قابلة للفوترة', e.ok && eq(e.e, { id: 't1', d: '2026-11-25', m: 150, n: 'مراجعة الملف', b: true }), e);
T('F4 tlEntry: يقبل نصوصاً رقمية ويقص الملاحظة 100 ويحوّل b غير المحدد إلى true', (() => { const x = CM.tlEntry({ d: '2026-11-25', h: '1', m: '5', n: 'ن'.repeat(300) }, 'q'); return x.ok && x.e.m === 65 && x.e.n.length === 100 && x.e.b === true })());
T('F5 tlEntry: يرفض 0 دقيقة، السالب، فوق 24 ساعة، غير الأعداد، تاريخاً سيئاً', [{ d: '2026-11-25', h: 0, m: 0 }, { d: '2026-11-25', h: -1, m: 0 }, { d: '2026-11-25', h: 24, m: 1 }, { d: '2026-11-25', h: 'x', m: 'y' }, { d: '2026-02-31', h: 1, m: 0 }, { d: '', h: 1, m: 0 }, { d: '2026-11-25', h: 1.5, m: 0 }].every(i => !CM.tlEntry(i, 'z').ok));
T('F6 tlEntry: 24 ساعة بالضبط مقبولة، ودقائق > 59 تُجمع (0 س 90 د = 90)', CM.tlEntry({ d: '2026-11-25', h: 24, m: 0 }, 'z').ok && CM.tlEntry({ d: '2026-11-25', h: 0, m: 90 }, 'z').e.m === 90);
const TL = [{ id: '1', d: '2026-11-01', m: 60, b: true }, { id: '2', d: '2026-11-02', m: 30, b: false }, { id: '3', d: '2026-12-01', m: 45, b: true }, { id: '4', d: '2026-11-30', m: 15 }];
T('F7 tlTotal: الكل = 150 والقابل للفوترة = 120 (b غير محدد = قابل)', eq(CM.tlTotal(TL), { min: 150, bill: 120, n: 4 }), CM.tlTotal(TL));
T('F8 tlTotal: فترة شاملة الطرفين (11-01 → 11-30)', eq(CM.tlTotal(TL, { from: '2026-11-01', to: '2026-11-30' }), { min: 105, bill: 75, n: 3 }), CM.tlTotal(TL, { from: '2026-11-01', to: '2026-11-30' }));
T('F9 tlTotal: فارغ/null ← صفر', eq(CM.tlTotal(null), { min: 0, bill: 0, n: 0 }) && eq(CM.tlTotal([]), { min: 0, bill: 0, n: 0 }));
T('F10 tlTotal: يهمل القيم غير الصالحة', CM.tlTotal([{ d: '2026-11-01', m: 'x' }, { d: '2026-11-01', m: -5 }, null, { d: '2026-11-01', m: 10 }]).min === 10);
T('F11 tlValue: 150 دقيقة × 400/س = 1000', CM.tlValue(150, 400) === 1000);
T('F12 tlValue: تقريب نصف لأعلى على القرش (1 د × 100.5 = 1.68)', CM.tlValue(1, 100.5) === 1.68, CM.tlValue(1, 100.5));
T('F13 tlValue: 1000 إدخال × دقيقة × 60/س = 1000 تماماً (الحساب على المجموع فلا انجراف)', CM.tlValue(CM.tlTotal(Array.from({ length: 1000 }, (_, i) => ({ id: 'e' + i, d: '2026-11-01', m: 1, b: true }))).bill, 60) === 1000);
T('F14 tlValue: أجر صفر/سالب/نص ← 0', CM.tlValue(100, 0) === 0 && CM.tlValue(100, -5) === 0 && CM.tlValue(100, 'x') === 0 && CM.tlValue(0, 500) === 0);
const NOW = 1_700_000_000_000;
T('F15 tmrMin: أقل من 30 ث ← 0، و30 ث ← 1، و90 ث ← 2 (نصف لأعلى)، و3 س ← 180', CM.tmrMin(NOW - 29_000, NOW) === 0 && CM.tmrMin(NOW - 30_000, NOW) === 1 && CM.tmrMin(NOW - 90_000, NOW) === 2 && CM.tmrMin(NOW - 3 * 3600_000, NOW) === 180, [CM.tmrMin(NOW - 29_000, NOW), CM.tmrMin(NOW - 30_000, NOW), CM.tmrMin(NOW - 90_000, NOW)]);
T('F16 tmrMin: ساعة النظام رجعت للخلف أو قيمة تالفة ← 0', CM.tmrMin(NOW + 5000, NOW) === 0 && CM.tmrMin('x', NOW) === 0 && CM.tmrMin(null, NOW) === 0);
T('F17 tmrRun: أول مؤقت يعمل بين القضايا، ولا شيء إن لم يوجد', eq(CM.tmrRun([{ id: 'a' }, { id: 'b', tmr: 123 }, { id: 'c', tmr: 456 }]), { cid: 'b', start: 123 }) && CM.tmrRun([{ id: 'a' }]) === null && CM.tmrRun(null) === null);
T('F18 tmrRun: قيمة مؤقت غير رقمية تُهمَل', CM.tmrRun([{ id: 'a', tmr: 'x' }, { id: 'b', tmr: 0 }, { id: 'c', tmr: -1 }]) === null);

// ---------- G) ملفات المشروع ----------
const root = path.join(__dirname, '..'), idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pos = f => idx.indexOf('js/' + f + '?v=');
T('G1 الترتيب في index.html: feecore < casecore < legal وdlx < casemgmt < vault-ui', pos('feecore.js') > 0 && pos('casecore.js') > pos('feecore.js') && pos('casecore.js') < pos('legal.js') && pos('casemgmt.js') > pos('legal.js') && pos('casemgmt.js') > pos('dlx.js') && pos('casemgmt.js') > pos('fees2.js') && pos('casemgmt.js') < pos('vault-ui.js'), ['feecore', pos('feecore.js'), 'casecore', pos('casecore.js'), 'legal', pos('legal.js'), 'dlx', pos('dlx.js'), 'casemgmt', pos('casemgmt.js'), 'vault-ui', pos('vault-ui.js')]);
T('G2 الملفان في قائمة sw.js', sw.includes('"js/casecore.js"') && sw.includes('"js/casemgmt.js"'));
let mg = ''; try { mg = fs.readFileSync(path.join(root, 'js', 'casemgmt.js'), 'utf8'); } catch (e) { }
const keys = [...mg.matchAll(/_s\(\s*'([^']+)'/g)].map(m => m[1]);
T('G3 لا مفاتيح تخزين جديدة: كل _s() في casemgmt.js على «lists» فقط، ولا localStorage مباشرة', mg.length > 0 && keys.length > 0 && keys.every(k => k === 'lists') && !/localStorage\s*[.\[]/.test(mg), keys);
const v = fs.readFileSync(path.join(root, 'version.json'), 'utf8').match(/"version":"([\d.]+)"/)[1], cfg = fs.readFileSync(path.join(root, 'js', 'config.js'), 'utf8').match(/version:'([\d.]+)'/)[1], swv = sw.match(/siyagh-v([\d.]+)/)[1];
const ge = (a, b) => a.split('.').map(Number).reduce((r, x, i) => r || (x - Number(b.split('.')[i])), 0) >= 0;
T('G4 اتساق الإصدار (version.json = config = sw) وهو ≥ 1.26.0', v === cfg && cfg === swv && ge(v, '1.26.0'), [v, cfg, swv]);
console.log(bad ? `\n✗ ${bad} فشل` : '\n✓ كل الفحوص نجحت'); process.exit(bad ? 1 : 0);
