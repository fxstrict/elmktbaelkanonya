#!/usr/bin/env node
/* اختبار L8 (1.30.0): تقوية الترخيص بلا خادم — علامة الساعة العليا، نسخة التجربة الثانية، تنبيه قِدم التحقق. الاستعمال: node tools/l8-test.js (من جذر المشروع) */
const vm = require('vm'), fs = require('fs'), { webcrypto: wc } = require('crypto');
let mem = {}; const writes = []; const ls = { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { writes.push(k); mem[k] = String(v) }, removeItem: k => { delete mem[k] } };
const DAY = 864e5; let NOW = Date.UTC(2026, 5, 1, 12);
class FD extends Date { constructor(...a) { a.length ? super(...a) : super(NOW) } static now() { return NOW } }
let store = {}, cachesOn = true;
const caches = { open: async () => ({ put: async (k, r) => { store[k] = await r.text() }, match: async k => k in store ? new Response(store[k]) : undefined }) };
let revokedFile = { revoked: [] }, netUp = true;
const ctx = vm.createContext({ AbortController, setTimeout, clearTimeout, Object, Promise, localStorage: ls, crypto: wc, TextDecoder, TextEncoder, atob, btoa, Uint8Array, DataView, Date: FD, Math, JSON, Array, Number, String, console, Response,
  fetch: async () => { if (!netUp) throw new Error('offline'); return { ok: true, json: async () => revokedFile } } });
