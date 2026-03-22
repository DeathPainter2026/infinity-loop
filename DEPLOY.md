# 🚀 Деплой Infinity Loop — Покрокова інструкція

## Крок 1 — Supabase (хмарна база даних)

1. Зайди на **https://supabase.com** → Sign Up (через Google або GitHub)
2. Натисни **New Project**:
   - Name: `infinity-loop`
   - Database Password: вигадай і збережи
   - Region: `West EU (Ireland)`
3. Зачекай ~2 хв поки проєкт запуститься
4. В лівому меню → **SQL Editor** → вставити вміст файлу `supabase_setup.sql` → Run
5. Перейди в **Settings → API**:
   - Скопіюй **Project URL** (виглядає як `https://xxxxx.supabase.co`)
   - Скопіюй **anon public** key

6. Відкрий файл `js/config.js` і встав свої дані:
```js
const SUPABASE_URL  = 'https://xxxxx.supabase.co';   // твій URL
const SUPABASE_ANON = 'eyJhbGc...';                   // твій anon key
```

---

## Крок 2 — GitHub (зберігання коду)

1. Зайди на **https://github.com** → Sign Up
2. Натисни **+** → **New repository**:
   - Repository name: `infinity-loop`
   - Public ✓
   - → Create repository
3. На сторінці репозиторію натисни **uploading an existing file**
4. Перетягни ВСІ файли з папки `infinity-loop` (разом з папками `css/`, `js/`, `img/`)
5. Commit changes

---

## Крок 3 — Vercel (публікація сайту)

1. Зайди на **https://vercel.com** → Continue with GitHub
2. Натисни **Add New Project** → Import → вибери `infinity-loop`
3. Framework Preset: **Other**
4. → **Deploy**
5. Отримаєш посилання типу: `https://infinity-loop-xxx.vercel.app` 🎉

---

## Крок 4 — PWA на Android (встановлення як застосунок)

1. Відкрий своє Vercel посилання в **Chrome на Android**
2. Натисни меню (три крапки) → **Додати на головний екран**
3. Або Chrome покаже банер автоматично через ~30 сек
4. Застосунок зʼявиться на головному екрані як нативний!

---

## ⚠️ Важливо

- Файл `js/config.js` містить твій Supabase ключ — **не публікуй його публічно**
- Якщо репозиторій Private — треба підключити Vercel по-іншому (напиши, допоможу)
- Поточні дані з localStorage **не перенесуться** автоматично в Supabase
  → Якщо треба перенести — напиши, зроблю скрипт міграції

