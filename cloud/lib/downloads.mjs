export const installers = Object.freeze({android:'Dhun.apk',windows:'Dhun-Windows-x64.exe','mac-arm64':'Dhun-Mac-arm64.dmg','mac-x64':'Dhun-Mac-x64.dmg'});
export function installerTarget(platform) {
  return Object.hasOwn(installers,platform) ? 'https://github.com/jaitak2121-spec/dhun-music/releases/download/preview/'+installers[platform] : null;
}
