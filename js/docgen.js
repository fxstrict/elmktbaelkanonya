/* L6 (1.28.0) — مولّد المذكرات والصحف ودمجها ببيانات القضية.
   • 🧰 ← «مذكرات وصحف» أو زر المذكرات في ملف القضية: اختيار قالب (صحيفة دعوى، مذكرة بدفاع، صحيفة استئناف، طلب تأجيل، إنذار، حافظة مستندات) فيُملأ النموذج من بيانات القضية (الطرفان والعنوانان والمحكمة والدائرة ورقم الدعوى وأقرب جلسة) وبيانات المحامي.
   • مسودات داخل القضية (c.dr في المفتاح lists)، وتصدير Word أو نسخ نصي، وإدراج المستندات الممسوحة المرتبطة بالقضية في المرفقات.
   • تعبئة الصيغ القديمة (fill.js): قائمة «تعبئة من قضية» تملأ الفراغات المعروفة (الأطراف، العناوين، المحكمة، الدائرة، رقم الدعوى، المحامي).
   المنطق في doccore.js (DC). إضافة فقط: يلفّ casePanel وtoolsSheet وformSheet. يُحمَّل بعد casemgmt.js وfill.js وقبل vault-ui.js. */
const DG = { cid: '', tid: '', did: '' };
const dgToday = () => isoD(today12()), dgFind = id => CLS.find(c => c.id == id) || null, dgSaveAll = () => _s('lists', CLS);
const dgQ = s => document.querySelector(s), dgV = s => { const e = dgQ(s); return e ? e.value : '' };
const dgOpen = () => { const s = dgQ('#sh'); return !!(s && s.classList.contains('open')) };
const dgRe = h => { const s = dgQ('#sh'); if (dgOpen() && dgQ('#dg_root')) s.innerHTML = '<div class="grab"></div>' + h; else sheet(h) };

/* ---------- كتلة ملف القضية وقائمة الأدوات ---------- */
const _dgCasePanel = casePanel;
casePanel = function (c) {
  const h = _dgCasePanel(c), n = (c.dr || []).length, i = h.lastIndexOf('<div class="acts"');
  const b = `<div class="l6"><div class="cph"><b>📝 المذكرات والصحف</b><button class="lnk" data-act="dgcase" data-cc="${c.id}">${n ? 'فتح (' + n + ')' : '➕ جديد'}</button></div><div class="shm">${n ? n + ' مسودة محفوظة' : 'صحيفة دعوى، مذكرة، استئناف، تأجيل، إنذار، حافظة — وبيانات القضية جاهزة فيها.'}</div></div>`;
  return i > 0 ? h.slice(0, i) + b + h.slice(i) : h + b;
};
const _dgTools = toolsSheet;
toolsSheet = function () { _dgTools(); const a = dgQ('#sh .acts'); if (a && !dgQ('#sh [data-act="dgtool"]')) a.insertAdjacentHTML('beforeend', '<button class="btn" data-act="dgtool">📝 مذكرات وصحف</button>') };

/* ---------- القائمة: اختيار القضية والقالب والمسودات ---------- */
function dgHome(cid) {
  DG.cid = cid || ''; const c = dgFind(DG.cid), dr = (c && c.dr) || [];
  dgRe(`<div id="dg_root"><h2 class="sht">📝 مذكرات وصحف</h2><div class="shm">نماذج هيكلية للاستئناس تُملأ من بيانات القضية؛ راجع الصياغة والأسانيد والمواعيد قبل التقديم.</div>`
    + `<label class="fld"><span>القضية</span><select id="dg_c"><option value="">— بدون قضية —</option>${CLS.map(x => `<option value="${x.id}"${x.id == DG.cid ? ' selected' : ''}>${esc2(x.name)}</option>`).join('')}</select></label>`
    + `<div class="acts one">${DC.TPL.map(t => `<button class="btn" data-act="dgnew" data-t="${t.id}"><b>${t.name}</b><br><small>${esc2(t.desc)}</small></button>`).join('')}</div>`
    + (dr.length ? `<div class="cph" style="margin-top:12px"><b>المسودات المحفوظة</b></div>` + dr.map(d => `<div class="pr"><span><b>${esc2(d.n)}</b><br><small>آخر تعديل ${esc2(DC.fmtD(d.up) || '')}</small></span><button class="pb" data-act="dgopen" data-k="${d.id}" aria-label="فتح">✏️</button><button class="pb" data-act="dgdel" data-k="${d.id}" aria-label="حذف">🗑</button></div>`).join('') : '') + '</div>');
}

