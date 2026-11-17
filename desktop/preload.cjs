// SPDX-License-Identifier: GPL-3.0-only
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dhun', Object.freeze({
  playbackReady: () => ipcRenderer.invoke('dhun:playbackReady'),
  onPlaybackCommand: callback => {
    const listener=(_event,command)=>{if(['play','pause','next','previous'].includes(command))callback(command);};
    ipcRenderer.on('dhun:playback-command',listener);
    return()=>ipcRenderer.removeListener('dhun:playback-command',listener);
  },
  usageStatus: () => ipcRenderer.invoke('dhun:usageStatus'),
  usageSet: value => ipcRenderer.invoke('dhun:usageSet',value),
  search: query => ipcRenderer.invoke('dhun:search', query),
  suggest: query => ipcRenderer.invoke('dhun:suggest',query),
  recommendations: taste => ipcRenderer.invoke('dhun:recommendations', taste),
  radio: id => ipcRenderer.invoke('dhun:radio', id),
  stream: id => ipcRenderer.invoke('dhun:stream', id),
  lyrics: track => ipcRenderer.invoke('dhun:lyrics', track),
  pickFiles: () => ipcRenderer.invoke('dhun:files'),
  releases: () => ipcRenderer.invoke('dhun:releases'),
  version: () => ipcRenderer.invoke('dhun:version'),
  updates: () => ipcRenderer.invoke('dhun:updates'),
  downloadUpdate: () => ipcRenderer.invoke('dhun:downloadUpdate'),
  cloudAccount: () => ipcRenderer.invoke('dhun:cloudAccount'),
  cloudStatus: () => ipcRenderer.invoke('dhun:cloudStatus'),
  cloudConnect: () => ipcRenderer.invoke('dhun:cloudConnect'),
  cloudPoll: () => ipcRenderer.invoke('dhun:cloudPoll'),
  cloudBackup: () => ipcRenderer.invoke('dhun:cloudBackup'),
  cloudUpload: backup => ipcRenderer.invoke('dhun:cloudUpload',backup),
  cloudRestore: () => ipcRenderer.invoke('dhun:cloudRestore'),
  cloudDisconnect: () => ipcRenderer.invoke('dhun:cloudDisconnect'),
  cloudManage: () => ipcRenderer.invoke('dhun:cloudManage'),
}));
