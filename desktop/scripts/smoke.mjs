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
  await page.getByRole('button', { name: 'Add current track to favourites' }).click();
  await page.getByRole('button', { name: 'Favourites', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play Dhun test tone' })).toBeVisible();
  await page.getByRole('button', { name: 'Make it yours' }).click();
  await page.getByRole('button', { name: 'Indigo', exact: true }).click();
  await page.getByLabel('Appearance', { exact: true }).selectOption('light');
  await page.getByLabel('Reduce animation').check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'indigo');
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
  await expect(page.locator('#intro')).toHaveCount(0);
  await page.getByRole('button', { name: 'Favourites', exact: true }).click();
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
    console.log('PASS: live YouTube search, engine audio transfer and Electron playback.');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Discover', exact: true }).click();
  await page.getByRole('button', { name: 'Make it yours' }).click();
  await page.getByRole('button', { name: 'Monochrome', exact: true }).click();
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.screenshot({ path: 'smoke-desktop.png' });
  if (failures.length) throw Error(failures.join('\n'));
  console.log('PASS: desktop launch, file import, audio playback, seek, pause, favourites, queue removal, theme persistence and reduced motion.');
} finally {
  await application?.close();
  await rm(directory, { recursive: true, force: true });
}
