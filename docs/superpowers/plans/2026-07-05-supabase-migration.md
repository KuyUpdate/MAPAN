# MAPAN — Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate MAPAN from `localStorage`-only persistence to Supabase (PostgreSQL) database, then deploy via GitHub → Vercel.

**Architecture:** Local-First — keep React state as cache (instant UI), sync each mutation to Supabase in background. No auth/sessions. Seed data via `INITIAL_STATE` if Supabase is empty.

**Tech Stack:** `@supabase/supabase-js`, Next.js 15, TypeScript 5.9

## Global Constraints
- Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Anon key only (no auth) — RLS policy `FOR ALL USING (true) WITH CHECK (true)`
- `output: 'standalone'` in next.config.ts — must not break
- TypeScript strict: `ignoreBuildErrors: false`
- Table names snake_case: `nilai_harian`, `nilai_ulangan`, `siswa_aktif`, `laporan_siswa`
- Map: `nilaiHarian` ↔ `nilai_harian`, `nilaiUlangan` ↔ `nilai_ulangan`, `siswaAktif` ↔ `siswa_aktif`, `laporanSiswa` ↔ `laporan_siswa`, `pr` ↔ `pr`, `classes` ↔ `classes`, `students` ↔ `students`
- Keep `localStorage` import/export in Settings (manual backup still works)
- `lib/exporter.ts` unchanged (reads from React state)

---

### Task 1: Install dependency + create schema SQL + update env

**Files:**
- Modify: `package.json` (add dep)
- Create: `supabase/schema.sql`
- Modify: `.env.local`

- [ ] **Step 1: Install @supabase/supabase-js**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Create `supabase/schema.sql`**

```sql
-- MAPAN Database Schema for Supabase
-- Run this in Supabase SQL Editor after creating project

-- 1. Kelas (Classes)
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  nama_kelas TEXT NOT NULL
);

-- 2. Siswa (Students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  kelas_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  nama TEXT NOT NULL
);

-- 3. Nilai Harian
CREATE TABLE IF NOT EXISTS nilai_harian (
  id TEXT PRIMARY KEY,
  kelas_id TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  mapel TEXT NOT NULL,
  nilai NUMERIC NOT NULL,
  keterangan TEXT DEFAULT ''
);

-- 4. Nilai Ulangan
CREATE TABLE IF NOT EXISTS nilai_ulangan (
  id TEXT PRIMARY KEY,
  kelas_id TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  mapel TEXT DEFAULT '',
  jenis TEXT NOT NULL,
  materi TEXT DEFAULT '',
  nilai NUMERIC NOT NULL,
  keterangan TEXT DEFAULT ''
);

-- 5. PR (Pekerjaan Rumah)
CREATE TABLE IF NOT EXISTS pr (
  id TEXT PRIMARY KEY,
  kelas_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  mapel TEXT NOT NULL,
  isi_pr TEXT NOT NULL,
  deadline TEXT NOT NULL,
  catatan TEXT DEFAULT ''
);

-- 6. Siswa Aktif
CREATE TABLE IF NOT EXISTS siswa_aktif (
  id TEXT PRIMARY KEY,
  kelas_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  aktivitas TEXT NOT NULL,
  poin NUMERIC NOT NULL,
  catatan TEXT DEFAULT ''
);

-- 7. Laporan Siswa
CREATE TABLE IF NOT EXISTS laporan_siswa (
  id TEXT PRIMARY KEY,
  kelas_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  jenis TEXT NOT NULL,
  catatan TEXT DEFAULT '',
  tindak_lanjut TEXT DEFAULT '',
  status TEXT DEFAULT 'Selesai'
);

-- Row Level Security — single user, no auth
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai_ulangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa_aktif ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_siswa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON nilai_harian FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON nilai_ulangan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pr FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON siswa_aktif FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON laporan_siswa FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 3: Update `.env.local` — add Supabase placeholders**

Append to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: Success (no TS errors, dep installed)

---

### Task 2: Create `lib/supabase.ts` — client + helpers

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Write `lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import { MapanState } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Map state property names → Supabase table names
const TABLE_MAP: Record<keyof MapanState, string> = {
  classes: 'classes',
  students: 'students',
  nilaiHarian: 'nilai_harian',
  nilaiUlangan: 'nilai_ulangan',
  pr: 'pr',
  siswaAktif: 'siswa_aktif',
  laporanSiswa: 'laporan_siswa',
}

const REVERSE_TABLE_MAP: Record<string, keyof MapanState> = {
  classes: 'classes',
  students: 'students',
  nilai_harian: 'nilaiHarian',
  nilai_ulangan: 'nilaiUlangan',
  pr: 'pr',
  siswa_aktif: 'siswaAktif',
  laporan_siswa: 'laporanSiswa',
}

export async function loadAllData(): Promise<MapanState> {
  const entries = await Promise.all(
    (Object.keys(REVERSE_TABLE_MAP) as (keyof typeof REVERSE_TABLE_MAP)[]).map(async (table) => {
      const { data } = await supabase.from(table).select('*')
      return [REVERSE_TABLE_MAP[table], data || []] as const
    })
  )
  return Object.fromEntries(entries) as MapanState
}

