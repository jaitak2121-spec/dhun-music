// SPDX-License-Identifier: GPL-3.0-only
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dhun', Object.freeze({
  search: query => ipcRenderer.invoke('dhun:search', query),
  stream: id => ipcRenderer.invoke('dhun:stream', id),
  lyrics: track => ipcRenderer.invoke('dhun:lyrics', track),
  pickFiles: () => ipcRenderer.invoke('dhun:files'),
  releases: () => ipcRenderer.invoke('dhun:releases'),
  version: () => ipcRenderer.invoke('dhun:version'),
  updates: () => ipcRenderer.invoke('dhun:updates'),
  downloadUpdate: () => ipcRenderer.invoke('dhun:downloadUpdate'),
}));
