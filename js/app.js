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

  // Set current vibe year to current year or latest available
  const curYear = new Date().getFullYear();
  const vibes = window._cache?.vibes || [];
  const hasCurrentYear = vibes.some(v => v.year === curYear);
  window._currentVibeYear = hasCurrentYear ? curYear : (vibes[0]?.year || curYear);

  gotoPage('list', document.querySelector('.nav-item'));
  // Force update banner after data is ready
  setTimeout(() => updateYearBanner(), 100);
}
