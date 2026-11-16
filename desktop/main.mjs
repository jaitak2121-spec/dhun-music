// SPDX-License-Identifier: GPL-3.0-only
import { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol, session, shell } from 'electron';
import { execFile } from 'node:child_process';
import { createReadStream, rmSync } from 'node:fs';
import { readFile, writeFile, stat, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validId, searchTerm, tracksFromSearch, discoveryQueries, diverseTracks, RELEASES } from './model.mjs';
import { getLyrics, parseLrc } from './lyrics.mjs';
import { checkDesktopUpdate, installerURL } from './updates.mjs';
import { cloudAccount,cloudStatus,cloudConnect,cloudPoll,cloudBackup,cloudUpload,cloudDisconnect,cloudManage } from './cloud.mjs';
import {searchSuggestions} from './search-suggestions.mjs';

import {usageClient} from './usage.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const player = path.join(app.isPackaged ? process.resourcesPath : path.join(root, 'resources'), 'player', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const localFiles = new Map();
const bufferedFiles = new Map();
const children = new Set();
let window;
let searching;
let discoveryGeneration=0;
protocol.registerSchemesAsPrivileged([{ scheme: 'dhun', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
app.setName('Dhun');
if (process.env.DHUN_SMOKE === '1') app.setPath('userData', path.join(app.getPath('temp'), `dhun-smoke-${process.pid}`));
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { window?.show(); window?.focus(); });

function extract(args, isSearch = false, timeout) {
  if (isSearch) searching?.kill();
  if (children.size >= 4) throw Error('Please wait for the current request to finish.');
  return new Promise((resolve, reject) => {
    const child = execFile(player, [
      '--ignore-config', '--no-playlist', '--no-warnings', '--no-progress',
      '--socket-timeout', '15', '--retries', '1', '--no-cache-dir',
      '--js-runtimes', `node:${process.execPath}`, ...args,
    ], { timeout: timeout ?? (isSearch ? 60000 : 120000), maxBuffer: 4 * 1024 * 1024, windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } }, (error, stdout) => {
      children.delete(child);
      if (searching === child) searching = null;
      if (error) reject(Error(error.code === 'ENOENT' ? 'Playback engine is missing. Reinstall the latest Dhun desktop preview.' : 'The music source is unavailable. Check your connection or try another track.'));
      else resolve(stdout.trim());
    });
    children.add(child);
    if (isSearch) searching = child;
  });
}
function handle(name, action) {
  ipcMain.handle(`dhun:${name}`, async (event, ...args) => {
    if (event.senderFrame !== window?.webContents.mainFrame || event.senderFrame.url !== 'dhun://app/index.html') throw Error('Untrusted sender');
    try { return { ok: true, data: await action(...args) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
}
async function serve(request) {
  const url = new URL(request.url);
  if (url.hostname === 'app') {
    const allowed = ['index.html', 'style.css', 'library.css', 'app.mjs', 'model.mjs', 'search-suggestions.mjs', 'logo.svg'];
    const name = url.pathname.slice(1);
    if (!allowed.includes(name)) return new Response('Not found', { status: 404 });
    const file = ['model.mjs','search-suggestions.mjs'].includes(name) ? path.join(root, name) : path.join(root, 'renderer', name);
    return net.fetch(pathToFileURL(file).href);
  }
  const key = url.pathname.slice(1);
  const file = url.hostname === 'audio' ? localFiles.get(key) || bufferedFiles.get(key) : null;
  if (!file) return new Response('Not found', { status: 404 });
  try {
    const { size } = await stat(file);
    const range = request.headers.get('range');
    const match = range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range && !match) return new Response(null, { status: 416 });
    const start = match ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    const headers = { 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), 'Content-Type': ({ '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg' })[path.extname(file).toLowerCase()] || 'application/octet-stream' };
    if (match) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    return new Response(Readable.toWeb(createReadStream(file, { start, end })), { status: match ? 206 : 200, headers });
  } catch { return new Response('File unavailable', { status: 404 }); }
}
app.whenReady().then(async () => {
const bufferDirectory = await mkdtemp(path.join(app.getPath('temp'), 'dhun-playback-'));
const localStore = path.join(app.getPath('userData'), 'local-files.json');
try {
  const saved = JSON.parse(await readFile(localStore, 'utf8'));
  if (Array.isArray(saved)) for (const [id, file] of saved) if (typeof id === 'string' && typeof file === 'string') localFiles.set(id, file);
} catch { /* First launch: no imported files. */ }
const usage=usageClient({file:path.join(app.getPath('userData'),'usage.json'),platform:process.platform==='win32'?'windows':'mac',version:app.getVersion()});
handle('usageStatus',usage.status);
handle('usageSet',usage.set);
protocol.handle('dhun', serve);
handle('cloudStatus',cloudStatus);
handle('cloudAccount',cloudAccount);
handle('cloudConnect',cloudConnect);
handle('cloudPoll',cloudPoll);
handle('cloudBackup',cloudBackup);
handle('cloudUpload',async backup=>{
  const result=await dialog.showMessageBox(window,{type:'question',title:'Upload Dhun backup?',message:'Replace your cloud backup with this device’s online favourites and appearance settings?',detail:'Local music files and listening history are excluded. Other devices can restore this backup. Your existing cloud backup will be replaced.',buttons:['Cancel','Upload backup'],defaultId:0,cancelId:0});
  if(result.response!==1)return{cancelled:true};return cloudUpload(backup);
});
handle('cloudRestore',async()=>{
  const data=await cloudBackup();if(!data.profile?.preferences)throw Error('There is no saved backup to restore.');
  const result=await dialog.showMessageBox(window,{type:'question',title:'Restore Dhun backup?',message:`Merge ${data.profile.favourites.length} cloud favourites into this device and restore appearance settings?`,detail:'Existing favourites and local music are kept. Duplicate songs are merged. No music files will be deleted.',buttons:['Cancel','Restore backup'],defaultId:0,cancelId:0});
  return result.response===1?data:{cancelled:true};
});
handle('cloudDisconnect',cloudDisconnect);
handle('cloudManage',cloudManage);
session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
session.defaultSession.setPermissionCheckHandler(() => false);
handle('search', async value => tracksFromSearch(JSON.parse(await extract(['--flat-playlist', '--dump-single-json', '--', `ytsearch18:${searchTerm(value)} music`], true))));
handle('suggest', value=>searchSuggestions(value,{language:app.getLocale().split('-')[0]}));
handle('radio', async id => {
  if (!validId(id)) throw Error('Invalid station seed.');
  return tracksFromSearch(JSON.parse(await extract(['--flat-playlist','--yes-playlist','--playlist-end','30','--dump-single-json','--',`https://www.youtube.com/watch?v=${id}&list=RD${id}`],false,20000)));
});
handle('recommendations', async taste => {
  const queries=[...discoveryQueries(taste),[taste.language,taste.genres,'new music discoveries'].filter(Boolean).join(' ')],generation=++discoveryGeneration,batches=[];
  let failure;
  // Two catalogue processes at once leave capacity for actual audio playback.
  for(let i=0;i<queries.length;i+=2){
    if(generation!==discoveryGeneration)return[];
    const results=await Promise.all(queries.slice(i,i+2).map(async query=>{
      try{return tracksFromSearch(JSON.parse(await extract(['--flat-playlist','--dump-single-json','--',`ytsearch12:${query}`],false,12000)));}
      catch(error){failure=error;return[];}
    }));
    batches.push(...results.filter(batch=>batch.length));
  }
  if(generation!==discoveryGeneration)return[];
  if(!batches.length&&failure)throw failure;
  return diverseTracks(batches);
});
async function bufferStream(id) {
  if (!validId(id)) throw Error('Invalid track. Search for it again.');
  const key = `stream-${id}`;
  if (!bufferedFiles.has(key)) {
    // Keep extraction and transport in the same engine: signed audio URLs can
    // reject requests from a different network client. Buffer first for reliable seeking.
    if (bufferedFiles.size >= 10) {
      const [oldKey, oldFile] = bufferedFiles.entries().next().value;
      try { rmSync(oldFile, { force: true }); bufferedFiles.delete(oldKey); } catch { /* An active Windows file may still be open. */ }
    }
    const output = path.join(bufferDirectory, `${id}.m4a`);
    await extract(['--quiet', '--no-simulate', '--max-filesize', '64M', '-f', 'bestaudio[ext=m4a]', '-o', output, '--', `https://www.youtube.com/watch?v=${id}`]);
    const info = await stat(output).catch(() => null);
    if (!info?.size) throw Error('This track is unavailable or exceeds the 64 MB playback buffer. Try another result.');
    bufferedFiles.set(key, output);
  }
  return `dhun://audio/${key}`;
}
const pendingStreams = new Map();
handle('stream', id => {
  if (!validId(id)) throw Error('Invalid track.');
  if (!pendingStreams.has(id)) pendingStreams.set(id, bufferStream(id).finally(() => pendingStreams.delete(id)));
  return pendingStreams.get(id);
});
handle('files', async () => {
  const result = await dialog.showOpenDialog(window, { title: 'Add music to Dhun', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'wav', 'flac', 'ogg', 'opus'] }] });
  const tracks = result.filePaths.map(file => {
    const id = createHash('sha256').update(file).digest('hex');
    localFiles.set(id, file);
    return { id, title: path.basename(file, path.extname(file)), artist: 'On this device', duration: 0, local: true };
  });
  await writeFile(localStore, JSON.stringify([...localFiles]), { mode: 0o600 });
  return tracks;
});
handle('lyrics', async track => {
  if (track?.local) {
    const audio = localFiles.get(track.id);
    if (!audio) throw Error('Add this local song again before loading lyrics.');
    const file = path.join(path.dirname(audio), `${path.basename(audio, path.extname(audio))}.lrc`);
    const info = await stat(file).catch(() => null);
    if (info?.size && info.size <= 1_000_000) {
      const lines = parseLrc(await readFile(file, 'utf8'));
      if (lines.some(line => line.text)) return { source: 'Local LRC', synced: true, instrumental: false, lines };
    }
    return null; // Network lookup is a separate, explicit search for local files.
  }
  return getLyrics(track);
});
handle('releases', () => shell.openExternal(RELEASES));
handle('version', () => app.getVersion());
handle('updates', () => checkDesktopUpdate(app.getVersion(), process.platform, process.arch));
handle('downloadUpdate', () => shell.openExternal(installerURL(process.platform, process.arch)));
Menu.setApplicationMenu(Menu.buildFromTemplate([
  ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
  { label: 'File', submenu: [{ role: 'close' }, ...(process.platform !== 'darwin' ? [{ role: 'quit' }] : [])] },
  { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
  { role: 'help', submenu: [{ label: 'Dhun downloads and source', click: () => shell.openExternal(RELEASES) }] },
]));
function createWindow() {
  window = new BrowserWindow({ width: 1320, height: 880, minWidth: 900, minHeight: 650, title: 'Dhun', backgroundColor: '#080808',
    icon: path.join(root, 'renderer/logo.svg'), show: false,
    webPreferences: { preload: path.join(root, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.on('focus',()=>{void usage.foreground();});
  window.once('ready-to-show', () => window.show());
  window.loadURL('dhun://app/index.html');
}
createWindow();
app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { for (const child of children) child.kill(); try { rmSync(bufferDirectory, { recursive: true, force: true }); } catch { /* OS cleanup will handle an in-use temporary file. */ } });
}).catch(error => { console.error('Dhun startup failed:', error.message); app.quit(); });
