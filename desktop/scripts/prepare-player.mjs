// SPDX-License-Identifier: GPL-3.0-only
import { createHash } from 'node:crypto';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
const version = '2026.10.26';
const binaries = {
  darwin: ['yt-dlp_macos', '0f922c15ccc0b83eefa1c8bc9104e434318c4bf16e408e1ee93b7745a6efe0aa'],
  win32: ['yt-dlp.exe', 'f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d'],
};
const [asset, checksum] = binaries[process.platform] || [];
if (!asset) throw Error('Desktop packaging currently supports Windows and macOS.');
const root = new URL('../resources/', import.meta.url);
await mkdir(new URL('player/', root), { recursive: true });
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw Error(`Download failed: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
const bytes = await download(`https://github.com/yt-dlp/yt-dlp/releases/download/${version}/${asset}`);
if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw Error('Playback binary checksum mismatch.');
const target = new URL(`player/${process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'}`, root);
await writeFile(target, bytes); await chmod(target, 0o755);
for (const [remote, local] of [['LICENSE', 'yt-dlp-LICENSE'], ['THIRD_PARTY_LICENSES.txt', 'THIRD_PARTY_LICENSES.txt']]) {
  await writeFile(new URL(local, root), await download(`https://raw.githubusercontent.com/yt-dlp/yt-dlp/${version}/${remote}`));
}
console.log(`Verified yt-dlp ${version} for ${process.platform}: ${checksum}`);
