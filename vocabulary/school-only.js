// Restrict WordQuest to the 100 scheduled school vocabulary entries only.
(function(){
 const keys=new Set(Object.values(SCHOOL).flat().map(w=>w.toLowerCase()));
 const baseFallback=fallback;
 getWords=function(date,count=dailyCount){
   const saved=rows.filter(r=>r.study_date===date&&keys.has(String(r.word).toLowerCase()));
   const byWord=new Map(saved.map(r=>[String(r.word).toLowerCase(),r]));
   return schoolWords(date).map(w=>byWord.get(w.toLowerCase())||baseFallback(w));
 };
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
 dailyMission=function(date){
   const reviews=reviewDue(date),reviewCap=Math.min(reviews.length,Math.max(2,Math.round(dailyCount*.4))),memory=reviews.slice(0,reviewCap),fresh=getWords(date).filter(x=>!memory.some(m=>m.word.toLowerCase()===x.word.toLowerCase()));
   return {memory,fresh,all:[...memory,...fresh]};
 };
})();