/* ---------- النموذج ---------- */
function dgField(f, val) {
  const id = 'dgf_' + f.k, v = esc2(val || ''), h = f.h ? `<small>${esc2(f.h)}</small>` : '';
  if (f.t == 'area') return `<label class="fld"><span>${f.l}</span><textarea id="${id}" rows="3">${v}</textarea>${h}</label>`;
  return `<label class="fld"><span>${f.l}</span><input id="${id}" type="${f.t == 'date' ? 'date' : f.t == 'num' ? 'number' : 'text'}"${f.t == 'num' ? ' inputmode="numeric" min="0"' : ''} value="${v}">${h}</label>`;
}
function dgForm(cid, tid, did) {
  const t = DC.tpl(tid); if (!t) return; DG.cid = cid || ''; DG.tid = tid; DG.did = did || ''; const c = dgFind(DG.cid), dr = did && c && (c.dr || []).find(x => x.id == did);
  const val = DC.merge(tid, c, ld('fp', {}), dgToday(), dr);
  const annexK = tid == 'annex' ? 'items' : 'annex', hasAnnex = t.f.some(x => x.k == annexK);
  dgRe(`<div id="dg_root"><div class="shh"><h2 class="sht">📝 ${t.name}</h2><button class="lnk" data-act="dgcase" data-cc="${DG.cid}">← القائمة</button></div>`
    + `<div class="shm">${c ? 'القضية: <b>' + esc2(c.name) + '</b> — ' : ''}الفراغ الذي تتركه يبقى منقّطاً في الملف.</div>` + t.f.map(f => dgField(f, val[f.k])).join('')
    + (hasAnnex && c ? `<button class="btn" data-act="dgscan" data-k="${annexK}">📎 إدراج مستنداتي الممسوحة لهذه القضية</button>` : '')
    + (c ? `<label class="fld" style="margin-top:8px"><span><input id="dg_sv" type="checkbox" checked> احفظ العناوين وبيانات المحامي في القضية والإعدادات</span></label>` : '')
    + `<button class="btn pri wide" data-act="dgdoc">⬇ تنزيل Word</button><div class="acts" style="margin-top:8px">${c ? '<button class="btn" data-act="dgsave">💾 حفظ كمسودة</button>' : ''}<button class="btn" data-act="dgcopy">📋 نسخ النص</button></div></div>`);
}
function dgRead() { const t = DC.tpl(DG.tid), o = {}; if (t) t.f.forEach(f => { o[f.k] = dgV('#dgf_' + f.k) }); return o }
/* حفظ مسودة + (اختيارياً) العناوين في القضية والمحامي في fp؛ لا يغيّر اسم الموكل ولا المحكمة في القضية */
function dgPersist(f, draft) {
  const c = dgFind(DG.cid); if (!c) return null; let d = null;
  if (draft !== false) { d = DC.saveDraft(c, { did: DG.did, t: DG.tid, f }, dgToday()); if (d) DG.did = d.id }
  const svc = dgQ('#dg_sv');
  if (svc && svc.checked) { if (f.A_addr) c.ca = f.A_addr; if (f.B_addr) c.oa = f.B_addr; const fp = ld('fp', {}); let ch = false; if (f.lawyer && fp.lawyer != f.lawyer) { fp.lawyer = f.lawyer; ch = true } if (f.office && fp.office != f.office) { fp.office = f.office; ch = true } if (ch) sv_('fp', fp) }
  dgSaveAll(); return d;
}
const sv_ = (k, v) => (typeof sv == 'function' ? sv(k, v) : 0);
const dgName = (t, f, c) => (t.name + '-' + (f.A || (c && c.name) || 'مستند')).replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() + '.docx';

