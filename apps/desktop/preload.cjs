const {contextBridge,ipcRenderer}=require('electron')

// A single game action crosses the isolation boundary. No general IPC or Node API.
contextBridge.exposeInMainWorld('DSHGALDesktop',Object.freeze({
 quit:()=>ipcRenderer.send('dshgal:quit'),
}))
