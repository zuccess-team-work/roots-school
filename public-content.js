(() => {
 const cfg=window.ROOTS_AUTH;
 if(!cfg)return;
 fetch(cfg.url+'/rest/v1/site_content?id=eq.website&select=content',{headers:{apikey:cfg.publishableKey}}).then(r=>r.ok?r.json():[]).then(rows=>{
  const content=rows[0]?.content||{};
  document.querySelectorAll('[data-content-key]').forEach(el=>{
   const value=content[el.dataset.contentKey];
   if(!value||typeof value.ar!=='string'||typeof value.en!=='string')return;
   el.dataset.ar=value.ar;el.dataset.en=value.en;el.textContent=value[document.documentElement.lang==='ar'?'ar':'en'];
  });
 }).catch(()=>{});
})();
