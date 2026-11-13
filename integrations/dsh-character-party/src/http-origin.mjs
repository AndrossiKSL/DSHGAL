const loopbackHost=host=>['localhost','127.0.0.1','[::1]'].includes(host)
const loopbackPeer=address=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address)

// Some local browsers strip the port from Origin. Accept that variant only
// when browser-owned fetch metadata confirms same-origin and both ends are local.
export function sameOriginRequest(req){
 const raw=req.headers.origin,host=req.headers.host
 if(raw===undefined)return true
 if(typeof raw!=='string'||typeof host!=='string')return false
 try{
  const source=new URL(raw)
  if(!['http:','https:'].includes(source.protocol)||source.username||source.password||source.pathname!=='/'||source.search||source.hash)return false
  const target=new URL(source.protocol+'//'+host)
  if(target.origin===source.origin)return true
  const protocol=req.socket?.encrypted?'https:':'http:'
  return source.protocol===protocol&&source.hostname===target.hostname&&loopbackHost(target.hostname)&&!!target.port&&!source.port&&req.headers['sec-fetch-site']==='same-origin'&&loopbackPeer(req.socket?.remoteAddress)
 }catch{return false}
}
