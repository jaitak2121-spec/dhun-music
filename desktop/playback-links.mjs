// SPDX-License-Identifier: GPL-3.0-only
/** External links can control transport only, never supply media URLs or paths. */
export function playbackCommand(value){
  if(typeof value!=='string'||value.length>80)return null;
  return /^dhun-music:\/\/(play|pause|next|previous)\/?$/.exec(value)?.[1]||null;
}
