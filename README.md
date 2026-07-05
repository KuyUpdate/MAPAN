# MAPAN — Manajemen Pencatatan Nilai

Aplikasi pencatatan nilai siswa berbasis web untuk guru. Dibangun dengan Next.js 15 + Supabase.

## Deployment

Aplikasi ini dideploy dari GitHub ke Vercel secara otomatis:

1. Push kode ke `main` → Vercel auto-deploy
2. Pull Request → Vercel auto-create preview deployment

## Run Locally

**Prerequisites:** Node.js

```bash
npm install
cp .env.example .env.local
# Isi GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local
npm run dev
```

## Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Dashboard → Settings → API |
| `GEMINI_API_KEY` | ❌ (opsional) | Google AI Studio |

## Tech Stack

- **Next.js 15** (App Router, `output: 'standalone'`)
- **Supabase** (PostgreSQL, single user anon key + RLS)
- **Tailwind CSS v4**
- **TypeScript**
