// =============================================
// INFINITY LOOP — Конфігурація Supabase
// =============================================

const SUPABASE_URL  = 'https://cteduqvxfppgpfhywsgw.supabase.co';
const SUPABASE_ANON = 'sb_publishable_NzotSPs6eBpFMmPMoNAgBQ_YalSVyzy';

const USE_SUPABASE = true;

// Ініціалізація клієнта — чекаємо поки бібліотека завантажиться
let SB = null;
function initSupabase() {
  if (window.supabase && USE_SUPABASE) {
    SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('✅ Supabase підключено');
  }
}
