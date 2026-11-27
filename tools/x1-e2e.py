#!/usr/bin/env python3
"""اختبار الدفعة الأولى من المؤجَّل (1.27.0) في Chromium بحجم هاتف:
تشفير المستندات الممسوحة (ترحيل، قراءة/كتابة، إعادة تحميل، تغيير الكلمة، القفل، منع إلغاء الخزنة، فك التشفير)،
النسخ الاحتياطية المشفّرة (JSON وزip: تصدير واستيراد بكلمة صحيحة وخاطئة)، مطابقة الموكل في كشف الأتعاب، وزر ICS في الأجندة.
الاستعمال: python3 tools/x1-e2e.py [مجلد_التطبيق]"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, json
from playwright.async_api import async_playwright
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8799), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8799/index.html'; TMP = tempfile.mkdtemp(); R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)[:300]) if x != '' and not c else ''))
PW, PW2, BP = 'جملة سرية طويلة 2026', 'كلمة جديدة أطول 2027', 'نسخة بكلمة خاصة 55'
RAW = """async(s)=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('hscan-db');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const rows=await new Promise((res,rej)=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});db.close();
return rows.map(r=>({enc:!!(r&&r.__x),keys:Object.keys(r&&!(r instanceof Blob)?r:{}),blob:r instanceof Blob,name:r&&r.name,id:r&&r.id}))}"""
SEED = """async()=>{const b=new Blob([new Uint8Array(5000).map((_,i)=>i%256)],{type:'image/jpeg'});
await HD.put('docs',{id:'dA',kind:'scan',name:'عقد سري',text:'نص OCR حساس',client:'موكل أ',tags:['x'],pages:1,created:1,updated:2,size:5000,items:[{name:'ص1',k:'dA/p1'}],sigs:[]});
await HD.put('blobs',b,'dA/p1');await HD.put('assets',{id:'sg1',kind:'sig',a:1,png:new Blob([new Uint8Array([1,2,3])],{type:'image/png'}),created:1});return true}"""
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True)
        p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e))); p.on('dialog', lambda d: asyncio.ensure_future(d.accept('')))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await p.goto(URL); await p.wait_for_timeout(1500)
        async def settle(ms=1500): await p.wait_for_timeout(ms); await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false}")
        async def openLock():
            await p.evaluate("()=>{closeSheet();moreSheet()}"); await p.wait_for_timeout(250); await p.click('.ml [data-act="lock"]'); await p.wait_for_timeout(500)
        await settle()
        LISTS = [{'id': 'c1', 'name': 'قضية 1', 'client': 'أحمد  علي', 'items': [], 'sessions': [{'id': 's1', 'date': '2030-01-01', 'note': 'x', 'done': False}]}, {'id': 'c2', 'name': 'قضية 2', 'client': 'السيد/ احمد علي', 'items': [], 'sessions': []}, {'id': 'c3', 'name': 'قضية 3', 'client': 'احمد علي حسن', 'items': [], 'sessions': []}]
        await p.evaluate("l=>localStorage.setItem('lists',JSON.stringify(l))", LISTS); await p.reload(); await settle()
        # ---- J) كشف الأتعاب: مطابقة الموكل بالتطبيع
        n = await p.evaluate("()=>feeStmtData('c1',{all:true}).cs.map(c=>c.id).join()")
        T('J1 كشف «كل قضايا الموكل»: «أحمد  علي» و«السيد/ احمد علي» موكل واحد، والتشابه الجزئي «احمد علي حسن» خارجه', n == 'c1,c2', n)
        await p.evaluate("()=>feeStmtSheet('c1')"); await p.wait_for_timeout(300)
        T('J2 خيار «كل القضايا» يظهر لأن للموكل أكثر من قضية', await p.locator('#fs_a').count() == 1)
        await p.evaluate("()=>{closeSheet();feeStmtSheet('c3')}"); await p.wait_for_timeout(300)
        T('J3 موكل بقضية واحدة (c3): لا خيار «كل القضايا»', await p.locator('#fs_a').count() == 0)
        # ---- K) ICS في الأجندة
        await p.evaluate("()=>{closeSheet();agendaSheet()}"); await p.wait_for_timeout(300)
        T('K1 زر تصدير ICS في الأجندة مرة واحدة', await p.locator('#sh [data-act="ntfics"]').count() == 1)
        await p.evaluate("()=>{closeSheet();agendaSheet()}"); await p.wait_for_timeout(200)
        T('K2 فتح الأجندة ثانية لا يكرّر الزر', await p.locator('#sh [data-act="ntfics"]').count() == 1)
        await p.evaluate("()=>closeSheet()")
        # ---- الخزنة + المستندات
        r = await p.evaluate("pw=>VAULT.enable(pw)", PW); T('A0 تفعيل الخزنة', r.get('ok'), r)
        await p.evaluate(SEED); a0 = await p.evaluate(RAW, 'docs'); b0 = await p.evaluate(RAW, 'blobs')
        T('A1 قبل التفعيل: السجلات صريحة (اسم المستند ظاهر وصورة Blob)', a0[0]['enc'] is False and a0[0]['name'] == 'عقد سري' and b0[0]['blob'] is True, [a0, b0])
        T('A2 المستندات غير مشفّرة افتراضياً (dvon غير مضبوط)', await p.evaluate("()=>localStorage.getItem('dvon')") is None)
        e = await p.evaluate("()=>DVX.enable()"); await p.wait_for_timeout(600)
        T('B1 DVX.enable: ينجح ويرحّل 3 سجلات (مستند+صورة+توقيع) بلا فشل', e.get('ok') and e['done'] >= 3 and e['failed'] == 0, e)
        docs, blobs, assets = [await p.evaluate(RAW, s) for s in ('docs', 'blobs', 'assets')]
        T('B2 كل السجلات مشفّرة: لا اسم ولا نص في سجل المستند، وسجل الصورة ليس Blob', all(x['enc'] for x in docs + blobs + assets) and docs[0]['name'] is None and 'text' not in docs[0]['keys'] and docs[0]['id'] == 'dA' and blobs[0]['blob'] is False, [docs, blobs, assets])
        ks = await p.evaluate("()=>Object.keys(localStorage)")
        T('B3 مفتاح البيانات DEK محفوظ داخل الخزنة (vx.dek) ولا مفتاح صريح، وdvon=1', 'vx.dek' in ks and 'dek' not in ks and await p.evaluate("()=>localStorage.getItem('dvon')") == '1', ks)
        T('B4 قيمة vx.dek المشفّرة ≠ المفتاح الحقيقي', await p.evaluate("()=>localStorage.getItem('vx.dek')!==localStorage.getItem('dek')"))
        g = await p.evaluate("async()=>{const d=await HD.get('docs','dA'),b=await HD.get('blobs','dA/p1'),u=new Uint8Array(await b.arrayBuffer()),s=await HD.get('assets','sg1');return{name:d.name,text:d.text,sz:b.size,ty:b.type,f:u[0],l:u[4999],sig:s.png.size,all:(await HD.all('docs')).map(x=>x.name)}}")
        T('C1 القراءة عبر HD تفك التشفير: الاسم والنص والصورة (الحجم والنوع والبايتات) والتوقيع', g['name'] == 'عقد سري' and g['text'] == 'نص OCR حساس' and g['sz'] == 5000 and g['ty'] == 'image/jpeg' and g['f'] == 0 and g['l'] == 4999 % 256 and g['sig'] == 3 and g['all'] == ['عقد سري'], g)
        await p.evaluate("async()=>{await HD.put('docs',{id:'dB',kind:'scan',name:'مستند جديد',pages:1,updated:3,created:3,items:[],sigs:[]})}"); docs = await p.evaluate(RAW, 'docs')
        T('C2 كتابة جديدة بعد التفعيل تُحفظ مشفّرة', [x['enc'] for x in docs] == [True, True] and all(x['name'] is None for x in docs), docs)
        pid = await p.evaluate("async()=>{const id=await HD.addPdf('ملف PDF سري',new Uint8Array([37,80,68,70,45]),'');const d=await HD.get('docs',id),b=await HD.get('blobs',id+'/pdf');return{id,name:d.name,sz:b.size,ty:b.type}}")
        rawd, rawb = await p.evaluate(RAW, 'docs'), await p.evaluate(RAW, 'blobs')
        T('C3 HD.addPdf: يُحفظ مشفّراً ويُقرأ سليماً (اسم، حجم 5، نوع PDF)', pid['name'] == 'ملف PDF سري' and pid['sz'] == 5 and pid['ty'] == 'application/pdf' and all(x['enc'] for x in rawd + rawb), [pid, rawd, rawb])
        sv = await p.evaluate("""async()=>{const c=document.createElement('canvas');c.width=60;c.height=40;const x=c.getContext('2d');x.fillStyle='#c33';x.fillRect(0,0,60,40);
const b=await new Promise(r=>c.toBlob(r,'image/png'));DP.items.push(await dpLoad(new File([b],'s.png',{type:'image/png'})));DP.name='مسح تلقائي سري';HD.cur=null;await HD.save(true);
const id=HD.cur,d=await HD.get('docs',id),keys=await new Promise(res=>{HD.open?0:0;res(0)});const bl=await HD.get('blobs',d.items[0].k);return{id,name:d.name,pages:d.pages,bs:bl.size,bt:bl.type}}""")
        rd, rbk = await p.evaluate(RAW, 'docs'), await p.evaluate(RAW, 'blobs')
        T('C4 الحفظ التلقائي لمستند ممسوح (HD.save): يُقرأ سليماً (اسم وصفحة وصورة) ويُحفظ مشفّراً', sv['name'] == 'مسح تلقائي سري' and sv['pages'] == 1 and sv['bs'] > 50 and all(x['enc'] for x in rd + rbk), [sv, rd, rbk])
        # إعادة تحميل (الخزنة تبقى مفتوحة بتسليم ذاكرة التبويب)
        await p.reload(); await settle(); g = await p.evaluate("async()=>({n:(await HD.all('docs')).length,name:(await HD.get('docs','dA')).name})")
        T('D1 بعد إعادة التحميل: المستندات تُقرأ (4 مستندات)', g == {'n': 4, 'name': 'عقد سري'}, g)
        # تغيير كلمة المرور لا يعيد تشفير المستندات ولا يفقدها
        rb = await p.evaluate("async()=>{const r=await HD.all('docs');return 1}"); before = await p.evaluate(RAW, 'blobs')
        r = await p.evaluate("([a,b])=>VAULT.change(a,b)", [PW, PW2]); await p.wait_for_timeout(700); T('E1 تغيير كلمة الخزنة ينجح', r.get('ok'), r)
        await p.reload(); await settle(); g = await p.evaluate("async()=>(await HD.get('docs','dA')).name"); T('E2 بعد تغيير الكلمة وإعادة التحميل: المستندات ما زالت تُقرأ (DEK أُعيد لفّه)', g == 'عقد سري', g)
        # القفل
        await p.evaluate("()=>VAULT.lockNow()"); await p.wait_for_timeout(1500)
        T('F0 شاشة القفل ظاهرة', await p.locator('#vx').count() == 1)
        o = await p.evaluate("async()=>{let e='';try{await HD.put('docs',{id:'zz',name:'تسريب'})}catch(x){e=x.message}const d=await HD.get('docs','dA');return{e,enc:!!(d&&d.__x),name:d&&d.name}}")
        T('F1 والخزنة مقفولة: الكتابة مرفوضة (locked) فلا تتسرب بيانات صريحة، والقراءة تعيد السجل المشفّر لا الاسم', o['e'] == 'locked' and o['enc'] is True and o['name'] is None, o)
        T('F2 لا سجل «zz» كُتب', 'zz' not in [x['id'] for x in await p.evaluate(RAW, 'docs')])
        r = await p.evaluate("pw=>VAULT.unlock(pw)", PW); T('F3 كلمة قديمة بعد التغيير ترفض', r.get('err'), r)
        r = await p.evaluate("pw=>VAULT.unlock(pw)", PW2); T('F4 الكلمة الجديدة تفتح', r.get('ok'), r); await p.reload(); await settle()
        g = await p.evaluate("async()=>(await HD.get('docs','dA')).name"); T('F5 بعد الفتح: المستند يُقرأ', g == 'عقد سري', g)
        # حارس إلغاء الخزنة
        r = await p.evaluate("pw=>VAULT.disable(pw)", PW2); T('G1 إلغاء الخزنة مرفوض ما دامت المستندات مشفّرة', r.get('err') and 'ألغِ تشفير' in r['err'], r)
        await openLock(); sh = await p.inner_text('#sh')
        T('G2 قسم «المستندات الممسوحة» في شاشة الخزنة: مشفّرة + زر الإلغاء', 'المستندات الممسوحة' in sh and await p.locator('#sh [data-act="dvoff"]').count() == 1 and await p.locator('#sh [data-act="dvon"]').count() == 0, sh[:200])
        T('G3 إحصاء السجلات يظهر', 'مشفّرة' in sh or await p.wait_for_function("()=>/\\d+\\s*مشفّرة/.test(document.querySelector('#dv_s').innerText)", timeout=3000) is not None)
        await p.evaluate("()=>closeSheet()")
        # ---- H) نسخ احتياطية مشفّرة
        await p.evaluate("()=>bkSheet()"); await p.wait_for_timeout(300)
        T('H0 زرا النسخة المشفّرة في شاشة النسخ الاحتياطي', await p.locator('#sh #bxjson').count() == 1 and await p.locator('#sh #bxfull').count() == 1)
        T('H1 حقلا الاستعادة يقبلان .llbk', 'llbk' in await p.evaluate("()=>(document.querySelector('#bkf')||{}).accept||''") and 'llbk' in await p.evaluate("()=>(document.querySelector('#hdzf')||{}).accept||''"))
        await p.click('#bxjson'); await p.wait_for_selector('#bx_p1'); await p.fill('#bx_p1', 'قصيرة'); await p.fill('#bx_p2', 'قصيرة'); await p.click('[data-act="bxok"]'); await p.wait_for_timeout(300)
        T('H2 كلمة قصيرة ترفض برسالة', 'أحرف' in await p.inner_text('#bx_m'), await p.inner_text('#bx_m'))
        await p.fill('#bx_p1', BP); await p.fill('#bx_p2', BP + 'x'); await p.click('[data-act="bxok"]'); await p.wait_for_timeout(300)
        T('H3 كلمتان غير متطابقتين ترفض', 'غير متطابقت' in await p.inner_text('#bx_m'), await p.inner_text('#bx_m'))
        await p.fill('#bx_p2', BP)
        async with p.expect_download(timeout=60000) as dl: await p.click('[data-act="bxok"]')
        d = await dl.value; pj = os.path.join(TMP, 'b.llbk'); await d.save_as(pj); jb = open(pj, 'rb').read()
        T('H4 تنزيل ملف .llbk يبدأ بـ LLBX1 ولا يحوي نصاً صريحاً', d.suggested_filename.endswith('.llbk') and jb[:5] == b'LLBX1' and b'legal-library' not in jb and 'قضية'.encode() not in jb, d.suggested_filename)
        dec = await p.evaluate("async(a)=>{const u=new Uint8Array(a),o=await BX.dec(u,%s);return JSON.parse(new TextDecoder().decode(o))}" % json.dumps(BP), list(jb))
        T('H5 فك الملف بكلمته يعيد نسخة المكتبة (app وlists)', dec['app'] == 'legal-library' and 'lists' in dec['data'], list(dec.keys()))
        await p.evaluate("()=>bkSheet()"); await p.wait_for_timeout(300); await p.set_input_files('#bkf', pj); await p.wait_for_selector('#bx_p1'); await p.fill('#bx_p1', 'كلمة غلط تماماً 1'); await p.click('[data-act="bxok"]'); await p.wait_for_timeout(1200)
        T('H6 استعادة بكلمة خاطئة: رسالة والشاشة باقية', 'غير صحيحة' in await p.inner_text('#bx_m'), await p.inner_text('#bx_m'))
        await p.fill('#bx_p1', BP); await p.click('[data-act="bxok"]'); await p.wait_for_selector('#sh [data-act="bkmerge"]', timeout=20000); sh = await p.inner_text('#sh')
        T('H7 بكلمة صحيحة: تظهر شاشة الاستعادة المعتادة بمحتوى النسخة', 'استعادة نسخة' in sh and 'قضية' in sh and await p.locator('#sh [data-act="bkmerge"]').count() == 1, sh[:200])
        await p.evaluate("()=>closeSheet()")
        # نسخة كاملة مشفّرة
        await p.evaluate("()=>bkSheet()"); await p.wait_for_timeout(300); await p.click('#bxfull'); await p.wait_for_selector('#bx_p1'); await p.fill('#bx_p1', BP); await p.fill('#bx_p2', BP)
        async with p.expect_download(timeout=90000) as dl: await p.click('[data-act="bxok"]')
        d = await dl.value; pz = os.path.join(TMP, 'f.llbk'); await d.save_as(pz); zb = open(pz, 'rb').read()
        T('H8 النسخة الكاملة المشفّرة: LLBX1 ولا تحوي PK (zip صريح) ولا اسم مستند', zb[:5] == b'LLBX1' and b'PK\x03\x04' not in zb[:64] and 'عقد سري'.encode() not in zb and len(zb) > 5000, len(zb))
        zk = await p.evaluate("async(a)=>{const o=await BX.dec(new Uint8Array(a),%s),Z=HDN.readFull(o);return{docs:Z.man.docs.map(x=>x.name).sort(),blob:Z.man.blobs.length}}" % json.dumps(BP), list(zb))
        T('H9 داخل النسخة الكاملة المستندات مفكوكة (الاسم صريح داخل المشفّر) وليست مشفّرة مرتين', 'عقد سري' in zk['docs'] and zk['blob'] >= 2, zk)
        await p.evaluate("()=>bkSheet()"); await p.wait_for_timeout(300); await p.set_input_files('#hdzf', pz); await p.wait_for_selector('#bx_p1'); await p.fill('#bx_p1', BP); await p.click('[data-act="bxok"]')
        await p.wait_for_selector('#sh [data-act="hdzrep"]', timeout=30000)
        T('H10 استعادة النسخة الكاملة المشفّرة: تظهر شاشة الاستعادة بعدد المستندات', 'مستند ممسوح' in await p.inner_text('#sh'))
        await p.evaluate("()=>{window.__rl=0}"); await p.click('[data-act="hdzrep"]'); await p.wait_for_timeout(3500); await settle(2000)
        g = await p.evaluate("async()=>({names:(await HD.all('docs')).map(x=>x.name).sort(),b:(await HD.get('blobs','dA/p1')).size})"); raw = await p.evaluate(RAW, 'docs')
        T('H11 بعد الاستبدال: المستندات كلها قابلة للقراءة والصورة سليمة', 'عقد سري' in g['names'] and g['b'] == 5000, g)
        T('H12 وبعد الاستعادة تُحفظ مشفّرة في المكتبة (تشفير عند الاستيراد)', all(x['enc'] for x in raw) and len(raw) >= 3, raw)
        # ---- I) إلغاء تشفير المستندات
        e = await p.evaluate("()=>DVX.disable()"); await p.wait_for_timeout(600); docs, blobs, assets = [await p.evaluate(RAW, s) for s in ('docs', 'blobs', 'assets')]
        T('I1 DVX.disable: كل السجلات صريحة من جديد ولا فشل', e.get('ok') and e['failed'] == 0 and not any(x['enc'] for x in docs + blobs + assets) and any(x['name'] == 'عقد سري' for x in docs), e)
        ks = await p.evaluate("()=>Object.keys(localStorage)"); T('I2 حُذف المفتاح والعلم (لا vx.dek ولا dvon)', 'vx.dek' not in ks and 'dvon' not in ks, ks)
        g = await p.evaluate("async()=>(await HD.get('docs','dA')).name"); T('I3 المستندات تُقرأ كما كانت', g == 'عقد سري')
        await openLock(); T('I4 الشاشة تعرض زر «تشفير مستنداتي الممسوحة» من جديد', await p.locator('#sh [data-act="dvon"]').count() == 1)
        r = await p.evaluate("()=>DVX.migrate()"); T('I5 DVX.migrate بلا تفعيل لا يفعل شيئاً', r == {'done': 0, 'failed': 0}, r)
        T('Z لا أخطاء JS', not errs, errs[:3])
        await ctx.close(); await br.close()
asyncio.run(main())
print(f"\n{sum(R)}/{len(R)} نجح" + ('' if all(R) else ' — توجد إخفاقات')); sys.exit(0 if all(R) else 1)
