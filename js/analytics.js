// ===== CROSS-MONTH SERIAL SPLIT =====
// For serials that span multiple months, distribute hours proportionally by days
function getMonthlyHours(entries) {
  const monthMins = {}; // { "2026-01": minutes, ... }
  
  entries.forEach(e => {
    if (!e.dateEnd && !e.dateStart) return;
    const totalMin = parseDurationMinutes(e.dur || '');
    if (!totalMin) return;
    
    const dEnd   = new Date(e.dateEnd   || e.dateStart);
    const dStart = new Date(e.dateStart || e.dateEnd);
    if (isNaN(dEnd) || isNaN(dStart)) return;
    
    const isSerial = ['serial','anime-serial','mult-serial'].includes(e.type);
    const startKey = `${dStart.getFullYear()}-${String(dStart.getMonth()+1).padStart(2,'0')}`;
    const endKey   = `${dEnd.getFullYear()}-${String(dEnd.getMonth()+1).padStart(2,'0')}`;
    
    if (!isSerial || startKey === endKey) {
      // Same month or not a serial - count in end month
      const key = endKey;
      monthMins[key] = (monthMins[key] || 0) + totalMin;
      return;
    }
    
    // Cross-month serial: split proportionally by days
    const totalDays = Math.round((dEnd - dStart) / 86400000) + 1;
    let current = new Date(dStart);
    const dayCount = {};
    
    for (let i = 0; i < totalDays; i++) {
      const k = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}`;
      dayCount[k] = (dayCount[k] || 0) + 1;
      current.setDate(current.getDate() + 1);
    }
    
    Object.entries(dayCount).forEach(([k, days]) => {
      const mins = Math.round(days / totalDays * totalMin);
      monthMins[k] = (monthMins[k] || 0) + mins;
    });
  });
  
  return monthMins;
}

// ===== INFINITY LOOP — ANALYTICS.JS =====

function renderAnalytics() {
  const entries = getEntries();
  const done = entries.filter(e=>e.status==='done');
  document.getElementById('anContent').innerHTML = `
    ${cardFunFacts(entries)}
    <div class="an-grid" style="margin-top:16px">
      ${cardDonutCount(entries)}
      ${cardDonutHours(entries)}
      ${cardTopGenres(entries)}
      ${cardComparison(done)}
    </div>
    <div style="margin-top:16px">${cardHoursLineChart(entries)}</div>
    <div style="margin-top:16px">${cardMonthlyByType(entries)}</div>`;
}

function anCard(cls,icon,title,content) {
  return `<div class="an-card${cls?" "+cls:""}"><div class="an-ttl"><span>${icon}</span> ${title}</div>${content}</div>`;
}

function typeConfig() {
  return [
    {key:'film',         label:'🎬 Фільм',        color:'#00bcd4', serial:false},
    {key:'serial',       label:'📺 Серіал',       color:'#66bb6a', serial:true},
    {key:'anime-serial', label:'⛩️ Аніме Серіал', color:'#f06292', serial:true},
    {key:'anime-film',   label:'🎌 Аніме Фільм',  color:'#ce93d8', serial:false},
    {key:'mult',         label:'🎨 Мультфільм',   color:'#ffb74d', serial:false},
    {key:'mult-serial',  label:'🎪 Мультсеріал',  color:'#ffd54f', serial:true},
  ];
}

// ===== FUN FACTS (TOP) — card grid style =====
function cardFunFacts(entries) {
  const done = entries.filter(e=>e.status==='done');
  const ratings = entries.filter(e=>e.rating).map(e=>e.rating);
  const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : '—';
  const fire = entries.filter(e=>e.fire).length;

  // Best month
  const mc=Array(12).fill(0);
  entries.forEach(e=>{if(e.dateEnd){const m=new Date(e.dateEnd).getMonth();if(m>=0&&m<12)mc[m]++;}});
  const mNames=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  const bestM = mNames[mc.indexOf(Math.max(...mc))]||'—';

  // Marathon
  let marathon='—', marScore=0;
  entries.filter(e=>e.episodes&&e.dateStart&&e.dateEnd).forEach(e=>{
    const days=Math.max(1,Math.round((new Date(e.dateEnd)-new Date(e.dateStart))/86400000)+1);
    if(e.episodes/days>marScore){marScore=e.episodes/days;marathon=`${e.name} — ${e.episodes}ep за ${days}д`;}
  });

  // Avg diff my vs IMDb
  const diffs=done.filter(e=>e.rating&&e.imdb).map(e=>e.rating-e.imdb);
  const avgDiff=diffs.length?(+(diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(1)):'—';
  const avgDiffStr=avgDiff!=='—'?(avgDiff>=0?`+${avgDiff}`:String(avgDiff)):'—';

  // Per-type counts + hours
  const tc = typeConfig();
  const typeItems = tc.map(t=>{
    const items=entries.filter(e=>e.type===t.key);
    if(!items.length) return null;
    let mins=0; items.forEach(e=>{mins+=parseDurationMinutes(e.dur||'');});
    const h=Math.floor(mins/60), m=mins%60;
    const durStr=mins?`${h}:${String(m).padStart(2,'0')}`:'—';
    let extra='';
    if(t.serial){
      const seas=items.reduce((s,e)=>s+(e.seasons||0),0);
      const eps=items.reduce((s,e)=>s+(e.episodes||0),0);
      if(seas||eps) extra=` · ${seas?seas+'сез. ':''}${eps?eps+'ep':''}`;
    }
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${t.color};flex-shrink:0;box-shadow:0 0 4px ${t.color}"></div>
      <span style="flex:1;font-size:12px">${t.label}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${t.color};font-weight:600">${items.length}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted2);min-width:50px;text-align:right">${durStr}${extra}</span>
    </div>`;
  }).filter(Boolean).join('');

  // Quick stat cards
  const cards = [
    {icon:'✅', val:done.length,   lbl:'переглянуто',         color:'var(--c-done)'},
    {icon:'🔥', val:fire,          lbl:'шедеврів 10🔥',       color:'#ff6b35'},
    {icon:'⭐', val:avg,           lbl:'середня оцінка',      color:'var(--c-now)'},
    {icon:'📅', val:bestM,         lbl:'топ місяць',          color:'var(--accent)'},
    {icon:'🏆', val:marathon,      lbl:'рекордний марафон',   color:'var(--c-plan)'},
    {icon:'📊', val:avgDiffStr,    lbl:'моя оцінка vs IMDb',  color:'var(--c-done)'},
    {icon:'🎬', val:entries.filter(e=>e.type==='film').length,         lbl:'фільмів',          color:'#00bcd4'},
    {icon:'⛩️', val:entries.filter(e=>e.type.includes('anime')).length, lbl:'аніме',           color:'#f06292'},
  ];

  return `<div class="an-card span2">
    <div class="an-ttl"><span>✨</span> Загальна статистика</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">По типах</div>
        ${typeItems}
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Факти</div>
        <div class="fun-grid" style="grid-template-columns:1fr 1fr;gap:8px">
          ${cards.map(c=>`<div class="fun-item">
            <div class="fun-icon">${c.icon}</div>
            <div class="fun-val" style="color:${c.color}">${c.val}</div>
            <div class="fun-lbl">${c.lbl}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

// ===== DONUT: COUNT =====
function cardDonutCount(entries) {
  const tc = typeConfig();
  const total = entries.length;
  const r=65, circ=2*Math.PI*r;
  let off=0;
  const segs=tc.map(t=>{
    const c=entries.filter(e=>e.type===t.key).length;
    const dash=total?(c/total)*circ:0;
    const s=c>0?`<circle cx="80" cy="80" r="${r}" fill="none" stroke="${t.color}" stroke-width="20" stroke-dasharray="${dash.toFixed(1)} ${(circ-dash).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`:'' ;
    off+=dash; return {s,c,...t};
  });
  const svg=`<svg width="160" height="160" viewBox="0 0 160 160" style="transform:rotate(-90deg)">
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="20"/>
    ${segs.map(s=>s.s).join('')}</svg>`;
  const legend=segs.filter(s=>s.c>0).map(s=>`<div class="leg-item">
    <div class="leg-dot" style="background:${s.color}"></div>
    <div class="leg-name">${s.label}</div>
    <div class="leg-val">${s.c}</div>
  </div>`).join('');
  return anCard('','🍩','По кількості',`<div class="donut-wrap">
    <div class="donut-container" style="width:160px;height:160px">${svg}
      <div class="donut-center"><div class="dc-val">${total}</div><div class="dc-lbl">всього</div></div>
    </div>
    <div class="legend-list">${legend}</div>
  </div>`);
}

// ===== DONUT: HOURS =====
function cardDonutHours(entries) {
  const tc = typeConfig();
  const typeMins=tc.map(t=>{
    let m=0; entries.filter(e=>e.type===t.key).forEach(e=>{m+=parseDurationMinutes(e.dur||'');});
    return {...t, mins:m};
  });
  const totalMin=typeMins.reduce((s,t)=>s+t.mins,0);
  const r=65, circ=2*Math.PI*r;
  let off=0;
  const segs=typeMins.map(t=>{
    const dash=totalMin?(t.mins/totalMin)*circ:0;
    const s=t.mins>0?`<circle cx="80" cy="80" r="${r}" fill="none" stroke="${t.color}" stroke-width="20" stroke-dasharray="${dash.toFixed(1)} ${(circ-dash).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`:'' ;
    off+=dash; return {s,...t};
  });
  const totalH=Math.floor(totalMin/60), totalMn=totalMin%60;
  const svg=`<svg width="160" height="160" viewBox="0 0 160 160" style="transform:rotate(-90deg)">
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="20"/>
    ${segs.map(s=>s.s).join('')}</svg>`;
  const legend=segs.filter(s=>s.mins>0).map(s=>{
    const h=Math.floor(s.mins/60),m=s.mins%60;
    return `<div class="leg-item">
      <div class="leg-dot" style="background:${s.color}"></div>
      <div class="leg-name">${s.label}</div>
      <div class="leg-val leg-hours">${h}:${String(m).padStart(2,'0')}</div>
    </div>`;
  }).join('');
  return anCard('','⏱️','По годинах',`<div class="donut-wrap">
    <div class="donut-container" style="width:160px;height:160px">${svg}
      <div class="donut-center"><div class="dc-val" style="font-size:20px">${totalH}:${String(totalMn).padStart(2,'0')}</div><div class="dc-lbl">годин</div></div>
    </div>
    <div class="legend-list">${legend}</div>
  </div>`);
}

// ===== TOP GENRES =====
function cardTopGenres(entries) {
  const counts={};
  entries.forEach(e=>(e.genres||[]).forEach(g=>{counts[g]=(counts[g]||0)+1;}));
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max=sorted[0]?.[1]||1;
  const colors=['var(--c-now)','#00bcd4','var(--c-done)','#f06292','var(--c-plan)','#ffb74d','#ff6b35','var(--c-drop)'];
  const bars=sorted.map(([g,c],i)=>`<div class="bar-row">
    <div class="bar-lbl">${g}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(c/max*100).toFixed(0)}%;background:${colors[i%colors.length]}"></div></div>
    <div class="bar-val">${c}</div>
  </div>`).join('');
  return anCard('','🏷️','Топ жанри',`<div class="bar-list">${bars}</div>`);
}

// ===== COMPARISON =====
function cardComparison(done) {
  const wb=done.filter(e=>e.rating&&e.imdb).slice(0,7);
  const rows=wb.map(e=>{
    const diff=+(e.rating-e.imdb).toFixed(1);
    const dc=diff>0?'var(--c-done)':diff<0?'var(--c-drop)':'var(--muted2)';
    return `<div class="cmp-row">
      <div class="cmp-name">${e.emoji||''} ${e.name}</div>
      <div class="cmp-bars-col">
        <div class="cmp-br"><div class="cmp-bl" style="color:var(--accent)">Я</div><div class="cmp-bt"><div class="cmp-bf" style="width:${e.rating*10}%;background:var(--accent)"></div></div></div>
        <div class="cmp-br"><div class="cmp-bl">IMDb</div><div class="cmp-bt"><div class="cmp-bf" style="width:${e.imdb*10}%;background:var(--muted)"></div></div></div>
      </div>
      <div class="cmp-diff" style="color:${dc}">${diff>0?'+':''}${diff}</div>
    </div>`;
  }).join('');
  return anCard('','⚖️','Моя оцінка vs IMDb',`<div class="cmp-list">${rows||'<div style="color:var(--muted);font-size:13px">Немає даних</div>'}</div>`);
}


// ===== HOURS LINE CHART =====
function cardHoursLineChart(entries) {
  const mLabels=['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
  const now = new Date();
  const curM = now.getMonth();
  const curY = now.getFullYear();

  const monthlyMins = getMonthlyHours(entries);
  const mHours = Array(12).fill(0);
  Object.entries(monthlyMins).forEach(([k, mins]) => {
    const [y, m] = k.split('-').map(Number);
    if (y === curY && m >= 1 && m <= 12) mHours[m-1] += mins / 60;
  });

  // Only show months up to current month (not future)
  const activeMonths = mLabels.slice(0, curM + 1);
  const activeHours = mHours.slice(0, curM + 1);
  const maxH = Math.max(...activeHours, 1);
  const n = activeMonths.length;

  // SVG line chart
  const W = 800, H = 120, padL = 40, padR = 20, padT = 10, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Points
  const pts = activeHours.map((h, i) => {
    const x = padL + (n === 1 ? chartW/2 : (i / (n - 1)) * chartW);
    const y = padT + chartH - (h / maxH) * chartH;
    return { x, y, h };
  });

  const linePath = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(padT+chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT+chartH).toFixed(1)} Z`;

  // Y axis labels
  const yLabels = [0, Math.round(maxH/2), Math.round(maxH)].map(v => {
    const y = padT + chartH - (v / maxH) * chartH;
    return `<text x="${padL-6}" y="${y+4}" text-anchor="end" font-size="9" fill="var(--muted)">${v}г</text>
    <line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--border)" stroke-width="1" opacity="0.5"/>`;
  }).join('');

  // X labels and dots
  const xElements = pts.map((p, i) => `
    <text x="${p.x.toFixed(1)}" y="${(padT+chartH+16).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--muted)">${activeMonths[i]}</text>
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--bg1)" stroke-width="2"/>
    ${p.h > 0 ? `<text x="${p.x.toFixed(1)}" y="${(p.y-9).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--accent-light)" font-family="'JetBrains Mono',monospace">${Math.round(p.h)}г</text>` : ''}
  `).join('');

  const totalH = Math.round(activeHours.reduce((a,b)=>a+b,0));

  return `<div class="an-card span2" style="overflow:hidden">
    <div class="an-ttl" style="display:flex;align-items:center;justify-content:space-between">
      <span>📈 Години по місяцях ${curY}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--accent)">${totalH}г всього</span>
    </div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">
      ${yLabels}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#lineGrad)"/>
      <path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      ${xElements}
    </svg>
  </div>`;
}

