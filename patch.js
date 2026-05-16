// Infinity Loop - monthHours patch
(function applyPatch() {
  if (typeof getMonthlyHours === 'undefined' || typeof updateKPI === 'undefined') {
    setTimeout(applyPatch, 100); return;
  }

  // 1. Patch getMonthlyHours
  window.getMonthlyHours = function(entries) {
    const monthMins = {};
    entries.forEach(e => {
      if (!e.dateEnd && !e.dateStart) return;
      if (e.monthHours && Object.keys(e.monthHours).length > 0) {
        Object.entries(e.monthHours).forEach(([key, mins]) => {
          const parts = key.split('-').map(Number);
          const k = parts[0] + '-' + String(parts[1]+1).padStart(2,'0');
          monthMins[k] = (monthMins[k]||0) + mins;
        });
        return;
      }
      const totalMin = parseDurationMinutes(e.dur||'');
      if (!totalMin) return;
      const dEnd = new Date(e.dateEnd||e.dateStart);
      const dStart = new Date(e.dateStart||e.dateEnd);
      if (isNaN(dEnd)||isNaN(dStart)) return;
      const isSerial = ['serial','anime-serial','mult-serial'].includes(e.type);
      const sk = dStart.getFullYear() + '-' + String(dStart.getMonth()+1).padStart(2,'0');
      const ek = dEnd.getFullYear() + '-' + String(dEnd.getMonth()+1).padStart(2,'0');
      if (!isSerial||sk===ek) { monthMins[ek]=(monthMins[ek]||0)+totalMin; return; }
      const eps=e.episodes||0;
      if (eps > 0) {
        const mPerEp=totalMin/eps;
        const ms=new Date(dEnd.getFullYear(),dEnd.getMonth(),1);
        const d=Math.round((dEnd-ms)/86400000)+1;
        const endEps=Math.min(eps,d*2);
        monthMins[ek]=(monthMins[ek]||0)+Math.round(endEps*mPerEp);
        monthMins[sk]=(monthMins[sk]||0)+(totalMin-Math.round(endEps*mPerEp));
      } else { monthMins[ek]=(monthMins[ek]||0)+totalMin; }
    });
    return monthMins;
  };

  // 2. Patch entryTotalMins
  window.entryTotalMins = function(e) {
    if (e.monthHours && Object.keys(e.monthHours).length > 0)
      return Object.values(e.monthHours).reduce((a,b)=>a+b,0);
    return parseDurationMinutes(e.dur||'');
  };

  // 3. Patch updateKPI to use getMonthlyHours (same as banner)
  window.updateKPI = function() {
    const entries = getEntries();
    const stats = calcStats(entries);
    const done = entries.filter(e => e.status === 'done');
    const mh = getMonthlyHours(done);
    const totalMin = Object.values(mh).reduce((a,b)=>a+b,0);
    const h = Math.floor(totalMin/60), m = totalMin%60;

    const el = document.getElementById('kTotal'); if(el) el.textContent = stats.total;
    const eh = document.getElementById('kHours'); if(eh) eh.textContent = h+':'+String(m).padStart(2,'0');
    const ed = document.getElementById('kDays');  if(ed) ed.textContent = '≈ '+(totalMin/60/24).toFixed(1)+' днів';
    const ea = document.getElementById('kAvg');   if(ea) ea.textContent = stats.avg;
    const ef = document.getElementById('kFire');  if(ef) ef.textContent = stats.fire;
    const ep = document.getElementById('kPlan');  if(ep) ep.textContent = stats.plan;
  };

  if (typeof render === 'function') render();
  console.log('patch.js applied');
})();
