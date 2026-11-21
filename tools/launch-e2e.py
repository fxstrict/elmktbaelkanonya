# اختبار L1 الشامل: يحتاج مجلد /tmp/ll-e2e منسوخاً من المشروع (cp -r) ثم: python3 tools/launch-e2e.py من جذر المشروع الأصلي. يولّد مفتاحاً مؤقتاً ويضبط العلم في النسخة فقط.
import asyncio,json,subprocess,threading,http.server,functools,sys
from playwright.async_api import async_playwright
# generate key + codes via node
js=r'''
const {webcrypto:wc}=require('crypto');const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32=u=>{let bits=0,v=0,o='';for(const x of u){v=(v<<8)|x;bits+=8;while(bits>=5){bits-=5;o+=A[(v>>bits)&31];v&=(1<<bits)-1}}if(bits)o+=A[(v<<(5-bits))&31];return o};
(async()=>{const kp=await wc.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const pub=Buffer.from(await wc.subtle.exportKey('raw',kp.publicKey)).toString('base64url');
const today=Math.floor((Date.now()-Date.UTC(2026,0,1))/864e5);
const mk=async(plan,exp,s,l)=>{const lb=Buffer.from(l),p=new Uint8Array(8+lb.length),dv=new DataView(p.buffer);p[0]=1;p[1]=plan;dv.setUint16(2,exp);dv.setUint32(4,s);p.set(lb,8);
const sig=new Uint8Array(await wc.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,p));return 'LL1.'+b32(p)+'.'+b32(sig)};
console.log(JSON.stringify({pub,pro:await mk(1,today+200,2001,'محامي تجريبي'),old:await mk(1,today-2,2002,'منتهٍ'),rev:await mk(1,today+200,2003,'مبطل'),soon:await mk(1,today+5,2004,'قريب')}))})()
'''
K=json.loads(subprocess.check_output(['node','-e',js]))
import re
cfg=open('js/config.js').read()
cfg=cfg.replace("enabled:false,pub:null","enabled:true,pub:'%s'"%K['pub']).replace("wa:''","wa:'201000000000'")
open('/tmp/ll-e2e/js/config.js','w').write(cfg)
json.dump({"revoked":[2003]},open('/tmp/ll-e2e/data/revoked.json','w'))
H=functools.partial(http.server.SimpleHTTPRequestHandler,directory='/tmp/ll-e2e')
H.log_message=lambda *a:None
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8765),H);threading.Thread(target=srv.serve_forever,daemon=True).start()
res=[];ERR=[]
def T(n,c):
    res.append(c);print(('✓ ' if c else '✗ ')+n, '' if c else ERR)
async def fresh(b,pre=None):
    ctx=await b.new_context(viewport={'width':390,'height':844},service_workers='block')
    p=await ctx.new_page();errs=[];p.on('pageerror',lambda e:(errs.append(str(e)),ERR.append(str(e))));p.on('console',lambda m:(errs.append(m.text),ERR.append(m.text)) if m.type=='error' and 'TUNNEL' not in m.text else None)
    await p.goto('http://127.0.0.1:8765/index.html');await p.wait_for_timeout(1500)
    return ctx,p,errs
async def st(p):
    return await p.evaluate("(async()=>{await proInit();const s=proStatus();return {s:s.state,rev:!!s.revoked,mw:proAllowed('mw'),fees:proAllowed('fees')}})()")
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        ctx,p,e=await fresh(b)
        keys=await p.evaluate("Object.keys(PRO_FEATURES)");print(keys)
        s=await st(p);T('بلا ترخيص: off والميزات مقيّدة',s['s']=='off' and not s['mw'])
        T('لا أخطاء عند الفتح',not e)
        await p.evaluate("proStartTrial()");s=await st(p);T('تجربة: trial وكل شيء مفتوح',s['s']=='trial' and s['mw'] and s['fees'])
        for name,code,exp_state,exp_open in [('pro','pro','pro',True),('منتهٍ','old','expired',False),('مُبطَل','rev','expired',False)]:
            r=await p.evaluate("(async c=>{await proDeactivate();localStorage.removeItem('trial0');return await proActivate(c)})",K[code])
            s=await st(p)
            if code=='pro': T('Pro: تفعيل وفتح الميزات',r.get('ok') and s['s']=='pro' and s['mw'])
            elif code=='old': T('منتهٍ: يُرفض (expired)',(not r.get('ok')) and r.get('err')=='expired')
            else: T('مُبطَل: يُرفض (revoked)',(not r.get('ok')) and r.get('err')=='revoked')
        await p.evaluate("(async()=>{await proDeactivate();})()")
        # سلة: كود Pro يُحفظ ثم يُبطَل لاحقاً
        await p.evaluate("(async c=>{await proActivate(c)})",K['pro'])
        open('/tmp/ll-e2e/data/revoked.json','w').write(json.dumps({"revoked":[2001]}))
        await p.evaluate("localStorage.removeItem('revk');(async()=>{await proLoadRevoked&&await proLoadRevoked()})()");await p.wait_for_timeout(500)
        s=await st(p);T('كود فعّال ثم أُبطل: يصير expired/revoked',s['s']=='expired' and s['rev'] and not s['mw'])
        open('/tmp/ll-e2e/data/revoked.json','w').write(json.dumps({"revoked":[]}))
        T('لا أخطاء JS أثناء الدورة',not e)
        await ctx.close()
        # رابط التفعيل #act=
        ctx,p,e=await fresh(b)
        await p.goto('http://127.0.0.1:8765/index.html#act='+K['pro']);await p.reload();await p.wait_for_timeout(2000)
        s=await st(p);T('رابط #act= يفعّل Pro',s['s']=='pro');T('الرابط مُسح من العنوان','act=' not in p.url)
        T('بلا أخطاء',not e)
        # قريب الانتهاء
        await p.evaluate("(async c=>{await proActivate(c)})",K['soon']);await p.reload();await p.wait_for_timeout(2000)
        T('لافتة قرب الانتهاء تظهر',await p.evaluate("!!(typeof proRenewInfo!='undefined'&&proRenewInfo()&&proRenewInfo().kind=='soon')"))
        # الواجهة: أدوات + شاشة الاشتراك
        await p.evaluate("proSubSheet()");await p.wait_for_timeout(300)
        T('شاشة الاشتراك تُفتح',await p.evaluate("document.body.innerText.includes('399')"))
        await ctx.close()
        # العلم مغلق
        open('/tmp/ll-e2e/js/config.js','w').write(cfg.replace("enabled:true","enabled:false"))
        ctx,p,e=await fresh(b)
        s=await st(p);T('العلم مغلق: off وكل شيء مفتوح',s['s']=='off' and s['mw'] and s['fees'])
        T('العلم مغلق: بلا أخطاء',not e)
        await b.close()
    print('FAILS',res.count(False))
asyncio.run(main())
