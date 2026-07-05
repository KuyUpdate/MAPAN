export interface Kelas {
  id: string;
  nama_kelas: string;
}

export interface Siswa {
  id: string;
  kelas_id: string;
  nama: string;
}

export interface NilaiHarian {
  id: string;
  kelas_id: string;
  siswa_id: string;
  tanggal: string; // YYYY-MM-DD
  mapel: string;
  nilai: number;
  keterangan: string;
}

export interface NilaiUlangan {
  id: string;
  kelas_id: string;
  siswa_id: string;
  tanggal: string; // YYYY-MM-DD
  mapel?: string;
  jenis: string; // e.g. UH1, UTS, UAS
  materi: string;
  nilai: number;
  keterangan: string;
}

export interface PR {
  id: string;
  kelas_id: string;
  tanggal: string; // YYYY-MM-DD
  mapel: string;
  isi_pr: string;
  deadline: string; // YYYY-MM-DD
  catatan: string;
}

export interface SiswaAktif {
  id: string;
  kelas_id: string;
  tanggal: string; // YYYY-MM-DD
  siswa_id: string;
  aktivitas: string;
  poin: number; // e.g. 5, 10, -5
  catatan: string;
}

export interface LaporanSiswa {
  id: string;
  kelas_id: string;
  tanggal: string; // YYYY-MM-DD
  siswa_id: string;
  jenis: string; // e.g. Perilaku Baik, Perilaku Kurang
  catatan: string;
  tindak_lanjut: string;
  status: string; // e.g. Selesai, Diproses
}

export interface MapanState {
  classes: Kelas[];
  students: Siswa[];
  nilaiHarian: NilaiHarian[];
  nilaiUlangan: NilaiUlangan[];
  pr: PR[];
  siswaAktif: SiswaAktif[];
  laporanSiswa: LaporanSiswa[];
}
