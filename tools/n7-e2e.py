#!/usr/bin/env python3
"""اختبار N7 (OCR محلي، Word/TXT، PDF قابل للبحث، QR) في Chromium. يحتاج: node tools/n5-fixtures.js /tmp/n5fx ثم صورة qr.png في المجلد نفسه.
الاستعمال: python3 tools/n7-e2e.py /tmp/n5fx"""
import sys, os, shutil, threading, http.server, functools, asyncio, base64, io, subprocess, json, zipfile, re
from playwright.async_api import async_playwright
from pypdf import PdfReader
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'; OUT = '/tmp/n7out'; os.makedirs(OUT, exist_ok=True)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n7site'
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git')); shutil.copy(f'{FX}/qr.png', f'{SITE}/qr.png')
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8778), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
AR1 = 'محكمة القاهرة الاقتصادية الدائرة الخامسة'; AR2 = 'صدر الحكم بجلسة اليوم برفض الدعوى'; EN = 'Case number 123 of 2026'
MKPAGE = """async()=>{const c=document.createElement('canvas');c.width=1500;c.height=1000;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1500,1000);x.fillStyle='#000';x.direction='rtl';x.textAlign='right';x.font='64px "DejaVu Sans",Arial,sans-serif';
 x.fillText('%s',1420,200);x.fillText('%s',1420,340);x.direction='ltr';x.textAlign='left';x.fillText('%s',80,520);
 const b=await new Promise(r=>c.toBlob(r,'image/png'));DP.items.push(await dpLoad(new File([b],'ocr1.png',{type:'image/png'})));DP.name='ocr-test';dpWork()}""" % (AR1, AR2, EN)
