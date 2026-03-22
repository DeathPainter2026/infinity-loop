// =============================================
// INFINITY LOOP — APP.JS
// =============================================
'use strict';

function initApp() {
  refreshGenreFilters();
  refreshYearFilter();

  if (isAdmin()) {
    document.getElementById('addBtn').style.display      = 'inline-flex';
    document.getElementById('settingsBtn').style.display = '';
  }

  const lb = document.getElementById('lightToggleBtn');
  if (lb) lb.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';

  gotoPage('list', document.querySelector('.nav-item'));
}
