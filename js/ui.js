// ===== INFINITY LOOP — UI.JS =====

let _view = 'table';
let _yearFilter = 'all';
let _typeTab = 'all';
let _genre = 'all';
let _sort = 'date_desc';
let _search = '';
let _sidebarFilter = null;
let _deleteId = null;
let _resizableInited = false;

// ===== COLUMN WIDTHS =====
const COL_KEYS = ['num','name','type','year','date','dur','rating','imdb','status','genres'];
const COL_DEF  = { num:36, name:215, type:135, year:68, date:118, dur:90, rating:70, imdb:82, status:122, genres:185 };
const COL_STORE = 'il_cols';

function loadCols() {
  try { return Object.assign({}, COL_DEF, JSON.parse(localStorage.getItem(COL_STORE)||'{}')); }
  catch(e) { return Object.assign({}, COL_DEF); }
}
function saveCols(w) { try { localStorage.setItem(COL_STORE, JSON.stringify(w)); } catch(e){} }
let _cols = loadCols();

function getColStyle(key) {
  return `style="width:${_cols[key]}px;min-width:${_cols[key]}px;max-width:${_cols[key]}px"`;
}

function initResizable() {
  const head = document.getElementById('tableHead');
  if (!head) return;
  // Remove old handles first
  head.querySelectorAll('.rh').forEach(h => h.remove());

  head.querySelectorAll('.th[data-col]').forEach(th => {
    const col = th.dataset.col;
    const handle = document.createElement('div');
    handle.className = 'rh';
    handle.style.cssText = 'position:absolute;right:0;top:0;bottom:0;width:6px;cursor:col-resize;z-index:10;';
    th.style.position = 'relative';
    th.appendChild(handle);

    let startX, startW;
    handle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      startX = e.clientX; startW = _cols[col];
      document.body.style.cssText += 'cursor:col-resize!important;user-select:none!important';

      const move = e2 => {
        _cols[col] = Math.max(40, startW + e2.clientX - startX);
        // Update all th and td for this col live
        document.querySelectorAll(`[data-col="${col}"]`).forEach(el => {
          el.style.width = _cols[col]+'px';
          el.style.minWidth = _cols[col]+'px';
          el.style.maxWidth = _cols[col]+'px';
        });
      };
      const up = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        saveCols(_cols);
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
    // Set initial width on th
    th.style.width = _cols[col]+'px';
    th.style.minWidth = _cols[col]+'px';
    th.style.maxWidth = _cols[col]+'px';
  });
}

// ===== FILTERING =====
function getFiltered() {
  let data = getEntries();
  if (_sidebarFilter) {
    if (_sidebarFilter.key==='status') data = data.filter(e=>e.status===_sidebarFilter.val);
    else if (_sidebarFilter.key==='type') data = data.filter(e=>e.type===_sidebarFilter.val);
  } else if (_typeTab!=='all') {
    data = data.filter(e=>e.type===_typeTab);
  }
  if (_genre!=='all') data = data.filter(e=>(e.genres||[]).includes(_genre));
  if (_yearFilter!=='all') data = data.filter(e=>(e.dateEnd||e.dateStart||'').startsWith(_yearFilter) || (e.year||'').includes(_yearFilter));
  if (_search) data = data.filter(e=>e.name.toLowerCase().includes(_search.toLowerCase()));
  data = [...data];
  if (_sort==='date_desc')   data.sort((a,b)=>(b.dateEnd||b.dateStart||'').localeCompare(a.dateEnd||a.dateStart||''));
  if (_sort==='date_asc')    data.sort((a,b)=>(a.dateEnd||a.dateStart||'').localeCompare(b.dateEnd||b.dateStart||''));
  if (_sort==='year_desc')   data.sort((a,b)=>parseInt(b.year||0)-parseInt(a.year||0));
  if (_sort==='year_asc')    data.sort((a,b)=>parseInt(a.year||0)-parseInt(b.year||0));
  if (_sort==='rating_desc') data.sort((a,b)=>(b.rating||0)-(a.rating||0));
  if (_sort==='imdb_desc')   data.sort((a,b)=>(b.imdb||0)-(a.imdb||0));
  if (_sort==='name_asc')    data.sort((a,b)=>a.name.localeCompare(b.name,'uk'));
  if (_sort==='name_desc')   data.sort((a,b)=>b.name.localeCompare(a.name,'uk'));
  return data;
}

