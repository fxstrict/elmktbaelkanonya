#!/usr/bin/env python3
"""اختبار R3: مساحة عمل موحّدة (صور + PDF) وشاشة نتيجة موحّدة. يحتاج: node tools/n5-fixtures.js /tmp/n5fx (a.pdf 5 صفحات، b.pdf 3، scan.png) وأداة qpdf.
الاستعمال: python3 tools/r3-e2e.py /tmp/n5fx"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, subprocess
from playwright.async_api import async_playwright
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = tempfile.mkdtemp(); shutil.rmtree(SITE)
shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
EX = tempfile.mkdtemp(); subprocess.run(['qpdf', '--encrypt', '', 'owner', '128', '--use-aes=y', '--', f'{FX}/b.pdf', f'{EX}/enc_empty.pdf'], check=True)
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8793), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
ACT = "(a)=>{const b=document.createElement('button');b.dataset.act=a;document.body.appendChild(b);b.click();b.remove()}"
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e)))
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await p.goto('http://127.0.0.1:8793/index.html'); await p.wait_for_timeout(2000); await p.evaluate("closeSheet();PRO.enabled=false")
        click = lambda a: p.evaluate(f"({ACT})('{a}')")
        sh = lambda: p.evaluate("document.querySelector('#sh').innerText")
        n = lambda: p.evaluate("DP.items.length")
        # 1) الإدخال الموحّد موجود في المركز وتجهيز المستندات وشاشة الصفحات
        await click('tools'); await click('hub'); await p.wait_for_timeout(300)
        T('المركز: زر إضافة ملفات (wsadd)', await p.evaluate("!!document.querySelector('#sh [data-act=wsadd]')"))
        T('المركز ما زال بلا حقول إدخال', await p.evaluate("!document.querySelector('#sh input')"))
        await click('dp'); await p.wait_for_selector('#wsf', state='attached')
        T('تجهيز المستندات: حقل #wsf بصور وPDF', await p.evaluate("document.querySelector('#wsf').accept.includes('pdf')&&document.querySelector('#wsf').accept.includes('image')"))
        # 2) إضافة صورة + PDF (5 ص) + PDF مشفّر بفارغة (3 ص) دفعة واحدة
        await p.set_input_files('#wsf', [f'{FX}/scan.png', f'{FX}/a.pdf', f'{EX}/enc_empty.pdf'])
        await p.wait_for_selector('[data-act=dprun]', timeout=60000); await p.wait_for_timeout(500)
        T('9 صفحات: صورة + 5 + 3', await n() == 9, await n())
        names = await p.evaluate("DP.items.map(i=>i.name)")
        T('أسماء الصفحات من الملفات (a ص1 … )', any(x.startswith('a ص') for x in names) and any(x.startswith('enc_empty ص') for x in names), names[:3])
        T('حقل #wsf في شاشة الصفحات للإضافة اللاحقة', await p.evaluate("!!document.querySelector('#sh .shh #wsf')"))
        T('اسم المشروع من أول ملف', await p.evaluate("DP.name") == 'scan', await p.evaluate("DP.name"))
        await p.set_input_files('#wsf', [f'{FX}/b.pdf']); await p.wait_for_timeout(2500)
        T('إضافة لاحقة تلحق بالصفحات (12)', await n() == 12, await n())
        # 3) شاشة النتيجة (docprep) فيها الشريط الموحّد
        await p.evaluate("DP.items=DP.items.slice(0,2);DP.out='pdf';dpWork()"); await p.wait_for_timeout(300)
        await click('dprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=60000); await p.wait_for_timeout(300)
        a = await p.evaluate("[...document.querySelectorAll('#wsres [data-act]')].map(b=>b.dataset.act)")
        T('نتيجة docprep: الشريط الموحّد بأزراره الأربعة', set(a) == {'wscont', 'wsuse', 'wslib', 'wscase'}, a)
        T('الشريط مرة واحدة فقط', await p.evaluate("document.querySelectorAll('#wsres').length") == 1)
        # 4) حفظ في المكتبة + ربط بقضية (يفتح تفاصيل المستند)
        n0 = await p.evaluate("HD.n"); await click('wslib'); await p.wait_for_timeout(1200)
        T('حفظ في مكتبتي يزيد العدد', await p.evaluate("HD.n") == n0 + 1, (n0, await p.evaluate("HD.n")))
        await click('wscase'); await p.wait_for_timeout(900)
        T('ربط بقضية يفتح تفاصيل المستند دون حفظ مكرر', 'تفاصيل المستند' in await sh() and await p.evaluate("HD.n") == n0 + 1)
        # 5) استخدم في أدوات PDF
        await p.evaluate("closeSheet()"); await click('dprun'); await p.wait_for_selector('[data-act=wsuse]', timeout=60000)
        await click('wsuse'); await p.wait_for_selector('[data-act=pxorg]', timeout=20000)
        T('أدوات PDF لهذا الملف: الملف محمّل في أدوات PDF', await p.evaluate("PX.f&&PX.f.n")==2, await p.evaluate("PX.f&&PX.f.n"))
        # 6) متابعة التحرير تعيد شاشة الصفحات
        await p.evaluate("closeSheet()"); await click('dprun'); await p.wait_for_selector('[data-act=wscont]', timeout=60000)
        await click('wscont'); await p.wait_for_timeout(400)
        T('متابعة التحرير تعيد شاشة الصفحات', await p.evaluate("!!document.querySelector('#sh [data-act=dprun]')"))
        # 7) نتيجة أدوات PDF (دمج) فيها الشريط أيضاً، ومتابعة التحرير تفتح الناتج كصفحات
        await p.evaluate("DP.items=[];DP.res=null;closeSheet()"); await click('pxhome'); await p.wait_for_selector('#pxm', state='attached')
        await p.set_input_files('#pxm', [f'{FX}/a.pdf', f'{FX}/b.pdf']); await p.wait_for_selector('[data-act=pxmgrun]', timeout=20000); await p.wait_for_timeout(500)
        await click('pxmgrun'); await p.wait_for_selector('[data-act=dpsave]', timeout=60000); await p.wait_for_timeout(300)
        a = await p.evaluate("[...document.querySelectorAll('#wsres [data-act]')].map(b=>b.dataset.act)")
        T('نتيجة أدوات PDF: الشريط الموحّد نفسه', set(a) == {'wscont', 'wsuse', 'wslib', 'wscase'}, a)
        await click('wscont'); await p.wait_for_selector('[data-act=dprun]', timeout=60000); await p.wait_for_timeout(300)
        T('متابعة التحرير لناتج الدمج (8 صفحات) تفتحه كصفحات', await n() == 8, await n())
        # 8) ضبط Pro: بدون اشتراك لا يُفتح PDF كصفحات (مثل «فتح كصفحات»)
        await p.evaluate("DP.items=[];DP.res=null;closeSheet();PRO.enabled=true"); await click('dp'); await p.wait_for_selector('#wsf', state='attached')
        await p.set_input_files('#wsf', [f'{FX}/a.pdf']); await p.wait_for_timeout(1500)
        T('FREE: ملف PDF لا يدخل المساحة (يطلب Pro)', await n() == 0, await n())
        await p.evaluate("closeSheet()"); await click('dp'); await p.wait_for_selector('#wsf', state='attached')
        await p.set_input_files('#wsf', [f'{FX}/scan.png']); await p.wait_for_selector('[data-act=dprun]', timeout=20000)
        T('FREE: الصور تدخل كالمعتاد', await n() == 1, await n())
        keys = await p.evaluate("Object.keys(localStorage)")
        T('لا مفاتيح localStorage جديدة', not any(k.startswith(('ws', 'hub')) for k in keys), keys[:6])
        T('بلا أخطاء JavaScript', not E, E[:2])
        await br.close()
asyncio.run(main())
print(f"\n{sum(R)}/{len(R)}"); raise SystemExit(0 if all(R) else 1)
