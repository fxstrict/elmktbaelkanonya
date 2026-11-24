#!/usr/bin/env python3
"""اختبار N11 في Chromium بحجم هاتف عبر واجهة التطبيق الفعلية: OCR حقيقي على صفحة عربية «سيئة» صناعية (ميل + ختم أزرق وأسود + توقيع + خط يدوي + إطار + حافة ماسح + ضجيج JPEG)
قبل N11 (بدون تحسين) وبعده (كتلة وسطراً سطراً)، مع فحص المعاينة والسقوط الصامت وPDF القابل للبحث.
الاستعمال: python3 tools/n11-fixtures.py /tmp/n11fx && python3 tools/n11-e2e.py /tmp/n11fx"""
import sys, os, shutil, threading, http.server, functools, asyncio, json, re, difflib, base64
from playwright.async_api import async_playwright
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n11fx'; ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n11esite'
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
for f in os.listdir(FX):
    if f.endswith('.jpg'): shutil.copy(f'{FX}/{f}', f'{SITE}/{f}')
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8794), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
GT = json.load(open(f'{FX}/gt.json')); R = []
def T(n, c, extra=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
norm = lambda s: re.sub(r'[^\w]', '', s.replace('_', ''))
sim = lambda a, b: difflib.SequenceMatcher(None, norm(a), norm(b), autojunk=False).ratio()
LOAD = "async(n)=>{const r=await fetch(n+'.jpg'),b=await r.blob();DP.items.length=0;DP.items.push(await dpLoad(new File([b],n+'.jpg',{type:'image/jpeg'})));DP.name=n;dpWork()}"
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Service Worker' not in m.text and 'diacritics' not in m.text and 'Estimating resolution' not in m.text else None)
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept(''))); await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        js = lambda c, *a: p.evaluate(c, *a) if a else p.evaluate(c)
        async def click(act, **kw):
            q = f'[data-act={act}]' + ''.join(f'[data-{k}="{v}"]' for k, v in kw.items()); await p.wait_for_selector(q); await p.evaluate("(q)=>document.querySelector(q).click()", q)
        async def ocr(name, prep, mode):
            await js(LOAD, name); await p.wait_for_selector('#ocb'); await js(f"OC.prep={'true' if prep else 'false'};OC.mode='{mode}'"); await click('ocropen'); await p.wait_for_selector('[data-act=ocrrun]')
            await click('ocrrun', v='all'); await p.wait_for_selector('.octa', timeout=240000); return await js("DP.items[0]._ocr")
        await p.goto('http://127.0.0.1:8794/index.html'); await p.wait_for_timeout(2000); await js("closeSheet();PRO.enabled=false")
        T('ocrprep.js مُحمَّل وواجهة الخيارات في شاشة OCR', await js("typeof OP=='object'&&typeof OP.recognize=='function'"))
        await js(LOAD, 'page_hard'); await p.wait_for_selector('#ocb'); await click('ocropen'); await p.wait_for_selector('[data-act=ocrrun]')
        T('شاشة OCR فيها خيار التحسين وأوضاع الكتلة/السطر', await p.locator('[data-act=ocrprep]').count() == 2 and await p.locator('[data-act=ocrmode]').count() == 2)
        await click('ocrmode', v='lines'); await p.wait_for_selector('[data-act=ocrmode]'); T('اختيار «سطراً سطراً» يُحفظ', await js("OC.mode")=='lines'); await click('ocrmode', v='block')
        g = '\n'.join(GT['page_hard']['lines'])
        o0 = await ocr('page_hard', False, 'block'); s0 = sim(g, o0['text']); print('   قبل N11:', repr(o0['text'][:120]))
        o1 = await ocr('page_hard', True, 'block'); s1 = sim(g, o1['text']); print('   بعد N11 (كتلة):', repr(o1['text'][:120]))
        T(f'الصفحة الصعبة: التشابه مع الأصل {s0:.3f} → {s1:.3f} (كتلة)', s1 >= 0.97 and s1 >= s0 + 0.10)
        T('نتيجة N11 فيها معلومات التحضير (الميلان والارتفاع) والكلمات بمواضع', o1.get('pi') and abs(o1['pi']['skew'] + GT['page_hard']['tilt']) <= 0.4 and o1['pi']['H'] > 10 and len(o1['words']) >= 40, o1.get('pi', {}).get('skew'))
        T('لا نص قمامة لاتيني من الأختام في نتيجة N11', not re.search(r'[A-Za-z]{3,}', o1['text']), re.findall(r'.{0,12}[A-Za-z]{3,}.{0,12}', o1['text']))
        pv = await js("!!DP.items[0]._ocrPrev&&DP.items[0]._ocrPrev.startsWith('data:image')"); T('معاينة «ما رآه المحرك» متاحة', pv)
        await click('ocprev', i='0'); await p.wait_for_selector('#sh img'); T('شاشة المعاينة تعرض الصورة وجدول المعلومات', await p.locator('#sh img').count() == 1 and await p.locator('#sh .pr').count() >= 6)
        await click('ocrres'); await p.wait_for_selector('.octa')
        o2 = await ocr('page_hard', True, 'lines'); s2 = sim(g, o2['text']); T(f'وضع «سطراً سطراً»: التشابه {s2:.3f}', s2 >= 0.97 and o2['conf'] >= 85)
        T('وضع السطر يستبعد مقاطع الخط اليدوي ويذكرها', len(o2.get('dropped') or []) >= 1 and await p.locator('text=مقطعاً قليل الثقة').count() >= 1, (o2.get('dropped') or [])[:3])
        # صفحة نظيفة بلا أختام: لا ضرر
        gt2 = '\n'.join(GT['page_tilt_only']['lines']); a = await ocr('page_tilt_only', False, 'block'); c = await ocr('page_tilt_only', True, 'block')
        T('صفحة مائلة نظيفة: N11 لا يسوّئ النتيجة', sim(gt2, c['text']) >= sim(gt2, a['text']) - 0.005, (round(sim(gt2, a['text']), 3), round(sim(gt2, c['text']), 3)))
        # جدول بلا خطوط: حارس التغطية يمنع ضياعه (كان يضيع في وضع الكتلة وحده)
        TBL = "async()=>{const c=document.createElement('canvas');c.width=1700;c.height=1500;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1700,1500);x.fillStyle='#000';x.direction='rtl';x.textAlign='right';x.font='54px \"DejaVu Sans\",Arial,sans-serif';['محكمة القاهرة الجديدة الابتدائية','القضية رقم 1234 لسنة 2026 مدني كلي'].forEach((t,i)=>x.fillText(t,1620,110+i*110));[['م','الاسم','المبلغ'],['1','أحمد علي','500'],['2','سارة حسن','750'],['3','عمر خالد','1200']].forEach((r,ri)=>r.forEach((t,ci)=>x.fillText(t,[1600,1000,400][ci],520+ri*120)));const b=await new Promise(r=>c.toBlob(r,'image/png'));DP.items=[await dpLoad(new File([b],'t.png',{type:'image/png'}))];DP.name='t';dpWork()}"
        await js(TBL); await p.wait_for_selector('#ocb'); await js("OC.prep=true;OC.mode='block'"); await click('ocropen'); await click('ocrrun', v='all'); await p.wait_for_selector('.octa', timeout=240000)
        tt = (await js("DP.items[0]._ocr")); T('جدول بلا خطوط: أرقامه 500 و750 و1200 تبقى في النص (حارس التغطية)', all(n in tt['text'] for n in ('500', '750', '1200')), tt['text'][-60:])
        # PDF قابل للبحث بعد N11: الكلمات بإحداثيات الصفحة الأصلية (بعد فك التدوير)
        await js(LOAD, 'page_hard'); await p.wait_for_selector('#ocb'); await js("OC.prep=true;OC.mode='block'"); await click('ocropen'); await click('ocrrun', v='all'); await p.wait_for_selector('.octa', timeout=240000)
        W = await js("DP.items[0]._ocr.words.slice(0,30).map(w=>[w.x0,w.y0,w.x1,w.y1])"); ow, oh = await js("[DP.items[0]._ocr.w,DP.items[0]._ocr.h]")
        T('إحداثيات الكلمات داخل حدود الصفحة الأصلية وبأبعاد معقولة', all(-5 <= x0 < x1 <= ow + 5 and -5 <= y0 < y1 <= oh + 5 and 5 < (y1 - y0) < 200 for x0, y0, x1, y1 in W), W[:2])
        await click('ocpdf'); await p.wait_for_selector('[data-act=dpsave]', timeout=90000); T('PDF قابل للبحث يُبنى من نتيجة N11', True)
        # سقوط صامت: عطل في N11 ⇒ المسار القديم ويعطي نصاً
        await js("window.__r=OP.recognize;OP.recognize=async()=>{throw new Error('boom')};0"); o3 = await ocr('page_tilt_only', True, 'block'); await js("OP.recognize=window.__r;0")
        T('عطل N11 ⇒ سقوط صامت للمسار القديم ويعطي نصاً', sim(gt2, o3['text']) >= 0.9 and not o3.get('pi'), round(sim(gt2, o3['text']), 3))
        await p.wait_for_timeout(300); T('لا أخطاء JavaScript', not E, E[:3])
        await b.close()
asyncio.run(main()); print(f'\n{sum(R)} نجح، {len(R) - sum(R)} فشل'); sys.exit(0 if all(R) else 1)
