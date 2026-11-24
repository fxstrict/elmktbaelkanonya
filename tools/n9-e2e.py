#!/usr/bin/env python3
"""اختبار N9a في Chromium بحجم هاتف: عامل التحسينات (FX) — تطابق بكسلي مع المسار المتزامن، ذاكرة EN.rc والمصغّرات، عدم تجمّد الواجهة (قياس أطول فجوة إطارات)،
الطابور، التراجع، دفعة الصفحات، والعودة الصامتة عند غياب العامل. الاستعمال: python3 tools/n9-e2e.py /tmp/n5fx"""
import sys, os, shutil, threading, http.server, functools, asyncio
from playwright.async_api import async_playwright
FX_DIR = sys.argv[1] if len(sys.argv) > 1 else '/tmp/n5fx'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); SITE = '/tmp/n9site'
shutil.rmtree(SITE, ignore_errors=True); shutil.copytree(ROOT, SITE, ignore=shutil.ignore_patterns('.git'))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8790), functools.partial(Q, directory=SITE)); threading.Thread(target=srv.serve_forever, daemon=True).start()
R = []
def T(n, c, extra=''):
    R.append(bool(c)); print(('✓ ' if c else '✗ ') + n + (('  ' + str(extra)) if extra != '' else ''))
MK = """async(a)=>{const c=document.createElement('canvas');c.width=a.w;c.height=a.h;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,a.w,a.h);g.addColorStop(0,'#e8e4da');g.addColorStop(1,'#bdb7a8');x.fillStyle=g;x.fillRect(0,0,a.w,a.h);x.fillStyle='#222';x.font=Math.round(a.h/40)+'px "DejaVu Sans",Arial';
 for(let i=0;i<a.rows;i++)x.fillText('نص تجريبي للمستند رقم '+i+' — 1234567890 abc',a.w*0.05+(i%3)*7,a.h*0.05+i*a.h/(a.rows+2));
 x.fillStyle='rgba(30,60,160,.7)';x.fillRect(a.w*0.6,a.h*0.7,a.w*0.25,a.h*0.04);
 const id=x.getImageData(0,0,a.w,a.h),d=id.data;let s=5;for(let i=0;i<d.length;i+=4){s=(s*1103515245+12345)&0x7fffffff;const n=((s>>8)%15)-7;d[i]+=n;d[i+1]+=n;d[i+2]+=n}x.putImageData(id,0,0);
 const b=await new Promise(r=>c.toBlob(r,'image/png'));return b}"""
