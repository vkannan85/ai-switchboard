const fs = require('fs');
const path = require('path');

const originalReadFileSync = fs.readFileSync.bind(fs);

const gateCss = `
<style id="auth-gate-style">
body:not(.authenticated) .nav,
body:not(.authenticated) .hero,
body:not(.authenticated) #keyCard,
body:not(.authenticated) #studentStrip,
body:not(.authenticated) #learnView,
body:not(.authenticated) #libraryView,
body:not(.authenticated) #mathsView,
body:not(.authenticated) .brand p,
body:not(.authenticated) .badge { display:none !important; }
body:not(.authenticated) .topbar { justify-content:center; padding-top:12vh; }
body:not(.authenticated) .brand { width:100%; text-align:center; }
body:not(.authenticated) .brand h1 { font-size:clamp(34px,6vw,58px); }
body:not(.authenticated) #authCard { max-width:520px; margin:28px auto 0; padding:28px; }
body:not(.authenticated) #authCard > h2,
body:not(.authenticated) #authCard > p.helper,
body:not(.authenticated) #signUp,
body:not(.authenticated) #forgotPassword { display:none !important; }
body:not(.authenticated) #authCard .form-grid { grid-template-columns:1fr; gap:12px; }
body:not(.authenticated) #authCard #signIn { width:100%; margin-top:2px; }
body:not(.authenticated) #authMessage:empty { display:none; }
@media(max-width:820px){
  body:not(.authenticated) .topbar { padding-top:8vh; }
  body:not(.authenticated) #authCard { margin-top:22px; }
}
</style>`;

const gateScript = `
<script id="auth-gate-script">
(function(){
  function syncAuthGate(){
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
      let html = result;
      if(!html.includes('auth-gate-style')) html = html.replace('</head>', gateCss + '\n</head>');
      if(!html.includes('auth-gate-script')) html = html.replace('</body>', gateScript + '\n</body>');
      return html;
    }
  } catch(_) {}
  return result;
};