// ===== TABLE =====
function renderTable() {
  const data = getFiltered();
  const admin = isAdmin();
  document.getElementById('tableBody').innerHTML = data.map((e,i)=>{
    const [tc,ti,tn] = getTypeInfo(e.type);
    const [sc,si,sn] = getStatusInfo(e.status);
    const rc = getRatingClass(e.rating, e.fire);
    const rLabel = e.fire ? (e.rating?`${e.rating}🔥`:'🔥') : (e.rating||'—');
    const genres = (e.genres||[]).map(g=>`<span class="g-tag">${g}</span>`).join('');
    const dateD = e.dateStart
      ? (e.dateEnd&&e.dateEnd!==e.dateStart ? `${formatDate(e.dateStart)}–${formatDate(e.dateEnd)}` : formatDate(e.dateStart))
      : '—';
    const durD = e.dur || (e.episodes?e.episodes+'ep':'—');
    const imdbH = e.imdb
      ? `<div class="imdb-cell"><span class="imdb-tag">IMDb</span><span class="imdb-v">${e.imdb}</span></div>`
      : '<span class="td-mono" style="color:var(--muted)">—</span>';

    return `<div class="t-row" onclick="${admin?`openEditModal(${e.id})`:''}">
      <div class="td td-num" data-col="num" style="width:${_cols.num}px;min-width:${_cols.num}px;max-width:${_cols.num}px">${i+1}</div>
      <div class="td" data-col="name" style="width:${_cols.name}px;min-width:${_cols.name}px;max-width:${_cols.name}px"><div class="td-name-cell"><div class="td-name-main">${e.name}</div></div></div>
      <div class="td" data-col="type" style="width:${_cols.type}px;min-width:${_cols.type}px;max-width:${_cols.type}px"><span class="type-pill ${tc}">${ti} ${tn}</span></div>
      <div class="td td-mono" data-col="year" style="width:${_cols.year}px;min-width:${_cols.year}px;max-width:${_cols.year}px">${e.year||'—'}</div>
      <div class="td td-mono" data-col="date" style="width:${_cols.date}px;min-width:${_cols.date}px;max-width:${_cols.date}px">${dateD}</div>
      <div class="td td-mono" data-col="dur" style="width:${_cols.dur}px;min-width:${_cols.dur}px;max-width:${_cols.dur}px">${durD}</div>
      <div class="td" data-col="rating" style="width:${_cols.rating}px;min-width:${_cols.rating}px;max-width:${_cols.rating}px"><span class="r-val ${rc}">${rLabel}</span></div>
      <div class="td" data-col="imdb" style="width:${_cols.imdb}px;min-width:${_cols.imdb}px;max-width:${_cols.imdb}px">${imdbH}</div>
      <div class="td" data-col="status" style="width:${_cols.status}px;min-width:${_cols.status}px;max-width:${_cols.status}px"><span class="st-pill ${sc}">${si} ${sn}</span></div>
      <div class="td" data-col="genres" style="width:${_cols.genres}px;min-width:${_cols.genres}px;max-width:${_cols.genres}px"><div class="genre-tags">${genres}</div></div>
    </div>`;
  }).join('') || `<div style="padding:32px;text-align:center;color:var(--muted);font-family:'IM Fell English',serif;font-style:italic;font-size:17px">Нічого не знайдено…</div>`;

  // Apply col widths to header too
  document.querySelectorAll('#tableHead .th[data-col]').forEach(th=>{
    const c = th.dataset.col;
    th.style.width = _cols[c]+'px';
    th.style.minWidth = _cols[c]+'px';
    th.style.maxWidth = _cols[c]+'px';
  });
}

