"""T1 (1.28.3): تبويبات ملف القضية. الاستعمال: python3 tools/t1-e2e.py <مجلد المشروع> [مجلد اللقطات]"""
import sys,threading,http.server,functools,asyncio,os
from playwright.async_api import async_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else '.';OUT=sys.argv[2] if len(sys.argv)>2 else None
H=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT);H.log_message=lambda *a:None
s=http.server.ThreadingHTTPServer(('127.0.0.1',8793),H);threading.Thread(target=s.serve_forever,daemon=True).start()
F=[];ok=0
def chk(n,c):
  global ok
  if c: ok+=1;print('✓',n)
  else: F.append(n);print('✗',n)
VIS="""t=>{const cp=document.querySelector('.cp');return [...cp.children].filter(e=>!e.classList.contains('cpnav')&&e.offsetParent!==null).map(e=>e.dataset.ct)}"""
async def main():
  async with async_playwright() as pw:
    try: b=await pw.chromium.launch()
    except Exception: b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    p=await ctx.new_page();E=[]
    p.on('pageerror',lambda e:E.append(str(e)))
    await p.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    await p.goto('http://127.0.0.1:8793/index.html');await p.wait_for_timeout(2000)
    await p.evaluate("closeSheet()")
    await p.evaluate("""()=>{CLS.push({id:'t1',name:'قضية 1',items:[],sessions:[{id:'s1',date:'2030-01-01',note:'x'}]},{id:'t2',name:'قضية 2',items:[]});S.tab='fav';S.cl='t1';render()}""")
    await p.wait_for_timeout(300)
    chk('4 tabs',await p.locator('.cpnav .cpn').count()==4)
    v=await p.evaluate(VIS,0);chk('default shows only info',set(v)=={'info'} and len(v)>=3)
    chk('aria selected',await p.evaluate("document.querySelector('.cpn.on').dataset.t")=='info')
    for t,must in [('docs','مستندات الرفع'),('fin','الأتعاب'),('memo','المذكرات')]:
      await p.click(f'.cpn[data-t={t}]');await p.wait_for_timeout(100)
      v=await p.evaluate(VIS,0);chk('only '+t,len(v)>0 and set(v)=={t})
      txt=await p.evaluate("[...document.querySelectorAll('.cp > *')].filter(e=>e.offsetParent!==null).map(e=>e.textContent).join('|')")
      chk('content '+t,must in txt)
    v=await p.evaluate("[...document.querySelectorAll('.cp [data-act=scancase]')].filter(e=>e.offsetParent!==null).length");await p.click('.cpn[data-t=docs]');chk('scan button in docs',await p.locator('[data-act=scancase]').is_visible())
    chk('tmr in fin',not await p.locator('[data-act=tmrstart]').is_visible())
    await p.click('.cpn[data-t=fin]');chk('tmr visible in fin',await p.locator('[data-act=tmrstart]').is_visible())
    # persistence across render()
    await p.click('.cpn[data-t=memo]');await p.evaluate("render()");await p.wait_for_timeout(300)
    chk('tab survives render',await p.evaluate("document.querySelector('.cp').dataset.ctab")=='memo' and await p.locator('.cpnav').count()==1)
    # session action in info tab then render keeps info
    await p.click('.cpn[data-t=info]');await p.evaluate("CLS.find(c=>c.id=='t1').sessions[0].done=true;render()");await p.wait_for_timeout(300)
    chk('after action stays info',await p.evaluate("document.querySelector('.cp').dataset.ctab")=='info' and await p.evaluate("CLS.find(c=>c.id=='t1').sessions[0].done")==True)
    await p.click('.cpn[data-t=info]');await p.click('[data-act=sdec]');await p.wait_for_timeout(300);await p.evaluate("closeSheet()");await p.wait_for_timeout(300)
    chk('sheet action keeps tab',await p.evaluate("document.querySelector('.cp').dataset.ctab")=='info')
    # per-case independence
    await p.click('.cpn[data-t=fin]');await p.evaluate("S.cl='t2';render()");await p.wait_for_timeout(300)
    chk('other case defaults to info',await p.evaluate("document.querySelector('.cp').dataset.ctab")=='info')
    await p.evaluate("S.cl='t1';render()");await p.wait_for_timeout(300)
    chk('first case remembers fin',await p.evaluate("document.querySelector('.cp').dataset.ctab")=='fin')
    # late-added child follows previous section
    await p.evaluate("document.querySelector('.cp').insertAdjacentHTML('beforeend','<div id=late class=l5><div class=cph><b>سجل الوقت</b></div></div>')");await p.wait_for_timeout(300)
    chk('late child classified',await p.evaluate("document.getElementById('late').dataset.ct")=='fin')
    # no storage key
    chk('no storage written',await p.evaluate("Object.keys(localStorage).every(k=>!/ctab|cpt/.test(k))"))
    # tab bar fits width (no horizontal overflow) and sticky
    chk('no h-scroll',await p.evaluate("document.documentElement.scrollWidth<=innerWidth+1"))
    chk('bar fits',await p.evaluate("(n=>n.scrollWidth<=n.clientWidth+1)(document.querySelector('.cpnav'))"))
    if OUT:
      os.makedirs(OUT,exist_ok=True)
      for t in ['info','docs','fin','memo']:
        await p.click(f'.cpn[data-t={t}]');await p.wait_for_timeout(150);await p.screenshot(path=f'{OUT}/tab-{t}.png')
      await p.evaluate("TH='dark';sv('theme',TH);applyTheme()");await p.wait_for_timeout(300);await p.screenshot(path=f'{OUT}/tab-dark.png')
    chk('no js errors',not E)
    print('passed',ok,'failed',len(F),E[:3])
    await b.close()
asyncio.run(main())
sys.exit(1 if F else 0)
