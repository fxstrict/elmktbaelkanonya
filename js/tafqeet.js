/* كتابة المبلغ بالحروف (التفقيط) بالجنيه المصري والقرش — للإيصالات وعقود الأتعاب. ملف مستقل قابل للاختبار. */
const TQ_ONES=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
const TQ_TENS=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
const TQ_HUND=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
/* g من 1 إلى 999 → نص */
function tqGroup(g){const h=Math.floor(g/100),r=g%100,p=[];if(h)p.push(TQ_HUND[h]);
 if(r){if(r<20)p.push(TQ_ONES[r]);else{const t=Math.floor(r/10),o=r%10;p.push(o?TQ_ONES[o]+' و'+TQ_TENS[t]:TQ_TENS[t])}}return p.join(' و')}
const TQ_SCALES=[null,['ألف','ألفان','آلاف'],['مليون','مليونان','ملايين'],['مليار','ملياران','مليارات']];
/* يكتب عدداً صحيحاً (حتى 999,999,999,999) مع اسم المعدود (الجنيه/القرش) */
function tqNoun(n,sing,dual,plural,tan){ /* n>0 */
 const parts=[],gs=[];let x=n;while(x>0){gs.push(x%1000);x=Math.floor(x/1000)}
 for(let i=gs.length-1;i>=0;i--){const g=gs[i];if(!g)continue;
  if(i==0){ /* مجموعة الآحاد: يعقبها اسم المعدود */
   const r=g%100;
   if(g==1)parts.push(sing+' واحد');else if(g==2)parts.push(dual);else if(g==200&&sing=='جنيه')parts.push('مائتا جنيه');
   else if(g<=10)parts.push(tqGroup(g)+' '+plural);
   else if(r==1&&g>100)parts.push(tqGroup(g-1)+' و'+sing+' واحد');
   else if(r==2&&g>100)parts.push(tqGroup(g-2)+' و'+dual);
   else if(r>=11||(r>=3&&r<=10))parts.push(tqGroup(g)+' '+(r>=11?sing+tan:(r>=3&&r<=10?plural:sing)));
   else parts.push(tqGroup(g)+' '+sing)}
  else{const sc=TQ_SCALES[i],r=g%100;
   const more=gs.slice(0,i).some(v=>v>0);let t;
   if(g==1)t=sc[0];else if(g==2)t=(more?sc[1]:sc[1].replace(/ان$/,'ا'));
   else if(g==200&&!more)t='مائتا '+sc[0];
   else if(r>=3&&r<=10)t=tqGroup(g)+' '+sc[2];
   else t=tqGroup(g)+' '+sc[0]+(more&&r>=11?'اً':'');
   parts.push(t)}}
 return parts.join(' و')+(gs[0]==0?' '+sing:'')}
/* amount: عدد بالجنيه (يقبل كسوراً حتى قرشين). يعيد نصاً مثل: «فقط ألف ومائتا جنيه ... لا غير» */
function tafqeet(amount){const a=Math.round(Math.abs(Number(amount))*100);if(!isFinite(a)||a>=1e14)return'';const pounds=Math.floor(a/100),pi=a%100;if(a==0)return'فقط صفر جنيه لا غير';
 const P=pounds>0?tqNoun(pounds,'جنيه','جنيهان','جنيهات','اً'):'',Q=pi>0?tqNoun(pi,'قرش','قرشان','قروش','اً'):'';
 let t=P&&Q?P+' و'+Q:P||Q;
 return 'فقط '+t+' لا غير'}
