export const DIRECTOR_ACTIONS=['neutral','attentive','joy','shy','surprise','explain','annoyed','sad','thinking','comfort','proud','goodbye']
const bounded=(v:any,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback
export function normalizeDirection(value:any,roleId:string,action:string,roles:string[]):any {
  const allowed=new Set(roles),seen=new Set<string>(),cast:any[]=[],entries=Array.isArray(value?.cast)?value.cast:[]
  for(const entry of entries.slice(0,6)){
    if(!allowed.has(entry?.role)||seen.has(entry.role))continue
    seen.add(entry.role);cast.push({role:entry.role,action:DIRECTOR_ACTIONS.includes(entry.action)?entry.action:'neutral',x:bounded(entry.x,15,85,50),scale:bounded(entry.scale,.75,1.2,1),enter:'fade'})
    if(cast.length===3)break
  }
  if(!cast.length)cast.push({role:roleId,action:DIRECTOR_ACTIONS.includes(action)?action:'neutral',x:50,scale:1,enter:'fade'})
  cast.forEach((c,i)=>{if(!entries.find((e:any)=>e?.role===c.role&&typeof e.x==='number'))c.x=cast.length===1?50:cast.length===2?[32,68][i]:[23,50,77][i]})
  const speaker=cast.some(c=>c.role===value?.speaker)?value.speaker:cast.some(c=>c.role===roleId)?roleId:cast[0].role
  return {speaker,cast,transition:['cut','fade','dissolve'].includes(value?.transition)?value.transition:'fade',durationMs:120,cgAssetId:typeof value?.cgAssetId==='string'?value.cgAssetId.slice(0,100):''}
}
