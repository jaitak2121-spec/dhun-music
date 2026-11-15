// Tests the real Electron preload, file picker IPC, protocol and HTML audio pipeline.
import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = await mkdtemp(path.join(tmpdir(), 'dhun-audio-'));
const fixture = path.join(directory, 'Dhun test tone.wav');
const samples = 44100 * 12;
const wave = Buffer.alloc(44 + samples * 2);
wave.write('RIFF'); wave.writeUInt32LE(wave.length - 8, 4); wave.write('WAVEfmt ', 8); wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22); wave.writeUInt32LE(44100, 24); wave.writeUInt32LE(88200, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34); wave.write('data', 36); wave.writeUInt32LE(samples * 2, 40);
// Quiet tone, used only by this test. No downloaded or copyrighted media.
for (let i = 0; i < samples; i++) wave.writeInt16LE(Math.round(Math.sin(i / 44100 * Math.PI * 440 * 2) * 50), 44 + i * 2);
await writeFile(fixture, wave);
await writeFile(path.join(directory, 'Dhun test tone.lrc'), '[00:00.05]A quiet beginning\n[00:03.00]Another moment\n[00:08.00]');
let application;
try {
  application = await electron.launch({
    ...(process.env.DHUN_SMOKE_APP ? { executablePath: path.resolve(process.env.DHUN_SMOKE_APP), args: [] } : { args: ['.'] }),
    timeout: 30000, env: { ...process.env, DHUN_SMOKE: '1' },
  });
  const page = await application.firstWindow();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await expect(page.getByRole('heading', { name: 'Discover', exact: true })).toBeVisible();
  await expect(page.locator('#intro')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('body')).not.toContainText('Doll Bloom');
  await application.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, fixture);
  await page.getByRole('button', { name: 'Add local music' }).click();
  await expect(page.getByRole('button', { name: 'Play Dhun test tone' })).toBeVisible();
  await page.getByRole('button', { name: 'Play Dhun test tone' }).click();
  await expect.poll(() => page.locator('#audio').evaluate(audio => audio.currentTime)).toBeGreaterThan(.15);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => page.locator('#audio').evaluate(audio => audio.paused)).toBe(true);
  await page.locator('#seek').fill('5');
  await expect.poll(() => page.locator('#audio').evaluate(audio => audio.currentTime)).toBeGreaterThan(4);
  await page.getByRole('button', { name: 'Show lyrics', exact: true }).click();
  await expect(page.locator('#lyrics-credit')).toContainText('Local LRC');
  await expect(page.locator('#lyrics-lines .active')).toHaveText('Another moment');
  await page.getByRole('button', { name: 'A quiet beginning, 0:00', exact: true }).click();
  await expect.poll(() => page.locator('#audio').evaluate(audio => audio.currentTime)).toBeLessThan(1);
  await page.getByRole('button', { name: 'Follow song', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Follow song', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Favourite current track', exact: true }).click();
  await expect(page.locator('#now-like')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Favourites/ }).click();
  await expect(page.getByRole('button', { name: 'Play Dhun test tone' })).toBeVisible();
  await page.getByLabel('Find a favourite').fill('not a matching song');
  await expect(page.getByRole('heading', { name: 'No matching favourites' })).toBeVisible();
  await page.getByLabel('Find a favourite').fill('');
  await page.getByRole('button', { name: 'Favourite Dhun test tone', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep the songs you love' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play Dhun test tone' })).toBeVisible();
  await expect(page.locator('#now-like')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'On this device', exact: true }).click();
  const heart = page.getByRole('button', { name: 'Favourite Dhun test tone', exact: true });
  await heart.focus(); await heart.press('Space');
  await expect(heart).toBeFocused(); await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await heart.press('Space'); await expect(heart).toBeFocused();
  await expect(page.locator('#now-like')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Make it yours' }).click();
  await page.getByRole('button', { name: 'Indigo', exact: true }).click();
  await page.getByLabel('Appearance', { exact: true }).selectOption('light');
  await page.getByLabel('Reduce animation').check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'indigo');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
  await expect(page.locator('#intro')).toHaveCount(0);
  await page.getByRole('button', { name: /^Favourites/ }).click();
  await expect(page.getByRole('button', { name: 'Play Dhun test tone' })).toBeVisible();
  await page.getByRole('button', { name: 'Play Dhun test tone' }).click();
  await expect.poll(() => page.locator('#audio').evaluate(audio => audio.currentTime)).toBeGreaterThan(.1);
  await page.getByRole('button', { name: 'Show play queue' }).click();
  await page.getByRole('button', { name: 'Remove Dhun test tone from queue' }).click();
  await expect(page.locator('#now-title')).toHaveText('Your next favourite awaits');
  if (process.env.DHUN_LIVE_TESTS === '1') {
    await page.getByLabel('Search music', { exact: true }).fill('Daft Punk Give Life Back to Music official audio');
    await page.locator('#search-form').getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.locator('#tracks .track-play').first()).toBeVisible({ timeout: 70000 });
    await page.locator('#tracks .track-play').first().click();
    await expect.poll(() => page.locator('#audio').evaluate(audio => audio.currentTime), { timeout: 130000 }).toBeGreaterThan(.5);
    await page.getByRole('button', { name: 'Show lyrics', exact: true }).click();
    await expect(page.locator('#lyrics-credit')).toContainText('LRCLIB', { timeout: 30000 });
    await expect.poll(() => page.locator('#lyrics-lines .lyric-line').count()).toBeGreaterThan(0);
    console.log('PASS: live YouTube search, engine audio transfer and Electron playback.');
    console.log('PASS: live LRCLIB lyrics shown for the playing online song.');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  // Deterministic UI contract check; source extraction is covered separately by live tests.
  await application.evaluate(({ipcMain})=>{
    ipcMain.removeHandler('dhun:recommendations');
    ipcMain.handle('dhun:recommendations',async()=>({ok:true,data:[
      {id:'abcdefghijk',title:'Discovery fixture one',artist:'Fixture artist one',duration:180},
      {id:'lmnopqrstuv',title:'Discovery fixture two',artist:'Fixture artist two',duration:200},
    ]}));
  });
  await page.getByRole('button',{name:'Choose your music taste',exact:true}).click();
  await page.getByLabel('Music language',{exact:true}).fill('English');
  await page.getByLabel('Up to 3 artists, separated by commas',{exact:true}).fill('Fixture artist');
  await page.getByRole('button',{name:'Save and refresh',exact:true}).click();
  await expect(page.getByRole('button',{name:'Play recommendation Discovery fixture one',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Not interested in Discovery fixture one',exact:true}).click();
  await expect(page.getByRole('button',{name:'Play recommendation Discovery fixture one',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Refresh recommendations',exact:true}).click();
  await expect(page.getByRole('button',{name:'Play recommendation Discovery fixture two',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Play recommendation Discovery fixture one',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Fine-tune your music taste',exact:true}).click();
  await expect(page.getByLabel('Music language',{exact:true})).toHaveValue('English');
  await page.getByRole('button',{name:'Reset preferences and hidden songs',exact:true}).click();
  await expect(page.locator('#discovery-tracks li')).toHaveCount(0);
  await page.getByRole('button', { name: 'Make it yours' }).click();
  await page.getByRole('button', { name: 'Monochrome', exact: true }).click();
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await application.evaluate(() => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (url, options) => String(url).endsWith('/Desktop-build.json') ? Promise.resolve(Response.json({ version: '99.0.0' })) : realFetch(url, options);
  });
  await page.getByRole('button', { name: 'Make it yours' }).click();
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await expect(page.locator('#update-status')).toContainText('99.0.0');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('region', { name: 'Optional update' })).toBeVisible();
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Optional update' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Find your next favourite' })).toBeVisible();
  await page.screenshot({ path: 'smoke-desktop.png' });
  if (failures.length) throw Error(failures.join('\n'));
  console.log('PASS: desktop launch, audio playback, synced local lyrics and seek, favourite counts/filter/undo/keyboard focus/persistence, optional update dismissal, queue removal, themes and reduced motion.');
} finally {
  await application?.close();
  await rm(directory, { recursive: true, force: true });
}
