const fs = require('fs');
const originalReadFileSyncWeeklyFix = fs.readFileSync.bind(fs);
const weeklyFix = `
<script id="english-vocab-weekly-fix">(function(){
function clean(){const b=document.getElementById('weekFlash');if(b){b.remove();}}
const observer=new MutationObserver(clean);observer.observe(document.documentElement,{childList:true,subtree:true});clean();
})();</script>`;
fs.readFileSync=function(filePath,options){const data=originalReadFileSyncWeeklyFix(filePath,options);try{if(require('path').basename(String(filePath))==='index.html'){const isBuffer=Buffer.isBuffer(data);let html=isBuffer?data.toString('utf8'):String(data);if(!html.includes('english-vocab-weekly-fix'))html=html.replace('</body>',weeklyFix+'\n</body>');return isBuffer?Buffer.from(html):html;}}catch(e){console.error('Weekly vocabulary UI fix:',e);}return data;};
