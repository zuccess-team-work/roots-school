(() => {
'use strict';
const cfg = window.ROOTS_AUTH || {};
let token = null, account = null;
const ar = () => document.documentElement.lang === 'ar';
const form = document.querySelector('#staff-login, #parent-login');
const status = document.getElementById('login-status');
const login = document.getElementById('login-panel');
const dashboard = document.querySelector('#dashboard-panel, #journey-panel');
const role = location.pathname.includes('admin') ? 'admin' : location.pathname.includes('teacher') ? 'teacher' : 'parent';
const show = message => { status.textContent = message; status.hidden = false; };
const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.url) && typeof cfg.publishableKey === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.publishableKey);
async function request(path, method='GET', body) {
 const response = await fetch(cfg.url + path, {method,headers:{apikey:cfg.publishableKey, ...(token?{Authorization:'Bearer '+token}:{}), 'Content-Type':'application/json'}, ...(body?{body:JSON.stringify(body)}:{})});
 if (!response.ok) throw new Error('Request failed');
 const text=await response.text();return text?JSON.parse(text):null;
}
let refreshToken=null,refreshTimer=null;
function scheduleRefresh(seconds){clearTimeout(refreshTimer);refreshTimer=setTimeout(async()=>{try{const next=await request('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:refreshToken});token=next.access_token;refreshToken=next.refresh_token;scheduleRefresh(next.expires_in);}catch{signOut();}},Math.max(30000,(seconds-120)*1000));}
function signOut() {
 const old=token;token=null;account=null;refreshToken=null;clearTimeout(refreshTimer);
 document.getElementById('secure-records')?.remove();
 dashboard.hidden=true;login.hidden=false;document.querySelector('#staff-login, #parent-login').reset();
 for(const child of dashboard.children)child.hidden=false;
 if(old) fetch(cfg.url+'/auth/v1/logout',{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+old}}).catch(()=>{});
}
function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}

function input(label,type='text'){const el=document.createElement('input');el.type=type;el.placeholder=label;el.setAttribute('aria-label',label);el.required=true;return el;}
function dropdown(label,items){const el=document.createElement('select');el.setAttribute('aria-label',label);for(const [id,text] of items){const option=node('option',text);option.value=id;el.append(option);}return el;}
function actionForm(title,fields,save,label){const box=node('article','');box.className='portal-card';box.append(node('h3',title));const f=document.createElement('form');f.className='portal-form';const b=node('button',label|| (ar()?'حفظ':'Save'));b.type='submit';b.className='button';const message=node('p','');message.setAttribute('role','status');f.append(...fields,b,message);f.addEventListener('submit',async e=>{e.preventDefault();b.disabled=true;try{await save();await displayRecords();}catch(error){message.textContent=error.message==='Account service unavailable'?(ar()?'إنشاء الحسابات يحتاج تفعيل خدمة الخادم أولًا.':'Account creation needs server setup first.'):(ar()?'تعذّر الحفظ. تحقق من الاتصال والبيانات.':'Could not save. Check connection and values.');}finally{b.disabled=false;}});box.append(f);return box;}

async function contentTools(){
 const box=node('article','');box.className='portal-card';box.dataset.area='content';box.append(node('h3',ar()?'محتوى الموقع':'Website content'));
 const response=await fetch('content-fields.json');const fields=await response.json();
 let values={};try{const rows=await request('/rest/v1/site_content?id=eq.website&select=content');values=rows[0]?.content||{};}catch{box.append(node('p',ar()?'إعداد جدول المحتوى لم يكتمل.':'Content database setup is incomplete.'));return box;}
 const form=document.createElement('form');form.className='portal-form';const controls=[];
 for(const field of fields){const item=document.createElement('details');item.append(node('summary',(values[field.id]?.ar||field.ar).slice(0,90)));const a=node('textarea',''),e=node('textarea','');a.value=values[field.id]?.ar??field.ar;e.value=values[field.id]?.en??field.en;a.maxLength=e.maxLength=5000;a.setAttribute('aria-label',ar()?'النص العربي':'Arabic text');e.setAttribute('aria-label','English text');e.dir='ltr';item.append(a,e);controls.push([field.id,a,e]);form.append(item);}
 const button=node('button',ar()?'حفظ محتوى الموقع':'Save website content');button.type='submit';button.className='button';const status=node('p','');status.setAttribute('role','status');form.append(button,status);
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;try{const content={};for(const [id,a,e] of controls)content[id]={ar:a.value,en:e.value};const rows=await request('/rest/v1/site_content?id=eq.website&select=id');await request('/rest/v1/site_content'+(rows.length?'?id=eq.website':''),rows.length?'PATCH':'POST',{id:'website',content,updated_at:new Date().toISOString()});status.textContent=ar()?'تم الحفظ. يظهر المحتوى عند تحديث الموقع.':'Saved. Reload the public website to see changes.';}catch{status.textContent=ar()?'تعذّر حفظ المحتوى.':'Could not save content.';}finally{button.disabled=false;}});
 box.append(form);return box;
}

async function adminTools(section,students){
 const accounts=await request('/rest/v1/school_accounts?select=id,role,display_name&order=display_name');
 const access=await request('/rest/v1/student_access?select=account_id,student_id');
 const tools=node('div','');tools.className='portal-grid';
 const name=input(ar()?'اسم صاحب الحساب':'Account name'),email=input(ar()?'البريد الإلكتروني':'Email','email'),password=input(ar()?'كلمة مرور مؤقتة (6 أحرف على الأقل)':'Temporary password (6 characters minimum)','password');password.minLength=6;password.autocomplete='new-password';
 const kind=dropdown(ar()?'نوع الحساب':'Account role',[['parent',ar()?'ولي أمر':'Parent'],['teacher',ar()?'معلم':'Teacher'],['admin',ar()?'مدير':'Admin']]);
 const createBox=actionForm(ar()?'إنشاء حساب':'Create account',[name,email,password,kind],async()=>{try{const r=await fetch(cfg.url+'/functions/v1/manage-account',{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'create',name:name.value,email:email.value,password:password.value,role:kind.value})});if(r.status===404||r.status===503)throw new Error('Account service unavailable');if(!r.ok)throw new Error('Failed');}finally{password.value='';}},ar()?'إنشاء الحساب':'Create account');createBox.dataset.area='accounts';tools.append(createBox);
 const roster=node('article','');roster.className='portal-card';roster.dataset.area='accounts';roster.append(node('h3',ar()?'الحسابات والصلاحيات':'Accounts and access'));
 for(const a of accounts){roster.append(node('p',(a.display_name||a.id)+' — '+a.role));for(const link of access.filter(x=>x.account_id===a.id)){const student=students.find(x=>x.id===link.student_id);const row=node('p',student?.name||link.student_id);const remove=node('button',ar()?'إلغاء الربط':'Unlink');remove.type='button';remove.className='preview-button';remove.addEventListener('click',async()=>{if(!confirm(ar()?'إلغاء وصول هذا الحساب للطالب؟':'Remove this account’s access to the student?'))return;remove.disabled=true;try{await request('/rest/v1/student_access?account_id=eq.'+a.id+'&student_id=eq.'+link.student_id,'DELETE');await displayRecords();}catch{remove.disabled=false;row.append(node('span',ar()?'تعذّر إلغاء الربط':'Could not unlink'));}});row.append(remove);roster.append(row);}}

 for(const selectedAccount of accounts.filter(x=>x.role==='teacher'||x.role==='parent')){
 const permissionBox=node('article','');permissionBox.className='portal-card';permissionBox.dataset.area=selectedAccount.role+'-links';
 permissionBox.append(node('h3',selectedAccount.display_name||(ar()?'حساب':'Account')),node('p',selectedAccount.role==='teacher'?(ar()?'حدّد طلاب هذا المعلم واحفظ.':'Select this teacher’s students and save.'):(ar()?'حدّد أطفال ولي الأمر واحفظ.':'Select this parent’s children and save.')));
 const form=node('form','');form.className='portal-form';
 const type=dropdown(ar()?'نوع الحساب':'Account type',[['teacher',ar()?'معلم':'Teacher'],['parent',ar()?'ولي أمر':'Parent']]);
 const who=dropdown(ar()?'الاسم':'Name',[]);who.required=true;
 type.value=selectedAccount.role;
 const classFilter=dropdown(ar()?'الصف':'Class',[['',ar()?'كل الصفوف':'All classes'],...[...new Set(students.map(x=>x.class_name).filter(Boolean))].map(x=>[x,x])]);
 if(selectedAccount.role==='teacher'){const label=node('label',ar()?'عرض طلاب الصف':'Show class');label.append(classFilter);form.append(label);}
 const picks=node('fieldset','');picks.className='student-picks';const status=node('p','');status.setAttribute('role','status');const save=node('button',ar()?'حفظ الطلاب':'Save students');save.type='submit';save.className='button';form.append(picks,save,status);permissionBox.append(form);let checks=[];
 function renderStudents(){checks=[];picks.replaceChildren();picks.append(node('legend',selectedAccount.role==='teacher'?(ar()?'طلاب المعلم':'Teacher’s students'):(ar()?'أطفال ولي الأمر':'Parent’s children')));save.disabled=!who.value||!students.length;if(!who.value){picks.append(node('p',ar()?'اختر الاسم أولًا.':'Choose a name first.'));return;}if(!students.length){picks.append(node('p',ar()?'أضف الطلاب من قسم الطلاب أولًا.':'Add students in Students first.'));return;}for(const student of students){const label=node('label','');label.className='student-pick';label.hidden=!!classFilter.value&&student.class_name!==classFilter.value;const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=student.id;checkbox.checked=access.some(x=>x.account_id===who.value&&x.student_id===student.id);label.append(checkbox,node('span',student.name+(student.class_name?' — '+student.class_name:'')));picks.append(label);checks.push(checkbox);}}
 function renderAccounts(){who.replaceChildren();for(const [id,label] of [['',ar()?'اختر الاسم':'Choose a name'],...accounts.filter(x=>x.role===type.value).map(x=>[x.id,x.display_name||x.id])]){const option=node('option',label);option.value=id;who.append(option);}who.value=selectedAccount.id;status.textContent='';renderStudents();}
 classFilter.addEventListener('change',()=>{checks.forEach(check=>{const student=students.find(x=>x.id===check.value);check.parentElement.hidden=!!classFilter.value&&student.class_name!==classFilter.value;});});
 type.addEventListener('change',renderAccounts);who.addEventListener('change',()=>{status.textContent='';renderStudents();});renderAccounts();
 form.addEventListener('submit',async event=>{event.preventDefault();if(!who.value)return;const accountId=who.value;const desired=new Set(checks.filter(x=>x.checked).map(x=>x.value));const current=access.filter(x=>x.account_id===accountId);const removed=current.filter(x=>!desired.has(x.student_id));const added=[...desired].filter(id=>!current.some(x=>x.student_id===id));if(!removed.length&&!added.length){status.textContent=ar()?'الطلاب محفوظون بالفعل.':'Students are already saved.';return;}if(removed.length&&!confirm(ar()?'سيتم إلغاء الربط مع '+removed.length+' طالب. متابعة؟':'Remove links to '+removed.length+' student(s)?'))return;save.disabled=true;type.disabled=who.disabled=true;checks.forEach(x=>x.disabled=true);try{for(const studentId of added){const link={account_id:accountId,student_id:studentId};await request('/rest/v1/student_access','POST',link);access.push(link);}for(const link of removed){await request('/rest/v1/student_access?account_id=eq.'+accountId+'&student_id=eq.'+link.student_id,'DELETE');access.splice(access.indexOf(link),1);}status.textContent=ar()?'تم حفظ الطلاب بنجاح.':'Students saved successfully.';}catch{status.textContent=ar()?'لم يكتمل حفظ جميع الروابط. راجع التحديد الظاهر وحاول مجددًا.':'Not all links were saved. Review the current selection and retry.';}finally{type.disabled=who.disabled=false;renderStudents();}});
 tools.append(permissionBox);
 }
 for(const student of students){const name=input(ar()?'اسم الطالب':'Student name'),className=input(ar()?'الصف':'Class');name.value=student.name;className.value=student.class_name;className.required=false;const studentBox=actionForm(ar()?'تعديل '+student.name:'Edit '+student.name,[name,className],()=>request('/rest/v1/students?id=eq.'+student.id,'PATCH',{name:name.value.trim(),class_name:className.value.trim()}));studentBox.dataset.area='students';tools.append(studentBox);}
 tools.append(await contentTools());section.append(tools);
}


