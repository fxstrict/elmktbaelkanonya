/* يولّد ملفات PDF اختبارية لـ N5: node tools/n5-fixtures.js /tmp/n5fx */
const fs=require('fs'),path=require('path'),{PDFDocument,StandardFonts,rgb}=require(path.join(__dirname,'..','lib','pdf-lib.min.js'));
const out=process.argv[2]||'/tmp/n5fx';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const mk=async(n,tag)=>{const d=await PDFDocument.create(),f=await d.embedFont(StandardFonts.Helvetica);d.setTitle(tag);for(let i=1;i<=n;i++){const p=d.addPage([595,842]);p.drawText(tag+' Page '+i,{x:60,y:760,size:28,font:f});p.drawText('The quick brown fox '+i,{x:60,y:700,size:16,font:f,color:rgb(.1,.1,.5)})}return d.save()};
 fs.writeFileSync(out+'/a.pdf',await mk(5,'AAA'));fs.writeFileSync(out+'/b.pdf',await mk(3,'BBB'));
 /* ملف ثقيل: صورة JPEG ضجيجية */
 const {execSync}=require('child_process');execSync(`python3 -c "
from PIL import Image;import random,os
random.seed(1);im=Image.frombytes('RGB',(1800,1200),bytes(random.getrandbits(8) for _ in range(1800*1200*3)));im=im.resize((1800,1200));im.save('${out}/noise.jpg',quality=92)
"`);
 const d=await PDFDocument.create();for(let i=0;i<2;i++){const j=await d.embedJpg(fs.readFileSync(out+'/noise.jpg')),p=d.addPage([595,420]);p.drawImage(j,{x:0,y:0,width:595,height:420})}fs.writeFileSync(out+'/big.pdf',await d.save());
 /* نموذج */
 const f=await PDFDocument.create(),pg=f.addPage([595,842]),form=f.getForm(),hf=await f.embedFont(StandardFonts.Helvetica);
 pg.drawText('Form',{x:60,y:790,size:20,font:hf});
 const t1=form.createTextField('full_name');t1.addToPage(pg,{x:60,y:700,width:240,height:26});
 const t2=form.createTextField('city');t2.addToPage(pg,{x:60,y:650,width:240,height:26});
 const c1=form.createCheckBox('agree');c1.addToPage(pg,{x:60,y:600,width:20,height:20});
 const dd=form.createDropdown('kind');dd.addOptions(['one','two','three']);dd.addToPage(pg,{x:60,y:540,width:160,height:26});
 fs.writeFileSync(out+'/form.pdf',await f.save());
 console.log('ok');
})();
