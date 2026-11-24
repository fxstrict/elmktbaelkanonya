#!/usr/bin/env python3
"""تشغيل كل اختبارات المشروع بأمر واحد (R5): يولّد الملفات التجريبية (PDF وصور وQR) ثم يشغّل اختبارات Node وChromium بالترتيب ويطبع جدولاً ملخصاً.
الاستعمال: python3 tools/run-all.py            (كل شيء)
           python3 tools/run-all.py r4 n6      (حزم محددة فقط)
يحتاج: node وpython3 وplaywright (Chromium) وPIL وnumpy وopencv وpypdf وpython-docx وqpdf."""
import os, sys, subprocess, glob, time
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); T = os.path.join(ROOT, 'tools')
FX5, FX3, FX11 = '/tmp/n5fx', '/tmp/n3', '/tmp/n11fx'
def sh(cmd, timeout=600):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
def fixtures():
    sh(['node', 'tools/n5-fixtures.js', FX5]); sh(['python3', 'tools/n11-fixtures.py', FX11]); sh(['python3', 'tools/n3-fixtures.py', FX3, '--png'])
    import cv2
    src = sorted(glob.glob(FX3 + '/*.png'))[0]; cv2.imwrite(FX5 + '/scan.png', cv2.imread(src))
    q = cv2.QRCodeEncoder.create().encode('https://example.com/case/12345?x=ا')
    q = cv2.copyMakeBorder(cv2.resize(q, None, fx=8, fy=8, interpolation=cv2.INTER_NEAREST), 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
    cv2.imwrite(FX5 + '/qr.png', q)
# (الاسم، الأمر، يقيس بعدّ ✓/✗ أم بكود الخروج)
SUITES = [('n3-test', ['node', 'tools/n3-test.js', FX3], 'exit'), ('pro-test', ['node', 'tools/pro-test.js'], 'exit'), ('n8-test', ['node', 'tools/n8-test.js'], 'exit'), ('n9-test', ['node', 'tools/n9-test.js'], 'exit'), ('n11-test', ['node', 'tools/n11-test.js', FX11], 'count'), ('n10-test', ['node', 'tools/n10-test.js'], 'exit'), ('l0', ['python3', 'tools/l0-e2e.py'], 'count')] + \
         [(n, ['python3', f'tools/{n}-e2e.py', FX3 if n in ('n3', 'n4') else FX11 if n == 'n11' else FX5], 'count') for n in ('n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'r1', 'r2', 'r3', 'r4')]
want = sys.argv[1:]; rows = []; t0 = time.time(); fixtures()
for name, cmd, mode in SUITES:
    if want and name not in want: continue
    t = time.time()
    try: r = sh(cmd, 300); out = r.stdout + r.stderr; ok = r.returncode == 0
    except subprocess.TimeoutExpired: out = ''; ok = False
    p, f = out.count('\n✓') + (1 if out.startswith('✓') else 0), out.count('\n✗') + (1 if out.startswith('✗') else 0)
    rows.append((name, ok, p, f, time.time() - t)); print(f"{'✅' if ok else '❌'} {name:9} ✓{p:<3} ✗{f:<3} {time.time()-t:5.0f}s", flush=True)
bad = [r[0] for r in rows if not r[1]]
print(f"\n{len(rows) - len(bad)}/{len(rows)} حزمة ناجحة في {time.time()-t0:.0f}s" + (f" — الفاشلة: {', '.join(bad)}" if bad else ''))
sys.exit(1 if bad else 0)