function organizeDashboard(section){
 if(role==='parent')return;
 const all=[...section.children].slice(1);
 const panels=document.createElement('div');panels.className='management-panels';panels.hidden=true;
 const home=document.createElement('div');home.className='portal-grid management-home';
 const back=node('button',ar()?'العودة إلى لوحة التحكم':'Back to dashboard');back.className='preview-button';back.type='button';
 const title=node('h2','');const content=node('div','');
 panels.append(back,title,content);
 const returnHome=()=>{panels.hidden=true;home.hidden=false;section.querySelector('#password-change')?.remove();};
 back.addEventListener('click',returnHome);
 section.addEventListener('portal-back',returnHome);
 const tools=all.find(x=>x.classList.contains('portal-grid'));
 const toolItems=tools?[...tools.children]:[];
 const studentCards=all.filter(x=>x.tagName==='ARTICLE');
 const addStudent=all.find(x=>x.tagName==='FORM');
 const entries=role==='admin'?[
 ['الطلاب','Students','إضافة الطلاب وتعديل صفوفهم.','Add students and edit their classes.',()=>[addStudent,...(tools?toolItems.filter(x=>x.dataset.area==='students'):[])]],
 ['حسابات أولياء الأمور','Parent accounts','إنشاء حسابات الأهل وربطها بأطفالهم.','Create parent accounts and link their children.',()=>toolItems.filter(x=>x.dataset.area==='accounts'||x.dataset.area==='parent-links')],
 ['حسابات المعلمين','Teacher accounts','إنشاء حسابات المعلمين وتعيين الطلاب.','Create teacher accounts and assign students.',()=>toolItems.filter(x=>x.dataset.area==='accounts'||x.dataset.area==='teacher-links')],
 ['محتوى الموقع','Website content','إدارة محتوى المدرسة والصور ومعلومات التسجيل.','Manage school content, photos and admissions.',()=>toolItems.filter(x=>x.dataset.area==='content')],
 ['مراجعة التحديثات','Review updates','مراجعة رحلة التعلم والأنشطة والحضور والرسائل.','Review learning, activities, attendance and messages.',()=>studentCards],
 
 ]:[
 ['طلابي','My students','طلابك المعيّنون من الإدارة.','Students assigned by the administrator.',()=>studentCards],
 ['تحديث رحلة التعلم','Learning journey','دوّن تقدّم الطفل وملاحظات التعلم.','Record progress and learning notes.',()=>studentCards],
 ['الحضور','Attendance','سجّل حضور الطلاب المعيّنين لك.','Record attendance for assigned students.',()=>studentCards],
 ['رسائل الأهل','Parent messages','أضف رسائل لأهل الطلاب المعيّنين لك.','Add messages for parents of assigned students.',()=>studentCards]
 ];
 const sidebar=node('nav','');sidebar.className='dashboard-sidebar';sidebar.setAttribute('aria-label',ar()?'أقسام لوحة التحكم':'Dashboard sections');const overview=node('button',ar()?'لوحة التحكم':'Dashboard');overview.type='button';overview.className='dashboard-nav active';overview.addEventListener('click',()=>{returnHome();sidebar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===overview));});sidebar.append(node('strong',ar()?'إدارة المدرسة':'School workspace'),overview);
 const search=input(ar()?'ابحث بالاسم…':'Search by name…','search');search.required=false;search.className='dashboard-search';panels.insertBefore(search,content);search.addEventListener('input',()=>{for(const item of content.children){item.hidden=!!search.value&&!item.textContent.toLowerCase().includes(search.value.toLowerCase());}});
 for(const [a,e,descriptionA,descriptionE,getItems] of entries){
  const card=node('article','');card.className='portal-card management-tile';card.append(node('h2',ar()?a:e),node('p',ar()?descriptionA:descriptionE));
  const count=node('p',ar()?'إدارة وعرض التفاصيل':'Manage and view details');count.className='empty-state';card.append(count);
  const button=node('button',ar()?'فتح القسم':'Open section');button.className='preview-button';button.type='button';
  const navButton=node('button',ar()?a:e);navButton.type='button';navButton.className='dashboard-nav';navButton.addEventListener('click',()=>button.click());sidebar.append(navButton);
  button.addEventListener('click',()=>{search.value='';sidebar.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===navButton));while(content.firstChild){panels.append(content.firstChild);panels.lastChild.hidden=true;}title.textContent=ar()?a:e;const items=getItems().filter(Boolean);if(items.length){for(const item of items)item.hidden=false;content.append(...items);if(role==='admin'&&(a==='حسابات المعلمين'||a==='حسابات أولياء الأمور')){const roleSelect=content.querySelector('select[aria-label="نوع الحساب"],select[aria-label="Account role"]');if(roleSelect)roleSelect.value=a==='حسابات المعلمين'?'teacher':'parent';}if(role==='teacher'){const category=a==='الحضور'?'attendance':a==='رسائل الأهل'?'message':a==='تحديث رحلة التعلم'?'progress':null;if(category)content.querySelectorAll('select').forEach(select=>{select.value=category;});}}else content.append(node('p',a==='محتوى الموقع'?(ar()?'أدوات تعديل محتوى الموقع قيد التجهيز.':'Website content tools are being prepared.'):(ar()?'لا توجد بيانات بعد.':'No records yet.')));home.hidden=true;panels.hidden=false;title.tabIndex=-1;title.focus();});card.append(button);home.append(card);
 }
 for(const el of all)el.remove();
 section.className='management-dashboard workspace-layout';const workspace=node('div','');workspace.className='dashboard-workspace';workspace.append(home,panels);section.append(sidebar,workspace);
}


