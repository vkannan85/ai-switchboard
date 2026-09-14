const fs = require('fs');
const path = require('path');
const express = require('express');
const OpenAI = require('openai');

const SUPABASE_URL = 'https://rikeknoqjmnxkgfutmpy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NfbRUCQo1cb0rMmJ1pHcaA_AsuubptW';

function safeJsonParse(text){
  try{return JSON.parse(text);}catch(_){
    const first=String(text||'').indexOf('{'),last=String(text||'').lastIndexOf('}');
    if(first>=0&&last>first)return JSON.parse(String(text).slice(first,last+1));
    throw new Error('Model returned invalid JSON');
  }
}
async function englishRequireUser(req,res,next){
  try{
    const auth=String(req.headers.authorization||'');
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return res.status(401).json({error:'Please sign in first.'});
    const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY}});
    if(!r.ok)return res.status(401).json({error:'Your session has expired. Please sign in again.'});
    req.englishUser=await r.json(); next();
  }catch(error){console.error('English auth error:',error);res.status(401).json({error:'Unable to verify your sign-in.'});}
}
function englishClient(req){
  const apiKey=String(req.headers['x-openai-key']||'').trim();
  if(!apiKey){const e=new Error('Add your OpenAI API key above first.');e.statusCode=400;throw e;}
  return new OpenAI({apiKey});
}
async function englishJson(client,system,user){
  const response=await client.chat.completions.create({
    model:'gpt-4o-mini',response_format:{type:'json_object'},temperature:.55,
    messages:[{role:'system',content:system},{role:'user',content:user}]
  });
  return safeJsonParse(response.choices?.[0]?.message?.content||'{}');
}

