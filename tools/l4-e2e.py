#!/usr/bin/env python3
"""اختبار L4 (1.24.0): الأمان — خزنة تشفير محلية AES-GCM بكلمة مرور (PBKDF2) + قفل الرمز بملح عشوائي وتقييد محاولات يبقى بعد إعادة التحميل.
الاستعمال: python3 tools/l4-e2e.py [مجلد_التطبيق]"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, hashlib, json
from playwright.async_api import async_playwright
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8797), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8797/index.html'
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
SECRET = 'قضية سرية رقم 123'
PW, PW2 = 'كلمة-مرور-قوية-2026', 'Another#Strong9pass'
CASE = [{'id': 'c1', 'name': SECRET, 'items': [], 'sessions': [{'id': 's1', 'date': '2026-12-01', 'note': 'جلسة سرية'}], 'client': 'موكل سري'}]
async def E(p, js, arg=None):
    try: return await p.evaluate(js, arg) if arg is not None else await p.evaluate(js)
    except Exception as e: return 'ERR:' + str(e)[:90]
async def fresh(br, seed=True):
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block'); ctx.set_default_timeout(8000); p = await ctx.new_page(); errs = []
    p.on('pageerror', lambda e: errs.append(str(e))); await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    await p.goto(URL); await p.wait_for_timeout(500)
    if seed:
        await p.evaluate("(c)=>{localStorage.setItem('lists',JSON.stringify(c));localStorage.setItem('fav','[\"x\"]')}", CASE)
        await p.reload(); await p.wait_for_timeout(600)
    await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false}")
    return ctx, p, errs
RAW = "()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage[k]])))"   # الوصول بالخاصية يتجاوز getItem فيُظهر المخزَّن فعلاً
async def unlock(ctx, pw):
    p = await ctx.new_page(); await p.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await p.goto(URL); await p.wait_for_timeout(500)
    vis = await p.locator('#vx').count() and await p.is_visible('#vx')
    if vis:
        await p.fill('#vx_pw', pw)
        await p.click('[data-vx="go"]'); await p.wait_for_timeout(2500)
    return p, vis
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch()
        # ================= A) الخزنة =================
        ctx, p, errs = await fresh(br)
        T('A0 الوحدة محمّلة (VAULT) وقبل التفعيل البيانات صريحة', await E(p, "()=>typeof VAULT=='object'&&!VAULT.on") is True)
        w = await E(p, "()=>['12345678','password','aaaaaaaaaa','abc','1234567890'].map(x=>!!VAULT.weak(x))")
        T('A1 يرفض كلمات المرور الضعيفة والقصيرة', w == [True] * 5, w)
        T('A1b يقبل كلمة مرور قوية', await E(p, "(x)=>!VAULT.weak(x)", PW) is True)
        r = await E(p, "(x)=>VAULT.enable(x)", PW)
        T('A2 التفعيل ينجح', isinstance(r, dict) and r.get('ok') is True, r)
        raw = await E(p, RAW)
        T('A3 لا نص صريح باقٍ في التخزين (لا اسم قضية ولا موكل ولا مفتاح lists)', isinstance(raw, str) and SECRET not in raw and 'موكل سري' not in raw and '"lists"' not in raw, raw[:160] if isinstance(raw, str) else raw)
        meta = json.loads(json.loads(raw).get('vault', 'null')) if isinstance(raw, str) and 'vault' in raw else None
        T('A4 PBKDF2 ≥ 600000 تكرار وملح عشوائي 16 بايت', meta and meta.get('it', 0) >= 600000 and len(__import__('base64').b64decode(meta['s'])) == 16, meta and {k: meta[k] for k in ('it', 'v')})
        T('A5 التطبيق يقرأ بياناته كالمعتاد بعد التفعيل', await E(p, "()=>JSON.parse(localStorage.getItem('lists'))[0].name") == SECRET)
        T('A6 مفتاح غير حساس (fav) يبقى صريحاً', json.loads(json.loads(raw)['fav']) == ['x'] if isinstance(raw, str) and 'fav' in raw else False)
        await E(p, "()=>{const l=JSON.parse(localStorage.getItem('lists'));l.push({id:'c2',name:'قضية جديدة بعد التشفير',items:[],sessions:[]});localStorage.setItem('lists',JSON.stringify(l))}")
        await p.wait_for_timeout(1200)
        raw2 = await E(p, RAW)
        T('A7 الكتابة بعد التفعيل تُحفظ مشفّرة (لا نص صريح) وتتغير القيمة المخزنة', isinstance(raw2, str) and 'قضية جديدة بعد التشفير' not in raw2 and json.loads(raw2).get('vx.lists') != json.loads(raw).get('vx.lists'))
        # قفل الآن ثم الفتح من تبويب جديد
        p2 = await ctx.new_page(); await p2.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await p2.goto(URL); await p2.wait_for_timeout(600)
        T('A8 تبويب جديد (بلا تسليم) يظهر شاشة فتح الخزنة ولا بيانات', await p2.is_visible('#vx') and await E(p2, "()=>localStorage.getItem('lists')") is None)
        await E(p2, "()=>{try{_s('lists',[]);localStorage.setItem('dls','[]')}catch(e){}}"); await p2.wait_for_timeout(800)
        T('A9 الكتابة أثناء القفل مرفوضة (لا يُمسح المشفَّر بحالة فارغة)', json.loads(await E(p2, RAW)).get('vx.lists') == json.loads(raw2).get('vx.lists'))
        await p2.fill('#vx_pw', 'كلمة-خاطئة-تماماً-1'); await p2.click('[data-vx="go"]'); await p2.wait_for_timeout(2200)
        T('A10 كلمة المرور الخاطئة تُرفض وتبقى الشاشة', await p2.is_visible('#vx') and (await p2.inner_text('#vx_m')).strip() != '', (await p2.inner_text('#vx_m')))
        await p2.fill('#vx_pw', PW); await p2.click('[data-vx="go"]'); await p2.wait_for_timeout(3000)
        names = await E(p2, "()=>CLS.map(c=>c.name)")
        T('A11 الكلمة الصحيحة تفتح وتعرض كل البيانات (بما فيها المكتوب بعد التفعيل)', isinstance(names, list) and SECRET in names and 'قضية جديدة بعد التشفير' in names and not await p2.is_visible('#vx'), names)
        # إعادة التحميل بنفس التبويب تبقى مفتوحة (تسليم في الذاكرة فقط)
        await p2.reload(); await p2.wait_for_timeout(1500)
        T('A12 إعادة تحميل نفس التبويب لا تطلب الكلمة من جديد', not await p2.is_visible('#vx') and await E(p2, "()=>CLS.length") == 2)
        T('A13 تسليم المفتاح لا يُخزَّن في localStorage ولا sessionStorage', 'LLV1' not in (await E(p2, RAW)) and 'LLV1' not in (await E(p2, "()=>JSON.stringify(Object.assign({},sessionStorage))")))
        # تغيير كلمة المرور
        s_old = json.loads(await E(p2, RAW))['vault']
        bad = await E(p2, "(a)=>VAULT.change(a[0],a[1])", ['خطأ-خطأ-خطأ-1', PW2]); ok = await E(p2, "(a)=>VAULT.change(a[0],a[1])", [PW, PW2])
        T('A14 تغيير الكلمة يتطلب الحالية ثم ينجح', isinstance(bad, dict) and bad.get('err') and isinstance(ok, dict) and ok.get('ok') is True, [bad, ok])
        T('A15 تغيير الكلمة يغيّر الملح ويبقي البيانات سليمة', json.loads(json.loads(await E(p2, RAW))['vault'])['s'] != json.loads(s_old)['s'] and await E(p2, "()=>CLS.length") == 2)
        await p2.close()
        p3, vis = await unlock(ctx, PW)
        T('A16 الكلمة القديمة لم تعد تعمل بعد التغيير', vis and await p3.is_visible('#vx'))
        await p3.fill('#vx_pw', PW2); await p3.click('[data-vx="go"]'); await p3.wait_for_timeout(3000)
        T('A17 الكلمة الجديدة تعمل والبيانات كاملة', await E(p3, "()=>CLS.length") == 2)
        # النسخة الاحتياطية والتنبيهات
        bk = await E(p3, "()=>{const d=bkLocal();return !!d.lists&&JSON.parse(d.lists).length==2&&!!bkParse(JSON.stringify({app:'legal-library',ver:'x',date:'2026-01-01',data:d}))}")
        T('A18 النسخة الاحتياطية تعمل والخزنة مفعلة (تقرأ البيانات الصريحة من الذاكرة)', bk is True, bk)
        await E(p3, "()=>{NT.cfg.on=true}"); await E(p3, "()=>ntfSnapshot()"); await p3.wait_for_timeout(500)
        snap = await E(p3, "async()=>{const c=await caches.open('ntf-data'),r=await c.match(new URL('ntf-snapshot.json',document.baseURI).href);return r?await r.text():''}")
        T('A19 لقطة التنبيهات لا تسرّب أسماء القضايا والموكلين عند تفعيل الخزنة', isinstance(snap, str) and snap != '' and SECRET not in snap and 'جلسة سرية' not in snap, snap[:120])
        # تلف/عبث بالبيانات المشفرة
        await E(p3, "()=>{const s=localStorage['vx.lists'];const b=s.split('');b[b.length-6]=b[b.length-6]=='A'?'B':'A';localStorage['vx.lists']=b.join('')}")
        p4, vis = await unlock(ctx, PW2)
        T('A20 العبث بالمشفَّر يُكتشف (GCM) ولا ينهار التطبيق وتُحفظ نسخة التالف', vis and await E(p4, "()=>CLS.length") == 0 and 'vxbad.lists' in await E(p4, RAW), (await E(p4, "()=>CLS.length")))
        T('A21 لا أخطاء JS في مسار الخزنة', not errs, errs[:2])
        # إلغاء التشفير
        ctx2, q, errs2 = await fresh(br)
        await E(q, "(x)=>VAULT.enable(x)", PW)
        d = await E(q, "(a)=>VAULT.disable(a[0])", ['خطأ-خطأ-خطأ-1']); d2 = await E(q, "(a)=>VAULT.disable(a[0])", [PW])
        rw = json.loads(await E(q, RAW))
        T('A22 إلغاء التشفير يتطلب الكلمة ويعيد البيانات صريحة ويمسح المشفَّر', isinstance(d, dict) and d.get('err') and d2.get('ok') and json.loads(rw['lists'])[0]['name'] == SECRET and not any(k.startswith('vx') or k == 'vault' for k in rw), [d, d2])
        # واجهة التفعيل
        ctx3, u, errs3 = await fresh(br)
        await u.evaluate("()=>moreSheet()"); await u.wait_for_timeout(250); await u.click('.ml [data-act="lock"]'); await u.wait_for_timeout(300)  # 1.26.1: القفل صار في «المزيد»
        T('A23 واجهة القفل تعرض زر تفعيل التشفير', await u.locator('[data-act="vxset"]').count() == 1)
        await u.click('[data-act="vxset"]'); await u.wait_for_timeout(300)
        await u.fill('#vx_p1', PW); await u.fill('#vx_p2', PW + 'x'); await u.click('[data-act="vxon"]'); await u.wait_for_timeout(500)
        T('A24 عدم تطابق الكلمتين يمنع التفعيل', await E(u, "()=>VAULT.on") is False)
        await u.fill('#vx_p2', PW); await u.click('[data-act="vxon"]'); await u.wait_for_timeout(3000)
        T('A25 التفعيل من الواجهة ينجح', await E(u, "()=>VAULT.on&&VAULT.unlocked") is True and SECRET not in await E(u, RAW))
        T('A26 حقل كلمة المرور ليس من نوع password (لا يتدخل مدير كلمات المرور)', await E(u, "()=>!document.querySelector('input[type=password]')") is True)
        # ================= B) قفل الرمز =================
        ctx4, b, errs4 = await fresh(br, seed=False)
        T('B0 الدالتان llHasPin وllCheckPin ما زالتا معرّفتين', await E(b, "()=>typeof llHasPin=='function'&&typeof llCheckPin=='function'") is True)
        async def setpin(page, pin):
            await page.evaluate("()=>moreSheet()"); await page.wait_for_timeout(250); await page.click('.ml [data-act="lock"]'); await page.wait_for_timeout(250); await page.click('[data-act="lkset"]'); await page.wait_for_timeout(250)
            await page.keyboard.type(pin); await page.keyboard.press('Enter'); await page.wait_for_timeout(1200); await page.keyboard.type(pin); await page.keyboard.press('Enter'); await page.wait_for_timeout(1800)
        await setpin(b, '739518')
        h1 = await E(b, "()=>localStorage.getItem('pinh')")
        legacy = hashlib.sha256(('ll-v1:739518').encode()).hexdigest()
        T('B1 الرمز يُحفظ بصيغة p2$ بملح عشوائي (لا SHA-256 مجرد)', isinstance(h1, str) and h1.startswith('p2$') and h1 != legacy and legacy not in h1, h1)
        await E(b, "()=>{localStorage.removeItem('pinh');localStorage.removeItem('pinl');sessionStorage.clear()}"); await b.reload(); await b.wait_for_timeout(600)
        await setpin(b, '739518'); h2 = await E(b, "()=>localStorage.getItem('pinh')")
        T('B2 نفس الرمز مرتين يعطي بصمتين مختلفتين (ملح عشوائي)', isinstance(h2, str) and h2.startswith('p2$') and h2 != h1)
        # رمز قديم (SHA-256) يظل يعمل ويُرقّى
        ctx5, c, errs5 = await fresh(br, seed=False)
        await c.evaluate("(h)=>{localStorage.setItem('pinh',h);localStorage.setItem('pinl','6')}", legacy); await c.reload(); await c.wait_for_timeout(700)
        T('B3 الرمز القديم يُطلب عند الفتح', await c.is_visible('#lk'))
        await c.keyboard.type('739518'); await c.wait_for_timeout(1800)
        T('B4 الرمز القديم يفتح ويُرقّى تلقائياً إلى p2$', not await c.is_visible('#lk') and (await E(c, "()=>localStorage.getItem('pinh')") or '').startswith('p2$'))
        # التقييد يبقى بعد إعادة التحميل
        await E(c, "()=>{sessionStorage.clear()}"); await c.reload(); await c.wait_for_timeout(700)
        for _ in range(5): await c.keyboard.type('111122'); await c.wait_for_timeout(900)
        await c.keyboard.type('111122'); await c.wait_for_timeout(900)
        m1 = await c.inner_text('#pms')
        T('B5 بعد 5 محاولات خاطئة يُمنع الإدخال مؤقتاً', 'انتظر' in m1, m1)
        await c.reload(); await c.wait_for_timeout(700); await c.keyboard.type('739518'); await c.wait_for_timeout(1500)
        m2 = await c.inner_text('#pms') if await c.locator('#pms').count() else ''
        T('B6 التقييد يبقى بعد إعادة تحميل الصفحة (حتى بالرمز الصحيح)', await c.is_visible('#lk') and 'انتظر' in m2, m2)
        # ================= C) الإصدار والتسجيل =================
        cfg = open(os.path.join(ROOT, 'js/config.js'), encoding='utf8').read(); sw = open(os.path.join(ROOT, 'sw.js'), encoding='utf8').read(); ix = open(os.path.join(ROOT, 'index.html'), encoding='utf8').read()
        import re as _re
        _v = json.load(open(os.path.join(ROOT, 'version.json')))['version']; _t = tuple(int(x) for x in _v.split('.'))
        T('C1 الإصدار متسق في config وsw وversion.json ولا يقل عن 1.24.0 (لا يُكسَر برفع الإصدار)', f"version:'{_v}'" in cfg and f'siyagh-v{_v}' in sw and _t >= (1, 24, 0), _v)
        T('C2 vault.js أول سكربت قبل lock.js، وvault-ui.js مسجّل، وكلاهما في sw.js', ix.index('js/vault.js') < ix.index('js/lock.js') and 'js/vault-ui.js' in ix and '"js/vault.js"' in sw and '"js/vault-ui.js"' in sw)
        T('C3 run-all.py يشمل l4', "'l4'" in open(os.path.join(ROOT, 'tools/run-all.py'), encoding='utf8').read())
        await br.close()
asyncio.run(main())
print(f"\n{sum(R)} نجح، {len(R) - sum(R)} فشل"); sys.exit(0 if all(R) else 1)
