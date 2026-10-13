(() => {
const languageButton = document.getElementById('portal-language');
function setLanguage(lang) {
 document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr';
 document.querySelectorAll('[data-ar][data-en]').forEach(el=>el.textContent=el.dataset[lang]);
 languageButton.textContent=lang==='ar'?'English':'العربية';
 try {localStorage.setItem('roots-language',lang);}catch(_){}
}
let lang='ar';try{lang=localStorage.getItem('roots-language')==='en'?'en':'ar';}catch(_){}setLanguage(lang);
languageButton.addEventListener('click',()=>setLanguage(document.documentElement.lang==='ar'?'en':'ar'));
const login=document.getElementById('login-panel'),journey=document.getElementById('dashboard-panel');
document.getElementById('staff-login').addEventListener('submit',event=>{event.preventDefault();document.getElementById('password').value='';document.getElementById('login-status').hidden=false;});
document.getElementById('preview-entry')?.addEventListener('click',()=>{document.getElementById('staff-login').reset();login.hidden=true;journey.hidden=false;journey.focus();window.scrollTo(0,0);});
document.getElementById('preview-exit').addEventListener('click',()=>{journey.hidden=true;login.hidden=false;document.getElementById('preview-entry')?.focus();window.scrollTo(0,0);});
document.querySelectorAll('[data-editor]').forEach(button=>button.addEventListener('click',()=>{
 const panel=document.getElementById('editor-panel');
 document.getElementById('editor-title').textContent=button.closest('article').querySelector('h2').textContent;
 panel.hidden=false;document.getElementById('preview-note').focus();
}));
document.getElementById('editor-close').addEventListener('click',()=>{document.getElementById('preview-note').value='';document.getElementById('editor-panel').hidden=true;});
})();