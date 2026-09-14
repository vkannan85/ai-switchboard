require("dotenv").config();
const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = "https://rikeknoqjmnxkgfutmpy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NfbRUCQo1cb0rMmJ1pHcaA_AsuubptW";

app.use(express.json({ limit: "2mb" }));
app.use(express.static(__dirname));

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

app.get("*",(_req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log(`AI Learning Switchboard v2.2 running on port ${PORT}`));
