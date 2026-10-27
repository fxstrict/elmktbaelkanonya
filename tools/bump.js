#!/usr/bin/env node
/* رفع رقم الإصدار في كل مكان دفعة واحدة:  node tools/bump.js 1.2.2
   يحدّث js/config.js و sw.js و version.json (الذي يقرؤه إشعار التحديث) ومعاملات ?v= في index.html، فلا يظهر خليط إصدارات قديم/جديد بعد الرفع على جيت هب. */
const fs=require('fs'),path=require('path'),r=p=>path.join(__dirname,'..',p),v=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(v||'')){console.log('الاستعمال: node tools/bump.js 1.2.2');process.exit(1)}
const sub=(f,fn)=>fs.writeFileSync(r(f),fn(fs.readFileSync(r(f),'utf8')));
sub('js/config.js',s=>s.replace(/version:'[\d.]+'/,`version:'${v}'`));
sub('sw.js',s=>s.replace(/siyagh-v[\d.]+/,'siyagh-v'+v).replace(/الإصدار [\d.]+/,'الإصدار '+v));
sub('index.html',s=>s.replace(/(\.(?:js|css))\?v=[\d.]+"/g,`$1?v=${v}"`));
sub('README.md',s=>s.replace(/\(الإصدار [\d.]+\)/,`(الإصدار ${v})`));
fs.writeFileSync(r('version.json'),JSON.stringify({version:v})+'\n');
console.log('تم → الإصدار',v);
