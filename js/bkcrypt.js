/* نسخ احتياطية مشفّرة (إكمال L4، 1.27.0): نسخة JSON ونسخة كاملة zip بكلمة مرور خاصة بالنسخة (AES-GCM 256، PBKDF2-SHA256 600000، ملح عشوائي، iv عشوائي).
   الحاوية: «LLBX1» + عدد التكرارات (4 بايت) + ملح 16 + iv 12 + النص المشفّر؛ والرأس (الـ21 بايتاً الأولى) بيانات إضافية موثَّقة فلا يُعدَّل دون كشف.
   كلمة النسخة مستقلة عن كلمة الخزنة (تُنقل النسخة لجهاز آخر)، ولا يمكن استرجاعها إن نُسيت. النواة BX نقية (Node)؛ الواجهة تلفّ bkSheet وتلتقط اختيار الملف المشفّر لتفكه ثم تمرّره للاستعادة القائمة. */
const BX = (() => {
  const TE = new TextEncoder(), MAGIC = TE.encode('LLBX1'), ITER = 600000, HL = 5 + 4 + 16, sub = () => globalThis.crypto.subtle;
  const COMMON = ['password', '12345678', '123456789', '1234567890', 'qwertyui', 'qwertyuiop', '11111111', 'iloveyou', 'password1', 'admin123', 'abcd1234', '00000000', '12341234', '987654321'];
  const weak = p => { p = String(p || ''); if (p.length < 8) return 'كلمة المرور 8 أحرف على الأقل (الجملة الطويلة أفضل)'; if (new Set([...p]).size < 4) return 'كلمة المرور مكررة الأحرف — اختر أصعب'; if (/^\d+$/.test(p)) return 'لا تكتفِ بالأرقام — أضف حروفاً'; if (COMMON.includes(p.toLowerCase())) return 'كلمة المرور شائعة وسهلة التخمين'; return '' };
  const key = async (pw, salt, it) => { const m = await sub().importKey('raw', TE.encode(String(pw).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']); return sub().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']) };
  const isEnc = u8 => !!u8 && u8.length >= 5 && MAGIC.every((b, i) => u8[i] === b);
  async function enc(u8, pw, it) {
    it = it || ITER; const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12)), head = new Uint8Array(HL);
    head.set(MAGIC); new DataView(head.buffer).setUint32(5, it); head.set(salt, 9);
    const ct = new Uint8Array(await sub().encrypt({ name: 'AES-GCM', iv, additionalData: head }, await key(pw, salt, it), u8)), out = new Uint8Array(HL + 12 + ct.length);
    out.set(head); out.set(iv, HL); out.set(ct, HL + 12); return out;
  }
  /* يرمي 'format' إن لم تكن حاوية صالحة، و'bad' عند كلمة خاطئة أو ملف معدَّل */
  async function dec(u8, pw) {
    if (!isEnc(u8) || u8.length < HL + 12 + 16) throw new Error('format');
    const it = new DataView(u8.buffer, u8.byteOffset, u8.byteLength).getUint32(5); if (it < 1000 || it > 5e6) throw new Error('format');
    try { return new Uint8Array(await sub().decrypt({ name: 'AES-GCM', iv: u8.subarray(HL, HL + 12), additionalData: u8.subarray(0, HL) }, await key(pw, u8.slice(9, 25), it), u8.subarray(HL + 12))) } catch (e) { throw new Error('bad') }
  }
  return { enc, dec, isEnc, weak, ITER };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BX;

