// SPDX-License-Identifier: GPL-3.0-only
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dhun', Object.freeze({
  search: query => ipcRenderer.invoke('dhun:search', query),
  stream: id => ipcRenderer.invoke('dhun:stream', id),
  pickFiles: () => ipcRenderer.invoke('dhun:files'),
  releases: () => ipcRenderer.invoke('dhun:releases'),
  version: () => ipcRenderer.invoke('dhun:version'),
}));
