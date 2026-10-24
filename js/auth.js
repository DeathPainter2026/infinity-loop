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
  const themes = ['cthulhu','classic','cyberpunk','horror','anime','samurai','anime2','halloween','newyear'];
  themes.forEach(t => document.body.classList.remove('theme-' + t));
  document.body.classList.add('theme-' + name);
  localStorage.setItem('il_theme', name);
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = name;
  document.querySelectorAll('.tp-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('onclick')||'').includes(`'${name}'`));
  });
}
function setThemeLogin(name) { setTheme(name); }

// ─── АВТОЗМІНА ТЕМ ───
const DEF_SCHED = {
  enabled: true,
  days: {1:'cthulhu', 2:'classic', 3:'cyberpunk', 4:'horror', 5:'anime', 6:'samurai', 0:'anime2'},
  rules: [{theme:'halloween', from:'10-01', to:'10-31'}, {theme:'newyear', from:'12-20', to:'01-05'}]
};
function getSched() {
  try {
    const s = JSON.parse(localStorage.getItem('il_sched') || 'null');
    if (s) return { ...DEF_SCHED, ...s, days: { ...DEF_SCHED.days, ...(s.days||{}) } };
  } catch(e) {}
  return DEF_SCHED;
}
function scheduledTheme(d = new Date()) {
  const s = getSched();
  if (!s.enabled) return null;
  const md = String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  for (const r of s.rules) {
    const inR = r.from <= r.to ? (md >= r.from && md <= r.to) : (md >= r.from || md <= r.to);
    if (inR) return r.theme;
  }
  return s.days[d.getDay()] || null;
}
function initTheme() {
  const s = scheduledTheme();
  if (!s) { applyTheme(localStorage.getItem('il_theme') || 'cthulhu'); return; }
  let ov = null;
  try { ov = JSON.parse(localStorage.getItem('il_theme_ov') || 'null'); } catch(e) {}
  if (ov && ov.sched === s) applyTheme(ov.theme);
  else { localStorage.removeItem('il_theme_ov'); applyTheme(s); }
}
// Ручний вибір діє до наступної автоматичної зміни теми
function setTheme(name) {
  const s = scheduledTheme();
  if (s) {
    if (name === s) localStorage.removeItem('il_theme_ov');
    else localStorage.setItem('il_theme_ov', JSON.stringify({ theme: name, sched: s }));
  }
  applyTheme(name);
}
function resetThemeAuto() { localStorage.removeItem('il_theme_ov'); initTheme(); }

const _DAYS_UA = [[1,'Понеділок'],[2,'Вівторок'],[3,'Середа'],[4,'Четвер'],[5,'Пʼятниця'],[6,'Субота'],[0,'Неділя']];
const _md2ui = md => md.split('-').reverse().join('.');
function renderThemeSettings() {
  const s = getSched();
  const opts = document.getElementById('themeSelect').innerHTML;
  const sel = (id, val) => `<select class="fi" id="${id}">${opts.replace(`value="${val}"`, `value="${val}" selected`)}</select>`;
  document.getElementById('schEnabled').checked = !!s.enabled;
  document.getElementById('schDays').innerHTML = _DAYS_UA.map(([n, lbl]) =>
    `<div style="display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:center;margin-bottom:6px"><span style="font-size:13px">${lbl}</span>${sel('schDay'+n, s.days[n])}</div>`).join('');
  document.getElementById('schRules').innerHTML = s.rules.map((r, i) =>
    `<div style="display:grid;grid-template-columns:1fr 70px 70px;gap:8px;align-items:center;margin-bottom:6px">${sel('schRuleT'+i, r.theme)}<input class="fi" id="schRuleF${i}" value="${_md2ui(r.from)}" placeholder="ДД.ММ"><input class="fi" id="schRuleTo${i}" value="${_md2ui(r.to)}" placeholder="ДД.ММ"></div>`).join('');
}
function saveSchedule() {
  const s = getSched();
  const parse = v => {
    const m = (v||'').trim().match(/^(\d{1,2})\.(\d{1,2})$/);
    if (!m || +m[1] < 1 || +m[1] > 31 || +m[2] < 1 || +m[2] > 12) return null;
    return m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
  };
  const rules = [];
  for (let i = 0; i < s.rules.length; i++) {
    const f = parse(document.getElementById('schRuleF'+i).value), t = parse(document.getElementById('schRuleTo'+i).value);
    if (!f || !t) { alert('Дата має бути у форматі ДД.ММ, наприклад 20.12'); return; }
    rules.push({ theme: document.getElementById('schRuleT'+i).value, from: f, to: t });
  }
  const days = {};
  _DAYS_UA.forEach(([n]) => { days[n] = document.getElementById('schDay'+n).value; });
  localStorage.setItem('il_sched', JSON.stringify({ enabled: document.getElementById('schEnabled').checked, days, rules }));
  localStorage.removeItem('il_theme_ov');
  initTheme();
  alert('Збережено!');
}

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
  document.getElementById('stVibeYear').value  = new Date().getFullYear();
  document.getElementById('stVibeTitle').value = '';
  document.getElementById('stVibeTags').value  = '';
  renderVibeList();
  document.getElementById('stOmdbKey').value   = s.omdbKey   || '';
  renderGuestList();
  renderGenreList();
  renderThemeSettings();
  document.getElementById('settingsModal').classList.add('open');
}