// ===== MONTHLY BY TYPE (full width, fixed) =====
function cardMonthlyByType(entries) {
  const mLabels=['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
  const tc=typeConfig();
  const tColors={};
  tc.forEach(t=>tColors[t.key]=t.color);
  const tNames={};
  tc.forEach(t=>tNames[t.key]=t.label);

  const mData=Array(12).fill(null).map(()=>({}));
  entries.forEach(e=>{
    const d=new Date(e.dateEnd||e.dateStart);
    if(isNaN(d)) return;
    const m=d.getMonth();
    mData[m][e.type]=(mData[m][e.type]||0)+1;
  });

  const curM=new Date().getMonth();
  const activeIdx=Array.from({length:Math.min(curM+1,12)},(_,i)=>i); // only up to current month
  const maxTot=Math.max(...activeIdx.map(i=>Object.values(mData[i]).reduce((a,b)=>a+b,0)),1);
  const BAR_H=140;

  // Hours per month using smart cross-month split
  const _monthlyMins = getMonthlyHours(entries);
  const mHours=Array(12).fill(0);
  const curY2 = new Date().getFullYear();
  Object.entries(_monthlyMins).forEach(([k,mins])=>{
    const [y,m]=k.split('-').map(Number);
    if(y===curY2&&m>=1&&m<=12) mHours[m-1]+=mins/60;
  });

  const legend=tc.filter(t=>entries.some(e=>e.type===t.key)).map(t=>`
    <div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted2)">
      <div style="width:9px;height:9px;border-radius:2px;background:${t.color}"></div>${t.label}
    </div>`).join('');

  const cols=activeIdx.map(i=>{
    const m=mData[i];
    const total=Object.values(m).reduce((a,b)=>a+b,0);
    const segs=tc.filter(t=>m[t.key]).map(t=>{
      const h=Math.max(3,Math.round((m[t.key]/maxTot)*BAR_H));
      return `<div style="height:${h}px;background:${t.color};width:100%"></div>`;
    }).join('');
    return `<div class="sb-col">
      <div class="mb-v">${total||''}</div>
      <div class="mb-area" style="height:${BAR_H}px">
        <div style="width:100%;height:100%;display:flex;flex-direction:column-reverse;border-radius:4px 4px 0 0;overflow:hidden">${segs}</div>
      </div>
      <div class="mb-lbl">${mLabels[i]}</div>
    </div>`;
  }).join('');

  return `<div class="an-card">
    <div class="an-ttl"><span>📆</span> Типи по місяцях</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${legend}</div>
    <div style="display:flex;align-items:flex-end;gap:8px">${cols}</div>
  </div>`;
}// ===== FUN FACTS (TOP) =====
function cardFunFacts(entries) {
  const done = entries.filter(e=>e.status==='done');
  const ratings = entries.filter(e=>e.rating).map(e=>e.rating);
  const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : '—';
  const fire = entries.filter(e=>e.fire).length;
  const tc = typeConfig();

  // Best month
  const mc=Array(12).fill(0);
  entries.forEach(e=>{if(e.dateEnd){const m=new Date(e.dateEnd).getMonth();if(m>=0&&m<12)mc[m]++;}});
  const mNames=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
  const bestM = mNames[mc.indexOf(Math.max(...mc))]||'—';

  // Marathon
  let marathon='—', marScore=0;
  entries.filter(e=>e.episodes&&e.dateStart&&e.dateEnd).forEach(e=>{
    const days=Math.max(1,Math.round((new Date(e.dateEnd)-new Date(e.dateStart))/86400000)+1);
    if(e.episodes/days>marScore){marScore=e.episodes/days;marathon=`${e.name.substring(0,18)}… ${e.episodes}ep/${days}д`;}
  });

  // Avg diff my vs IMDb
  const diffs=done.filter(e=>e.rating&&e.imdb).map(e=>e.rating-e.imdb);
  const avgDiff=diffs.length?(+(diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(1)):'—';
  const avgDiffStr=avgDiff!=='—'?(avgDiff>=0?`+${avgDiff}`:String(avgDiff)):'—';

  // General quick facts
  const quickFacts = [
    {icon:'✅', val:done.length,   lbl:'переглянуто'},
    {icon:'🔥', val:fire,          lbl:'шедеврів (10🔥)'},
    {icon:'⭐', val:avg,           lbl:'середня оцінка'},
    {icon:'📅', val:bestM,         lbl:'топ місяць'},
    {icon:'🏆', val:marathon,      lbl:'рекордний марафон'},
    {icon:'📈', val:avgDiffStr,    lbl:'я vs IMDb середнє'},
    {icon:'📌', val:entries.filter(e=>e.status==='plan').length, lbl:'хочу подивитись'},
    {icon:'👁️', val:entries.filter(e=>e.status==='now').length,  lbl:'дивлюся зараз'},
  ];

  // Per-type rectangles - always show all types
  const typeItems = tc.map(t=>{
    const items = entries.filter(e=>e.type===t.key);
    let mins=0; items.forEach(e=>{mins+=parseDurationMinutes(e.dur||'');});
    const h=Math.floor(mins/60), m=mins%60;
    const durStr=mins?`${h}:${String(m).padStart(2,'0')}`:'—';
    const seas=items.reduce((s,e)=>s+(e.seasons||0),0);
    const eps=items.reduce((s,e)=>s+(e.episodes||0),0);
    const isSerial=['serial','anime-serial','mult-serial'].includes(t.key);
    const extraLine = isSerial && (seas||eps)
      ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">${seas?seas+'сез. ':''}${eps?eps+' ep':''}</div>`
      : '';
    return `<div class="fun-item">
      <div class="fun-icon">${t.label.split(' ')[0]}</div>
      <div class="fun-val" style="color:${t.color}">${items.length}</div>
      <div class="fun-lbl">${t.label.replace(/^[^ ]+ /,'')}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted2);margin-top:2px">${durStr}</div>
      ${extraLine}
    </div>`;
  }).join('');

  return `<div class="an-card">
    <div class="an-ttl"><span>✨</span> Цікаві факти</div>
    <div class="fun-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      ${quickFacts.map(f=>`<div class="fun-item">
        <div class="fun-icon">${f.icon}</div>
        <div class="fun-val">${f.val}</div>
        <div class="fun-lbl">${f.lbl}</div>
      </div>`).join('')}
    </div>
    <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">По типах</div>
    <div class="fun-grid" style="grid-template-columns:repeat(6,1fr)">
      ${typeItems}
    </div>
  </div>`;
}

// ===== DONUT: COUNT =====
function cardDonutCount(entries) {
  const tc = typeConfig();
  const total = entries.length;
  const r=65, circ=2*Math.PI*r;
  let off=0;
  const segs=tc.map(t=>{
    const c=entries.filter(e=>e.type===t.key).length;
    const dash=total?(c/total)*circ:0;
    const s=c>0?`<circle cx="80" cy="80" r="${r}" fill="none" stroke="${t.color}" stroke-width="20" stroke-dasharray="${dash.toFixed(1)} ${(circ-dash).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`:'' ;
    off+=dash; return {s,c,...t};
  });
  const svg=`<svg width="160" height="160" viewBox="0 0 160 160" style="transform:rotate(-90deg)">
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="20"/>
    ${segs.map(s=>s.s).join('')}</svg>`;
  const legend=segs.filter(s=>s.c>0).map(s=>`<div class="leg-item">
    <div class="leg-dot" style="background:${s.color}"></div>
    <div class="leg-name">${s.label}</div>
    <div class="leg-val">${s.c}</div>
  </div>`).join('');
  return anCard('','🍩','По кількості',`<div class="donut-wrap">
    <div class="donut-container" style="width:160px;height:160px">${svg}
      <div class="donut-center"><div class="dc-val">${total}</div><div class="dc-lbl">всього</div></div>
    </div>
    <div class="legend-list">${legend}</div>
  </div>`);
}

// ===== DONUT: HOURS =====
function cardDonutHours(entries) {
  const tc = typeConfig();
  const typeMins=tc.map(t=>{
    let m=0; entries.filter(e=>e.type===t.key).forEach(e=>{m+=parseDurationMinutes(e.dur||'');});
    return {...t, mins:m};
  });
  const totalMin=typeMins.reduce((s,t)=>s+t.mins,0);
  const r=65, circ=2*Math.PI*r;
  let off=0;
  const segs=typeMins.map(t=>{
    const dash=totalMin?(t.mins/totalMin)*circ:0;
    const s=t.mins>0?`<circle cx="80" cy="80" r="${r}" fill="none" stroke="${t.color}" stroke-width="20" stroke-dasharray="${dash.toFixed(1)} ${(circ-dash).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}"/>`:'' ;
    off+=dash; return {s,...t};
  });
  const totalH=Math.floor(totalMin/60), totalMn=totalMin%60;
  const svg=`<svg width="160" height="160" viewBox="0 0 160 160" style="transform:rotate(-90deg)">
    <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="20"/>
    ${segs.map(s=>s.s).join('')}</svg>`;
  const legend=segs.filter(s=>s.mins>0).map(s=>{
    const h=Math.floor(s.mins/60),m=s.mins%60;
    return `<div class="leg-item">
      <div class="leg-dot" style="background:${s.color}"></div>
      <div class="leg-name">${s.label}</div>
      <div class="leg-val leg-hours">${h}:${String(m).padStart(2,'0')}</div>
    </div>`;
  }).join('');
  return anCard('','⏱️','По годинах',`<div class="donut-wrap">
    <div class="donut-container" style="width:160px;height:160px">${svg}
      <div class="donut-center"><div class="dc-val" style="font-size:20px">${totalH}:${String(totalMn).padStart(2,'0')}</div><div class="dc-lbl">годин</div></div>
    </div>
    <div class="legend-list">${legend}</div>
  </div>`);
}

// ===== TOP GENRES =====
function cardTopGenres(entries) {
  const counts={};
  entries.forEach(e=>(e.genres||[]).forEach(g=>{counts[g]=(counts[g]||0)+1;}));
  const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max=sorted[0]?.[1]||1;
  const colors=['var(--c-now)','#00bcd4','var(--c-done)','#f06292','var(--c-plan)','#ffb74d','#ff6b35','var(--c-drop)'];
  const bars=sorted.map(([g,c],i)=>`<div class="bar-row">
    <div class="bar-lbl">${g}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(c/max*100).toFixed(0)}%;background:${colors[i%colors.length]}"></div></div>
    <div class="bar-val">${c}</div>
  </div>`).join('');
  return anCard('','🏷️','Топ жанри',`<div class="bar-list">${bars}</div>`);
}

// ===== COMPARISON =====
function cardComparison(done) {
  const wb=done.filter(e=>e.rating&&e.imdb).slice(0,7);
  const rows=wb.map(e=>{
    const diff=+(e.rating-e.imdb).toFixed(1);
    const dc=diff>0?'var(--c-done)':diff<0?'var(--c-drop)':'var(--muted2)';
    return `<div class="cmp-row">
      <div class="cmp-name">${e.emoji||''} ${e.name}</div>
      <div class="cmp-bars-col">
        <div class="cmp-br"><div class="cmp-bl" style="color:var(--accent)">Я</div><div class="cmp-bt"><div class="cmp-bf" style="width:${e.rating*10}%;background:var(--accent)"></div></div></div>
        <div class="cmp-br"><div class="cmp-bl">IMDb</div><div class="cmp-bt"><div class="cmp-bf" style="width:${e.imdb*10}%;background:var(--muted)"></div></div></div>
      </div>
      <div class="cmp-diff" style="color:${dc}">${diff>0?'+':''}${diff}</div>
    </div>`;
  }).join('');
  return anCard('','⚖️','Моя оцінка vs IMDb',`<div class="cmp-list">${rows||'<div style="color:var(--muted);font-size:13px">Немає даних</div>'}</div>`);
}


// ===== HOURS LINE CHART =====
function cardHoursLineChart(entries) {
  const mLabels=['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
  const now = new Date();
  const curM = now.getMonth();
  const curY = now.getFullYear();

  const monthlyMins = getMonthlyHours(entries);
  const mHours = Array(12).fill(0);
  Object.entries(monthlyMins).forEach(([k, mins]) => {
    const [y, m] = k.split('-').map(Number);
    if (y === curY && m >= 1 && m <= 12) mHours[m-1] += mins / 60;
  });

  // Only show months up to current month (not future)
  const activeMonths = mLabels.slice(0, curM + 1);
  const activeHours = mHours.slice(0, curM + 1);
  const maxH = Math.max(...activeHours, 1);
  const n = activeMonths.length;

  // SVG line chart
  const W = 800, H = 120, padL = 40, padR = 20, padT = 10, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Points
  const pts = activeHours.map((h, i) => {
    const x = padL + (n === 1 ? chartW/2 : (i / (n - 1)) * chartW);
    const y = padT + chartH - (h / maxH) * chartH;
    return { x, y, h };
  });

  const linePath = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(padT+chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(padT+chartH).toFixed(1)} Z`;

  // Y axis labels
  const yLabels = [0, Math.round(maxH/2), Math.round(maxH)].map(v => {
    const y = padT + chartH - (v / maxH) * chartH;
    return `<text x="${padL-6}" y="${y+4}" text-anchor="end" font-size="9" fill="var(--muted)">${v}г</text>
    <line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--border)" stroke-width="1" opacity="0.5"/>`;
  }).join('');

  // X labels and dots
  const xElements = pts.map((p, i) => `
    <text x="${p.x.toFixed(1)}" y="${(padT+chartH+16).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--muted)">${activeMonths[i]}</text>
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--bg1)" stroke-width="2"/>
    ${p.h > 0 ? `<text x="${p.x.toFixed(1)}" y="${(p.y-9).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--accent-light)" font-family="'JetBrains Mono',monospace">${Math.round(p.h)}г</text>` : ''}
  `).join('');

  const totalH = Math.round(activeHours.reduce((a,b)=>a+b,0));

  return `<div class="an-card span2" style="overflow:hidden">
    <div class="an-ttl" style="display:flex;align-items:center;justify-content:space-between">
      <span>📈 Години по місяцях ${curY}</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--accent)">${totalH}г всього</span>
    </div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">
      ${yLabels}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#lineGrad)"/>
      <path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
      ${xElements}
    </svg>
  </div>`;
}

