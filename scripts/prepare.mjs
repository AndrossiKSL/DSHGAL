import {spawnSync} from 'node:child_process'
if(process.env.npm_config_ignore_scripts!=='true'){
 const npm=process.env.npm_execpath
 if(!npm)throw new Error('Run via npm')
 const result=spawnSync(process.execPath,[npm,'run','build'],{stdio:'inherit'})
 if(result.error)throw result.error
 process.exitCode=result.status||0
}
