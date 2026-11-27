#!/usr/bin/env node
/* تدقيق موازنة المحتوى (L7): عدد صيغ كل فرع ونسبته وأنواعه، والفروع الرقيقة، والأنواع الناقصة فيها.
   node tools/content-audit.js            يطبع الملخص
   node tools/content-audit.js --write    يكتب docs/CONTENT_BALANCE.md
   node tools/content-audit.js --json     يطبع JSON (للاختبار)
   العتبة: فرع «رقيق» إن قلّ عن 30 صيغة أو عن 5% من المجموع. الأنواع المتوقعة للفروع الأساسية: دعوى، إنذار، طلب/مستندات، نموذج، دفوع ومذكرات. */
const fs = require('fs'), path = require('path'), vm = require('vm'), root = path.join(__dirname, '..');
function load(dir) {
  dir = dir || root;
  const ctx = vm.createContext({ console }); vm.runInContext(fs.readFileSync(path.join(dir, 'js/config.js'), 'utf8').replace(/^const /gm, 'var ').replace(/\nfunction fetchT[\s\S]*$/, '') + ';this.DATA=DATA;this.PARTS=PARTS;this.T=T;', ctx);
  fs.readdirSync(path.join(dir, 'data')).filter(f => /^\d\d-.*\.js$/.test(f)).sort().forEach(f => { try { vm.runInContext(fs.readFileSync(path.join(dir, 'data', f), 'utf8'), ctx) } catch (e) { throw new Error(f + ': ' + e.message) } });
  return { DATA: ctx.DATA, PARTS: ctx.PARTS, T: ctx.T };
}
const CORE = ['d', 'n', 'r', 'f', 'g'];
/* اقتراحات عناوين للبحث عنها (للمراجعة والتحقق من المصدر؛ ليست أحكاماً قانونية) */
const IDEAS = {
  'تجاري وشركات': ['إنذار بسداد شيك أو كمبيالة أو سند إذني', 'دعوى مطالبة بقيمة ورقة تجارية', 'مذكرة دفاع في دعوى تجارية', 'طلب شهر إفلاس / صلح واقي', 'طلب أمر أداء', 'نموذج عقد تأسيس وتعديله', 'محضر جمعية عمومية', 'دعوى بطلان قرار جمعية عمومية'],
  'إداري': ['صحيفة دعوى إلغاء قرار إداري', 'طلب وقف تنفيذ قرار إداري', 'تظلم وظيفي', 'دعوى تعويض عن قرار إداري', 'طلب إعفاء من الرسوم', 'مذكرة بدفاع الجهة الإدارية', 'طعن أمام المحكمة الإدارية العليا', 'دعوى تسوية حالة وظيفية'],
  'حكومي وضرائب وتأمينات': ['تظلم من ربط ضريبي', 'طعن على قرار لجنة الطعن الضريبي', 'إنذار لهيئة التأمينات', 'دعوى استرداد ضريبة', 'طلب معاش', 'تظلم جمركي', 'اعتراض على تقدير ضريبة عقارية'],
  'عمالي وتأمينات': ['إنذار بالفصل التعسفي', 'دعوى تعويض عن فصل تعسفي', 'طلب مستحقات نهاية الخدمة', 'مذكرة دفاع صاحب العمل', 'دعوى إصابة عمل', 'طلب تسوية مستحقات عامل']
};
function audit(dir) {
  const { DATA, PARTS, T } = load(dir), by = {}, total = DATA.length;
  DATA.forEach(r => { const b = r[3], o = by[b] || (by[b] = { n: 0, t: {}, ids: [], enc: 0 }); o.n++; o.t[r[2]] = (o.t[r[2]] || 0) + 1; o.ids.push(r[0]); if (PARTS[r[0]]) o.enc++ });
  const ids = DATA.map(r => r[0]), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  const branches = Object.keys(by).map(b => { const o = by[b], share = o.n / total, ref = Object.keys(o.t).every(k => 'qxkbv'.includes(k)), thin = !ref && (o.n < 30 || share < 0.05), miss = thin ? CORE.filter(k => !o.t[k]) : []; return { name: b, ref, n: o.n, share: +(share * 100).toFixed(1), types: o.t, thin, missing: miss.map(k => T[k] || k), enc: o.enc } }).sort((a, b) => b.n - a.n);
  const library = branches.filter(b => !b.thin && !b.ref), thin = branches.filter(b => b.thin);
  return { total, dup: [...new Set(dup)], branches, thin: thin.map(b => b.name), max: library[0] && library[0].n, T };
}
function md(a) {
  const L = ['# موازنة المحتوى (L7)', '', `الإجمالي: **${a.total}** سجلاً. فرع «رقيق» = أقل من 30 صيغة أو أقل من 5% من المجموع. الأرقام تُولَّد بـ \`node tools/content-audit.js --write\`.`, '', '| الفرع | العدد | النسبة | الحالة | أنواع ناقصة (من الأساسية) |', '|---|---|---|---|---|'];
  a.branches.forEach(b => L.push(`| ${b.name} | ${b.n} | ${b.share}% | ${b.thin ? '⚠️ رقيق' : b.ref ? 'مراجع' : '✓'} | ${b.missing.join('، ') || '—'} |`));
  L.push('', '## توزيع الأنواع', '', '| الفرع | ' + Object.keys(a.T).filter(k => a.branches.some(b => b.types[k])).map(k => a.T[k]).join(' | ') + ' |', '|---|' + Object.keys(a.T).filter(k => a.branches.some(b => b.types[k])).map(() => '---').join('|') + '|');
  const ks = Object.keys(a.T).filter(k => a.branches.some(b => b.types[k]));
  a.branches.forEach(b => L.push(`| ${b.name} | ` + ks.map(k => b.types[k] || '·').join(' | ') + ' |'));
  L.push('', '## قائمة نواقص للتعبئة (عناوين مقترحة للبحث)', '', 'للتحقق من المصدر ومراجعتها قبل الإضافة؛ هذه عناوين للبحث لا نصوص قانونية. الإضافة بـ `node tools/add-rows.js ملف.csv`.', '');
  a.thin.forEach(n => { L.push(`### ${n}`); (IDEAS[n] || ['(لا اقتراحات مسجّلة)']).forEach(x => L.push('- [ ] ' + x)); L.push('') });
  if (a.dup.length) L.push('## معرّفات مكرّرة', '', a.dup.map(x => '- ' + x).join('\n'), '');
  return L.join('\n');
}
module.exports = { load, audit, md, CORE, IDEAS };
if (require.main === module) {
  const a = audit(), arg = process.argv[2];
  if (arg === '--json') console.log(JSON.stringify(a));
  else if (arg === '--write') { fs.writeFileSync(path.join(root, 'docs/CONTENT_BALANCE.md'), md(a) + '\n'); console.log('كُتب docs/CONTENT_BALANCE.md') }
  else { console.log('الإجمالي', a.total); a.branches.forEach(b => console.log((b.thin ? '⚠️ ' : b.ref ? '📚 ' : '✓  ') + b.name.padEnd(26), String(b.n).padStart(4), b.share + '%', b.missing.length ? 'ينقص: ' + b.missing.join('، ') : '')) }
}
