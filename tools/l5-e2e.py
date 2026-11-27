#!/usr/bin/env python3
"""اختبار L5 (1.26.0): إدارة القضايا — قرارات الجلسات (إغلاق بقرار وجلسة تالية وتعديل)، جدول الجلسات وتصديره،
سجل القرارات، سجل الوقت (إدخال يدوي ومؤقت يبقى بعد إعادة التحميل وتقرير Word)، تعارض المصالح (أداة وتحذير عند الحفظ)، وتوافق البيانات القديمة.
الاستعمال: python3 tools/l5-e2e.py [مجلد_التطبيق]   (مرّر 1.25.0 لإثبات أنه يفشل قبل الإضافة)"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, json, io, datetime
from playwright.async_api import async_playwright
import docx as pydocx
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8798), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8798/index.html'
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' and not c else ''))
def txt(b):
    d = pydocx.Document(io.BytesIO(bytes(b))); out = [p.text for p in d.paragraphs]
    return '\n'.join(out), [[c.text for c in r.cells] for t in d.tables for r in t.rows]
DLG = {'mode': 'accept', 'log': []}
def on_dialog(d):
    DLG['log'].append((d.type, d.message)); asyncio.ensure_future(d.accept('خطأ إدخال') if DLG['mode'] == 'accept' else d.dismiss())
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True)
        p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e))); p.on('dialog', on_dialog)
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await p.goto(URL); await p.wait_for_timeout(800)
        T0 = await p.evaluate("()=>isoD(today12())"); t0 = datetime.date.fromisoformat(T0)
        D = lambda n: (t0 + datetime.timedelta(days=n)).isoformat()
        LISTS = [
            {'id': 'c1', 'name': 'قضية 1', 'client': 'موكل أ', 'opp': 'خصم س', 'no': '5', 'year': '2026', 'court': 'محكمة الجيزة', 'circuit': '3', 'status': 'متداولة', 'items': [],
             'sessions': [{'id': 's1', 'date': T0, 'time': '10:00', 'note': 'مرافعة', 'done': False}, {'id': 's2', 'date': D(3), 'time': '', 'note': 'للحكم', 'done': False},
                          {'id': 's3', 'date': D(-5), 'time': '', 'note': 'فائتة', 'done': False}]},
            {'id': 'c2', 'name': 'قضية 2', 'client': 'موكل ب', 'opp': 'موكل أ', 'items': [], 'sessions': []},
            {'id': 'c3', 'name': 'قضية 3', 'client': 'موكل ج', 'opp': 'خصم ص', 'court': 'محكمة القاهرة', 'items': [],
             'sessions': [{'id': 's5', 'date': D(1), 'time': '09:00', 'note': 'إعلان', 'done': False}, {'id': 's9', 'date': D(-30), 'note': 'قديمة', 'done': True}]},
            {'id': 'c4', 'name': 'قضية 4', 'client': 'موكل د', 'opp': 'خصم ع', 'items': [], 'sessions': []}]
        PA0 = [{'id': 'p1', 'client': 'خصم ص', 'status': 'ساري'}]
        await p.evaluate("s=>{for(const k in s)localStorage.setItem(k,JSON.stringify(s[k]))}", {'lists': LISTS, 'pa': PA0, 'fp': {'lawyer': 'أحمد المحامي'}}); await p.reload(); await p.wait_for_timeout(1200)
        await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false;window.__f=[];window.mwSend=(u8,n)=>{window.__f.push([n,Array.from(u8)])}}")
        keys0 = set(await p.evaluate("()=>Object.keys(localStorage)"))
        C = lambda i: p.evaluate("i=>CLS.find(x=>x.id==i)", i)
        S_ = lambda cid, sid: p.evaluate("([c,s])=>CLS.find(x=>x.id==c).sessions.find(x=>x.id==s)", [cid, sid])
        async def goto(cid):
            await p.evaluate("id=>{closeSheet();S.tab='fav';S.cl=id;render()}", cid); await p.wait_for_timeout(250)
        async def toast(): return await p.inner_text('#ts')
        async def opened(): return await p.evaluate("()=>document.querySelector('#sh').classList.contains('open')")
        await goto('c1')
        # ---- A) الكتلة داخل ملف القضية
        blk = await p.evaluate("()=>{const e=document.querySelector('#m .l5');return e?e.innerText:null}")
        T('A1 كتلة «سجل الوقت» و«تعارض المصالح» في ملف القضية', blk and 'سجل الوقت' in blk and 'تعارض المصالح' in blk, blk)
        T('A2 قضية 1 عليها تحذير تعارض محتمل (موكلها خصم في قضية 2)', 'تعارض محتمل' in (blk or ''), blk)
        await goto('c4'); b4 = await p.evaluate("()=>{const e=document.querySelector('#m .l5');return e?e.innerText:''}")
        T('A3 قضية 4 نظيفة: لا تحذير تعارض', b4 and 'تعارض محتمل' not in b4, b4)
        await goto('c1')
        n_s = await p.evaluate("()=>CLS.find(x=>x.id=='c1').sessions.length")
        T('A4 زر قرار ⚖️ لكل جلسة، والأزرار القديمة (✔️ 📅 🗑) باقية بعددها', await p.locator('#m [data-act="sdec"]').count() == n_s and await p.locator('#m [data-act="sdone"]').count() == n_s and await p.locator('#m [data-act="sics"]').count() == n_s and await p.locator('#m [data-act="sdel"]').count() == n_s)
        # ---- B) قرارات الجلسات
        await p.click('#m [data-act="sdone"][data-k="s1"]'); await p.wait_for_timeout(250)
        T('B1 ✔️ على جلسة مفتوحة تفتح شاشة القرار ولا تغلقها بعد', await opened() and await p.locator('#dc_t').count() == 1 and (await S_('c1', 's1'))['done'] is False)
        await p.select_option('#dc_t', 'تأجيل'); await p.fill('#dc_d', D(-3)); await p.click('[data-act="dcsave"]'); await p.wait_for_timeout(250)
        T('B2 تاريخ تالٍ قبل الجلسة ← رفض برسالة وبقاء الشاشة والجلسة مفتوحة', await opened() and await p.locator('#dc_t').count() == 1 and (await S_('c1', 's1'))['done'] is False and len(await toast()) > 3, await toast())
        await p.fill('#dc_d', D(14)); await p.fill('#dc_tm', '09:30'); await p.fill('#dc_nn', 'لتقديم المذكرة'); await p.fill('#dc_n', 'للإعلان'); await p.click('[data-act="dcsave"]'); await p.wait_for_timeout(350)
        s1 = await S_('c1', 's1'); c1 = await C('c1'); new = [x for x in c1['sessions'] if x['date'] == D(14)]
        T('B3 التأجيل: الجلسة مغلقة بقرار «تأجيل: للإعلان» وتاريخ تالٍ مسجَّل', s1['done'] is True and s1.get('dec', {}).get('t') == 'تأجيل' and s1['dec'].get('n') == 'للإعلان' and s1['dec'].get('nd') == D(14) and s1['dec'].get('at') == T0, s1)
        T('B4 جلسة تالية أُنشئت (09:30، لتقديم المذكرة، مفتوحة) والحالة لم تتغير', len(new) == 1 and new[0]['time'] == '09:30' and new[0]['note'] == 'لتقديم المذكرة' and new[0]['done'] is False and c1['status'] == 'متداولة' and len(c1['sessions']) == n_s + 1 and s1['dec'].get('nid') == new[0]['id'], [new, c1.get('status')])
        await p.wait_for_timeout(150); body = await p.inner_text('#m')
        T('B5 القرار ظاهر تحت الجلسة في ملف القضية، والإغلاق مغلق شاشة القرار', 'للإعلان' in body and not await opened(), body[:200])
        st = await p.evaluate("()=>JSON.parse(localStorage.getItem('lists')).find(x=>x.id=='c1').sessions.find(x=>x.id=='s1')")
        T('B6 القرار محفوظ في التخزين (مفتاح lists نفسه)', st.get('dec', {}).get('t') == 'تأجيل' and st.get('done') is True, st)
        await p.click('#m [data-act="sdone"][data-k="s2"]'); await p.wait_for_timeout(250); await p.click('[data-act="dcclose"][data-k="s2"]'); await p.wait_for_timeout(300)
        s2 = await S_('c1', 's2'); T('B7 «إغلاق بلا قرار» يسلك السلوك القديم: done=true بلا dec', s2['done'] is True and 'dec' not in s2, s2)
        await p.click('#m [data-act="sdone"][data-k="s2"]'); await p.wait_for_timeout(250); s2 = await S_('c1', 's2')
        T('B8 إعادة الفتح ↩️ تمرّ للمعالج القديم بلا شاشة قرار', s2['done'] is False and not await opened(), s2)
        await p.click('#m [data-act="sdone"][data-k="s2"]'); await p.wait_for_timeout(250); await p.select_option('#dc_t', 'حجز للحكم'); await p.fill('#dc_d', D(20))
        T('B9 خيار «حدّث حالة القضية» مُفعَّل افتراضياً', await p.is_checked('#dc_st'))
        await p.click('[data-act="dcsave"]'); await p.wait_for_timeout(350); c1 = await C('c1')
        T('B10 حجز للحكم: الحالة «محجوزة للحكم» وجلسة النطق في +20 يوماً', c1['status'] == 'محجوزة للحكم' and any(x['date'] == D(20) and not x['done'] for x in c1['sessions']), [c1['status'], [x['date'] for x in c1['sessions']]])
        cnt = len(c1['sessions']); await p.click('#m [data-act="sdec"][data-k="s1"]'); await p.wait_for_timeout(250)
        T('B11 ⚖️ على جلسة مغلقة تفتح القرار مملوءاً (تأجيل، للإعلان، +14)', await p.input_value('#dc_t') == 'تأجيل' and await p.input_value('#dc_n') == 'للإعلان' and await p.input_value('#dc_d') == D(14) and await p.locator('[data-act="dcclose"]').count() == 0)
        await p.fill('#dc_d', D(16)); await p.click('[data-act="dcsave"]'); await p.wait_for_timeout(350); c1 = await C('c1')
        T('B12 تعديل القرار يحدّث الجلسة التالية نفسها (+16) ولا ينشئ جلسة جديدة', len(c1['sessions']) == cnt and any(x['date'] == D(16) for x in c1['sessions']) and not any(x['date'] == D(14) for x in c1['sessions']), [x['date'] for x in c1['sessions']])
        await p.click('#m [data-act="sdec"][data-k="s3"]'); await p.wait_for_timeout(250)
        T('B13 ⚖️ على جلسة فائتة مفتوحة: شاشة القرار مع زر «إغلاق بلا قرار»', await p.locator('#dc_t').count() == 1 and await p.locator('[data-act="dcclose"][data-k="s3"]').count() == 1)
        await p.evaluate("()=>closeSheet()")
        ag = await p.evaluate("d=>agendaItems().some(x=>x.k=='s'&&x.date==d)", D(16))
        T('B14 الجلسة المُنشأة تدخل الأجندة والتنبيهات بلا عمل إضافي', ag)
        # ---- C) جدول الجلسات
        await p.evaluate("()=>toolsSheet()"); await p.wait_for_timeout(250)
        T('C1 أزرار L5 الأربعة في قائمة الأدوات', all([await p.locator(f'#sh [data-act="{a}"]').count() == 1 for a in ('l5sch', 'l5dec', 'l5time', 'l5cf')]))
        await p.click('#sh [data-act="l5sch"]'); await p.wait_for_timeout(300)
        want = await p.evaluate("()=>{const t=isoD(today12()),r=CM.range('7d',t);return CM.schedule(CLS,{from:r.from,to:r.to,today:t}).length}")
        got = await p.locator('#l5r [data-act="cgo"]').count()
        T('C2 الافتراضي «7 أيام»: عدد الصفوف = نواة الجدولة', got == want and want >= 1, [got, want])
        rt = await p.inner_text('#l5r')
        T('C3 الصف يحمل القضية والمحكمة والغرض والوقت', 'قضية 3' in rt and 'محكمة القاهرة' in rt and 'إعلان' in rt and '09:00' in rt, rt[:240])
        await p.click('[data-act="l5rg"][data-k="late"]'); await p.wait_for_timeout(250); rt = await p.inner_text('#l5r')
        T('C4 «فائتة»: جلسة s3 المفتوحة ظاهرة', 'فائتة' in rt and 'قضية 1' in rt, rt[:200])
        await p.click('[data-act="l5rg"][data-k="month"]'); await p.wait_for_timeout(250)
        wm = await p.evaluate("()=>{const t=isoD(today12()),r=CM.range('month',t);return CM.schedule(CLS,{from:r.from,to:r.to,today:t}).length}")
        T('C5 «الشهر»: العدد يطابق النواة', await p.locator('#l5r [data-act="cgo"]').count() == wm, wm)
        await p.click('[data-act="l5rg"][data-k="7d"]'); await p.wait_for_timeout(200); await p.evaluate("()=>{window.__f=[]}")
        await p.click('[data-act="l5schdoc"]'); await p.wait_for_timeout(500); f = await p.evaluate("()=>window.__f"); t, rows = txt(f[-1][1]) if f else ('', [])
        T('C6 Word: جدول برأس «التاريخ» و«القضية» و«المحكمة» وصفوف = الجلسات + 1', f and rows and 'التاريخ' in rows[0][0] and any('قضية' in h for h in rows[0]) and len(rows) == want + 1, [rows[:2], want])
        T('C7 Word: صف قضية 3 بالمحكمة والغرض', any('قضية 3' in ' '.join(r) and 'محكمة القاهرة' in ' '.join(r) and 'إعلان' in ' '.join(r) for r in rows), rows)
        tc = await p.evaluate("()=>l5SchedText()"); T('C8 النسخ النصي يحوي القضايا والمحاكم', 'قضية 3' in tc and 'محكمة القاهرة' in tc, tc[:200])
        await p.click('#l5r [data-act="cgo"]'); await p.wait_for_timeout(300)
        T('C9 النقر على صف يفتح ملف القضية ويغلق الشاشة', await p.evaluate("()=>S.tab=='fav'&&!!S.cl&&!document.querySelector('#sh').classList.contains('open')"))
        # ---- D) سجل القرارات
        await p.evaluate("()=>l5DecSheet()"); await p.wait_for_timeout(250)
        wd = await p.evaluate("()=>CM.decLog(CLS,{}).length"); gd = await p.locator('#dl_r [data-act="cgo"]').count()
        T('D1 سجل القرارات: كل القرارات المسجّلة (تأجيل وحجز) بعددها في النواة', gd == wd and wd >= 2, [gd, wd])
        await p.select_option('#dl_t', 'حجز للحكم'); await p.wait_for_timeout(200)
        T('D2 فلتر النوع «حجز للحكم» يُبقي قراراً واحداً', await p.locator('#dl_r [data-act="cgo"]').count() == 1, await p.locator('#dl_r [data-act="cgo"]').count())
        await p.select_option('#dl_t', 'nodec'); await p.wait_for_timeout(200)
        T('D3 «مغلقة بلا قرار مسجّل»: جلسة قضية 3 القديمة', await p.locator('#dl_r [data-act="cgo"]').count() >= 1 and 'قضية 3' in await p.inner_text('#dl_r'), await p.inner_text('#dl_r'))
        # ---- E) سجل الوقت
        await goto('c1'); await p.click('#m [data-act="tlopen"]'); await p.wait_for_timeout(300)
        T('E1 شاشة سجل الوقت تفتح من ملف القضية', await p.locator('#tl_h').count() == 1)
        await p.fill('#tl_h', '2'); await p.fill('#tl_m', '30'); await p.fill('#tl_d', T0); await p.fill('#tl_n', 'مراجعة الملف'); await p.click('[data-act="tladd"]'); await p.wait_for_timeout(300)
        c1 = await C('c1'); tl = c1.get('tl', [])
        T('E2 إدخال يدوي: 150 دقيقة قابلة للفوترة بالملاحظة والتاريخ', len(tl) == 1 and tl[0]['m'] == 150 and tl[0]['b'] is True and tl[0]['n'] == 'مراجعة الملف' and tl[0]['d'] == T0, tl)
        await p.fill('#tl_h', '0'); await p.fill('#tl_m', '45'); await p.uncheck('#tl_b'); await p.click('[data-act="tladd"]'); await p.wait_for_timeout(300); c1 = await C('c1'); tl = c1.get('tl', [])
        sm = await p.inner_text('#tl_s')
        T('E3 غير قابل للفوترة: الإجمالي 3 س 15 د والقابل 2 س 30 د', len(tl) == 2 and tl[1]['b'] is False and '3 س 15 د' in sm and '2 س 30 د' in sm, sm.replace('\n', ' | '))
        await p.fill('#tl_h', '0'); await p.fill('#tl_m', '0'); await p.click('[data-act="tladd"]'); await p.wait_for_timeout(250)
        T('E4 مدة صفر لا تُسجَّل (رسالة)', len((await C('c1')).get('tl', [])) == 2 and len(await toast()) > 3, await toast())
        await p.fill('#tl_hr', '400'); await p.wait_for_timeout(300); c1 = await C('c1'); sm = await p.inner_text('#tl_s')
        T('E5 أجر الساعة 400: القيمة 1,000.00 (على القابل للفوترة فقط) ومحفوظ في القضية', c1.get('hr') == 400 and '1,000.00' in sm, [c1.get('hr'), sm.replace('\n', ' | ')])
        old = D(-70)
        await p.fill('#tl_h', '1'); await p.fill('#tl_m', '0'); await p.fill('#tl_d', old); await p.check('#tl_b'); await p.click('[data-act="tladd"]'); await p.wait_for_timeout(300)
        mstart = (await p.evaluate("()=>CM.range('month',isoD(today12()))"))['from']
        await p.fill('#tl_f', mstart); await p.fill('#tl_t', T0); await p.wait_for_timeout(300); sm = await p.inner_text('#tl_s')
        T('E6 فلتر الفترة يستثني الإدخال القديم: 3 س 15 د', '3 س 15 د' in sm and '4 س 15 د' not in sm, sm.replace('\n', ' | '))
        await p.evaluate("()=>{window.__f=[]}"); await p.click('[data-act="tldoc"]'); await p.wait_for_timeout(500); f = await p.evaluate("()=>window.__f"); t, rows = txt(f[-1][1]) if f else ('', [])
        T('E7 تقرير Word: رأس الجدول والصفوف (2 داخل الفترة) والمجاميع والقيمة', f and rows and rows[0][0] == 'التاريخ' and len(rows) == 3 and '3 س 15 د' in t and '1,000.00' in t and 'قضية 1' in t, [rows, t[:200]])
        T('E8 صف مراجعة الملف في التقرير بمدته 2 س 30 د', any('مراجعة الملف' in ' '.join(r) and '2 س 30 د' in ' '.join(r) for r in rows), rows)
        idb = (await C('c1'))['tl'][1]['id']; n0 = len((await C('c1'))['tl']); DLG['mode'] = 'accept'
        await p.click(f'[data-act="tldel"][data-k="{idb}"]'); await p.wait_for_timeout(300)
        T('E9 حذف إدخال بتأكيد', len((await C('c1'))['tl']) == n0 - 1 and not any(x['id'] == idb for x in (await C('c1'))['tl']))
        # المؤقت
        await p.fill('#tl_f', ''); await p.fill('#tl_t', ''); await p.click('#sh [data-act="tmrstart"]'); await p.wait_for_timeout(300); c1 = await C('c1')
        T('E10 بدء المؤقت يحفظ وقت البدء في القضية', isinstance(c1.get('tmr'), (int, float)) and c1['tmr'] > 1e12, c1.get('tmr'))
        await p.reload(); await p.wait_for_timeout(1200); await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false;window.__f=[];window.mwSend=(u8,n)=>{window.__f.push([n,Array.from(u8)])}}")
        T('E11 المؤقت يبقى جارياً بعد إعادة تحميل التطبيق', isinstance((await C('c1')).get('tmr'), (int, float)))
        await p.evaluate("()=>l5TimeSheet('c4')"); await p.wait_for_timeout(250); await p.click('#sh [data-act="tmrstart"]'); await p.wait_for_timeout(300)
        T('E12 مؤقت واحد فقط: بدء مؤقت في قضية 4 مرفوض مع ذكر قضية 1', 'tmr' not in await C('c4') and 'قضية 1' in await toast(), await toast())
        await p.evaluate("()=>l5TimeSheet('c1')"); await p.wait_for_timeout(250)
        T('E13 شاشة القضية الجارية تعرض زر الإيقاف لا البدء', await p.locator('#sh [data-act="tmrstop"]').count() == 1 and await p.locator('#sh [data-act="tmrstart"]').count() == 0)
        await p.evaluate("()=>{const c=CLS.find(x=>x.id=='c1');c.tmr=Date.now()-95*60000;_s('lists',CLS)}"); await p.evaluate("()=>l5TimeSheet('c1')"); await p.wait_for_timeout(200)
        await p.click('#sh [data-act="tmrstop"]'); await p.wait_for_timeout(250); T('E14 إيقاف المؤقت: شاشة بالمدة 95 دقيقة قابلة للتعديل', await p.input_value('#ts_m') == '95', await p.input_value('#ts_m'))
        n0 = len((await C('c1'))['tl']); await p.fill('#ts_n', 'جلسة تحضير'); await p.click('[data-act="tmrsave"]'); await p.wait_for_timeout(300); c1 = await C('c1')
        T('E15 حفظ المؤقت: إدخال 95 دقيقة بملاحظته ومسح المؤقت', len(c1['tl']) == n0 + 1 and c1['tl'][-1]['m'] == 95 and c1['tl'][-1]['n'] == 'جلسة تحضير' and not c1.get('tmr'), [c1['tl'][-1], c1.get('tmr')])
        await p.evaluate("()=>l5TimeSheet('c4')"); await p.wait_for_timeout(250); await p.click('#sh [data-act="tmrstart"]'); await p.wait_for_timeout(300); await p.evaluate("()=>l5TimeSheet('c4')"); await p.wait_for_timeout(200)
        await p.click('#sh [data-act="tmrstop"]'); await p.wait_for_timeout(300); c4 = await C('c4')
        T('E16 إيقاف بعد أقل من نصف دقيقة: لا إدخال، يُمسح المؤقت، رسالة', not c4.get('tl') and not c4.get('tmr') and len(await toast()) > 3, [c4.get('tl'), c4.get('tmr'), await toast()])
        await p.evaluate("()=>{const c=CLS.find(x=>x.id=='c4');c.tmr=Date.now()-30*3600*1000;_s('lists',CLS)}"); await p.evaluate("()=>l5TimeSheet('c4')"); await p.wait_for_timeout(200); await p.click('#sh [data-act="tmrstop"]'); await p.wait_for_timeout(250)
        sh = await p.inner_text('#sh')
        T('E17 مؤقت منسي (30 ساعة): المدة تُقصّ إلى 1440 مع تنبيه «نسيت»', await p.input_value('#ts_m') == '1440' and 'نسيت' in sh, [await p.input_value('#ts_m'), sh[:120]])
        await p.click('[data-act="tmrdrop"]'); await p.wait_for_timeout(300); c4 = await C('c4')
        T('E18 «تجاهل» يمسح المؤقت بلا إدخال', not c4.get('tmr') and not c4.get('tl'), c4)
        await p.evaluate("()=>l5TimeOverview()"); await p.wait_for_timeout(250); ov = await p.inner_text('#sh')
        T('E19 نظرة عامة على الشهر: قضية 1 بإجمالي الشهر', 'قضية 1' in ov and await p.locator('#tv_m').count() == 1, ov[:200])
        await p.click('#sh [data-act="tlopen"]'); await p.wait_for_timeout(250); T('E20 النقر على قضية في النظرة العامة يفتح سجل وقتها', await p.locator('#tl_h').count() == 1)
        # ---- F) تعارض المصالح
        await p.evaluate("()=>l5ConfSheet()"); await p.wait_for_timeout(250); await p.fill('#cf_c', 'السيد/ خصم س'); await p.fill('#cf_o', ''); await p.click('[data-act="cfrun"]'); await p.wait_for_timeout(250)
        rs = await p.inner_text('#cf_r')
        T('F1 موكل جديد = خصم في قضية 1 ← تعارض مباشر باسم القضية', 'تعارض مباشر' in rs and 'قضية 1' in rs, rs[:240])
        await p.fill('#cf_c', 'اسم جديد تماماً'); await p.fill('#cf_o', 'خصم ص'); await p.click('[data-act="cfrun"]'); await p.wait_for_timeout(250); rs = await p.inner_text('#cf_r')
        T('F2 خصم جديد = موكل بتوكيل ساري ← تعارض مذكور بسبب التوكيل', 'تعارض مباشر' in rs and 'توكيل' in rs, rs[:240])
        await p.fill('#cf_c', 'اسم فريد أول'); await p.fill('#cf_o', 'اسم فريد ثان'); await p.click('[data-act="cfrun"]'); await p.wait_for_timeout(250); rs = await p.inner_text('#cf_r')
        T('F3 لا تعارض ظاهر + تنبيه أن الفحص مطابقة أسماء فقط', 'لا تعارض ظاهر' in rs and 'مطابقة الأسماء' in rs, rs[:240])
        await p.fill('#cf_c', 'موكل أ'); await p.fill('#cf_o', 'x'); await p.click('[data-act="cfrun"]'); await p.wait_for_timeout(250); rs = await p.inner_text('#cf_r')
        T('F4 الموكل نفسه في قضية أخرى يظهر معلومة لا تعارضاً مباشراً (قضية 1: موكل سابق/حالي)', 'قضية 1' in rs, rs[:240])
        await goto('c1'); await p.click('#m [data-act="cfopen"][data-cc="c1"]'); await p.wait_for_timeout(350)
        T('F5 فحص من القضية: الحقول معبأة (موكل أ، خصم س) والنتيجة تذكر قضية 2 دون القضية نفسها', await p.input_value('#cf_c') == 'موكل أ' and await p.input_value('#cf_o') == 'خصم س' and 'قضية 2' in await p.inner_text('#cf_r') and 'قضية 1' not in (await p.inner_text('#cf_r')).replace('قضية 2', ''), (await p.inner_text('#cf_r'))[:200])
        # تحذير عند حفظ بيانات القضية
        await goto('c4'); DLG['log'].clear(); DLG['mode'] = 'dismiss'
        await p.evaluate("()=>caseEditSheet()"); await p.wait_for_timeout(200); await p.fill('#ce_client', 'خصم س'); await p.click('[data-act="csaveinfo"]'); await p.wait_for_timeout(300)
        cf = [m for t_, m in DLG['log'] if t_ == 'confirm']
        T('F6 حفظ موكل = خصم في قضية أخرى: تأكيد يذكر التعارض والقضية', len(cf) == 1 and 'تعارض' in cf[0] and 'قضية 1' in cf[0], DLG['log'])
        T('F7 رفض التأكيد ← لا حفظ (موكل د باقٍ) والشاشة مفتوحة', (await C('c4'))['client'] == 'موكل د' and await opened() and await p.locator('#ce_client').count() == 1, (await C('c4'))['client'])
        DLG['log'].clear(); DLG['mode'] = 'accept'; await p.click('[data-act="csaveinfo"]'); await p.wait_for_timeout(300)
        T('F8 قبول التأكيد ← يُحفظ', (await C('c4'))['client'] == 'خصم س' and len([1 for t_, m in DLG['log'] if t_ == 'confirm']) == 1)
        DLG['log'].clear(); await p.evaluate("()=>caseEditSheet()"); await p.wait_for_timeout(200); await p.fill('#ce_client', 'اسم فريد جداً'); await p.fill('#ce_opp', 'خصم فريد'); await p.click('[data-act="csaveinfo"]'); await p.wait_for_timeout(300)
        T('F9 تغيير بلا تعارض ← يُحفظ بلا أي تأكيد', (await C('c4'))['client'] == 'اسم فريد جداً' and not DLG['log'], DLG['log'])
        DLG['log'].clear(); await goto('c1'); await p.evaluate("()=>caseEditSheet()"); await p.wait_for_timeout(200); await p.fill('#ce_notes', 'ملاحظة جديدة'); await p.click('[data-act="csaveinfo"]'); await p.wait_for_timeout(300)
        T('F10 تعديل الملاحظات فقط على قضية فيها تعارض ← لا تأكيد (يُسأل عند تغيير الموكل/الخصم فقط)', (await C('c1'))['notes'] == 'ملاحظة جديدة' and not DLG['log'], DLG['log'])
        # ---- G) توافق وتخزين
        keys1 = set(await p.evaluate("()=>Object.keys(localStorage)")); newk = keys1 - keys0
        T('G1 لا مفاتيح تخزين جديدة (كل بيانات L5 داخل lists)', newk <= {'cnt', 'rec', 'fav'}, newk)
        T('G2 lists ضمن مفاتيح الخزنة المشفّرة والنسخة الاحتياطية', await p.evaluate("()=>VAULT.VK.includes('lists')&&BKEYS.includes('lists')"))
        raw = await p.evaluate("()=>JSON.parse(localStorage.getItem('lists'))"); c1r = [x for x in raw if x['id'] == 'c1'][0]
        T('G3 سجل الوقت والقرارات والأجر محفوظة داخل القضية', c1r.get('tl') and c1r.get('hr') == 400 and any(s.get('dec') for s in c1r['sessions']), c1r.get('hr'))
        T('G4 جلسات قديمة بلا حقول جديدة (s9 في قضية 3) سليمة ولا تُكسر العرض', await p.evaluate("()=>{S.tab='fav';S.cl='c3';render();return document.querySelector('#m').innerText.includes('قديمة')}"))
        T('G5 لا أخطاء JS', not errs, errs[:3])
        await ctx.close(); await br.close()
asyncio.run(main())
print(f"\n{sum(R)}/{len(R)} نجح" + ('' if all(R) else ' — توجد إخفاقات')); sys.exit(0 if all(R) else 1)
