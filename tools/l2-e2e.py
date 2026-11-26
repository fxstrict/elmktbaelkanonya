#!/usr/bin/env python3
"""اختبار L2 (1.23.0): حاسبة المواعيد — العطلات الرسمية (ثابتة + شم النسيم + مضافة)، ميعاد المسافة (م16–17)، توافق الاستعمال القديم.
الاستعمال: python3 tools/l2-e2e.py [مجلد_التطبيق]"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile
from playwright.async_api import async_playwright
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8795), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8795/index.html'
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
CD = "([s,n,u,o])=>{const r=calcDeadline(s,n,u,o);return{end:isoD(r.end),moved:r.moved,dist:r.dist,sk:r.skipped.map(x=>x[1])}}"
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
        p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await p.goto(URL); await p.wait_for_timeout(900)
        await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false}")
        # ميعاد المسافة م16
        d = await p.evaluate("()=>[0,30,31,49,50,80,81,130,131,180,400].map(k=>dlxDist('km',k))")
        T('A1 م16: يوم لكل 50 كم وكسر فوق 30 كم يوم وحد أقصى 4', d == [0, 0, 1, 1, 1, 1, 2, 2, 3, 3, 4], d)
        T('A2 م17: حدودي 15 وخارج مصر 60 وبلا = 0', await p.evaluate("()=>[dlxDist('b'),dlxDist('f'),dlxDist('0',500)]") == [15, 60, 0])
        # شم النسيم
        e = await p.evaluate("()=>[2024,2025,2026,2027].map(y=>{const d=dlxEaster(y);d.setDate(d.getDate()+1);return isoD(d)})")
        T('A3 شم النسيم 2024–2027 (6/5، 21/4، 13/4، 3/5)', e == ['2024-05-06', '2025-04-21', '2026-04-13', '2027-05-03'], e)
        T('A4 العطلات الثابتة تُكتشف (6 أكتوبر، 23 يوليو، 1 مايو)', await p.evaluate("()=>[dlxHolName(parseD('2026-10-06')),dlxHolName(parseD('2026-07-23')),dlxHolName(parseD('2026-05-01'))]") == ['عيد القوات المسلحة', 'ذكرى ثورة 23 يوليو', 'عيد العمال'])
        T('A5 يوم عمل عادي لا يُعدّ عطلة (الثلاثاء 3 نوفمبر)', await p.evaluate("()=>dlxHolName(parseD('2026-11-03'))") is None)
        # الحساب
        r = await p.evaluate(CD, ['2026-08-27', 40, 'd'])
        T('B1 نهاية الميعاد 6 أكتوبر (عطلة) تمتد لـ 7 أكتوبر', r['end'] == '2026-10-07' and r['moved'] and 'عيد القوات المسلحة' in r['sk'], r)
        r = await p.evaluate(CD, ['2026-06-13', 40, 'd'])
        T('B2 عطلة الخميس 23 يوليو ثم الجمعة والسبت → الأحد 26', r['end'] == '2026-07-26', r)
        r = await p.evaluate(CD, ['2026-11-17', 10, 'd'])
        T('B3 توافق قديم: الجمعة 27 نوفمبر → الأحد 29 (3 معاملات فقط)', r['end'] == '2026-11-29' and r['dist'] == 0, r)
        r = await p.evaluate(CD, ['2026-08-27', 40, 'd', {'dist': 2}])
        T('B4 مع مسافة يومين: 8 أكتوبر', r['end'] == '2026-10-08' and r['dist'] == 2, r)
        r = await p.evaluate(CD, ['2026-08-26', 40, 'd', {'dist': 1}])
        T('B5 المسافة تُضاف قبل فحص العطلة: 5+1=6 أكتوبر عطلة → 7', r['end'] == '2026-10-07', r)
        r = await p.evaluate(CD, ['2026-11-01', 3, 'm'])
        T('B6 مدة بالأشهر تعمل (1 فبراير 2027 اثنين)', r['end'] == '2027-02-01', r)
        # الواجهة
        await p.evaluate("()=>calcSheet('مدني')"); await p.wait_for_timeout(400)
        await p.select_option('#cr', 'civ_app'); await p.fill('#cd', '2026-08-27'); await p.wait_for_timeout(300)
        o = await p.inner_text('#co')
        T('C1 الواجهة: الأربعاء 7 / 10 / 2026 مع ذكر العطلة', '7 / 10 / 2026' in o and 'القوات المسلحة' in o, o.replace('\n', ' | '))
        await p.select_option('#cdm', 'km'); await p.fill('#ckm', '130'); await p.wait_for_timeout(300)
        o = await p.inner_text('#co')
        T('C2 الواجهة: مسافة 130 كم = يومان → 8 / 10 / 2026', '8 / 10 / 2026' in o and 'ميعاد مسافة 2' in o, o.replace('\n', ' | '))
        T('C3 حقل الكيلومتر يظهر فقط عند اختيار الكيلومتر', await p.is_visible('#ckm'))
        await p.select_option('#cdm', 'f'); await p.wait_for_timeout(300)
        o = await p.inner_text('#co'); T('C4 خارج مصر 60 يوماً', 'ميعاد مسافة 60' in o and not await p.is_visible('#ckm'), o.replace('\n', ' | ')[:120])
        T('C5 نص التنبيه القديم «غير محتسبة» حُدِّث', 'الأعياد الرسمية ومواعيد المسافة غير محتسبة' not in await p.inner_text('body'))
        # عطلات المستخدم
        await p.click('[data-act="holsh"]'); await p.wait_for_timeout(300)
        await p.fill('#hl_n', 'عيد تجريبي'); await p.fill('#hl_d', '2026-10-07'); await p.fill('#hl_c', '2'); await p.click('[data-act="holadd"]'); await p.wait_for_timeout(300)
        T('D1 إضافة عطلة يومين تظهر وتُحفظ (2)', await p.locator('#hl_l .pr').count() == 2 and await p.evaluate("()=>JSON.parse(localStorage.getItem('hol')).length") == 2)
        await p.fill('#hl_d', '2026-10-07'); await p.click('[data-act="holadd"]'); await p.wait_for_timeout(200)
        T('D2 لا تكرار لنفس اليوم', await p.evaluate("()=>HOL.length") == 2)
        r = await p.evaluate(CD, ['2026-08-27', 40, 'd', {'dist': 0}])
        T('D3 الحساب يراعي عطلتي المستخدم: 6 عطلة ثابتة، 7 و8 مضافتان → 9 أكتوبر (الجمعة) → 11 أكتوبر', r['end'] == '2026-10-11', r)
        await p.click('[data-act="holback"]'); await p.wait_for_timeout(400)
        T('D4 الرجوع يعيد الحاسبة', await p.locator('#cr').count() == 1)
        await p.evaluate("()=>holSheet()"); await p.click('[data-act="holdel"]'); await p.wait_for_timeout(200)
        T('D5 الحذف يعمل', await p.evaluate("()=>HOL.length") == 1)
        T('D6 مفتاح hol داخل النسخة الاحتياطية', await p.evaluate("()=>BKEYS.includes('hol')"))
        T('D7 لا أخطاء JS', not errs, errs[:2]); await br.close()
asyncio.run(main())
print(f"\n{sum(R)} نجح، {len(R) - sum(R)} فشل"); sys.exit(0 if all(R) else 1)
