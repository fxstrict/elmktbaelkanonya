#!/usr/bin/env node
/* استيراد صيغ جديدة بتحقق (L7):  node tools/add-rows.js ملف.csv [--dry] [--root مجلد]
   الأعمدة (بالترتيب): معرّف ملف درايف، العنوان، رمز النوع (d,n,r,f,g,a,c,m,w,e,t,k,x)، اسم الفرع. السطر الأول عنوان اختياري.
   يرفض: معرّفاً بصيغة غير صالحة، نوعاً غير معروف، فرعاً غير موجود، معرّفاً موجوداً أو محذوفاً بقائمة الإزالة، عنواناً مطابقاً في الفرع نفسه، أو مكرراً داخل الملف.
   يضيف الصفوف في آخر استدعاء addBranch لذلك الفرع داخل ملف data/ الخاص به ويحدّث عدد الصيغ في أول الملف. لا يمسّ غيره. */
const fs = require('fs'), path = require('path');
const A = require('./content-audit.js');
const norm = s => String(s).replace(/[ً-ْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
function csv(t) { const rows = []; let r = [], c = '', q = false; t = t.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++ } else q = false } else c += ch }
    else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = '' } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(c); c = ''; if (r.some(x => x.trim())) rows.push(r); r = [] } else c += ch }
  r.push(c); if (r.some(x => x.trim())) rows.push(r); return rows }
function run(text, root, dry) {
  root = root || path.join(__dirname, '..');
  const { DATA, T } = A.load(root); let td = []; try { td = JSON.parse(fs.readFileSync(path.join(root, 'data/takedown.json'), 'utf8')).ids || [] } catch (e) {}
  const ids = new Set(DATA.map(r => r[0]).concat(td)), titles = new Set(DATA.map(r => r[3] + '|' + norm(r[1])));
  const branchFile = {}; fs.readdirSync(path.join(root, 'data')).filter(f => /^(0\d|1[0-2])-.*\.js$/.test(f)).forEach(f => { const s = fs.readFileSync(path.join(root, 'data', f), 'utf8'); const m = /^addBranch\("([^"]+)"/m.exec(s); if (m) branchFile[m[1]] = f });
  const out = { added: 0, rejected: [], byFile: {} };
  let rows = csv(text); if (rows.length && !/^[A-Za-z0-9_-]{20,}$/.test(rows[0][0].trim())) rows = rows.slice(1);
  const ok = [];
  rows.forEach((r, i) => { const [id, title, type, branch] = r.map(x => (x || '').trim()), bad = m => out.rejected.push({ line: i + 1, why: m, id });
    if (!/^[A-Za-z0-9_-]{20,60}$/.test(id)) return bad('معرّف غير صالح');
    if (!title) return bad('عنوان فارغ'); if (!T[type]) return bad('نوع غير معروف: ' + type);
    if (!branchFile[branch]) return bad('فرع غير موجود: ' + branch);
    if (ids.has(id)) return bad('المعرّف موجود أو في قائمة الإزالة');
    const tk = branch + '|' + norm(title); if (titles.has(tk)) return bad('عنوان مطابق في الفرع');
    ids.add(id); titles.add(tk); ok.push({ id, title, type, branch }) });
  const g = {}; ok.forEach(x => (g[branchFile[x.branch]] = g[branchFile[x.branch]] || []).push(x));
  Object.keys(g).forEach(f => { const p = path.join(root, 'data', f); let s = fs.readFileSync(p, 'utf8');
    const m = /^addBranch\("([^"]+)",\[\n([\s\S]*?)\n\]\);/m.exec(s); if (!m) { g[f].forEach(x => out.rejected.push({ id: x.id, why: 'تعذّر تحديد موضع الإضافة في ' + f })); return }
    const add = g[f].map(x => '[' + [x.id, x.title, x.type].map(v => JSON.stringify(v)).join(',') + ']').join(',\n');
    s = s.slice(0, m.index) + `addBranch("${m[1]}",[\n${m[2]},\n${add}\n]);` + s.slice(m.index + m[0].length);
    const n = (s.match(/^\["/gm) || []).length; s = s.replace(/(فرع: [^\n—]*— )\d+( صيغة)/, `$1${n}$2`);
    out.byFile[f] = g[f].length; out.added += g[f].length; if (!dry) fs.writeFileSync(p, s) });
  return out;
}
module.exports = { run, csv, norm };
if (require.main === module) {
  const a = process.argv.slice(2), ri = a.indexOf('--root'), f = a.find((x, i) => !x.startsWith('--') && i !== ri + 1 || ri < 0 && !x.startsWith('--')), dry = a.includes('--dry'), root = a.includes('--root') ? a[a.indexOf('--root') + 1] : undefined;
  if (!f) { console.log('الاستعمال: node tools/add-rows.js ملف.csv [--dry]'); process.exit(1) }
  const r = run(fs.readFileSync(f, 'utf8'), root, dry);
  console.log((dry ? '[تجربة] ' : '') + 'أُضيف ' + r.added + (r.added ? ' ← ' + JSON.stringify(r.byFile) : '') + ' ، مرفوض ' + r.rejected.length); r.rejected.forEach(x => console.log('  سطر ' + (x.line || '-') + ': ' + x.why + ' (' + x.id + ')'));
  process.exit(r.rejected.length ? 2 : 0);
}