// ===== CARDS =====
function renderCards() {
  const data = getFiltered();
  document.getElementById('cardsGrid').innerHTML = data.map(e=>{
    const [tc,ti,tn] = getTypeInfo(e.type);
    const rc = getRatingClass(e.rating, e.fire);
    const rLabel = e.fire?(e.rating?`${e.rating}🔥`:'🔥'):(e.rating||'');
    return `<div class="media-card" onclick="${isAdmin()?`openEditModal(${e.id})`:''}">
      <div class="mc-poster"><span class="mc-type-icon">${{film:'🎬',serial:'📺',"anime-serial":'⛩️',"anime-film":'🎌',mult:'🎨',"mult-serial":'🎪'}[e.type]||'🎬'}</span>${rLabel?`<div class="mc-r-badge ${rc}">${rLabel}</div>`:''}</div>
      <div class="mc-body">
        <div class="mc-type"><span class="type-pill ${tc}" style="font-size:10px">${ti} ${tn}</span></div>
        <div class="mc-title">${e.name}</div>
        <div class="mc-meta">${e.year||''} · ${e.dur||''}</div>
      </div>
    </div>`;
  }).join('') || `<div style="color:var(--muted);padding:24px;font-style:italic">Нічого не знайдено…</div>`;
}

function render() {
  if (_view==='table') renderTable();
  else renderCards();
  updateBadges();
  updateKPI();
  updateYearBanner();
  document.getElementById('tbSub').textContent = getFiltered().length + ' позицій';
  refreshYearFilter();
  // Re-init resizable each render (handles re-created DOM)
  requestAnimationFrame(initResizable);
}

// ===== VIEW =====
function setView(v) {
  _view = v;
  document.getElementById('tableWrap').style.display = v==='table'?'':'none';
  document.getElementById('cardsGrid').style.display = v==='cards'?'grid':'none';
  document.getElementById('vbTable').classList.toggle('active', v==='table');
  document.getElementById('vbCards').classList.toggle('active', v==='cards');
  render();
}

// ===== NAVIGATION =====
function gotoPage(page, el) {
  const isList = page==='list';
  document.getElementById('listPage').style.display = isList?'':'none';
  document.getElementById('analyticsPage').style.display = isList?'none':'';
  document.getElementById('yearBanner').style.display = isList?'':'none';
  document.getElementById('kpiRow').style.display = isList?'':'none';
  document.getElementById('tbTitle').textContent = isList?'Мій список':'Аналітика';
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
  if (el) el.classList.add('active');
  if (!isList) renderAnalytics();
  else render();
}

// ===== FILTERS =====
function setTypeTab(type,el) {
  _typeTab=type; _sidebarFilter=null;
  document.querySelectorAll('.tt').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
  document.querySelector('.nav-item').classList.add('active');
  render();
}
function setGenre(genre,el) {
  _genre=genre;
  document.querySelectorAll('.gf').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  render();
}
function setSort(val) { _sort=val; render(); }
function doSearch(val) { _search=val; render(); }
function sidebarFilter(key,val,el) {
  _sidebarFilter={key,val}; _typeTab='all';
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.tt').forEach(b=>b.classList.remove('active'));
  gotoPage('list',null);
}
function refreshGenreFilters() {
  const c = document.getElementById('genreFilters');
  c.innerHTML = `<button class="gf${_genre==='all'?' active':''}" onclick="setGenre('all',this)">Всі</button>`
    + getGenres().map(g=>`<button class="gf${_genre===g?' active':''}" onclick="setGenre(${JSON.stringify(g)},this)">${g}</button>`).join('');
}

// ===== BADGES =====
function updateBadges() {
  const e = getEntries();
  document.getElementById('badgeTotal').textContent = e.length;
  document.getElementById('bDone').textContent   = e.filter(x=>x.status==='done').length;
  document.getElementById('bNow').textContent    = e.filter(x=>x.status==='now').length;
  document.getElementById('bPlan').textContent   = e.filter(x=>x.status==='plan').length;
  document.getElementById('bDrop').textContent   = e.filter(x=>x.status==='drop').length;
  // type badges removed from sidebar
}

