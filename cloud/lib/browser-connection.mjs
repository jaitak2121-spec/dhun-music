import {createHmac,timingSafeEqual} from 'node:crypto';
export const approvalCookie='dhun-browser-approval';
function signature(value){if(!process.env.DHUN_COOKIE_SECRET)throw Error('Cookie signing unavailable.');return createHmac('sha256',process.env.DHUN_COOKIE_SECRET).update('browser-approval:'+value).digest('base64url');}
export function browserApproval(code,now=Date.now()){
  const value=code+'.'+(now+300000);return value+'.'+signature(value);
}
export function hasBrowserApproval(value,code,now=Date.now()){
  if(typeof value!=='string'||!/^[A-F0-9]{8}$/.test(code))return false;
  const parts=value.split('.');if(parts.length!==3||!/^[A-Za-z0-9_-]{43}$/.test(parts[2])||parts[0]!==code||!/^\d{13}$/.test(parts[1])||Number(parts[1])<=now||Number(parts[1])>now+300000)return false;
  const expected=signature(parts.slice(0,2).join('.'));
  return parts[2].length===expected.length&&timingSafeEqual(Buffer.from(parts[2]),Buffer.from(expected));
}
