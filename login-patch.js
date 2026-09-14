const fs = require('fs');
const path = require('path');

const originalReadFileSync = fs.readFileSync.bind(fs);

const gateCss = `
<style id="auth-gate-style">
body:not(.authenticated){
  background:
    radial-gradient(circle at 12% 18%,rgba(255,203,85,.42) 0 90px,transparent 91px),
    radial-gradient(circle at 88% 20%,rgba(99,91,255,.22) 0 120px,transparent 121px),
    radial-gradient(circle at 82% 86%,rgba(22,184,166,.20) 0 110px,transparent 111px),
    linear-gradient(135deg,#eef8ff 0%,#f8f1ff 52%,#fff7df 100%);
  overflow-x:hidden;
}
body:not(.authenticated) .nav,
body:not(.authenticated) .hero,
body:not(.authenticated) #keyCard,
body:not(.authenticated) #studentStrip,
body:not(.authenticated) #learnView,
body:not(.authenticated) #libraryView,
body:not(.authenticated) #mathsView,
body:not(.authenticated) .brand p,
body:not(.authenticated) .badge { display:none !important; }
body:not(.authenticated) .shell{position:relative;min-height:100vh;overflow:hidden;}
body:not(.authenticated) .shell:before,
body:not(.authenticated) .shell:after{
  position:fixed;pointer-events:none;z-index:-1;font-size:clamp(46px,7vw,88px);filter:drop-shadow(0 12px 18px rgba(64,75,120,.12));
}
body:not(.authenticated) .shell:before{content:'📚  ✏️';left:5vw;bottom:10vh;transform:rotate(-8deg);}
body:not(.authenticated) .shell:after{content:'🧠  ➗  🔬';right:4vw;top:9vh;transform:rotate(7deg);}
body:not(.authenticated) .topbar { justify-content:center; padding-top:10vh; }
body:not(.authenticated) .brand { width:100%; text-align:center; position:relative; }
body:not(.authenticated) .brand:before{content:'🎒';display:block;font-size:64px;margin-bottom:10px;animation:hubBob 2.6s ease-in-out infinite;}
body:not(.authenticated) .brand h1 {
  font-size:clamp(38px,7vw,66px);letter-spacing:-2px;
  background:linear-gradient(135deg,#4f46e5,#7c3aed 48%,#0ea5a5);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  text-shadow:0 8px 30px rgba(99,91,255,.10);
}
body:not(.authenticated) #authCard {
  max-width:500px;margin:28px auto 0;padding:32px;border-radius:30px;
  background:rgba(255,255,255,.94);border:3px solid rgba(255,255,255,.95);
  box-shadow:0 28px 70px rgba(66,76,130,.18),0 0 0 1px rgba(99,91,255,.08);
  position:relative;overflow:visible;
}
body:not(.authenticated) #authCard:before{
  content:'⭐';position:absolute;left:-22px;top:-24px;font-size:42px;transform:rotate(-14deg);
  filter:drop-shadow(0 7px 10px rgba(62,76,130,.14));
}
body:not(.authenticated) #authCard:after{
  content:'📐';position:absolute;right:-22px;bottom:-24px;font-size:44px;transform:rotate(12deg);
  filter:drop-shadow(0 7px 10px rgba(62,76,130,.14));
}
body:not(.authenticated) #authCard > h2,
body:not(.authenticated) #authCard > p.helper,
body:not(.authenticated) #signUp,
body:not(.authenticated) #forgotPassword { display:none !important; }
body:not(.authenticated) #authCard .form-grid { grid-template-columns:1fr; gap:14px; }
body:not(.authenticated) #authCard input{
  min-height:56px;border:2px solid #e4e7f4;border-radius:18px;padding:15px 17px;
  background:#fbfcff;font-size:16px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8);
}
body:not(.authenticated) #authCard input:focus{border-color:#8b83ff;box-shadow:0 0 0 5px rgba(99,91,255,.10);}
body:not(.authenticated) #authCard #signIn {
  width:100%;min-height:54px;margin-top:4px;border-radius:17px;font-size:17px;
  background:linear-gradient(135deg,#635bff,#8b5cf6 55%,#35b7c8);
  box-shadow:0 12px 25px rgba(99,91,255,.27);
}
body:not(.authenticated) #authCard #signIn:hover{transform:translateY(-2px) scale(1.01);}
body:not(.authenticated) #authMessage{font-weight:700;text-align:center;}
body:not(.authenticated) #authMessage:empty { display:none; }
@keyframes hubBob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-7px) rotate(3deg)}}
@media(max-width:820px){
  body:not(.authenticated) .topbar { padding-top:7vh; }
  body:not(.authenticated) #authCard { margin:22px 10px 0;padding:25px 20px; }
  body:not(.authenticated) .shell:before{left:-18px;bottom:7vh;font-size:42px;}
  body:not(.authenticated) .shell:after{right:-26px;top:5vh;font-size:40px;}
  body:not(.authenticated) .brand:before{font-size:54px;}
}
</style>`;

const gateScript = `
<script id="auth-gate-script">
(function(){
  document.title=document.title.replace(/AI Learning Switchboard/g,'AI Learning Hub');
  function renameBrand(){
    var heading=document.querySelector('.brand h1');
    if(heading){
      for(var i=0;i<heading.childNodes.length;i++){
        var n=heading.childNodes[i];
        if(n.nodeType===3 && n.nodeValue.indexOf('AI Learning Switchboard')>=0){n.nodeValue=n.nodeValue.replace('AI Learning Switchboard','AI Learning Hub');}
      }
    }
  }
  function syncAuthGate(){
    renameBrand();
    var card=document.getElementById('authCard');
    var signedIn=!!card && card.classList.contains('hidden');
    document.body.classList.toggle('authenticated',signedIn);
    if(!signedIn){
      var maths=document.getElementById('mathsView');
      if(maths) maths.classList.add('hidden');
      var lib=document.getElementById('libraryView');
      if(lib) lib.classList.add('hidden');
    }
  }
  function start(){
    syncAuthGate();
    var card=document.getElementById('authCard');
    if(card){ new MutationObserver(syncAuthGate).observe(card,{attributes:true,attributeFilter:['class']}); }
    document.addEventListener('visibilitychange',syncAuthGate);
    setTimeout(syncAuthGate,50);
    setTimeout(syncAuthGate,500);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
</script>`;

fs.readFileSync = function(file, options){
  const result = originalReadFileSync(file, options);
  try {
    const isIndex = typeof file === 'string' && path.basename(file) === 'index.html';
    const wantsText = typeof result === 'string';
    if(isIndex && wantsText){
      let html = result.replace(/AI Learning Switchboard/g,'AI Learning Hub');
      if(!html.includes('auth-gate-style')) html = html.replace('</head>', gateCss + '\n</head>');
      if(!html.includes('auth-gate-script')) html = html.replace('</body>', gateScript + '\n</body>');
      return html;
    }
  } catch(_) {}
  return result;
};
