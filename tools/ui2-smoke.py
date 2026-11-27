"""اختبار دخان لواجهة 1.26.1 (UI2): يخدم المجلد محلياً ويلتقط لقطات هاتف (390×844) ويفحص أخطاء JS وفتح الأدوات من القائمة الجديدة.
الاستعمال: python3 tools/ui2-smoke.py <مجلد المشروع> <مجلد اللقطات>"""
import sys,threading,http.server,functools,asyncio
from playwright.async_api import async_playwright
ROOT=sys.argv[1];OUT=sys.argv[2]
H=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT);H.log_message=lambda *a:None
s=http.server.ThreadingHTTPServer(('127.0.0.1',8791),H);threading.Thread(target=s.serve_forever,daemon=True).start()
U='http://127.0.0.1:8791/index.html'
async def main():
  async with async_playwright() as pw:
    try: b=await pw.chromium.launch()
    except Exception: b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block',device_scale_factor=2)
    p=await ctx.new_page();E=[]
    p.on('pageerror',lambda e:E.append('PAGEERR '+str(e)));p.on('console',lambda m:E.append('CONSOLE '+m.text) if m.type=='error' else None)
    await p.route('**/fonts.googleapis.com/**',lambda r:r.abort())
    await p.goto(U);await p.wait_for_timeout(2500)
    await p.evaluate("closeSheet()");await p.wait_for_timeout(400)
    await p.screenshot(path=OUT+'/01-home.png')
    await p.evaluate("scrollTo(0,700)");await p.wait_for_timeout(200);await p.screenshot(path=OUT+'/02-home-scroll.png');await p.evaluate("scrollTo(0,0)")
    await p.click('.tabs [data-tab=all]');await p.wait_for_timeout(500);await p.screenshot(path=OUT+'/03-all.png')
    await p.click('#seg [data-tab=lib]');await p.wait_for_timeout(600);await p.screenshot(path=OUT+'/04-lib.png')
    await p.click('.tabs .mid');await p.wait_for_timeout(500);await p.screenshot(path=OUT+'/05-tools.png')
    await p.evaluate("closeSheet()");await p.wait_for_timeout(400)
    await p.click('.tabs [data-act=more]');await p.wait_for_timeout(500);await p.screenshot(path=OUT+'/06-more.png')
    await p.click('.ml [data-tab=bc]');await p.wait_for_timeout(500)
    print('tab after more->bc:',await p.evaluate("S.tab"),'| more active:',await p.evaluate("document.querySelector('.tabs [data-act=more]').classList.contains('on')"))
    await p.screenshot(path=OUT+'/07-bc.png')
    await p.click('.tabs [data-tab=fav]');await p.wait_for_timeout(400);await p.screenshot(path=OUT+'/08-cases.png')
    await p.click('.tabs [data-tab=home]');await p.wait_for_timeout(300)
    await p.click('.cat >> nth=0');await p.wait_for_timeout(500);await p.screenshot(path=OUT+'/09-results.png')
    await p.click('.row >> nth=0');await p.wait_for_timeout(500);await p.screenshot(path=OUT+'/10-item.png')
    await p.evaluate("closeSheet()");await p.wait_for_timeout(300)
    await p.click('.tabs [data-tab=home]');await p.evaluate("TH='dark';sv('theme',TH);applyTheme()");await p.wait_for_timeout(400);await p.screenshot(path=OUT+'/11-home-dark.png')
    await p.click('.tabs .mid');await p.wait_for_timeout(500);await p.screenshot(path=OUT+'/12-tools-dark.png')
    print('theme attr:',await p.evaluate("document.getElementById('theme').dataset.t"))
    # actions in tools sheet still wired
    await p.evaluate("closeSheet()");await p.wait_for_timeout(300)
    for a in ['calc','mw','fees','guide','hub','poa','dir','agenda','bk','int']:
      await p.evaluate("closeSheet()");await p.wait_for_timeout(250)
      await p.click('.tabs .mid');await p.wait_for_timeout(250)
      await p.click(f'.tg [data-act={a}], .tl[data-act={a}]');await p.wait_for_timeout(350)
      h=await p.evaluate("document.querySelector('#sh h2,#sh .sht')?document.querySelector('#sh h2,#sh .sht').textContent:''")
      print('act',a,'->',h[:40])
    print('ERRORS:',E)
    await b.close()
asyncio.run(main())