// ===== KPI =====
function updateKPI() {
  const e = getEntries();
  const st = calcStats(e);
  document.getElementById('kTotal').textContent = st.total;
  document.getElementById('kHours').textContent = st.hoursStr;
  document.getElementById('kDays').textContent  = `≈ ${st.daysStr} днів`;
  document.getElementById('kAvg').textContent   = st.avg;
  document.getElementById('kFire').textContent  = st.fire;
  document.getElementById('kPlan').textContent  = st.plan;
}

// ===== YEAR BANNER =====
function updateYearBanner() {
  const s = getSettings();
  const e = getEntries();
  document.getElementById('ybYear').textContent  = s.vibeYear||'2026';
  document.getElementById('ybTitle').textContent = s.vibeTitle||'Infinity Loop';
  document.getElementById('ybTags').textContent  = s.vibeTags||'';
  const st = calcStats(e);
  document.getElementById('ybCount').textContent = e.filter(x=>x.status==='done').length;
  document.getElementById('ybHours').textContent = st.hoursStr;
  document.getElementById('ybFire').textContent  = st.fire+'🔥';
}

// ===== MODAL =====
function overlayClick(e,id) { if(e.target.id===id) closeModal(id); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }





function onStatusChange() {
  const status = document.getElementById('fStatus').value;
  const today = new Date().toISOString().split('T')[0];
  if (!document.getElementById('fDateStart').value && (status==='now'||status==='done'||status==='drop'))
    document.getElementById('fDateStart').value = today;
  if (!document.getElementById('fDateEnd').value && status==='done')
    document.getElementById('fDateEnd').value = today;
}






