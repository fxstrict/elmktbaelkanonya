#!/usr/bin/env python3
"""اختبار N5 (مكتبة محلية + أدوات PDF) في Chromium بحجم هاتف.
الاستعمال: node tools/n5-fixtures.js /tmp/n5fx && python3 tools/n5-e2e.py /tmp/n5fx [/tmp/n5shots]"""
import sys, os, shutil, threading, http.server, functools, asyncio, base64, io, subprocess, json
from playwright.async_api import async_playwright
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'; SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/tmp/n5shots'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n5site'; os.makedirs(SHOTS, exist_ok=True)
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8775), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
from pypdf import PdfReader
HASH = "(it)=>{const c=dpRender(it),t=document.createElement('canvas');t.width=24;t.height=24;const x=t.getContext('2d');x.drawImage(c,0,0,24,24);const d=x.getImageData(0,0,24,24).data,o=[c.width,c.height];for(let i=0;i<d.length;i+=4)o.push(d[i]);return o}"
def same(a,b): return a[:2]==b[:2] and max(abs(x-y) for x,y in zip(a[2:],b[2:]))<=6
GETF = "async()=>{const o=[];for(const f of DP.res.files){const u=new Uint8Array(await f.blob.arrayBuffer());let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));o.push({name:f.name,type:f.type,b64:btoa(s)})}return o}"
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Service Worker' not in m.text else None)
        p.on('dialog', lambda dlg: asyncio.ensure_future(dlg.accept('')))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        async def boot():
            await p.goto('http://127.0.0.1:8775/index.html'); await p.wait_for_timeout(2000); await p.evaluate("closeSheet();PRO.enabled=false")
        async def load(path, name):
            await p.evaluate("document.querySelector('#gox')&&document.querySelector('#gox').click()"); await p.wait_for_selector('#pxf', state='attached'); await p.set_input_files('#pxf', path)
            await p.wait_for_function("PX.f&&PX.f.name=='%s'" % name, timeout=30000); await p.wait_for_selector('[data-act=pxorg]')
        async def files():
            return await p.evaluate(GETF)
        async def sel(act, **kw):
            q = f'[data-act={act}]' + ''.join(f'[data-{k}="{v}"]' for k, v in kw.items()); await p.wait_for_selector(q); await p.evaluate("(q)=>document.querySelector(q).click()", q)
        await boot(); await p.evaluate("PRO.enabled=false")
        T('hdb.js وpdftools.js مُحمَّلان', await p.evaluate("typeof HD=='object'&&typeof PX=='object'&&typeof pxEncrypt=='function'"))
        # ===== N5a: المكتبة المحلية =====
        await p.evaluate("async()=>{const b=await (await fetch('_fx/scan.png')).blob();DP.items.push(await dpLoad(new File([b],'scan.png',{type:'image/png'})));DP.name='قضية 123 توكيل';dpWork()}") if False else None
        shutil.copy(f'{FX}/scan.png', f'{SITE}/scan.png')
        await p.evaluate("async()=>{const b=await (await fetch('scan.png')).blob();for(let i=0;i<2;i++)DP.items.push(await dpLoad(new File([b],'scan'+i+'.png',{type:'image/png'})));DP.name='توكيل-اختبار';dpWork()}")
        t = await p.evaluate("document.querySelector('#sh').innerText")
        T('شاشة الصفحات تعرض حالة الحفظ التلقائي وزر المكتبة', 'مكتبتي' in t and ('تلقائياً' in t))
        T('حقل كلمة مرور PDF في الإخراج', await p.evaluate("!!document.querySelector('[data-dp=pw]')"))
        await p.evaluate("HD.save(true)"); await p.wait_for_timeout(600)
        rec = await p.evaluate("(async()=>{const d=await HD.all('docs');return d.map(x=>({id:x.id,pages:x.pages,name:x.name,size:x.size,th:!!x.thumb,kind:x.kind}))})()")
        T('حفظ المشروع في المكتبة (صفحتان بصورة مصغرة)', len(rec) == 1 and rec[0]['pages'] == 2 and rec[0]['th'] and rec[0]['name'] == 'توكيل-اختبار', rec)
        nb = await p.evaluate("(async()=>{const d=await HD.db.transaction('blobs').objectStore('blobs').count();return new Promise(r=>d.onsuccess=()=>r(d.result))})()")
        T('الصورتان محفوظتان كـ Blob', nb == 2, nb)
        h0 = [await p.evaluate("("+HASH+")(DP.items[%d])" % i) for i in range(2)]
        # تعديل ← حفظ تلقائي دوري
        await p.evaluate("dpOp(DP.items[0],{t:'rot',d:90})"); await p.wait_for_timeout(4800)
        st = await p.evaluate("document.querySelector('#hdst')&&document.querySelector('#hdst').textContent")
        d2 = await p.evaluate("(async()=>{const d=(await HD.all('docs'))[0];return d.items[0].ops.length})()")
        T('الحفظ التلقائي الدوري يلتقط التعديل بلا ضغط زر', d2 == 1, d2)
        nb2 = await p.evaluate("(async()=>{const d=await HD.db.transaction('blobs').objectStore('blobs').count();return new Promise(r=>d.onsuccess=()=>r(d.result))})()")
        T('لا إعادة ترميز للأصول عند التعديل (نفس عدد الـBlob)', nb2 == 2, nb2)
        h1 = await p.evaluate("("+HASH+")(DP.items[0])")
        # إغلاق وإعادة فتح الصفحة = استرجاع
        await boot()
        n = await p.evaluate("DP.items.length"); T('بعد إعادة تحميل الصفحة تبدأ الجلسة فارغة', n == 0)
        await p.evaluate("dpHome()"); await p.wait_for_timeout(500)
        t = await p.evaluate("document.querySelector('#sh').innerText")
        T('الرئيسية تعرض «استكمال آخر عمل» وزر المكتبة وأدوات PDF', 'استكمال آخر عمل' in t and 'توكيل-اختبار' in t and 'أدوات PDF' in t)
        await p.locator('[data-act=hdopen]').first.click(); await p.wait_for_timeout(900)
        n = await p.evaluate("DP.items.length"); h2 = await p.evaluate("("+HASH+")(DP.items[0])")
        T('فتح المستند يعيد الصفحتين بنفس العمليات والبكسلات', n == 2 and same(h1, h2), (h1[:4], h2[:4]))
        T('اسم المشروع يُستعاد', await p.evaluate("DP.name") == 'توكيل-اختبار')
        # تفاصيل: وسوم ومجلد وربط بقضية
        await p.evaluate("CLS.push({id:'c9',name:'محمد ضد علي',no:'123',year:'2026',sessions:[]})")
        await p.evaluate("HD.lib()"); await p.wait_for_selector('[data-act=hdinfo]'); await sel('hdinfo'); await p.wait_for_selector('#hdn')
        await p.fill('#hdn', 'توكيل رسمي'); await p.fill('#hdf', 'توكيلات'); await p.fill('#hdt', 'توكيل، عاجل'); await p.select_option('#hdc', 'c9'); await sel('hdsavei'); await p.wait_for_timeout(500)
        rec = await p.evaluate("(async()=>(await HD.all('docs'))[0])()")
        T('الاسم والمجلد والوسوم والربط بالقضية تُحفظ', rec['name'] == 'توكيل رسمي' and rec['folder'] == 'توكيلات' and rec['tags'] == ['توكيل', 'عاجل'] and rec['caseId'] == 'c9' and '123-2026' in rec['caseName'], rec['caseName'])
        T('الاسم الجديد ينتقل لمشروع الجلسة', await p.evaluate("DP.name") == 'توكيل رسمي')
        await p.fill('[data-hd=q]', 'عاجل'); await p.wait_for_timeout(300)
        T('البحث بالوسم', await p.locator('#hdl .dpt').count() == 1)
        await p.fill('[data-hd=q]', 'لا-يوجد'); await p.wait_for_timeout(300)
        T('البحث بلا نتيجة', await p.locator('#hdl .dpt').count() == 0)
        await p.fill('[data-hd=q]', 'محمد'); await p.wait_for_timeout(300)
        T('البحث باسم القضية', await p.locator('#hdl .dpt').count() == 1)
        await p.fill('[data-hd=q]', '')
        await p.evaluate("HD.folder='توكيلات';HD.lib()"); await p.wait_for_timeout(400)
        T('مرشح المجلد', await p.locator('#hdl .dpt').count() == 1)
        await p.evaluate("HD.folder='غيره';HD.lib()"); await p.wait_for_timeout(400)
        T('مرشح مجلد آخر فارغ', await p.locator('#hdl .dpt').count() == 0); await p.evaluate("HD.folder=null")
        # من ملف القضية
        await p.evaluate("HD.caseF='c9';HD.lib()"); await p.wait_for_timeout(400)
        T('مستندات القضية', await p.locator('#hdl .dpt').count() == 1); await p.evaluate("HD.caseF=''")
        # تصدير .hscan من المكتبة ثم فتحه عبر استوديو N4
        async with p.expect_download() as dl:
            await p.evaluate("HD.lib()"); await p.wait_for_selector('[data-act=hdexp]'); await sel('hdexp')
        d = await dl.value; path = f'{SHOTS}/lib.hscan'; await d.save_as(path)
        import zipfile; z = zipfile.ZipFile(path); nm = z.namelist(); mf = json.loads(z.read('manifest.json'))
        T('تصدير .hscan من المكتبة صالح (manifest + صفحتان)', 'manifest.json' in nm and len([x for x in nm if x.startswith('pages/')]) == 2 and mf['app'] == 'hscan' and len(mf['items']) == 2 and mf['items'][0]['ops'], nm)
        await p.evaluate("DP.items=[];HD.cur=null;HD.last=''")
        data = base64.b64encode(open(path, 'rb').read()).decode()
        await p.evaluate("async(b)=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));await ST.load(new File([u],'x.hscan'))}", data)
        T('الملف المصدَّر من المكتبة يُفتح بـ N4', await p.evaluate("DP.items.length") == 2)
        # توقيع محفوظ (اختياري)
        await p.evaluate("closeSheet();ST.sig=null"); await p.evaluate("stOpenView ? 0 : 0") if False else None
        await p.evaluate("dpWork()"); await p.locator('[data-act=stann][data-i="0"]').first.click(); await p.wait_for_selector('#stc')
        await p.locator('[data-act=sttool][data-v=sig]').first.click(); await p.wait_for_selector('#stsigf', state='attached'); await p.wait_for_selector('#hdsg')
        T('شريط التواقيع المحفوظة يظهر داخل استوديو التعليق (فارغ ولا حفظ تلقائي)', await p.evaluate("document.querySelector('#hdsg').querySelectorAll('[data-act=hdsiguse]').length") == 0 and await p.evaluate("(async()=>(await HD.all('assets')).filter(a=>a.kind=='sig').length)()") == 0)
        await p.evaluate("ST.sig={v:[[[10,10],[100,80],[200,20],[300,90]]],a:0.3,c:'#1f4e9c'};document.querySelector('[data-act=sttool][data-v=sig]').click()"); await p.wait_for_timeout(300)
        await p.wait_for_selector('[data-act=hdsigsave]'); await sel('hdsigsave'); await p.wait_for_timeout(500)
        ns = await p.evaluate("(async()=>(await HD.all('assets')).filter(a=>a.kind=='sig').length)()")
        T('حفظ التوقيع عند الطلب فقط', ns == 1)
        await p.evaluate("ST.sig=null"); await p.evaluate("document.querySelector('[data-act=sttool][data-v=sig]').click()"); await p.wait_for_selector('[data-act=hdsiguse]'); await sel('hdsiguse'); await p.wait_for_timeout(300)
        T('استعمال توقيع محفوظ يضبط ST.sig', await p.evaluate("!!ST.sig&&!!ST.sig.v&&ST.tool=='sig'"))
        await p.evaluate("closeSheet()")
        # حذف
        await p.evaluate("HD.save(true)"); await p.wait_for_timeout(400); await p.evaluate("HD.lib()"); await p.wait_for_selector('[data-act=hddel]')
        first = await p.evaluate("document.querySelector('[data-act=hddel]').dataset.id"); nd0 = await p.evaluate("(async()=>(await HD.all('docs')).length)()")
        await sel('hddel'); await p.wait_for_timeout(500)
        left = await p.evaluate("async(id)=>{const d=await HD.all('docs');const ks=await new Promise(r=>{const q=HD.db.transaction('blobs').objectStore('blobs').getAllKeys();q.onsuccess=()=>r(q.result)});return [d.some(x=>x.id==id),ks.filter(k=>String(k).startsWith(id+'/')).length,d.length]}", first)
        T('حذف مستند من المكتبة يحذف سجله وملفاته فقط', left[0] == False and left[1] == 0 and left[2] == nd0 - 1, (nd0, left))
        await p.evaluate("(async()=>{for(const d of await HD.all('docs'))await new Promise(r=>{const t=HD.db.transaction(['docs','blobs'],'readwrite');t.objectStore('docs').delete(d.id);t.objectStore('blobs').delete(IDBKeyRange.bound(d.id+'/',d.id+'/\\uffff'));t.oncomplete=r})})()"); await p.evaluate("DP.items=[];HD.cur=null")
        # ===== N5b: أدوات PDF =====
        await p.evaluate("DP.items=[];HD.cur=null;pxhome=0") if False else None
        await p.evaluate("closeSheet();DP.items=[];HD.cur=null;HD.last='';document.querySelector('body').insertAdjacentHTML('beforeend','<button id=gox data-act=pxhome style=display:none></button>');document.querySelector('#gox').click()")
        await p.wait_for_selector('#pxf', state='attached')
        await p.set_input_files('#pxf', f'{FX}/a.pdf'); await p.wait_for_selector('[data-act=pxorg]', timeout=20000)
        T('تحميل pdf-lib وPDF.js محلياً وقراءة ملف 5 صفحات', await p.evaluate("PX.f.n") == 5 and await p.evaluate("typeof pdfjsLib=='object'"))
        # تنظيم
        await sel('pxorg'); await p.wait_for_selector('.pxc'); await p.wait_for_function("document.querySelectorAll('.pxt img[src]').length>=5", timeout=20000)
        T('معاينة مصغرة لـ5 صفحات', await p.locator('.pxc').count() == 5)
        await p.screenshot(path=f'{SHOTS}/org.png')
        await p.locator('[data-pxs="1"]').check(); await p.locator('[data-pxs="2"]').check(); await sel('pxorot'); await p.wait_for_selector('.pxc'); await sel('pxosel', v='none'); await p.wait_for_selector('.pxc')
        await p.locator('[data-pxs="4"]').check(); await sel('pxodel'); await p.wait_for_selector('.pxc')
        T('حذف الصفحة المحددة', await p.locator('.pxc').count() == 4)
        await p.locator('[data-act=pxomv][data-i="0"][data-v="1"]').click(); await p.wait_for_selector('.pxc')
        await sel('pxosave'); await p.wait_for_selector('[data-act=dpsave]', timeout=20000)
        fl = await files(); pdf = PdfReader(io.BytesIO(base64.b64decode(fl[0]['b64'])))
        txt = [pg.extract_text() for pg in pdf.pages]; rots = [pg.get('/Rotate', 0) for pg in pdf.pages]
        T('تنظيم: 4 صفحات بالترتيب الجديد والنص محفوظ', len(pdf.pages) == 4 and 'Page 2' in txt[0] and 'Page 1' in txt[1] and 'Page 3' in txt[2] and 'Page 4' in txt[3], txt)
        T('تنظيم: التدوير طُبّق على الصفحتين المحددتين فقط', rots == [90, 0, 90, 0], rots)
        # فتح في الاستوديو
        await p.evaluate("document.querySelector('#gox').click()") ; await p.wait_for_selector('[data-act=pxstudio]')
        await sel('pxstudio'); await p.wait_for_selector('#pxr'); await p.fill('#pxr', '1-3'); await sel('pxstudiorun'); await p.wait_for_selector('[data-act=dprun]', timeout=20000)
        T('فتح PDF كصفحات في الاستوديو (3 صفحات)', await p.evaluate("DP.items.length") == 3 and await p.evaluate("DP.items[0].orig.width>600"))
        await p.evaluate("DP.items=[];DP.name='';HD.cur=null")
        # تقسيم
        await p.evaluate("document.querySelector('#gox').click()"); await p.wait_for_selector('[data-act=pxsplit]'); await sel('pxsplit'); await p.wait_for_selector('[data-px=sptxt]')
        await p.fill('[data-px=sptxt]', '٣-٥, 1'); T('خطة التقسيم تقبل الأرقام العربية', '2 ملف' in await p.inner_text('#pxpl'))
        await sel('pxsprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=20000); fl = await files()
        ps = [PdfReader(io.BytesIO(base64.b64decode(x['b64']))) for x in fl]
        T('تقسيم بمدى: ملفان (3 صفحات + صفحة) بالأسماء الصحيحة', [len(x.pages) for x in ps] == [3, 1] and fl[0]['name'].endswith('ص3-5.pdf') and 'Page 3' in ps[0].pages[0].extract_text() and 'Page 1' in ps[1].pages[0].extract_text(), [x['name'] for x in fl])
        await p.evaluate("document.querySelector('#gox').click()"); await sel('pxsplit'); await p.wait_for_selector('[data-px=sptxt]'); await sel('pxspm', v='each'); await sel('pxsprun'); await p.wait_for_selector('[data-act=dpzip],[data-act=pxzip]', timeout=20000)
        T('تقسيم كل صفحة ملف (5 ملفات + زر ZIP)', len(await files()) == 5 and await p.locator('[data-act=pxzip]').count() == 1)
        async with p.expect_download() as dl: await sel('pxzip')
        d = await dl.value; zp = f'{SHOTS}/sp.zip'; await d.save_as(zp); T('ZIP التقسيم صالح', len(zipfile.ZipFile(zp).namelist()) == 5)
        # دمج: pdf + pdf + صورة
        await p.evaluate("document.querySelector('#gox').click()"); await p.wait_for_selector('#pxm', state='attached')
        await p.set_input_files('#pxm', [f'{FX}/a.pdf', f'{FX}/b.pdf', f'{FX}/scan.png']); await p.wait_for_selector('[data-act=pxmgrun]', timeout=20000); await p.wait_for_timeout(500)
        T('قائمة الدمج: 3 عناصر', await p.locator('[data-act=pxmgdel]').count() == 3)
        await p.locator('[data-act=pxmgmv][data-i="1"][data-v="-1"]').click(); await p.wait_for_selector('[data-act=pxmgrun]')
        await sel('pxmgrun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000); fl = await files(); pdf = PdfReader(io.BytesIO(base64.b64decode(fl[0]['b64'])))
        T('دمج: 9 صفحات بترتيب القائمة والنص محفوظ', len(pdf.pages) == 9 and 'BBB Page 1' in pdf.pages[0].extract_text() and 'AAA Page 1' in pdf.pages[3].extract_text() and len(pdf.pages[8].images) == 1, [pg.extract_text()[:12] for pg in pdf.pages][:4])
        # ضغط
        await load(f'{FX}/big.pdf', 'big')
        await sel('pxcomp'); await p.wait_for_selector('[data-act=pxcprun]'); await sel('pxcprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=40000); fl = await files()
        raw = base64.b64decode(fl[0]['b64']); orig = os.path.getsize(f'{FX}/big.pdf')
        T('ضغط متوسط ينقص الحجم كثيراً ويحفظ عدد الصفحات والمقاس', len(raw) < orig * 0.5 and len(PdfReader(io.BytesIO(raw)).pages) == 2 and abs(float(PdfReader(io.BytesIO(raw)).pages[0].mediabox.height) - 420) < 1, (orig, len(raw), len(PdfReader(io.BytesIO(raw)).pages), PdfReader(io.BytesIO(raw)).pages[0].mediabox))
        await p.evaluate("document.querySelector('#gox').click()"); await sel('pxcomp'); await p.wait_for_selector('[data-px=cpkb]'); await p.fill('[data-px=cpkb]', '120'); await sel('pxcprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=40000); fl = await files()
        T('ضغط بحجم مستهدف 120 ك.ب', len(base64.b64decode(fl[0]['b64'])) <= 125 * 1024 * 1.1, len(base64.b64decode(fl[0]['b64'])))
        # PDF → صور
        await load(f'{FX}/a.pdf', 'a'); await sel('pximg'); await p.wait_for_selector('[data-px=imrng]'); await p.fill('[data-px=imrng]', '2-3'); await sel('pximf', v='png'); await sel('pximrun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000); fl = await files()
        from PIL import Image
        ims = [Image.open(io.BytesIO(base64.b64decode(x['b64']))) for x in fl]
        T('PDF إلى صور PNG لصفحتين بدقة صحيحة', len(ims) == 2 and ims[0].format == 'PNG' and max(ims[0].size) == 1800 and fl[0]['name'].endswith('ص2.png'), (len(ims), ims[0].size, fl[0]['name']))
        # حماية بكلمة مرور
        await p.evaluate("document.querySelector('#gox').click()"); await sel('pxlock'); await p.wait_for_selector('#pxpw'); await p.fill('#pxpw', 'Abc123'); await p.fill('#pxpw2', 'Abc123'); await sel('pxlockrun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000); fl = await files()
        enc = base64.b64decode(fl[0]['b64']); open(f'{SHOTS}/enc.pdf', 'wb').write(enc)
        q = subprocess.run(['qpdf', '--password=Abc123', '--check', f'{SHOTS}/enc.pdf'], capture_output=True, text=True); q2 = subprocess.run(['qpdf', '--show-encryption', '--password=Abc123', f'{SHOTS}/enc.pdf'], capture_output=True, text=True)
        q3 = subprocess.run(['qpdf', '--password=Wrong1', '--check', f'{SHOTS}/enc.pdf'], capture_output=True, text=True)
        T('qpdf يقبل الملف المشفّر بكلمة المرور (AES-128)', q.returncode in (0, 3) and 'No syntax or stream encoding errors' in q.stdout + q.stderr and 'AESv2' in q2.stdout + q2.stderr, (q.stdout + q.stderr)[:200] + '|' + q2.stdout[:200])
        T('كلمة مرور خاطئة تُرفض', q3.returncode == 2 and 'invalid password' in (q3.stdout + q3.stderr))
        rd = PdfReader(f'{SHOTS}/enc.pdf'); T('pypdf: الملف مشفّر ويُفتح بالكلمة ويُقرأ نصه', rd.is_encrypted and rd.decrypt('Abc123') > 0 and len(rd.pages) == 5 and 'AAA Page 3' in rd.pages[2].extract_text() and rd.metadata.title == 'AAA', rd.metadata)
        T('نص الصفحات غير مقروء دون كلمة المرور', b'quick brown' not in enc)
        # PDF.js يفتح المشفَّر بالكلمة
        r = await p.evaluate("async(b)=>{const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const f={bytes:u,pw:'',name:'e'};let msg='';try{await pdfjsLib.getDocument({data:u.slice()}).promise}catch(e){msg=e.name}const d=await pdfjsLib.getDocument({data:u.slice(),password:'Abc123'}).promise;return [msg,d.numPages]}", fl[0]['b64'])
        T('PDF.js يطلب كلمة المرور ثم يفتحه بها', r == ['PasswordException', 5], r)
        # فتح ملف محمي في الأدوات (يطلب كلمة، يعمل التحويل لصور، ويرفض التنظيم)
        p.remove_listener('dialog', p.listeners('dialog')[0]) if False else None
        # نموذج
        await load(f'{FX}/form.pdf', 'form'); await sel('pxform'); await p.wait_for_selector('[data-pxfi]')
        T('قراءة حقول النموذج (4)', await p.locator('[data-pxfi]').count() == 4)
        await p.locator('[data-pxfi="0"]').fill('John Smith'); await p.locator('[data-pxfi="1"]').fill('القاهرة'); await p.locator('[data-pxfi="2"]').check(); await p.locator('[data-pxfi="3"]').select_option('two')
        await sel('pxformrun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000); fl = await files(); rd = PdfReader(io.BytesIO(base64.b64decode(fl[0]['b64']))); fv = rd.get_fields() or {}
        T('تعبئة: الإنجليزي حقل حيّ، والمربع والقائمة', fv.get('full_name', {}).get('/V') == 'John Smith' and fv.get('agree', {}).get('/V') == '/Yes' and fv.get('kind', {}).get('/V') in ('two', ['two']), {k: v.get('/V') for k, v in fv.items()})
        T('تعبئة العربي: رُسم كصورة وأُزيل حقله', 'city' not in fv and len(rd.pages[0].images) == 1, list(fv))
        # إظهار فعلي
        await p.evaluate("PX.f.bytes=PX.f.bytes"); 
        # تصدير الاستوديو بكلمة مرور
        shutil.copy(f'{FX}/scan.png', f'{SITE}/scan.png')
        await p.evaluate("closeSheet();DP.items=[];DP.name='';DP.pw='';DP.res=null"); await p.evaluate("async()=>{const b=await (await fetch('scan.png')).blob();DP.items.push(await dpLoad(new File([b],'s.png',{type:'image/png'})));DP.out='pdf';DP.kb='';dpWork()}")
        await p.locator('[data-dp=pw]').fill('bad ٣'); await p.locator('[data-dp=pw]').blur(); await sel('dprun'); await p.wait_for_timeout(600)
        T('كلمة مرور غير إنجليزية تمنع التصدير', await p.evaluate("DP.res==null||!DP.res.files.length") and await p.locator('[data-act=dpsave]').count() == 0)
        await p.locator('[data-dp=pw]').fill('Sec9z'); await p.locator('[data-dp=pw]').blur(); await sel('dprun'); await p.wait_for_selector('[data-act=dpsave]', timeout=30000); await p.wait_for_timeout(300)
        fl = await files(); open(f'{SHOTS}/exp.pdf', 'wb').write(base64.b64decode(fl[0]['b64'])); rd = PdfReader(f'{SHOTS}/exp.pdf')
        T('تصدير الاستوديو PDF بكلمة مرور (مشفّر ويُفتح بها وفيه صورة)', rd.is_encrypted and rd.decrypt('Sec9z') > 0 and len(rd.pages) == 1 and len(rd.pages[0].images) == 1)
        T('رسالة الحماية في شاشة النتيجة', '🔒' in await p.evaluate("document.querySelector('#sh').innerText"))
        # حفظ PDF في المكتبة وفتحه منها
        await p.evaluate("closeSheet();DP.items=[];DP.pw='';HD.cur=null;document.querySelector('#gox').click()"); await p.set_input_files('#pxf', f'{FX}/a.pdf'); await p.wait_for_function("PX.f&&PX.f.name=='a'"); await p.wait_for_selector('[data-act=pxsavef]'); await sel('pxsavef'); await p.wait_for_timeout(800)
        await p.evaluate("PX.f=null;HD.lib()"); await p.wait_for_selector('[data-act=hdopen]')
        T('PDF محفوظ في المكتبة بصورة مصغرة', await p.evaluate("(async()=>{const d=(await HD.all('docs')).filter(x=>x.kind=='pdf');return d.length==1&&d[0].thumb.length>100})()"))
        await sel('hdopen'); await p.wait_for_selector('[data-act=pxorg]', timeout=20000); T('فتح PDF من المكتبة يعيد أدواته', await p.evaluate("PX.f&&PX.f.n")==5)
        await p.screenshot(path=f'{SHOTS}/tools.png')
        T('لا أخطاء JavaScript', not E, E[:3])
        await b.close()
asyncio.run(main()); print(f'\n{sum(R)}/{len(R)} فحصاً ناجحاً'); sys.exit(0 if all(R) else 1)
