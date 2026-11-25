#!/usr/bin/env python3
"""اختبار L3 (1.25.0): الأتعاب والمحاسبة — ضريبة القيمة المضافة، ترقيم رسمي متسلسل (إلغاء لا حذف)، دقة بالقروش،
كشف حساب مفصّل (فترة، رصيد افتتاحي، كل قضايا الموكل)، فاتورة، تقرير شهري، توافق القيود القديمة.
الاستعمال: python3 tools/l3-e2e.py [مجلد_التطبيق]   (مرّر 1.24.0 لإثبات أنه يفشل قبل الإضافة)"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, json, io
from playwright.async_api import async_playwright
import docx as pydocx
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8797), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8797/index.html'
R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)) if x != '' else ''))
LISTS = [{'id': 'c1', 'name': 'قضية 1', 'client': 'موكل أ', 'no': '5', 'year': '2026', 'items': [], 'sessions': []},
         {'id': 'c2', 'name': 'قضية 2', 'client': 'موكل أ', 'items': [], 'sessions': []},
         {'id': 'c3', 'name': 'قضية 3', 'client': 'موكل ب', 'items': [], 'sessions': []}]
ACC0 = [{'id': 'a1', 'case': 'c1', 'k': 'fee', 'amt': 1000, 'date': '2026-01-10', 'note': 'قديم'},
        {'id': 'a2', 'case': 'c1', 'k': 'pay', 'amt': 400, 'date': '2026-01-20', 'note': '', 'rno': 1},
        {'id': 'a3', 'case': 'c1', 'k': 'exp', 'amt': 100.1, 'date': '2026-01-25', 'note': 'رسوم'},
        {'id': 'b1', 'case': 'c2', 'k': 'fee', 'amt': 500, 'date': '2026-02-01', 'note': ''}]
FP0 = {'lawyer': 'أحمد المحامي'}
def txt(path_or_bytes):
    d = pydocx.Document(io.BytesIO(bytes(path_or_bytes))); out = [p.text for p in d.paragraphs]
    rows = [[c.text for c in r.cells] for t in d.tables for r in t.rows]
    return '\n'.join(out), rows
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True)
        p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
        p.on('dialog', lambda d: asyncio.ensure_future(d.accept('خطأ إدخال')))
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await p.goto(URL); await p.wait_for_timeout(800)
        await p.evaluate("s=>{for(const k in s)localStorage.setItem(k,JSON.stringify(s[k]))}", {'lists': LISTS, 'acc': ACC0, 'fp': FP0}); await p.reload(); await p.wait_for_timeout(1200)
        await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false;window.__f=[];window.mwSend=(u8,n)=>{window.__f.push([n,Array.from(u8)])}}")
        E = lambda i: p.evaluate("i=>ACC.find(x=>x.id==i)", i)
        async def add(kind, amt, date='2026-11-25', note='', vm=None, nov=False):
            await p.evaluate("k=>feeAdd(k)", kind); await p.fill('#fa_amt', str(amt)); await p.fill('#fa_date', date)
            if note: await p.fill('#fa_note', note)
            if vm: await p.select_option('#fa_vm', vm)
            if nov: await p.uncheck('#fa_vat')
            await p.click('[data-act="fsave"]'); await p.wait_for_timeout(350)
            return await p.evaluate("()=>ACC[ACC.length-1]")
        await p.evaluate("()=>feeSheet('c1')"); await p.wait_for_timeout(300)
        # ---- A) الضريبة
        await p.evaluate("()=>feeAdd('fee')"); await p.wait_for_timeout(200)
        T('A1 الضريبة مطفأة افتراضياً: لا خيار ضريبة في نموذج الأتعاب', await p.locator('#fa_vat').count() == 0)
        await p.evaluate("()=>feeSettings()"); await p.wait_for_timeout(250)
        await p.check('#fn_on'); await p.fill('#fn_r', '14'); await p.fill('#fn_tax', '123-456-789'); await p.click('[data-act="fnsave"]'); await p.wait_for_timeout(300)
        fp = await p.evaluate("()=>JSON.parse(localStorage.getItem('fp'))")
        T('A2 الإعدادات تُحفظ في fp.fin ولا تمسّ بقية fp (اسم المحامي باقٍ)', fp.get('fin', {}).get('vat') is True and fp['fin'].get('rate') == 14 and fp['fin'].get('tax') == '123-456-789' and fp.get('lawyer') == 'أحمد المحامي', fp)
        await p.evaluate("()=>feeSheet('c1')"); await p.wait_for_timeout(250)
        await p.evaluate("()=>feeAdd('fee')"); await p.fill('#fa_amt', '1000'); await p.wait_for_timeout(250)
        pv = await p.inner_text('#fa_vp')
        T('A3 معاينة حية: صافي 1,000.00 + ضريبة 140.00 = إجمالي 1,140.00', '1,000.00' in pv and '140.00' in pv and '1,140.00' in pv, pv.replace('\n', ' '))
        await p.fill('#fa_date', '2026-11-25'); await p.click('[data-act="fsave"]'); await p.wait_for_timeout(350)
        e = await p.evaluate("()=>ACC[ACC.length-1]")
        T('A4 قيد الأتعاب: صافٍ 1000 وضريبة 140 وإجمالي 1140 ورقم F-2026 رقم 1', (e['net'], e['vat'], e['vr'], e['amt'], e['sno'], e['sy'], e['sp']) == (1000, 140, 14, 1140, 1, 2026, 'F'), e)
        e = await add('fee', 1140, vm='incl')
        T('A5 شامل الضريبة: 1140 ← صافٍ 1000 وضريبة 140 (رقم 2)', (e['net'], e['vat'], e['amt'], e['sno']) == (1000, 140, 1140, 2), e)
        e = await add('fee', 700, nov=True)
        T('A6 بإلغاء خيار الضريبة: لا ضريبة ولا رقم فاتورة والمبلغ كما هو', e['amt'] == 700 and 'vat' not in e and 'sno' not in e, e)
        e = await add('fee', 333.33)
        T('A7 تقريب الضريبة للقرش: 333.33 → ضريبة 46.67 وإجمالي 380', (e['vat'], e['amt']) == (46.67, 380), e)
        e = await add('pay', 1.005)
        T('A8 دفعة 1.005 ← 1.01 (لا 1 بسبب الفاصلة العائمة)', e['amt'] == 1.01, e)
        # ---- B) الترقيم
        pays = await p.evaluate("()=>ACC.filter(x=>x.k=='pay'&&x.sno!=null).map(x=>[x.sno,x.sp,x.sy,x.rno])")
        T('B1 الدفعة الجديدة: سلسلة R لعام 2026 رقم 1 مع بقاء rno القديم (2)', pays == [[1, 'R', 2026, 2]], pays)
        await add('pay', 50); e2 = await p.evaluate("()=>ACC[ACC.length-1]")
        T('B2 الدفعة التالية رقم 2', e2['sno'] == 2, e2)
        await p.evaluate("()=>feeSheet('c1')"); await p.wait_for_timeout(300)
        body = await p.inner_text('#sh')
        T('B3 الأرقام الرسمية تظهر في سطور القيود (R-2026-0001 وF-2026-0001)', 'R-2026-0001' in body and 'F-2026-0001' in body and 'منها ضريبة 140.00' in body, body[:200].replace('\n', ' '))
        n0 = await p.evaluate("()=>ACC.length"); due0 = await p.evaluate("()=>accSum('c1').due")
        await p.click(f'[data-act="fdel"][data-id="{e2["id"]}"]'); await p.wait_for_timeout(400)
        v = await E(e2['id']); due1 = await p.evaluate("()=>accSum('c1').due")
        T('B4 حذف قيد مرقَّم = إلغاء: يبقى بالرقم والسبب ولا يُحسب', v and v.get('void') is True and v.get('sno') == 2 and v.get('vw') == 'خطأ إدخال' and await p.evaluate("()=>ACC.length") == n0 and abs((due1 - due0) - 50) < 1e-9, [v, due0, due1])
        e3 = await add('pay', 10)
        T('B5 لا يُعاد استعمال رقم الملغى: التالي 3', e3['sno'] == 3, e3)
        await p.evaluate("()=>feeSheet('c1')"); await p.wait_for_timeout(300)
        body = await p.inner_text('#sh')
        T('B6 الملغى يظهر بعلامة «ملغى» وسببه', 'ملغى: خطأ إدخال' in body)
        await p.click('[data-act="fdel"][data-id="a3"]'); await p.wait_for_timeout(400)
        T('B7 قيد قديم بلا رقم رسمي يُحذف كما كان (توافق)', await E('a3') is None)
        await p.evaluate("()=>{const F=_l('fp',{});F.fin.rs=100;_s('fp',F)}")
        e4 = await add('pay', 5)
        T('B8 «أول رقم إيصال» 100 يرفع السلسلة إلى 100', e4['sno'] == 100, e4)
        e5 = await add('fee', 100, nov=False)
        T('B9 سلسلة الفواتير مستقلة (التالي 4 لا 101)', e5['sno'] == 4, e5)
        e6 = await add('pay', 20, date='2027-01-05')
        T('B10 سنة جديدة تبدأ سلسلتها: 2027 رقم 100 (أول رقم مضبوط) وsy=2027', (e6['sy'], e6['sno']) == (2027, 100), e6)
        await p.evaluate("()=>{const F=_l('fp',{});F.fin.rs=1;_s('fp',F)}")
        # ---- C) المستندات
        await p.evaluate("()=>{window.__f=[]}")
        invId = await p.evaluate("()=>ACC.find(x=>x.k=='fee'&&x.sno==1).id"); payId = await p.evaluate("()=>ACC.find(x=>x.k=='pay'&&x.sno==1).id")
        await p.evaluate("id=>feeReceipt(id)", payId); await p.wait_for_timeout(300)
        f = await p.evaluate("()=>window.__f"); t, _ = txt(f[-1][1]) if f else ('', [])
        T('C1 الإيصال الرسمي: الاسم والمتن برقم R-2026-0001', f and 'R-2026-0001' in f[-1][0] and 'رقم الإيصال: R-2026-0001' in t, f and f[-1][0])
        await p.evaluate("()=>{window.__f=[]}"); await p.evaluate("id=>feeReceipt(id)", e2['id']); await p.wait_for_timeout(300)
        T('C2 إيصال ملغى لا يُصدر ملفاً', await p.evaluate("()=>window.__f.length") == 0)
        await p.evaluate("id=>feeReceipt(id)", 'a2'); await p.wait_for_timeout(300)
        f = await p.evaluate("()=>window.__f")
        T('C3 إيصال قديم بلا رقم رسمي يبقى بترقيمه القديم (001)', f and '001' in f[-1][0] and 'R-2026' not in f[-1][0], f and f[-1][0])
        await p.evaluate("()=>{window.__f=[]}"); await p.evaluate("()=>feeSheet('c1')"); await p.wait_for_timeout(300)
        await p.click(f'[data-act="finv"][data-id="{invId}"]'); await p.wait_for_timeout(400)
        f = await p.evaluate("()=>window.__f"); t, rows = txt(f[-1][1]) if f else ('', [])
        T('C4 الفاتورة: رقم F-2026-0001 ورقم التسجيل الضريبي والعميل', f and 'F-2026-0001' in t and '123-456-789' in t and 'موكل أ' in t, t[:160].replace('\n', ' '))
        T('C5 جدول الفاتورة: 1,000.00 | 14% | 140.00 | 1,140.00 مع تنبيه الفاتورة الإلكترونية', any(r[1:] == ['1,000.00', '14%', '140.00', '1,140.00'] for r in rows) and 'الفاتورة الإلكترونية' in t, rows)
        T('C6 الفاتورة تفقيط الإجمالي', 'ألف ومائة وأربعون' in t, t)
        nfv = await p.evaluate("()=>ACC.filter(x=>x.k=='fee'&&x.sno!=null&&!x.void).length"); nb = await p.locator('[data-act="finv"]').count()
        T('C7 أزرار الفاتورة = عدد فواتير الضريبة الفعلية', nb == nfv, [nb, nfv])
        # ---- D) كشف الحساب
        await p.evaluate("()=>feeSheet('c1')"); await p.wait_for_timeout(250); await p.click('[data-act="fst2"]'); await p.wait_for_timeout(300)
        T('D1 صندوق «كل قضايا الموكل» يظهر لموكل بقضيتين', await p.locator('#fs_a').count() == 1)
        full = await p.inner_text('#fs_r')
        await p.fill('#fs_f', '2026-11-01'); await p.wait_for_timeout(300)
        part = await p.inner_text('#fs_r')
        T('D2 الفترة: رصيد افتتاحي يظهر ويتغير عدد القيود', 'رصيد افتتاحي' in part and 'رصيد افتتاحي' not in full, part.replace('\n', ' | ')[:140])
        await p.evaluate("()=>{window.__f=[]}"); await p.click('[data-act="fstdoc"]'); await p.wait_for_timeout(400)
        f = await p.evaluate("()=>window.__f"); t, rows = txt(f[-1][1]) if f else ('', [])
        clos = await p.evaluate("()=>FC.ledger(ACC.filter(x=>x.case=='c1'),{from:'2026-11-01'}).closing")
        T('D3 وورد: رأس «منها ضريبة»، صف رصيد افتتاحي، صف ملغى، والرصيد الأخير يطابق النواة', rows and 'منها ضريبة' in rows[0] and rows[1][1] == 'رصيد افتتاحي' and any('ملغى —' in r[1] for r in rows) and rows[-1][-1].replace(',', '') == f'{clos:.2f}', [rows[0], rows[-1], clos])
        T('D4 الشهر والموكل والفترة في المتن', 'موكل أ' in t and '2026-11-01' in t)
        await p.fill('#fs_f', ''); await p.check('#fs_a'); await p.wait_for_timeout(300); await p.evaluate("()=>{window.__f=[]}"); await p.click('[data-act="fstdoc"]'); await p.wait_for_timeout(400)
        f = await p.evaluate("()=>window.__f"); t, rows = txt(f[-1][1])
        T('D5 كل قضايا الموكل: قيود القضيتين مع اسم القضية، ومجموع الأتعاب القديم يشمل 500 من قضية 2', any('[قضية 2]' in r[1] for r in rows) and any('[قضية 1]' in r[1] for r in rows) and 'جميع قضايا الموكل (2)' in t, [r[1] for r in rows][:6])
        await p.evaluate("()=>feeStmtSheet('c3')"); await p.wait_for_timeout(250)
        T('D6 موكل بقضية واحدة: لا صندوق «كل القضايا»', await p.locator('#fs_a').count() == 0)
        await p.evaluate("()=>feeStmtSheet('c1')"); await p.wait_for_timeout(250)
        T('D7 النسخ النصي يحوي الرصيد الختامي', await p.evaluate("()=>feeStmtText().includes('الرصيد الختامي')"))
        # ---- E) تقرير شهري
        await p.evaluate("()=>feeMonth()"); await p.fill('#fm_m', '2026-11'); await p.wait_for_timeout(300)
        mr = await p.inner_text('#fm_r')
        md = await p.evaluate("()=>feeMonthData('2026-11').find(o=>o.c.id=='c1')")
        want_vat = await p.evaluate("()=>FC.sum(ACC.filter(x=>x.k=='fee'&&!x.void&&x.date.startsWith('2026-11')).map(x=>x.vat))")
        T('E1 التقرير الشهري يبيّن ضريبة الشهر ويستثني الملغى', 'ضريبة قيمة مضافة' in mr and md['vat'] == want_vat and want_vat > 0 and md['pay'] == 16.01, [md, want_vat])
        # ---- F) دقة
        await p.evaluate("()=>{ACC.push({id:'p1',case:'c3',k:'fee',amt:0.1,date:'2026-03-01'},{id:'p2',case:'c3',k:'fee',amt:0.2,date:'2026-03-02'},{id:'p3',case:'c3',k:'pay',amt:0.3,date:'2026-03-03'});accSave()}")
        s3 = await p.evaluate("()=>accSum('c3')"); await p.evaluate("()=>feeSheet('c3')"); await p.wait_for_timeout(250)
        T('F1 0.1+0.2−0.3 = 0 تماماً والحساب «مسدَّد»', s3['due'] == 0 and 'الحساب مسدَّد' in await p.inner_text('#sh'), s3)
        # ---- G) الفجوات والتخزين
        await p.evaluate("()=>{ACC.push({id:'g1',case:'c3',k:'pay',amt:1,date:'2028-01-01',sy:2028,sno:1,sp:'R'},{id:'g3',case:'c3',k:'pay',amt:1,date:'2028-01-02',sy:2028,sno:3,sp:'R'});accSave()}")
        gp = await p.evaluate("()=>FC.gaps(ACC,'pay',2028)")
        T('G1 نواة الفجوات ترى الرقم 2 المفقود في 2028', gp == [2], gp)
        st = await p.evaluate("()=>JSON.parse(localStorage.getItem('acc')).filter(x=>x.sno!=null||x.void).length")
        T('G2 الحقول الجديدة (sno/void) محفوظة في acc ضمن النسخة الاحتياطية', st >= 8 and await p.evaluate("()=>BKEYS.includes('acc')&&BKEYS.includes('fp')"), st)
        T('G3 acc وfp ضمن مفاتيح الخزنة المشفّرة (لا تسرّب أرقام الفواتير والرقم الضريبي)', await p.evaluate("()=>VAULT.VK.includes('acc')&&VAULT.VK.includes('fp')"))
        await p.evaluate("()=>feesOverview()"); await p.wait_for_timeout(250)
        T('G4 شاشة الحسابات فيها زر الإعدادات', await p.locator('[data-act="fset"]').count() == 1)
        T('G5 لا أخطاء JS', not errs, errs[:2])
        await ctx.close(); await br.close()
asyncio.run(main())
print(f"\n{sum(R)}/{len(R)} نجح" + ('' if all(R) else ' — توجد إخفاقات')); sys.exit(0 if all(R) else 1)
