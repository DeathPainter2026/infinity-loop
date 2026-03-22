// =============================================
// INFINITY LOOP — Конфігурація Supabase
// Заповни своїми даними з supabase.com
// Settings → API
// =============================================

const SUPABASE_URL  = 'https://cteduqvxfppgpfhywsgw.supabase.co';   // <-- встав сюди
const SUPABASE_ANON = 'sb_publishable_NzotSPs6eBpFMmPMoNAgBQ_YalSVyzy';               // <-- встав сюди

// Не чіпай нижче
const SB = USE_SUPABASE
  ? window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;
const USE_SUPABASE = !SUPABASE_URL.includes('YOUR_PROJECT') && SUPABASE_ANON !== 'YOUR_ANON_PUBLIC_KEY';

if (USE_SUPABASE) {
  console.log('✅ Supabase підключено');
} else {
  console.log('⚠️ Працюємо локально (localStorage). Заповни config.js для хмари.');
}
