#!/usr/bin/env python3
"""اختبار R2: مركز أدوات المستندات (hub) + الرجوع إليه + بقاء أزرار القائمة الأخرى. الاستعمال: python3 tools/r2-e2e.py"""
import os, shutil, threading, http.server, functools, asyncio, tempfile
from playwright.async_api import async_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = tempfile.mkdtemp()
shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8792), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
ACT = "(a)=>{const b=document.createElement('button');b.dataset.act=a;document.body.appendChild(b);b.click();b.remove()}"
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e)))
        p.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await p.goto('http://127.0.0.1:8792/index.html'); await p.wait_for_timeout(2000); await p.evaluate("closeSheet();PRO.enabled=false")
        sh = lambda: p.evaluate("document.querySelector('#sh').innerText")
        acts = lambda: p.evaluate("[...document.querySelectorAll('#sh [data-act]')].map(b=>b.dataset.act)")
        back = lambda: p.evaluate("history.back()")
        await p.evaluate(f"({ACT})('tools')"); await p.wait_for_timeout(300)
        a = await acts()
        T('قائمة الأدوات فيها زر المركز', 'hub' in a, a[:4])
        T('أزرار مدمجة أُزيلت من القائمة (scan/dp/pxhome/hdlib)', not any(x in a for x in ['scan', 'dp', 'pxhome', 'hdlib']))
        T('بقية الأدوات باقية (أتعاب، توكيلات، مواريث، مواعيد، فوائد، نسخة، قفل)', all(x in a for x in ['fees', 'poa', 'mw', 'calc', 'int', 'bk', 'lock']))
        await p.evaluate(f"({ACT})('hub')"); await p.wait_for_timeout(300)
        a = await acts(); t = await sh()
        T('المركز: الأزرار الأساسية موجودة', all(x in a for x in ['scan', 'dp', 'pxhome', 'hubedit', 'ocropen', 'qropen', 'hdlib', 'hubhscan']), a)
        T('المركز بخمس مجموعات', all(w in t for w in ['مسح واستيراد', 'ملفات PDF', 'تحرير', 'نص وبيانات', 'مستنداتي']))
        T('لا حقول إدخال في المركز (ليسترجعه الرجوع)', await p.evaluate("!document.querySelector('#sh input,#sh textarea,#sh select')"))
        T('بلا زر «صفحات الجلسة» وجلسة فارغة', 'dpwork' not in a)
        # كل زر يفتح أداته
        for act, mark in [('dp', 'تجهيز المستندات'), ('pxhome', 'أدوات PDF'), ('ocropen', 'التعرف'), ('qropen', 'QR'), ('hdlib', 'مكتبتي')]:
            await p.evaluate(f"({ACT})('hub')"); await p.wait_for_timeout(200)
            await p.evaluate(f"({ACT})('{act}')"); await p.wait_for_timeout(500)
            T(f'زر {act} يفتح أداته', mark in await sh(), (await sh())[:40].replace('\n', ' '))
            await back(); await p.wait_for_timeout(500)
            T(f'الرجوع من {act} يعيد المركز', 'أدوات المستندات' in (await sh()) and 'مسح واستيراد' in (await sh()))
        # hubedit بلا صفحات
        await p.evaluate(f"({ACT})('hubedit')"); await p.wait_for_timeout(400)
        T('التحرير بلا صفحات يفتح التجهيز مع تنبيه', 'تجهيز المستندات' in await sh())
        # مع صفحات
        await p.evaluate("""async()=>{const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,300,400);x.fillStyle='#000';x.font='24px sans-serif';x.fillText('test',50,100);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));const it=await dpLoad(new File([b],'t.jpg',{type:'image/jpeg'}));if(it)DP.items.push(it)}""")
        n = await p.evaluate("DP.items.length")
        if n:
            await p.evaluate("closeSheet()"); await p.evaluate(f"({ACT})('tools')"); await p.evaluate(f"({ACT})('hub')"); await p.wait_for_timeout(300)
            T('مع صفحات يظهر زر صفحات الجلسة', 'dpwork' in await acts())
            await p.evaluate(f"({ACT})('hubedit')"); await p.wait_for_timeout(400)
            T('التحرير مع صفحات يفتح شاشة الصفحات', await p.evaluate("!!document.querySelector('#sh [data-act=dprun]')"))
        else: print('… تخطّي فحص الجلسة (لا dpAdd)')
        # الرجوع الكامل: المركز → القائمة → إغلاق
        await p.evaluate("DP.items=[];closeSheet()"); await p.wait_for_timeout(400)
        await p.evaluate(f"({ACT})('tools')"); await p.wait_for_timeout(200); await p.evaluate(f"({ACT})('hub')"); await p.wait_for_timeout(200)
        await back(); await p.wait_for_timeout(400)
        T('رجوع من المركز يعيد قائمة الأدوات', 'الأتعاب' in await sh())
        await back(); await p.wait_for_timeout(500)
        T('رجوع ثانٍ يغلق النافذة', not await p.evaluate("document.querySelector('#sh').classList.contains('open')"))
        # مفتاح localStorage لم يُمس
        keys = await p.evaluate("Object.keys(localStorage)")
        T('لم تُضف مفاتيح localStorage باسم hub', not any('hub' in k.lower() for k in keys), keys[:6])
        T('بلا أخطاء JavaScript', not E, E[:2])
        await br.close()
asyncio.run(main())
print(f"\n{sum(R)}/{len(R)}")
raise SystemExit(0 if all(R) else 1)
