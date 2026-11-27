#!/usr/bin/env python3
"""اختبار L6 (1.28.0) في Chromium بحجم هاتف: مولّد المذكرات والصحف (قائمة، دمج بيانات القضية، مسودات، Word، تحقق الناقص، المستندات الممسوحة)،
وتعبئة الصيغ القديمة من قضية، وسلامة التخزين. الاستعمال: python3 tools/l6-e2e.py [مجلد_التطبيق] (مرّر 1.27.1 لإثبات أنه يفشل قبل الإضافة)"""
import os, sys, shutil, threading, http.server, functools, asyncio, tempfile, io, datetime
from playwright.async_api import async_playwright
import docx as pydocx
ROOT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SITE = tempfile.mkdtemp(); shutil.rmtree(SITE); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8802), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:8802/index.html'; R = []
def T(n, c, x=''): R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(x)[:300]) if x != '' and not c else ''))
def txt(b):
    d = pydocx.Document(io.BytesIO(bytes(b))); out = [p.text for p in d.paragraphs]
    return '\n'.join(out), [[c.text for c in r.cells] for t in d.tables for r in t.rows]
DLG = {'mode': 'accept', 'log': []}
def on_dialog(d):
    DLG['log'].append((d.type, d.message)); asyncio.ensure_future(d.accept('') if DLG['mode'] == 'accept' else d.dismiss())
