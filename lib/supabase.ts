import { createClient } from '@supabase/supabase-js'
import { MapanState } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  return Object.fromEntries(entries) as unknown as MapanState
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

export { REVERSE_TABLE_MAP }
