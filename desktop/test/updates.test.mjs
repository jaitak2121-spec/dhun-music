import test from 'node:test';
import assert from 'node:assert/strict';
import { newerVersion, installerURL, checkDesktopUpdate } from '../updates.mjs';
test('optional updates compare numeric versions and select only known platform installers', async () => {
  assert.equal(newerVersion('0.10.0', '0.2.0'), true);
  assert.equal(newerVersion('0.2.0', '0.2.0'), false);
  assert.equal(newerVersion('1.0.0-beta', '1.0.0'), false);
  assert.equal(newerVersion('1.0.0', '1.0.0-beta'), true);
  assert.equal(newerVersion('malformed', '0.2.0'), false);
  assert.match(installerURL('darwin', 'arm64'), /Dhun-Mac-arm64\.dmg$/);
  assert.match(installerURL('darwin', 'x64'), /Dhun-Mac-x64\.dmg$/);
  assert.match(installerURL('win32', 'x64'), /Dhun-Windows-x64\.exe$/);
  assert.throws(() => installerURL('darwin', '../file'));
  const update = await checkDesktopUpdate('0.2.0', 'win32', 'x64', async () => Response.json({ version: '0.3.0', url: 'https://untrusted.example/file' }));
  assert.equal(update.available, true); assert.match(update.url, /^https:\/\/github.com\//);
  await assert.rejects(checkDesktopUpdate('0.2.0', 'win32', 'x64', async () => new Response('', { status: 404 })), /unavailable/);
});
