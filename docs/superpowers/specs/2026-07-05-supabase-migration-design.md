# MAPAN — Supabase Migration Design

## Overview
Migrate MAPAN from `localStorage`-only persistence to Supabase (PostgreSQL) database, then deploy via GitHub → Vercel.

## Decision Record
- **Auth model**: Single-user, no login/authentication
- **Existing data**: Start fresh (seed data via `INITIAL_STATE`), no migration
- **Architecture**: Local-First — keep React state as cache, sync each mutation to Supabase

## Database Schema

7 tables matching TypeScript types in `lib/types.ts`:

### `classes`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | Client-generated |
| nama_kelas | TEXT NOT NULL | |

### `students`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | Client-generated |
| kelas_id | TEXT NOT NULL | FK → classes(id) CASCADE |
| nama | TEXT NOT NULL | |

### `nilai_harian`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| kelas_id | TEXT NOT NULL | |
| siswa_id | TEXT NOT NULL | |
| tanggal | TEXT NOT NULL | YYYY-MM-DD |
| mapel | TEXT NOT NULL | |
| nilai | NUMERIC NOT NULL | |
| keterangan | TEXT DEFAULT '' | |

### `nilai_ulangan`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| kelas_id | TEXT NOT NULL | |
| siswa_id | TEXT NOT NULL | |
| tanggal | TEXT NOT NULL | |
| mapel | TEXT DEFAULT '' | |
| jenis | TEXT NOT NULL | e.g. UH1, UTS, UAS |
| materi | TEXT DEFAULT '' | |
| nilai | NUMERIC NOT NULL | |
| keterangan | TEXT DEFAULT '' | |

### `pr`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| kelas_id | TEXT NOT NULL | |
| tanggal | TEXT NOT NULL | |
| mapel | TEXT NOT NULL | |
| isi_pr | TEXT NOT NULL | |
| deadline | TEXT NOT NULL | |
| catatan | TEXT DEFAULT '' | |

### `siswa_aktif`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| kelas_id | TEXT NOT NULL | |
| tanggal | TEXT NOT NULL | |
| siswa_id | TEXT NOT NULL | |
| aktivitas | TEXT NOT NULL | |
| poin | NUMERIC NOT NULL | |
| catatan | TEXT DEFAULT '' | |

### `laporan_siswa`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| kelas_id | TEXT NOT NULL | |
| tanggal | TEXT NOT NULL | |
| siswa_id | TEXT NOT NULL | |
| jenis | TEXT NOT NULL | |
| catatan | TEXT DEFAULT '' | |
| tindak_lanjut | TEXT DEFAULT '' | |
| status | TEXT DEFAULT 'Selesai' | |

### RLS (Row Level Security)
Single-user without auth: enable RLS on all 7 tables, create allow-all policy per table.

```sql
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ... all 7 tables
CREATE POLICY "Allow all" ON classes FOR ALL USING (true) WITH CHECK (true);
-- ... all 7 tables
```

## Architecture

### Data Flow

**Initial Load:**
```
useEffect on mount
  → lib/supabase.ts: loadAllData()
    → Supabase.fetch('classes').select('*')
    → Supabase.fetch('students').select('*')
    → ... all 7 tables
  → If all returned empty → seed INITIAL_STATE to Supabase
  → setState(data)
```

**Mutation (add/edit record):**
```
handleSaveRecord / handleAddStudent / etc.
  → Build new item/list in memory
  → updateTable('nilai_harian', newList) or similar helper
    → setState(prev => ({...prev, nilaiHarian: newList}))  // instant UI
    → Supabase.from('nilai_harian').upsert(newList)         // background sync
```

**Delete (single / bulk / cascade):**
```
handleDeleteStudent / handleDeleteRecord / etc.
  → Update relevant lists in memory
  → syncTable / deleteRecords for affected tables
```

**Export / PDF:**
```
Not changed — still reads from in-memory React state.
```

### File Plan

| Action | File | Notes |
|--------|------|-------|
| **New** | `lib/supabase.ts` | Client init + 3 helpers |
| **New** | `supabase/schema.sql` | SQL to run in Supabase editor |
| **Edit** | `app/page.tsx` | Replace localStorage init + saveState + delete handlers |
| **Edit** | `package.json` | Add `@supabase/supabase-js` |
| **New/Edit** | `.env.local` | Add Supabase env vars |
| **Edit** | `next.config.ts` | Handle standalone output + env vars |

### No Changes Needed
- `lib/types.ts` — types stay the same
- `lib/exporter.ts` — still reads from React state
- `lib/initialData.ts` — still used for seeding
- `lib/utils.ts` — unrelated
- All CSS / UI components

## Vercel Deployment
- Push to GitHub
- Connect repo in Vercel dashboard
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project env vars
- Build already configured with `output: 'standalone'` in next.config.ts
- Deploy automatically on push to main branch

## Implementation Order
1. Install `@supabase/supabase-js`
2. Create `supabase/schema.sql`
3. Create `lib/supabase.ts`
4. Update `.env.local`
5. Edit `app/page.tsx`:
   a. Replace init useEffect (localStorage → loadAllData)
   b. Replace saveState with per-table sync helpers
   c. Update all CRUD handlers to call Supabase directly
   d. Remove localStorage-specific code (or keep for fallback)
6. Build & verify
7. Create GitHub repo → push → deploy to Vercel
8. User runs `supabase/schema.sql` in Supabase dashboard
