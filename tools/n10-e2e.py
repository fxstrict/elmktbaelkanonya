#!/usr/bin/env python3
"""اختبار N10 (1.19.0) في Chromium بحجم هاتف:
(1) حفظ مراجعة الاستخراج مع المستند واستعادتها وحمايتها من الخلط بين المستندات وتنظيف اليتيم،
(2) تحويل الهجري التقريبي في الواجهة،
(3) اعتماد الجلسات والمواعيد في القضية (معاينة، تأكيد، شكل البيانات القائم نفسه، منع التكرار، عدم مس باقي القضية)،
(4) شريط تقدّم التنفيذ وزر الإلغاء (إلغاء بلا تنزيل ولا أثر، وتقدّم لا يتراجع، وعدم التشغيل المزدوج).
الاستعمال: python3 tools/n10-e2e.py /tmp/n5fx   (يحتاج scan.png من run-all)"""
import sys, os, shutil, threading, http.server, functools, asyncio, json
from datetime import date, timedelta
from playwright.async_api import async_playwright
FX = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n10site'
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git')); shutil.copy(f'{FX}/scan.png', f'{SITE}/scan.png')
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8795), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
f = lambda d: d.strftime('%d/%m/%Y')
FUT, FUT2, PAST = date.today() + timedelta(days=30), date.today() + timedelta(days=45), date(2020, 3, 1)
DOC = f"""محكمة القاهرة الجديدة الابتدائية
القضية رقم 1234 لسنة 2026 مدني كلي
المدعي: السيد/ محمد أحمد علي المقيم بالقاهرة
ضد
السيد/ خالد محمود إبراهيم المقيم بالجيزة
حددت لها جلسة {f(FUT)} الساعة 10 صباحاً
ميعاد الطعن ينتهي في {f(FUT2)}
وكانت بجلسة {f(PAST)}
وتحرر بتاريخ 15 رمضان 1447 هـ"""
INJECT = """async(a)=>{const b=await (await fetch('scan.png')).blob();const it=await dpLoad(new File([b],'p1.png',{type:'image/png'}));
 it._ocr={text:a.text,words:[],w:1200,h:1000,conf:92,lang:'ara+eng'};DP.items=[it];DP.res=null;DP.name=a.name;HD.cur=null;HD.last='';HD.caseId='';HD.caseName='';HD.client='';dpWork()}"""