// ===== MONTHLY BY TYPE (full width, fixed) =====
function cardMonthlyByType(entries) {
  const mLabels=['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
  const tc=typeConfig();
  const tColors={};
  tc.forEach(t=>tColors[t.key]=t.color);
  const tNames={};
  tc.forEach(t=>tNames[t.key]=t.label);

  const mData=Array(12).fill(null).map(()=>({}));
  entries.forEach(e=>{
    const d=new Date(e.dateEnd||e.dateStart);
    if(isNaN(d)) return;
    const m=d.getMonth();
    mData[m][e.type]=(mData[m][e.type]||0)+1;
  });

  const curM=new Date().getMonth();
  const activeIdx=Array.from({length:Math.min(curM+1,12)},(_,i)=>i); // only up to current month
  const maxTot=Math.max(...activeIdx.map(i=>Object.values(mData[i]).reduce((a,b)=>a+b,0)),1);
  const BAR_H=140;

  // Hours per month using smart cross-month split
  const _monthlyMins = getMonthlyHours(entries);
  const mHours=Array(12).fill(0);
  const curY2 = new Date().getFullYear();
  Object.entries(_monthlyMins).forEach(([k,mins])=>{
    const [y,m]=k.split('-').map(Number);
    if(y===curY2&&m>=1&&m<=12) mHours[m-1]+=mins/60;
  });

  const legend=tc.filter(t=>entries.some(e=>e.type===t.key)).map(t=>`
    <div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted2)">
      <div style="width:9px;height:9px;border-radius:2px;background:${t.color}"></div>${t.label}
    </div>`).join('');

  const cols=activeIdx.map(i=>{
    const m=mData[i];
    const total=Object.values(m).reduce((a,b)=>a+b,0);
    const segs=tc.filter(t=>m[t.key]).map(t=>{
      const h=Math.max(3,Math.round((m[t.key]/maxTot)*BAR_H));
      return `<div style="height:${h}px;background:${t.color};width:100%"></div>`;
    }).join('');
    return `<div class="sb-col">
      <div class="mb-v">${total||''}</div>
      <div class="mb-area" style="height:${BAR_H}px">
        <div style="width:100%;height:100%;display:flex;flex-direction:column-reverse;border-radius:4px 4px 0 0;overflow:hidden">${segs}</div>
      </div>
      <div class="mb-lbl">${mLabels[i]}</div>
    </div>`;
  }).join('');

  return `<div class="an-card">
    <div class="an-ttl"><span>📆</span> Типи по місяцях</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${legend}</div>
    <div style="display:flex;align-items:flex-end;gap:8px">${cols}</div>
  </div>`;
}
