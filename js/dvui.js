/* واجهة تشفير المستندات الممسوحة (1.27.0): قسم داخل شاشة «قفل التطبيق» بعد تفعيل الخزنة، وحارس يمنع إلغاء الخزنة قبل فك تشفير المستندات، وترحيل خلفي لما يُستورد صريحاً.
   المحرك في docvault.js (DVX). يُحمَّل بعد vault-ui.js لأنه يلفّ vxLockHtml وVAULT.disable. */
(function () {
  const q = s => document.querySelector(s), T = (m, ms) => { if (typeof toast == 'function') toast(m, ms) };
  const sm = t => { const e = q('#dv_s'); if (e) e.innerHTML = t };
  const stat = async () => { try { const s = await DVX.stats(); sm(s.enc || s.plain ? `السجلات: <b>${s.enc}</b> مشفّرة${s.plain ? ` · <b>${s.plain}</b> غير مشفّرة` : ''}` : 'لا مستندات ممسوحة محفوظة بعد.') } catch (e) { sm('تعذّر قراءة مكتبة المستندات') } };
  if (typeof window.vxLockHtml == 'function') {
    const v = window.vxLockHtml;
    window.vxLockHtml = function () {
      let h = v.apply(this, arguments); if (!window.VAULT || !VAULT.on) return h;
      const on = DVX.on();
      h = h.replace('والمستندات الممسوحة المخزنة على الجهاز لا تشملها هذه الخزنة.', 'والمستندات الممسوحة تُشفَّر بخيار منفصل أدناه.');
      h += `<div style="border-top:1px solid var(--bd);margin:14px 0 0;padding-top:12px"><h2 class="sht" style="font-size:16px">🗄 المستندات الممسوحة ${on ? '🔐' : ''}</h2><div class="shm">${on ? 'صور المستندات ونصوص OCR والتواقيع في مكتبة الجهاز مشفّرة بمفتاح محفوظ داخل الخزنة (لا تُعاد تشفيرها عند تغيير كلمة المرور).' : 'مكتبة المستندات الممسوحة (الصور والنصوص المستخرجة والتواقيع) ما زالت غير مشفّرة. يمكن تشفيرها بالخزنة نفسها؛ قد يستغرق دقائق للمكتبات الكبيرة.'}</div><div class="shm" id="dv_s">…</div><div class="acts one">${on ? '<button class="btn" data-act="dvoff">🔓 إلغاء تشفير المستندات</button>' : '<button class="btn" data-act="dvon">🔐 تشفير مستنداتي الممسوحة</button>'}</div></div>`;
      setTimeout(stat, 60); return h;
    };
  }
  if (window.VAULT && VAULT.disable) { const d = VAULT.disable; VAULT.disable = async function (pw) { if (VAULT.unlocked && DVX.on()) return { err: 'ألغِ تشفير المستندات الممسوحة أولاً (من قسم «المستندات الممسوحة» في الشاشة نفسها)' }; return d.apply(this, arguments) } }
  const prog = r => sm(`جارٍ المعالجة… ${r.done} سجل${r.failed ? ' · تعذّر ' + r.failed : ''}`);
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act="dvon"],[data-act="dvoff"]'); if (!el) return; const on = el.dataset.act == 'dvon'; el.disabled = true;
    if (!on && !confirm('ستُحفظ مستنداتك الممسوحة بعد الإلغاء دون تشفير على هذا الجهاز. متابعة؟')) { el.disabled = false; return }
    sm('جارٍ المعالجة…'); const r = on ? await DVX.enable(prog) : await DVX.disable(prog); el.disabled = false;
    if (r.err) { T(r.err, 5000); sm(r.err) } else { T(on ? '🔐 شُفّرت مستنداتك الممسوحة' + (r.failed ? ' عدا ' + r.failed : '') : 'أُلغي تشفير المستندات', 3500); const a = q('[data-act="lock"]'); if (a) a.click(); else if (typeof closeSheet == 'function') closeSheet() }
  });
  /* ما استُورد صريحاً (نسخة كاملة) أو بقي من ترحيل ناقص يُشفَّر في الخلفية */
  setTimeout(async () => { try { if (DVX.on() && DVX.unlocked()) { const s = await DVX.stats(); if (s.plain) { const r = await DVX.migrate(); if (r.done) T('🔐 شُفّر ' + r.done + ' سجل من مستنداتك الممسوحة', 3000) } } } catch (e) { } }, 4000);
})();