async function parentJourney(section,students){
 section.className='family-dashboard';
 const hero=node('header','');hero.className='family-welcome';hero.append(node('p',ar()?'ROOTS · بوابة الأهل':'ROOTS · Family portal'),node('h1',ar()?'رحلة طفلي':'My child’s journey'),node('p',ar()?'لحظات صغيرة، وخطوات كبيرة. تابع رحلة أطفالك في المدرسة.':'Small moments, big steps. Follow your children’s school journey.'));section.append(hero);
 if(!students.length){const empty=node('article','');empty.className='child-profile';empty.append(node('h2',ar()?'أهلًا بكم في Roots':'Welcome to Roots'),node('p',ar()?'ستظهر ملفات أطفالك هنا بعد أن تربط المدرسة حسابك بهم.':'Your children will appear here once the school links them to your account.'));section.append(empty);return;}
 const selector=node('div','');selector.className='child-switcher';selector.setAttribute('role','group');selector.setAttribute('aria-label',ar()?'اختيار الطفل':'Choose a child');const content=node('div','');content.className='child-content';const buttons=[];let selection=0;
 function avatar(name){const a=node('span',name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join(' '));a.className='child-avatar';a.setAttribute('role','img');a.setAttribute('aria-label',ar()?'مكان صورة '+name:'Photo placeholder for '+name);return a;}
 const labels=[['attendance','الحضور','Attendance','سجل أيام طفلك في المدرسة.','Your child’s school attendance.'],['progress','التقدّم والتعلّم','Learning & progress','خطوات جديدة في رحلة التعلّم.','New steps in their learning journey.'],['activity','الأنشطة واللحظات','Activities & moments','اكتشافات وتجارب من يوم طفلك.','Discoveries from your child’s day.'],['message','رسائل المعلم','Teacher messages','تواصل المدرسة مع العائلة.','Updates from school to your family.']];
 async function selectChild(index){selection++;const current=selection;buttons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===index));});content.replaceChildren();const student=students[index];const profile=node('article','');profile.className='child-profile';const photo=node('div','');photo.className='child-photo-slot';photo.append(avatar(student.name),node('small',ar()?'صورة الطفل قريبًا':'Child photo coming soon'));const info=node('div','');info.append(node('p',ar()?'ملف طفلك':'Your child’s profile'),node('h2',student.name));const grade=student.class_name;const grades=['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر'];info.append(node('span',ar()&&/^\d+$/.test(grade)&&grades[Number(grade)]?'الصف '+grades[Number(grade)]:(ar()?'الصف: ':'Class: ')+(grade||(ar()?'لم يُحدّد بعد':'Not assigned'))));profile.append(photo,info);content.append(profile);
 const schedule=node('section','');schedule.className='child-schedule';schedule.append(node('h3',ar()?'الجدول الدراسي':'School timetable'),node('p',ar()?'أيام طفلك في المدرسة، في مكان واحد.':'Your child’s school week, in one place.'));const pending=node('div','');pending.className='schedule-pending';const icon=node('span','▦');icon.className='schedule-icon';icon.setAttribute('aria-hidden','true');const copy=node('div','');copy.append(node('strong',ar()?'الجدول الدراسي قريبًا':'Timetable coming soon'),node('p',ar()?'لم تُضف المدرسة الجدول بعد. ستظهر هنا الأيام والحصص وأوقاتها عندما يتوفر.':'The school has not added the timetable yet. Days, lessons and times will appear here when available.'));pending.append(icon,copy);schedule.append(pending);content.append(schedule);const grid=node('div','');grid.className='journey-grid';content.append(grid);let updates;try{updates=await request('/rest/v1/learning_updates?select=id,category,note,created_at&student_id=eq.'+encodeURIComponent(student.id)+'&order=created_at.desc');}catch{if(current===selection)grid.append(node('p',ar()?'تعذّر تحميل التحديثات. حاول مجددًا.':'Could not load updates. Please try again.'));return;}if(current!==selection)return;
 for(const [category,a,e,descriptionA,descriptionE] of labels){const card=node('section','');card.className='journey-category '+category;card.append(node('h3',ar()?a:e),node('p',ar()?descriptionA:descriptionE));const rows=updates.filter(x=>x.category===category);if(!rows.length){const empty=node('div','');empty.className='journey-empty';empty.append(node('span',ar()?'لا توجد تحديثات بعد':'No updates yet'),node('small',ar()?'ستظهر هنا عندما يضيفها المعلم.':'Updates will appear when the teacher adds them.'));card.append(empty);}for(const u of rows){const entry=node('article','');entry.className='journey-entry';entry.append(node('p',u.note),node('time',new Date(u.created_at).toLocaleDateString(ar()?'ar':'en',{day:'numeric',month:'long',year:'numeric'})));card.append(entry);}grid.append(card);}
 }
 students.forEach((student,index)=>{const button=node('button','');button.type='button';button.className='child-choice';button.append(avatar(student.name),node('span',student.name));button.addEventListener('click',()=>selectChild(index));buttons.push(button);selector.append(button);});section.append(node('h2',ar()?'أطفالي':'My children'),selector,content);await selectChild(0);
}

