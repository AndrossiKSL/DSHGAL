// Preserve authored text exactly; the view supplies the real font/box measurement.
export function graphemes(text:string):string[]{
 const Segmenter=(Intl as any).Segmenter
 return Segmenter?[...new Segmenter('zh-CN',{granularity:'grapheme'}).segment(text)].map((s:any)=>s.segment):Array.from(text)
}
export function paginateText(text:string,fits:(value:string)=>boolean):string[]{
 const chars=graphemes(text),pages:string[]=[]
 for(let start=0;start<chars.length;){
  let lo=start+1,hi=chars.length,end=lo
  while(lo<=hi){const mid=(lo+hi)>>1;if(fits(chars.slice(start,mid).join(''))){end=mid;lo=mid+1}else hi=mid-1}
  if(end<chars.length){
   const floor=start+Math.max(1,Math.floor((end-start)*.55))
   for(let i=end-1;i>=floor-1;i--)if(/[。！？!?；;\n]/u.test(chars[i])){end=i+1;break}
   while(end>start+1&&/[（「『“‘《【]$/u.test(chars[end-1]))end--
   while(end<chars.length&&/^[，。！？、；：）》」』”’】!?.,;:]/u.test(chars[end])&&fits(chars.slice(start,end+1).join('')))end++
   while(end>start+1&&/^[，。！？、；：）》」』”’】!?.,;:]/u.test(chars[end]))end--
  }
  pages.push(chars.slice(start,end).join(''));start=end
 }
 return pages
}