// ===== OMDB =====
async function fetchOMDB() {
  const name = document.getElementById('fName').value.trim();
  const key = getSettings().omdbKey;
  if (!name || !key) return;
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(name)}&apikey=${key}&type=movie`);
    const d = await res.json();
    if (d.Response==='True') {
      if (!document.getElementById('fYear').value && d.Year) document.getElementById('fYear').value=d.Year;
      if (!document.getElementById('fImdb').value && d.imdbRating&&d.imdbRating!=='N/A')
        document.getElementById('fImdb').value=parseFloat(d.imdbRating)||'';
      if (!document.getElementById('fGenres').value && d.Genre)
        document.getElementById('fGenres').value=d.Genre;
      if (!document.getElementById('fDur').value && d.Runtime&&d.Runtime!=='N/A') {
        const mins=parseInt(d.Runtime);
        if(mins) document.getElementById('fDur').value=`${Math.floor(mins/60)}:${String(mins%60).padStart(2,'0')}`;
      }
    }
  } catch(err) { console.warn('OMDB:', err); }
}


// ===== GENRE MULTI-SELECT =====
let _selectedGenres = [];

function openAddModal() {
  document.getElementById('fId').value='';
  document.getElementById('modalTtl').textContent='Додати запис';
  ['fName','fYear','fDur'].forEach(id=>document.getElementById(id).value='');
  ['fSeasons','fEpisodes','fRating','fImdb'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fType').value='film';
  document.getElementById('fStatus').value='plan';
  document.getElementById('fDateStart').value='';
  document.getElementById('fDateEnd').value='';
  document.getElementById('fFire').checked=false;
  document.getElementById('fGenres').value='';
  document.getElementById('delBtn').style.display='none';
  _selectedGenres=[];
  renderGenreDropdown();
  document.getElementById('entryModal').classList.add('open');
  setTimeout(()=>document.getElementById('fName').focus(),100);
}

function openEditModal(id) {
  const e = getEntries().find(x=>x.id===id);
  if (!e) return;
  document.getElementById('fId').value=id;
  document.getElementById('modalTtl').textContent='Редагувати запис';
  document.getElementById('fName').value=e.name;
  document.getElementById('fType').value=e.type;
  document.getElementById('fStatus').value=e.status;
  document.getElementById('fYear').value=e.year||'';
  document.getElementById('fDateStart').value=e.dateStart||'';
  document.getElementById('fDateEnd').value=e.dateEnd||'';
  document.getElementById('fDur').value=e.dur||'';
  document.getElementById('fSeasons').value=e.seasons||'';
  document.getElementById('fEpisodes').value=e.episodes||'';
  document.getElementById('fRating').value=e.rating||'';
  document.getElementById('fFire').checked=e.fire||false;
  document.getElementById('fImdb').value=e.imdb||'';
  document.getElementById('fGenres').value=(e.genres||[]).join(', ');
  _selectedGenres=[...(e.genres||[])];
  renderGenreDropdown();
  document.getElementById('delBtn').style.display='';
  document.getElementById('entryModal').classList.add('open');
}

function renderGenreDropdown(filter='') {
  const trigger = document.getElementById('genreTrigger');
  const panel   = document.getElementById('genreDropList');
  if (!trigger || !panel) return;

  // Update trigger display
  const placeholder = document.getElementById('genrePlaceholder');
  // Remove old tags
  trigger.querySelectorAll('.gdt-tag').forEach(t=>t.remove());
  if (_selectedGenres.length===0) {
    placeholder.style.display='';
  } else {
    placeholder.style.display='none';
    const arrow = document.getElementById('genreArrow');
    _selectedGenres.forEach(g=>{
      const tag = document.createElement('span');
      tag.className='gdt-tag';
      tag.innerHTML=`${g}<span class="gdt-tag-x" onclick="event.stopPropagation();removeGenreTag('${g}')">×</span>`;
      trigger.insertBefore(tag, arrow);
    });
  }

  // Render list
  const genres = getGenres().filter(g=>!filter||g.toLowerCase().includes(filter.toLowerCase()));
  panel.innerHTML = genres.map(g=>{
    const sel = _selectedGenres.includes(g);
    return `<div class="gdp-item${sel?' selected':''}" onclick="toggleGenreItem('${g}')">
      <div class="gdp-chk">${sel?'✓':''}</div>${g}
    </div>`;
  }).join('') || '<div style="padding:10px 12px;color:var(--muted);font-size:12px">Не знайдено</div>';

  // Sync hidden input
  document.getElementById('fGenres').value = _selectedGenres.join(', ');
}

function toggleGenreDropdown() {
  const panel = document.getElementById('genrePanel');
  const trigger = document.getElementById('genreTrigger');
  const isOpen = panel.classList.toggle('open');
  trigger.classList.toggle('open', isOpen);
  document.getElementById('genreArrow').textContent = isOpen?'▲':'▼';
  if (isOpen) {
    document.getElementById('genreSearch').value='';
    renderGenreDropdown();
    setTimeout(()=>document.getElementById('genreSearch').focus(), 50);
    // Close on outside click
    setTimeout(()=>{
      document.addEventListener('click', closeGenreOnOutside, {once:true});
    }, 10);
  }
}

function closeGenreOnOutside(e) {
  const wrap = document.getElementById('genreDropWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('genrePanel').classList.remove('open');
    document.getElementById('genreTrigger').classList.remove('open');
    document.getElementById('genreArrow').textContent='▼';
  } else if (wrap && wrap.contains(e.target)) {
    // Re-attach listener
    document.addEventListener('click', closeGenreOnOutside, {once:true});
  }
}

function toggleGenreItem(g) {
  const idx = _selectedGenres.indexOf(g);
  if (idx===-1) _selectedGenres.push(g);
  else _selectedGenres.splice(idx,1);
  renderGenreDropdown(document.getElementById('genreSearch')?.value||'');
}

function removeGenreTag(g) {
  _selectedGenres = _selectedGenres.filter(x=>x!==g);
  renderGenreDropdown();
}

function filterGenreDropdown(val) { renderGenreDropdown(val); }

// Override saveEntry to use _selectedGenres
async function saveEntry() {
  const id = document.getElementById('fId').value;
  const genres = _selectedGenres.length > 0
    ? _selectedGenres
    : document.getElementById('fGenres').value.split(',').map(g=>g.trim()).filter(Boolean);
  const rating = parseInt(document.getElementById('fRating').value)||null;
  const fire = document.getElementById('fFire').checked;
  const type = document.getElementById('fType').value;
  const emojiMap={film:'🎬',serial:'📺','anime-serial':'⛩️','anime-film':'🎌',mult:'🎨','mult-serial':'🎪'};
  const entry = {
    name:      document.getElementById('fName').value.trim(),
    type, status:document.getElementById('fStatus').value,
    year:      document.getElementById('fYear').value,
    dateStart: document.getElementById('fDateStart').value,
    dateEnd:   document.getElementById('fDateEnd').value,
    dur:       document.getElementById('fDur').value,
    seasons:   parseInt(document.getElementById('fSeasons').value)||null,
    episodes:  parseInt(document.getElementById('fEpisodes').value)||null,
    rating, fire,
    imdb:      parseFloat(document.getElementById('fImdb').value)||null,
    genres, notes:'',
    emoji: emojiMap[type]||'🎬',
  };
  if (!entry.name) { alert('Введіть назву!'); return; }
  if (id) await updateEntry(parseInt(id), entry); else await addEntry(entry);
  closeModal('entryModal');
  render();
}

// Also patch fetchOMDB to set genres via _selectedGenres
const _origFetchOMDB = fetchOMDB;
fetchOMDB = async function() {
  const name = document.getElementById('fName').value.trim();
  const key = getSettings().omdbKey;
  if (!name || !key) return;
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(name)}&apikey=${key}`);
    const d = await res.json();
    if (d.Response==='True') {
      if (!document.getElementById('fYear').value && d.Year) document.getElementById('fYear').value=d.Year;
      if (!document.getElementById('fImdb').value && d.imdbRating&&d.imdbRating!=='N/A')
        document.getElementById('fImdb').value=parseFloat(d.imdbRating)||'';
      if (_selectedGenres.length===0 && d.Genre) {
        _selectedGenres = d.Genre.split(',').map(g=>g.trim()).filter(Boolean);
        renderGenreDropdown();
      }
      if (!document.getElementById('fDur').value && d.Runtime&&d.Runtime!=='N/A') {
        const mins=parseInt(d.Runtime);
        if(mins) document.getElementById('fDur').value=`${Math.floor(mins/60)}:${String(mins%60).padStart(2,'0')}`;
      }
    }
  } catch(err) { console.warn('OMDB:',err); }
};

