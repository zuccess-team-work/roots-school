(()=>{'use strict';
const ar=()=>document.documentElement.lang==='ar';
const viewer=document.createElement('dialog');viewer.className='album-viewer';viewer.setAttribute('aria-label','معرض صور المدرسة');
const bar=document.createElement('div');bar.className='album-bar';const caption=document.createElement('p');caption.id='album-caption';viewer.setAttribute('aria-labelledby',caption.id);const close=document.createElement('button');close.type='button';close.className='album-close';close.textContent='×';close.setAttribute('aria-label','إغلاق المعرض');bar.append(caption,close);
const canvas=document.createElement('div');canvas.className='album-canvas';const footer=document.createElement('div');footer.className='album-footer';footer.dir='ltr';const prev=document.createElement('button'),next=document.createElement('button'),position=document.createElement('span');for(const b of [prev,next]){b.type='button';b.className='album-arrow';}prev.textContent='‹';next.textContent='›';prev.setAttribute('aria-label','السابق');next.setAttribute('aria-label','التالي');position.className='album-position';footer.append(prev,position,next);viewer.append(bar,canvas,footer);document.body.append(viewer);
let active=null,lastFocus=null;
function localizeGallery(){const arabic=ar();viewer.setAttribute('aria-label',arabic?'معرض صور المدرسة':'School photo gallery');close.setAttribute('aria-label',arabic?'إغلاق المعرض':'Close gallery');prev.setAttribute('aria-label',arabic?'السابق':'Previous');next.setAttribute('aria-label',arabic?'التالي':'Next');document.querySelectorAll('.card-gallery').forEach((gallery,index)=>{gallery.setAttribute('aria-label',arabic?'صور مدرسة Roots — مجموعة '+(index+1):'Roots school photos — album '+(index+1));const expand=gallery.querySelector('.gallery-expand');if(expand){expand.setAttribute('aria-label',arabic?'تكبير الصورة':'Enlarge image');expand.title=arabic?'تكبير الصورة':'Enlarge image';}});}
document.addEventListener('roots:languagechange',localizeGallery);
function stopMedia(container){container.querySelectorAll('video').forEach(v=>v.pause());}
function mediaFor(item,full=false){const el=document.createElement(item.video?'video':'img');if(item.video){el.controls=true;el.playsInline=true;el.preload='metadata';el.poster=item.poster||item.thumb;el.setAttribute('aria-label',item.alt);}else{el.alt=item.alt;el.className='gallery-image'+(item.portrait?' is-portrait':'');if(!full)el.loading='lazy';}el.src=item.src;return el;}
function showFull(){if(!active)return;stopMedia(canvas);const item=active.items[active.index];canvas.replaceChildren(mediaFor(item,true));caption.textContent=item.alt;position.textContent=(active.index+1)+' / '+active.items.length;}
function move(delta){if(!active)return;active.select((active.index+delta+active.items.length)%active.items.length);showFull();}
prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));close.addEventListener('click',()=>viewer.close());viewer.addEventListener('close',()=>{stopMedia(canvas);canvas.replaceChildren();lastFocus?.focus();active=null;});viewer.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}});
viewer.addEventListener('click',e=>{if(e.target===viewer){const r=viewer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)viewer.close();}});
document.querySelectorAll('.card-gallery').forEach(gallery=>{
const items=JSON.parse(gallery.dataset.gallery),stage=gallery.querySelector('.gallery-stage'),count=gallery.querySelector('.gallery-count'),expand=gallery.querySelector('.gallery-expand'),thumbs=[...gallery.querySelectorAll('.gallery-thumb')];
const state={items,index:0,select(index){stopMedia(stage);const current=stage.querySelector('img,video');current.replaceWith(mediaFor(items[index]));state.index=index;count.textContent=(index+1)+' / '+items.length;thumbs.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));}};
let hovering=false,focused=false,visible=false,lastChange=Date.now();
const selectManual=state.select;state.select=index=>{selectManual(index);lastChange=Date.now();};
gallery.addEventListener('pointerenter',()=>{hovering=true;});gallery.addEventListener('pointerleave',()=>{hovering=false;lastChange=Date.now();});
gallery.addEventListener('focusin',()=>{focused=true;});gallery.addEventListener('focusout',e=>{focused=gallery.contains(e.relatedTarget);lastChange=Date.now();});
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)lastChange=Date.now();},{threshold:.25});observer.observe(gallery);
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const timer=setInterval(()=>{if(!visible||document.hidden||hovering||focused||viewer.open||reduced.matches||Date.now()-lastChange<4500)return;const playing=stage.querySelector('video');if(playing&&!playing.paused&&!playing.ended)return;let index=(state.index+1)%items.length;while(items[index].video&&index!==state.index)index=(index+1)%items.length;state.select(index);},500);
window.addEventListener('pagehide',()=>{clearInterval(timer);observer.disconnect();},{once:true});
thumbs.forEach((button,index)=>button.addEventListener('click',()=>state.select(index)));
function open(){stopMedia(stage);active=state;lastFocus=document.activeElement;showFull();close.setAttribute('aria-label',ar()?'إغلاق المعرض':'Close gallery');prev.setAttribute('aria-label',ar()?'السابق':'Previous');next.setAttribute('aria-label',ar()?'التالي':'Next');viewer.showModal();}
let swiped=false;expand.addEventListener('click',open);stage.addEventListener('click',e=>{if(swiped){swiped=false;return;}if(e.target.tagName==='IMG')open();});let startX=null,startY=null;
stage.addEventListener('pointerdown',e=>{if(e.target.tagName!=='IMG')return;startX=e.clientX;startY=e.clientY;});stage.addEventListener('pointerup',e=>{if(startX===null)return;const dx=e.clientX-startX,dy=e.clientY-startY;startX=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.4){swiped=true;state.select((state.index+(dx<0?1:-1)+items.length)%items.length);}});
});
localizeGallery();
})();
