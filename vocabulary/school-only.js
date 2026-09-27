// WordQuest canonical school-only learning source: 100 scheduled entries, 5 per learning day.
(function(){
 const keys=new Set(Object.values(SCHOOL).flat().map(w=>w.toLowerCase()));
 const baseFallback=fallback;
 const START='2026-09-07';
 const SCHOOL_DAYS=[];
 Object.keys(SCHOOL).sort((a,b)=>Number(a)-Number(b)).forEach(week=>{
   const words=SCHOOL[week];
   for(let half=0;half<2;half++){
     const d=dateObj(START); d.setDate(d.getDate()+(Number(week)-1)*7+half);
     SCHOOL_DAYS.push({date:iso(d),words:words.slice(half*5,half*5+5)});
   }
 });
 function wordsForLearningDate(date){
   const exact=SCHOOL_DAYS.find(x=>x.date===date);
   if(exact)return exact.words;
   const prior=[...SCHOOL_DAYS].reverse().find(x=>x.date<=date);
   return prior?prior.words:[];
 }
 function hydrate(date){
   const scheduled=wordsForLearningDate(date);
   const saved=rows.filter(r=>r.study_date===date&&keys.has(String(r.word).toLowerCase()));
   const byWord=new Map(saved.map(r=>[String(r.word).toLowerCase(),r]));
   return scheduled.map(w=>byWord.get(w.toLowerCase())||baseFallback(w)).slice(0,5);
 }
 schoolWords=function(date){return wordsForLearningDate(date).slice(0,5)};
 schoolSet=function(date){return new Set(wordsForLearningDate(date).map(x=>x.toLowerCase()))};
 getWords=function(date,count=5){return hydrate(date).slice(0,5)};
 reviewDue=function(date){
   const map=new Map();
   rows.filter(r=>keys.has(String(r.word).toLowerCase())).forEach(r=>{
     const age=daysBetween(r.study_date,date),stage=reviewStage(age);
     if(stage&&[2,4,7,14,30].includes(age)){
       const k=String(r.word).toLowerCase();
       if(!map.has(k))map.set(k,{...r,reviewAge:age,reviewStage:stage});
     }
   });
   return [...map.values()];
 };
 // The dated vocabulary page is always exactly the five scheduled words.
 // Memory Boost is kept separate so it cannot replace or change those five.
 dailyMission=function(date){
   const fresh=hydrate(date),memory=reviewDue(date).filter(r=>!fresh.some(f=>f.word.toLowerCase()===r.word.toLowerCase())).slice(0,2);
   return {memory,fresh,all:fresh};
 };
 // Flashcards must mirror the currently selected date, not today's date.
 const originalRender=render;
 render=function(){
   const oldIso=iso;
   if(view==='cards'){
     const chosen=selectedDate||oldIso();
     iso=function(d){if(arguments.length===0)return chosen;return oldIso(d)};
     try{return originalRender()}finally{iso=oldIso}
   }
   return originalRender();
 };
 dailyCount=5;
 localStorage.setItem('vocabCount','5');
})();