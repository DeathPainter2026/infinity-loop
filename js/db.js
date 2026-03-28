// =============================================
// INFINITY LOOP — DB Layer
// Abstracts localStorage <-> Supabase
// =============================================
'use strict';

// ─── LOCAL FALLBACK ───
const LOCAL_KEY = 'il_db';

function localLoad() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch(e) { return null; }
}
function localSave(data) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch(e) {}
}

// ─── CURRENT USER ───
function currentUser() {
  return window._currentUser?.login || 'guest';
}

// =============================================
// ENTRIES
// =============================================
async function dbGetEntries() {
  if (!USE_SUPABASE || !SB) {
    return (localLoad()?.entries || []).filter(e => e.user_id === currentUser() || e.user_id === 'DeathPainter');
  }
  const { data, error } = await SB.from('entries')
    .select('*')
    .order('id', { ascending: false });
  if (error) { console.error(error); return []; }
  return data.map(dbToEntry);
}

async function dbAddEntry(entry) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad() || { entries: [], nextId: 1 };
    entry.id = db.nextId++;
    entry.user_id = currentUser();
    db.entries.unshift(entry);
    localSave(db);
    return entry;
  }
  const row = entryToDb(entry);
  row.user_id = currentUser();
  const { data, error } = await SB.from('entries').insert(row).select().single();
  if (error) { console.error(error); return null; }
  return dbToEntry(data);
}

async function dbUpdateEntry(id, patch) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad();
    if (!db) return;
    const idx = db.entries.findIndex(e => e.id === id);
    if (idx !== -1) { db.entries[idx] = { ...db.entries[idx], ...patch }; localSave(db); }
    return;
  }
  const row = entryToDb(patch);
  row.updated_at = new Date().toISOString();
  const { error } = await SB.from('entries').update(row).eq('id', id);
  if (error) console.error(error);
}

async function dbDeleteEntry(id) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad();
    if (!db) return;
    db.entries = db.entries.filter(e => e.id !== id);
    localSave(db);
    return;
  }
  const { error } = await SB.from('entries').delete().eq('id', id);
  if (error) console.error(error);
}

// ─── Row converters ───
function entryToDb(e) {
  return {
    name: e.name, type: e.type, status: e.status,
    year: e.year || null,
    date_start: e.dateStart || null,
    date_end:   e.dateEnd   || null,
    dur: e.dur || null,
    seasons:  e.seasons  || null,
    episodes: e.episodes || null,
    rating: e.rating || null,
    fire:   e.fire   || false,
    imdb:   e.imdb   || null,
    genres: e.genres || [],
    notes:  e.notes  || null,
    emoji:  e.emoji  || '🎬',
  };
}
function dbToEntry(r) {
  return {
    id:        r.id,
    user_id:   r.user_id,
    name:      r.name,
    type:      r.type,
    status:    r.status,
    year:      r.year      || '',
    dateStart: r.date_start || '',
    dateEnd:   r.date_end   || '',
    dur:       r.dur        || '',
    seasons:   r.seasons    || null,
    episodes:  r.episodes   || null,
    rating:    r.rating     || null,
    fire:      r.fire       || false,
    imdb:      r.imdb       || null,
    genres:    r.genres     || [],
    notes:     r.notes      || '',
    emoji:     r.emoji      || '🎬',
  };
}

// =============================================
// GENRES
// =============================================
async function dbGetGenres() {
  if (!USE_SUPABASE || !SB) {
    return localLoad()?.genres || [];
  }
  const { data, error } = await SB.from('genres').select('name').order('name');
  if (error) return [];
  return data.map(r => r.name);
}

async function dbAddGenre(name) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad() || {};
    if (!db.genres) db.genres = [];
    if (!db.genres.includes(name)) { db.genres.push(name); localSave(db); }
    return;
  }
  await SB.from('genres').upsert({ name }, { onConflict: 'name', ignoreDuplicates: true });
}

async function dbRemoveGenre(name) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad();
    if (!db) return;
    db.genres = db.genres.filter(g => g !== name);
    localSave(db);
    return;
  }
  await SB.from('genres').delete().eq('name', name);
}

