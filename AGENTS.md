# MAPAN — Manajemen Pencatatan Nilai

## Quick start
```bash
npm install
# Set GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
npm run dev          # next dev
npm run build        # next build (eslint ignored during build; TS errors block build)
npm run lint         # eslint .
npm run clean        # next clean
```

## Architecture
- **Next.js 15 App Router** but behaves as a **single-page client app** — all UI lives in `app/page.tsx` (one `'use client'` component `MapanApp`, ~2400+ lines)
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js` — single user, no auth (anon key + RLS allow-all)
- **Persistence**: React state as cache (instant UI), Supabase upsert on each mutation (background). `localStorage` used only as init fallback
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required), `GEMINI_API_KEY`
- **Initial schema**: `supabase/schema.sql` — run in Supabase SQL Editor on first setup
- **Seeding**: If Supabase returns empty on init, `INITIAL_STATE` is upserted automatically
- **No API routes, no server actions, no middleware**
- **Classless CSS** — Tailwind CSS v4 with custom `tosca` color palette (`#14B8A6`), set in `app/globals.css` via `@theme`
- **Fonts**: Inter (sans) and Poppins (display), loaded via `next/font/google` in `app/layout.tsx`
- **`@/*`** path alias maps to project root
- Exports use HTML Blob (Word `.doc`) and `window.open`/`window.print` (PDF) — no library

## Key data model (`lib/types.ts`)
Single `MapanState` object: `classes[]`, `students[]`, `nilaiHarian[]`, `nilaiUlangan[]`, `pr[]`, `siswaAktif[]`, `laporanSiswa[]`.

## Bugs fixed & patterns to follow
- `editingRecord` typed as `EditingRecord` union (not `any`) — use `'property' in record` guards for type-safe access
- Toast timer uses `useRef` + cleanup `useEffect` to avoid state-on-unmounted

## Important quirks
- `output: 'standalone'` in next.config.ts (required for Vercel deployment)
- HMR disabled when `DISABLE_HMR=true` (AI Studio agent mode); file watcher set to ignore all
- `eslint.ignoreDuringBuilds: true` — lint won't fail `next build`, but TS errors will
- Uses `motion` package (not `framer-motion`) for animations
- Initial seed data in `lib/initialData.ts` with dynamic date `new Date().toISOString().slice(0, 10)`
- No tests, no CI config detected

## Commands to know
- `npm run dev` — starts dev server
- `npm run build` — full production build (will fail on TS errors)
- `npm run lint` — standalone ESLint check
- Preview: copy `metadata.json`, `app/`, `lib/`, `public/`, config files