// ===== EXPORT / IMPORT =====
function exportData() {
  const data = {
    entries: getEntries(),
    genres:  getGenres(),
    settings: getSettings(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='infinity-loop-backup.json'; a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type='file'; input.accept='.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.entries) { alert('Невірний формат файлу!'); return; }
        if (!confirm(`Імпортувати ${data.entries.length} записів? Поточні дані будуть замінені.`)) return;
        window._db.entries  = data.entries;
        if (data.genres)   window._db.genres   = data.genres;
        if (data.settings) window._db.settings = data.settings;
        window._db.nextId = Math.max(...data.entries.map(e=>e.id||0), window._db.nextId||0) + 1;
        saveDB();
        render();
        updateYearBanner();
        refreshGenreFilters();
        alert(`✓ Імпортовано ${data.entries.length} записів!`);
      } catch(err) { alert('Помилка читання файлу: '+err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function askDeleteCurrent() {
  _deleteId = parseInt(document.getElementById('fId').value);
  closeModal('entryModal');
  document.getElementById('confirmModal').classList.add('open');
}
async function confirmDelete() {
  if(_deleteId){ await deleteEntry(_deleteId); _deleteId=null; }
  closeModal('confirmModal');
  render();
}

// ===== YEAR FILTER =====
function setYearFilter(val) {
  _yearFilter = val;
  render();
}

function refreshYearFilter() {
  const sel = document.getElementById('yearFilter');
  if (!sel) return;
  const years = [...new Set(
    getEntries()
      .map(e => (e.dateEnd || e.dateStart || '').substring(0, 4))
      .filter(y => y && y.length === 4)
  )].sort().reverse();

  const cur = sel.value;
  sel.innerHTML = '<option value="all">Всі роки</option>' +
    years.map(y => `<option value="${y}"${cur===y?' selected':''}>${y}</option>`).join('');
}
