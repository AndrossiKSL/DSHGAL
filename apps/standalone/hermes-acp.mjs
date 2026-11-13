import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'

/** Small ACP transport. Hermes keeps model credentials and tool policy. */
export class HermesACP {
 constructor({command='hermes',onUpdate=()=>{},onPermission=async()=>null,spawnProcess=spawn}={}){
  this.pending=new Map();this.sequence=0;this.onUpdate=onUpdate;this.onPermission=onPermission
  this.child=spawnProcess(command,['acp'],{stdio:['pipe','pipe','pipe'],shell:false,windowsHide:true})
  this.diagnostics='';this.child.stderr.on('data',data=>{this.diagnostics=(this.diagnostics+data).slice(-4000)})
  this.lines=createInterface({input:this.child.stdout})
  this.lines.on('line',line=>{void this.receive(line)})
  this.child.on('error',error=>this.fail(error))
  this.child.on('exit',()=>this.fail(new Error('Hermes ACP 已退出；请检查 Hermes 安装、登录与日志。')))
 }
 fail(error){this.closed=true;for(const {reject,timer} of this.pending.values()){clearTimeout(timer);reject(error)}this.pending.clear()}
 send(message){if(this.closed)throw new Error('Hermes ACP 连接已关闭');this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',...message})+'\n')}
 request(method,params={},timeout=120000){
  return new Promise((resolve,reject)=>{
   const id=++this.sequence,timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(method+' 超时'))},timeout)
   this.pending.set(id,{resolve,reject,timer})
   try{this.send({id,method,params})}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error)}
  })
 }
 async receive(line){
  let message;try{message=JSON.parse(line)}catch{return}
  if(message.method){
   if(message.id!==undefined){
    if(message.method==='session/request_permission'){
     let optionId=null;try{optionId=await this.onPermission(message.params)}catch{}
     if(!this.closed)this.send({id:message.id,result:{outcome:optionId?{outcome:'selected',optionId}:{outcome:'cancelled'}}})
    }else this.send({id:message.id,error:{code:-32601,message:'Client capability unavailable'}})
   }else if(message.method==='session/update')this.onUpdate(message.params)
   return
  }
  const pending=this.pending.get(message.id);if(!pending)return
  clearTimeout(pending.timer);this.pending.delete(message.id)
  if(message.error)pending.reject(new Error(message.error.message||'ACP 请求失败'));else pending.resolve(message.result)
 }
 async initialize(){return this.request('initialize',{protocolVersion:1,clientInfo:{name:'whale-galgame',version:'2.2.0'},clientCapabilities:{fs:{readTextFile:false,writeTextFile:false},terminal:false}})}
 async session(cwd,sessionId){
  if(sessionId){await this.request('session/load',{cwd,sessionId,mcpServers:[]});return sessionId}
  const result=await this.request('session/new',{cwd,mcpServers:[]})
  if(!result?.sessionId)throw new Error('Hermes 没有返回会话 ID')
  return result.sessionId
 }
 prompt(sessionId,text){return this.request('session/prompt',{sessionId,prompt:[{type:'text',text}]},20*60*1000)}
 cancel(sessionId){if(!this.closed)this.send({method:'session/cancel',params:{sessionId}})}
 close(){this.fail(new Error('ACP 客户端已关闭'));this.lines.close();this.child.stdin.end();this.child.kill()}
}
