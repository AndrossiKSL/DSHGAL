const NOTE_KEY='whale-galgame:save-annotations'
function readLocal(_key:string,fallback:any){try{return JSON.parse(localStorage.getItem(NOTE_KEY)||'null')||fallback}catch{return fallback}}
export function readSaveAnnotation(row:any){if(!row)return null;const notes=readLocal(NOTE_KEY,{}),note=notes[String(row.slot)];return note?.savedAt===row.savedAt?note:null}
export function writeSaveAnnotation(row:any,label:string,quote:string){if(!row||!row.savedAt)return;try{const notes=readLocal(NOTE_KEY,{});notes[String(row.slot)]={savedAt:row.savedAt,label:String(label||'').trim().slice(0,40),quote:String(quote||'').slice(0,200)};localStorage.setItem(NOTE_KEY,JSON.stringify(notes))}catch{}}
export function memoryEntries(data:any,roleId:string){
 const entries:any[]=[]
 for(const e of data.events||[])if(e.roleId===roleId)entries.push({id:'event-'+e.id,kind:'promise',title:e.title,detail:e.settledEvidence||e.evidence||'',status:e.status,day:e.dueDay,revision:Number(e.createdRevision||e.revision||0)})
 for(const row of data.journal||[])for(const[cIndex,c]of (row.changes||[]).entries())if(c.roleId===roleId){entries.push({id:'journal-'+row.revision+'-'+cIndex,kind:'memory',title:c.reason||'关系变化',detail:c.evidence||'',revision:row.revision});for(const rank of c.ranks||[])if(rank.from?.level!=null&&rank.to?.level!=null&&rank.from.level!==rank.to.level)entries.push({id:'rank-'+row.revision+'-'+cIndex+'-'+rank.key,kind:'milestone',title:(rank.to?.title||'新的称号')+' · Lv.'+rank.to?.level,detail:c.reason||'',revision:row.revision})}
 return entries.sort((a,b)=>b.revision-a.revision)
}

export function belongsToCharacter(row:any,roleId:string){
 const explicit=[row.roleId,row.role,row.routeRoleId].find(v=>typeof v==='string'&&v)
 if(explicit)return explicit===roleId
 return row.route===roleId||row.route==='route-'+roleId||[row.art,row.key].some(v=>typeof v==='string'&&(v==='cg-'+roleId||v.startsWith('cg-'+roleId+'-')))
}
