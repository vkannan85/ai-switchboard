require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = "https://rikeknoqjmnxkgfutmpy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NfbRUCQo1cb0rMmJ1pHcaA_AsuubptW";

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname, { index: false }));

function cleanTopic(topic){ return String(topic || "").trim().slice(0,500); }
function safeJsonParse(text){
  try { return JSON.parse(text); }
  catch(_){
    const first=text.indexOf("{"); const last=text.lastIndexOf("}");
    if(first>=0 && last>first) return JSON.parse(text.slice(first,last+1));
    throw new Error("Model returned invalid JSON");
  }
}
async function requireUser(req,res,next){
  try{
    const authHeader=req.headers.authorization||"";
    const token=authHeader.startsWith("Bearer ")?authHeader.slice(7):"";
    if(!token) return res.status(401).json({error:"Please sign in first."});
    const response=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY}});
    if(!response.ok) return res.status(401).json({error:"Your session has expired. Please sign in again."});
    req.user=await response.json(); next();
  }catch(error){ console.error("Auth validation error:",error); res.status(401).json({error:"Unable to verify your sign-in."}); }
}
function getUserOpenAIClient(req){
  const apiKey=String(req.headers["x-openai-key"]||"").trim();
  if(!apiKey){ const error=new Error("Add your own OpenAI API key before generating. The key is used only for your request and is not stored by this app."); error.statusCode=400; throw error; }
  return new OpenAI({apiKey});
}
async function generateJson(client,system,user){
  const response=await client.chat.completions.create({model:"gpt-4o-mini",response_format:{type:"json_object"},temperature:.5,messages:[{role:"system",content:system},{role:"user",content:user}]});
  return safeJsonParse(response.choices?.[0]?.message?.content||"{}");
}
async function generateImage(client,prompt){
  const response=await client.images.generate({model:"gpt-image-2",prompt,size:"1024x1536"});
  const item=response.data?.[0]; if(!item) throw new Error("No image returned");
  if(item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if(item.url) return item.url;
  throw new Error("Image response did not include image data");
}

app.get("/api/config",(_req,res)=>res.json({supabaseUrl:SUPABASE_URL,supabasePublishableKey:SUPABASE_PUBLISHABLE_KEY}));

app.post("/api/maths",requireUser,async(req,res)=>{
  try{
    const client=getUserOpenAIClient(req);
    const action=String(req.body?.action||"").toLowerCase();
    const topic=cleanTopic(req.body?.topic);
    const year="Year 7";
    if(action!=="mark"&&!topic) return res.status(400).json({error:"Choose a maths topic first."});

    if(action==="learn"){
      const data=await generateJson(client,
        `You are an excellent UK secondary maths teacher. Teach ${year} content aligned to Key Stage 3 in England. Return ONLY valid JSON: {"title":"Lesson title","overview":"Short overview","keyIdeas":["idea"],"workedExamples":[{"question":"Example question","steps":["step"],"answer":"final answer"}],"commonMistakes":["mistake"],"quickCheck":[{"question":"question","answer":"answer"}]}. Use clear British mathematical terminology, 4-6 key ideas, exactly 3 worked examples, 3 common mistakes and 3 quick-check questions. Keep the level suitable for a typical Year 7 pupil. No markdown.`,
        `Teach the Year 7 topic: ${topic}.`);
      return res.json({type:"maths-learn",year,topic,...data});
    }

    if(action==="practice"){
      const allowedCounts=[5,10,15,20,25];
      const requestedCount=Number(req.body?.count);
      const count=allowedCounts.includes(requestedCount)?requestedCount:10;
      const requestedDifficulty=String(req.body?.difficulty||"mixed").toLowerCase();
      const difficulty=["easy","medium","hard","mixed"].includes(requestedDifficulty)?requestedDifficulty:"mixed";
      const difficultyInstruction=difficulty==="easy"?"Keep the questions accessible, focusing mainly on core fluency with light reasoning.":difficulty==="medium"?"Use standard Year 7 difficulty with a balanced mix of fluency, reasoning and problem solving.":difficulty==="hard"?"Make the questions challenging for Year 7, with more multi-step reasoning and problem solving while staying within Year 7 content.":"Use a deliberate mix of easy, medium and hard Year 7 questions, increasing in challenge across the set.";
      const data=await generateJson(client,
        `Create UK ${year} Key Stage 3 maths practice. Return ONLY valid JSON: {"title":"Practice title","questions":[{"question":"question text","marks":1,"hint":"short hint"}]}. Exactly ${count} questions. ${difficultyInstruction} Use marks from 1 to 3. Do not include answers or solutions. Use British maths terminology and age-appropriate numbers. Avoid duplicate questions within the set. No markdown.`,
        `Create ${count} ${difficulty} practice questions for: ${topic}.`);
      return res.json({type:"maths-practice",year,topic,count,difficulty,...data});
    }

    if(action==="test"){
      const data=await generateJson(client,
        `Create a realistic UK ${year} Key Stage 3 maths assessment. Return ONLY valid JSON: {"title":"Assessment title","instructions":"Short exam instructions","durationMinutes":30,"questions":[{"question":"exam-style question","marks":2}]}. Exactly 10 questions and approximately 25-30 marks total. Include a balanced mix of straightforward fluency, multi-step reasoning and problem solving. Questions must be self-contained, unambiguous and suitable for Year 7. Do not include hints, answers or solutions. No multiple-choice unless genuinely appropriate. No markdown.`,
        `Create a formal Year 7 test focused on: ${topic}.`);
      return res.json({type:"maths-test",year,topic,...data});
    }

    if(action==="mark"){
      const questions=Array.isArray(req.body?.questions)?req.body.questions.slice(0,25):[];
      const responses=Array.isArray(req.body?.responses)?req.body.responses.slice(0,25):[];
      if(!questions.length) return res.status(400).json({error:"There is no maths work to mark."});
      const payload=questions.map((q,i)=>({index:i,question:String(q.question||"").slice(0,1000),marks:Math.max(1,Math.min(10,Number(q.marks)||1)),studentAnswer:String(responses[i]||"").slice(0,1000)}));
      const data=await generateJson(client,
        `You are marking UK Year 7 Key Stage 3 maths. Mark fairly and award method credit where the student's written answer shows valid progress. Blank answers score 0. Return ONLY valid JSON: {"items":[{"index":0,"awarded":0,"max":2,"feedback":"brief feedback","modelAnswer":"concise worked answer"}],"totalAwarded":0,"totalMarks":0,"percentage":0,"summary":"short overall feedback"}. awarded must be an integer from 0 to max. Include every submitted item exactly once in index order. No markdown.`,
        `Mark these questions and student answers:\n${JSON.stringify(payload)}`);
      return res.json({type:"maths-mark",...data});
    }

    return res.status(400).json({error:"Unknown maths action."});
  }catch(error){
    console.error("Maths error:",error);
    const message=error?.error?.message||error?.message||"Something went wrong in Maths.";
    res.status(error?.statusCode||500).json({error:message});
  }
});

app.post("/api/generate",requireUser,async(req,res)=>{
  try{
    const client=getUserOpenAIClient(req);
    const mode=String(req.body?.mode||"").toLowerCase();
    const topic=cleanTopic(req.body?.topic);
    if(!topic) return res.status(400).json({error:"Please enter a topic."});
    if(mode==="handwritten"){
      const image=await generateImage(client,`Create a beautiful educational handwritten notebook page about "${topic}". Genuine handwritten student revision notes on portrait ruled paper, neat blue and black ink, tasteful highlighter accents, hand-drawn arrows, boxes and underlines, and a small labelled educational sketch where useful. Include a clear title, simple definition, important keywords, key facts, short explanations and one memorable exam tip. Keep text moderate and readable. Accurate for a secondary-school learner. Show the notebook page only. No hands, desk, pens, people, typed document, PowerPoint or digital infographic.`);
      return res.json({type:"image",mode:"handwritten",image});
    }
    if(mode==="visualise"||mode==="visualize"){
      const image=await generateImage(client,`Create a clear educational visual explanation of "${topic}" for a secondary-school learner. Use a clean modern educational illustration with strong visual hierarchy, labelled diagrams, arrows showing relationships, simple icons and shapes, minimal useful text, portrait composition and one short takeaway. Prioritise accuracy and understanding. Not a notebook page and not a long text document.`);
      return res.json({type:"image",mode:"visualise",image});
    }
    if(mode==="mindmap"){
      const image=await generateImage(client,`Create a clear colourful educational mind map about "${topic}" for a secondary-school student. Put the topic in a central bubble, branch into 5-7 major ideas, then add concise labelled sub-branches with keywords, tiny icons and useful relationships. Portrait composition, readable text, clean white background, classroom revision aesthetic, strong colour coding, accurate content, no long paragraphs.`);
      return res.json({type:"image",mode:"mindmap",image});
    }
    if(mode==="quiz"){
      const data=await generateJson(client,`Create accurate secondary-school multiple-choice quizzes. Return ONLY valid JSON: {"title":"Quiz title","questions":[{"question":"Question text","options":["A","B","C","D"],"correctIndex":0,"explanation":"Short explanation"}]}. Exactly 5 questions, exactly 4 options each, one correct answer, plausible distractors, helpful explanations, no markdown.`,`Create a five-question quiz about "${topic}".`);
      return res.json({type:"quiz",mode:"quiz",...data});
    }
    if(mode==="flashcard"){
      const data=await generateJson(client,`Return ONLY valid JSON: {"title":"Flashcard title","cards":[{"front":"Question, term or prompt","back":"Answer or explanation"}]}. Exactly 8 educational flashcards, varied coverage, concise backs, suitable for secondary-school revision, no markdown.`,`Create eight useful flashcards about "${topic}".`);
      return res.json({type:"flashcards",mode:"flashcard",...data});
    }
    if(mode==="teachme"||mode==="eli5"){
      const level=mode==="eli5"?"Explain using very simple language, a familiar analogy and almost no jargon.":"Teach step by step, explaining terminology and building understanding.";
      const data=await generateJson(client,`You are a patient expert tutor for secondary-school learners. ${level} Return ONLY valid JSON: {"title":"Lesson title","overview":"Short introduction","sections":[{"heading":"Section heading","content":"Clear explanation"}],"example":{"heading":"Example","content":"Helpful example"},"checkQuestion":"Question","answer":"Answer","recap":["Point","Point","Point"]}. Use 3-5 sections and no markdown.`,`Teach me "${topic}".`);
      return res.json({type:"lesson",mode,...data});
    }
    if(mode==="notes"||mode==="cheatsheet"){
      const brief=mode==="cheatsheet"?"Make it extremely compact and scan-friendly like a one-page cheat sheet.":"Create high-quality revision notes.";
      const data=await generateJson(client,`${brief} Return ONLY valid JSON: {"title":"Title","summary":"Short summary","sections":[{"heading":"Heading","bullets":["Point"]}],"keywords":[{"term":"Keyword","meaning":"Meaning"}],"examTips":["Exam tip"]}. Use 3-5 sections, 3-5 bullets each, 4-8 keywords, 2-4 exam tips, accurate for secondary-school learners, no markdown.`,`Create ${mode==="cheatsheet"?"a cheat sheet":"revision notes"} about "${topic}".`);
      return res.json({type:"notes",mode,...data});
    }
    if(mode==="viva"){
      const data=await generateJson(client,`Create an oral-exam viva practice set. Return ONLY valid JSON: {"title":"Viva title","items":[{"question":"Oral question","answer":"Model answer","prompt":"Small hint"}]}. Exactly 6 items. Questions should progress from basic recall to explanation/application. Answers concise but complete. No markdown.`,`Create viva practice about "${topic}".`);
      return res.json({type:"viva",mode:"viva",...data});
    }
    if(mode==="socratic"){
      const data=await generateJson(client,`Create a Socratic learning path. Return ONLY valid JSON: {"title":"Title","steps":[{"question":"Thinking question","hint":"Hint","insight":"What the learner should realise"}],"finalTakeaway":"Short takeaway"}. Exactly 6 steps, ordered so each question builds on the last. Do not simply lecture; use questions to guide discovery. No markdown.`,`Guide a student to discover and understand "${topic}".`);
      return res.json({type:"socratic",mode:"socratic",...data});
    }
    if(mode==="timeline"){
      const data=await generateJson(client,`Create an educational timeline. Return ONLY valid JSON: {"title":"Timeline title","intro":"Short context","events":[{"date":"Date/period","title":"Event title","description":"Why it matters"}],"takeaway":"Overall takeaway"}. Use 6-10 chronological events. For non-historical topics, use stages in chronological/process order. No markdown.`,`Create a timeline for "${topic}".`);
      return res.json({type:"timeline",mode:"timeline",...data});
    }
    if(mode==="comparison"){
      const data=await generateJson(client,`Create a student-friendly comparison. Return ONLY valid JSON: {"title":"Comparison title","leftLabel":"Item A","rightLabel":"Item B","rows":[{"feature":"Feature","left":"A detail","right":"B detail"}],"summary":"Key difference"}. Use 5-8 useful comparison rows. If the topic contains one concept, compare two important subtypes or closely related concepts. No markdown.`,`Create a useful comparison for "${topic}".`);
      return res.json({type:"comparison",mode:"comparison",...data});
    }
    if(mode==="actionplan"){
      const data=await generateJson(client,`Create a practical student action plan. Return ONLY valid JSON: {"title":"Plan title","goal":"Clear goal","steps":[{"title":"Step title","detail":"What to do","time":"Suggested effort"}],"successCheck":"How the learner knows they are ready"}. Use 5-8 ordered steps, realistic for a student, no markdown.`,`Create a step-by-step learning or revision action plan for "${topic}".`);
      return res.json({type:"actionplan",mode:"actionplan",...data});
    }
    return res.status(400).json({error:"Unknown learning mode."});
  }catch(error){
    console.error("Generation error:",error);
    const message=error?.error?.message||error?.message||"Something went wrong while generating the result.";
    res.status(error?.statusCode||500).json({error:message});
  }
});

const forgotButton = '<button id="forgotPassword" type="button" style="background:transparent;border:0;color:#635bff;font-weight:800;cursor:pointer;padding:10px 4px">Forgot password?</button>';
const resetEnhancement = `
<style>#resetOverlay{position:fixed;inset:0;background:rgba(23,32,51,.55);display:none;align-items:center;justify-content:center;padding:18px;z-index:9999;backdrop-filter:blur(6px)}#resetOverlay.open{display:flex}#resetBox{width:min(460px,100%);background:white;border-radius:22px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.25)}#resetBox input{width:100%;border:1px solid rgba(92,111,154,.22);border-radius:14px;padding:13px;margin:8px 0}#resetBox .resetActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}</style>
<div id="resetOverlay"><div id="resetBox"><h2 style="margin-top:0">🔐 Choose a new password</h2><p style="color:#68738a">Enter a new password for your Learning Switchboard account.</p><input id="newPassword" type="password" placeholder="New password (minimum 6 characters)"><input id="confirmPassword" type="password" placeholder="Confirm new password"><div id="resetMessage" style="font-size:13px;color:#68738a;margin-top:5px"></div><div class="resetActions"><button id="updatePassword" class="primary">Update password</button><button id="cancelReset" class="secondary">Cancel</button></div></div></div>
<script>(function(){
function openReset(){document.getElementById('resetOverlay').classList.add('open')}
function closeReset(){document.getElementById('resetOverlay').classList.remove('open')}
var forgot=document.getElementById('forgotPassword');
if(forgot) forgot.onclick=async function(){var msg=document.getElementById('authMessage'),email=(document.getElementById('email').value||'').trim();if(!email){msg.textContent='Enter your email address first, then tap Forgot password.';return;}forgot.disabled=true;forgot.textContent='Sending reset email...';try{var r=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/'});if(r.error)throw r.error;msg.textContent='Password reset email sent. Open the link in your email to choose a new password.';}catch(e){msg.textContent=e.message||'Could not send password reset email.';}finally{forgot.disabled=false;forgot.textContent='Forgot password?';}};
var poll=setInterval(function(){try{if(typeof sb!=='undefined'&&sb){clearInterval(poll);sb.auth.onAuthStateChange(function(event){if(event==='PASSWORD_RECOVERY')openReset();});}}catch(_){ }},100);
document.getElementById('cancelReset').onclick=closeReset;
document.getElementById('updatePassword').onclick=async function(){var p=document.getElementById('newPassword').value,c=document.getElementById('confirmPassword').value,m=document.getElementById('resetMessage');if(p.length<6){m.textContent='Password must be at least 6 characters.';return;}if(p!==c){m.textContent='The passwords do not match.';return;}this.disabled=true;m.textContent='Updating password...';try{var r=await sb.auth.updateUser({password:p});if(r.error)throw r.error;m.textContent='Password updated successfully.';setTimeout(closeReset,900);}catch(e){m.textContent=e.message||'Could not update password.';}finally{this.disabled=false;}};
})();</script>`;

const mathsEnhancement = `
<style>
#mathsView{margin-top:18px}.maths-hero{background:linear-gradient(135deg,#0f766e,#2563eb);color:white;border-radius:28px;padding:24px;box-shadow:0 20px 60px rgba(37,99,235,.18)}.maths-hero h2{margin:0 0 8px;font-size:clamp(26px,4vw,38px)}.maths-year{display:inline-flex;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);padding:7px 11px;border-radius:999px;font-weight:850;margin-top:12px}.maths-layout{display:grid;grid-template-columns:1fr 1.4fr;gap:16px;margin-top:18px}.maths-panel{background:rgba(255,255,255,.9);border:1px solid rgba(92,111,154,.16);border-radius:22px;padding:18px;box-shadow:0 14px 36px rgba(58,72,130,.09)}.maths-panel h3{margin-top:0}.maths-groups{display:grid;gap:12px}.maths-group{border:1px solid rgba(92,111,154,.16);border-radius:16px;padding:12px}.maths-group b{display:block;margin-bottom:8px}.maths-topics{display:flex;gap:7px;flex-wrap:wrap}.maths-topic{border:1px solid rgba(92,111,154,.18);background:#f8fafc;border-radius:999px;padding:8px 10px;cursor:pointer;font-weight:700;font-size:13px}.maths-topic.active{background:#172033;color:white}.maths-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.maths-action{border:0;border-radius:12px;padding:11px 14px;font-weight:850;cursor:pointer;background:#eef2ff;color:#334155}.maths-action.active{background:#172033;color:white}.maths-settings{display:flex;gap:10px;flex-wrap:wrap;padding:12px;background:#f8fafc;border:1px solid rgba(92,111,154,.14);border-radius:14px;margin:10px 0 14px}.maths-setting{display:flex;flex-direction:column;gap:5px;min-width:150px}.maths-setting label{font-size:12px;font-weight:850;color:#64748b}.maths-setting select{border:1px solid rgba(92,111,154,.22);border-radius:11px;padding:10px;background:white}.maths-question{border:1px solid rgba(92,111,154,.16);border-radius:15px;padding:14px;margin:10px 0;background:white}.maths-question textarea,.maths-question input{width:100%;border:1px solid rgba(92,111,154,.2);border-radius:12px;padding:11px;margin-top:10px}.maths-mark{font-size:12px;font-weight:800;color:#64748b}.maths-feedback{background:#f8fafc;border-radius:12px;padding:10px;margin-top:9px}.maths-score{font-size:28px;font-weight:900;color:#2563eb}.maths-timer{font-weight:900;background:#fff7ed;padding:8px 11px;border-radius:999px;display:inline-block}.maths-example{background:#f8fafc;border:1px solid rgba(92,111,154,.14);padding:14px;border-radius:15px;margin:10px 0}.maths-example ol{margin-bottom:0}.maths-loading{display:flex;gap:10px;align-items:center;color:#68738a}.maths-note{font-size:13px;color:#68738a;line-height:1.5}.maths-result{margin-top:14px}@media(max-width:820px){.maths-layout{grid-template-columns:1fr}}
</style>
<script>(function(){
const groups={
  'Number':['Place value & integers','Negative numbers','Factors, multiples & primes','Fractions','Decimals & percentages','Order of operations'],
  'Algebra':['Algebra notation & substitution','Simplifying expressions','Sequences','Solving one-step equations','Coordinates & straight-line graphs'],
  'Ratio & proportion':['Ratio','Direct proportion','Fractions, decimals & percentages connections'],
  'Geometry & measures':['Angles','Perimeter & area','Units & measures','Transformations & symmetry','Coordinates','Constructions'],
  'Probability':['Probability scale','Simple probability experiments'],
  'Statistics':['Averages','Tables & charts','Interpreting data']
};
let selectedTopic='Place value & integers', mathsMode='learn', currentPaper=null, timerHandle=null, secondsLeft=0;
const nav=document.querySelector('.nav');
if(nav&&!document.getElementById('mathsTab')){const b=document.createElement('button');b.id='mathsTab';b.className='secondary';b.textContent='➗ Maths';nav.insertBefore(b,document.getElementById('signOut'));}
const shell=document.querySelector('.shell');
const section=document.createElement('section');section.id='mathsView';section.className='hidden';
section.innerHTML='<div class="maths-hero"><h2>➗ Maths Learning Centre</h2><p>Learn a concept, practise it step by step, or sit a timed test.</p><span class="maths-year">Year 7 • UK Key Stage 3 aligned</span></div><div class="maths-layout"><div class="maths-panel"><h3>Choose a Year 7 topic</h3><p class="maths-note">Schools may teach these in a different order, but they follow the main KS3 strands.</p><div id="mathsGroups" class="maths-groups"></div></div><div class="maths-panel"><div id="mathsChosen" style="font-size:13px;color:#68738a;font-weight:800">Selected topic</div><h2 id="mathsTopicTitle" style="margin-top:5px">Place value & integers</h2><div class="maths-actions"><button class="maths-action active" data-mathsmode="learn">📘 Learn</button><button class="maths-action" data-mathsmode="practice">✏️ Practice</button><button class="maths-action" data-mathsmode="test">🧪 Real Test</button></div><p id="mathsModeHelp" class="maths-note">A guided lesson with worked examples and quick checks.</p><div id="mathsPracticeSettings" class="maths-settings hidden"><div class="maths-setting"><label for="mathsQuestionCount">Number of questions</label><select id="mathsQuestionCount"><option value="5">5</option><option value="10" selected>10</option><option value="15">15</option><option value="20">20</option><option value="25">25</option></select></div><div class="maths-setting"><label for="mathsDifficulty">Difficulty</label><select id="mathsDifficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="mixed" selected>Mixed</option></select></div></div><button id="mathsStart" class="primary">Start Learn</button><div id="mathsResult" class="maths-result"></div></div></div>';
shell.appendChild(section);
const groupsHost=document.getElementById('mathsGroups');
function drawTopics(){groupsHost.innerHTML=Object.entries(groups).map(([g,topics])=>'<div class="maths-group"><b>'+g+'</b><div class="maths-topics">'+topics.map(t=>'<button class="maths-topic'+(t===selectedTopic?' active':'')+'" data-topic="'+t.replace(/"/g,'&quot;')+'">'+t+'</button>').join('')+'</div></div>').join('');groupsHost.querySelectorAll('.maths-topic').forEach(b=>b.onclick=()=>{selectedTopic=b.dataset.topic;document.getElementById('mathsTopicTitle').textContent=selectedTopic;drawTopics();document.getElementById('mathsResult').innerHTML='';currentPaper=null;});}
drawTopics();
function openMaths(){document.getElementById('learnView').classList.add('hidden');document.getElementById('libraryView').classList.add('hidden');section.classList.remove('hidden');document.getElementById('learnTab').className='secondary';document.getElementById('libraryTab').className='secondary';document.getElementById('mathsTab').className='primary';window.scrollTo({top:0,behavior:'smooth'});}
function closeMaths(){section.classList.add('hidden');const m=document.getElementById('mathsTab');if(m)m.className='secondary';if(timerHandle){clearInterval(timerHandle);timerHandle=null;}}
document.getElementById('mathsTab').onclick=openMaths;document.getElementById('learnTab').addEventListener('click',closeMaths);document.getElementById('libraryTab').addEventListener('click',closeMaths);
const help={learn:'A guided lesson with worked examples and quick checks.',practice:'Choose 5, 10, 15, 20 or 25 questions and set Easy, Medium, Hard or Mixed difficulty.',test:'A timed 30-minute exam-style paper. No hints until you submit.'};
document.querySelectorAll('.maths-action').forEach(b=>b.onclick=()=>{document.querySelectorAll('.maths-action').forEach(x=>x.classList.remove('active'));b.classList.add('active');mathsMode=b.dataset.mathsmode;document.getElementById('mathsModeHelp').textContent=help[mathsMode];document.getElementById('mathsPracticeSettings').classList.toggle('hidden',mathsMode!=='practice');document.getElementById('mathsStart').textContent=mathsMode==='learn'?'Start Learn':mathsMode==='practice'?'Start Practice':'Start Real Test';document.getElementById('mathsResult').innerHTML='';currentPaper=null;});
function apiKey(){return sessionStorage.getItem('userOpenAIKey')||'';}
async function mathsFetch(body){if(!session)throw new Error('Please sign in first.');const key=apiKey();if(!key)throw new Error('Add your OpenAI API key above first.');const r=await fetch('/api/maths',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'x-openai-key':key},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Maths request failed');return d;}
function safe(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
function renderLearn(d){const h=document.getElementById('mathsResult');h.innerHTML='<h2>'+safe(d.title||selectedTopic)+'</h2><p>'+safe(d.overview||'')+'</p><h3>Key ideas</h3><ul>'+(d.keyIdeas||[]).map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul><h3>Worked examples</h3>'+(d.workedExamples||[]).map((x,i)=>'<div class="maths-example"><b>Example '+(i+1)+': '+safe(x.question)+'</b><ol>'+(x.steps||[]).map(s=>'<li>'+safe(s)+'</li>').join('')+'</ol><div class="maths-feedback"><b>Answer:</b> '+safe(x.answer)+'</div></div>').join('')+'<h3>Common mistakes</h3><ul>'+(d.commonMistakes||[]).map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul><h3>Quick check</h3>'+(d.quickCheck||[]).map((q,i)=>'<div class="maths-question"><b>'+(i+1)+'. '+safe(q.question)+'</b><button class="secondary mathsReveal" data-a="'+encodeURIComponent(q.answer||'')+'" style="margin-top:9px">Reveal answer</button><div class="maths-feedback hidden"></div></div>').join('');h.querySelectorAll('.mathsReveal').forEach(b=>b.onclick=()=>{const box=b.nextElementSibling;box.textContent='Answer: '+decodeURIComponent(b.dataset.a);box.classList.remove('hidden');b.classList.add('hidden');});}
function renderPaper(d,isTest){currentPaper=d;const h=document.getElementById('mathsResult'),qs=d.questions||[];let head='<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h2 style="margin:0">'+safe(d.title||selectedTopic)+'</h2>'+(isTest?'<span id="mathsTimer" class="maths-timer">30:00</span>':'')+'</div>';if(!isTest&&d.difficulty)head+='<p class="maths-note">'+safe(String(d.difficulty).charAt(0).toUpperCase()+String(d.difficulty).slice(1))+' difficulty • '+qs.length+' questions</p>';if(isTest&&d.instructions)head+='<p class="maths-note">'+safe(d.instructions)+'</p>';h.innerHTML=head+qs.map((q,i)=>'<div class="maths-question"><div class="maths-mark">Question '+(i+1)+' • '+(q.marks||1)+' mark'+((q.marks||1)===1?'':'s')+'</div><b>'+safe(q.question)+'</b>'+(!isTest&&q.hint?'<div><button class="secondary mathsHint" data-i="'+i+'" style="margin-top:9px">Hint</button><div class="maths-feedback hidden" id="mh-'+i+'">'+safe(q.hint)+'</div></div>':'')+'<textarea rows="3" class="mathsAnswer" data-i="'+i+'" placeholder="Write your answer and working here..."></textarea><div id="mf-'+i+'"></div></div>').join('')+'<button id="mathsSubmit" class="primary">'+(isTest?'Submit Test':'Check Practice')+'</button><div id="mathsScoreBox" style="margin-top:14px"></div>';h.querySelectorAll('.mathsHint').forEach(b=>b.onclick=()=>document.getElementById('mh-'+b.dataset.i).classList.toggle('hidden'));document.getElementById('mathsSubmit').onclick=()=>markPaper(isTest);if(isTest)startTimer(Number(d.durationMinutes)||30);}
function startTimer(minutes){if(timerHandle)clearInterval(timerHandle);secondsLeft=minutes*60;const el=document.getElementById('mathsTimer');function tick(){if(!el)return;const m=Math.floor(secondsLeft/60),s=secondsLeft%60;el.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');if(secondsLeft<=0){clearInterval(timerHandle);timerHandle=null;const btn=document.getElementById('mathsSubmit');if(btn){btn.textContent='Time up — submit test';}}else secondsLeft--;}tick();timerHandle=setInterval(tick,1000);}
async function markPaper(isTest){try{if(!currentPaper)return;const qs=currentPaper.questions||[],responses=Array.from(document.querySelectorAll('.mathsAnswer')).map(x=>x.value);const btn=document.getElementById('mathsSubmit');btn.disabled=true;btn.textContent='Marking...';if(timerHandle){clearInterval(timerHandle);timerHandle=null;}const result=await mathsFetch({action:'mark',questions:qs,responses});(result.items||[]).forEach(item=>{const box=document.getElementById('mf-'+item.index);if(box)box.innerHTML='<div class="maths-feedback"><b>'+item.awarded+'/'+item.max+' marks</b><br>'+safe(item.feedback||'')+'<br><br><b>Model answer:</b> '+safe(item.modelAnswer||'')+'</div>';});document.getElementById('mathsScoreBox').innerHTML='<div class="maths-score">'+(result.totalAwarded||0)+' / '+(result.totalMarks||0)+' • '+(result.percentage||0)+'%</div><div class="maths-feedback">'+safe(result.summary||'')+'</div>';btn.textContent=isTest?'Test submitted':'Practice checked';}catch(e){document.getElementById('mathsScoreBox').innerHTML='<div class="error">'+safe(e.message)+'</div>';const btn=document.getElementById('mathsSubmit');if(btn){btn.disabled=false;btn.textContent=isTest?'Submit Test':'Check Practice';}}}
document.getElementById('mathsStart').onclick=async function(){const h=document.getElementById('mathsResult');h.innerHTML='<div class="maths-loading"><div class="spinner"></div>Preparing '+safe(mathsMode)+' for '+safe(selectedTopic)+'...</div>';this.disabled=true;try{const body={action:mathsMode,topic:selectedTopic};if(mathsMode==='practice'){body.count=Number(document.getElementById('mathsQuestionCount').value)||10;body.difficulty=document.getElementById('mathsDifficulty').value||'mixed';}const d=await mathsFetch(body);if(mathsMode==='learn')renderLearn(d);else renderPaper(d,mathsMode==='test');}catch(e){h.innerHTML='<div class="error">'+safe(e.message)+'</div>';}finally{this.disabled=false;}};
})();</script>`;

function sendApp(_req,res){
  try{
    let html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
    html=html.replace('<button id="signUp" class="secondary">Create account</button></div>','<button id="signUp" class="secondary">Create account</button>'+forgotButton+'</div>');
    html=html.replace("</body>",resetEnhancement+mathsEnhancement+"</body>");
    res.type("html").send(html);
  }catch(error){console.error("App shell error:",error);res.status(500).send("Unable to load the app.");}
}
app.get("/",sendApp);
app.get("/index.html",sendApp);
app.get("*",sendApp);
app.listen(PORT,"0.0.0.0",()=>console.log(`AI Learning Switchboard v2.5.1 running on port ${PORT}`));