GETF = "async()=>{const o=[];for(const f of DP.res.files){const u=new Uint8Array(await f.blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));o.push({name:f.name,b64:btoa(s)})}return o}"
def norm(s): return re.sub(r'[^\w]', '', s)
def sim(a, b):
    import difflib; return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Service Worker' not in m.text else None)
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept('')))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        async def js(c, *a): return await p.evaluate(c, *a) if a else await p.evaluate(c)
        async def click(act, **kw):
            q = f'[data-act={act}]' + ''.join(f'[data-{k}="{v}"]' for k, v in kw.items()); await p.wait_for_selector(q); await p.evaluate("(q)=>document.querySelector(q).click()", q)
        await p.goto('http://127.0.0.1:8778/index.html'); await p.wait_for_timeout(2000); await js("closeSheet();PRO.enabled=false")
        T('ocr.js مُحمَّل وأزرار OCR وQR في شاشة الصفحات', await js("typeof OC=='object'"))
        await js(MKPAGE); await p.wait_for_selector('#ocb')
        T('زرا OCR وQR يظهران', await p.locator('[data-act=ocropen]').count() == 1 and await p.locator('[data-act=qropen]').count() == 1)
        await click('ocropen'); await p.wait_for_selector('[data-act=ocrrun]')
        T('ملفات OCR غير محمّلة قبل الموافقة (كاش فارغ)', await js("caches.has('hscan-ocr').then(h=>!h)"))
        import time; t0 = time.time(); await click('ocrrun', v='all')
        await p.wait_for_selector('.octa', timeout=240000); dt = time.time() - t0
        txt = await js("DP.items[0]._ocr.text"); conf = await js("DP.items[0]._ocr.conf"); nw = await js("DP.items[0]._ocr.words.length")
        print('OCR TEXT >>>', repr(txt), 'conf', conf, 'words', nw, 'sec %.1f' % dt)
        T('OCR: ملفات المحرك واللغة نُزّلت وحُفظت في الكاش الدائم', await js("caches.open('hscan-ocr').then(c=>c.keys()).then(k=>k.length)") == 5)
        T('OCR: الإنجليزي صحيح', 'Case number 123 of 2026' in txt.replace('\n', ' '), txt)
        lines = [l for l in txt.split('\n') if re.search(r'[؀-ۿ]', l)]
        sa = [sim(AR1, ' '.join(lines)[:len(AR1) + 8]), sim(AR2, ' '.join(lines))]
        a1 = max(sim(AR1, l) for l in lines) if lines else 0; a2 = max(sim(AR2, l) for l in lines) if lines else 0
        T('OCR: السطران العربيان بتشابه ≥ 80%', a1 >= 0.8 and a2 >= 0.8, (round(a1, 2), round(a2, 2), lines))
        T('كلمات بمواضع (لـPDF قابل للبحث)', nw >= 8)
        # تصحيح يدوي
        await p.locator('.octa').first.fill(AR1 + '\n' + AR2 + '\n' + EN); await p.wait_for_timeout(200)
        T('التصحيح اليدوي ينعكس على النص المخزَّن', (await js("DP.items[0]._ocr.text")).startswith(AR1))
        # TXT
        async with p.expect_download() as dl: await click('octxt')
        d = await dl.value; tp = f'{OUT}/o.txt'; await d.save_as(tp); tt = open(tp, encoding='utf-8-sig').read()
        T('تصدير TXT بترميز UTF-8 وفيه النص المصحَّح', AR1 in tt and EN in tt and open(tp, 'rb').read()[:3] == b'\xef\xbb\xbf')
        # Word
        async with p.expect_download() as dl: await click('ocdocx')
        d = await dl.value; dp_ = f'{OUT}/o.docx'; await d.save_as(dp_)
        import docx
        doc = docx.Document(dp_); ps = [x.text for x in doc.paragraphs]; xml = zipfile.ZipFile(dp_).read('word/document.xml').decode()
        T('Word: يُفتح بـ python-docx وفيه النص العربي والإنجليزي', any(AR1 in x for x in ps) or any(AR1.split()[0] in x for x in ps), ps)
        T('Word: فقرة عربية RTL (bidi + rtl)', '<w:bidi/>' in xml and '<w:rtl/>' in xml)
        # PDF قابل للبحث
        await click('ocpdf'); await p.wait_for_selector('[data-act=dpsave]', timeout=60000); await p.wait_for_timeout(300)
        f = (await js(GETF))[0]; open(f'{OUT}/s.pdf', 'wb').write(base64.b64decode(f['b64'])); rd = PdfReader(f'{OUT}/s.pdf'); ex = rd.pages[0].extract_text() or ''
        print('PDF EXTRACT >>>', repr(ex))
        qc = subprocess.run(['qpdf', '--check', f'{OUT}/s.pdf'], capture_output=True, text=True)
        T('PDF قابل للبحث: qpdf سليم وصفحة واحدة بصورة', 'No syntax or stream encoding errors' in qc.stdout + qc.stderr and len(rd.pages) == 1 and len(rd.pages[0].images) == 1, (qc.stdout + qc.stderr)[-140:])
        T('PDF قابل للبحث: pypdf يستخرج النصين العربي والإنجليزي', all(norm(w) in norm(ex) for w in AR1.split()) and 'Case' in ex and '2026' in ex, ex[:120])
        r = await p.evaluate("async(b)=>{const L=await pxJs();const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const d=await L.getDocument({data:u}).promise;const pg=await d.getPage(1);const t=await pg.getTextContent();return t.items.map(i=>i.str).join(' ')}", f['b64'])
        T('PDF.js يقرأ طبقة النص (قابل للبحث/النسخ)', 'Case' in r and norm(AR1) in norm(r) and norm(AR2) in norm(r), r[:100])
        # بحث في المكتبة بنص OCR
        await js("DP.pw='';HD.save(true)"); await p.wait_for_timeout(600); await js("HD.q='الاقتصادية';HD.lib()"); await p.wait_for_selector('#hdl'); await p.wait_for_timeout(500)
        T('المكتبة: البحث بنص OCR يجد المستند', await p.locator('#hdl .dpt').count() == 1)
        # استرجاع النص من المكتبة
        await js("DP.items=[];HD.cur=null;HD.last=''"); await js("(async()=>{const d=(await HD.all('docs'))[0];await new Promise(r=>setTimeout(r,50));document.body.insertAdjacentHTML('beforeend','<button id=gx data-act=hdopen data-id=\"'+d.id+'\" style=display:none></button>');document.querySelector('#gx').click()})()"); await p.wait_for_selector('#ocb', timeout=20000)
        T('نص OCR يُستعاد من المكتبة', (await js("DP.items[0]._ocr&&DP.items[0]._ocr.text")).startswith(AR1))
        # قارئ QR
        await js("PRO.enabled=false;HD.q=''"); await click('qropen'); await p.wait_for_selector('#qrf', state='attached'); await p.set_input_files('#qrf', f'{FX}/qr.png'); await p.wait_for_selector('#qrr .pr', timeout=20000)
        qt = await js("document.querySelector('#qrr').innerText")
        T('قارئ QR يقرأ الرابط العربي المرمّز من صورة', 'https://example.com/case/12345?x=ا' in qt, qt[:80])
        T('زر فتح الرابط آمن (noopener) وزر النسخ', await p.locator('#qrr a[rel*=noopener]').count() == 1 and await p.locator('[data-act=qrcopy]').count() == 1)
        # QR داخل صفحة مشروع
        await js("async()=>{const b=await (await fetch('qr.png')).blob();DP.items=[await dpLoad(new File([b],'q.png',{type:'image/png'}))];dpWork()}"); await p.wait_for_selector('#ocb'); await click('qropen'); await click('qrpages'); await p.wait_for_selector('#qrr .pr', timeout=20000)
        T('QR من صفحات المشروع', 'example.com' in await js("document.querySelector('#qrr').innerText"))
        # PRO
        await js("PRO.enabled=true;window.proActive=()=>false;closeSheet();dpWork()"); await click('ocropen'); await click('ocrrun', v='all'); await p.wait_for_timeout(500)
        T('التعرف على النص مقيَّد بلا اشتراك', 'للمشتركين' in await js("document.querySelector('#sh').innerText"))
        T('لا أخطاء JavaScript', not E, E[:3])
        await b.close()
asyncio.run(main()); print(f'\n{sum(R)}/{len(R)} فحصاً ناجحاً'); sys.exit(0 if all(R) else 1)
