// SPDX-License-Identifier: GPL-3.0-only
import {searchTerm} from './model.mjs';
export function mergeSuggestions(input, recent=[], remote=[]) {
  const query=String(input||'').trim().slice(0,160),seen=new Set();
  const candidates=query?[query,...recent.filter(s=>typeof s==='string'&&s.toLowerCase().includes(query.toLowerCase())),...remote]:recent;
  return candidates.filter(s=>typeof s==='string').map(s=>s.trim().slice(0,160)).filter(s=>{
    const key=s.toLowerCase();if(!s||/[\u0000-\u001f]/.test(s)||seen.has(key))return false;seen.add(key);return true;
  }).slice(0,8);
}
const cache=new Map();
export async function searchSuggestions(input,{fetcher=fetch,language='en'}={}) {
  const query=searchTerm(input);if(query.length<2)return[];
  const key=`${language}:${query.toLowerCase()}`,saved=cache.get(key);
  if(saved&&saved.expires>Date.now())return saved.items;
  const url=new URL('https://suggestqueries.google.com/complete/search');
  url.search=new URLSearchParams({client:'firefox',ds:'yt',q:query,hl:/^[a-z]{2,3}$/.test(language)?language:'en'}).toString();
  try{
    const response=await fetcher(url,{signal:AbortSignal.timeout(4000),redirect:'error'});
    if(!response.ok)return[];
    const text=await response.text();if(text.length>65536)return[];
    const data=JSON.parse(text);
    const completions=mergeSuggestions('',Array.isArray(data?.[1])?data[1]:[]);
    if(cache.size>=50)cache.delete(cache.keys().next().value);
    cache.set(key,{items:completions,expires:Date.now()+300000});return completions;
  }catch{return[];}
}