async def main():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(); ctx = await br.new_context(viewport={'width': 390, 'height': 844}, service_workers='block', accept_downloads=True)
        p = await ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e))); p.on('dialog', on_dialog)
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await p.goto(URL); await p.wait_for_timeout(1000)
        T0 = await p.evaluate("()=>isoD(today12())"); t0 = datetime.date.fromisoformat(T0); D = lambda n: (t0 + datetime.timedelta(days=n)).isoformat()
        LISTS = [{'id': 'c1', 'name': 'قضية أحمد', 'client': 'أحمد علي', 'opp': 'محمود سعيد', 'no': '55', 'year': '2026', 'court': 'محكمة الجيزة', 'circuit': '3', 'ca': 'الجيزة شارع 1', 'items': [],
                  'sessions': [{'id': 's1', 'date': D(-3), 'note': 'فائتة', 'done': False}, {'id': 's2', 'date': D(9), 'note': 'قادمة', 'done': False}, {'id': 's3', 'date': D(30), 'note': 'بعيدة', 'done': False}]},
                 {'id': 'c2', 'name': 'قضية فارغة', 'items': [], 'sessions': []}]
        await p.evaluate("s=>{for(const k in s)localStorage.setItem(k,JSON.stringify(s[k]))}", {'lists': LISTS, 'fp': {'lawyer': 'سامي المحامي', 'office': 'المعادي — شارع 9'}}); await p.reload(); await p.wait_for_timeout(1200)
        await p.evaluate("()=>{try{closeSheet()}catch(e){};if(typeof PRO!='undefined')PRO.enabled=false;window.__f=[];window.mwSend=(u8,n)=>{window.__f.push([n,Array.from(u8)])}}")
        keys0 = set(await p.evaluate("()=>Object.keys(localStorage)"))
        C = lambda i: p.evaluate("i=>CLS.find(x=>x.id==i)", i)
        async def opened(): return await p.evaluate("()=>document.querySelector('#sh').classList.contains('open')")
        async def toast(): return await p.inner_text('#ts')
        async def lastdoc():
            await p.wait_for_function("()=>window.__f.length>0", timeout=8000); f = await p.evaluate("()=>window.__f.pop()"); return f[0], txt(f[1])
        # ---- A) المدخل
        await p.evaluate("()=>toolsSheet()"); await p.wait_for_timeout(250)
        T('A1 زر «مذكرات وصحف» في قائمة الأدوات مرة واحدة', await p.locator('#sh [data-act="dgtool"]').count() == 1)
        await p.click('#sh [data-act="dgtool"]'); await p.wait_for_timeout(300)
        T('A2 القائمة: ستة قوالب وقائمة القضايا (قضيتان + بدون قضية)', await p.locator('#sh [data-act="dgnew"]').count() == 6 and await p.locator('#dg_c option').count() == 3)
        await p.evaluate("()=>closeSheet()")
        await p.evaluate("()=>{S.tab='fav';S.cl='c1';render()}"); await p.wait_for_timeout(300)
        blk = await p.evaluate("()=>{const e=document.querySelector('#m .l6');return e?e.innerText:null}")
        T('B1 كتلة المذكرات والصحف في ملف القضية', blk and 'المذكرات والصحف' in blk, blk)
        await p.evaluate("t=>{const b=document.querySelector('.cpn[data-t='+t+']');if(b)b.click()}", 'memo'); await p.click('#m [data-act="dgcase"]'); await p.wait_for_timeout(300)
        T('B2 الفتح من القضية: القضية محدّدة سلفاً', await p.input_value('#dg_c') == 'c1')
        # ---- C) نموذج مذكرة الدفاع مملوء من القضية
        await p.click('#sh [data-act="dgnew"][data-t="defense"]'); await p.wait_for_timeout(300)
        val = lambda k: p.input_value('#dgf_' + k)
        T('C1 الحقول مملوءة من القضية: الطرفان والعنوان والمحكمة والدائرة ورقم الدعوى', await val('A') == 'أحمد علي' and await val('B') == 'محمود سعيد' and await val('A_addr') == 'الجيزة شارع 1' and await val('court') == 'محكمة الجيزة' and await val('circuit') == '3' and await val('caseno') == '55 لسنة 2026')
        T('C2 الجلسة = أقرب جلسة قادمة (لا الفائتة ولا البعيدة)، والمحامي والمكتب من الإعدادات، والصفة والتاريخ', await val('session') == D(9) and await val('lawyer') == 'سامي المحامي' and await val('office') == 'المعادي — شارع 9' and await val('capA') == 'المدعى عليه' and await val('date') == T0, [await val('session'), await val('capA')])
        await p.fill('#dgf_facts', 'الواقعة الأولى\nالواقعة الثانية'); await p.fill('#dgf_defenses', 'دفع بعدم القبول'); await p.fill('#dgf_requests', 'رفض الدعوى'); await p.fill('#dgf_B_addr', 'القاهرة شارع 2')
        await p.click('[data-act="dgsave"]'); await p.wait_for_timeout(300); c1 = await C('c1'); dr = c1.get('dr', [])
        T('D1 حفظ كمسودة داخل القضية بالقالب والبيانات واسم مفهوم', len(dr) == 1 and dr[0]['t'] == 'defense' and dr[0]['f']['facts'] == 'الواقعة الأولى\nالواقعة الثانية' and 'مذكرة بدفاع' in dr[0]['n'] and 'أحمد علي' in dr[0]['n'], dr)
        T('D2 المسودة محفوظة في التخزين (lists)', await p.evaluate("()=>JSON.parse(localStorage.getItem('lists')).find(x=>x.id=='c1').dr.length") == 1)
        T('D3 العناوين حُفظت في القضية (عنوان الخصم) لأن الخيار مفعّل', c1.get('oa') == 'القاهرة شارع 2', c1.get('oa'))
        # ---- E) Word
        await p.click('[data-act="dgdoc"]'); name, (t, tb) = await lastdoc()
        T('E1 ملف Word: عنوان بصفة الموكل واسمه ورقم الدعوى والجلسة والوقائع المرقمة والدفاع والطلبات والمحامي', 'مذكرة بدفاع المدعى عليه السيد/ أحمد علي' in t and '55 لسنة 2026' in t and 'الدائرة 3' in t and '1) الواقعة الأولى' in t and '2) الواقعة الثانية' in t and '1) دفع بعدم القبول' in t and '1) رفض الدعوى' in t and 'سامي المحامي' in t, t[:300])
        T('E2 اسم الملف يحوي القالب والموكل وينتهي بـ docx', 'مذكرة بدفاع' in name and 'أحمد علي' in name and name.endswith('.docx'), name)
        T('E3 لا سؤال عن نقص (كل الإلزامي مملوء)', not [m for t_, m in DLG['log'] if t_ == 'confirm'], DLG['log'])
        # ---- F) تحقق الناقص
        await p.click('#sh [data-act="dgcase"]'); await p.wait_for_timeout(250); await p.click('#sh [data-act="dgnew"][data-t="claim"]'); await p.wait_for_timeout(300)
        T('F0 صحيفة الدعوى: الصفة «المدعي» ولا رقم دعوى مسبقاً في الاستعمال', await val('capA') == 'المدعي')
        DLG['log'].clear(); DLG['mode'] = 'dismiss'; await p.click('[data-act="dgdoc"]'); await p.wait_for_timeout(500)
        cf = [m for t_, m in DLG['log'] if t_ == 'confirm']
        T('F1 ناقص الإلزامي (الوقائع والطلبات) ← تأكيد يذكر الحقول، والرفض يمنع التنزيل', len(cf) == 1 and 'الوقائع' in cf[0] and 'الطلبات' in cf[0] and await p.evaluate("()=>window.__f.length") == 0, DLG['log'])
        DLG['mode'] = 'accept'; DLG['log'].clear(); await p.click('[data-act="dgdoc"]'); name, (t, tb) = await lastdoc()
        T('F2 القبول ← ملف بنقاط التنقيط للناقص وبيانات القضية الموجودة، دون undefined', '......' in t and 'محكمة الجيزة' in t and 'أحمد علي' in t and 'صحيفة دعوى' in t and 'undefined' not in t, t[:300])
        # ---- G) المسودات
        await p.click('#sh [data-act="dgcase"]'); await p.wait_for_timeout(250)
        T('G1 القائمة تعرض المسودة المحفوظة (واحدة: الصحيفة التي لم تُحفظ لا تُنشئ مسودة إلا بالتنزيل)', await p.locator('#sh [data-act="dgopen"]').count() >= 1)
        c1 = await C('c1'); T('G2 التنزيل يحفظ مسودة تلقائياً (دفاع + دعوى = 2)', len(c1['dr']) == 2 and {d['t'] for d in c1['dr']} == {'defense', 'claim'}, [d['t'] for d in c1['dr']])
        did = [d for d in c1['dr'] if d['t'] == 'defense'][0]['id']; await p.click(f'#sh [data-act="dgopen"][data-k="{did}"]'); await p.wait_for_timeout(300)
        T('G3 فتح مسودة: الوقائع المحفوظة تتغلب على بيانات القضية (والعنوان المعدّل)', await val('facts') == 'الواقعة الأولى\nالواقعة الثانية' and await val('B_addr') == 'القاهرة شارع 2')
        await p.fill('#dgf_requests', 'رفض الدعوى مع المصروفات'); await p.click('[data-act="dgsave"]'); await p.wait_for_timeout(300); c1 = await C('c1')
        T('G4 حفظ مسودة مفتوحة يحدّثها (لا مسودة جديدة)', len(c1['dr']) == 2 and [d for d in c1['dr'] if d['id'] == did][0]['f']['requests'] == 'رفض الدعوى مع المصروفات')
        await p.click('#sh [data-act="dgcase"]'); await p.wait_for_timeout(250); DLG['mode'] = 'accept'; await p.click(f'#sh [data-act="dgdel"][data-k="{did}"]'); await p.wait_for_timeout(400); c1 = await C('c1')
        T('G5 حذف مسودة بتأكيد', len(c1['dr']) == 1 and c1['dr'][0]['t'] == 'claim')
        # ---- H) حافظة المستندات والمستندات الممسوحة
        await p.evaluate("async()=>{await HD.put('docs',{id:'dX',kind:'scan',name:'عقد بيع',caseId:'c1',caseName:'قضية أحمد',pages:1,created:1,updated:1,items:[],sigs:[]});await HD.put('docs',{id:'dY',kind:'scan',name:'مستند قضية أخرى',caseId:'c2',pages:1,created:1,updated:1,items:[],sigs:[]})}")
        await p.click('#sh [data-act="dgnew"][data-t="annex"]'); await p.wait_for_timeout(300); await p.click('[data-act="dgscan"]'); await p.wait_for_timeout(500)
        it = await p.input_value('#dgf_items'); T('H1 إدراج المستندات الممسوحة المرتبطة بالقضية فقط', 'عقد بيع' in it and 'قضية أخرى' not in it, it)
        await p.click('[data-act="dgscan"]'); await p.wait_for_timeout(400); T('H2 الإدراج الثاني لا يكرّر', (await p.input_value('#dgf_items')).count('عقد بيع') == 1)
        await p.fill('#dgf_items', it + ' | 3\nإيصال سداد | 1'); await p.click('[data-act="dgdoc"]'); name, (t, tb) = await lastdoc()
        T('H3 حافظة المستندات: جدول برأس (م، بيان المستند، عدد الأوراق) وصف «إيصال سداد» بعدد أوراقه', tb and tb[0] == ['م', 'بيان المستند', 'عدد الأوراق'] and any('إيصال سداد' in ' '.join(r) and r[-1] == '1' for r in tb), tb)
        # ---- I) بدون قضية
        await p.evaluate("()=>{closeSheet();dgHome('')}"); await p.wait_for_timeout(250); await p.click('#sh [data-act="dgnew"][data-t="notice"]'); await p.wait_for_timeout(300)
        T('I1 بلا قضية: لا زر حفظ مسودة ولا خيار حفظ العناوين، والحقول فارغة عدا المحامي والتاريخ', await p.locator('[data-act="dgsave"]').count() == 0 and await p.locator('#dg_sv').count() == 0 and await val('A') == '' and await val('lawyer') == 'سامي المحامي' and await val('capA') == 'المنذر')
        await p.fill('#dgf_A', 'شركة <النور> & أولاده'); await p.fill('#dgf_B', 'خالد حسن'); await p.fill('#dgf_demands', 'سداد المبلغ المستحق'); await p.fill('#dgf_days', '15'); await p.click('[data-act="dgdoc"]'); name, (t, tb) = await lastdoc()
        T('I2 الإنذار: المهلة 15 يوماً والمطلوب مرقم وحروف XML الخاصة تمرّ سليمة في Word', '15 يوماً' in t and '1) سداد المبلغ المستحق' in t and 'شركة <النور> & أولاده' in t and 'إنذار رسمي' in t, t[:300])
        T('I3 لا مسودة أُنشئت في أي قضية بدون قضية (c2 بلا dr)', not (await C('c2')).get('dr'))
        # ---- J) تعبئة الصيغ القديمة من قضية
        fid = await p.evaluate("()=>Object.keys(byId)[0]")
        await p.evaluate("""id=>{closeSheet();FS={id,sc:{blanks:[{kind:'A',label:'x'},{kind:'B',label:'y'},{kind:'court',label:'z'},{kind:'caseno',label:'لسنة'},{kind:'circuit',label:'c'},{kind:'misc',label:'m'},{kind:'lawyer',label:'l'}],xml:''},vals:['','','','','','','' ],buf:null,pairs:[['','']],out:null};formSheet()}""", fid); await p.wait_for_timeout(300)
        T('J1 قائمة «تعبئة من قضية» تظهر في نموذج الصيغة', await p.locator('#fcase').count() == 1 and await p.locator('#fcase option').count() == 3)
        await p.select_option('#fcase', 'c1'); await p.wait_for_timeout(300)
        ins = await p.evaluate("()=>[...document.querySelectorAll('#sh [data-fi]')].map(e=>e.value)")
        T('J2 تملأ المعروف: الأطراف والمحكمة والدائرة ورقم الدعوى (الرقم فقط لأن الفراغ «لسنة») والمحامي، وتترك «misc»', ins == ['أحمد علي', 'محمود سعيد', 'محكمة الجيزة', '55', '3', '', 'سامي المحامي'], ins)
        T('J3 القيم تُحفظ في حالة النموذج (FS.vals) للتنزيل', await p.evaluate("()=>FS.vals.join('|')") == 'أحمد علي|محمود سعيد|محكمة الجيزة|55|3||سامي المحامي')
        await p.evaluate("()=>{closeSheet();FS=null}")
        # ---- K) سلامة
        keys1 = set(await p.evaluate("()=>Object.keys(localStorage)")); T('K1 لا مفاتيح تخزين جديدة (المسودات داخل lists)', keys1 <= keys0 | {'cnt', 'rec', 'fav'}, keys1 - keys0)
        T('K2 قضية قديمة بلا dr تعمل (c2 تعرض كتلة المذكرات بـ«جديد»)', await p.evaluate("()=>{S.tab='fav';S.cl='c2';render();(b=>b&&b.click())(document.querySelector('.cpn[data-t=memo]'));return document.querySelector('#m .l6').innerText.includes('جديد')}"))
        T('K3 لا أخطاء JS', not errs, errs[:3])
        await ctx.close(); await br.close()
asyncio.run(main())
print(f"\n{sum(R)}/{len(R)} نجح" + ('' if all(R) else ' — توجد إخفاقات')); sys.exit(0 if all(R) else 1)
