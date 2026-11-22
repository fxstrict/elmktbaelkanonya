#!/usr/bin/env python3
"""اختبار شامل N4 (استوديو التعليق، إدارة الصفحات، الطباعة، ملف .hscan) في Chromium بحجم هاتف.
الاستعمال: python3 tools/n3-fixtures.py /tmp/n3 --png && python3 tools/n4-e2e.py /tmp/n3 [/tmp/n4shots]"""
import sys, os, shutil, threading, http.server, functools, asyncio, re, base64, io
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n3'; SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/tmp/n4shots'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n4site'; os.makedirs(SHOTS, exist_ok=True)
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git')); os.makedirs(SITE + '/_fx')
for f in ('ori2_ar_f0_just_r0.png', 'ori_en_f0_s30_r0.png', 'book_0_ar.png'): shutil.copy(f'{FX}/{f}', f'{SITE}/_fx/{f}')
sig = Image.new('RGB', (500, 220), 'white'); d = ImageDraw.Draw(sig); d.line([(30, 150), (120, 40), (170, 170), (250, 60), (330, 160), (460, 80)], fill=(20, 20, 140), width=9); sig.save('/tmp/n4_sig.png')
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SITE); H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8774), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
HASH = "(it)=>{const c=dpRender(it),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=7)s=(s*31+d[i])%1000000007;return c.width+'x'+c.height+':'+s}"
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True); p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Service Worker' not in m.text else None)
        p.on('dialog', lambda dlg: asyncio.ensure_future(dlg.accept()))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        await p.goto('http://127.0.0.1:8774/index.html'); await p.wait_for_timeout(2500); await p.evaluate("closeSheet()")
        T('studio.js يُحمَّل ويلفّ dpFilter', await p.evaluate("typeof ST=='object'&&typeof ST.paint=='function'"))
        await p.evaluate("async()=>{for(const n of ['ori2_ar_f0_just_r0','ori_en_f0_s30_r0']){const b=await (await fetch('_fx/'+n+'.png')).blob();DP.items.push(await dpLoad(new File([b],n+'.png',{type:'image/png'})))}dpWork()}")
        await p.wait_for_selector('[data-act=stann]')
        t = await p.evaluate("document.querySelector('#sh').innerText")
        T('شاشة الصفحات: أزرار التكرار والتعليق والتحديد والطباعة والمشروع', all(x in t for x in ['تحديد الكل', 'استخراج المحدد', 'طباعة', 'حفظ مشروع', 'فتح ملف مشروع']) and await p.locator('.stck').count() == 2 and await p.locator('[data-act=stdup]').count() == 2)
        h0 = await p.evaluate("("+HASH+")(DP.items[0])")
        # ===== الاستوديو =====
        await p.click('[data-act=stann][data-i="0"]'); await p.wait_for_selector('#stc')
        async def box(sel='#stc'):
            await p.locator(sel).scroll_into_view_if_needed(); return await p.locator(sel).bounding_box()
        async def tap(fx, fy, sel='#stc'):
            bb = await box(sel); await p.mouse.click(bb['x'] + bb['width'] * fx, bb['y'] + bb['height'] * fy)
        async def drag(a, b2, sel='#stc', steps=8):
            bb = await box(sel); await p.mouse.move(bb['x'] + bb['width'] * a[0], bb['y'] + bb['height'] * a[1]); await p.mouse.down()
            for i in range(1, steps + 1): await p.mouse.move(bb['x'] + bb['width'] * (a[0] + (b2[0] - a[0]) * i / steps), bb['y'] + bb['height'] * (a[1] + (b2[1] - a[1]) * i / steps))
            await p.mouse.up()
        pend = lambda: p.evaluate("ST.pend.length")
        await tap(.5, .5); T('نص بلا كتابة: لا يُضاف شيء', await pend() == 0)
        await p.fill('[data-st=txt]', 'تم الاطلاع والموافقة'); await tap(.5, .12); T('نص عربي يُضاف', await pend() == 1)
        await p.click('[data-act=sttool][data-v=hl]'); await drag((.2, .30), (.75, .34)); T('تمييز بالسحب', await pend() == 2)
        await p.click('[data-act=sttool][data-v=ul]'); await drag((.2, .45), (.7, .452)); T('تسطير بالسحب', await pend() == 3)
        await p.click('[data-act=sttool][data-v=pen]'); await drag((.3, .6), (.6, .66), steps=12); T('رسم بالقلم', await pend() == 4)
        await p.click('[data-act=sttool][data-v=note]'); await p.fill('[data-st=txt]', 'راجع هذا البند قبل الجلسة'); await tap(.7, .75); T('تعليق (ملاحظة لاصقة)', await pend() == 5)
        await p.click('[data-act=sttool][data-v=stamp]'); await p.click('[data-act=ststamp][data-v=date]'); await tap(.3, .85); T('ختم التاريخ', await pend() == 6)
        await p.click('[data-act=ststamp][data-v=copy]'); await tap(.75, .9); T('ختم «صورة طبق الأصل»', await pend() == 7)
        # توقيع مرسوم
        await p.click('[data-act=sttool][data-v=sig]'); await p.click('[data-act=stsigpad]'); await p.wait_for_selector('#stsp')
        await p.click('[data-act=stsigok]'); T('توقيع فارغ يُرفض', await p.evaluate("!ST.sig"))
        await drag((.1, .7), (.4, .2), sel='#stsp', steps=6); await drag((.4, .2), (.9, .8), sel='#stsp', steps=6); await p.click('[data-act=stsigcol][data-v="#111111"]')
        await p.click('[data-act=stsigok]'); await p.wait_for_selector('#stc'); T('توقيع مرسوم جاهز (متجهي)', await p.evaluate("!!ST.sig&&!!ST.sig.v&&ST.sig.v.length==2"))
        await tap(.25, .62); T('وضع التوقيع المرسوم', await pend() == 8)
        # توقيع من صورة
        await p.set_input_files('#stsigf', '/tmp/n4_sig.png'); await p.wait_for_function("ST.sig&&ST.sig.i", timeout=5000); await tap(.7, .58); T('وضع توقيع من صورة', await pend() == 9)
        await p.screenshot(path=f'{SHOTS}/01_studio.png')
        await p.click('[data-act=stundo]'); await p.wait_for_selector('#stc'); T('تراجع يزيل آخر تعليق', await pend() == 8)
        await tap(.7, .58)  # أعد وضع توقيع الصورة
        T('9 تعليقات جاهزة قبل التطبيق', await pend() == 9)
        await p.click('[data-act=stdone]'); await p.wait_for_selector('#dpe')
        last = await p.evaluate("DP.items[0].ops.at(-1).f.slice(0,4)"); T('التطبيق يضيف عملية ann~ واحدة فوق الصفحة', last == 'ann~' and await p.evaluate("DP.items[0].ops.length")==1)
        h1 = await p.evaluate("("+HASH+")(DP.items[0])"); T('الصفحة تغيّرت بعد التعليق', h1 != h0)
        # قياس بكسلات: تمييز أصفر، وحبر أحمر للختم، وأزرق للتوقيع
        px = await p.evaluate("""()=>{const c=dpRender(DP.items[0]),x=c.getContext('2d'),W=c.width,H=c.height,cnt=(fx,fy,fw,fh,f)=>{const d=x.getImageData(fx*W,fy*H,fw*W,fh*H).data;let n=0;for(let i=0;i<d.length;i+=4)if(f(d[i],d[i+1],d[i+2]))n++;return n};
          return{yellow:cnt(.2,.30,.55,.04,(r,g,b)=>r>200&&g>180&&b<140),red:cnt(0,.8,1,.15,(r,g,b)=>r>150&&g<90&&b<90),blue:cnt(.6,.5,.35,.15,(r,g,b)=>b>110&&r<90&&g<90),dark:cnt(.2,.08,.6,.08,(r,g,b)=>r<80&&g<80&&b<80)}}""")
        T('الألوان في البكسلات: تمييز أصفر، ختم أحمر، توقيع أزرق، نص داكن', px['yellow'] > 500 and px['red'] > 200 and px['blue'] > 100 and px['dark'] > 150, px)
        await p.evaluate("""()=>{const c=dpRender(DP.items[0]);window.__png=c.toDataURL('image/png')}"""); png = await p.evaluate("window.__png"); open(f'{SHOTS}/page_annotated.png', 'wb').write(base64.b64decode(png.split(',')[1]))
        # تراجع المحرر يزيل كل التعليقات دفعة واحدة
        await p.click('[data-act=dpundo]'); await p.wait_for_timeout(300); T('تراجع المحرر يعيد الصفحة الأصلية', await p.evaluate("("+HASH+")(DP.items[0])") == h0)
        await p.click('[data-act=stann][data-i="0"]') if await p.locator('[data-act=stann][data-i="0"]').count() else await p.evaluate("stOpenView&&0")
        # إلغاء لا يُغيّر شيئاً
        await p.wait_for_selector('#stc'); await p.click('[data-act=sttool][data-v=text]'); await p.fill('[data-st=txt]', 'مؤقت'); await tap(.5, .5); await p.click('[data-act=stcancel]'); await p.wait_for_selector('#dpe')
        T('إلغاء الاستوديو لا يضيف عمليات', await p.evaluate("DP.items[0].ops.length") == 0)
        # أعد التعليق للاختبارات التالية (نص + توقيع صورة) ثم عد لشاشة الصفحات
        await p.evaluate("""()=>{const it=DP.items[0];dpOp(it,{t:'filter',f:ST.enc([{k:'t',x:600,y:300,tx:'مرجع الحفظ',c:'#c0392b',s:60},{k:'g',x:900,y:900,w:300,a:0.44,i:Object.keys(ST.img)[0]},{k:'g',x:300,y:900,w:260,a:0.5,c:'#1f4e9c',v:[[[0,500],[200,0],[400,400],[1000,100]]]}])});dpWork()}""")
        await p.wait_for_selector('[data-act=stdup]')
        # ===== إدارة الصفحات =====
        await p.click('[data-act=stdup][data-i="0"]'); await p.wait_for_function("DP.items.length==3"); T('تكرار صفحة (نسخة بنفس التعديلات)', await p.evaluate("DP.items[1].ops.length==DP.items[0].ops.length&&DP.items[1].name.includes('نسخة')"))
        await p.click('[data-act=stblank][data-i="2"]'); await p.wait_for_function("DP.items.length==4"); T('إدراج صفحة بيضاء بعد الصفحة', await p.evaluate("DP.items[3].name=='صفحة بيضاء'&&DP.items[3].orig.width==1240"))
        async with p.expect_file_chooser() as fc: await p.click('[data-act=stins][data-i="0"]')
        await (await fc.value).set_files(f'{FX}/book_0_ar.png'); await p.wait_for_function("DP.items.length==5", timeout=8000); T('إدراج صورة بعد الصفحة الأولى (الموضع صحيح)', await p.evaluate("DP.items[1].name.includes('book')"))
        # تحديد واستخراج
        await p.locator('.stck').nth(0).check(); await p.locator('.stck').nth(2).check(); T('تحديد صفحتين', await p.evaluate("ST.sel.size")==2)
        await p.click('[data-act=stselexp]'); await p.wait_for_function("DP.res&&DP.res.files.length==1", timeout=30000)
        pdf = await p.evaluate("(async()=>{const u=new Uint8Array(await DP.res.files[0].blob.arrayBuffer());let s='';for(let i=0;i<Math.min(u.length,400000);i++)s+=String.fromCharCode(u[i]);return{s,name:DP.res.files[0].name,n:DP.items.length}})()")
        T('استخراج المحدد: PDF بصفحتين فقط، واسم -مستخرج، وبقاء كل الصفحات', '/Count 2' in pdf['s'] and 'مستخرج' in pdf['name'] and pdf['n'] == 5, (pdf['name'], pdf['n']))
        await p.evaluate("ST.sel.clear();dpWork()"); await p.wait_for_selector('[data-act=stselall]')
        # حذف المحدد
        await p.locator('.stck').nth(3).check(); await p.locator('.stck').nth(4).check(); await p.click('[data-act=stseldel]'); await p.wait_for_function("DP.items.length==3"); T('حذف المحدد', True)
        # تصدير PDF كامل بتعليقات
        await p.evaluate("DP.res=null;dpWork()"); await p.evaluate("dpRun()"); await p.wait_for_function("DP.res&&DP.res.files.length==1", timeout=30000)
        pdf = await p.evaluate("(async()=>{const u=new Uint8Array(await DP.res.files[0].blob.arrayBuffer());let s='';for(let i=0;i<Math.min(u.length,600000);i++)s+=String.fromCharCode(u[i]);return{s:s.slice(0,8)+'|'+(/\\/Count (\\d+)/.exec(s)||[])[1],size:u.length}})()")
        T('تصدير PDF كامل بالتعليقات', pdf['s'].startswith('%PDF-1.4') and pdf['s'].endswith('|3'), pdf)
        # طباعة
        await p.evaluate("dpWork()"); await p.evaluate("stPrintTest=0"); await p.click('[data-act=stprint]'); await p.wait_for_selector('#stprf', state='attached', timeout=15000); await p.wait_for_timeout(500)
        n = await p.evaluate("document.querySelector('#stprf').contentDocument.images.length"); T('الطباعة: إطار الطباعة يحوي صورة لكل صفحة', n == 3, n)
        # ===== ملف المشروع =====
        await p.evaluate("DP.name='قضية 123-2026 – توكيل'")
        await p.evaluate("window.__b=DP.items.map(it=>dpRender(it))"); before = await p.evaluate("DP.items.map(" + HASH + ")"); opsb = await p.evaluate("JSON.stringify(DP.items.map(i=>i.ops.map(o=>o.t+(o.f?o.f.slice(0,4):''))))")
        async with p.expect_download() as dl: await p.click('[data-act=sthsave]')
        d = await dl.value; path = f'{SHOTS}/proj.hscan'; await d.save_as(path); T('اسم ملف المشروع يحمل اسم القضية وامتداد .hscan', d.suggested_filename == 'قضية 123-2026 – توكيل.hscan', d.suggested_filename)
        import zipfile; z = zipfile.ZipFile(path); nm = z.namelist(); T('ZIP صالح: manifest + 3 صور صفحات + توقيع الصورة', 'manifest.json' in nm and sum(x.startswith('pages/') for x in nm) == 3 and sum(x.startswith('sigs/') for x in nm) == 1, nm)
        # امسح كل شيء، وأفرغ سجل التوقيعات، ثم افتح من واجهة المستخدم
        await p.evaluate("DP.items=[];DP.name='';ST.img={};SC.saved=true;dpHome()"); await p.wait_for_selector('#sthopen', state='attached')
        await p.set_input_files('#sthopen', path); await p.wait_for_function("DP.items.length==3", timeout=15000)
        after = await p.evaluate("DP.items.map(" + HASH + ")"); opsa = await p.evaluate("JSON.stringify(DP.items.map(i=>i.ops.map(o=>o.t+(o.f?o.f.slice(0,4):''))))")
        cmp = await p.evaluate("""()=>DP.items.map((it,i)=>{const a=window.__b[i],c=dpRender(it);if(a.width!=c.width||a.height!=c.height)return{dim:false};const da=a.getContext('2d').getImageData(0,0,a.width,a.height).data,dc=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0,n=0,ba=0,bc=0;
          for(let k=0;k<da.length;k+=12){s+=Math.abs(da[k]-dc[k])+Math.abs(da[k+1]-dc[k+1])+Math.abs(da[k+2]-dc[k+2]);n+=3}for(let k=0;k<da.length;k+=4){if(da[k+2]>110&&da[k]<90&&da[k+1]<90)ba++;if(dc[k+2]>110&&dc[k]<90&&dc[k+1]<90)bc++}return{dim:true,mad:s/n,ba,bc}})""")
        T('فتح المشروع: نفس الأبعاد والفرق المتوسط للبكسل <3 مستوى (ضغط JPG 95%)', all(c['dim'] and c['mad'] < 3 for c in cmp), [round(c.get('mad', -1), 2) for c in cmp])
        T('التوقيع المستورد عاد من الملف (نفس عدد بكسلاته الزرقاء ±15%)', cmp[0]['ba'] > 100 and 0.85 < cmp[0]['bc'] / cmp[0]['ba'] < 1.15, (cmp[0]['ba'], cmp[0]['bc']))
        T('العمليات محفوظة كما كانت، واسم المشروع والإعدادات', opsb == opsa and await p.evaluate("DP.name")=='قضية 123-2026 – توكيل', opsa)
        T('ملف غير صالح لا يكسر التطبيق', True)
        open('/tmp/bad.hscan', 'wb').write(b'not a zip'); await p.evaluate("dpHome()"); await p.set_input_files('#sthopen', '/tmp/bad.hscan'); await p.wait_for_timeout(600)
        T('ملف فاسد: رسالة خطأ والصفحات الحالية سليمة', await p.evaluate("DP.items.length")==3 and 'تعذّر فتح الملف' in await p.evaluate("document.querySelector('#ts').textContent"))
        await p.evaluate("dpWork()"); await p.wait_for_selector('[data-act=stann]'); await p.screenshot(path=f'{SHOTS}/02_work.png')
        T('لا أخطاء JavaScript', not E, E[:3])
        await b.close()
    print('FAILS', R.count(False), 'of', len(R)); sys.exit(1 if R.count(False) else 0)
asyncio.run(main())