LOAD = """async(a)=>{const b=await (""" + MK + """)(a);const it=await dpLoad(new File([b],a.n,{type:'image/png'}));return it}"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await b.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
        p = await ctx.new_page(); E = []
        p.on('pageerror', lambda e: E.append(str(e))); p.on('console', lambda m: E.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Failed to load' not in m.text else None)
        await p.route('**/fonts.googleapis.com/**', lambda r: r.abort())
        js = lambda c, *a: p.evaluate(c, *a) if a else p.evaluate(c)
        async def click(act, **kw):
            q = f'[data-act={act}]' + ''.join(f'[data-{k}="{v}"]' for k, v in kw.items()); await p.wait_for_selector(q, state='attached'); await p.evaluate("(q)=>document.querySelector(q).click()", q)
        await p.goto('http://127.0.0.1:8790/index.html'); await p.wait_for_timeout(1800); await js("closeSheet();PRO.enabled=false")
        ls0 = await js("JSON.stringify(Object.keys(localStorage).sort())")
        T('FX محمَّل وEN.fxOp موجود', await js("typeof FX=='object'&&typeof EN.fxOp=='function'&&typeof FX.warm=='function'"))
        T('العامل يبدأ ويجهز (init يجلب enhance.js)', await js("FX.start()") is True and await js("FX.ready"), await js("FX.dead"))
        # ---------- تطابق بكسلي: مسار العامل مقابل المتزامن ----------
        await js("(async()=>{window.__it=await (" + LOAD + ")({w:1200,h:1600,rows:30,n:'a.png'});DP.items=[window.__it]})()")
        await p.wait_for_function("window.__it&&window.__it.orig")
        ops = "[{t:'rot',d:90},{t:'filter',f:'magic'},{t:'crop',x:100,y:80,w:900,h:700},{t:'filter',f:'adapt'},{t:'filter',f:'adj:10:20:30'},{t:'filter',f:'gray'},{t:'filter',f:'erase:50:50:120:60'},{t:'filter',f:'pdoc'}]"
        r = await js("""async()=>{const it=window.__it;it.ops=""" + ops + """;EN.rc=[];const a=dpRender(it).getContext('2d'),W=dpRender(it).width,H=dpRender(it).height;
          const A=a.getImageData(0,0,W,H).data;EN.rc=[];const c2=await FX.render(it,it.ops);const B=c2.getContext('2d').getImageData(0,0,c2.width,c2.height).data;
          let diff=0;if(A.length!=B.length)diff=-1;else for(let i=0;i<A.length;i++)if(A[i]!==B[i])diff++;return{diff,w:W,h:H,w2:c2.width,h2:c2.height}}""")
        T('render غير المتزامن مطابق بكسلاً بكسل لـdpRender (تدوير+قص+8 تحسينات بينها gray القديم)', r['diff'] == 0 and r['w'] == r['w2'] and r['h'] == r['h2'], r)
        # ---------- warm: يملأ EN.rc فيصير dpRender فورياً ومطابقاً ----------
        r = await js("""async()=>{const it=window.__it;it.ops=[{t:'rot',d:90}];EN.rc=[];const op={t:'filter',f:'denoise:20'};
          const t0=performance.now();const c=await FX.warm(it,op);const tw=performance.now()-t0;dpOp(it,op);
          const t1=performance.now();const o=dpRender(it);const tr=performance.now()-t1;const hit=EN.rc.length==1&&EN.rc[0].key.endsWith(JSON.stringify(it.ops));
          const A=o.getContext('2d').getImageData(0,0,o.width,o.height).data;EN.rc=[];const o2=dpRender(it),B=o2.getContext('2d').getImageData(0,0,o2.width,o2.height).data;
          let diff=0;for(let i=0;i<A.length;i++)if(A[i]!==B[i])diff++;return{ok:!!c,hit,tw:Math.round(tw),tr:Math.round(tr),diff}}""")
        T('warm يملأ ذاكرة EN.rc بالمفتاح نفسه، وdpRender بعده من الذاكرة ومطابق للحساب المتزامن', r['ok'] and r['hit'] and r['diff'] == 0, r)
        # ---------- المصغّرات ----------
        r = await js("""async()=>{const it=window.__it;FX.tc.clear();EN.rc=[];const t0=performance.now();const a=dpThumb(it);const t1=performance.now()-t0;const t2=performance.now();const b=dpThumb(it);const t3=performance.now()-t2;return{same:a===b&&a.startsWith('data:image/jpeg'),first:Math.round(t1),second:Math.round(t3*10)/10}}""")
        T('dpThumb: الاستدعاء الثاني من الذاكرة (أسرع بكثير وبالنتيجة نفسها)', r['same'] and r['second'] < max(5, r['first'] / 5), r)
        T('dpThumb بلا تحسينات يمر للأصل بلا تخزين', await js("(()=>{const it={id:999,orig:window.__it.orig,ops:[{t:'rot',d:90}]};const n=FX.tc.size;dpThumb(it);return FX.tc.size==n})()"))
        # ---------- عدم تجمّد الواجهة على صورة 12 ميغابكسل عبر زر الواجهة الحقيقي ----------
        await js("(async()=>{window.__big=await (" + LOAD + ")({w:4000,h:3000,rows:60,n:'big.png'});DP.items=[window.__big];DP.name='n9'})()")
        await p.wait_for_function("window.__big&&window.__big.orig", timeout=60000)
        TICK = """()=>{window.__gaps=[];let last=performance.now();window.__tk=setInterval(()=>{const n=performance.now();window.__gaps.push(n-last);last=n},16)}"""
        async def measure(label, dead):
            await js("(()=>{DP.items=[window.__big];window.__big.ops=[];EN.rc=[];FX.tc.clear();FX.stat.ok=0;FX.stat.fb=0;DPE.i=0;DPE.mode=null;dpWork();dpEditView()})()")
            await p.wait_for_selector('[data-act=enf][data-f=denoise]', state='attached')
            if dead: await js("FX.kill('forced-sync')")
            await js(TICK); t0 = await js("performance.now()")
            await click('enf', f='denoise')
            await p.wait_for_function("window.__big.ops.length==1", timeout=120000)
            await p.wait_for_timeout(300); total = await js("performance.now()-" + str(t0))
            gap = await js("(()=>{clearInterval(window.__tk);return Math.max(...window.__gaps)})()")
            return round(gap), round(total)
        gw, tw_ = await measure('worker', False)
        st = await js("[FX.stat.ok,FX.stat.fb]")
        gs, ts = await measure('sync', True)
        print(f'   قياس 12MP denoise: العامل أطول تجمّد={gw}ms (الكلي {tw_}ms) | المتزامن أطول تجمّد={gs}ms (الكلي {ts}ms) | FX.stat(ok,fb)={st}')
        T('مسار العامل فعلاً استُعمل (ok=1، لا عودة)', st == [1, 0], st)
        T('الواجهة لا تتجمّد مع العامل: أطول فجوة إطارات < 400ms (وبالأحرى أقل بكثير من المتزامن)', gw < 400 and gw * 3 < gs, (gw, gs))
        T('بعد العودة المتزامنة (العامل مقتول) نجحت العملية وأُضيفت للعمليات', await js("window.__big.ops.length")==1)
        await js("DP.items=[];window.__big=null")
        # ---------- الطابور (نقرتان متتاليتان) والتراجع ----------
        await js("FX.dead='';FX.init=null;(async()=>{DP.items=[window.__it];window.__it.ops=[];EN.rc=[];FX.tc.clear();DPE.i=0;DPE.mode=null;dpWork();dpEditView()})()")
        await p.wait_for_selector('[data-act=enf][data-f=magic]', state='attached')
        await js("document.querySelector('[data-act=enf][data-f=magic]').click();document.querySelector('[data-act=enf][data-f=adapt]').click()")
        await p.wait_for_function("window.__it.ops.length==2", timeout=60000)
        T('نقرتان متتاليتان: تُنفَّذان بالترتيب بلا ضياع', await js("window.__it.ops.map(o=>o.f).join()") == 'magic,adapt')
        await p.wait_for_timeout(300)
        await click('dpundo'); await p.wait_for_timeout(300)
        r = await js("(()=>{const o=dpRender(window.__it);return[window.__it.ops.length,o.width>0]})()")
        T('التراجع بعد عملية محسوبة في العامل يعمل (عملية واحدة وصورة صالحة)', r == [1, True], r)
        # ---------- دفعة الصفحات: مصغّرات من الذاكرة ----------
        await js("(async()=>{const mk=async n=>await (" + LOAD + ")({w:1200,h:1600,rows:20,n});DP.items=[await mk('p1.png'),await mk('p2.png'),await mk('p3.png')];window.__ready=1;dpWork()})()")
        await p.wait_for_function("window.__ready==1&&DP.items.length==3")
        await p.wait_for_selector('[data-act=enall][data-f=pdoc]', state='attached');
        await js("FX.tc.clear();FX.stat.ok=0;FX.stat.fb=0"); await click('enall', f='pdoc')
        await p.wait_for_function("DP.items.every(x=>x.ops.length==1)", timeout=120000); await p.wait_for_timeout(400)
        r = await js("""(()=>{const ts=[];for(const it of DP.items){const t=performance.now();const a=dpThumb(it);ts.push([Math.round((performance.now()-t)*10)/10,a.startsWith('data:image')])}
          const ref=[];const keep=new Map(FX.tc);FX.tc.clear();EN.rc=[];for(const it of DP.items)ref.push(dpThumb(it));const same=DP.items.every((it,i)=>ref[i]===[...keep.values()][i]);return{ts,same,ok:FX.stat.ok,fb:FX.stat.fb}})()""")
        T('دفعة 3 صفحات: كلها عبر العامل (ok=3)', r['ok'] == 3 and r['fb'] == 0, r)
        T('مصغّرات الدفعة جاهزة من الذاكرة (<30ms لكل صفحة) وتطابق الحساب المتزامن حرفياً', all(t[1] and t[0] < 30 for t in r['ts']) and r['same'], r['ts'])
        # ---------- عامل غائب: سقوط صامت ----------
        pg = await ctx.new_page(); E2 = []
        pg.on('pageerror', lambda e: E2.append(str(e)))
        await pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); await pg.route('**/js/fxworker.js*', lambda r: r.abort())
        await pg.goto('http://127.0.0.1:8790/index.html'); await pg.wait_for_timeout(1500); await pg.evaluate("closeSheet();PRO.enabled=false")
        await pg.evaluate("(async()=>{const b=await (" + MK + ")({w:600,h:800,rows:10});const it=await dpLoad(new File([b],'z.png',{type:'image/png'}));DP.items=[it];DPE.i=0;DPE.mode=null;dpWork();dpEditView()})()")
        await pg.wait_for_selector('[data-act=enf][data-f=magic]', state='attached')
        await pg.evaluate("document.querySelector('[data-act=enf][data-f=magic]').click()")
        await pg.wait_for_function("DP.items[0].ops.length==1", timeout=30000)
        T('ملف العامل محجوب: التحسين يُطبَّق بالمسار القديم دون خطأ للمستخدم', await pg.evaluate("FX.ready===false&&!!FX.dead&&DP.items[0].ops[0].f=='magic'"), await pg.evaluate("FX.dead"))
        T('لا أخطاء JS ظاهرة في حالة غياب العامل', not E2, E2[:2]); await pg.close()
        T('لا مفاتيح localStorage جديدة', await js("JSON.stringify(Object.keys(localStorage).sort())") == ls0)
        T('لا أخطاء JavaScript', not E, E[:3])
        await b.close()
asyncio.run(main()); print(f"\nنجح {sum(R)} وفشل {len(R) - sum(R)}"); sys.exit(0 if all(R) else 1)
