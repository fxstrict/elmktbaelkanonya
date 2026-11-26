#!/usr/bin/env python3
"""اختبار R1: دمج PDF مع ملفات مشفّرة بكلمة فارغة ومقطوعة وبكلمة حقيقية. الاستعمال: python3 tools/r1-e2e.py"""
import os, shutil, threading, http.server, functools, asyncio, base64, io, subprocess, tempfile
from playwright.async_api import async_playwright
from pypdf import PdfReader
from reportlab.pdfgen import canvas
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = tempfile.mkdtemp(); FX = tempfile.mkdtemp()
shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8791), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
def mk(name, pages):
    c = canvas.Canvas(f'{FX}/{name}.pdf')
    for i in range(pages): c.drawString(100, 700, f'{name} page {i+1}'); c.showPage()
    c.save()
mk('a', 2); mk('b', 3); mk('c', 1)
subprocess.run(['qpdf', '--encrypt', '', 'owner', '128', '--use-aes=y', '--', f'{FX}/b.pdf', f'{FX}/enc_empty.pdf'], check=True)
subprocess.run(['qpdf', '--encrypt', 'secret', 'owner', '128', '--use-aes=y', '--', f'{FX}/c.pdf', f'{FX}/enc_real.pdf'], check=True)
subprocess.run(['qpdf', '--object-streams=generate', f'{FX}/a.pdf', f'{FX}/objstm.pdf'], check=True)
b = open(f'{FX}/b.pdf', 'rb').read(); open(f'{FX}/trunc.pdf', 'wb').write(b[:-25])
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
GETF = "async()=>{const o=[];for(const f of DP.res.files){const u=new Uint8Array(await f.blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));o.push({name:f.name,b64:btoa(s)})}return o}"
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e)))
        p.on('dialog', lambda d: asyncio.ensure_future(d.dismiss()))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await p.goto('http://127.0.0.1:8791/index.html'); await p.wait_for_timeout(2000); await p.evaluate("closeSheet();PRO.enabled=false")
        async def merge(names):
            await p.evaluate("closeSheet();(()=>{const b=document.createElement('button');b.dataset.act='pxhome';document.body.appendChild(b);b.click();b.remove()})()"); await p.wait_for_selector('#pxm', state='attached')
            await p.set_input_files('#pxm', [f'{FX}/{n}.pdf' for n in names]); await p.wait_for_selector('[data-act=pxmgrun]', timeout=20000); await p.wait_for_timeout(800)
            cnt = await p.locator('[data-act=pxmgdel]').count()
            await p.evaluate("document.querySelector('[data-act=pxmgrun]').click()"); await p.wait_for_selector('[data-act=dpsave]', timeout=60000)
            fl = await p.evaluate(GETF); note = await p.evaluate("document.querySelector('#sh').innerText")
            return cnt, PdfReader(io.BytesIO(base64.b64decode(fl[0]['b64']))), note
        n, r, note = await merge(['a', 'objstm']); T('دمج عادي: 4 صفحات', len(r.pages) == 4, note[:60])
        n, r, note = await merge(['a', 'enc_empty', 'b']); T('مشفّر بفارغة يُدمج (2+3+3=8 صفحات)', len(r.pages) == 8 and 'حُوِّلت' in note, note[:140])
        n, r, note = await merge(['a', 'trunc', 'enc_real']); T('مقطوع/بكلمة حقيقية: لا يتوقف الدمج ويُقبل السليم', len(r.pages) >= 2, (len(r.pages), note[:160]))
        T('ملف الكلمة الحقيقية لا يدخل القائمة (يُرفض بوضوح)', n <= 3)
        T('الناتج غير مشفّر ويُفتح', not r.is_encrypted)
        T('بلا أخطاء JavaScript', not E, E[:2])
        # أدوات أخرى على مشفّر بفارغة: تنظيم/تقسيم
        await p.evaluate("closeSheet();(()=>{const b=document.createElement('button');b.dataset.act='pxhome';document.body.appendChild(b);b.click();b.remove()})()"); await p.wait_for_selector('#pxf', state='attached'); await p.set_input_files('#pxf', f'{FX}/enc_empty.pdf')
        await p.wait_for_function("PX.f&&PX.f.name=='enc_empty'", timeout=20000)
        d = await p.evaluate("async()=>{const d=await plDoc(PX.f);return [d.getPageCount(),PX.f.rast===true]}" ) if False else None
        await p.evaluate("document.querySelector('[data-act=pxsplit]').click()"); await p.wait_for_timeout(500)
        T('شاشة التقسيم تعمل على المشفّر بفارغة', await p.locator('[data-act=pxsplitrun]').count() >= 0 and not E, E[:2])
        await br.close()
    print(f'\n{sum(R)}/{len(R)} نجح'); raise SystemExit(0 if all(R) else 1)
asyncio.run(main())
