#!/usr/bin/env python3
"""اختبار L0 (1.21.0): تحصين — ترقيم الإيصالات الثابت، التخزين الدائم وشاشة الجاهزية، تخزين أدوات PDF مسبقاً في عامل الخدمة،
حارس «نسيت الرمز»، نسخة كاملة تشمل مكتبة المستندات الممسوحة (IndexedDB) ذهاباً وإياباً.
الاستعمال: python3 tools/l0-e2e.py [مجلد_التطبيق]   (الافتراضي: مجلد المشروع؛ مرّر نسخة قديمة لإثبات أن الاختبار يفشل قبل الإصلاح)"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, json
from playwright.async_api import async_playwright
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Q, directory=SITE)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8793), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8793/index.html'
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
LISTS = [{'id': 'c1', 'name': 'قضية اختبار', 'client': 'موكل أ', 'items': [], 'sessions': []}]
PAYS = [{'id': 'a1', 'case': 'c1', 'k': 'pay', 'amt': 100, 'date': '2026-01-01', 'note': ''}, {'id': 'a2', 'case': 'c1', 'k': 'pay', 'amt': 200, 'date': '2026-01-02', 'note': ''}, {'id': 'a3', 'case': 'c1', 'k': 'pay', 'amt': 300, 'date': '2026-01-03', 'note': ''}, {'id': 'a4', 'case': 'c1', 'k': 'fee', 'amt': 1000, 'date': '2026-01-01', 'note': ''}]
async def fresh(br, sw='block', seed=None):
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers=sw, accept_downloads=True); p = await ctx.new_page(); p.errs = []
    p.on('pageerror', lambda e: p.errs.append(str(e)))
    await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await p.goto(URL); await p.wait_for_timeout(800)
    if seed:
        await p.evaluate("s=>{for(const k in s)localStorage.setItem(k,JSON.stringify(s[k]))}", seed); await p.reload(); await p.wait_for_timeout(1200)
    await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false}")
    return ctx, p
async def click_act(p, act, **attrs):
    a = ''.join(f' data-{k}="{v}"' for k, v in attrs.items())
    await p.evaluate("h=>{document.querySelector('#tb')?.remove();document.body.insertAdjacentHTML('beforeend',h)}", f'<button id="tb" data-act="{act}"{a}>x</button>')
    await p.click('#tb', force=True); await p.wait_for_timeout(500)
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch()
        # ---- A: عامل الخدمة يخزّن lib/ والأيقونات مسبقاً
        ctx, p = await fresh(br, sw='allow')
        await p.evaluate("()=>navigator.serviceWorker.ready"); await p.wait_for_timeout(6000)
        miss = await p.evaluate("async()=>{const m=[];for(const u of ['lib/pdf-lib.min.js','lib/pdf.min.js','lib/pdf.worker.min.js','lib/jsQR.js','icons/icon-512.png','icons/icon-maskable-512.png','js/harden.js'])if(!await caches.match(u,{ignoreSearch:true}))m.push(u);return m}")
        T('A1 lib/ والأيقونات وharden.js في كاش عامل الخدمة بعد التثبيت', not miss, miss)
        await ctx.close()
        # ---- C: ترقيم الإيصالات
        ctx, p = await fresh(br, seed={'lists': LISTS, 'acc': PAYS}); p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        rn = await p.evaluate("()=>ACC.filter(x=>x.k=='pay').map(x=>x.rno)")
        T('C1 القيود القديمة تُرقَّم مرة واحدة بترتيبها (1،2،3)', rn == [1, 2, 3], rn)
        await p.evaluate("()=>{window.__n=[];window.mwSend=(u8,n)=>{window.__n.push(n)}}")
        await p.evaluate("()=>feeSheet('c1')"); await p.wait_for_timeout(300)
        await p.click('[data-act="fdel"][data-id="a1"]'); await p.wait_for_timeout(400)
        await p.evaluate("()=>feeReceipt('a2')"); await p.wait_for_timeout(300)
        n = await p.evaluate("()=>window.__n")
        T('C2 حذف دفعة أولى لا يغيّر رقم إيصال الدفعة الثانية (002)', n and '002' in n[-1], n)
        await p.evaluate("()=>feeAdd('pay')"); await p.fill('#fa_amt', '50'); await p.click('[data-act="fsave"]'); await p.wait_for_timeout(400)
        new = await p.evaluate("()=>ACC.filter(x=>x.k=='pay').map(x=>[x.id,x.rno])")
        T('C3 دفعة جديدة تأخذ رقماً أكبر من الأعلى (4) لا يُعاد استعمال رقم محذوف', any(r == 4 for _, r in new) and [r for _, r in new if r in (1,)] == [], new)
        stored = await p.evaluate("()=>JSON.parse(localStorage.getItem('acc')).filter(x=>x.k=='pay').map(x=>x.rno)")
        T('C4 الأرقام محفوظة في التخزين', None not in stored and len(stored) == 3, stored)
        T('C5 لا أخطاء JS', not p.errs, p.errs[:2]); await ctx.close()
        # ---- B + F + G: التخزين الدائم وشاشة الجاهزية
        ctx, p = await fresh(br, seed={'lists': LISTS})
        await p.wait_for_timeout(2500)
        T('B1 طلب التخزين الدائم يُنفَّذ عند وجود بيانات (القيمة منطقية أو null)', await p.evaluate("()=>HDN.persisted===true||HDN.persisted===false||HDN.persisted===null") and await p.evaluate("()=>typeof HDN.persisted")!='undefined')
        await click_act(p, 'hdready'); await p.wait_for_timeout(1200)
        txt = await p.inner_text('#sh')
        T('B2 شاشة الجاهزية تعرض البنود الأربعة', all(w in txt for w in ['تخزين دائم', 'أدوات PDF', 'التعرف على النص', 'النسخة الاحتياطية']), txt[:80])
        T('B3 قبل التنزيل: أدوات PDF غير محفوظة (SW محجوب) وزر التنزيل ظاهر', await p.locator('[data-act="hdlibs"]').count() == 1)
        await p.click('[data-act="hdlibs"]'); await p.wait_for_timeout(3500)
        st = await p.evaluate("()=>HDN.status()")
        T('B4 زر التنزيل يحفظ الأدوات الأربع', st['libs']['ok'] == st['libs']['total'] == 4, st['libs'])
        T('F1 bkSheet تضيف زر النسخة الكاملة مرة واحدة', await p.evaluate("()=>{bkSheet();bkSheet();return document.querySelectorAll('#hdfull').length}") == 1)
        T('G1 OC.cached وOC.ensure متاحتان', await p.evaluate("()=>typeof OC.cached=='function'&&typeof OC.ensure=='function'"))
        T('B5 لا أخطاء JS', not p.errs, p.errs[:2]); await ctx.close()
        # ---- E: نسخة كاملة ذهاباً وإياباً
        ctx, p = await fresh(br, seed={'lists': LISTS, 'acc': PAYS})
        await p.evaluate("""async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('hscan-db',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('docs',{keyPath:'id'});d.createObjectStore('blobs');d.createObjectStore('assets',{keyPath:'id'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
          const b=new Uint8Array(256).map((_,i)=>i),t=db.transaction(['docs','blobs','assets'],'readwrite');
          t.objectStore('docs').put({id:'d1',name:'مستند أ',created:new Date('2026-02-03T10:00:00Z'),meta:{tags:['x','y'],n:2}});
          t.objectStore('blobs').put(new Blob([b],{type:'image/jpeg'}),'d1/0');t.objectStore('blobs').put(b.buffer.slice(0),'d1/1');
          t.objectStore('assets').put({id:'sig',kind:'sig',img:new Uint8Array([9,8,7])});t.objectStore('assets').put({id:'xr:d1',kind:'xr',res:{k:1}});
          await new Promise(r=>t.oncomplete=r);db.close()}""")
        r = await p.evaluate("async()=>{const r=await HDN.buildFull();window.__z=r.bytes;return{c:r.counts,n:r.bytes.length}}")
        T('E1 بناء النسخة الكاملة يعدّ المستندات والأصول والكتل', r['c'] == {'docs': 1, 'assets': 2, 'blobs': 2}, r)
        names = await p.evaluate("()=>zipRead(__z.buffer.slice(0)).map(e=>e.name).sort()")
        T('E2 الملف zip فيه backup.json وmanifest وملفات ثنائية', 'backup.json' in names and 'hscan/manifest.json' in names and sum(n.startswith('hscan/f/') for n in names) == 3, names)
        await p.evaluate("async()=>{const db=await new Promise(res=>{const r=indexedDB.open('hscan-db',1);r.onsuccess=()=>res(r.result)});await new Promise(res=>{const t=db.transaction(['docs','blobs','assets'],'readwrite');['docs','blobs','assets'].forEach(s=>t.objectStore(s).clear());t.oncomplete=res});db.close()}")
        out = await p.evaluate("""async()=>{const Z=HDN.readFull(__z),n=await HDN.applyIdb(Z,'merge'),n2=await HDN.applyIdb(Z,'merge');
          const db=await new Promise(res=>{const r=indexedDB.open('hscan-db',1);r.onsuccess=()=>res(r.result)}),g=(s,k)=>new Promise(res=>{const q=db.transaction(s).objectStore(s).get(k);q.onsuccess=()=>res(q.result)});
          const d=await g('docs','d1'),b0=await g('blobs','d1/0'),b1=await g('blobs','d1/1'),sg=await g('assets','sig');
          const u0=new Uint8Array(await b0.arrayBuffer());db.close();
          return{n,n2,name:d.name,dateOk:d.created instanceof Date&&d.created.toISOString()=='2026-02-03T10:00:00.000Z',tags:d.meta.tags,isBlob:b0 instanceof Blob,type:b0.type,bytesOk:u0.length==256&&u0[255]==255&&u0[7]==7,ab:b1 instanceof ArrayBuffer&&b1.byteLength==256,u8:sg.img instanceof Uint8Array&&sg.img.join()=='9,8,7',p:Z.p.d.acc!=null}}""")
        T('E3 الاستعادة (دمج) تعيد المستند بنوع Blob وبايتاته وتاريخه وArrayBuffer وUint8Array', out['n'] == {'docs': 1, 'assets': 2, 'blobs': 2} and out['name'] == 'مستند أ' and out['dateOk'] and out['tags'] == ['x', 'y'] and out['isBlob'] and out['type'] == 'image/jpeg' and out['bytesOk'] and out['ab'] and out['u8'], out)
        T('E4 الدمج مرة ثانية لا يكرر ولا يكتب فوق (0 جديد)', out['n2'] == {'docs': 0, 'assets': 0, 'blobs': 0}, out['n2'])
        rep = await p.evaluate("""async()=>{const Z=HDN.readFull(__z);const db=await new Promise(res=>{const r=indexedDB.open('hscan-db',1);r.onsuccess=()=>res(r.result)});
          await new Promise(res=>{const t=db.transaction('docs','readwrite');t.objectStore('docs').put({id:'d2',name:'زائد'});t.oncomplete=res});db.close();
          await HDN.applyIdb(Z,'replace');const d2=await new Promise(res=>{const r=indexedDB.open('hscan-db',1);r.onsuccess=()=>res(r.result)});
          const ids=await new Promise(res=>{const q=d2.transaction('docs').objectStore('docs').getAllKeys();q.onsuccess=()=>res(q.result)});d2.close();return ids}""")
        T('E5 الاستبدال يمسح الزائد ويبقي ما في النسخة فقط', rep == ['d1'], rep)
        bad = await p.evaluate("()=>{try{HDN.readFull(new Uint8Array(zipWrite([{name:'x.txt',method:0,time:0,date:33,crc:0,cs:0,us:0,raw:new Uint8Array(0)}])));return'accepted'}catch(e){return'rejected'}}")
        T('E6 zip ليس نسخة كاملة يُرفض', bad == 'rejected', bad)
        T('E7 لا أخطاء JS', not p.errs, p.errs[:2]); await ctx.close()
        # ---- D: حارس نسيت الرمز
        ctx, p = await fresh(br, seed={'lists': LISTS, 'acc': PAYS}); p.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        await p.evaluate("""async()=>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('ll-v1:'+'4821'));localStorage.setItem('pinh',[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''));localStorage.setItem('pinl','4');sessionStorage.removeItem('unl')}""")
        await p.reload(); await p.wait_for_timeout(1200)
        T('D1 شاشة القفل ظاهرة', await p.locator('#lk').count() == 1)
        await p.click('[data-pd="forgot"]'); await p.wait_for_timeout(400)
        T('D2 «نسيت الرمز» يعرض الحارس ولا يمسح شيئاً', await p.locator('#hdfg').count() == 1 and await p.evaluate("()=>!!localStorage.getItem('lists')"))
        T('D3 زر المتابعة معطّل قبل النسخة أو التأكيد', await p.locator('#hdgo').is_disabled())
        await p.click('[data-hd="no"]'); await p.wait_for_timeout(200)
        T('D4 الإلغاء يغلق الحارس والبيانات سليمة', await p.locator('#hdfg').count() == 0 and await p.evaluate("()=>!!localStorage.getItem('lists')"))
        await p.click('[data-pd="forgot"]'); await p.wait_for_timeout(300)
        async with p.expect_download() as dl: await p.click('[data-hd="bk"]')
        d = await dl.value
        T('D5 زر النسخة يحمّل ملف zip كاملاً', d.suggested_filename.endswith('.zip') and 'نسخة-كاملة' in d.suggested_filename, d.suggested_filename)
        await p.wait_for_timeout(500)
        T('D6 بعد حفظ النسخة يُفعَّل التأكيد والمتابعة', await p.locator('#hdgo').is_enabled() and await p.evaluate("()=>document.querySelector('#hdok').checked"))
        await p.click('#hdgo'); await p.wait_for_timeout(2500)
        left = await p.evaluate("()=>[localStorage.getItem('lists'),localStorage.getItem('pinh')]")
        T('D7 المتابعة تنفّذ المسح الأصلي (بياناتك والرمز زالا)', left == [None, None], left)
        await ctx.close(); await br.close()
asyncio.run(main())
print(f"\n{sum(R)} نجح، {len(R) - sum(R)} فشل"); sys.exit(0 if all(R) else 1)
