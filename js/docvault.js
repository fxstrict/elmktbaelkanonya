/* تشفير مكتبة المستندات الممسوحة (hscan-db) — إكمال L4 (1.27.0). يُحمَّل قبل hdb.js ويُعرِّف DVX الذي يستعمله hdb.js وharden.js.
   التصميم: مفتاح بيانات عشوائي DEK (AES-GCM 256) يُحفظ داخل الخزنة بالمفتاح 'dek' (ضمن VAULT.VK فيُشفَّر بكلمة المرور ويُعاد لفّه تلقائياً عند تغييرها)،
   فلا تُعاد تشفير المستندات عند تغيير كلمة المرور. كل سجل يُحفظ {id?, __x:1, d: بايت(إصدار1 + iv12 + نص مشفّر)} والبيانات الإضافية AAD = «المخزن/المفتاح» فلا يُنقل سجل لمكان آخر.
   السجلات القديمة غير المشفّرة تُقرأ كما هي وتُشفَّر بالترحيل (سجل بسجل مع تحقق من فكها قبل الاستبدال). مفعَّل فقط حين يكون الإعداد الصريح dvon='1' (غير حساس) والخزنة مفتوحة.
   النواة النقية (DV) تعمل في Node (tools/x1-test.js): ser/deser يحفظان Blob والمصفوفات المكتوبة والتواريخ. */
