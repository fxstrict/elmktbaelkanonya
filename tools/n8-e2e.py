#!/usr/bin/env python3
"""اختبار N8 (استخراج البيانات القانونية + الجداول → Excel/CSV + المراجعة البشرية) في Chromium بحجم هاتف، ثم مرور واحد بـOCR حقيقي على صفحة مرندرة.
يحتاج: node tools/n5-fixtures.js /tmp/n5fx (للـscan.png) وopenpyxl. الاستعمال: python3 tools/n8-e2e.py /tmp/n5fx"""
import sys, os, shutil, threading, http.server, functools, asyncio, json, csv, io
from playwright.async_api import async_playwright
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'; OUT = '/tmp/n8out'; os.makedirs(OUT, exist_ok=True)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n8site'
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git')); shutil.copy(f'{FX}/scan.png', f'{SITE}/scan.png')
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Q, directory=SITE)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8780), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
DOC = """محكمة القاهرة الجديدة الابتدائية
القضية رقم ١٢٣٤ لسنة ٢٠٢٦ مدني كلي
المدعي: السيد/ محمد أحمد علي المقيم بالقاهرة
ضد
السيد/ خالد محمود إبراهيم المقيم بالجيزة
أقام الدعوى بتاريخ 15/10/2026 وحددت لها جلسة 22/11/2026 الساعة 10 صباحاً
وفقاً للقانون رقم 4 لسنة 1996"""
# كلمات جدول عربي (م | الاسم | المبلغ) بمواضع بصرية: العمود المنطقي الأول على اليمين
def tw():
    rows = [['م', 'الاسم', 'المبلغ'], ['1', 'أحمد علي', '500'], ['2', 'سارة حسن', '750'], ['3', 'عمر خالد', '1200']]
    w = []
    for ri, r in enumerate(rows):
        for ci, cell in enumerate(r):
            x = [900, 500, 100][ci]; toks = cell.split(' ')[::-1]
            for k, t in enumerate(toks):
                w.append({'t': t, 'x0': x + k * 100, 'x1': x + k * 100 + 90, 'y0': 700 + ri * 90, 'y1': 740 + ri * 90, 'e': False})
    return w
