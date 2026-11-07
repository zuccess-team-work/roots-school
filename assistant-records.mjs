// Read-only fixed retrieval. Production callers must authenticate first; demo reuses its existing fake API.
import{uuid}from'./assistant-core.mjs';
const fault=(code,status=400)=>Object.assign(Error(code),{status});
export async function parentContext(request,childId,accountId){
 if(!uuid(accountId))throw fault('parent_required',403);
 if(!uuid(childId))throw fault('choose_child');
 const accounts=await request('/rest/v1/school_accounts?select=id,role,is_enabled&id=eq.'+accountId+'&limit=1');
 const account=accounts[0];if(!account||account.id!==accountId||account.role!=='parent'||!account.is_enabled)throw fault('parent_required',403);
 const links=await request('/rest/v1/student_access?select=student_id&account_id=eq.'+account.id+'&student_id=eq.'+childId);
 if(!links.some(x=>x.student_id===childId))throw fault('child_unavailable',403);
 const children=await request('/rest/v1/students?select=id,name,class_name&id=eq.'+childId);
 if(children.length!==1||children[0].id!==childId)throw fault('child_unavailable',403);const child={id:children[0].id,name:children[0].name,class_name:children[0].class_name};
 const selects={homework:['school_homework','id,title,description,subject,due_date,class_name,status','due_date.desc'],event:['school_events','id,title,description,starts_at,ends_at,class_name,status','starts_at.desc'],report:['school_reports','id,subject,notes,recommendations,assessment_date,student_id,status','assessment_date.desc'],announcement:['school_announcements','id,title,body,published_at,class_name,status','published_at.desc'],update:['learning_updates','id,note,category,event_date,attendance_status,subject,student_id','event_date.desc,created_at.desc']};
 const facts=[];for(const[kind,[table,cols,order]]of Object.entries(selects)){
  const p=new URLSearchParams({select:cols,limit:'20',order});
  if(kind==='homework'&&!child.class_name)continue;
  if(kind==='report'||kind==='update')p.set('student_id','eq.'+child.id);else if(kind==='homework')p.set('class_name','eq.'+child.class_name);else if(!child.class_name)p.set('class_name','is.null');else p.set('or',`(class_name.is.null,class_name.eq."${child.class_name.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}")`);
  if(kind!=='update')p.set('status','eq.published');
  if(kind==='event'){p.set('ends_at','gte.'+new Date().toISOString());p.set('order','starts_at.asc');}
  if(kind==='homework'){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());p.set('due_date','gte.'+day);p.set('order','due_date.asc');}
  if(kind==='announcement')p.set('published_at','lte.'+new Date().toISOString());
  const rows=await request('/rest/v1/'+table+'?'+p);
  for(const r of rows){if(kind!=='update'&&r.status!=='published')continue;if(['report','update'].includes(kind)&&r.student_id!==child.id)continue;if(['homework','event','announcement'].includes(kind)&&r.class_name&&r.class_name!==child.class_name)continue;const attendance=kind==='update'&&r.category==='attendance',k=attendance?'attendance':kind;
   if(facts.filter(f=>f.kind===k).length>=4)continue;
   const states={present:['حاضر','Present'],absent:['غائب','Absent'],late:['متأخر','Late'],excused:['غياب بعذر','Excused absence']};
   const text=[r.title||r.subject,attendance?(states[r.attendance_status]?.[0]||'غير مسجل'):r.description||r.notes||r.body||r.note,r.recommendations].filter(Boolean).join(' · ').slice(0,700);
   const en=attendance?[states[r.attendance_status]?.[1]||'Not recorded'].filter(Boolean).join(' · '):text;
   const date=r.due_date||r.assessment_date||r.event_date||r.starts_at;const format=language=>{if(!date)return'';const value=/^\d{4}-\d{2}-\d{2}$/.test(date)?date+'T12:00:00Z':date;return new Intl.DateTimeFormat(language,{timeZone:'Asia/Hebron',dateStyle:'medium',...(r.starts_at?{timeStyle:'short'}:{})}).format(new Date(value));};facts.push({id:kind+':'+r.id,kind:k,ar:text+(date?' · '+format('ar-PS'):''),en:en+(date?' · '+format('en-GB'):''),label:r.title||r.subject||k});
  }
 }
 // Recheck relationship and account after retrieval; a concurrent revocation must fail closed.
 const check=await request('/rest/v1/student_access?select=student_id&account_id=eq.'+account.id+'&student_id=eq.'+child.id);
 const enabled=await request('/rest/v1/school_accounts?select=id,role,is_enabled&id=eq.'+accountId+'&limit=1');
 if(!check.some(x=>x.student_id===child.id)||!enabled.some(x=>x.id===account.id&&x.role==='parent'&&x.is_enabled))throw fault('child_unavailable',403);
 return{child,facts,fetched_at:new Date().toISOString()};
}