// =============================================
// SETTINGS
// =============================================
async function dbGetSettings() {
  if (!USE_SUPABASE || !SB) {
    return localLoad()?.settings || {};
  }
  try {
    const { data, error } = await SB.from('settings').select('*').eq('user_id', currentUser()).maybeSingle();
    if (!data || error) return {};
    return {
      omdbKey:   data.omdb_key   || localStorage.getItem('il_omdb_key') || '',
      vibeYear:  data.vibe_year  || '2026',
      vibeTitle: data.vibe_title || '',
      vibeTags:  data.vibe_tags  || '',
    };
  } catch(e) { 
    return { omdbKey: localStorage.getItem('il_omdb_key') || '' };
  }
}

async function dbSaveSettings(patch) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad() || {};
    db.settings = { ...db.settings, ...patch };
    localSave(db);
    return;
  }
  // Get existing settings first to preserve other fields
  const existing = window._cache?.settings || {};
  const merged = { ...existing, ...patch };
  const row = {
    user_id:    currentUser(),
    omdb_key:   merged.omdbKey   || '',
    vibe_year:  merged.vibeYear  || '2026',
    vibe_title: merged.vibeTitle || '',
    vibe_tags:  merged.vibeTags  || '',
  };
  const { error } = await SB.from('settings').upsert(row, { onConflict: 'user_id' });
  if (error) console.error('Settings save error:', error);
  // Backup omdb key in localStorage
  if (merged.omdbKey) localStorage.setItem('il_omdb_key', merged.omdbKey);
}

// =============================================
// USERS (auth)
// =============================================
async function dbGetUsers() {
  if (!USE_SUPABASE || !SB) {
    return localLoad()?.users || [{ login: 'DeathPainter', pass: 'Reckless2015', role: 'admin' }];
  }
  const { data, error } = await SB.from('users').select('*');
  if (error) return [];
  return data;
}

async function dbAddUser(login, pass, role = 'guest') {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad() || {};
    if (!db.users) db.users = [];
    if (!db.users.find(u => u.login === login)) {
      db.users.push({ login, pass, role });
      localSave(db);
    }
    return;
  }
  await SB.from('users').upsert({ login, pass, role }, { onConflict: 'login', ignoreDuplicates: true });
}

async function dbRemoveUser(login) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad();
    if (!db) return;
    db.users = db.users.filter(u => u.login !== login);
    localSave(db);
    return;
  }
  await SB.from('users').delete().eq('login', login).neq('role', 'admin');
}

async function dbUpdateAdminPass(newPass) {
  if (!USE_SUPABASE || !SB) {
    const db = localLoad();
    if (!db) return;
    const admin = db.users?.find(u => u.role === 'admin');
    if (admin) { admin.pass = newPass; localSave(db); }
    return;
  }
  await SB.from('users').update({ pass: newPass }).eq('role', 'admin');
}

// =============================================
// CACHE — keep entries in memory for fast UI
// =============================================
window._cache = { entries: [], genres: [], settings: {}, users: [] };

async function loadAll() {
  const [entries, genres, settings, users] = await Promise.all([
    dbGetEntries(),
    dbGetGenres(),
    dbGetSettings(),
    dbGetUsers(),
  ]);
  window._cache.entries  = entries;
  window._cache.genres   = genres;
  window._cache.settings = settings;
  window._cache.users    = users;
}

// Sync helpers that update cache + DB
async function syncAddEntry(entry) {
  const saved = await dbAddEntry(entry);
  if (saved) window._cache.entries.unshift(saved);
  return saved;
}
async function syncUpdateEntry(id, patch) {
  await dbUpdateEntry(id, patch);
  const idx = window._cache.entries.findIndex(e => e.id === id);
  if (idx !== -1) window._cache.entries[idx] = { ...window._cache.entries[idx], ...patch };
}
async function syncDeleteEntry(id) {
  await dbDeleteEntry(id);
  window._cache.entries = window._cache.entries.filter(e => e.id !== id);
}
async function syncAddGenre(name) {
  await dbAddGenre(name);
  if (!window._cache.genres.includes(name)) window._cache.genres.push(name);
}
async function syncRemoveGenre(name) {
  await dbRemoveGenre(name);
  window._cache.genres = window._cache.genres.filter(g => g !== name);
}
async function syncSaveSettings(patch) {
  await dbSaveSettings(patch);
  window._cache.settings = { ...window._cache.settings, ...patch };
}
