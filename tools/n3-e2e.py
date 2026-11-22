#!/usr/bin/env python3
"""اختبار شامل N3 في متصفح Chromium حقيقي (بحجم هاتف): يشغّل التطبيق ويمرّر صور tools/n3-fixtures.py عبر الواجهة الفعلية.
الاستعمال: python3 tools/n3-fixtures.py /tmp/n3 --png && python3 tools/n3-e2e.py /tmp/n3 [لقطات: /tmp/n3shots]"""
import sys, os, json, shutil, threading, http.server, functools, asyncio, re, math
from playwright.async_api import async_playwright
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n3'; SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/tmp/n3shots'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n3site'; os.makedirs(SHOTS, exist_ok=True)
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git')); os.makedirs(SITE + '/_fx')
for f in os.listdir(FX):
    if f.endswith('.png'): shutil.copy(f'{FX}/{f}', f'{SITE}/_fx/{f}')
GT = json.load(open(FX + '/gt.json'))
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8771), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await p.goto('http://127.0.0.1:8771/index.html'); await p.wait_for_timeout(2500)
        await p.evaluate("typeof closeSheet=='function'&&closeSheet()")
        T('الملفات تُحمَّل: AS وخيارات الكتاب والصورة الشخصية', await p.evaluate("typeof AS=='object'&&!!SCM.book&&!!SCM.photo&&AS.opt.orient&&AS.opt.skew"))
        VER = json.load(open(ROOT + '/version.json'))['version']
        T('إصدار التطبيق يطابق version.json (' + VER + ')', (await p.evaluate("APP&&APP.version")) == VER if await p.evaluate("typeof APP!='undefined'") else True)
        await p.evaluate("scStart()"); await p.wait_for_timeout(300)
        t = await p.evaluate("document.querySelector('#sh').innerText")
        T('شاشة المسح: أوضاع كتاب وصورة شخصية وخيارا الاتجاه والميلان', all(x in t for x in ['كتاب (صفحتان)', 'صورة شخصية', 'ضبط الاتجاه تلقائياً', 'إزالة الميلان تلقائياً']))
        await p.screenshot(path=f'{SHOTS}/01_home.png')
        mk = "async n=>{const b=await (await fetch('_fx/'+n+'.png')).blob();return new File([b],n+'.png',{type:'image/png'})}"
        async def start(n):
            await p.evaluate("async(n)=>{const f=await (" + mk + ")(n);window.__r=scFiles([f]);window.__done=false;window.__r.then(()=>window.__done=true)}", n)
        # ===== 1) مشهد بمنظور (خشب + دوران -12° + ظل) =====
        await start('sc02_ar_wood'); await p.wait_for_selector('#scc', timeout=8000); await p.wait_for_function("document.querySelector('#asn')&&!document.querySelector('#asn').innerText.includes('جارٍ')", timeout=8000)
        msg = await p.inner_text('#asn'); pts = await p.evaluate("SC.cr.pts"); w, h = GT['sc02_ar_wood']['w'], GT['sc02_ar_wood']['h']
        gt = GT['sc02_ar_wood']['quad']; ordd = lambda q: q
        # ترتيب GT مثل الاكتشاف: نطابق بأقرب زاوية
        err = sum(min(math.hypot(a[0]-g[0], a[1]-g[1]) for g in gt) for a in pts) / 4 / math.hypot(w, h) * 100
        T('شاشة القص تكتشف الورقة تلقائياً بدقة', 'اكتُشفت' in msg and err < 1.0, f'{msg[:40]}… خطأ={err:.2f}% من القطر')
        await p.screenshot(path=f'{SHOTS}/02_crop_auto.png')
        await p.click('[data-act=scok]'); await p.wait_for_function("window.__done===true||document.querySelector('#sh')&&document.querySelector('#sh').innerText.includes('تمت الإضافة')", timeout=15000)
        ops = await p.evaluate("DP.items[0].ops.map(o=>o.t+(o.f?':'+o.f:'')+(o.d?':'+o.d:''))"); T('أُضيفت صفحة بعملية quad', ops[0] == 'quad' and len(await p.evaluate("DP.items")) == 1, ops)
        fx = await p.evaluate("(()=>{const c=dpRender(DP.items[0]),x=c.getContext('2d'),id=x.getImageData(0,0,c.width,c.height),r=AS.core.fixup(id.data,c.width,c.height);return{w:c.width,h:c.height,rot:r.rot,skew:r.skew,horiz:r.horiz}})()")
        T('الصفحة المقصوصة مستقيمة (rot=0 والميلان المتبقي <0.7°)', fx['rot'] == 0 and abs(fx['skew']) < 0.7 and fx['horiz'], fx)
        t = await p.evaluate("document.querySelector('#sh').innerText"); T('شاشة «تمت الإضافة» ظاهرة', 'تمت الإضافة' in t)
        await p.screenshot(path=f'{SHOTS}/03_after_add.png')
        # ===== 2) صفحة جانبية (مدارة 90° عكس عقارب الساعة) =====
        await p.evaluate("DP.items=[];SC.saved=true;SC.mode='doc'"); await start('ori_ar_f0_s30_r90'); await p.wait_for_selector('#scc'); await p.wait_for_timeout(500)
        await p.click('[data-act=scfull]'); await p.wait_for_function("document.querySelector('#sh').innerText.includes('تمت الإضافة')", timeout=15000)
        ops = await p.evaluate("DP.items[0].ops.map(o=>o.t+(o.f?':'+o.f:'')+(o.d?':'+o.d:''))"); rot_ops = [o for o in ops if o.startswith('rot')]
        fx = await p.evaluate("(()=>{const c=dpRender(DP.items[0]),id=c.getContext('2d').getImageData(0,0,c.width,c.height),r=AS.core.fixup(id.data,c.width,c.height);return{w:c.width,h:c.height,rot:r.rot,horiz:r.horiz,known:r.flip.known}})()")
        T('صفحة جانبية 90°: تُدوَّر تلقائياً إلى الوضع القائم', fx['rot'] == 0 and fx['horiz'] and fx['h'] > fx['w'], (ops, fx))
        # ===== 3) صفحة مائلة 5° =====
        await p.evaluate("DP.items=[];SC.saved=true"); await start('skew_ar_5'); await p.wait_for_selector('#scc'); await p.wait_for_timeout(400); await p.click('[data-act=scfull]')
        await p.wait_for_function("document.querySelector('#sh').innerText.includes('تمت الإضافة')", timeout=15000)
        ops = await p.evaluate("DP.items[0].ops.map(o=>o.t+(o.f?':'+o.f:'')+(o.d?':'+o.d:''))")
        fx = await p.evaluate("(()=>{const c=dpRender(DP.items[0]),id=c.getContext('2d').getImageData(0,0,c.width,c.height),r=AS.core.fixup(id.data,c.width,c.height);return{w:c.width,h:c.height,rot:r.rot,skew:r.skew}})()")
        T('صفحة مائلة 5°: تُقوَّم (الميلان المتبقي <0.5°)', any(o.startswith('filter:deskew') for o in ops) and abs(fx['skew']) < 0.5 and fx['rot'] == 0, (ops, fx))
        # ===== 4) صفحة مقلوبة 180° مع فقرات واضحة =====
        await p.evaluate("DP.items=[];SC.saved=true"); await start('ori2_ar_f0_just_r180'); await p.wait_for_selector('#scc'); await p.wait_for_timeout(400); await p.click('[data-act=scfull]')
        await p.wait_for_function("document.querySelector('#sh').innerText.includes('تمت الإضافة')", timeout=15000)
        ops = await p.evaluate("DP.items[0].ops.map(o=>o.t+(o.f?':'+o.f:'')+(o.d?':'+o.d:''))"); T('صفحة مقلوبة 180° بفقرات: تُقلب تلقائياً', 'rot:180' in ops, ops)
        # صفحة مستقيمة لا تُدار
        await p.evaluate("DP.items=[];SC.saved=true"); await start('ori2_ar_f0_just_r0'); await p.wait_for_selector('#scc'); await p.wait_for_timeout(400); await p.click('[data-act=scfull]')
        await p.wait_for_function("document.querySelector('#sh').innerText.includes('تمت الإضافة')", timeout=15000)
        ops = await p.evaluate("DP.items[0].ops.map(o=>o.t+(o.f?':'+o.f:'')+(o.d?':'+o.d:''))"); T('صفحة مستقيمة: لا تدوير ولا ميلان', not any(o.startswith('rot') for o in ops) and not any('deskew' in o for o in ops), ops)
        # ===== 5) وضع الكتاب =====
        await p.evaluate("DP.items=[];SC.saved=true;SC.mode='book';SC.batch=false;scHome()"); await start('book_1_ar'); await p.wait_for_selector('#scc'); await p.wait_for_timeout(500)
        await p.click('[data-act=scfull]'); await p.wait_for_selector('#asc', timeout=8000); await p.wait_for_timeout(300)
        sp = await p.evaluate("({x:AS.sp.x,w:AS.sp.cv.width,conf:AS.sp.conf})"); gx = GT['book_1_ar']['gx']
        T('وضع الكتاب: موضع التجليد قريب من الحقيقي (≤2% من العرض)', abs(sp['x'] - gx) / sp['w'] * 100 <= 2.0, f"x={sp['x']:.0f} الحقيقي={gx} ثقة={sp['conf']:.2f}")
        await p.screenshot(path=f'{SHOTS}/04_book_split.png')
        await p.click('[data-act=asspok]'); await p.wait_for_function("document.querySelector('#sh').innerText.includes('تمت الإضافة')", timeout=15000)
        dims = await p.evaluate("DP.items.map(it=>{const c=dpRender(it);return[c.width,c.height]})")
        T('الكتاب: صفحتان، الأولى (عربي) هي اليمنى الأعرض', len(dims) == 2 and abs(dims[0][0] - (sp['w'] - sp['x'])) < 3 and abs(dims[1][0] - sp['x']) < 3, dims)
        # إلغاء بزر الرجوع (إغلاق النافذة) لا يعلّق
        await p.evaluate("DP.items=[];SC.saved=true"); await start('book_0_ar'); await p.wait_for_selector('#scc'); await p.wait_for_timeout(400); await p.click('[data-act=scfull]'); await p.wait_for_selector('#asc')
        await p.evaluate("closeSheet()"); await p.wait_for_function("window.__done===true", timeout=5000); T('إغلاق شاشة الفصل لا يعلّق التدفق ولا يضيف صفحات', await p.evaluate("DP.items.length")==0)
        # ===== 6) الصورة الشخصية + تصدير PDF بالمقاس الحقيقي =====
        await p.evaluate("""()=>{const c=document.createElement('canvas');c.width=900;c.height=1200;const x=c.getContext('2d');x.fillStyle='#8aa';x.fillRect(0,0,900,1200);x.fillStyle='#e9c3a0';x.beginPath();x.ellipse(450,520,190,250,0,0,7);x.fill();x.fillStyle='#345';x.fillRect(200,820,500,380);window.__portrait=c}""")
        await p.evaluate("DP.items=[];SC.saved=true;SC.mode='photo';scHome()"); await p.evaluate("async()=>{const b=await new Promise(r=>__portrait.toBlob(r,'image/png'));const f=new File([b],'p.png',{type:'image/png'});window.__done=false;window.__r=scFiles([f]);window.__r.then(()=>window.__done=true)}")
        await p.wait_for_selector('#asp', timeout=8000); await p.screenshot(path=f'{SHOTS}/05_photo.png')
        await p.click('[data-act=asphsz][data-v="35x45"]'); await p.wait_for_selector('#asp'); await p.click('[data-act=asphn][data-v="8"]'); await p.wait_for_selector('#asp')
        await p.click('[data-act=asphok]'); await p.wait_for_function("document.querySelector('#sh')&&document.querySelector('#sh').innerText.includes('تمت الإضافة')", timeout=15000)
        info = await p.evaluate("({n:DP.items.length,w:DP.items[0].orig.width,h:DP.items[0].orig.height,page:DP.page,maxd:DP.maxd})")
        T('ورقة الصور: صفحة واحدة 2329×3358 ووضع A4 بهوامش والأبعاد الأصلية', info == {'n': 1, 'w': 2329, 'h': 3358, 'page': 'a4', 'maxd': '0'}, info)
        # تصدير PDF فعلي ثم قراءة مصفوفة الرسم لقياس المقاس
        await p.evaluate("DP.out='pdf';DP.kb=''"); await p.evaluate("dpWork()"); await p.evaluate("dpRun()"); await p.wait_for_function("DP.res&&DP.res.files.length==1", timeout=30000)
        pdf = await p.evaluate("(async()=>{const u=new Uint8Array(await DP.res.files[0].blob.arrayBuffer());let s='';for(let i=0;i<Math.min(u.length,200000);i++)s+=String.fromCharCode(u[i]);return s})()")
        mb = re.search(r'/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]', pdf); cm = re.search(r'q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm /Im0 Do', pdf); im = re.search(r'/Width (\d+) /Height (\d+)', pdf)
        ptw = float(cm.group(1)); pxw = int(im.group(1)); photo_px = round(3.5 / 2.54 * 300); photo_pt = photo_px * ptw / pxw; cmw = photo_pt / 72 * 2.54
        T('PDF: صفحة A4 والصورة 3.5 سم بدقة (±1%)', mb.group(1) == '595.00' and abs(cmw - 3.5) / 3.5 < 0.01, f'MediaBox={mb.group(1)}×{mb.group(2)} عرض الصورة الفعلي={cmw:.3f} سم، بكسلات {pxw}×{im.group(2)}')
        # ===== 7) محرر الصفحة والمعالجة الجماعية =====
        await p.evaluate("DP.items=[];DP.out='pdf';DP.maxd='1600';SC.saved=true;SC.mode='doc'")
        await p.evaluate("async()=>{for(const n of ['sc01_en_dark','skew_en_-7','ori_en_f0_s30_r270']){const b=await (await fetch('_fx/'+n+'.png')).blob();const it=await dpLoad(new File([b],n+'.png',{type:'image/png'}));DP.items.push(it)}dpWork()}")
        await p.wait_for_selector('[data-act=asall]'); await p.screenshot(path=f'{SHOTS}/06_work.png')
        await p.click('[data-act=asall]'); await p.wait_for_function("document.querySelector('[data-act=asall]')", timeout=30000); await p.wait_for_timeout(500)
        res = await p.evaluate("DP.items.map(it=>it.ops.map(o=>o.t+(o.f?':'+o.f:'')+(o.d?':'+o.d:'')))")
        T('معالجة جماعية: المشهد يُقصّ، الجانبية تُدوَّر، المائلة تُقوَّم', res[0][:1] == ['quad'] and any(o.startswith('filter:deskew') for o in res[1]) and any(o == 'rot:270' for o in res[2]), res)
        await p.evaluate("dpEdit(0)"); await p.wait_for_selector('[data-act=asautocrop]'); t = await p.evaluate("document.querySelector('#sh').innerText")
        T('المحرر: أزرار القص التلقائي والاتجاه والميلان والقلب وفصل الصفحتين', all(x in t for x in ['قص تلقائي', 'اتجاه + ميلان', 'إزالة الميلان', 'قلب 180', 'فصل صفحتين']))
        await p.screenshot(path=f'{SHOTS}/07_editor.png')
        await p.click('[data-act=asflip]'); await p.wait_for_timeout(300); T('زر القلب 180° يضيف عملية rot:180', (await p.evaluate("DP.items[0].ops.at(-1).d")) == 180)
        # ===== 8) الأداء على صورة كبيرة (2800×2100) =====
        perf = await p.evaluate("""async()=>{const c=document.createElement('canvas');c.width=2800;c.height=2100;const x=c.getContext('2d');const b=await (await fetch('_fx/sc01_en_dark.png')).blob();const bm=await createImageBitmap(b);x.drawImage(bm,0,0,2800,2100);
          let t0=performance.now();const d=(window.__ad||(window.__ad=null));
          const s=dpScale(c,720);const id=s.getContext('2d').getImageData(0,0,s.width,s.height);const r=AS.core.detect(id.data,s.width,s.height);const t1=performance.now();
          const s2=dpScale(c,1000),id2=s2.getContext('2d').getImageData(0,0,s2.width,s2.height);AS.core.fixup(id2.data,s2.width,s2.height);const t2=performance.now();
          return{detect:Math.round(t1-t0),fixup:Math.round(t2-t1)}}""")
        T('الأداء (Chromium سطح مكتب): اكتشاف وتحليل أقل من ثانية', perf['detect'] < 1000 and perf['fixup'] < 1500, perf)
        T('لا أخطاء JavaScript في الصفحة', not E, E[:3])
        await b.close()
    print('FAILS', R.count(False), 'of', len(R)); sys.exit(1 if R.count(False) else 0)
asyncio.run(main())