async function displayRecords() {
 const students=await request('/rest/v1/students?select=id,name,class_name&order=name');
 document.getElementById('secure-records')?.remove();
 const section=document.createElement('div');section.id='secure-records';section.className='portal-card';
 if(role==='parent')await parentJourney(section,students);
 else section.append(node('h2',role==='admin'?(ar()?'لوحة إدارة المدرسة':'School administration'):(ar()?'الطلاب المسموح لك الوصول إليهم':'Your authorized students')));
 if(role==='admin')await adminTools(section,students);
 if(role!=='parent'&&!students.length)section.append(node('p',ar()?'لا توجد بيانات أو تعيينات بعد.':'No students or assignments yet.'));
 for(const student of (role==='parent'?[]:students)){
  const card=document.createElement('article');card.className='portal-card';card.append(node('h3',student.name),node('p',student.class_name));
  const updates=await request('/rest/v1/learning_updates?select=id,author_id,category,note,created_at&student_id=eq.'+encodeURIComponent(student.id)+'&order=created_at.desc');
  for(const update of updates){
 const row=node('article','');row.className='update-record';
 const labels={progress:ar()?'تقدّم':'Progress',activity:ar()?'نشاط':'Activity',message:ar()?'رسالة':'Message',attendance:ar()?'حضور':'Attendance'};
 row.append(node('h4',labels[update.category]||update.category),node('p',update.note),node('small',new Date(update.created_at).toLocaleString(ar()?'ar':'en')));
 if(role==='admin'||(role==='teacher'&&update.author_id===account.id)){const edit=node('button',ar()?'تعديل':'Edit');edit.type='button';edit.className='preview-button';edit.addEventListener('click',()=>{if(row.querySelector('textarea'))return;const value=node('textarea','');value.value=update.note;value.required=true;value.maxLength=5000;value.setAttribute('aria-label',ar()?'التحديث':'Update');row.append(actionForm(ar()?'تعديل التحديث':'Edit update',[value],()=>request('/rest/v1/learning_updates?id=eq.'+update.id,'PATCH',{note:value.value.trim()})));});row.append(edit);}
 card.append(row);
 }
  if(!updates.length)card.append(node('p',ar()?'لا توجد تحديثات بعد.':'No updates yet.'));
  if(role!=='parent'){
   const editor=document.createElement('form');const select=document.createElement('select');
   for(const [value,a,e] of [['progress','تقدّم','Progress'],['activity','نشاط','Activity'],['message','رسالة','Message'],['attendance','حضور','Attendance']]){const option=node('option',ar()?a:e);option.value=value;select.append(option);}
   const note=document.createElement('textarea');note.required=true;note.maxLength=5000;note.setAttribute('aria-label',ar()?'ملاحظة الطالب':'Student note');note.style.width='100%';
   const submit=node('button',ar()?'حفظ التحديث':'Save update');submit.className='preview-button';submit.type='submit';const feedback=node('p','');feedback.setAttribute('role','status');
   editor.append(select,note,submit,feedback);editor.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await request('/rest/v1/learning_updates','POST',{student_id:student.id,author_id:account.id,category:select.value,note:note.value.trim()});await displayRecords();}catch(_){feedback.textContent=ar()?'تعذّر الحفظ. أعد تسجيل الدخول وحاول مجددًا.':'Could not save. Sign in again and retry.';}finally{submit.disabled=false;}});card.append(editor);
  }
  section.append(card);
 }
 if(role==='admin'){
  const editor=document.createElement('form');const name=document.createElement('input');name.required=true;name.maxLength=150;name.placeholder=ar()?'اسم الطالب':'Student name';name.setAttribute('aria-label',name.placeholder);
  const className=document.createElement('input');className.maxLength=100;className.placeholder=ar()?'الصف':'Class';className.setAttribute('aria-label',className.placeholder);
  const submit=node('button',ar()?'إضافة طالب':'Add student');submit.type='submit';submit.className='preview-button';const feedback=node('p','');feedback.setAttribute('role','status');
  editor.append(name,className,submit,feedback);editor.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await request('/rest/v1/students','POST',{name:name.value.trim(),class_name:className.value.trim()});await displayRecords();}catch(_){feedback.textContent=ar()?'تعذّرت الإضافة.':'Could not add student.';}finally{submit.disabled=false;}});section.append(editor);
 }
 organizeDashboard(section);
 const changePassword=node('button',ar()?'تغيير كلمة المرور':'Change password');changePassword.type='button';changePassword.className='preview-button';changePassword.addEventListener('click',()=>{if(document.getElementById('password-change'))return;const pass=input(ar()?'كلمة المرور الجديدة':'New password','password'),again=input(ar()?'تأكيد كلمة المرور':'Confirm password','password');pass.minLength=again.minLength=6;pass.autocomplete=again.autocomplete='new-password';const box=actionForm(ar()?'تغيير كلمة المرور':'Change password',[pass,again],async()=>{if(pass.value!==again.value)throw new Error('Mismatch');try{await request('/auth/v1/user','PUT',{password:pass.value});}finally{pass.value=again.value='';}});box.id='password-change';section.append(box);});section.append(changePassword);
 const logout=node('button',ar()?'تسجيل الخروج':'Sign out');logout.type='button';logout.className='preview-button';logout.addEventListener('click',signOut);section.append(logout);for(const child of dashboard.children)child.hidden=true;dashboard.prepend(section);
}
if(!form)return;
 document.getElementById('portal-language').addEventListener('click',()=>{if(account)displayRecords().catch(()=>{});});