export async function syncTable(tableName: string, records: any[]) {
  if (records.length === 0) return
  const { error } = await supabase.from(tableName).upsert(records, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteRecords(tableName: string, ids: string[]) {
  if (ids.length === 0) return
  const { error } = await supabase.from(tableName).delete().in('id', ids)
  if (error) throw error
}

export { TABLE_MAP }
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Success

---

### Task 3: Update init useEffect — load from Supabase + seed if empty

**Files:**
- Modify: `app/page.tsx`

**Interface changes:**
- Consumes: `loadAllData`, `syncTable` from `lib/supabase.ts`

- [ ] **Step 1: Add imports at top of `page.tsx`**

After: `import { INITIAL_STATE } from '../lib/initialData';`
Insert:
```typescript
import { loadAllData, syncTable } from '../lib/supabase';
```

- [ ] **Step 2: Replace init useEffect (lines ~121-141)**

**Old code:**
```typescript
  // 1. Initialize data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mapan_db_state');
      let dataToLoad = INITIAL_STATE;
      if (saved) {
        try {
          dataToLoad = JSON.parse(saved);
        } catch (e) {
          dataToLoad = INITIAL_STATE;
        }
      } else {
        localStorage.setItem('mapan_db_state', JSON.stringify(INITIAL_STATE));
      }
      
      // Defer state update to prevent synchronous rendering warnings
      const timer = setTimeout(() => {
        setState(dataToLoad);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);
```

**New code:**
```typescript
  // 1. Initialize data on mount — load from Supabase, fallback to localStorage seed
  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadAllData();
        const hasData = Object.values(data).some((arr: any[]) => arr.length > 0);
        if (hasData) {
          setState(data);
        } else {
          // Seed empty Supabase with INITIAL_STATE
          await syncTable('classes', INITIAL_STATE.classes);
          await syncTable('students', INITIAL_STATE.students);
          await syncTable('nilai_harian', INITIAL_STATE.nilaiHarian);
          await syncTable('nilai_ulangan', INITIAL_STATE.nilaiUlangan);
          await syncTable('pr', INITIAL_STATE.pr);
          await syncTable('siswa_aktif', INITIAL_STATE.siswaAktif);
          await syncTable('laporan_siswa', INITIAL_STATE.laporanSiswa);
          setState(INITIAL_STATE);
        }
      } catch (err) {
        console.error('Supabase init failed, fallback to localStorage:', err);
        // Fallback to localStorage if available
        const saved = typeof window !== 'undefined' ? localStorage.getItem('mapan_db_state') : null;
        setState(saved ? JSON.parse(saved) : INITIAL_STATE);
      }
    };
    init();
  }, []);
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: Success

---

### Task 4: Replace `saveState` + update all CRUD handlers

**Files:**
- Modify: `app/page.tsx`

**Overview:** Remove localStorage from `saveState`. Add per-table sync helper. Update all mutation handlers to call Supabase sync after `saveState`.

**Table mapping for each handler:**
| Handler | State key | Table name |
|---------|-----------|------------|
| handleAddStudent | students | students |
| handleEditStudent | students | students |
| handleDeleteStudent | students + records | students, nilai_harian, nilai_ulangan, siswa_aktif, laporan_siswa |
| handleSaveRecord (nilai_harian) | nilaiHarian | nilai_harian |
| handleSaveRecord (nilai_ulangan) | nilaiUlangan | nilai_ulangan |
| handleSaveRecord (pr) | pr | pr |
| handleSaveRecord (siswa_aktif) | siswaAktif | siswa_aktif |
| handleSaveRecord (laporan_siswa) | laporanSiswa | laporan_siswa |

- [ ] **Step 1: Add `persistTable` helper after `saveState` definition**

**Find:**
```typescript
  const saveState = (newState: MapanState) => {
    setState(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapan_db_state', JSON.stringify(newState));
    }
  };
```

**Replace with:**
```typescript
  const saveState = (newState: MapanState) => {
    setState(newState);
  };
  
  const persistTable = async (tableName: string, records: any[]) => {
    try {
      await syncTable(tableName, records);
    } catch (err) {
      console.error(`Failed to sync ${tableName}:`, err);
    }
  };
  
  const persistDelete = async (tableName: string, ids: string[]) => {
    try {
      await deleteRecords(tableName, ids);
    } catch (err) {
      console.error(`Failed to delete from ${tableName}:`, err);
    }
  };
```

**Also add import (already done in Task 3, but need `deleteRecords` too):**
```typescript
import { loadAllData, syncTable, deleteRecords } from '../lib/supabase';
```

- [ ] **Step 2: Update `handleAddStudent` — add Supabase sync**

**After this line:** `saveState(updated);`
**Insert:**
```typescript
      persistTable('students', updated.students);
```

- [ ] **Step 3: Update `handleEditStudent` — add Supabase sync**

**After this line:** `saveState(updated);`
**Insert:**
```typescript
      persistTable('students', updated.students);
```

- [ ] **Step 4: Update `handleDeleteStudent` — add Supabase sync for all affected tables**

**After this line:** `saveState(updated);`
**Insert:**
```typescript
      persistDelete('students', [studentId]);
      const nilaiHarianIds = state.nilaiHarian.filter(n => n.siswa_id === studentId).map(n => n.id);
      const nilaiUlanganIds = state.nilaiUlangan.filter(n => n.siswa_id === studentId).map(n => n.id);
      const siswaAktifIds = state.siswaAktif.filter(n => n.siswa_id === studentId).map(n => n.id);
      const laporanSiswaIds = state.laporanSiswa.filter(n => n.siswa_id === studentId).map(n => n.id);
      persistDelete('nilai_harian', nilaiHarianIds);
      persistDelete('nilai_ulangan', nilaiUlanganIds);
      persistDelete('siswa_aktif', siswaAktifIds);
      persistDelete('laporan_siswa', laporanSiswaIds);
```

- [ ] **Step 5: Update `handleSaveRecord` (5 record types) — add Supabase sync for each branch**

**After each `saveState({ ...state, ...newList })` in the 5 branches, insert `persistTable`:**

For **nilai_harian** (after `saveState({ ...state, nilaiHarian: newList });`):
```typescript
      persistTable('nilai_harian', newList);
```

For **nilai_ulangan** (after `saveState({ ...state, nilaiUlangan: newList });`):
```typescript
      persistTable('nilai_ulangan', newList);
```

For **pr** (after `saveState({ ...state, pr: newList });`):
```typescript
      persistTable('pr', newList);
```

For **siswa_aktif** (after `saveState({ ...state, siswaAktif: newList });`):
```typescript
      persistTable('siswa_aktif', newList);
```

For **laporan_siswa** (after `saveState({ ...state, laporanSiswa: newList });`):
```typescript
      persistTable('laporan_siswa', newList);
```

- [ ] **Step 6: Update `handleDeleteRecord` — add Supabase sync**

The `activeScreen` value matches the Supabase table name directly (`nilai_harian`, `nilai_ulangan`, `pr`, `siswa_aktif`, `laporan_siswa`). We need to derive the state key from activeScreen. The state key for each screen:
- `nilai_harian` → `nilaiHarian`
- `nilai_ulangan` → `nilaiUlangan`
- `pr` → `pr`
- `siswa_aktif` → `siswaAktif`
- `laporan_siswa` → `laporanSiswa`

**Add this mapping after `saveState` definition (near the `persistTable` helper):**
```typescript
  const screenToStateKey: Record<string, keyof MapanState> = {
    nilai_harian: 'nilaiHarian',
    nilai_ulangan: 'nilaiUlangan',
    pr: 'pr',
    siswa_aktif: 'siswaAktif',
    laporan_siswa: 'laporanSiswa',
  };
```

**After `saveState(updated);` inside `handleDeleteRecord`, insert:**
```typescript
      const stateKey = screenToStateKey[activeScreen];
      if (stateKey) persistTable(activeScreen, updated[stateKey]);
```

- [ ] **Step 7: Update bulk delete (`handleExecuteBulkDelete`) — add Supabase sync**

**After `saveState(updated);` inside `handleExecuteBulkDelete`, insert:**
```typescript
      const stateKey = screenToStateKey[activeScreen];
      if (stateKey) persistTable(activeScreen, updated[stateKey]);
```

- [ ] **Step 8: Build check**

Run: `npm run build`
Expected: Success

---

### Task 5: Handle Settings import — sync restored data to Supabase

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update `handleRestoreData` — sync imported data to Supabase**

**Replace the existing `saveState(parsed);` inside `handleRestoreData` (around line 651):**
```typescript
          saveState(parsed);
          persistTable('classes', parsed.classes);
          persistTable('students', parsed.students);
          persistTable('nilai_harian', parsed.nilaiHarian);
          persistTable('nilai_ulangan', parsed.nilaiUlangan);
          persistTable('pr', parsed.pr);
          persistTable('siswa_aktif', parsed.siswaAktif);
          persistTable('laporan_siswa', parsed.laporanSiswa);
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Success

---

### Task 6: Final build + cleanup

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Compiled successfully, no TS errors

- [ ] **Step 2: Verify no localStorage reads remain (except Settings backup/restore)**

Run: `rg "localStorage" app/page.tsx`
Expected: Only matches in `handleBackupData` and `handleRestoreData` fallback

- [ ] **Step 3: Update AGENTS.md — record Supabase integration**

Add to AGENTS.md's Architecture section:
```markdown
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js` — single-user, no auth
- **Persistence**: React state as cache (instant UI), Supabase upsert on each mutation (background)
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Initial schema**: `supabase/schema.sql` — run in Supabase SQL Editor on first setup
- **Seeding**: If Supabase returns empty on init, `INITIAL_STATE` is upserted automatically
```
