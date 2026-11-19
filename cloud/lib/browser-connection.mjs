import {ACCOUNT_ACTIVITY_POLICY_VERSION} from './account-activity.mjs';
import {createHmac,timingSafeEqual} from 'node:crypto';
export const approvalCookie='dhun-browser-approval';
function signature(value){if(!process.env.DHUN_COOKIE_SECRET)throw Error('Cookie signing unavailable.');return createHmac('sha256',process.env.DHUN_COOKIE_SECRET).update('browser-approval:'+value).digest('base64url');}
export function browserApproval(code,now=Date.now(),activity=false){
  const value=code+'.'+(now+300000)+(activity?'.'+ACCOUNT_ACTIVITY_POLICY_VERSION:'');return value+'.'+signature(value);
}
export function hasBrowserApproval(value,code,now=Date.now()){
  if(typeof value!=='string'||!/^[A-F0-9]{8}$/.test(code))return false;
  const parts=value.split('.');if(![3,4].includes(parts.length)||(parts.length===4&&parts[2]!==ACCOUNT_ACTIVITY_POLICY_VERSION)||!/^[A-Za-z0-9_-]{43}$/.test(parts.at(-1))||parts[0]!==code||!/^\d{13}$/.test(parts[1])||Number(parts[1])<=now||Number(parts[1])>now+300000)return false;
  const expected=signature(parts.slice(0,-1).join('.'));
  return parts.at(-1).length===expected.length&&timingSafeEqual(Buffer.from(parts.at(-1)),Buffer.from(expected));
}

export function browserActivityApproval(value,code,now=Date.now()){return hasBrowserApproval(value,code,now)&&value.split('.').length===4?ACCOUNT_ACTIVITY_POLICY_VERSION:null;}
