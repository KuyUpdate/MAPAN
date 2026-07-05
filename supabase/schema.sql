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
