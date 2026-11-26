#!/usr/bin/env python3
"""اختبار R4: شريط المحرر المبوّب (قص | تحسين | تعليق | نص | المزيد). يحتاج: node tools/n5-fixtures.js /tmp/n5fx + scan.png فيه.
الاستعمال: python3 tools/r4-e2e.py /tmp/n5fx"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile
from playwright.async_api import async_playwright
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = tempfile.mkdtemp(); shutil.rmtree(SITE)
shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8794), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
ACT = "(a)=>{const b=document.createElement('button');b.dataset.act=a;document.body.appendChild(b);b.click();b.remove()}"
# كل data-act كانت في المحرر قبل R4 (من تفريغ DOM الفعلي في 1.16.14) يجب أن تبقى موجودة
OLD = ['dpdone', 'dpm', 'dprot', 'dpundo', 'scquad', 'dpfil', 'enf', 'enadj', 'enadjr', 'asautocrop', 'asfix', 'asskew', 'asflip', 'asbook', 'stann', 'dpapply']
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e)))
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await p.goto('http://127.0.0.1:8794/index.html'); await p.wait_for_timeout(2000); await p.evaluate("closeSheet();PRO.enabled=false")
        keys0 = await p.evaluate("Object.keys(localStorage).sort().join('|')")
        ev = lambda s: p.evaluate(s)
        tab = lambda t: p.click(f'[data-act=edtab][data-t={t}]')
        vis = lambda: ev("[...document.querySelectorAll('#sh .edp')].filter(e=>!e.hidden).map(e=>e.dataset.p).join(',')")
        ops = lambda: ev("DP.items[DPE.i].ops.length")
        canvas_hash = lambda: ev("(()=>{const c=document.querySelector('#dpe'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0;for(let i=0;i<d.length;i+=7)h=(h*31+d[i])|0;return h})()")
        await ev("dpHome()"); await p.wait_for_selector('#dpf', state='attached')
        await p.set_input_files('#dpf', [f'{FX}/scan.png']); await p.wait_for_selector('[data-act=dprun]', timeout=30000)
        await ev("dpEdit(0)"); await p.wait_for_selector('#edbar'); await p.wait_for_timeout(300)
        # 1) الشريط والتبويبات
        T('الشريط: خمسة تبويبات + تراجع', await ev("document.querySelectorAll('#edbar .edtab[data-t]').length") == 5 and await ev("!!document.querySelector('#edbar [data-act=dpundo]')"))
        T('أسماء التبويبات', await ev("[...document.querySelectorAll('#edbar .edtab[data-t]')].map(b=>b.innerText.replace(/\\s+/g,' ').trim().split(' ').pop()).join('|')") == 'قص|تحسين|تعليق|نص|المزيد')
        T('التبويب الافتراضي: قص وحده ظاهر', await vis() == 'crop', await vis())
        T('عنوان موحّد «تعديل الصفحة 1 من 1»', 'تعديل الصفحة 1 من 1' in await ev("document.querySelector('#sh .sht').innerText"))
        # 2) لا يضيع أي زر: كل data-act القديمة ما زالت في DOM، ولا زر محقون خارج اللوحات
        acts = set(await ev("[...document.querySelectorAll('#sh [data-act]')].map(b=>b.dataset.act)"))
        T('كل أزرار المحرر القديمة موجودة', all(a in acts for a in OLD if a != 'dpapply') and await ev("!!document.querySelector('#dpap')"), [a for a in OLD if a not in acts])
        T('كل أزرار الأدوات داخل لوحات التبويبات (لا عنصر يتيم)', await ev("[...document.querySelector('#sh').children].filter(e=>!e.classList.contains('grab')&&!e.classList.contains('shh')&&!e.classList.contains('dpcv')&&e.id!='dph'&&e.id!='dpap'&&!e.classList.contains('edp')&&e.id!='edbar').length") == 0)
        T('زر تراجع واحد فقط (في الشريط)', await ev("document.querySelectorAll('#sh [data-act=dpundo]').length") == 1)
        # 3) محتوى كل تبويب
        has = lambda sel: ev(f"[...document.querySelectorAll('#sh .edp:not([hidden]) {sel}')].some(e=>e.offsetParent!==null)")
        T('قص: قص/تدوير/قص بالزوايا/قص تلقائي/اتجاه/ميلان/قلب/فصل', all([await has(s) for s in ['[data-m=crop]', '[data-act=dprot]', '[data-act=scquad]', '[data-act=asautocrop]', '[data-act=asfix]', '[data-act=asskew]', '[data-act=asflip]', '[data-act=asbook]']]))
        await tab('enh'); T('تحسين: ظاهر وحده', await vis() == 'enh')
        T('تحسين: رمادي/أوضاع/متقدم/سطوع/ممحاة/مقارنة', all([await has(s) for s in ['[data-act=dpfil]', '[data-act=enf]', '#enb', '[data-m=erase]', '#encmp']]))
        await tab('ann'); T('تعليق: ظاهر وحده', await vis() == 'ann')
        T('تعليق: طمس + استوديو التعليق', await has('[data-m=mask]') and await has('[data-act=stann]'))
        await tab('txt'); T('نص: OCR وQR', await vis() == 'txt' and await has('[data-act=ocropen]') and await has('[data-act=qropen]'))
        await tab('more'); T('المزيد: تكرار/صفحة بيضاء/نقل/حذف/قائمة الصفحات', await vis() == 'more' and all([await has(s) for s in ['[data-act=stdup]', '[data-act=stblank]', '[data-act=dpup]', '[data-act=dpdn]', '[data-act=edrm]', '[data-act=dpdone]']]))
        T('المزيد: النقل معطّل لصفحة وحيدة', await ev("document.querySelector('#sh [data-act=dpup]').disabled&&document.querySelector('#sh [data-act=dpdn]').disabled"))
        # 4) الشريط لاصق في أسفل النافذة حتى مع لوحة طويلة وتمرير
        await tab('enh'); await ev("document.querySelector('#sh').scrollTop=0"); await p.wait_for_timeout(120)
        b0 = await ev("Math.round(document.querySelector('#edbar').getBoundingClientRect().bottom)")
        await ev("document.querySelector('#sh').scrollTop=9999"); await p.wait_for_timeout(120)
        b1 = await ev("Math.round(document.querySelector('#edbar').getBoundingClientRect().bottom)")
        T('الشريط لاصق عند أسفل الشاشة (أعلى التمرير وأسفله)', b0 == 844 and b1 == 844, (b0, b1))
        T('الشريط بلا تمرير أفقي', await ev("(()=>{const b=document.querySelector('#edbar');return b.scrollWidth<=b.clientWidth+1})()"))
        await ev("document.querySelector('#sh').scrollTop=0")
        # 5) التحسين يعمل ويبقى التبويب ويتراجع من أي تبويب
        n0 = await ops(); h0 = await canvas_hash()
        await ev("document.querySelector('#sh [data-act=dpfil][data-f=bw]').click()")
        await p.wait_for_timeout(500)
        T('تطبيق «أبيض وأسود» يضيف عملية', await ops() == n0 + 1, await ops())
        T('التبويب يبقى «تحسين» بعد إعادة رسم المحرر', await vis() == 'enh', await vis())
        T('الصورة تغيّرت', await canvas_hash() != h0)
        # مقارنة بالأصل ما زالت مربوطة بعد نقل الزر
        h1 = await canvas_hash(); await p.dispatch_event('#encmp', 'pointerdown'); await p.wait_for_timeout(150); hc = await canvas_hash(); await p.dispatch_event('#encmp', 'pointerup'); await p.wait_for_timeout(150); hr = await canvas_hash()
        T('المقارنة بالأصل تعمل (تضغط فتتغير الصورة وتعود)', hc != h1 and hr == h1)
        # المنزلقات: القيمة تبقى عند تبديل التبويب، والتطبيق يضيف عملية adj
        await ev("(()=>{const s=document.querySelector('#enb');s.value=25;s.dispatchEvent(new Event('input',{bubbles:true}))})()")
        await tab('crop'); await tab('enh')
        T('قيمة المنزلق تبقى بعد تبديل التبويبات', await ev("document.querySelector('#enb').value") == '25')
        n1 = await ops(); await ev("document.querySelector('#sh [data-act=enadj]').click()"); await p.wait_for_timeout(500)
        T('تطبيق ضبط السطوع يضيف عملية adj', await ops() == n1 + 1 and (await ev("DP.items[DPE.i].ops.slice(-1)[0].f")).startswith('adj:25'))
        # تراجع من تبويب آخر
        await tab('more'); n2 = await ops(); await p.click('#edbar [data-act=dpundo]'); await p.wait_for_timeout(400)
        T('تراجع الشريط يعمل من تبويب «المزيد» ويبقى فيه', await ops() == n2 - 1 and await vis() == 'more', (n2, await ops(), await vis()))
        # 6) القص: الوضع يظهر زر تطبيق ويكتب عملية
        await tab('crop'); await p.click('#sh [data-act=dpm][data-m=crop]'); await p.wait_for_timeout(300)
        T('وضع القص: التبويب قص وزر «تطبيق» جاهز', await vis() == 'crop' and await ev("DPE.mode") == 'crop')
        n3 = await ops(); await ev("DPE.sel={x:20,y:20,w:300,h:300};dpDraw()"); await ev(f"({ACT})('dpapply')"); await p.wait_for_timeout(400)
        T('تطبيق القص يضيف عملية crop', await ops() == n3 + 1 and (await ev("DP.items[DPE.i].ops.slice(-1)[0].t")) == 'crop')
        # 7) الطمس في تبويب التعليق
        await tab('ann'); await p.click('#sh [data-act=dpm][data-m=mask]'); await p.wait_for_timeout(300)
        T('وضع الطمس يبقى في تبويب «تعليق» وتظهر رسالته', await vis() == 'ann' and 'طمس' in await ev("document.querySelector('#dph').innerText"), await vis())
        n4 = await ops(); await ev("DPE.sel={x:10,y:10,w:100,h:100};dpDraw()"); await ev(f"({ACT})('dpapply')"); await p.wait_for_timeout(400)
        T('تطبيق الطمس يضيف عملية mask', await ops() == n4 + 1 and (await ev("DP.items[DPE.i].ops.slice(-1)[0].t")) == 'mask')
        # 8) الممحاة في تبويب التحسين
        await tab('enh'); await p.click('#sh [data-act=dpm][data-m=erase]'); await p.wait_for_timeout(300)
        T('وضع الممحاة يبقى في «تحسين»', await vis() == 'enh' and await ev("DPE.mode") == 'erase')
        await ev("DPE.mode='';DPE.sel=null;dpEditView()"); await p.wait_for_timeout(300)
        # 9) استوديو التعليق من تبويبه ثم العودة إلى نفس التبويب
        await tab('ann'); await p.click('#sh [data-act=stann]'); await p.wait_for_selector('#stc', timeout=15000)
        T('استوديو التعليق يفتح من تبويب «تعليق»', True)
        await p.click('[data-act=stcancel]'); await p.wait_for_selector('#dpe', timeout=15000); await p.wait_for_selector('#edbar')
        T('العودة من الاستوديو تعيد المحرر على تبويب «تعليق»', await vis() == 'ann', await vis())
        # 10) نص: OCR يفتح وتعود إلى الصفحات
        await tab('txt'); await p.click('#sh [data-act=ocropen]'); await p.wait_for_timeout(500)
        T('OCR يفتح من تبويب «نص»', 'التعرف على النص' in await ev("document.querySelector('#sh').innerText"))
        await ev(f"({ACT})('dpwork')"); await p.wait_for_selector('[data-act=dprun]')
        # 11) المزيد: تكرار ثم حذف بتأكيد، وعنوان «من 2»
        await ev("dpEdit(0)"); await p.wait_for_selector('#edbar'); await tab('more'); n_p = await ev("DP.items.length")
        await p.click('#sh [data-act=stdup]'); await p.wait_for_selector('[data-act=dprun]'); await p.wait_for_timeout(300)
        T('تكرار الصفحة من «المزيد» يضيف صفحة ويعود لقائمة الصفحات', await ev("DP.items.length") == n_p + 1, await ev("DP.items.length"))
        await ev("dpEdit(1)"); await p.wait_for_selector('#edbar'); await p.wait_for_timeout(200)
        T('العنوان «تعديل الصفحة 2 من 2» والتبويب «المزيد» محفوظ', 'تعديل الصفحة 2 من 2' in await ev("document.querySelector('#sh .sht').innerText") and await vis() == 'more', await vis())
        T('النقل للأسفل معطّل في الصفحة الأخيرة وللأعلى مفعّل', await ev("document.querySelector('#sh [data-act=dpdn]').disabled") and not await ev("document.querySelector('#sh [data-act=dpup]').disabled"))
        await p.click('#sh [data-act=edrm]'); await p.wait_for_selector('[data-act=dprun]'); await p.wait_for_timeout(300)
        T('حذف الصفحة بتأكيد يعيد العدد إلى الأصل', await ev("DP.items.length") == n_p, await ev("DP.items.length"))
        # 12) لا مفاتيح تخزين جديدة ولا أخطاء
        T('لا مفاتيح localStorage جديدة', await ev("Object.keys(localStorage).sort().join('|')") == keys0)
        T('لا أخطاء JavaScript في الصفحة', not E, E[:2])
        await br.close()
    bad = R.count(False); print(f'FAILS {bad} of {len(R)}'); sys.exit(1 if bad else 0)
asyncio.run(main())
