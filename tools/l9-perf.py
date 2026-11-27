"""L9 (1.31.0): اختبار أداء على Chromium بحجم هاتف مع تقليل سرعة المعالج 4x. الاستعمال: python3 tools/l9-perf.py <مجلد المشروع>
الميزانيات واسعة عمداً (تلتقط التراجع الكبير لا التذبذب). تطبع القياسات دائماً لتُسجَّل في التقرير."""
import sys,threading,http.server,functools,asyncio,json
from playwright.async_api import async_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else '.'
class Q(http.server.SimpleHTTPRequestHandler):
  def log_message(self,*a):pass
H=functools.partial(Q,directory=ROOT)
s=http.server.ThreadingHTTPServer(('127.0.0.1',8798),H);threading.Thread(target=s.serve_forever,daemon=True).start()
F=[];ok=0
def chk(n,c,x=None):
  global ok
  if c: ok+=1;print('✓',n)
  else: F.append(n);print('✗',n,str(x)[:200] if x is not None else '')
U='http://127.0.0.1:8798/index.html'
BUD=dict(ready_ms=5000,dom_nodes=2500,heap_mb=60,longtask_ms=2500,scripts=100)
async def main():
  async with async_playwright() as pw:
    try: b=await pw.chromium.launch()
    except Exception: b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    p=await ctx.new_page();E=[]
    p.on('pageerror',lambda e:E.append(str(e)))
    await p.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    cdp=await ctx.new_cdp_session(p);await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    await p.add_init_script("window.__lt=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt+=e.duration}).observe({entryTypes:['longtask']})}catch(e){}")
    await p.goto(U,wait_until='load')
    await p.wait_for_function("typeof D!=='undefined'&&D.length>0&&!!document.querySelector('#q')",timeout=30000)
    m=await p.evaluate("""()=>{const n=performance.getEntriesByType('navigation')[0];
      return {ready_ms:Math.round(performance.now()),load_ms:Math.round(n.loadEventEnd),dom_nodes:document.getElementsByTagName('*').length,
      heap_mb:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):-1,longtask_ms:Math.round(window.__lt),
      scripts:document.scripts.length,rows:D.length}}""")
    print('قياسات (CPU×4):',json.dumps(m,ensure_ascii=False))
    chk('لا أخطاء صفحة عند الإقلاع',not E,E)
    chk('الجاهزية ≤ %dms'%BUD['ready_ms'],m['ready_ms']<=BUD['ready_ms'],m['ready_ms'])
    chk('عدد عناصر DOM ≤ %d'%BUD['dom_nodes'],m['dom_nodes']<=BUD['dom_nodes'],m['dom_nodes'])
    chk('ذاكرة JS ≤ %dMB'%BUD['heap_mb'],m['heap_mb']<0 or m['heap_mb']<=BUD['heap_mb'],m['heap_mb'])
    chk('مجموع المهام الطويلة ≤ %dms'%BUD['longtask_ms'],m['longtask_ms']<=BUD['longtask_ms'],m['longtask_ms'])
    chk('عدد السكربتات ≤ %d'%BUD['scripts'],m['scripts']<=BUD['scripts'],m['scripts'])
    # زمن الكتابة في البحث (آخر حرف حتى تحديث القائمة) — 3 مرات، نأخذ الأسوأ
    worst=0
    for q in ['نفقة','عقد إيجار','توكيل']:
      t=await p.evaluate("""async q=>{const i=document.querySelector('#q');const t0=performance.now();i.value=q;i.dispatchEvent(new Event('input',{bubbles:true}));
        await new Promise(r=>setTimeout(r,0));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return performance.now()-t0}""",q)
      worst=max(worst,t);await p.wait_for_timeout(400)
    print('أسوأ زمن استجابة بحث: %dms'%worst)
    chk('استجابة البحث ≤ 600ms (CPU×4)',worst<=600,worst)
    # إقلاع دافئ (كاش HTTP) أسرع أو مساوٍ تقريباً
    t0=await p.evaluate("performance.now()");await p.reload(wait_until='load')
    await p.wait_for_function("typeof D!=='undefined'&&D.length>0",timeout=30000)
    w=await p.evaluate("Math.round(performance.now())");print('إقلاع دافئ: %dms'%w)
    chk('الإقلاع الدافئ ≤ البارد×1.5',w<=m['ready_ms']*1.5,(w,m['ready_ms']))
    await b.close()
  print('\n✓%d ✗%d'%(ok,len(F)))
  sys.exit(1 if F else 0)
asyncio.run(main())