// Replace the preview-only submission handler; leave explicitly labelled previews available.
const fresh=form.cloneNode(true);form.replaceWith(fresh);
fresh.addEventListener('submit',async event=>{
 event.preventDefault();const button=fresh.querySelector('button[type=submit]');const password=fresh.querySelector('#password');
 const statusNow=fresh.querySelector('#login-status');
 const message=text=>{statusNow.textContent=text;statusNow.hidden=false;};
 if(!configured){password.value='';message(ar()?'لم يتم ربط خدمة الحسابات بعد.':'The account service is not connected yet.');return;}
 button.disabled=true;
 try{
  const result=await request('/auth/v1/token?grant_type=password','POST',{email:fresh.querySelector('#username').value.trim(),password:password.value});password.value='';token=result.access_token;refreshToken=result.refresh_token;
 scheduleRefresh(result.expires_in);
  const rows=await request('/rest/v1/school_accounts?select=id,role,display_name&id=eq.'+encodeURIComponent(result.user.id));
  account=rows[0];if(!account||account.role!==role){signOut();throw new Error('Role mismatch');}
  await displayRecords();login.hidden=true;dashboard.hidden=false;dashboard.focus();
 }catch(_){signOut();message(ar()?'تعذّر الدخول. تحقق من البريد وكلمة المرور وصلاحية الحساب.':'Sign-in failed. Check your email, password, and account permissions.');}
 finally{password.value='';button.disabled=false;}
});
window.addEventListener('pagehide',()=>{token=null;account=null;refreshToken=null;clearTimeout(refreshTimer);});
})();
