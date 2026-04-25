// =============================================
// INFINITY LOOP — DATA.JS
// All data access goes through _cache (set by db.js)
// =============================================
'use strict';

// ─── Getters from cache ───
function getEntries()  { return window._cache?.entries  || []; }
function getGenres()   { return window._cache?.genres   || []; }
function getSettings() { return window._cache?.settings || {}; }
function getUsers()    { return window._cache?.users    || []; }

// ─── Legacy compat for old localStorage (migration on first load) ───
const OLD_KEY = 'infinityloop_data';

function migrateFromOldLocalStorage() {
  try {
    const raw = localStorage.getItem(OLD_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw);
    console.log('Found old data, migrating...');
    return old;
  } catch(e) { return null; }
}

// ─── Helpers used throughout the app ───
function parseDurationMinutes(durStr) {
  if (!durStr || typeof durStr !== 'string') return 0;
  const m = durStr.trim().match(/^(\d+):(\d+)$/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  return 0;
}

function calcStats(entries) {
  const ratings = entries.filter(e => e.rating).map(e => parseInt(e.rating));
  const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : '—';
  const fire = entries.filter(e => e.fire).length;
  const plan = entries.filter(e => e.status === 'plan').length;
  let totalMin = 0;
  // Only count watched entries for total time
  entries.filter(e => e.status === 'done').forEach(e => { totalMin += parseDurationMinutes(e.dur); });
  const totalH = Math.floor(totalMin / 60);
  const totalM = totalMin % 60;
  return {
    total: entries.length, avg, fire, plan, totalMin,
    hoursStr: `${totalH}:${String(totalM).padStart(2,'0')}`,
    daysStr:  (totalMin / 60 / 24).toFixed(1),
  };
}

function getTypeInfo(type) {
  return {
    film:          ['tp-film',   '🎬', 'Фільм'],
    serial:        ['tp-serial', '📺', 'Серіал'],
    'anime-serial':['tp-as',     '⛩️', 'Аніме Серіал'],
    'anime-film':  ['tp-af',     '🎌', 'Аніме Фільм'],
    mult:          ['tp-mult',   '🎨', 'Мультфільм'],
    'mult-serial': ['tp-ms',     '🎪', 'Мультсеріал'],
  }[type] || ['', '🎬', type];
}

function getStatusInfo(status) {
  return {
    done: ['sp-done', '✅', 'Переглянуто'],
    now:  ['sp-now',  '👁️', 'Дивлюся'],
    plan: ['sp-plan', '📌', 'В планах'],
    drop: ['sp-drop', '❌', 'Кинув'],
  }[status] || ['', '', status];
}

function getRatingClass(r, fire) {
  if (fire) return 'r-fire';
  if (!r) return 'r-low';
  if (r >= 9) return 'r-high';
  if (r >= 7) return 'r-mid';
  if (r >= 5) return 'r-low';
  return 'r-bad';
}

function formatDate(d) {
  if (!d) return '—';
  const [y,m,day] = d.split('-');
  return `${day}.${m}.${y.slice(2)}`;
}

// ─── Sync wrappers (called from UI) ───
async function addEntry(entry) {
  const saved = await syncAddEntry(entry);
  return saved;
}
async function updateEntry(id, patch) {
  await syncUpdateEntry(id, patch);
}
async function deleteEntry(id) {
  await syncDeleteEntry(id);
}
async function addGenre(name) {
  await syncAddGenre(name);
}
async function removeGenre(name) {
  await syncRemoveGenre(name);
}
async function saveSettings(patch) {
  await syncSaveSettings(patch);
}
async function addGuestUser(login, pass) {
  const exists = getUsers().find(u => u.login === login);
  if (exists) return false;
  await dbAddUser(login, pass, 'guest');
  window._cache.users.push({ login, pass, role: 'guest' });
  return true;
}
async function removeUser(login) {
  await dbRemoveUser(login);
  window._cache.users = window._cache.users.filter(u => u.login !== login || u.role === 'admin');
}
async function updateAdminPass(newPass) {
  await dbUpdateAdminPass(newPass);
  const admin = window._cache.users.find(u => u.role === 'admin');
  if (admin) admin.pass = newPass;
}
