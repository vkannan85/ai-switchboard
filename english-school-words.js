const fs=require('fs');
const original=fs.readFileSync.bind(fs);
const enhancement=`<script id="english-school-words-script">(function(){
const SCHOOL_WEEKS={
1:['context','trenches','predict','prediction','commandments','geography','physical','recycling','sustainability','design'],
2:['gradual','mesmerised','belfry','altar','private','sustainable','continent','technology','tenon','timber'],
3:['peaceful','sneering','defiance','poach','aeroplane','country','multicultural','try square','hardwood','softwood'],
4:['sentimental','adoration','frantic','frantically','propaganda','diversity','settlement','isometric','semibreve','rhythm'],
5:['respect','tension','drama','describe','description','deforestation','sketch','pace','chord','pitch'],
6:['coward','cowardice','military','injustice','conflict','refine','tertiary','characterisation','proxemics','devising'],
7:['patriot','patriotic','patriotism','recruit','recruitment','colour','texture','volume','pitch','tone'],
8:['remember','remembrance','Armistice','author','writer','graduated','printmaking','bacteria','enzymic','conduction'],
9:['pointillism','detail','photomontage','convection','radiation','hygiene','safety','measure','weigh','cross-contamination'],
10:['crotchet','quaver','decrepit','desolate','denigrate','derelict','demean','depravity','deride','deprivation']};
const WEEK1=new Date(2026,8,7); // Monday 7 September 2026
function schoolInfo(dateStr){const p=dateStr.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2]);d.setHours(0,0,0,0);const days=Math.floor((d-WEEK1)/86400000),week=Math.floor(days/7)+1,dow=(d.getDay()+6)%7;if(week<1||week>10||dow>4)return null;const words=SCHOOL_WEEKS[week].slice(dow*2,dow*2+2);return{week,words};}
window.__schoolVocabularyWeeks=SCHOOL_WEEKS;window.__schoolVocabularyForDate=schoolInfo;
})();</script>`;
fs.readFileSync=function(filePath,options){const data=original(filePath,options);try{if(String(filePath).endsWith('index.html')){const isBuf=Buffer.isBuffer(data);let html=isBuf?data.toString('utf8'):String(data);if(!html.includes('english-school-words-script'))html=html.replace('</body>',enhancement+'\\n</body>');
// Make Daily 5 request include the two school words assigned to that weekday.
html=html.replace("const d=await api({action:'daily-vocab',avoid:(hist.data||[]).map(x=>x.word)});","const school=window.__schoolVocabularyForDate?window.__schoolVocabularyForDate(today):null;const d=await api({action:'daily-vocab',avoid:(hist.data||[]).map(x=>x.word),schoolWords:school?school.words:[]});");
// Label school words in the history card when they match that day's assignment.
html=html.replace("const words=rows.map(wordObj);content.innerHTML=", "const words=rows.map(wordObj);const school=window.__schoolVocabularyForDate?window.__schoolVocabularyForDate(date):null;const schoolSet=new Set((school?.words||[]).map(x=>x.toLowerCase()));content.innerHTML=");
html=html.replace("esc(w.word)+'</b><p>'+esc(w.meaning)","esc(w.word)+(schoolSet.has(String(w.word).toLowerCase())?' <span style=\\\"font-size:11px;background:#dbeafe;color:#1d4ed8;padding:3px 6px;border-radius:999px\\\">School</span>':'')+'</b><p>'+esc(w.meaning)");
return isBuf?Buffer.from(html,'utf8'):html;}}catch(e){console.error('School vocabulary injection error:',e);}return data;};
`;
module.exports={SCHOOL_WEEKS:{}};