Object.defineProperty(ctx, 'caches', { get: () => cachesOn ? caches : undefined });
const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32 = u => { let bits = 0, v = 0, o = ''; for (const x of u) { v = (v << 8) | x; bits += 8; while (bits >= 5) { bits -= 5; o += A[(v >> bits) & 31]; v &= (1 << bits) - 1 } } if (bits) o += A[(v << (5 - bits)) & 31]; return o };
const b64u = u => Buffer.from(u).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
let fails = 0; const T = (n, c, x) => { console.log((c ? '✓ ' : '✗ ') + n + (!c && x !== undefined ? '  ' + JSON.stringify(x).slice(0, 200) : '')); if (!c) fails++ };
(async () => {
  const kp = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = b64u(new Uint8Array(await wc.subtle.exportKey('raw', kp.publicKey)));
  const mk = async (plan, exp, serial, label) => { const lb = new TextEncoder().encode(label), p = new Uint8Array(8 + lb.length), dv = new DataView(p.buffer); p[0] = 1; p[1] = plan; dv.setUint16(2, exp); dv.setUint32(4, serial); p.set(lb, 8); return 'LL1.' + b32(p) + '.' + b32(new Uint8Array(await wc.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, p))) };
  vm.runInContext("const _l=(k,x)=>{try{return JSON.parse(localStorage.getItem(k))||x}catch(e){return x}},_s=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};", ctx);
  run('js/config.js'); run('js/pro.js'); const ev = c => vm.runInContext(c, ctx);
  ev('PRO.pub=' + JSON.stringify(pub) + ';PRO.enabled=true;PRO.trialDays=14');
  const reset = () => { mem = {}; store = {}; writes.length = 0; netUp = true; revokedFile = { revoked: [] }; cachesOn = true; NOW = Date.UTC(2026, 5, 1, 12); ev('_proHw=0;_proLic=null;_proRevoked=null') };
  const today = () => ev('proToday()');

  // A) علامة الساعة العليا
  reset(); const t0 = today(); ctx.C1 = await mk(1, t0 + 10, 2001, 'عميل'); await ev('proActivate(C1)'); await ev('proInit()');
  T('A1 الحالة الأولى: pro بـ10 أيام ولا تنبيه ساعة', ev('proStatus().state') == 'pro' && ev('proStatus().daysLeft') == 10 && !ev('proStatus().clockBack'));
  NOW += 5 * DAY; ev('proStatus()'); T('A2 تقدّم 5 أيام ← متبقٍ 5', ev('proStatus().daysLeft') == 5);
  NOW -= 8 * DAY; T('A3 إرجاع الساعة 8 أيام: المتبقي يبقى 5 (لا يعود 13) ويُنبَّه إلى الساعة', ev('proStatus().daysLeft') == 5 && ev('proStatus().clockBack') === true, ev('proStatus()'));
  reset(); await ev('proActivate(C1)'); await ev('proInit()'); NOW += 12 * DAY; T('A4 انتهى الكود ← expired', ev('proStatus().state') == 'expired');
  NOW -= 20 * DAY; T('A5 إرجاع الساعة بعد الانتهاء: يبقى expired', ev('proStatus().state') == 'expired');
  reset(); await ev('proActivate(C1)'); await ev('proInit()'); NOW -= 12 * 36e5; T('A6 تأخير ساعات (فرق منطقة زمنية) لا ينبّه', !ev('proStatus().clockBack') && ev('proStatus().daysLeft') == 10);
  reset(); ev('proStatus()'); const w0 = writes.length; for (let i = 0; i < 50; i++) ev('proStatus()'); NOW += 10 * 60 * 1000; ev('proStatus()');
  T('A7 الكتابة محدودة: لا كتابة جديدة خلال الساعة', writes.length === w0, writes.length - w0);
  NOW += 2 * 36e5; ev('proStatus()'); T('A8 بعد ساعتين تُكتب lhw مرة', writes.length === w0 + 1 && JSON.parse(mem.lhw) === NOW);

  // B) التجربة
  reset(); await ev('proInit()'); ev('proStartTrial()'); T('B1 تجربة 14 يوماً', ev('proStatus().state') == 'trial' && ev('proStatus().daysLeft') == 14);
  NOW += 20 * DAY; T('B2 انتهت التجربة بعد 20 يوماً', ev('proStatus().state') == 'expired' && ev('proStatus().trialEnded') === true);
  NOW -= 19 * DAY; T('B3 إرجاع الساعة لا يُحيي التجربة', ev('proStatus().state') == 'expired');
  reset(); await ev('proInit()'); ev('proStartTrial()'); await ev('proMirror()'); NOW += 3 * DAY; ev('proStatus()'); await ev('proMirror()');
  const t0v = JSON.parse(mem.trial0), hwv = JSON.parse(mem.lhw); mem = {}; // مسح localStorage وحده
  await ev('proInit()'); T('B4 مسح localStorage: التجربة وlhw تعودان من الكاش (لا تجربة جديدة)', JSON.parse(mem.trial0) === t0v && JSON.parse(mem.lhw) >= hwv && ev('proStatus().daysLeft') == 11, { t: mem.trial0, d: ev('proStatus().daysLeft') });
  reset(); await ev('proInit()'); ev('proStartTrial()'); await ev('proMirror()'); const o0 = JSON.parse(mem.trial0); mem = {}; NOW -= 30 * DAY;
  await ev('proInit()'); ev('proStartTrial()'); T('B5 مسح + إرجاع الساعة شهراً: تعود التجربة الأصلية ولا تبدأ تجربة جديدة', JSON.parse(mem.trial0) === o0 && ev('proStatus().daysLeft') <= 14, { t: mem.trial0, o0 });
  reset(); await ev('proInit()'); store['pro-st.json'] = JSON.stringify({ t0: NOW + 5 * DAY, hw: 0 }); ev('proStartTrial()'); await ev('proInit()');
  T('B6 الكاش لا يمدّ تجربة محلية أقدم (تُؤخذ الأقدم)', JSON.parse(mem.trial0) === NOW);
  reset(); store['pro-st.json'] = '{bad'; await ev('proInit()'); T('B7 كاش تالف يُتجاهل بلا أخطاء', ev('proStatus().state') == 'off');
  reset(); cachesOn = false; await ev('proInit()'); ev('proStartTrial()'); await ev('proMirror()'); await ev('proStRestore()'); T('B8 بلا Cache API: يعمل كما كان', ev('proStatus().state') == 'trial');

  // C) قِدم التحقق من الإبطال
  reset(); ctx.C2 = await mk(1, today() + 400, 2002, 'سنوي'); await ev('proActivate(C2)'); await ev('proInit()');
  T('C1 بعد تحميل ناجح لقائمة الإبطال: rvt مضبوط وليس قديماً', JSON.parse(mem.rvt) === NOW && !ev('proStatus().stale'));
  netUp = false; NOW += 44 * DAY; T('C2 44 يوماً بلا اتصال: ليس قديماً بعد', !ev('proStatus().stale'));
  NOW += 2 * DAY; T('C3 46 يوماً: تنبيه قِدم مع بقاء pro (لا تخفيض)', ev('proStatus().stale') === true && ev('proStatus().state') == 'pro');
  netUp = true; await ev('proLoadRevoked()'); T('C4 عودة الاتصال تصفّر التنبيه', !ev('proStatus().stale'));
  ev('PRO.graceDays=10'); netUp = false; NOW += 11 * DAY; T('C5 PRO.graceDays قابل للضبط', ev('proStatus().stale') === true); ev('delete PRO.graceDays');
  reset(); await ev('proInit()'); T('C6 بلا كود لا rvt ولا تنبيه', !('rvt' in mem) && !ev('proStatus().stale'));
  reset(); mem.lic = JSON.stringify(await mk(1, today() + 100, 2003, 'قديم')); netUp = false; await ev('proInit()'); T('C7 كود مفعّل قبل L8 بلا rvt: تبدأ مهلة القِدم من أول فتح', JSON.parse(mem.rvt) === NOW && !ev('proStatus().stale'));
  reset(); revokedFile = { revoked: [2002] }; await ev('proActivate(C2)').catch(() => 0); T('C8 الإبطال يعمل كما كان (كود مُبطَل لا يُفعَّل)', ev('proStatus().state') != 'pro');

  // D) سلامة
  reset(); ev('PRO.enabled=false'); T('D1 PRO.enabled=false: off دائماً بلا كتابة', ev('proStatus().state') == 'off' && writes.length === 0); ev('PRO.enabled=true');
  const bk = fs.readFileSync('js/backup.js', 'utf8'); T('D2 lhw وrvt خارج النسخ الاحتياطي (لا تُستعاد فتُعاد الساعة)', !/BKEYS=\[[^\]]*'(lhw|rvt)'/.test(bk));
  T('D3 sw.js لا يمسح كاش pro-st عند رفع الإصدار', /x!=='pro-st'/.test(fs.readFileSync('sw.js', 'utf8')));
  const names = [...fs.readFileSync('js/pro.js', 'utf8').matchAll(/^(?:async )?function (\w+)/gm)].map(m => m[1]), clash = [];
  fs.readdirSync('js').filter(f => f.endsWith('.js') && f !== 'pro.js').forEach(f => { const s = fs.readFileSync('js/' + f, 'utf8'); names.forEach(n => { if (new RegExp('^(?:async )?function ' + n + '\\b', 'm').test(s)) clash.push(f + ':' + n) }) });
  T('D4 لا تعارض أسماء دوال pro.js مع أي ملف آخر (وقع تعارض proRestore أثناء التطوير)', clash.length === 0, clash);
  console.log(fails ? `\n${fails} فشل` : '\nكل الفحوص نجحت'); process.exit(fails ? 1 : 0);
})();