if (typeof document !== 'undefined') (function () {
  const q = s => document.querySelector(s), pwType = (() => { try { return CSS.supports('-webkit-text-security', 'disc') ? 'text' : 'password' } catch (e) { return 'password' } })();
  const inp = (id, ph) => `<input id="${id}" class="vxin" type="${pwType}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" dir="auto" name="${id}${Date.now() % 1e6}" placeholder="${ph}" data-lpignore="true" data-1p-ignore="true">`;
  const msg = t => { const e = q('#bx_m'); if (e) e.textContent = t || '' };
  let ask = null;
  /* نافذة كلمة النسخة: mode 'new' (كلمتان) أو 'open' (كلمة واحدة) — تعيد الكلمة أو null. check(pw) اختياري للتحقق قبل الإغلاق (يعيد نصاً عند الخطأ) */
  function bxAsk(title, sub, mode, check) {
    if (ask) ask.res(null);
    return new Promise(res => { ask = { res, mode, check }; sheet(`<h2 class="sht">${title}</h2><div class="shm">${sub}</div>${inp('bx_p1', 'كلمة مرور النسخة')}${mode == 'new' ? inp('bx_p2', 'أعد كتابة الكلمة') : ''}<div class="lks lkm" id="bx_m" role="status"></div><div class="acts one"><button class="btn pri" data-act="bxok">متابعة</button><button class="btn" data-act="bxno">إلغاء</button></div>`); setTimeout(() => { const i = q('#bx_p1'); if (i) i.focus() }, 120) });
  }
  const closeAsk = v => { const a = ask; ask = null; if (a) a.res(v) };
  function saveBytes(bytes, name) {
    const blob = new Blob([bytes], { type: 'application/octet-stream' }), u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000);
  }
  async function exportEnc(full) {
    const pw = await bxAsk('🔐 نسخة احتياطية مشفّرة', 'اختر كلمة مرور لهذه النسخة (مستقلة عن كلمة الخزنة). <b>لا يمكن فتح النسخة بدونها ولا استرجاعها إن نُسيت</b>. احفظها في مكان آمن.', 'new', async (p, p2) => p !== p2 ? 'الكلمتان غير متطابقتين' : BX.weak(p));
    if (pw == null) return; msg('جارٍ التشفير…');
    try {
      const iso = isoD(new Date()); let bytes, name;
      if (full) { if (typeof HDN == 'undefined' || !HDN.buildFull) throw new Error('nofull'); bytes = (await HDN.buildFull()).bytes; name = 'نسخة-كاملة-مشفّرة-' + iso + '.llbk'; }
      else { bytes = new TextEncoder().encode(JSON.stringify({ app: 'legal-library', ver: (typeof APP != 'undefined' && APP.version) || '', date: new Date().toISOString(), data: bkLocal() })); name = 'نسخة-المكتبة-مشفّرة-' + iso + '.llbk'; }
      const out = await BX.enc(bytes, pw); saveBytes(out, name); try { localStorage.setItem('lastbk', iso) } catch (e) { }
      toast('⬇ بدأ تنزيل النسخة المشفّرة — احفظ كلمتها في مكان آمن', 4500); if (typeof bkSheet == 'function') bkSheet(); else closeSheet();
    } catch (e) { toast('تعذّر إنشاء النسخة المشفّرة: ' + String(e && e.message || e).slice(0, 60), 4500) }
  }
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act;
    if (a == 'bxjson') exportEnc(false); else if (a == 'bxfull') exportEnc(true);
    else if (a == 'bxno') closeAsk(null);
    else if (a == 'bxok' && ask) {
      const p = (q('#bx_p1') || {}).value || '', p2 = (q('#bx_p2') || {}).value || '', A = ask; if (!p) { msg('اكتب كلمة المرور'); return }
      if (A.mode == 'new' && p !== p2) { msg('الكلمتان غير متطابقتين'); return } const w = A.check ? await A.check(p, p2) : ''; if (w) { msg(w); return } closeAsk(p);
    }
  });
  /* استعادة ملف مشفّر: نلتقط اختيار الملف في #bkf (JSON) و#hdzf (zip) فنفكّه ثم نمرّره للمعالج القائم كأنه ملف عادي */
  let pass = false;
  const redo = (inp, file) => { try { if (file) { const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files } pass = true; inp.dispatchEvent(new Event('change', { bubbles: true })) } finally { pass = false } };
  /* الالتقاط متزامن: نوقف الحدث فوراً ثم نفحص الملف؛ إن لم يكن مشفّراً نعيده كما هو للمعالج القائم، وإلا نفكّه بالكلمة ونمرّر المحتوى المفكوك */
  document.addEventListener('change', e => {
    const inp = e.target, id = inp && inp.id; if ((id != 'bkf' && id != 'hdzf') || pass) return; const f = inp.files && inp.files[0]; if (!f) return; e.stopImmediatePropagation();
    (async () => {
      const head = new Uint8Array(await f.slice(0, 5).arrayBuffer()); if (!BX.isEnc(head)) { redo(inp); return }
      const u8 = new Uint8Array(await f.arrayBuffer()); let plain = null;
      const pw = await bxAsk('🔐 نسخة مشفّرة', 'اكتب كلمة مرور هذه النسخة لفتحها.', 'open', async p => { try { plain = await BX.dec(u8, p); return '' } catch (x) { return x.message == 'bad' ? 'كلمة المرور غير صحيحة أو الملف معدَّل' : 'الملف ليس نسخة مشفّرة صالحة' } });
      if (pw == null || !plain) { inp.value = ''; return }
      /* نافذة الكلمة حلّت محل شاشة النسخ الاحتياطي فحقل الملف الأصلي خرج من الصفحة؛ نعيد رسم الشاشة ونمرّر الملف المفكوك لحقلها الجديد */
      try { if (typeof bkSheet == 'function') bkSheet(); const n = q('#' + id) || inp; redo(n, new File([plain], id == 'bkf' ? 'backup.json' : 'full.zip', { type: id == 'bkf' ? 'application/json' : 'application/zip' })) } catch (x) { toast('تعذّر فتح النسخة على هذا المتصفح', 4000) }
    })();
  }, true);
  if (typeof bkSheet == 'function') {
    const b = bkSheet; window.bkSheet = bkSheet = function () {
      const r = b.apply(this, arguments);
      try {
        const a = q('#sh .acts'); if (a && !q('#bxjson')) a.insertAdjacentHTML('beforeend', '<button class="btn" id="bxjson" data-act="bxjson">🔐 نسخة مشفّرة بكلمة</button><button class="btn" id="bxfull" data-act="bxfull">🔐 نسخة كاملة مشفّرة</button>');
        ['#bkf', '#hdzf'].forEach(s => { const i = q(s); if (i && i.accept && !/llbk/.test(i.accept)) i.accept += ',.llbk,application/octet-stream' });
        if (!q('#bxnote') && q('#sh')) q('#sh').insertAdjacentHTML('beforeend', '<div class="shm" id="bxnote" style="margin-top:8px">🔐 «نسخة مشفّرة» تحميها كلمة تختارها للنسخة نفسها؛ والنسخ العادية تبقى ملفات صريحة.</div>');
      } catch (x) { }
      return r;
    };
  }
})();