const DV = (() => {
  const TE = new TextEncoder(), TD = new TextDecoder(), VER = 1;
  const sub = () => (globalThis.crypto && globalThis.crypto.subtle) || null;
  const b2s = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s) };
  const s2b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const TA = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray };
  /* تسلسل ثنائي: [طول الرأس 4 بايت][رأس JSON][كتل البايتات]. Blob وArrayBuffer والمصفوفات المكتوبة والتواريخ تُحفظ بدقة */
  async function ser(v) {
    const chunks = [];
    const walk = async x => {
      if (typeof Blob !== 'undefined' && x instanceof Blob) { chunks.push(new Uint8Array(await x.arrayBuffer())); return { $b: chunks.length - 1, t: x.type }; }
      if (x instanceof ArrayBuffer) { chunks.push(new Uint8Array(x.slice(0))); return { $a: chunks.length - 1 }; }
      if (ArrayBuffer.isView(x)) { chunks.push(new Uint8Array(x.buffer.slice(x.byteOffset, x.byteOffset + x.byteLength))); return { $v: chunks.length - 1, c: x.constructor.name }; }
      if (x instanceof Date) return { $d: x.toISOString() };
      if (Array.isArray(x)) { const o = []; for (const y of x) o.push(await walk(y)); return o; }
      if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) { if (x[k] === undefined) continue; o[k] = await walk(x[k]); } return o; }
      return x === undefined ? null : x;
    };
    const root = await walk(v), head = TE.encode(JSON.stringify({ r: root, c: chunks.map(c => c.length) }));
    const out = new Uint8Array(4 + head.length + chunks.reduce((a, c) => a + c.length, 0)); new DataView(out.buffer).setUint32(0, head.length);
    out.set(head, 4); let p = 4 + head.length; chunks.forEach(c => { out.set(c, p); p += c.length; }); return out;
  }
  function deser(u8) {
    const hl = new DataView(u8.buffer, u8.byteOffset, u8.byteLength).getUint32(0), h = JSON.parse(TD.decode(u8.subarray(4, 4 + hl))), F = []; let p = 4 + hl;
    h.c.forEach(n => { F.push(u8.slice(p, p + n)); p += n; });
    const de = x => {
      if (Array.isArray(x)) return x.map(de);
      if (x && typeof x === 'object') {
        if ('$b' in x) return new Blob([F[x.$b]], { type: x.t || '' });
        if ('$a' in x) return F[x.$a].buffer.slice(0);
        if ('$v' in x) { const C = TA[x.c] || Uint8Array; return new C(F[x.$v].buffer.slice(0)); }
        if ('$d' in x) return new Date(x.$d);
        const o = {}; for (const k of Object.keys(x)) o[k] = de(x[k]); return o;
      }
      return x;
    };
    return de(h.r);
  }
  const rnd = n => globalThis.crypto.getRandomValues(new Uint8Array(n));
  const newDek = () => b2s(rnd(32));
  const importKey = b64 => sub().importKey('raw', s2b(b64), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const aad = (store, key) => TE.encode(store + '/' + key);
  /* تشفير قيمة: يعيد سجلاً مشفّراً جاهزاً للحفظ (للمخازن ذات keyPath نُبقي id) */
  async function encRec(key, store, k, value) {
    const plain = await ser(value), iv = rnd(12), ct = new Uint8Array(await sub().encrypt({ name: 'AES-GCM', iv, additionalData: aad(store, k) }, key, plain)), d = new Uint8Array(1 + 12 + ct.length);
    d[0] = VER; d.set(iv, 1); d.set(ct, 13); const rec = { __x: 1, d }; if (store !== 'blobs') rec.id = value && value.id !== undefined ? value.id : k; return rec;
  }
  async function decRec(key, store, k, rec) {
    if (!rec || !rec.__x) return rec; const d = rec.d; if (!(d instanceof Uint8Array) || d.length < 30 || d[0] !== VER) throw new Error('fmt');
    return deser(new Uint8Array(await sub().decrypt({ name: 'AES-GCM', iv: d.subarray(1, 13), additionalData: aad(store, k) }, key, d.subarray(13))));
  }
  return { ser, deser, encRec, decRec, newDek, importKey, b2s, s2b, supported: () => !!sub() };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DV;

/* ---------- جزء المتصفح: DVX ---------- */
const DVX = (typeof window === 'undefined') ? null : (() => {
  const ls = k => { try { return localStorage.getItem(k) } catch (e) { return null } };
  let kc = { b: '', k: null };
  const unlocked = () => !!(window.VAULT && VAULT.on && VAULT.unlocked);
  const on = () => ls('dvon') === '1';
  /* المفتاح متاح فقط والخزنة مفتوحة؛ غير ذلك null */
  async function key() { const b = ls('dek'); if (!b || !unlocked()) return null; if (kc.b !== b) kc = { b, k: await DV.importKey(b) }; return kc.k }
  const kOf = (s, k, v) => s === 'blobs' ? k : (v && v.id !== undefined ? v.id : k);
  const X = {
    on, unlocked,
    /* كتابة: غير مفعّل ← كما هي. مفعّل ولا مفتاح ← خطأ (لا تُكتب بيانات صريحة بصمت) */
    async enc(store, k, v) { if (!on()) return v; const key = await key_(); if (!key) throw new Error('locked'); return DV.encRec(key, store, kOf(store, k, v), v) },
    /* قراءة: غير مشفّر ← كما هو. مشفّر والمفتاح غير متاح ← السجل نفسه (التطبيق مقفول) إلا مع strict فخطأ */
    async dec(store, k, rec, strict) { if (!rec || !rec.__x) return rec; const key = await key_(); if (!key) { if (strict) throw new Error('locked'); return rec } return DV.decRec(key, store, kOf(store, k, rec), rec) },
    async decAll(store, L, strict) { return Promise.all((L || []).map(r => X.dec(store, r && r.id, r, strict))) },
    stats: () => stats()
  };
  const key_ = key;
  const open = () => new Promise((res, rej) => { try { const r = indexedDB.open('hscan-db', 1); r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', { keyPath: 'id' }); if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs'); if (!d.objectStoreNames.contains('assets')) d.createObjectStore('assets', { keyPath: 'id' }) }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked')) } catch (e) { rej(e) } });
  const rq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  const tdone = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = t.onabort = () => rej(t.error || new Error('abort')) });
  /* عدّ السجلات المشفّرة وغير المشفّرة */
  async function stats() { const db = await open(), o = { enc: 0, plain: 0 }; try { for (const s of ['docs', 'blobs', 'assets']) { const rows = await rq(db.transaction(s).objectStore(s).getAll()); rows.forEach(r => { r && r.__x ? o.enc++ : o.plain++ }) } } finally { db.close() } return o }
  /* ترحيل: يمرّ على كل المخازن؛ mode 'enc' يشفّر غير المشفّر، 'dec' يفك المشفّر. سجل بسجل مع تحقق قبل الاستبدال. يعيد {done,failed} */
  async function pass(mode, prog) {
    const key = await key_(); if (!key) throw new Error('locked'); const db = await open(), r = { done: 0, failed: 0 };
    try {
      for (const s of ['docs', 'assets', 'blobs']) {
        const keys = await rq(db.transaction(s).objectStore(s).getAllKeys());
        for (const k of keys) {
          try {
            const rec = await rq(db.transaction(s).objectStore(s).get(k)); if (rec === undefined) continue; const isEnc = !!(rec && rec.__x);
            if (mode === 'enc' ? isEnc : !isEnc) continue;
            let out;
            if (mode === 'enc') { out = await DV.encRec(key, s, kOf(s, k, rec), rec); const back = await DV.decRec(key, s, kOf(s, k, rec), out); if (!back) throw new Error('verify'); }
            else out = await DV.decRec(key, s, kOf(s, k, rec), rec);
            const t = db.transaction(s, 'readwrite'); s === 'blobs' ? t.objectStore(s).put(out, k) : t.objectStore(s).put(out); await tdone(t); r.done++;
          } catch (e) { r.failed++ }
          if (prog) prog(r);
        }
      }
    } finally { db.close() }
    return r;
  }
  /* تفعيل: يتطلب خزنة مفتوحة. يولّد DEK ثم يرحّل. عند فشل ترحيل بعض السجلات يبقى التفعيل ويُبلَّغ بالعدد (تبقى صريحة وتُعاد المحاولة) */
  X.enable = async prog => {
    if (!unlocked()) return { err: 'فعّل الخزنة وافتحها أولاً' }; if (!DV.supported()) return { err: 'المتصفح لا يدعم التشفير' };
    if (!ls('dek')) localStorage.setItem('dek', DV.newDek()); localStorage.setItem('dvon', '1');
    try { const r = await pass('enc', prog); return { ok: true, ...r } } catch (e) { return { err: 'تعذّر الترحيل: ' + (e && e.message || e) } }
  };
  /* إلغاء: يفك كل السجلات أولاً، ولا يحذف المفتاح إلا إن نجح الكل */
  X.disable = async prog => {
    if (!unlocked()) return { err: 'افتح الخزنة أولاً' };
    try { const r = await pass('dec', prog); if (r.failed) return { err: 'تعذّر فك ' + r.failed + ' سجل — لم يُلغَ التشفير', ...r }; localStorage.removeItem('dvon'); localStorage.removeItem('dek'); return { ok: true, ...r } }
    catch (e) { return { err: 'تعذّر الإلغاء: ' + (e && e.message || e) } }
  };
  X.migrate = prog => on() ? pass('enc', prog) : Promise.resolve({ done: 0, failed: 0 });
  return X;
})();
if (typeof window !== 'undefined') window.DVX = DVX;
