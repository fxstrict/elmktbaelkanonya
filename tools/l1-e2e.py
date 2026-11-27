#!/usr/bin/env python3
"""اختبار L1 (1.22.0): التنبيهات — نواة نقية، ICS، تنبيه عند الفتح بلا تكرار، شارة، لقطة لعامل الخدمة، تشغيل التنبيه من عامل الخدمة.
الاستعمال: python3 tools/l1-e2e.py [مجلد_التطبيق]"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, datetime
from playwright.async_api import async_playwright
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8794), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8794/index.html'
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)[:150]) if x != '' else ''))
d0 = datetime.date.today(); iso = lambda n: (d0 + datetime.timedelta(days=n)).isoformat()
LISTS = [{'id': 'c1', 'name': 'قضية اختبار', 'client': 'موكل أ', 'items': [], 'sessions': [
    {'id': 's1', 'date': iso(0), 'time': '10:30', 'note': 'جلسة مرافعة', 'done': False},
    {'id': 's2', 'date': iso(1), 'time': '', 'note': 'جلسة غداً', 'done': False},
    {'id': 's3', 'date': iso(-3), 'time': '', 'note': 'فاتت', 'done': False},
    {'id': 's4', 'date': iso(0), 'time': '', 'note': 'منتهية', 'done': True}]}]
DLS = [{'id': 'd1', 'title': 'استئناف', 'end': iso(2), 'case': 'c1'}]
SEED = {'lists': LISTS, 'dls': DLS}
async def fresh(br, sw='block', seed=SEED, perm=False, badge=False):
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers=sw, accept_downloads=True)
    if perm: await ctx.grant_permissions(['notifications'], origin='http://127.0.0.1:8794')
    if badge: await ctx.add_init_script("window.__b=[];navigator.setAppBadge=n=>{window.__b.push(n);return Promise.resolve()};navigator.clearAppBadge=()=>{window.__b.push(0);return Promise.resolve()}")
    p = await ctx.new_page(); p.errs = []; p.on('pageerror', lambda e: p.errs.append(str(e)))
    await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await p.goto(URL); await p.wait_for_timeout(600)
    if seed:
        await p.evaluate("s=>{for(const k in s)localStorage.setItem(k,JSON.stringify(s[k]))}", seed); await p.reload(); await p.wait_for_timeout(800)
    await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false}")
    return ctx, p
async def click_act(p, act):
    await p.evaluate("h=>{document.querySelector('#tb')?.remove();document.body.insertAdjacentHTML('beforeend',h)}", f'<button id="tb" data-act="{act}">x</button>')
    await p.click('#tb', force=True); await p.wait_for_timeout(400)
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(channel='chromium')  # headless الجديد: يدعم أذونات الإشعارات
        # ---- N: النواة والواجهة بلا إذن
        ctx, p = await fresh(br)
        T('N1 النواة والواجهة محمّلتان', await p.evaluate("()=>typeof NTFC=='object'&&typeof NT=='object'&&typeof ntfCheck=='function'"))
        r = await p.evaluate("""()=>{const t=NTFC.iso(new Date()),it=ntfItems(),d=NTFC.due(it,t,1);return{n:it.length,due:d.map(x=>x.id+':'+x.n),over:NTFC.overdue(it,t).map(x=>x.id),badge:NTFC.badge(it,t),d0:NTFC.due(it,t,0).length,d3:NTFC.due(it,t,3).length}}""")
        T('N2 العناصر: الجلسات غير المغلقة والميعاد (4 عناصر، المنتهية مستبعدة)', r['n'] == 4, r)
        T('N3 due: اليوم وغداً فقط عند lead=1، والترتيب باليوم', r['due'] == ['s1:0', 's2:1'], r['due'])
        T('N4 الفائتة تُعدّ في الشارة لا في التنبيه، والشارة=3 (اليوم+غداً+فائتة)', r['over'] == ['s3'] and r['badge'] == 3, r)
        T('N5 lead=0 يعطي 1 وlead=3 يعطي 3', r['d0'] == 1 and r['d3'] == 3, r)
        f = await p.evaluate("""()=>{const t=NTFC.iso(new Date()),l=NTFC.due(ntfItems(),t,1);const a=NTFC.fresh(l,{},t),st=NTFC.mark({},l,t),b=NTFC.fresh(l,st,t),c=NTFC.fresh(l,{day:'2000-01-01',ids:st.ids},t);return[a.length,b.length,c.length]}""")
        T('N6 منع التكرار: أول مرة 2، بعد التعليم 0، في يوم جديد 2', f == [2, 0, 2], f)
        ics = await p.evaluate("()=>NTFC.ics(ntfItems(),{lead:3,now:new Date(0)})")
        lines = ics.split('\r\n')
        T('N7 ICS: 4 أحداث وتنبيهات VALARM، وتنتهي بسطر فارغ', ics.count('BEGIN:VEVENT') == 4 and ics.count('BEGIN:VALARM') >= 8 and ics.endswith('END:VCALENDAR\r\n'), (ics.count('BEGIN:VEVENT'), ics.count('BEGIN:VALARM')))
        T('N8 ICS: لا سطر يتجاوز 75 بايت (طيّ صحيح)', all(len(l.encode()) <= 75 for l in lines), max(len(l.encode()) for l in lines))
        T('N9 ICS: معرّفات ثابتة ومتنوعة والجلسة بوقت محلي عائم', 'UID:s-s1@legal-library' in ics and 'UID:d-d1@legal-library' in ics and ('DTSTART:' + iso(0).replace('-', '') + 'T103000') in ics)
        T('N10 ICS: نص عربي سليم بعد فك الطي', 'جلسة مرافعة' in ics.replace('\r\n ', ''))
        # قائمة وزر
        await click_act(p, 'ntf')
        T('N11 شاشة التنبيهات تظهر بزر ICS وتجربة التنبيه', await p.locator('[data-act="ntfics"]').count() == 1 and await p.locator('[data-act="ntftest"]').count() == 1)
        async with p.expect_download() as dl: await p.click('[data-act="ntfics"]')
        dd = await dl.value; path = await dd.path(); txt = open(path, encoding='utf8').read()
        T('N12 زر ICS ينزّل ملف .ics فيه المواعيد', dd.suggested_filename.endswith('.ics') and txt.count('BEGIN:VEVENT') == 4, dd.suggested_filename)
        T('N13 قائمة 🧰 فيها زر 🔔 التنبيهات', 'data-act="ntf"' in (open(os.path.join(SITE, 'js/legal.js'), encoding='utf8').read() + open(os.path.join(SITE, 'js/ui2.js'), encoding='utf8').read()))  # 1.26.1: قائمة الأدوات انتقلت إلى ui2.js
        T('N14 لا أخطاء JS', not p.errs, p.errs[:2]); await ctx.close()
        # ---- P: بإذن الإشعارات + عامل الخدمة
        ctx, p = await fresh(br, sw='allow', perm=True, badge=True)
        await p.evaluate("()=>navigator.serviceWorker.ready"); await p.wait_for_timeout(1500)
        await p.evaluate("()=>{NT.cfg.on=true;NT.cfg.lead=1;_s('ntf',NT.cfg)}")
        n1 = await p.evaluate("()=>ntfCheck(false)")
        T('P1 التنبيه عند الفتح يُرسَل للعنصرين المستحقين', n1 == 2, n1)
        shown = await p.evaluate("async()=>{const r=await navigator.serviceWorker.ready;const n=await r.getNotifications();return n.map(x=>[x.title,x.body])}")
        T('P2 التنبيه ظاهر وفيه عنوان الجلسة والعربية', len(shown) >= 1 and 'تنبيهات' in shown[0][0] and 'جلسة مرافعة' in shown[0][1], shown)
        n2 = await p.evaluate("()=>ntfCheck(false)")
        T('P3 الاستدعاء الثاني في اليوم نفسه لا يكرر (0)', n2 == 0, n2)
        n3 = await p.evaluate("()=>ntfCheck(true)")
        T('P4 الإجبار (تجربة) يعيد الإرسال (2)', n3 == 2, n3)
        snap = await p.evaluate("""async()=>{const c=await caches.open('ntf-data'),r=await c.match(new URL('ntf-snapshot.json',document.baseURI).href);return r?await r.json():null}""")
        T('P5 لقطة عامل الخدمة محفوظة (مفعّلة، 4 عناصر)', snap and snap['on'] is True and len(snap['items']) == 4, snap and (snap['on'], len(snap['items'])))
        b = await p.evaluate("()=>window.__b")
        T('P6 شارة الأيقونة = 3', b and b[-1] == 3, b)
        # عامل الخدمة يشغّل التنبيه من اللقطة
        await p.evaluate("async()=>{const c=await caches.open('ntf-data');await c.delete(new URL('ntf-state.json',document.baseURI).href);(await (await navigator.serviceWorker.ready).getNotifications()).forEach(n=>n.close())}")
        res = await p.evaluate("""async()=>{const r=await navigator.serviceWorker.ready;return await new Promise(ok=>{navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.t=='ntf-done')ok(e.data.n)});r.active.postMessage({t:'ntf-run'});setTimeout(()=>ok(-1),8000)})}""")
        T('P7 عامل الخدمة يرسل التنبيه من اللقطة وحده (2)', res == 2, res)
        res2 = await p.evaluate("""async()=>{const r=await navigator.serviceWorker.ready;return await new Promise(ok=>{navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.t=='ntf-done')ok(e.data.n)});r.active.postMessage({t:'ntf-run'});setTimeout(()=>ok(-1),8000)})}""")
        T('P8 وتشغيله ثانية لا يكرر (0) — الحالة مشتركة مع الصفحة', res2 == 0, res2)
        # إيقاف التنبيه
        await p.evaluate("()=>{NT.cfg.on=false;_s('ntf',NT.cfg)}"); await p.evaluate("()=>ntfSnapshot()")
        await p.evaluate("async()=>{const c=await caches.open('ntf-data');await c.delete(new URL('ntf-state.json',document.baseURI).href)}")
        res3 = await p.evaluate("""async()=>{const r=await navigator.serviceWorker.ready;return await new Promise(ok=>{navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.t=='ntf-done')ok(e.data.n)});r.active.postMessage({t:'ntf-run'});setTimeout(()=>ok(-1),8000)})}""")
        T('P9 عند الإيقاف لا يرسل عامل الخدمة شيئاً (0)', res3 == 0, res3)
        has = await p.evaluate("async()=>!!await caches.match('js/ntfcore.js',{ignoreSearch:true})&&!!await caches.match('js/notify.js',{ignoreSearch:true})")
        T('P10 الملفان الجديدان في كاش عامل الخدمة', has)
        T('P11 لا أخطاء JS', not p.errs, p.errs[:2]); await ctx.close()
        # ---- محظور
        ctx, p = await fresh(br)
        await p.evaluate("()=>{NT.cfg.on=true}")
        n = await p.evaluate("()=>ntfCheck(false)")
        T('P12 بلا إذن لا يرسل ولا ينهار (0)', n == 0 and not p.errs, (n, p.errs[:1])); await ctx.close(); await br.close()
asyncio.run(main())
print(f"\n{sum(R)} نجح، {len(R) - sum(R)} فشل"); sys.exit(0 if all(R) else 1)