const originalListen=express.application.listen;
express.application.listen=function(){
  if(!this.__englishRoutesAdded){
    this.__englishRoutesAdded=true;
    this.post('/api/english',englishRequireUser,async(req,res)=>{
      try{
        const client=englishClient(req);
        const action=String(req.body?.action||'').toLowerCase();
        const topic=String(req.body?.topic||'').trim().slice(0,300);
        const year='Year 7';

        if(action==='daily-vocab'){
          const avoid=Array.isArray(req.body?.avoid)?req.body.avoid.slice(0,120).map(x=>String(x).slice(0,60)):[];
          const data=await englishJson(client,
            `You are an expert UK secondary English teacher. Create exactly 5 useful vocabulary words for a Year 7 pupil. The words should improve reading comprehension and writing, be challenging but age-appropriate, and not be obscure. Return ONLY valid JSON: {"title":"Daily 5 Words","words":[{"word":"word","meaning":"clear pupil-friendly definition","example":"natural example sentence","fillBlank":"sentence containing _____ where the word belongs"}]}. Every fillBlank must contain exactly one _____ blank. All five words must be different. Use British English. No markdown.`,
            `Generate today's five words. Do not use any of these previously learned words: ${JSON.stringify(avoid)}.`);
          return res.json({type:'english-vocab',year,...data});
        }

        if(action==='weekly-test'){
          const words=Array.isArray(req.body?.words)?req.body.words.slice(0,35).map(x=>String(x).trim()).filter(Boolean):[];
          if(!words.length)return res.status(400).json({error:'Learn some Daily 5 words first so I can build your weekly recap.'});
          const count=Math.min(15,Math.max(8,words.length));
          const data=await englishJson(client,
            `Create a Year 7 weekly vocabulary recap test using ONLY the supplied learned words. Return ONLY valid JSON: {"title":"Weekly Vocabulary Recap","instructions":"short instructions","questions":[{"question":"question","marks":1}]}. Create exactly ${count} questions. Mix definitions, fill-the-gap, synonyms in context, choosing the best word for a sentence, and short sentence-writing prompts. Do not provide answers, hints or solutions. Use British English. No markdown.`,
            `Previously learned words: ${JSON.stringify(words)}.`);
          return res.json({type:'english-paper',paperKind:'weekly-vocabulary',year,sourceWords:words,...data});
        }

        if(action==='learn'){
          if(!topic)return res.status(400).json({error:'Choose an English skill first.'});
          const data=await englishJson(client,
            `You are an excellent UK Year 7 English teacher, aligned to Key Stage 3. Return ONLY valid JSON: {"title":"lesson title","overview":"short overview","sections":[{"heading":"heading","content":"clear explanation"}],"examples":[{"label":"example","text":"example","why":"why it works"}],"quickCheck":[{"question":"question","answer":"answer"}]}. Use 4-5 concise sections, 3 examples and 3 quick checks. Teach practical reading or writing skills using British English. No markdown.`,
            `Teach this Year 7 English skill: ${topic}.`);
          return res.json({type:'english-learn',year,topic,...data});
        }

        if(action==='practice'){
          if(!topic)return res.status(400).json({error:'Choose an English skill first.'});
          const data=await englishJson(client,
            `Create Year 7 Key Stage 3 English practice. Return ONLY valid JSON: {"title":"practice title","questions":[{"question":"question","marks":1,"hint":"short helpful hint"}]}. Exactly 8 questions. Mix short-answer, editing, analysis and writing tasks as appropriate to the skill. Use marks from 1 to 4. Do not include answers or solutions. British English, age-appropriate and unambiguous. No markdown.`,
            `Create practice for: ${topic}.`);
          return res.json({type:'english-paper',paperKind:'practice',year,topic,...data});
        }

        if(action==='test'){
          if(!topic)return res.status(400).json({error:'Choose an English skill first.'});
          const data=await englishJson(client,
            `Create a realistic Year 7 Key Stage 3 English assessment. Return ONLY valid JSON: {"title":"assessment title","instructions":"short exam instructions","durationMinutes":30,"questions":[{"question":"question","marks":2}]}. Exactly 10 questions and approximately 25-30 marks total. Include a balanced mix of knowledge, reading/writing technique, analysis and extended response appropriate to the selected skill. Do not include hints, answers or solutions. British English. No markdown.`,
            `Create a Year 7 English test focused on: ${topic}.`);
          return res.json({type:'english-paper',paperKind:'test',year,topic,...data});
        }

        if(action==='mark'){
          const questions=Array.isArray(req.body?.questions)?req.body.questions.slice(0,20):[];
          const responses=Array.isArray(req.body?.responses)?req.body.responses.slice(0,20):[];
          if(!questions.length)return res.status(400).json({error:'There is no English work to mark.'});
          const payload=questions.map((q,i)=>({index:i,question:String(q.question||'').slice(0,1400),marks:Math.max(1,Math.min(10,Number(q.marks)||1)),studentAnswer:String(responses[i]||'').slice(0,2200)}));
          const data=await englishJson(client,
            `You are marking Year 7 Key Stage 3 English. Mark fairly. Accept sensible equivalent wording, reward relevant evidence and explanation, and give partial credit where appropriate. Blank answers score 0. Return ONLY valid JSON: {"items":[{"index":0,"awarded":0,"max":2,"feedback":"brief constructive feedback","modelAnswer":"concise model answer"}],"totalAwarded":0,"totalMarks":0,"percentage":0,"summary":"short encouraging improvement summary"}. awarded must be an integer from 0 to max. Include every submitted item exactly once in index order. No markdown.`,
            `Mark these responses: ${JSON.stringify(payload)}.`);
          return res.json({type:'english-mark',...data});
        }

        return res.status(400).json({error:'Unknown English action.'});
      }catch(error){
        console.error('English error:',error);
        const message=error?.error?.message||error?.message||'Something went wrong in English.';
        res.status(error?.statusCode||500).json({error:message});
      }
    });
  }
  return originalListen.apply(this,arguments);
};

