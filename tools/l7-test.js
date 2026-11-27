#!/usr/bin/env node
/* اختبار L7 (1.29.0): نواة حقوق النشر، تدقيق الموازنة، استيراد الصيغ، تدقيق الحقوق. الاستعمال: node tools/l7-test.js */
const fs = require('fs'), path = require('path'), os = require('os'), root = path.join(__dirname, '..');
let bad = 0; const T = (n, c, x) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + n + (x !== undefined && !c ? '  ' + JSON.stringify(x).slice(0, 300) : '')); };
let RT, CA, AR, RA; try { RT = require('../js/rights.js'); CA = require('./content-audit.js'); AR = require('./add-rows.js'); RA = require('./rights-audit.js') } catch (e) { console.log('✗ تعذّر التحميل: ' + e.message); process.exit(1) }
const G = 'A'.repeat(33), G2 = 'B'.repeat(33), G3 = 'C-_'.repeat(11);

// ---- A) نواة rights
T('A1 clean: ids صالحة فقط وبلا تكرار وبترتيبها', JSON.stringify(RT.clean({ ids: [G, G, 'x', 5, null, G2, ' ' + G3 + ' '] })) === JSON.stringify([G, G2, G3]));
T('A2 clean: مدخل فاسد (null، نص، كائن بلا ids) ← []', RT.clean(null).length === 0 && RT.clean('x').length === 0 && RT.clean({}).length === 0 && RT.clean({ ids: 'a' }).length === 0);
T('A3 clean: مصفوفة مباشرة مقبولة', RT.clean([G]).length === 1);
const data = [[G, 'a', 'd', 'x'], [G2, 'b', 'b', 'x'], [G3, 'c', 'v', 'y']], parts = { [G3]: [['p', 'q']] };
T('A4 apply: يحذف من DATA وPARTS في مكانهما ويعيد العدد', RT.apply(data, parts, [G2, G3]) === 2 && data.length === 1 && data[0][0] === G && !(G3 in parts));
T('A5 apply: قائمة فارغة/غير موجودة لا تغيّر شيئاً', RT.apply(data, parts, []) === 0 && RT.apply(data, null, ['Z'.repeat(20)]) === 0 && data.length === 1);
T('A6 same: بلا اعتبار الترتيب', RT.same([G, G2], [G2, G]) && !RT.same([G], [G, G2]) && RT.same([], []));
const m = RT.msg('عنوان', G, 'https://x/y'); T('A7 msg: تحوي العنوان والمعرّف والرابط وسطور الصفة والإثبات', m.includes('عنوان') && m.includes(G) && m.includes('https://x/y') && m.includes('صفتي') && m.includes('ما يثبت'));
T('A8 authored: الكتب والموسوعات فقط', RT.authored('b') && RT.authored('v') && !RT.authored('d') && !RT.authored('q'));

// ---- B) تدقيق الموازنة على بيانات المشروع
const a = CA.audit(); const by = Object.fromEntries(a.branches.map(b => [b.name, b]));
T('B1 audit: الإجمالي = مجموع الفروع', a.total === a.branches.reduce((s, b) => s + b.n, 0) && a.total > 700, a.total);
T('B2 audit: الفروع الرقيقة المعروفة (تجاري، إداري، حكومي، عمالي) موسومة والكبرى لا', ['تجاري وشركات', 'إداري', 'حكومي وضرائب وتأمينات', 'عمالي وتأمينات'].every(n => by[n].thin) && !by['مرافعات وإجراءات'].thin && !by['جنائي'].thin);
T('B3 audit: فرع المراجع (تشريعات) ليس رقيقاً ومسمّى مراجع', by['تشريعات ومراجع'].ref === true && by['تشريعات ومراجع'].thin === false);
T('B4 audit: الأنواع الناقصة تُحسب للرقيق فقط', by['حكومي وضرائب وتأمينات'].missing.includes('إنذار') && by['جنائي'].missing.length === 0);
T('B5 audit: لا معرّفات مكررة بين الفروع', a.dup.length === 0, a.dup);
const md = CA.md(a); T('B6 md: جدول وقائمة نواقص بعناوين الفروع الرقيقة', md.includes('| الفرع |') && md.includes('### إداري') && md.includes('- [ ]'));
T('B7 docs/CONTENT_BALANCE.md محدَّث (يطابق التوليد الحالي)', fs.readFileSync(path.join(root, 'docs/CONTENT_BALANCE.md'), 'utf8').trim() === md.trim());