MK = """async(a)=>{const c=document.createElement('canvas');c.width=a.w;c.height=a.h;const x=c.getContext('2d');x.fillStyle='#e8e4da';x.fillRect(0,0,a.w,a.h);x.fillStyle='#222';x.font='28px "DejaVu Sans",Arial';
 for(let i=0;i<40;i++)x.fillText('نص تجريبي للمستند رقم '+i+' — 1234567890 abc',60+(i%3)*7,60+i*(a.h-120)/40);
 const id=x.getImageData(0,0,a.w,a.h),d=id.data;let s=7+a.k;for(let i=0;i<d.length;i+=4){s=(s*1103515245+12345)&0x7fffffff;const n=((s>>8)%21)-10;d[i]+=n;d[i+1]+=n;d[i+2]+=n}x.putImageData(id,0,0);
 const b=await new Promise(r=>c.toBlob(r,'image/png'));return await dpLoad(new File([b],'big'+a.k+'.png',{type:'image/png'}))}"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True)
        p = await ctx.new_page(); E = []; DL = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Service Worker' not in m.text and 'Failed to load' not in m.text else None)
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept(''))); p.on('download', lambda d: DL.append(d))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        async def js(c, *a): return await p.evaluate(c, *a) if a else await p.evaluate(c)
        async def click(act, **kw):
            q = f'[data-act={act}]' + ''.join(f'[data-{k}="{v}"]' for k, v in kw.items()); await p.wait_for_selector(q, state='attached'); await p.evaluate("(q)=>document.querySelector(q).click()", q)
        async def act(a, **d):
            await p.evaluate("([a,d])=>{const b=document.createElement('button');b.dataset.act=a;for(const k in d)b.dataset[k]=d[k];b.style.display='none';document.body.appendChild(b);b.click();b.remove()}", [a, d])
        await p.goto('http://127.0.0.1:8795/index.html'); await p.wait_for_timeout(2000); await js("closeSheet();PRO.enabled=false")
        ls0 = set(json.loads(await js("JSON.stringify(Object.keys(localStorage))")))
        T('xcase.js مُحمَّل (XC) وEX.caseEntries وhijriToISO موجودان', await js("typeof XC=='object'&&typeof XC.saveNow=='function'&&typeof EX.caseEntries=='function'&&typeof EX.hijriToISO=='function'"))

        # ================= (1) حفظ المراجعة =================
        await js(INJECT, {'text': DOC, 'name': 'مستند N10'}); await js("HD.save(true)")
        did = await js("HD.cur"); T('المستند محفوظ في المكتبة وله معرّف', bool(did), did)
        await js("EX.ui.open()"); await p.wait_for_selector('.exr[data-x]')
        T('الاستخراج يعرض تواريخ (جلسة + ميعاد + فائتة + هجري)', await js("EX.ui.state.res.items.filter(o=>o.type=='date').length>=4"), await js("EX.ui.state.res.items.filter(o=>o.type=='date').map(o=>o.kind+':'+(o.iso||o.hijri))"))
        await click('extab', v='case'); await p.wait_for_selector('[data-xf=no]'); await p.fill('.exr[data-x] [data-xf=no]', '9876')
        T('التعديل يضع علامة edited', await js("EX.ui.state.edited===true"))
        T('saveNow يكتب السجل xr:<id>', await js("XC.saveNow()") is True)
        rec = await js("(async()=>{const r=await HD.get('assets','xr:'+HD.cur);return r&&{kind:r.kind,n:r.res.items.filter(o=>o.type=='case').map(o=>o.no),tab:r.tab,id:r.id,t:typeof r.tsig}})()")
        T('السجل: kind=xr والرقم المعدّل 9876 والتبويب محفوظ', rec and rec['kind'] == 'xr' and rec['n'] == ['9876'] and rec['tab'] == 'case' and rec['id'] == 'xr:' + did, rec)
        T('saveNow ثانية بلا تغيير لا تكتب', await js("XC.saveNow()") is False)
        # محاكاة إغلاق التطبيق وإعادة فتح المستند من المكتبة
        await js("EX.ui.state.res=null;EX.ui.state.sig='';EX.ui.state.edited=false;EX.ui.state.tab='date';DP.items=[];HD.cur=null;HD.last='';closeSheet()")
        await act('hdlib'); await click('hdopen', id=did); await p.wait_for_function("DP.items.length==1&&HD.cur&&DP.items[0]._ocr&&DP.items[0]._ocr.text", timeout=20000)
        T('إعادة الفتح: معرّف الصفحة تغيّر لكن المراجعة تُستعاد بالنص نفسه', await js("HD.cur")==did)
        await js("EX.ui.open()"); await p.wait_for_function("EX.ui.state.res&&EX.ui.state.edited===true", timeout=8000)
        T('المراجعة المحفوظة استُعيدت (الرقم 9876 لا الأصلي 1234) والتبويب «القضايا»', await js("EX.ui.state.res.items.find(o=>o.type=='case').no")=='9876' and await js("EX.ui.state.tab")=='case')
        T('الحقل المعروض يحمل 9876', await p.input_value('.exr[data-x] [data-xf=no]') == '9876')
        # تغيّر نص OCR: لا تُستعاد
        await js("DP.items[0]._ocr.text+=' زيادة';EX.ui.state.res=null;EX.ui.state.sig='';EX.ui.state.edited=false;EX.ui.open()"); await p.wait_for_timeout(600)
        T('نص OCR تغيّر ⇒ استخراج جديد وليس مراجعة قديمة', await js("EX.ui.state.res.items.find(o=>o.type=='case').no")=='1234' and await js("EX.ui.state.edited") is False)
        # لا خلط بين المستندات: النتيجة المعروضة لمستند آخر لا تُكتب باسم المستند الحالي
        await js("EX.ui.state.edited=true;EX.ui.state.sig='stale-sig'")
        T('نتيجة لا تخص الصفحات الحالية لا تُحفظ', await js("XC.saveNow()") is False)
        # تنظيف اليتيم
        await js("(async()=>{await HD.put('assets',{id:'xr:ghost',kind:'xr',tsig:'x',res:{items:[],tables:[]}})})()")
        T('prune يحذف مراجعة مستند غير موجود فقط', await js("XC.prune()")==1 and await js("(async()=>!!(await HD.get('assets','xr:'+HD.cur)))()") and not await js("(async()=>!!(await HD.get('assets','xr:ghost')))()"))
        await js("closeSheet()"); await act('hdlib'); await click('hddel', id=did); await p.wait_for_timeout(700)
        T('بعد حذف المستند يُنظَّف سجل مراجعته عند prune', await js("XC.prune()")>=1 and not await js("(async()=>!!(await HD.get('assets','xr:'+'%s'))) ()" % did))

        # ================= (2) الهجري =================
        await js(INJECT, {'text': DOC, 'name': 'هجري'}); await js("EX.ui.state.res=null;EX.ui.state.sig='';EX.ui.state.tab='date';EX.ui.open()"); await p.wait_for_selector('[data-act=exhij]')
        T('صف الهجري يعرض التقدير وزر التحويل', 'تقريباً' in await p.input_value('.exr[data-x]:has([data-act=exhij]) input[readonly]'))
        await click('exhij'); await p.wait_for_selector('.exw:has-text("محوَّل")', timeout=5000)
        h = await js("EX.ui.state.res.items.find(o=>o.hijri)")
        T('التحويل يملأ iso بالتقدير ويضع approx', h['iso'] == h['giso'] and h['approx'] is True and h['hijri'] == '1447/09/15', h)
        T('الواجهة تحذّر «قد يختلف يوماً أو يومين»', 'يومين' in await p.inner_text('.exr[data-x]:has(.exw)'))
        await p.fill('.exr[data-x]:has(.exw) [data-xf=iso]', '2026-03-05'); await p.wait_for_timeout(200)
        T('تعديل اليوم يدوياً يُسقط علامة التقريب (تحققتَ بنفسك)', await js("EX.ui.state.res.items.find(o=>o.hijri).approx")is False)

        # ================= (3) الاعتماد في القضية =================
        await js("closeSheet();EX.ui.state.res=null;EX.ui.state.sig='';"); await js(INJECT, {'text': DOC, 'name': 'توكيل أحمد'})
        await js("CLS.length=0;DLS.length=0;CLS.push({id:'c1',name:'محمد ضد خالد',no:'1234',year:'2026',court:'القاهرة',client:'محمد',opp:'خالد',status:'منظورة',notes:'ملاحظة',sessions:[]});CLS.push({id:'c2',name:'قضية أخرى',sessions:[]});_s('lists',CLS);_s('dls',DLS)")
        before = await js("JSON.stringify(CLS[0],(k,v)=>k=='sessions'?undefined:v)")
        await js("EX.ui.open()"); await click('excase'); await p.wait_for_selector('[data-xc=case]')
        T('بلا قضية مفتوحة ولا ربط: لا اختيار مسبق ولا زر اعتماد مفعّل', await p.input_value('[data-xc=case]') == '' and await p.is_disabled('[data-act=excaseok]') if await p.query_selector('[data-act=excaseok]') else True)
        await p.select_option('[data-xc=case]', 'c1'); await p.wait_for_selector('[data-act=excaseok]:not([disabled])')
        txt = await p.inner_text('#sh')
        T('المعاينة: جلسة قادمة + جلسة فائتة «منجزة» + ميعاد', 'جلسات ستُضاف (2)' in txt and 'مواعيد ستُضاف (1)' in txt and 'منجزة' in txt, txt[:300])
        T('الهجري غير المعتمد لا يظهر في المعاينة', 'رمضان' not in txt and '1447' not in txt)
        await click('excaseok'); await p.wait_for_selector('[data-act=cgo]')
        c = json.loads(await js("JSON.stringify(CLS[0])")); d = json.loads(await js("JSON.stringify(DLS)"))
        T('أُضيفت جلستان وميعاد واحد', len(c['sessions']) == 2 and len(d) == 1, {'s': len(c['sessions']), 'd': len(d)})
        T('شكل الجلسة القائم نفسه تماماً {id,date,time,note,done}', all(sorted(s.keys()) == ['date', 'done', 'id', 'note', 'time'] for s in c['sessions']), [sorted(s.keys()) for s in c['sessions']])
        T('شكل الميعاد القائم نفسه {id,title,end,case}', sorted(d[0].keys()) == ['case', 'end', 'id', 'title'] and d[0]['case'] == 'c1' and d[0]['end'] == FUT2.isoformat(), d[0])
        s_f = [s for s in c['sessions'] if s['date'] == FUT.isoformat()][0]; s_p = [s for s in c['sessions'] if s['date'] == PAST.isoformat()][0]
        T('الجلسة القادمة مفتوحة بوقتها 10:00 والفائتة منجزة', s_f['done'] is False and s_f['time'] == '10:00' and s_p['done'] is True, [s_f, s_p])
        T('ملاحظة الجلسة تحمل اسم المستند', s_f['note'] == 'من مستند: توكيل أحمد', s_f['note'])
        T('باقي بيانات القضية لم تُمسّ', await js("JSON.stringify(CLS[0],(k,v)=>k=='sessions'?undefined:v)") == before)
        T('القضية الثانية لم تُمسّ', await js("CLS[1].sessions.length")==0)
        T('التخزين المحلي يحمل ما كُتب (lists وdls)', await js("JSON.parse(localStorage.getItem('lists'))[0].sessions.length")==2 and await js("JSON.parse(localStorage.getItem('dls')).length")==1)
        T('الجلسة القادمة تظهر في أجندة التطبيق القائمة', await js("agendaItems().some(x=>x.k=='s'&&x.cid=='c1'&&x.date=='%s')" % FUT.isoformat()) and await js("agendaItems().some(x=>x.k=='d'&&x.cid=='c1')"))
        # تكرار
        await act('exopen'); await p.wait_for_selector('[data-act=excase]'); await click('excase'); await p.wait_for_selector('[data-xc=case]')
        T('بعد الاعتماد: يُقترح ربط القضية نفسها تلقائياً ولا شيء جديد ويُعطَّل الزر', await p.input_value('[data-xc=case]') == 'c1' and await p.is_disabled('[data-act=excaseok]'))
        txt = await p.inner_text('#sh'); T('كل شيء يظهر «تُركت» بسبب التكرار', 'تُركت (3)' in txt and 'مسجّلة من قبل' in txt and 'مسجّل من قبل' in txt, txt[:200])
        await js("(()=>{const c=CLS[0],before=c.sessions.length;window.__b=before})()"); await act('excaseok')
        T('الضغط على اعتماد بلا جديد لا يكرّر شيئاً', await js("CLS[0].sessions.length")==2 and await js("DLS.length")==1)
        # الاختيار المسبق من ربط المستند بقضية
        await js("closeSheet();CLS[0].sessions.length=0;DLS.length=0;HD.caseId='c2';XC.tgt=''"); await act('exopen'); await p.wait_for_selector('[data-act=excase]'); await click('excase'); await p.wait_for_selector('[data-xc=case]')
        T('القضية المرتبطة بالمستند (HD.caseId) تُختار مسبقاً', await p.input_value('[data-xc=case]') == 'c2')
        # هجري محوَّل يُنبَّه في المعاينة
        await js("closeSheet();HD.caseId='';XC.tgt='';(()=>{const o=EX.ui.state.res.items.find(o=>o.hijri);o.iso=o.giso;o.approx=true;o.kind='جلسة';o.on=true})()"); await js("EX.ui.open()"); await click('excase'); await p.wait_for_selector('[data-xc=case]'); await p.select_option('[data-xc=case]', 'c1')
        await p.wait_for_selector('.wn:has-text("محوَّلة من الهجري")', timeout=5000); T('التاريخ المحوَّل من هجري يظهر بتحذير قبل الاعتماد', True)
        await js("closeSheet()")

        # ================= (4) التقدّم والإلغاء =================
        await js("(async()=>{DP.items=[];for(let k=0;k<6;k++)DP.items.push(await (" + MK + ")({w:2600,h:3400,k}));DP.name='ضخم';DP.out='pdf';DP.kb='';DP.maxd='0';DP.res=null;HD.auto=false;dpWork()})()")
        await p.wait_for_function("DP.items.length==6", timeout=90000)
        await js("(()=>{window.__s=[];window.__tk=setInterval(()=>{const b=document.querySelector('#dppb'),e=document.querySelector('#dpp');if(b)window.__s.push([parseFloat(b.style.width)||0,e?e.textContent:''])},40)})()")
        await js("(()=>{window.__r=dpRun()})()"); await p.wait_for_selector('#dpp'); await p.wait_for_selector('[data-act=dpcancel]')
        T('شاشة التنفيذ: شريط تقدّم بدور progressbar وزر إلغاء', await js("!!document.querySelector('.dpbar[role=progressbar]')&&!!document.querySelector('[data-act=dpcancel]')"))
        await js("(()=>{window.__r2=dpRun()})()")
        await p.wait_for_function("DP.res&&DP.res.files.length==1", timeout=120000); await js("clearInterval(window.__tk)")
        s = await js("window.__s"); w = [x[0] for x in s]
        T('التقدّم لا يتراجع أبداً وينمو عبر عدة قيم', all(w[i] <= w[i + 1] for i in range(len(w) - 1)) and len(set(w)) >= 4, sorted(set(w))[:12])
        T('النص يحمل الصفحة والنسبة', any('معالجة صفحة' in x[1] and '%' in x[1] for x in s) and any('ترميز صفحة' in x[1] for x in s), s[0][1] if s else '')
        T('استدعاء dpRun مرة ثانية أثناء التشغيل يُتجاهَل (ملف واحد فقط)', await js("DP.res.files.length")==1 and await js("DP.running")is False)
        await p.wait_for_selector('[data-act=dpsave]'); await js("DP.res=null")
        # إلغاء في المنتصف
        n_dl = len(DL); await js("(()=>{window.__r=dpRun()})()"); await p.wait_for_function("(document.querySelector('#dpp')||{}).textContent&&document.querySelector('#dpp').textContent.indexOf('معالجة صفحة 3')>-1", timeout=60000)
        await click('dpcancel'); await p.wait_for_function("DP.running===false", timeout=20000); await p.wait_for_selector('[data-act=dprun]', timeout=10000)
        T('الإلغاء: لا نتيجة ولا تنزيل ولا تغيّر في الصفحات', await js("DP.res")is None and await js("DP.items.length")==6 and len(DL) == n_dl)
        T('الإلغاء: تعود شاشة الصفحات جاهزة للتنفيذ من جديد', await js("!!document.querySelector('#sh [data-act=dprun]')"))
        T('الإلغاء لا يترك علماً عالقاً', await js("DP.cancel")is False and await js("DP.running")is False)
        await js("(()=>{window.__r=dpRun()})()"); await p.wait_for_function("DP.res&&DP.res.files.length==1", timeout=120000)
        T('تنفيذ كامل بعد الإلغاء ينجح (ملف PDF بـ6 صفحات)', await js("DP.res.files[0].pages")==6)
        # إلغاء وقت الترميز (مع حجم مستهدف يُعيد المحاولة)
        await js("DP.res=null;DP.kb='150';dpWork()"); await js("(()=>{window.__r=dpRun()})()"); await p.wait_for_function("(document.querySelector('#dpp')||{}).textContent&&document.querySelector('#dpp').textContent.indexOf('ترميز')>-1", timeout=90000)
        await click('dpcancel'); await p.wait_for_function("DP.running===false", timeout=30000)
        T('الإلغاء أثناء مرحلة الترميز يعمل أيضاً (مع حجم مستهدف)', await js("DP.res")is None and len(DL) == n_dl)

        # ================= عام =================
        ls1 = set(json.loads(await js("JSON.stringify(Object.keys(localStorage))")))
        T('لا مفاتيح localStorage جديدة سوى lists وdls (يكتبهما الاعتماد عمداً بشكلهما القائم)', (ls1 - ls0) <= {'lists', 'dls'}, sorted(ls1 - ls0))
        T('بلا أخطاء JavaScript', not E, E[:3])
        await b.close()
asyncio.run(main()); srv.shutdown()
print(f'\nنجح {sum(R)} من {len(R)}'); sys.exit(0 if all(R) else 1)