function stTab(panel, el) {
  document.querySelectorAll('.stt').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  ['general','genres','users','vibe','omdb','themes'].forEach(p => {
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

// ─── VIBES (multi-year) ───
function getVibes() {
  return window._cache?.vibes || [];
}

function renderVibeList() {
  const list = document.getElementById('vibeList');
  if (!list) return;
  const vibes = getVibes().sort((a,b) => b.year - a.year);
  if (!vibes.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0">Немає вайбів. Додай перший!</div>';
    return;
  }
  list.innerHTML = vibes.map(v => `
    <div class="manage-item" style="flex-direction:column;align-items:flex-start;gap:4px;padding:10px">
      <div style="display:flex;width:100%;align-items:center;justify-content:space-between">
        <span style="font-size:16px;font-weight:700;color:var(--accent)">${v.year}</span>
        <button class="manage-del" onclick="deleteVibeUI(${v.year})">✕</button>
      </div>
      <div style="font-size:12px;color:var(--text)">${esc(v.title)||'—'}</div>
      <div style="font-size:11px;color:var(--muted2)">${esc(v.tags)||'—'}</div>
    </div>`).join('');
}

async function saveVibe() {
  const year  = parseInt(document.getElementById('stVibeYear').value);
  const title = document.getElementById('stVibeTitle').value.trim();
  const tags  = document.getElementById('stVibeTags').value.trim();
  if (!year) { alert('Введи рік'); return; }
  await syncSaveVibe(year, title, tags);
  renderVibeList();
  updateYearBanner();
  // Clear form
  document.getElementById('stVibeYear').value  = new Date().getFullYear();
  document.getElementById('stVibeTitle').value = '';
  document.getElementById('stVibeTags').value  = '';
}

async function deleteVibeUI(year) {
  await syncDeleteVibe(year);
  renderVibeList();
  updateYearBanner();
}

async function saveOmdbKey() {
  await saveSettings({ omdbKey: document.getElementById('stOmdbKey').value.trim() });
  alert('API ключ збережено!');
}

function renderGenreList() {
  document.getElementById('genreList').innerHTML = getGenres().map(g =>
    `<div class="manage-item">
      <span class="manage-item-name">${esc(g)}</span>
      <button class="manage-del" data-g="${esc(g)}" onclick="removeGenreUI(this.dataset.g)">✕</button>
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
          <span class="manage-item-name">👤 ${esc(u.login)}</span>
          <button class="manage-del" data-l="${esc(u.login)}" onclick="removeGuestUI(this.dataset.l)">✕</button>
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
  initTheme();
  setInterval(() => { if (scheduledTheme()) initTheme(); }, 60000);
  if (localStorage.getItem('il_light') === '1') {
    document.body.classList.add('light-mode');
    const b = document.getElementById('lightToggleBtn');
    if (b) b.textContent = '🌙';
  }

  // Show loading state
  const ls = document.getElementById('loginScreen');

  // Init Supabase client
  initSupabase();

  // Load all data (works for both localStorage and Supabase)
  try {
    await loadAll();
    // Set vibe year immediately after data loads
    const _curY = new Date().getFullYear();
    const _vibes = window._cache?.vibes || [];
    window._currentVibeYear = _vibes.some(v=>v.year===_curY) ? _curY : (_vibes[0]?.year || _curY);
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
