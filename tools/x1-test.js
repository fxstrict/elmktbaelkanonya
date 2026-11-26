#!/usr/bin/env node
/* اختبار نواة الدفعة الأولى من المؤجَّل (1.27.0): تشفير المستندات الممسوحة (DV)، تشفير النسخ الاحتياطية (BX)، وملفات المشروع.
   الاستعمال: node tools/x1-test.js — النواتان نقيتان (js/docvault.js وjs/bkcrypt.js) فلا تحتاجان متصفحاً. */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
let DV, BX;
try { DV = require(path.join(root, 'js', 'docvault.js')); BX = require(path.join(root, 'js', 'bkcrypt.js')); } catch (e) { console.log('✗ تعذّر تحميل النواتين: ' + e.message); process.exit(1); }
let bad = 0; const T = (n, c, x) => { if (!c) bad++; console.log((c ? '✓ ' : '✗ ') + n + (x !== undefined && !c ? '  ' + JSON.stringify(x) : '')); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const subtle = globalThis.crypto.subtle, mkKey = () => subtle.importKey('raw', globalThis.crypto.getRandomValues(new Uint8Array(32)), 'AES-GCM', false, ['encrypt', 'decrypt']);
const rejects = async f => { try { await f(); return false } catch (e) { return true } };
(async () => {
  // ---- A) التسلسل
  const blob = new Blob([new Uint8Array([1, 2, 3, 250, 0, 7])], { type: 'image/jpeg' });
  const rec = { id: 'd1', name: 'مذكرة سرية', n: 5, ok: true, nul: null, undef: undefined, tags: ['أ', 'ب'], when: new Date('2026-11-25T10:00:00Z'), png: blob, ab: new Uint8Array([9, 8, 7]).buffer, u16: new Uint16Array([1, 500]), deep: { a: [{ b: blob }] } };
  const back = DV.deser(await DV.ser(rec));
  T('A1 ser/deser: القيم العادية والعربية والمصفوفات', back.id === 'd1' && back.name === 'مذكرة سرية' && back.n === 5 && back.ok === true && back.nul === null && eq(back.tags, ['أ', 'ب']), back);
  T('A2 undefined لا يصير null (يُحذف المفتاح)', !('undef' in back));
  T('A3 Blob يعود Blob بنوعه وبايتاته', back.png instanceof Blob && back.png.type === 'image/jpeg' && eq(Array.from(new Uint8Array(await back.png.arrayBuffer())), [1, 2, 3, 250, 0, 7]));
  T('A4 ArrayBuffer والمصفوفة المكتوبة والتاريخ', back.ab instanceof ArrayBuffer && eq(Array.from(new Uint8Array(back.ab)), [9, 8, 7]) && back.u16 instanceof Uint16Array && eq(Array.from(back.u16), [1, 500]) && back.when instanceof Date && back.when.toISOString() === '2026-11-25T10:00:00.000Z');
  T('A5 Blob متداخل في مصفوفة داخل كائن', back.deep.a[0].b instanceof Blob && back.deep.a[0].b.size === 6);
  const rb = DV.deser(await DV.ser(blob)); T('A6 Blob جذري (مخزن blobs)', rb instanceof Blob && rb.size === 6 && rb.type === 'image/jpeg');
  T('A7 سلسلة كبيرة 3 ميغابايت تعود بدقة', (await (async () => { const big = new Uint8Array(3e6).map((_, i) => i % 251), r = DV.deser(await DV.ser(new Blob([big]))); const u = new Uint8Array(await r.arrayBuffer()); return u.length === 3e6 && u[2999999] === 2999999 % 251 && u[12345] === 12345 % 251 })()));
  // ---- B) التشفير
  const K = await mkKey(), e1 = await DV.encRec(K, 'docs', 'd1', rec), e2 = await DV.encRec(K, 'docs', 'd1', rec);
  T('B1 سجل مشفّر: __x وd بايتات وid محفوظ للمخازن ذات keyPath ولا حقول صريحة', e1.__x === 1 && e1.d instanceof Uint8Array && e1.id === 'd1' && !('name' in e1) && !('png' in e1), Object.keys(e1));
  const raw = Buffer.from(e1.d).toString('latin1'); T('B2 النص العربي والاسم لا يظهران في البايتات المشفّرة', !raw.includes(Buffer.from('مذكرة').toString('latin1')) && !raw.includes('name'));
  T('B3 تشفيران لنفس القيمة يختلفان (iv عشوائي)', Buffer.compare(Buffer.from(e1.d), Buffer.from(e2.d)) !== 0);
  const d1 = await DV.decRec(K, 'docs', 'd1', e1); T('B4 فك السجل يعيد القيم والـ Blob', d1.name === 'مذكرة سرية' && d1.png instanceof Blob && d1.png.size === 6);
  const eb = await DV.encRec(K, 'blobs', 'd1/p1', blob); T('B5 مخزن blobs: لا id، والفك يعيد Blob', !('id' in eb) && eb.__x === 1 && (await DV.decRec(K, 'blobs', 'd1/p1', eb)) instanceof Blob);
  T('B6 سجل غير مشفّر يمرّ كما هو', (await DV.decRec(K, 'docs', 'd1', { id: 'x', name: 'عادي' })).name === 'عادي' && (await DV.decRec(K, 'docs', 'd1', null)) === null);
  T('B7 ربط بالمفتاح والمخزن: نقل السجل لمفتاح أو مخزن آخر يفشل', await rejects(() => DV.decRec(K, 'docs', 'd2', e1)) && await rejects(() => DV.decRec(K, 'assets', 'd1', e1)));
  T('B8 مفتاح آخر يفشل', await rejects(async () => DV.decRec(await mkKey(), 'docs', 'd1', e1)));
  const t1 = { __x: 1, d: e1.d.slice() }; t1.d[40] ^= 1; t1.id = 'd1'; T('B9 العبث ببايت واحد يُكشف (وسم GCM)', await rejects(() => DV.decRec(K, 'docs', 'd1', t1)));
  T('B10 صيغة تالفة: قصير أو إصدار خاطئ', await rejects(() => DV.decRec(K, 'docs', 'd1', { __x: 1, d: new Uint8Array(10) })) && await rejects(() => DV.decRec(K, 'docs', 'd1', { __x: 1, d: (() => { const u = e1.d.slice(); u[0] = 9; return u })() })));
  const dk = DV.newDek(); T('B11 newDek: 32 بايت base64 وفريد', DV.s2b(dk).length === 32 && DV.newDek() !== dk);
  T('B12 importKey من DEK يعمل للتشفير والفك', (await DV.decRec(await DV.importKey(dk), 'assets', 'a', await DV.encRec(await DV.importKey(dk), 'assets', 'a', { id: 'a', v: 1 }))).v === 1);
  // ---- C) نسخ احتياطية مشفّرة
  const plain = new TextEncoder().encode(JSON.stringify({ app: 'legal-library', data: { lists: '[{"name":"قضية سرية"}]' } })), IT = 2000;
  const c1 = await BX.enc(plain, 'جملة طويلة صعبة 77', IT);
  T('C1 الحاوية تبدأ بـ LLBX1 وisEnc صحيحة وأكبر من النص', BX.isEnc(c1) && Buffer.from(c1.subarray(0, 5)).toString() === 'LLBX1' && c1.length > plain.length + 37 && !BX.isEnc(plain) && !BX.isEnc(new Uint8Array(2)) && !BX.isEnc(null));
  T('C2 النص الصريح لا يظهر في الحاوية', !Buffer.from(c1).toString('latin1').includes('legal-library'));
  T('C3 فك بالكلمة الصحيحة يعيد النص نفسه', Buffer.compare(Buffer.from(await BX.dec(c1, 'جملة طويلة صعبة 77')), Buffer.from(plain)) === 0);
  let er = ''; try { await BX.dec(c1, 'خطأ خطأ خطأ 1') } catch (e) { er = e.message } T('C4 كلمة خاطئة ← bad', er === 'bad', er);
  const t2 = c1.slice(); t2[t2.length - 3] ^= 4; er = ''; try { await BX.dec(t2, 'جملة طويلة صعبة 77') } catch (e) { er = e.message } T('C5 العبث بالنص المشفّر ← bad', er === 'bad', er);
  const t3 = c1.slice(); t3[12] ^= 1; er = ''; try { await BX.dec(t3, 'جملة طويلة صعبة 77') } catch (e) { er = e.message } T('C6 العبث بالملح (الرأس) ← bad', er === 'bad', er);
  const t4 = c1.slice(); new DataView(t4.buffer).setUint32(5, 3); er = ''; try { await BX.dec(t4, 'x') } catch (e) { er = e.message } T('C7 عدد تكرارات خارج المدى (خفض متعمّد) ← format', er === 'format', er);
  er = ''; try { await BX.dec(new Uint8Array([1, 2, 3]), 'x') } catch (e) { er = e.message } T('C8 ملف ليس حاوية ← format', er === 'format', er);
  const c2 = await BX.enc(plain, 'جملة طويلة صعبة 77', IT); T('C9 تشفيران لنفس النص بنفس الكلمة يختلفان (ملح وiv عشوائيان)', Buffer.compare(Buffer.from(c1), Buffer.from(c2)) !== 0);
  T('C10 التكرارات الافتراضية 600000 وتُكتب في الرأس', BX.ITER === 600000 && new DataView(c1.buffer, c1.byteOffset).getUint32(5) === IT);
  T('C11 كلمة بحروف عربية وتطبيع NFKC تفك بصورة متسقة', Buffer.compare(Buffer.from(await BX.dec(await BX.enc(plain, 'ﬁ كلمة سر عربية', IT), 'fi كلمة سر عربية')), Buffer.from(plain)) === 0);
  T('C12 weak: قصيرة/مكررة/أرقام/شائعة تُرفض والجيدة تُقبل', !!BX.weak('abc') && !!BX.weak('aaaaaaaa') && !!BX.weak('12345678') && !!BX.weak('password') && !!BX.weak('') && BX.weak('جملة طويلة صعبة 77') === '');
  const bigp = new Uint8Array(2e6).map((_, i) => i % 255); T('C13 ملف 2 ميغابايت (يشبه نسخة كاملة) يعود بدقة', Buffer.compare(Buffer.from(await BX.dec(await BX.enc(bigp, 'جملة طويلة صعبة 77', IT), 'جملة طويلة صعبة 77')), Buffer.from(bigp)) === 0);
  // ---- D) ملفات المشروع
  const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), pos = f => idx.indexOf('js/' + f + '?v=');
  T('D1 docvault.js قبل hdb.js وbkcrypt.js وdvui.js بعد vault-ui.js', pos('docvault.js') > 0 && pos('docvault.js') < pos('hdb.js') && pos('bkcrypt.js') > pos('vault-ui.js') && pos('dvui.js') > pos('vault-ui.js') && pos('bkcrypt.js') > pos('harden.js'), [pos('docvault.js'), pos('hdb.js'), pos('bkcrypt.js'), pos('vault-ui.js'), pos('dvui.js')]);
  T('D2 الملفات الثلاثة في قائمة sw.js', ['docvault', 'bkcrypt', 'dvui'].every(f => sw.includes('"js/' + f + '.js"')));
  const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
  T('D3 «dek» ضمن VK الخزنة (فيُشفَّر ويُعاد لفّه عند تغيير الكلمة)', /const VK=\[[^\]]*'dek'[^\]]*\]/.test(rd('js/vault.js')));
  const hd = rd('js/hdb.js'); T('D4 hdb.js: get/all/put تمرّ على DVX وكتابة الحفظ التلقائي وPDF مشفّرة', /DVX\.dec\(s,k/.test(hd) && /DVX\.decAll\(s/.test(hd) && /DVX\.enc\(s,/.test(hd) && /DVX\.enc\('docs',id,rec\)/.test(hd) && (hd.match(/DVX\.enc\('blobs'/g) || []).length >= 2);
  const hr = rd('js/harden.js'); T('D5 harden.js: التصدير يفك (strict) والاستيراد يشفّر', (hr.match(/DVX\.decAll\(/g) || []).length === 2 && /DVX\.dec\('blobs',key,cur\.value,true\)/.test(hr) && /DVX\.enc\(s,o\.id,o\)/.test(hr) && /DVX\.enc\('blobs',b\.k,b\.v\)/.test(hr));
  const f2 = rd('js/fees2.js'); T('D6 كشف الحساب يطابق الموكل بالتطبيع (feeSameClient) لا بالمساواة الحرفية', /feeSameClient = /.test(f2) && !/y\.client == c\.client/.test(f2) && (f2.match(/feeSameClient\(/g) || []).length >= 2);
  T('D7 زر ICS في الأجندة (casemgmt.js)', /ntfics[^]*?agendaSheet|agendaSheet[^]*?ntfics/.test(rd('js/casemgmt.js')));
  const yml = rd('.github/workflows/test.yml'); T('D8 workflow يثبّت اعتماديات الاختبارات الجديدة (python-docx وopenpyxl وopencv) ويشغّل run-all', /python-docx/.test(yml) && /openpyxl/.test(yml) && /opencv/.test(yml) && /run-all\.py/.test(yml));
  const v = rd('version.json').match(/"version":"([\d.]+)"/)[1], cfg = rd('js/config.js').match(/version:'([\d.]+)'/)[1], swv = sw.match(/siyagh-v([\d.]+)/)[1], ge = (a, b) => a.split('.').map(Number).reduce((r, x, i) => r || (x - Number(b.split('.')[i])), 0) >= 0;
  T('D9 اتساق الإصدار وهو ≥ 1.27.0', v === cfg && cfg === swv && ge(v, '1.27.0'), [v, cfg, swv]);
  console.log(bad ? `\n✗ ${bad} فشل` : '\n✓ كل الفحوص نجحت'); process.exit(bad ? 1 : 0);
})();
