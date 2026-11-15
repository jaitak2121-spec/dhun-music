// SPDX-License-Identifier: GPL-3.0-only
import { nextIndex } from './model.mjs';
const $ = selector => document.querySelector(selector);
const icons = {
  discover: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  heart: '<path d="M20.8 5.6c-2-2-5.1-1.6-6.8.4L12 8l-2-2C8.3 4 5.2 3.6 3.2 5.6c-2.1 2.2-1.5 5.4.4 7.4L12 21l8.4-8c1.9-2 2.5-5.2.4-7.4Z"/>',
  history: '<path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7m2-5v6l4 2"/>',
  folder: '<path d="M3 7V5h6l2 3h10v12H3V7Z"/>',
  queue: '<path d="M3 6h14M3 12h14M3 18h8m5-2 5 3-5 3Z"/>',
  settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="16" rx="3" ry="3"/>',
  shuffle: '<path d="M3 5h3c5 0 7 14 12 14h3m-4-4 4 4-4 4M3 19h3c2 0 3-2 4-4m4-6c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
  previous: '<path d="M5 4v16M19 5 8 12l11 7Z"/>', next: '<path d="M19 4v16M5 5l11 7-11 7Z"/>',
  play: '<path d="m8 4 13 8-13 8Z"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  repeat: '<path d="M4 10V6h15m-4-4 4 4-4 4m5 4v4H5m4-4-4 4 4 4"/>',
  volume: '<path d="M3 9h4l5-5v16l-5-5H3Zm13-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>', minus: '<path d="M5 12h14"/>',
};
function icon(element, name) {
  // Only static, application-owned paths enter the SVG markup.
  element.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.music}</svg>`;
}
document.querySelectorAll('[data-icon]').forEach(element => icon(element, element.dataset.icon));
function node(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; }
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(`dhun.${key}`)) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(`dhun.${key}`, JSON.stringify(value)); } catch { status('Device storage is full. Your latest changes could not be saved.'); } }
function storedTracks(key) { const tracks = read(key, []); return Array.isArray(tracks) ? tracks.filter(track => track && typeof track.id === 'string' && typeof track.title === 'string' && typeof track.artist === 'string').slice(0, 1000) : []; }
const state = { view: 'discover', search: [], favourites: storedTracks('favourites'), recent: storedTracks('recent'), local: storedTracks('local'), queue: storedTracks('queue'), index: -1, shuffle: false, repeat: false, playing: false, resolving: false, generation: 0, searchGeneration: 0 };
const audio = $('#audio');
const preferences = read('preferences', {});
let theme = ['monochrome', 'indigo', 'forest'].includes(preferences?.theme) ? preferences.theme : 'monochrome';
let appearance = ['dark', 'light', 'system'].includes(preferences?.appearance) ? preferences.appearance : 'dark';
const systemAppearance = matchMedia('(prefers-color-scheme: light)');
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
$('#reduce-motion').checked = preferences?.reduceMotion === true;
$('#appearance').value = appearance;
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.appearance = appearance === 'system' ? systemAppearance.matches ? 'light' : 'dark' : appearance;
  document.documentElement.dataset.reduceMotion = String($('#reduce-motion').checked);
  document.querySelectorAll('button[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
  save('preferences', { theme, appearance, reduceMotion: $('#reduce-motion').checked });
}
applyTheme();
systemAppearance.addEventListener('change', applyTheme);
const dismissIntro = () => $('#intro')?.remove();
if (systemMotion.matches || $('#reduce-motion').checked) dismissIntro();
else setTimeout(dismissIntro, 1250); // Also removes the overlay when CSS animation is interrupted.
systemMotion.addEventListener('change', event => { if (event.matches) dismissIntro(); });
function status(message = '') { $('#status').textContent = message; }
async function request(method, ...args) { const result = await window.dhun[method](...args); if (!result.ok) throw Error(result.error); return result.data; }
const safe = task => async (...args) => { try { await task(...args); } catch (error) { status(error.message || 'Something went wrong. Please try again.'); } };
function time(value) { if (!Number.isFinite(value) || value < 0) return '0:00'; return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }
function current() { return state.queue[state.index]; }
function isFavourite(track) { return state.favourites.some(item => item.id === track?.id); }
function visibleTracks() { return state.view === 'search' ? state.search : state[state.view] || []; }
const headings = { discover: ['WELCOME TO YOUR SPACE', 'Discover'], search: ['FIND WHAT MOVES YOU', 'Search music'], favourites: ['THE ONES YOU COME BACK TO', 'Your favourites'], recent: ['PICK UP THE FEELING', 'Recently played'], local: ['YOUR MUSIC, RIGHT HERE', 'On this device'], queue: ['KEEP THE FEELING GOING', 'Play queue'] };
function showView(view, moveFocus = true) {
  state.view = view;
  const [kicker, title] = headings[view];
  $('#page-kicker').textContent = kicker; $('#page-title').textContent = title;
  document.title = `${title} · Dhun`;
  $('#discovery').hidden = view !== 'discover'; $('#results').hidden = view === 'discover';
  document.querySelectorAll('[data-view]').forEach(button => view === button.dataset.view ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current'));
  if (view !== 'discover') renderTracks();
  if (moveFocus) (view === 'search' ? $('#query') : $('#page-title')).focus();
}
function artwork(track, className = 'cover') {
  const cover = node('div', className);
  if (typeof track?.artwork === 'string' && /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\//.test(track.artwork)) {
    const image = node('img'); image.src = track.artwork; image.alt = ''; image.loading = 'lazy'; cover.append(image);
  } else { const mark = node('i'); icon(mark, 'music'); cover.append(mark); }
  return cover;
}
function iconButton(name, label, action, pressed) {
  const button = node('button', 'icon-button'); button.setAttribute('aria-label', label); button.title = label;
  const mark = node('i'); icon(mark, name); button.append(mark);
  if (pressed !== undefined) button.setAttribute('aria-pressed', String(pressed));
  button.addEventListener('click', safe(action)); return button;
}
function toggleFavourite(track) {
  if (!track) return;
  state.favourites = isFavourite(track) ? state.favourites.filter(item => item.id !== track.id) : [track, ...state.favourites].slice(0, 1000);
  save('favourites', state.favourites); updatePlayer(); renderTracks();
}
function renderTracks() {
  const list = $('#tracks'); list.replaceChildren();
  const tracks = visibleTracks(); $('#empty').hidden = tracks.length > 0;
  tracks.forEach((track, index) => {
    const row = node('li', `track${current()?.id === track.id ? ' current' : ''}`);
    const play = node('button', 'track-play'); play.setAttribute('aria-label', `Play ${track.title}`);
    play.append(artwork(track)); const copy = node('span', 'track-copy'); copy.append(node('strong', '', track.title), node('span', '', track.artist)); play.append(copy);
    play.addEventListener('click', safe(async () => {
      if (state.view !== 'queue') { state.queue = [...tracks]; save('queue', state.queue); }
      await playAt(index);
    }));
    row.append(play, node('span', 'track-time', track.duration ? time(track.duration) : '—'));
    row.append(iconButton('heart', `Favourite ${track.title}`, () => toggleFavourite(track), isFavourite(track)));
    if (state.view === 'queue') row.append(iconButton('minus', `Remove ${track.title} from queue`, () => {
      state.queue.splice(index, 1);
      if (index === state.index) { state.generation++; state.resolving = false; audio.pause(); audio.removeAttribute('src'); audio.load(); state.index = -1; state.playing = false; }
      else if (index < state.index) state.index--;
      save('queue', state.queue); updatePlayer(); renderTracks();
    }));
    else row.append(iconButton('plus', `Add ${track.title} to queue`, () => { state.queue.push(track); save('queue', state.queue); updatePlayer(); status(`Added ${track.title} to your queue.`); }));
    list.append(row);
  });
}
function updatePlayer() {
  const track = current(); $('#queue-count').textContent = String(state.queue.length);
  $('#now-title').textContent = track?.title || 'Your next favourite awaits'; $('#now-artist').textContent = state.resolving ? 'Preparing audio · first play can take a moment…' : track?.artist || 'Choose a song to get started';
  const cover = artwork(track); $('#now-art').replaceChildren(...cover.childNodes);
  $('#play').disabled = (!track && !state.queue.length) || state.resolving; $('#previous').disabled = !track || state.resolving; $('#next').disabled = !state.queue.length || state.resolving;
  $('#now-like').disabled = !track; $('#now-like').setAttribute('aria-pressed', String(isFavourite(track)));
  $('#play').setAttribute('aria-label', state.playing ? 'Pause' : 'Play'); icon($('#play i'), state.playing ? 'pause' : 'play');
  $('#shuffle').setAttribute('aria-pressed', String(state.shuffle)); $('#repeat').setAttribute('aria-pressed', String(state.repeat));
}
async function playAt(index) {
  const track = state.queue[index]; if (!track) return;
  const generation = ++state.generation;
  audio.pause(); audio.removeAttribute('src'); audio.load(); state.index = index; state.resolving = true; status(); updatePlayer(); renderTracks();
  try {
    const source = track.local ? `dhun://audio/${track.id}` : await request('stream', track.id);
    if (generation !== state.generation) return;
    audio.src = source; await audio.play();
    if (generation !== state.generation) return;
    state.recent = [track, ...state.recent.filter(item => item.id !== track.id)].slice(0, 100);
    save('recent', state.recent);
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist });
  } catch (error) { if (generation === state.generation) status(error.message || 'Playback failed. Try another track.'); }
  finally { if (generation === state.generation) { state.resolving = false; updatePlayer(); } }
}
async function advance(direction, automatic = false) {
  if (direction < 0 && audio.currentTime > 3) { audio.currentTime = 0; return; }
  const index = nextIndex(state.index, state.queue.length, direction, state.repeat, state.shuffle && direction > 0);
  if (index >= 0) await playAt(index);
  else if (!automatic) status('You have reached the end of your queue. Add another song or turn on repeat.');
}
async function togglePlayback() {
  if (state.resolving) return;
  if (state.index < 0 && state.queue.length) return playAt(0);
  if (!current()) return;
  if (audio.paused) { if (!audio.getAttribute('src')) return playAt(state.index); await audio.play(); } else audio.pause();
}
async function search(query) {
  query = query.trim(); if (!query) return;
  const generation = ++state.searchGeneration; $('#query').value = query; state.search = []; showView('search', false); status(); $('#loading').hidden = false;
  try {
    const tracks = await request('search', query);
    if (generation !== state.searchGeneration) return;
    state.search = tracks;
    status(tracks.length ? `${tracks.length} results for “${query}”.` : 'No results this time. Try a song or artist name.');
    if (state.view === 'search') renderTracks();
  } catch (error) { if (generation === state.searchGeneration) status(error.message); }
  finally { if (generation === state.searchGeneration) $('#loading').hidden = true; }
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { status(); showView(button.dataset.view); }));
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => search(button.dataset.query)));
$('#search-form').addEventListener('submit', event => { event.preventDefault(); search($('#query').value); });
$('#start-search').addEventListener('click', () => showView('search'));
$('#import').addEventListener('click', safe(async () => { const tracks = await request('pickFiles'); if (!tracks.length) return; state.local = [...state.local.filter(item => !tracks.some(track => track.id === item.id)), ...tracks]; save('local', state.local); status(`Added ${tracks.length} local tracks.`); showView('local'); }));
$('#play').addEventListener('click', safe(togglePlayback)); $('#previous').addEventListener('click', safe(() => advance(-1))); $('#next').addEventListener('click', safe(() => advance(1))); $('#now-like').addEventListener('click', () => toggleFavourite(current()));
$('#shuffle').addEventListener('click', () => { state.shuffle = !state.shuffle; updatePlayer(); }); $('#repeat').addEventListener('click', () => { state.repeat = !state.repeat; updatePlayer(); }); $('#show-queue').addEventListener('click', () => showView('queue'));
audio.volume = Number.isFinite(preferences?.volume) ? Math.min(1, Math.max(0, preferences.volume)) : .8;
$('#volume').value = String(audio.volume);
$('#volume').addEventListener('input', event => { audio.volume = Number(event.target.value); });
$('#seek').addEventListener('input', event => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value); });
audio.addEventListener('timeupdate', () => { $('#elapsed').textContent = time(audio.currentTime); $('#seek').value = String(audio.currentTime); });
audio.addEventListener('loadedmetadata', () => { const finite = Number.isFinite(audio.duration); $('#duration').textContent = time(audio.duration); $('#seek').max = finite ? String(audio.duration) : '100'; $('#seek').disabled = !finite; });
audio.addEventListener('emptied', () => { $('#seek').disabled = true; $('#seek').value = '0'; $('#elapsed').textContent = '0:00'; $('#duration').textContent = '0:00'; });
for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, () => { state.playing = !audio.paused && !audio.ended; updatePlayer(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused'; });
audio.addEventListener('ended', safe(() => advance(1, true)));
audio.addEventListener('error', () => { if (audio.getAttribute('src')) status(current()?.local ? 'This file is unavailable or its format is unsupported. Add it again from your device.' : 'This stream could not play. Try the song again or choose another result.'); });
document.addEventListener('keydown', safe(async event => { if (event.code !== 'Space' || event.target.closest('input,select,textarea,button,dialog')) return; event.preventDefault(); await togglePlayback(); }));
if ('mediaSession' in navigator) for (const [action, handler] of Object.entries({ play: safe(() => audio.play()), pause: () => audio.pause(), previoustrack: safe(() => advance(-1)), nexttrack: safe(() => advance(1)), seekto: details => { if (Number.isFinite(audio.duration)) audio.currentTime = details.seekTime; } })) navigator.mediaSession.setActionHandler(action, handler);
$('#settings-open').addEventListener('click', () => $('#settings').showModal()); $('#settings-close').addEventListener('click', () => $('#settings').close());
document.querySelectorAll('button[data-theme]').forEach(button => button.addEventListener('click', () => { theme = button.dataset.theme; applyTheme(); }));
$('#appearance').addEventListener('change', event => { appearance = event.target.value; applyTheme(); }); $('#reduce-motion').addEventListener('change', () => { applyTheme(); if ($('#reduce-motion').checked) dismissIntro(); });
$('#releases').addEventListener('click', safe(() => request('releases')));
request('version').then(version => { $('#version').textContent = `DESKTOP PREVIEW · ${version}`; }).catch(() => {});
updatePlayer();
