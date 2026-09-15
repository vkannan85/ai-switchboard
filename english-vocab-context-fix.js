const fs = require('fs');
const path = require('path');
const originalReadFileSyncVocabContext = fs.readFileSync.bind(fs);

const vocabContextFix = `
<script id="english-vocab-context-fix">(function(){
function ready(){
  const daily=document.getElementById('dailyWords'), weekly=document.getElementById('weeklyWords'), start=document.getElementById('englishStart');
  if(!daily||!weekly||!start){setTimeout(ready,120);return;}
  let context='skill';
  function actions(){return [...document.querySelectorAll('.english-action')];}
  function setContext(kind){
    context=kind;
    const title=document.getElementById('englishTitle'), help=document.getElementById('englishHelp');
    actions().forEach((b,i)=>{b.classList.toggle('active',i===0);b.style.display=i===0?'':'none';});
    if(kind==='daily'){
      if(title)title.textContent='Daily 5 Words';
      if(help)help.textContent='Learn today’s five vocabulary words, meanings and examples.';
      const learn=actions()[0]; if(learn)learn.textContent='📘 Learn Daily 5';
      start.textContent='Learn Daily 5 Words'; start.style.display='none';
    } else if(kind==='weekly'){
      if(title)title.textContent='Weekly Vocabulary Recap';
      if(help)help.textContent='Review all Daily 5 vocabulary already taught during the week.';
      const learn=actions()[0]; if(learn)learn.textContent='📘 Learn / Review Week';
      start.textContent='Review Weekly Vocabulary'; start.style.display='none';
    }
  }
  function restore(){
    if(context==='skill')return; context='skill';
    actions().forEach((b,i)=>{b.style.display='';b.textContent=i===0?'📘 Learn':i===1?'✏️ Practice':'🧪 Test';});
    start.style.display=''; start.textContent='Start Learn';
  }
  daily.addEventListener('click',()=>setTimeout(()=>setContext('daily'),0));
  weekly.addEventListener('click',()=>setTimeout(()=>setContext('weekly'),0));
  document.getElementById('englishSkills')?.addEventListener('click',e=>{if(e.target.closest('.english-skill'))restore();});
  actions().forEach((b,i)=>b.addEventListener('click',e=>{
    if(context==='daily'&&i===0){e.stopImmediatePropagation();daily.click();}
    if(context==='weekly'&&i===0){e.stopImmediatePropagation();weekly.click();}
  },true));
}
ready();
})();</script>`;

fs.readFileSync = function(filePath, options){
  const data = originalReadFileSyncVocabContext(filePath, options);
  try{
    if(path.basename(String(filePath)) === 'index.html'){
      const isBuffer = Buffer.isBuffer(data);
      let html = isBuffer ? data.toString('utf8') : String(data);
      if(!html.includes('english-vocab-context-fix')) html = html.replace('</body>', vocabContextFix + '\n</body>');
      return isBuffer ? Buffer.from(html,'utf8') : html;
    }
  }catch(error){console.error('Vocabulary context injection error:',error);}
  return data;
};
