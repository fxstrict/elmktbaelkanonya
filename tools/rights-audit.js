#!/usr/bin/env node
/* تدقيق حقوق النشر (L7):  node tools/rights-audit.js
   1) يتحقق من data/takedown.json (صيغة صالحة، بلا تكرار)، ويعرض ما يطابق منه سجلات حالية (يُخفى) وما لا يطابق (قديم).
   2) يسرد المصنّفات المنسوبة لمؤلفين (كتب 'b' وموسوعات) لقرار المالك: إبقاء أو إضافتها إلى القائمة. لا يحذف شيئاً. */
const fs = require('fs'), path = require('path'), A = require('./content-audit.js'), RT = require('../js/rights.js'), root = path.join(__dirname, '..');
function audit(dir) {
  dir = dir || root; const { DATA, PARTS } = A.load(dir); let raw = { ids: [] }, err = '';
  try { raw = JSON.parse(fs.readFileSync(path.join(dir, 'data/takedown.json'), 'utf8')) } catch (e) { err = e.message }
  const ids = RT.clean(raw), rawN = Array.isArray(raw.ids) ? raw.ids.length : 0, byId = Object.fromEntries(DATA.map(r => [r[0], r]));
  const hit = ids.filter(i => byId[i]), stale = ids.filter(i => !byId[i]);
  const authored = DATA.filter(r => RT.authored(r[2]) && !ids.includes(r[0])).map(r => ({ id: r[0], title: r[1], branch: r[3], enc: !!PARTS[r[0]] }));
  return { err, listed: ids.length, invalid: rawN - ids.length, hit, stale, authored };
}
module.exports = { audit };
if (require.main === module) {
  const a = audit(); console.log('قائمة الإزالة:', a.listed, '| غير صالح/مكرر:', a.invalid, '| مطابق لسجل حالي:', a.hit.length, '| بلا سجل:', a.stale.length, a.err ? '| خطأ: ' + a.err : '');
  console.log('مصنّفات منسوبة لمؤلفين (قرار المالك):', a.authored.length); a.authored.forEach(x => console.log('  -', x.branch, '|', x.title, '|', x.id));
  process.exit(a.err || a.invalid ? 1 : 0);
}
