// =============================================
// INFINITY LOOP — AUTH.JS
// =============================================
'use strict';

const SESSION_KEY = 'il_session';
const APP_VERSION = '6';

// ─── LOGIN ───
async function doLogin() {
  const login = (document.getElementById('loginUser')?.value || '').trim();
  const pass  = document.getElementById('loginPass')?.value || '';
  const err   = document.getElementById('loginError');

  const users = getUsers();
  const user  = users.find(u => u.login === login && u.pass === pass);
  if (!user) {
    if (err) err.style.display = 'block';
    document.getElementById('loginPass').value = '';
    return;
  }
  if (err) err.style.display = 'none';
  saveSession({ login: user.login, role: user.role });
  startApp(user);
}

function doGuestLogin() {
  const g = { login: 'Гість', role: 'guest' };
  saveSession(g);
  startApp(g);
}

function doLogout() {
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, v: APP_VERSION }));
}

// ─── START APP ───
function startApp(user) {
  window._currentUser = user;
  const admin = (user.role === 'admin');

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  document.getElementById('userAva').textContent      = user.login[0].toUpperCase();
  document.getElementById('userNameDisp').textContent = user.login;
  document.getElementById('userRoleDisp').textContent = admin ? 'Адміністратор' : 'Гість';

  document.getElementById('addBtn').style.display      = admin ? 'inline-flex' : 'none';
  document.getElementById('settingsBtn').style.display = admin ? '' : 'none';

  initApp();
}

function isAdmin() {
  return !!(window._currentUser && window._currentUser.role === 'admin');
}

// ─── THEME ───
function applyTheme(name) {
  const themes = ['cthulhu','classic','cyberpunk','horror','anime','samurai','anime2'];
  themes.forEach(t => document.body.classList.remove('theme-' + t));
  document.body.classList.add('theme-' + name);
  localStorage.setItem('il_theme', name);
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = name;
  document.querySelectorAll('.tp-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('onclick')||'').includes(`'${name}'`));
  });
}
function setTheme(name) { applyTheme(name); }
function setThemeLogin(name) { applyTheme(name); }

// ─── LIGHT MODE ───
function toggleLightMode() {
  const on = document.body.classList.toggle('light-mode');
  localStorage.setItem('il_light', on ? '1' : '0');
  const b = document.getElementById('lightToggleBtn');
  if (b) b.textContent = on ? '🌙' : '☀️';
}

// ─── SETTINGS ───
function openSettings() {
  if (!isAdmin()) return;
  const s = getSettings();
  document.getElementById('stVibeYear').value  = s.vibeYear  || '';
  document.getElementById('stVibeTitle').value = s.vibeTitle || '';
  document.getElementById('stVibeTags').value  = s.vibeTags  || '';
  document.getElementById('stOmdbKey').value   = s.omdbKey   || '';
  renderGuestList();
  renderGenreList();
  document.getElementById('settingsModal').classList.add('open');
}

function stTab(panel, el) {
  document.querySelectorAll('.stt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  ['general','genres','users','vibe','omdb'].forEach(p => {
    const el2 = document.getElementById('st' + p.charAt(0).toUpperCase() + p.slice(1));
    if (el2) el2.style.display = p === panel ? '' : 'none';
  });
}

async function saveAdminPass() {
  const np = document.getElementById('stNewPass').value.trim();
  if (!np) return;
  await updateAdminPass(np);
  saveSession({ login: window._currentUser.login, role: 'admin' });
  document.getElementById('stNewPass').value = '';
  alert('Пароль змінено!');
}

async function saveVibe() {
  await saveSettings({
    vibeYear:  document.getElementById('stVibeYear').value,
    vibeTitle: document.getElementById('stVibeTitle').value,
    vibeTags:  document.getElementById('stVibeTags').value,
  });
  updateYearBanner();
  closeModal('settingsModal');
}

async function saveOmdbKey() {
  await saveSettings({ omdbKey: document.getElementById('stOmdbKey').value.trim() });
  alert('API ключ збережено!');
}

function renderGenreList() {
  document.getElementById('genreList').innerHTML = getGenres().map(g =>
    `<div class="manage-item">
      <span class="manage-item-name">${g}</span>
      <button class="manage-del" onclick="removeGenreUI(${JSON.stringify(g)})">✕</button>
    </div>`
  ).join('') || '<div style="color:var(--muted);font-size:12px">Порожньо</div>';
}

async function addGenreUI() {
  const val = document.getElementById('newGenreInp').value.trim();
  if (!val) return;
  await addGenre(val);
  document.getElementById('newGenreInp').value = '';
  renderGenreList();
  refreshGenreFilters();
}

async function removeGenreUI(name) {
  await removeGenre(name);
  renderGenreList();
  refreshGenreFilters();
}

function renderGuestList() {
  const guests = getUsers().filter(u => u.role !== 'admin');
  document.getElementById('guestList').innerHTML = guests.length
    ? guests.map(u =>
        `<div class="manage-item">
          <span class="manage-item-name">👤 ${u.login}</span>
          <button class="manage-del" onclick="removeGuestUI(${JSON.stringify(u.login)})">✕</button>
        </div>`
      ).join('')
    : '<div style="color:var(--muted);font-size:12px">Гостей немає</div>';
}

async function addGuest() {
  const l = document.getElementById('newLogin').value.trim();
  const p = document.getElementById('newPass').value.trim();
  if (!l || !p) { alert('Введіть логін і пароль'); return; }
  const ok = await addGuestUser(l, p);
  if (ok) {
    document.getElementById('newLogin').value = '';
    document.getElementById('newPass').value  = '';
    renderGuestList();
  } else { alert('Такий логін вже існує!'); }
}

async function removeGuestUI(login) {
  await removeUser(login);
  renderGuestList();
}

// ─── BOOT ───
document.addEventListener('DOMContentLoaded', async () => {
  // Version check
  const storedVer = localStorage.getItem('il_ver');
  if (storedVer !== APP_VERSION) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('il_light');
    localStorage.setItem('il_ver', APP_VERSION);
  }

  // Apply theme & light
  applyTheme(localStorage.getItem('il_theme') || 'cthulhu');
  if (localStorage.getItem('il_light') === '1') {
    document.body.classList.add('light-mode');
    const b = document.getElementById('lightToggleBtn');
    if (b) b.textContent = '🌙';
  }

  // Show loading state
  const ls = document.getElementById('loginScreen');

  // Load all data (works for both localStorage and Supabase)
  try {
    await loadAll();
  } catch(e) {
    console.error('Failed to load data:', e);
  }

  // Auto-login from session
  try {
    const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (sess && sess.login && sess.v === APP_VERSION) {
      const user = sess.role === 'guest'
        ? { login: 'Гість', role: 'guest' }
        : getUsers().find(u => u.login === sess.login && u.role === sess.role);
      if (user) { startApp(user); return; }
    }
  } catch(e) {}

  // Show login
  if (ls) ls.style.display = 'flex';
  document.getElementById('loginPass')?.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('loginUser')?.addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('loginPass')?.focus(); });
});