INJECT = """async(a)=>{const b=await (await fetch('scan.png')).blob();const it=await dpLoad(new File([b],'p1.png',{type:'image/png'}));
 it._ocr={text:a.text,words:a.words.map(w=>Object.assign({},w,{t:OC.fixRtl(w.t)})),w:1200,h:1000,conf:a.conf,lang:'ara+eng'};DP.items=[it];DP.name='قضية اختبار N8';HD.caseName='قضية 1234';HD.client='محمد';dpWork()}"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True, permissions=['clipboard-read', 'clipboard-write'])
        p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Service Worker' not in m.text else None)
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept('')))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        async def js(c, *a): return await p.evaluate(c, *a) if a else await p.evaluate(c)
        async def click(act, **kw):
            q = f'[data-act={act}]' + ''.join(f'[data-{k}="{v}"]' for k, v in kw.items()); await p.wait_for_selector(q); await p.evaluate("(q)=>document.querySelector(q).click()", q)
        async def dl(act, name, **kw):
            async with p.expect_download() as d: await click(act, **kw)
            x = await d.value; path = f'{OUT}/{name}'; await x.save_as(path); return path
        await p.goto('http://127.0.0.1:8780/index.html'); await p.wait_for_timeout(2000); await js("closeSheet();PRO.enabled=false")
        ls0 = await js("JSON.stringify(Object.keys(localStorage).sort())"); cls0 = await js("JSON.stringify(typeof CLS!='undefined'?CLS:null)")
        T('extract.js مُحمَّل وواجهته جاهزة', await js("typeof EX=='object'&&typeof EX.ui=='object'&&typeof EX.run=='function'"))
        # --- المركز: الزر موجود، وبلا نص يفتح شاشة OCR مع تنبيه ---
        await click('hub') if await p.locator('[data-act=hub]').count() else await js("hubOpen()")
        await p.wait_for_selector('[data-act=exopen]')
        T('زر الاستخراج في مركز الأدوات', await p.locator('[data-act=exopen]').count() == 1)
        await click('exopen'); await p.wait_for_selector('[data-act=ocrlang]', timeout=4000)
        T('بلا نص OCR: يفتح شاشة OCR (لا شاشة فارغة)', await p.locator('[data-act=ocrlang]').count() >= 1 and await js("EX.ui.state.res===null"))
        # --- حقن نص OCR ومواضع كلمات ---
        await js(INJECT, {'text': DOC, 'words': tw(), 'conf': 90}); await p.wait_for_selector('#ocb')
        await js("closeSheet()"); await js("hubOpen()"); await click('exopen'); await p.wait_for_selector('.exr', timeout=4000)
        tabs = await js("[...document.querySelectorAll('[data-act=extab]')].map(b=>b.textContent.trim())")
        print('TABS', tabs)
        T('خمس تبويبات بأعداد (تواريخ 2، قضايا 1، أطراف 2، جداول 1، محاكم/تشريعات 2)', len(tabs) == 5 and '(2)' in tabs[0] and '(1)' in tabs[1] and '(2)' in tabs[2] and '(1)' in tabs[3] and '(2)' in tabs[4], tabs)
        T('تنبيه «مقترح/بالقواعد» ظاهر', 'بالقواعد' in await js("document.querySelector('#sh').textContent"))
        # --- التواريخ ---
        dv = await js("[...document.querySelectorAll('.exr [data-xf=iso]')].map(i=>i.value)"); dk = await js("[...document.querySelectorAll('.exr select[data-xf=kind]')].map(i=>i.value)"); tm = await js("[...document.querySelectorAll('.exr [data-xf=time]')].map(i=>i.value)")
        T('التواريخ: قيم ISO وأنواعها ووقت الجلسة', dv == ['2026-10-15', '2026-11-22'] and dk == ['رفع/قيد', 'جلسة'] and tm == ['', '10:00'], (dv, dk, tm))
        T('لقطة النص المصدر مع تظليل القيمة', await js("document.querySelectorAll('.exr .exs mark').length") == 2)
        # تعديل تاريخ + إلغاء تأشير الأول + تأشير مرجّح
        await js("(()=>{const i=document.querySelectorAll('.exr [data-xf=iso]')[1];i.value='2026-12-01';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}))})()")
        await js("(()=>{const c=document.querySelectorAll('.exr [data-xk]')[0];c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}))})()")
        T('التعديل والتأشير يُسجَّلان في النموذج', await js("EX.ui.state.res.items.filter(o=>o.type=='date').map(o=>o.iso+':'+o.on).join()") == '2026-10-15:false,2026-12-01:true' and await js("document.querySelectorAll('.exr.off').length") == 1)
        # --- القضايا ---
        await click('extab', v='case')
        cv = await js("[...document.querySelectorAll('.exr [data-xf]')].map(i=>i.dataset.xf+'='+i.value)")
        T('القضية: الصفة والنوع والرقم والسنة', cv == ['kind=القضية', 'ctype=مدني كلي', 'no=1234', 'year=2026'], cv)
        # --- الأطراف ---
        await click('extab', v='party')
        pr = await js("[...document.querySelectorAll('.exr')].map(r=>[...r.querySelectorAll('[data-xf]')].map(i=>i.value).join('|'))")
        T('الطرفان بأدوارهما', pr == ['مدعٍ|محمد أحمد علي', 'خصم (ضد)|خالد محمود إبراهيم'], pr)
        # حذف صف وإضافة طرف يدوي (فارغ) وآخر بقيمة
        await click('exdel', id=await js("document.querySelectorAll('.exr')[1].dataset.x"))
        T('حذف صف يُنقص العدد', await js("document.querySelectorAll('.exr').length") == len(pr) - 1)
        await click('exadd', v='party'); await js("(()=>{const r=[...document.querySelectorAll('.exr')].pop();const n=r.querySelector('[data-xf=name]');n.value='ورثة المرحوم سعيد';n.dispatchEvent(new Event('input',{bubbles:true}));const k=r.querySelector('[data-xf=role]');k.value='مدعى عليه';k.dispatchEvent(new Event('input',{bubbles:true}))})()")
        await click('exadd', v='party')  # صف فارغ يجب ألا يُصدَّر
        T('صفّا الإضافة اليدوية ظاهران', await js("document.querySelectorAll('.exr').length") == len(pr) + 1)
        # --- الجداول ---
        await click('extab', v='table'); await p.wait_for_selector('.extb input')
        grid = await js("[...document.querySelectorAll('.extb tr')].map(r=>[...r.querySelectorAll('input')].map(i=>i.value))")
        T('الجدول العربي: 4 صفوف × 3 أعمدة والعمود الأول (م) على اليمين منطقياً', grid == [['م', 'الاسم', 'المبلغ'], ['1', 'أحمد علي', '500'], ['2', 'سارة حسن', '750'], ['3', 'عمر خالد', '1200']], grid)
        T('اتجاه الجدول RTL', await js("document.querySelector('.extb').getAttribute('dir')") == 'rtl')
        await js("(()=>{const i=document.querySelector('.extb input[data-r=\"2\"][data-c=\"2\"]');i.value='760';i.dispatchEvent(new Event('input',{bubbles:true}))})()")
        await click('extr', id=await js("EX.ui.state.res.tables[0].id"), r='3')
        T('تعديل خلية وحذف صف في الجدول', await js("JSON.stringify(EX.ui.state.res.tables[0].rows.map(r=>r[2]))") == '["المبلغ","500","760"]')
        # --- المحاكم والتشريعات ---
        await click('extab', v='more')
        mv = await js("[...document.querySelectorAll('.exr')].map(r=>[...r.querySelectorAll('[data-xf]')].map(i=>i.value).join('|'))")
        T('المحكمة والقانون', mv == ['محكمة القاهرة الجديدة الابتدائية', 'القانون|4|1996'] or (len(mv) == 2 and mv[0].startswith('محكمة')), mv)
        # --- نسخ الملخص ---
        await click('excopy'); await p.wait_for_timeout(300)
        cp = await js("navigator.clipboard.readText()")
        T('ملخص النسخ يحوي القضية والتاريخ المعدَّل والطرف اليدوي ولا يحوي التاريخ غير المؤشَّر', 'قضية: القضية رقم 1234 لسنة 2026 مدني كلي' in cp and 'جلسة: 2026-12-01 10:00' in cp and 'ورثة المرحوم سعيد' in cp and '2026-10-15' not in cp, cp)
        # --- Excel ---
        xp = await dl('exxlsx', 'n8.xlsx')
        import openpyxl
        wb = openpyxl.load_workbook(xp); names = wb.sheetnames
        T('Excel يفتح في openpyxl بالأوراق المتوقعة', names == ['ملخص', 'التواريخ', 'القضايا', 'المحاكم', 'الأطراف', 'التشريعات', 'جدول 1'], names)
        ws = wb['التواريخ']; rows = [[c.value for c in r] for r in ws.iter_rows()]
        import datetime
        T('ورقة التواريخ: صف واحد معتمد بتاريخ حقيقي ونوع ووقت', len(rows) == 2 and rows[1][0] == datetime.datetime(2026, 12, 1) and rows[1][1] == 'جلسة' and rows[1][2] == '10:00', rows)
        T('خلية التاريخ بتنسيق تاريخ', 'd' in wb['التواريخ']['A2'].number_format.lower() or wb['التواريخ']['A2'].is_date)
        wsq = [[c.value for c in r] for r in wb['القضايا'].iter_rows()]
        T('ورقة القضايا: الرقم والسنة أرقام', wsq[1][1] == 1234 and wsq[1][2] == 2026 and wsq[1][3] == 'مدني كلي', wsq)
        wp = [[c.value for c in r] for r in wb['الأطراف'].iter_rows()]
        T('ورقة الأطراف: المعتمد فقط (بلا الصف الفارغ والمحذوف)', [r[1] for r in wp[1:]] == ['محمد أحمد علي', 'ورثة المرحوم سعيد'], wp)
        wt = [[c.value for c in r] for r in wb['جدول 1'].iter_rows()]
        T('ورقة الجدول: القيم المعدَّلة وأرقام حقيقية', wt == [['م', 'الاسم', 'المبلغ'], [1, 'أحمد علي', 500], [2, 'سارة حسن', 760]], wt)
        T('اتجاه الأوراق من اليمين لليسار والترويسة غليظة', wb['التواريخ'].sheet_view.rightToLeft is True and wb['التواريخ']['A1'].font.b is True)
        ms = [[c.value for c in r] for r in wb['ملخص'].iter_rows()]
        T('ورقة الملخص: القضية والموكل والإصدار', any(r[0] == 'القضية' and r[1] == 'قضية 1234' for r in ms) and any(r[0] == 'الموكل' and r[1] == 'محمد' for r in ms) and any(r[0] == 'الإصدار' and r[1] for r in ms), ms[:6])
        # --- CSV ---
        await click('extab', v='table')
        cp_ = await dl('excsvt', 'n8.csv', id=await js("EX.ui.state.res.tables[0].id"))
        raw = open(cp_, 'rb').read(); rows = list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))))
        T('CSV: BOM وUTF-8 وأعمدة صحيحة', raw[:3] == b'\xef\xbb\xbf' and rows == [['م', 'الاسم', 'المبلغ'], ['1', 'أحمد علي', '500'], ['2', 'سارة حسن', '760']], rows)
        # --- بقاء التعديلات عند الرجوع وإعادة الفتح، وإعادة الاستخراج عند تغيّر النص ---
        await click('ocrres'); await p.wait_for_selector('.octa'); T('زر الاستخراج في شاشة نتائج النص', await p.locator('[data-act=exopen]').count() == 1)
        await click('exopen'); await p.wait_for_selector('.exr')
        T('إعادة الفتح بنفس النص: تعديلاتك محفوظة في الجلسة', await js("EX.ui.state.res.tables[0].rows[2][2]")=='760' and await js("EX.ui.state.edited")==True)
        await click('ocrres'); await p.wait_for_selector('.octa')
        await p.locator('.octa').first.fill(DOC + '\nالمدعى عليه الثالث: هدى سمير'); await p.wait_for_timeout(150)
        await click('exopen'); await p.wait_for_selector('.exr')
        T('تغيّر نص OCR: يُعاد الاستخراج تلقائياً (طرف جديد، وتُمحى التعديلات)', await js("EX.ui.state.res.items.some(o=>o.type=='party'&&o.name=='هدى سمير')") and await js("EX.ui.state.res.items.filter(o=>o.type=='date').every(o=>o.iso!='2026-12-01')"))
        await js("EX.ui.state.edited=true")
        await click('exrun'); await p.wait_for_selector('.exr')
        T('زر إعادة الاستخراج يؤكد (الحوار قُبل) ويعيد البناء', await js("EX.ui.state.edited")==False)
        # --- شريط المحرر: تبويب «نص» ---
        await js("closeSheet();dpWork()"); await p.wait_for_selector('[data-act=dpedit]', timeout=3000) if await p.locator('[data-act=dpedit]').count() else None
        await js("(()=>{DPE.i=0;DPE.mode=null;dpEditView()})()"); await p.wait_for_selector('#edbar'); await click('edtab', t='txt')
        T('تبويب «نص» في المحرر فيه زر الاستخراج عند وجود OCR', await p.locator('.edp[data-p=txt] [data-act=exopen]').count() == 1)
        # --- لا أثر على القضايا ولا localStorage ---
        T('لا مفاتيح localStorage جديدة', await js("JSON.stringify(Object.keys(localStorage).sort())") == ls0)
        T('بيانات القضايا لم تُمسّ', await js("JSON.stringify(typeof CLS!='undefined'?CLS:null)") == cls0)
        T('لا أخطاء JavaScript (الجزء المحقون)', not E, E[:3])
        # ================= OCR حقيقي على صفحة مرندرة (يحتاج تنزيل ملفات OCR من الموقع المحلي) =================
        print('— OCR حقيقي —')
        REAL = """async()=>{const c=document.createElement('canvas');c.width=1700;c.height=1500;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,1700,1500);x.fillStyle='#000';x.direction='rtl';x.textAlign='right';x.font='54px "DejaVu Sans",Arial,sans-serif';
         const L=['محكمة القاهرة الجديدة الابتدائية','القضية رقم 1234 لسنة 2026 مدني كلي','المدعي: محمد أحمد علي المقيم بالقاهرة','لجلسة 22/11/2026 الساعة 10 صباحاً'];L.forEach((t,i)=>x.fillText(t,1620,110+i*110));
         const rows=[['م','الاسم','المبلغ'],['1','أحمد علي','500'],['2','سارة حسن','750'],['3','عمر خالد','1200']],xs=[1600,1000,400];
         rows.forEach((r,ri)=>r.forEach((t,ci)=>x.fillText(t,xs[ci],720+ri*120)));
         const b=await new Promise(r=>c.toBlob(r,'image/png'));DP.items=[await dpLoad(new File([b],'real.png',{type:'image/png'}))];DP.name='ocr-real';dpWork()}"""
        await js("closeSheet()"); await js(REAL); await p.wait_for_selector('#ocb')
        await click('ocropen'); await p.wait_for_selector('[data-act=ocrrun]'); await click('ocrrun', v='all')
        try:
            await p.wait_for_selector('.octa', timeout=300000)
        except Exception as e:
            T('OCR الحقيقي اكتمل', False, str(e)[:100]); return
        print('OCR TEXT >>>', repr(await js("DP.items[0]._ocr.text")))
        await click('exopen'); await p.wait_for_selector('.exr, .shm', timeout=5000)
        st = await js("JSON.stringify(EX.ui.state.res.items.map(o=>({t:o.type,iso:o.iso,k:o.kind,no:o.no,y:o.year,n:o.name,r:o.role,c:o.conf,on:o.on})))"); print('REAL ITEMS >>>', st)
        its = json.loads(st); tbs = await js("JSON.stringify(EX.ui.state.res.tables.map(t=>t.rows))"); print('REAL TABLES >>>', tbs)
        T('OCR حقيقي: رقم القضية 1234 لسنة 2026 مستخرج', any(i['t'] == 'case' and i['no'] == '1234' and i['y'] == '2026' for i in its), [i for i in its if i['t'] == 'case'])
        T('OCR حقيقي: تاريخ الجلسة 2026-11-22 مستخرج', any(i['t'] == 'date' and i['iso'] == '2026-11-22' for i in its), [i for i in its if i['t'] == 'date'])
        T('OCR حقيقي: محكمة مستخرجة', any(i['t'] == 'court' for i in its), [i for i in its if i['t'] == 'court'])
        T('OCR حقيقي: المدعي مستخرج (الاسم يبدأ بمحمد أحمد)', any(i['t'] == 'party' and (i['n'] or '').startswith('محمد أحمد') for i in its), [i for i in its if i['t'] == 'party'])
        tb = json.loads(tbs)
        T('OCR حقيقي: جدول واحد على الأقل بـ3 صفوف فأكثر وعمودين فأكثر', any(len(t) >= 3 and len(t[0]) >= 2 for t in tb), [len(t) for t in tb])
        if tb:
            flat = ' '.join(c for t in tb for r in t for c in r)
            T('OCR حقيقي: أرقام الجدول 500 و750 و1200 موجودة', all(x in flat.replace('٥٠٠', '500') for x in ['500', '750', '1200']), flat[:120])
        T('لا أخطاء JavaScript في المسار الحقيقي', not E, E[:3])
        await b.close()
asyncio.run(main()); print(f"\nنجح {sum(R)} وفشل {len(R) - sum(R)}"); sys.exit(0 if all(R) else 1)
