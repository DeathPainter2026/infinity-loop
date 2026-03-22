// =============================================
// INFINITY LOOP — Конфігурація Supabase
// =============================================

var SUPABASE_URL  = 'https://cteduqvxfppgpfhywsgw.supabase.co';
var SUPABASE_ANON = 'sb_publishable_NzotSPs6eBpFMmPMoNAgBQ_YalSVyzy';
var USE_SUPABASE  = true;
var SB = null;

function initSupabase() {
  if (window.supabase && USE_SUPABASE) {
    SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('✅ Supabase підключено');
  } else {
    console.warn('⚠️ Supabase недоступний, використовуємо localStorage');
    USE_SUPABASE = false;
  }
}