// ---- C) استيراد الصيغ على نسخة مؤقتة
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'l7-')); fs.mkdirSync(path.join(tmp, 'js')); fs.mkdirSync(path.join(tmp, 'data'));
fs.copyFileSync(path.join(root, 'js/config.js'), path.join(tmp, 'js/config.js')); fs.readdirSync(path.join(root, 'data')).forEach(f => fs.copyFileSync(path.join(root, 'data', f), path.join(tmp, 'data', f)));
const N0 = CA.audit(tmp);
const csv = 'id,title,type,branch\n' + [`${G},"إنذار رسمي, بفاصلة وعلامة """,n,إداري`, `${G2},تظلم وظيفي جديد,t,إداري`, `${G},مكرر داخل الملف,n,إداري`, `short,معرّف قصير,n,إداري`, `${'D'.repeat(33)},,n,إداري`, `${'E'.repeat(33)},نوع خاطئ,zz,إداري`, `${'F'.repeat(33)},فرع خاطئ,n,لا يوجد`].join('\n');
let r = AR.run(csv, tmp, true); T('C1 dry: لا يكتب شيئاً ويعدّ المقبول والمرفوض', r.added === 2 && r.rejected.length === 5 && CA.audit(tmp).total === N0.total, r);
r = AR.run(csv, tmp, false); const N1 = CA.audit(tmp);
T('C2 write: أُضيف 2 فزاد الإجمالي وفرع إداري 2 فقط', r.added === 2 && N1.total === N0.total + 2 && N1.branches.find(b => b.name === 'إداري').n === N0.branches.find(b => b.name === 'إداري').n + 2);
const f7 = fs.readFileSync(path.join(tmp, 'data/07-idari.js'), 'utf8');
T('C3 write: الملف سليم، العنوان بفاصلة وعلامة اقتباس سليم، وعدد الصيغ في الترويسة محدَّث', f7.includes('إنذار رسمي, بفاصلة وعلامة \\"') && /— 17 صيغة/.test(f7), f7.split('\n')[0]);
T('C4 write: ملفات الفروع الأخرى لم تُمَس', fs.readFileSync(path.join(tmp, 'data/06-tijari-sharikat.js'), 'utf8') === fs.readFileSync(path.join(root, 'data/06-tijari-sharikat.js'), 'utf8'));
r = AR.run(csv, tmp, false); T('C5 إعادة الاستيراد: لا تكرار (المعرّفات موجودة الآن)', r.added === 0 && r.rejected.length === 7);
fs.writeFileSync(path.join(tmp, 'data/takedown.json'), JSON.stringify({ ids: ['G'.repeat(33)] }));
r = AR.run(`${'G'.repeat(33)},مادة محذوفة,n,إداري\n${'H'.repeat(33)},تظلم وظيفي جديد,t,إداري`, tmp, true);
T('C6 المعرّف في قائمة الإزالة مرفوض، والعنوان المطابق (بتطبيع التشكيل والهمزات) مرفوض', r.added === 0 && r.rejected.length === 2, r);
T('C7 norm: يوحّد الهمزة والتاء المربوطة والتشكيل', AR.norm('إِنذارٌ  مُسْتَعْجَلة') === AR.norm('انذار مستعجله'));
T('C8 csv: اقتباس وأسطر جديدة ويندوز وBOM', JSON.stringify(AR.csv('﻿a,"b,c"\r\n"d""e",f\r\n')) === JSON.stringify([['a', 'b,c'], ['d"e', 'f']]));

// ---- D) تدقيق الحقوق
const ra = RA.audit(); T('D1 rights-audit: قائمة المشروع صالحة وفارغة الآن', ra.err === '' && ra.listed === 0 && ra.invalid === 0);
const book = CA.load(root).DATA.find(x => x[2] === 'b');
T('D2 rights-audit: يسرد الكتب والموسوعات (>30) بمعرّفاتها', ra.authored.length > 30 && ra.authored.some(x => x.enc) && ra.authored.some(x => !x.enc));
fs.writeFileSync(path.join(tmp, 'data/takedown.json'), JSON.stringify({ ids: [book[0], 'Z'.repeat(30), 'bad'] }));
const rb = RA.audit(tmp); T('D3 rights-audit: يميّز المطابق والقديم وغير الصالح ويستثني المخفي من القرار', rb.hit.length === 1 && rb.stale.length === 1 && rb.invalid === 1 && !rb.authored.some(x => x.id === book[0]), rb);

// ---- E) الملفات والتسجيل
const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
T('E1 rights.js في index.html بعد broken.js وقبل tools.js', idx.indexOf('data/broken.js') < idx.indexOf('js/rights.js') && idx.indexOf('js/rights.js') < idx.indexOf('js/tools.js'));
T('E2 rights.js في precache وtakedown.json شبكة أولاً (لا precache)', sw.includes('"js/rights.js"') && /version\|revoked\|takedown/.test(sw) && !sw.includes('"data/takedown.json"'));
T('E3 data/takedown.json موجود وبصيغة {ids:[]}', Array.isArray(JSON.parse(fs.readFileSync(path.join(root, 'data/takedown.json'), 'utf8')).ids));
T('E4 tkd ليس في مفاتيح النسخ الاحتياطي', !/BKEYS=\[[^\]]*'tkd'/.test(fs.readFileSync(path.join(root, 'js/backup.js'), 'utf8')));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `\n${bad} فشل` : '\nكل الفحوص نجحت'); process.exit(bad ? 1 : 0);
