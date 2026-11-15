// SPDX-License-Identifier: GPL-3.0-only
export const RELEASE_ROOT = 'https://github.com/jaitak2121-spec/dhun-music/releases/download/preview';
export function newerVersion(latest, current) {
  const parse = value => typeof value === 'string' && /^(\d+)\.(\d+)\.(\d+)(-[A-Za-z0-9.-]+)?$/.exec(value);
  const left = parse(latest), right = parse(current);
  if (!left || !right) return false;
  for (let i = 1; i <= 3; i++) if (Number(left[i]) !== Number(right[i])) return Number(left[i]) > Number(right[i]);
  return Boolean(right[4]) && !left[4];
}
export function installerURL(platform, arch) {
  const file = platform === 'win32' && arch === 'x64' ? 'Dhun-Windows-x64.exe' : platform === 'darwin' && ['arm64', 'x64'].includes(arch) ? `Dhun-Mac-${arch}.dmg` : null;
  if (!file) throw Error('No installer is available for this platform.');
  return `${RELEASE_ROOT}/${file}`;
}
export async function checkDesktopUpdate(current, platform, arch, fetcher = fetch) {
  const response = await fetcher(`${RELEASE_ROOT}/Desktop-build.json`, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('Update checks are unavailable. You can still open Downloads and check manually.');
  const text = await response.text();
  if (text.length > 100000) throw Error('Invalid update metadata.');
  const metadata = JSON.parse(text);
  if (typeof metadata.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(metadata.version)) throw Error('Update metadata is not available for this preview yet.');
  return { available: newerVersion(metadata.version, current), version: metadata.version, url: installerURL(platform, arch) };
}
