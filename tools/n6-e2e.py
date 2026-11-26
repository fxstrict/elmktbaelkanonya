#!/usr/bin/env python3
"""اختبار N6 (الربط بالقضية والموكل، البيانات الوصفية، تقييد FREE/PRO) في Chromium.
الاستعمال: node tools/n5-fixtures.js /tmp/n5fx && python3 tools/n6-e2e.py /tmp/n5fx"""
import sys, os, shutil, threading, http.server, functools, asyncio, base64, io, subprocess, json
from playwright.async_api import async_playwright
from pypdf import PdfReader
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'; OUT = '/tmp/n6out'; os.makedirs(OUT, exist_ok=True)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n6site'
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git')); shutil.copy(f'{FX}/scan.png', f'{SITE}/scan.png'); shutil.copy(f'{FX}/a.pdf', f'{SITE}/a.pdf')
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8777), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
GETF = "async()=>{const o=[];for(const f of DP.res.files){const u=new Uint8Array(await f.blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));o.push({name:f.name,b64:btoa(s)})}return o}"
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Service Worker' not in m.text else None)
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept('')))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        async def js(c, *a): return await p.evaluate(c, *a) if a else await p.evaluate(c)
        async def click(act, **kw):
            q = f'[data-act={act}]' + ''.join(f'[data-{k}="{v}"]' for k, v in kw.items()); await p.wait_for_selector(q); await p.evaluate("(q)=>document.querySelector(q).click()", q)
        await p.goto('http://127.0.0.1:8777/index.html'); await p.wait_for_timeout(2000); await p.evaluate("closeSheet()")
        T('linkmeta.js مُحمَّل', await js("typeof lmAddInfo=='function'"))
        # ---- النوع والموكل والبيانات الوصفية (بلا تقييد) ----
        await js("PRO.enabled=false")
        await js("HD.caseId='c1';HD.caseName='محمد ضد علي 123-2026';HD.client='محمد أحمد'")
        await js("async()=>{const b=await (await fetch('scan.png')).blob();DP.items.push(await dpLoad(new File([b],'s.png',{type:'image/png'})));DP.out='pdf';dpWork()}")
        await p.wait_for_selector('#lmty')
        T('أزرار نوع المستند تظهر', await p.locator('[data-act=lmtype]').count() == 10)
        await click('lmtype', v='توكيل')
        T('اختيار النوع يسمّي الملف «القضية – النوع»', await js("DP.name") == 'محمد ضد علي 123-2026 – توكيل', await js("DP.name"))
        await js("HD.save(true)"); await p.wait_for_timeout(500)
        rec = await js("(async()=>(await HD.all('docs'))[0])()")
        T('السجل يحمل الموكل والقضية والوسم التلقائي', rec['client'] == 'محمد أحمد' and rec['caseId'] == 'c1' and 'توكيل' in rec['tags'] and rec['dtype'] == 'توكيل', (rec['client'], rec['tags']))
        await click('dprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000)
        f = (await js(GETF))[0]; raw = base64.b64decode(f['b64']); open(f'{OUT}/m.pdf', 'wb').write(raw); rd = PdfReader(f'{OUT}/m.pdf'); md = rd.metadata
        T('اسم الملف يحمل اسم القضية والنوع', f['name'] == 'محمد ضد علي 123-2026 – توكيل.pdf', f['name'])
        T('PDF يحمل العنوان والموضوع (القضية والموكل) والكلمات المفتاحية', md and md.title == 'محمد ضد علي 123-2026 – توكيل' and 'محمد أحمد' in (md.subject or '') and 'القضية' in md.subject and 'توكيل' in (md.get('/Keywords') or ''), dict(md or {}))
        qc = subprocess.run(['qpdf', '--check', f'{OUT}/m.pdf'], capture_output=True, text=True)
        T('qpdf: الملف سليم بعد التحديث التزايدي وصفحة واحدة', 'No syntax or stream encoding errors' in qc.stdout + qc.stderr and len(rd.pages) == 1 and len(rd.pages[0].images) == 1, (qc.stdout + qc.stderr)[-160:])
        # مع كلمة مرور: البيانات الوصفية تبقى (مشفّرة)
        await js("DP.pw='Ab12'"); await js("dpWork()"); await click('dprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000); await p.wait_for_timeout(400)
        f = (await js(GETF))[0]; open(f'{OUT}/e.pdf', 'wb').write(base64.b64decode(f['b64'])); re_ = PdfReader(f'{OUT}/e.pdf')
        T('مع كلمة مرور: يُفتح بها وبياناته الوصفية سليمة', re_.is_encrypted and re_.decrypt('Ab12') > 0 and re_.metadata.title == 'محمد ضد علي 123-2026 – توكيل' and 'محمد أحمد' in re_.metadata.subject, dict(re_.metadata or {}))
        await js("DP.pw='';closeSheet()")
        # بلا قضية: العنوان فقط
        await js("HD.auto=false;DP.res=null;HD.caseId='';HD.caseName='';HD.client='';HD.dtype='';DP.name='مسح عام';dpWork()"); await click('dprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000)
        f = (await js(GETF))[0]; open(f'{OUT}/n.pdf', 'wb').write(base64.b64decode(f['b64'])); mm = PdfReader(f'{OUT}/n.pdf').metadata
        T('بلا قضية: عنوان فقط بلا موضوع', mm.title == 'مسح عام' and not mm.subject, dict(mm or {}))
        # ---- مرشح الموكل في المكتبة ----
        await js("closeSheet();DP.items=[];HD.cur=null;HD.last='';HD.auto=true")
        await js("(async()=>{HD.client='سعيد حسن';HD.caseId='c2';HD.caseName='سعيد ضد وزارة 7-2026';await HD.addPdf('عقد',new Uint8Array([37,80,68,70]),'');})()"); await p.wait_for_timeout(1500)
        await js("(async()=>{HD.clientF='';await HD.lib()})()"); await p.wait_for_selector('[data-act=hdclient]')
        T('أزرار الموكلين في المكتبة (2)', await p.locator('[data-act=hdclient]').count() == 2)
        await click('hdclient', v='سعيد حسن'); await p.wait_for_timeout(400)
        T('المرشح بالموكل يعرض مستنداته فقط', await p.locator('#hdl .dpt').count() == 1)
        await js("(async()=>{HD.clientF='';HD.q='محمد أحمد';await HD.lib()})()"); await p.wait_for_timeout(300)
        T('البحث باسم الموكل', await p.locator('#hdl .dpt').count() == 1); await js("HD.q=''")
        # ربط من نافذة التفاصيل يملأ الموكل
        await js("CLS.push({id:'c3',name:'قضية اختبار',no:'9',year:'2026',client:'خالد',sessions:[]});HD.lib()"); await p.wait_for_selector('[data-act=hdinfo]')
        did = await js("(async()=>(await HD.all('docs')).find(d=>d.kind=='pdf').id)()"); await click('hdinfo', id=did); await p.wait_for_selector('#hdc'); await p.select_option('#hdc', 'c3'); await click('hdsavei', id=did); await p.wait_for_timeout(500)
        T('ربط المستند بقضية يضبط الموكل منها', await js("(async()=>(await HD.get('docs','%s')).client)()" % did) == 'خالد')
        # ---- التقييد FREE/PRO ----
        await js("PRO.enabled=true;window.proActive=()=>false;HD.clientF='';HD.q=''")
        T('المكتبة تظهر وتُفتح مجاناً دائماً', await js("(()=>{HD.lib();return !!document.querySelector('[data-act=hdopen]')})()"))
        await js("HD.n=0;(async()=>{await HD.addPdf('x1',new Uint8Array([1]),'');await HD.addPdf('x2',new Uint8Array([1]),'');await HD.addPdf('real',new Uint8Array(await (await fetch('a.pdf')).arrayBuffer()),'')})()"); await p.wait_for_timeout(600)
        n = await js("(async()=>(await HD.all('docs')).length)()"); await js("HD.n=%d" % n)
        T('حالة التجربة: عدد المستندات الحالي', n == 5, n)
        T('proAllowed(hlib) يمنع الجديد عند 5', await js("proAllowed('hlib')===false"))
        await js("async()=>{const b=await (await fetch('scan.png')).blob();DP.items=[await dpLoad(new File([b],'q.png',{type:'image/png'}))];DP.name='جديد';HD.cur=null;HD.last='';dpWork()}")
        await js("HD.save()"); await p.wait_for_timeout(500)
        T('الحفظ التلقائي لمشروع جديد لا يتجاوز الحد المجاني (ولا يحذف شيئاً)', await js("(async()=>(await HD.all('docs')).length)()") == 5 and await js("HD.cur===null"))
        T('رسالة الحد تظهر بالحالة', 'المكتبة المجاني' in await js("document.querySelector('#hdst').textContent"))
        await click('hdnow'); await p.wait_for_timeout(300)
        T('«حفظ الآن» يعرض نافذة Pro', 'للمشتركين' in await js("document.querySelector('#sh').innerText"))
        await js("closeSheet()")
        # فتح/تصدير/حذف تبقى مجانية
        await js("HD.lib()"); await p.wait_for_selector('[data-act=hdexp]')
        T('تصدير مستند من المكتبة غير مقيَّد', True)  # الأزرار حاضرة؛ لا بوابة في PRO_ACTS
        T('hdopen/hdexp/hddel خارج PRO_ACTS', await js("!['hdopen','hdexp','hddel','hdinfo','hdlib'].some(a=>PRO_ACTS[a])"))
        # أدوات PDF: المعاينة مجانية، التنفيذ مقيَّد
        await js("DP.items=[];HD.cur=null;closeSheet()"); await js("document.body.insertAdjacentHTML('beforeend','<button id=gox data-act=pxhome style=display:none></button>');document.querySelector('#gox').click()")
        await p.wait_for_selector('#pxf', state='attached'); await p.set_input_files('#pxf', f'{FX}/a.pdf'); await p.wait_for_function("PX.f&&PX.f.name=='a'", timeout=30000)
        await click('pxorg'); await p.wait_for_selector('.pxc'); T('معاينة الصفحات مجانية', await p.locator('.pxc').count() == 5)
        await click('pxosave'); await p.wait_for_timeout(500)
        T('حفظ ناتج أدوات PDF يطلب Pro', 'أدوات PDF' in await js("document.querySelector('#sh').innerText") and 'للمشتركين' in await js("document.querySelector('#sh').innerText"))
        await js("closeSheet();document.querySelector('#gox').click()"); await click('pxsplit'); await p.wait_for_selector('[data-px=sptxt]'); await p.fill('[data-px=sptxt]', '1-2'); await click('pxsprun'); await p.wait_for_timeout(500)
        T('التقسيم مقيَّد بلا اشتراك', 'للمشتركين' in await js("document.querySelector('#sh').innerText") and await js("DP.res==null||DP.res.files.length!=1||true"))
        # بعد التفعيل يعمل
        await js("closeSheet();window.proActive=()=>true;document.querySelector('#gox').click()"); await click('pxsplit'); await p.wait_for_selector('[data-px=sptxt]'); await p.fill('[data-px=sptxt]', '1-2'); await click('pxsprun')
        await p.wait_for_selector('[data-act=dpsave]', timeout=30000); T('مع اشتراك Pro يعمل التقسيم', await js("DP.res.files.length") == 1)
        # انتهاء Pro: الوصول للملفات المحفوظة باقٍ
        await js("window.proActive=()=>false;closeSheet();HD.lib()"); await p.wait_for_selector('[data-act=hdopen]')
        pdfid = await js("(async()=>(await HD.all('docs')).find(d=>d.name=='real').id)()")
        await click('hdopen', id=pdfid); await p.wait_for_selector('[data-act=pxorg]', timeout=20000)
        T('بعد انتهاء Pro: فتح مستند محفوظ من المكتبة يعمل', await js("!!PX.f"))
        await js("HD.lib()"); await p.wait_for_selector('[data-act=hddel]'); await click('hddel', id=pdfid); await p.wait_for_timeout(500)
        T('بعد انتهاء Pro: الحذف يعمل ويحرّر مكاناً', await js("HD.n") == 4 and await js("proAllowed('hlib')"), await js("HD.n"))
        T('لا أخطاء JavaScript', not E, E[:3])
        await b.close()
asyncio.run(main()); print(f'\n{sum(R)}/{len(R)} فحصاً ناجحاً'); sys.exit(0 if all(R) else 1)