/* ---------- تعبئة الصيغ القديمة من قضية ---------- */
const _dgFormSheet = formSheet;
formSheet = function () {
  _dgFormSheet(); if (!CLS.length) return; const f2 = dgQ('#sh .fl2'); if (!f2 || dgQ('#fcase')) return;
  f2.insertAdjacentHTML('beforebegin', `<label class="fld"><span>تعبئة من قضية</span><select id="fcase"><option value="">— اختر قضية —</option>${CLS.map(c => `<option value="${c.id}">${esc2(c.name)}</option>`).join('')}</select></label>`);
};
function dgFillCase(cid) {
  const c = dgFind(cid); if (!c || typeof FS == 'undefined' || !FS) return 0; const m = DC.caseMap(c, ld('fp', {}), dgToday()); let n = 0;
  document.querySelectorAll('#sh [data-fi]').forEach(el => {
    const i = +el.dataset.fi, b = FS.sc.blanks[i] || {}, k = el.dataset.kind; let v = m[k];
    if (k == 'caseno' && c.no && /لسنة/.test(b.label || '')) v = c.no;
    if (v) { el.value = v; FS.vals[i] = v; el.dataset.t = 1; n++ }
  }); return n;
}

/* ---------- الأحداث ---------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, k = el.dataset.k;
  if (a == 'dgtool') dgHome(typeof S != 'undefined' && S.tab == 'fav' && S.cl ? S.cl : '');
  else if (a == 'dgcase') dgHome(el.dataset.cc);
  else if (a == 'dgnew') dgForm(DG.cid, el.dataset.t);
  else if (a == 'dgopen') { const c = dgFind(DG.cid), d = c && (c.dr || []).find(x => x.id == k); if (d) dgForm(DG.cid, d.t, d.id) }
  else if (a == 'dgdel') { const c = dgFind(DG.cid); if (c && confirm('حذف هذه المسودة؟') && DC.delDraft(c, k)) { dgSaveAll(); dgHome(DG.cid); if (typeof render == 'function') render() } }
  else if (a == 'dgsave') { const f = dgRead(), d = dgPersist(f); if (d) { toast('حُفظت المسودة'); if (typeof render == 'function') render() } }
  else if (a == 'dgcopy') { const t = DC.tpl(DG.tid); if (!t) return; try { await navigator.clipboard.writeText(DC.text(DC.build(DG.tid, dgRead()))); toast('تم نسخ النص') } catch (x) { toast('تعذّر النسخ') } }
  else if (a == 'dgdoc') {
    const t = DC.tpl(DG.tid); if (!t) return; const f = dgRead(), miss = DC.validate(DG.tid, f);
    if (miss.length && !confirm('ينقص: ' + miss.join('، ') + '\nسيبقى منقّطاً في الملف. متابعة؟')) return;
    try { await fxSend(docxBuild(DC.build(DG.tid, f)), dgName(t, f, dgFind(DG.cid))); dgPersist(f); if (typeof render == 'function') render() } catch (x) { toast('تعذّر إنشاء الملف') }
  }
  else if (a == 'dgscan') {
    const ta = dgQ('#dgf_' + k); if (!ta) return; let names = [];
    try { names = (await HD.all('docs')).filter(d => d && d.caseId == DG.cid && d.name).map(d => d.name) } catch (x) { }
    if (!names.length) { toast('لا مستندات ممسوحة مرتبطة بهذه القضية'); return }
    const have = new Set(DC.lines(ta.value).map(s => s.split('|')[0].trim())); const add = names.filter(n => !have.has(n));
    ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + add.join('\n'); toast(add.length ? 'أُدرج ' + add.length + ' مستند' : 'كلها مدرجة');
  }
});
document.addEventListener('change', e => {
  if (e.target.id == 'dg_c') dgHome(e.target.value);
  else if (e.target.id == 'fcase' && e.target.value) { const n = dgFillCase(e.target.value); toast(n ? 'مُلئ ' + n + ' فراغ من بيانات القضية' : 'لا فراغات معروفة تُملأ من القضية') }
});
