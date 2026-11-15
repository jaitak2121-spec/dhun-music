// SPDX-License-Identifier: GPL-3.0-only
import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { safeStorage, app, shell } from 'electron';
export const CLOUD_URL='https://dhun-cloud.vercel.app';
let pending;
const tokenFile=()=>path.join(app.getPath('userData'),'cloud-session.enc');
function requireStorage(){if(!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend?.()==='basic_text')throw Error('Secure system storage is unavailable. Cloud connection is disabled on this device.');}
async function token(){try{const data=await readFile(tokenFile());requireStorage();return safeStorage.decryptString(data);}catch(error){if(error.code==='ENOENT')return null;throw Error('Your saved cloud connection could not be opened. Disconnect and reconnect.');}}
async function api(action,body,credential){
  const response=await fetch(`${CLOUD_URL}/api/cloud/${action}`,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(credential?{authorization:`Bearer ${credential}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000),redirect:'error'});
  let data;try{data=await response.json();}catch{throw Error('Dhun Cloud is not available. Please try later.');}
  if(!response.ok)throw Error(data.error || 'Cloud request failed.');return data;
}
export async function cloudStatus(){return{connected:Boolean(await token())};}
export async function cloudConnect(){
  requireStorage();if(await token())throw Error('Disconnect the existing cloud account first.');
  const data=await api('connect-start',{name:`Dhun desktop · ${process.platform==='darwin'?'Mac':'Windows'}`});
  const url=new URL(data.verificationUrl);
  if(url.origin!==CLOUD_URL||!/^\?connect=[A-F0-9]{8}$/.test(url.search)||typeof data.deviceCode!=='string')throw Error('Invalid cloud connection response.');
  pending={secret:data.deviceCode,expires:Date.now()+300000};
  await shell.openExternal(url.href);
  return{code:data.userCode};
}
export async function cloudPoll(){
  if(!pending||Date.now()>pending.expires){pending=null;throw Error('Connection expired. Try connecting again.');}
  const data=await api('connect-poll',{deviceCode:pending.secret});
  if(data.pending)return{pending:true};
  if(typeof data.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(data.token))throw Error('Invalid cloud session.');
  requireStorage();await writeFile(tokenFile(),safeStorage.encryptString(data.token),{mode:0o600});pending=null;return{connected:true};
}
export async function cloudBackup(){const secret=await token();if(!secret)throw Error('Connect your Dhun account first.');return api('device-backup',undefined,secret);}
export async function cloudUpload(backup){const secret=await token();if(!secret)throw Error('Connect your Dhun account first.');return api('device-backup',backup,secret);}
export async function cloudDisconnect(){
  const secret=await token();
  if(secret)await api('device-disconnect',{},secret);
  await unlink(tokenFile()).catch(error=>{if(error.code!=='ENOENT')throw error;});pending=null;return{connected:false};
}
export const cloudManage=()=>shell.openExternal(CLOUD_URL);