const originalReadFileSync=fs.readFileSync.bind(fs);
const englishEnhancement=`
<style id="english-hub-style">
#englishView{margin-top:18px}.english-hero{background:linear-gradient(135deg,#7c3aed,#db2777 55%,#f59e0b);color:#fff;border-radius:28px;padding:24px;box-shadow:0 20px 60px rgba(124,58,237,.18);position:relative;overflow:hidden}.english-hero:after{content:'ABC';position:absolute;right:20px;top:-12px;font-size:110px;font-weight:1000;opacity:.09;transform:rotate(-7deg)}.english-hero h2{margin:0 0 7px;font-size:clamp(26px,4vw,38px)}.english-year{display:inline-flex;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);padding:7px 11px;border-radius:999px;font-weight:850;margin-top:12px}.english-layout{display:grid;grid-template-columns:1fr 1.45fr;gap:16px;margin-top:18px}.english-panel{background:rgba(255,255,255,.91);border:1px solid rgba(92,111,154,.16);border-radius:22px;padding:18px;box-shadow:0 14px 36px rgba(58,72,130,.09)}.english-panel h3{margin-top:0}.english-skills{display:grid;gap:8px}.english-skill{border:1px solid rgba(92,111,154,.16);background:#fff;border-radius:14px;padding:11px 12px;text-align:left;font-weight:800;cursor:pointer}.english-skill.active{background:#312e81;color:#fff}.english-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.english-action{border:0;border-radius:12px;padding:11px 13px;font-weight:850;cursor:pointer;background:#f3e8ff;color:#4c1d95}.english-action.active{background:#312e81;color:#fff}.english-note{font-size:13px;color:#68738a;line-height:1.5}.english-result{margin-top:14px}.english-card{border:1px solid rgba(92,111,154,.15);background:#fff;border-radius:16px;padding:15px;margin:10px 0}.english-card h3{margin:0 0 7px}.english-example{background:#faf5ff;border-left:4px solid #a855f7;padding:12px 14px;border-radius:11px;margin:9px 0}.english-question{border:1px solid rgba(92,111,154,.16);background:#fff;border-radius:15px;padding:14px;margin:10px 0}.english-question textarea,.english-question input{width:100%;border:1px solid rgba(92,111,154,.2);border-radius:12px;padding:11px;margin-top:10px}.english-feedback{background:#f8fafc;border-radius:12px;padding:10px;margin-top:9px}.english-score{font-size:28px;font-weight:900;color:#7c3aed}.english-vocab-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.english-word{border:1px solid rgba(124,58,237,.16);background:linear-gradient(145deg,#fff,#faf5ff);border-radius:16px;padding:14px}.english-word b{font-size:20px;color:#6d28d9}.english-tools{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.english-tool{border:1px solid rgba(92,111,154,.16);background:#fff;border-radius:16px;padding:14px;text-align:left;cursor:pointer}.english-tool b{display:block;margin-bottom:4px}.english-loading{display:flex;gap:10px;align-items:center;color:#68738a}@media(max-width:820px){.english-layout,.english-vocab-grid,.english-tools{grid-template-columns:1fr}}
</style>
<script id="english-hub-script">(function(){
const skills=['Reading comprehension','Grammar & punctuation','Sentence structure','Creative writing','Descriptive writing','Persuasive writing','Poetry skills','Shakespeare & drama','Spelling & vocabulary'];
let selected='Reading comprehension',modeE='learn',paper=null;
const nav=document.querySelector('.nav');if(nav&&!document.getElementById('englishTab')){const b=document.createElement('button');b.id='englishTab';b.className='secondary';b.textContent='📚 English';nav.insertBefore(b,document.getElementById('signOut'));}
const shell=document.querySelector('.shell'),section=document.createElement('section');section.id='englishView';section.className='hidden';
section.innerHTML='<div class="english-hero"><h2>📚 English Learning Centre</h2><p>Build stronger reading, writing, grammar and vocabulary skills.</p><span class="english-year">Year 7 • UK Key Stage 3 aligned</span></div><div class="english-layout"><div class="english-panel"><h3>Choose an English skill</h3><p class="english-note">Start with a skill, then Learn, Practise or take a Test.</p><div id="englishSkills" class="english-skills"></div><h3 style="margin-top:18px">Vocabulary tracker</h3><div class="english-tools"><button id="dailyWords" class="english-tool"><b>🌟 Daily 5 Words</b><span class="english-note">Learn five new words with examples and fill-the-gap practice.</span></button><button id="weeklyWords" class="english-tool"><b>🧪 Weekly Recap</b><span class="english-note">Test the vocabulary you learned during the previous week.</span></button></div><div id="vocabStatus" class="english-note"></div></div><div class="english-panel"><div class="english-note" style="font-weight:800">Selected skill</div><h2 id="englishTitle" style="margin:5px 0 8px">Reading comprehension</h2><div class="english-actions"><button class="english-action active" data-emode="learn">📘 Learn</button><button class="english-action" data-emode="practice">✏️ Practice</button><button class="english-action" data-emode="test">🧪 Test</button></div><p id="englishHelp" class="english-note">A guided Year 7 lesson with examples and quick checks.</p><button id="englishStart" class="primary">Start Learn</button><div id="englishResult" class="english-result"></div></div></div>';
shell.appendChild(section);
const skillsHost=document.getElementById('englishSkills');
function drawSkills(){skillsHost.innerHTML=skills.map(s=>'<button class="english-skill'+(s===selected?' active':'')+'" data-s="'+s.replace(/"/g,'&quot;')+'">'+s+'</button>').join('');skillsHost.querySelectorAll('.english-skill').forEach(b=>b.onclick=()=>{selected=b.dataset.s;document.getElementById('englishTitle').textContent=selected;drawSkills();document.getElementById('englishResult').innerHTML='';paper=null;});}drawSkills();
function closeEnglish(){section.classList.add('hidden');const b=document.getElementById('englishTab');if(b)b.className='secondary';}
function openEnglish(){document.getElementById('learnView').classList.add('hidden');document.getElementById('libraryView').classList.add('hidden');const mv=document.getElementById('mathsView');if(mv)mv.classList.add('hidden');section.classList.remove('hidden');document.getElementById('learnTab').className='secondary';document.getElementById('libraryTab').className='secondary';const mb=document.getElementById('mathsTab');if(mb)mb.className='secondary';document.getElementById('englishTab').className='primary';refreshVocabStatus();window.scrollTo({top:0,behavior:'smooth'});}
document.getElementById('englishTab').onclick=openEnglish;document.getElementById('learnTab').addEventListener('click',closeEnglish);document.getElementById('libraryTab').addEventListener('click',closeEnglish);setTimeout(()=>{const m=document.getElementById('mathsTab');if(m)m.addEventListener('click',closeEnglish);},500);
const ac=document.getElementById('authCard');if(ac)new MutationObserver(()=>{if(!ac.classList.contains('hidden'))closeEnglish();}).observe(ac,{attributes:true,attributeFilter:['class']});
const help={learn:'A guided Year 7 lesson with examples and quick checks.',practice:'Eight questions with hints, followed by AI marking.',test:'A 30-minute Year 7 assessment with AI marking.'};
document.querySelectorAll('.english-action').forEach(b=>b.onclick=()=>{document.querySelectorAll('.english-action').forEach(x=>x.classList.remove('active'));b.classList.add('active');modeE=b.dataset.emode;document.getElementById('englishHelp').textContent=help[modeE];document.getElementById('englishStart').textContent=modeE==='learn'?'Start Learn':modeE==='practice'?'Start Practice':'Start Test';document.getElementById('englishResult').innerHTML='';paper=null;});
function apiKey(){return sessionStorage.getItem('userOpenAIKey')||'';}function escE(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
async function eFetch(body){if(!session)throw new Error('Please sign in first.');const key=apiKey();if(!key)throw new Error('Add your OpenAI API key above first.');const r=await fetch('/api/english',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'x-openai-key':key},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'English request failed');return d;}
function localDate(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function previousWeek(){const now=new Date(),day=(now.getDay()+6)%7;const thisMon=new Date(now);thisMon.setHours(0,0,0,0);thisMon.setDate(now.getDate()-day);const start=new Date(thisMon);start.setDate(start.getDate()-7);const end=new Date(thisMon);end.setDate(end.getDate()-1);return{start:localDate(start),end:localDate(end)};}
async function refreshVocabStatus(){if(!session)return;const today=localDate();const{data,error}=await sb.from('english_vocabulary_progress').select('id,study_date,word').eq('study_date',today);if(!error)document.getElementById('vocabStatus').textContent=(data||[]).length>=5?'✅ Today’s 5 words completed.':'🌱 Today’s vocabulary is ready when you are.';}
function renderLearn(d){const h=document.getElementById('englishResult');h.innerHTML='<h2>'+escE(d.title||selected)+'</h2><p>'+escE(d.overview||'')+'</p>'+(d.sections||[]).map(x=>'<div class="english-card"><h3>'+escE(x.heading)+'</h3><p>'+escE(x.content)+'</p></div>').join('')+'<h3>Examples</h3>'+(d.examples||[]).map(x=>'<div class="english-example"><b>'+escE(x.label||'Example')+'</b><p>'+escE(x.text||'')+'</p><span class="english-note">'+escE(x.why||'')+'</span></div>').join('')+'<h3>Quick check</h3>'+(d.quickCheck||[]).map((q,i)=>'<div class="english-question"><b>'+(i+1)+'. '+escE(q.question)+'</b><button class="secondary eReveal" data-a="'+encodeURIComponent(q.answer||'')+'" style="margin-top:9px">Reveal answer</button><div class="english-feedback hidden"></div></div>').join('');h.querySelectorAll('.eReveal').forEach(b=>b.onclick=()=>{b.nextElementSibling.textContent='Answer: '+decodeURIComponent(b.dataset.a);b.nextElementSibling.classList.remove('hidden');b.classList.add('hidden');});}
function renderPaper(d,isTest){paper=d;const h=document.getElementById('englishResult'),qs=d.questions||[];h.innerHTML='<h2>'+escE(d.title||selected)+'</h2>'+(d.instructions?'<p class="english-note">'+escE(d.instructions)+'</p>':'')+qs.map((q,i)=>'<div class="english-question"><div class="english-note"><b>Question '+(i+1)+'</b> • '+(q.marks||1)+' mark'+((q.marks||1)===1?'':'s')+'</div><p><b>'+escE(q.question)+'</b></p>'+(!isTest&&q.hint?'<button class="secondary eHint" data-i="'+i+'">Hint</button><div id="eh-'+i+'" class="english-feedback hidden">'+escE(q.hint)+'</div>':'')+'<textarea class="eAnswer" rows="4" placeholder="Write your answer here..."></textarea><div id="ef-'+i+'"></div></div>').join('')+'<button id="englishSubmit" class="primary">'+(isTest?'Submit Test':'Check Practice')+'</button><div id="englishScore" style="margin-top:14px"></div>';h.querySelectorAll('.eHint').forEach(b=>b.onclick=()=>document.getElementById('eh-'+b.dataset.i).classList.toggle('hidden'));document.getElementById('englishSubmit').onclick=()=>markEnglish(isTest);}
async function markEnglish(isTest){const box=document.getElementById('englishScore');try{if(!paper)return;const btn=document.getElementById('englishSubmit');btn.disabled=true;btn.textContent='Marking...';const answers=Array.from(document.querySelectorAll('.eAnswer')).map(x=>x.value);const r=await eFetch({action:'mark',questions:paper.questions||[],responses:answers});(r.items||[]).forEach(x=>{const el=document.getElementById('ef-'+x.index);if(el)el.innerHTML='<div class="english-feedback"><b>'+x.awarded+'/'+x.max+' marks</b><br>'+escE(x.feedback||'')+'<br><br><b>Model answer:</b> '+escE(x.modelAnswer||'')+'</div>';});box.innerHTML='<div class="english-score">'+(r.totalAwarded||0)+' / '+(r.totalMarks||0)+' • '+(r.percentage||0)+'%</div><div class="english-feedback">'+escE(r.summary||'')+'</div>';btn.textContent=isTest?'Test submitted':'Practice checked';}catch(e){box.innerHTML='<div class="error">'+escE(e.message)+'</div>';const btn=document.getElementById('englishSubmit');if(btn){btn.disabled=false;btn.textContent=isTest?'Submit Test':'Check Practice';}}}
function renderDaily(words){const h=document.getElementById('englishResult');h.innerHTML='<h2>🌟 Daily 5 Words</h2><p class="english-note">Learn each word, read the example, then complete the five fill-the-gap sentences.</p><div class="english-vocab-grid">'+words.map((w,i)=>'<div class="english-word"><b>'+(i+1)+'. '+escE(w.word)+'</b><p>'+escE(w.meaning)+'</p><div class="english-example"><b>Example</b><br>'+escE(w.example)+'</div></div>').join('')+'</div><h3>Fill in the blanks</h3>'+words.map((w,i)=>'<div class="english-question"><b>'+(i+1)+'. '+escE(w.fillBlank)+'</b><input class="vocabAnswer" data-i="'+i+'" placeholder="Type the missing word"><div id="vf-'+i+'"></div></div>').join('')+'<button id="checkVocab" class="primary">Check my words</button><div id="vocabScore" style="margin-top:12px"></div>';document.getElementById('checkVocab').onclick=()=>{let score=0;Array.from(document.querySelectorAll('.vocabAnswer')).forEach((input,i)=>{const good=input.value.trim().toLowerCase().replace(/[^a-z'-]/g,'')===String(words[i].word||'').trim().toLowerCase().replace(/[^a-z'-]/g,'');const f=document.getElementById('vf-'+i);f.innerHTML='<div class="english-feedback">'+(good?'✅ Correct':'❌ Answer: <b>'+escE(words[i].word)+'</b>')+'</div>';if(good)score++;});document.getElementById('vocabScore').innerHTML='<div class="english-score">'+score+' / '+words.length+'</div>';};}
async function loadDaily(){const h=document.getElementById('englishResult');h.innerHTML='<div class="english-loading"><div class="spinner"></div>Loading today’s five words...</div>';try{const today=localDate();let q=await sb.from('english_vocabulary_progress').select('word,meaning,example_sentence,fill_blank,study_date').eq('study_date',today).order('created_at',{ascending:true});if(q.error)throw q.error;let words=(q.data||[]).map(x=>({word:x.word,meaning:x.meaning,example:x.example_sentence,fillBlank:x.fill_blank}));if(words.length<5){const hist=await sb.from('english_vocabulary_progress').select('word').order('created_at',{ascending:false}).limit(120);if(hist.error)throw hist.error;const d=await eFetch({action:'daily-vocab',avoid:(hist.data||[]).map(x=>x.word)});words=(d.words||[]).slice(0,5);if(words.length!==5)throw new Error('Could not prepare five vocabulary words. Try again.');const rows=words.map(w=>({user_id:session.user.id,study_date:today,year_group:'Year 7',word:w.word,meaning:w.meaning,example_sentence:w.example,fill_blank:w.fillBlank}));const ins=await sb.from('english_vocabulary_progress').insert(rows);if(ins.error)throw ins.error;}renderDaily(words);refreshVocabStatus();}catch(e){h.innerHTML='<div class="error">'+escE(e.message)+'</div>';}}
async function loadWeekly(){const h=document.getElementById('englishResult');h.innerHTML='<div class="english-loading"><div class="spinner"></div>Building your weekly vocabulary recap...</div>';try{const range=previousWeek();const q=await sb.from('english_vocabulary_progress').select('word,study_date').gte('study_date',range.start).lte('study_date',range.end).order('study_date',{ascending:true});if(q.error)throw q.error;const words=[...new Set((q.data||[]).map(x=>x.word))];if(!words.length)throw new Error('There are no saved Daily 5 words from the previous week yet. Complete Daily 5 this week and your recap will build automatically next week.');const d=await eFetch({action:'weekly-test',words});renderPaper(d,true);}catch(e){h.innerHTML='<div class="error">'+escE(e.message)+'</div>';}}
document.getElementById('dailyWords').onclick=()=>{document.getElementById('englishTitle').textContent='Daily 5 Words';loadDaily();};document.getElementById('weeklyWords').onclick=()=>{document.getElementById('englishTitle').textContent='Weekly Vocabulary Recap';loadWeekly();};
document.getElementById('englishStart').onclick=async function(){const h=document.getElementById('englishResult');h.innerHTML='<div class="english-loading"><div class="spinner"></div>Preparing '+escE(modeE)+' for '+escE(selected)+'...</div>';this.disabled=true;try{const d=await eFetch({action:modeE,topic:selected});if(modeE==='learn')renderLearn(d);else renderPaper(d,modeE==='test');}catch(e){h.innerHTML='<div class="error">'+escE(e.message)+'</div>';}finally{this.disabled=false;}};
})();</script>`;

fs.readFileSync=function(file,options){
  const result=originalReadFileSync(file,options);
  try{
    const isIndex=typeof file==='string'&&path.basename(file)==='index.html';
    if(isIndex&&typeof result==='string'&&!result.includes('english-hub-script'))return result.replace('</body>',englishEnhancement+'\n</body>');
  }catch(_){}
  return result;
};
