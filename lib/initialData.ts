import { MapanState } from './types';

export const DEFAULT_CLASSES = [
  { id: 'k1', nama_kelas: 'Kelas 1' },
  { id: 'k2', nama_kelas: 'Kelas 2' },
  { id: 'k3', nama_kelas: 'Kelas 3' },
  { id: 'k4', nama_kelas: 'Kelas 4' },
  { id: 'k5', nama_kelas: 'Kelas 5' },
  { id: 'k6a', nama_kelas: 'Kelas 6A' },
  { id: 'k6b', nama_kelas: 'Kelas 6B' },
];

export const DEFAULT_STUDENTS = [
  // Kelas 1
  { id: 's1-1', kelas_id: 'k1', nama: 'Ahmad Rafif' },
  { id: 's1-2', kelas_id: 'k1', nama: 'Budi Santoso' },
  { id: 's1-3', kelas_id: 'k1', nama: 'Citra Kirana' },
  { id: 's1-4', kelas_id: 'k1', nama: 'Dewi Lestari' },
  { id: 's1-5', kelas_id: 'k1', nama: 'Fajar Nugraha' },
  
  // Kelas 2
  { id: 's2-1', kelas_id: 'k2', nama: 'Aditya Pratama' },
  { id: 's2-2', kelas_id: 'k2', nama: 'Bunga Citra' },
  { id: 's2-3', kelas_id: 'k2', nama: 'Dedi Kusnadi' },
  { id: 's2-4', kelas_id: 'k2', nama: 'Eka Wijaya' },
  { id: 's2-5', kelas_id: 'k2', nama: 'Fitriani' },

  // Kelas 3
  { id: 's3-1', kelas_id: 'k3', nama: 'Andi Wijaya' },
  { id: 's3-2', kelas_id: 'k3', nama: 'Bagus Setiawan' },
  { id: 's3-3', kelas_id: 'k3', nama: 'Chandra Adi' },
  { id: 's3-4', kelas_id: 'k3', nama: 'Dian Permata' },
  { id: 's3-5', kelas_id: 'k3', nama: 'Farah Salsabila' },

  // Kelas 4
  { id: 's4-1', kelas_id: 'k4', nama: 'Anisa Rahmawati' },
  { id: 's4-2', kelas_id: 'k4', nama: 'Doni Damara' },
  { id: 's4-3', kelas_id: 'k4', nama: 'Gilang Dirga' },
  { id: 's4-4', kelas_id: 'k4', nama: 'Hendra Wijaya' },
  { id: 's4-5', kelas_id: 'k4', nama: 'Indah Permatasari' },

  // Kelas 5
  { id: 's5-1', kelas_id: 'k5', nama: 'Aris Munandar' },
  { id: 's5-2', kelas_id: 'k5', nama: 'Cici Paramida' },
  { id: 's5-3', kelas_id: 'k5', nama: 'Eko Prasetyo' },
  { id: 's5-4', kelas_id: 'k5', nama: 'Gita Gutawa' },
  { id: 's5-5', kelas_id: 'k5', nama: 'Irwan Yusuf' },

  // Kelas 6A
  { id: 's6a-1', kelas_id: 'k6a', nama: 'Ahmad Fauzi' },
  { id: 's6a-2', kelas_id: 'k6a', nama: 'Budi Utomo' },
  { id: 's6a-3', kelas_id: 'k6a', nama: 'Fajar Ramadhan' },
  { id: 's6a-4', kelas_id: 'k6a', nama: 'Hana Amalia' },
  { id: 's6a-5', kelas_id: 'k6a', nama: 'Joko Widodo' },
  { id: 's6a-6', kelas_id: 'k6a', nama: 'Kartika Sari' },
  { id: 's6a-7', kelas_id: 'k6a', nama: 'Luthfi Hakim' },

  // Kelas 6B
  { id: 's6b-1', kelas_id: 'k6b', nama: 'Megawati Putri' },
  { id: 's6b-2', kelas_id: 'k6b', nama: 'Nadiem Anwar' },
  { id: 's6b-3', kelas_id: 'k6b', nama: 'Prabowo Subianto' },
  { id: 's6b-4', kelas_id: 'k6b', nama: 'Rini Wulandari' },
  { id: 's6b-5', kelas_id: 'k6b', nama: 'Sandiaga Uno' },
  { id: 's6b-6', kelas_id: 'k6b', nama: 'Tri Rismaharini' },
  { id: 's6b-7', kelas_id: 'k6b', nama: 'Yusuf Mansur' },
];

const todayStr = new Date().toISOString().slice(0, 10);

export const INITIAL_STATE: MapanState = {
  classes: DEFAULT_CLASSES,
  students: DEFAULT_STUDENTS,
  nilaiHarian: [
    { id: 'nh-1', kelas_id: 'k6a', siswa_id: 's6a-1', tanggal: todayStr, mapel: 'Matematika', nilai: 90, keterangan: 'Sangat baik memahami pecahan' },
    { id: 'nh-2', kelas_id: 'k6a', siswa_id: 's6a-2', tanggal: todayStr, mapel: 'Matematika', nilai: 88, keterangan: 'Aktif mengerjakan soal' },
    { id: 'nh-3', kelas_id: 'k6a', siswa_id: 's6a-3', tanggal: todayStr, mapel: 'Matematika', nilai: 75, keterangan: 'Butuh bimbingan perkalian' },
    { id: 'nh-4', kelas_id: 'k1', siswa_id: 's1-1', tanggal: todayStr, mapel: 'Bahasa Indonesia', nilai: 95, keterangan: 'Membaca lancar' },
    { id: 'nh-5', kelas_id: 'k1', siswa_id: 's1-2', tanggal: todayStr, mapel: 'Bahasa Indonesia', nilai: 85, keterangan: 'Bagus mengeja kata' },
  ],
  nilaiUlangan: [
    { id: 'nu-1', kelas_id: 'k6a', siswa_id: 's6a-1', tanggal: todayStr, mapel: 'Matematika', jenis: 'Ulangan Harian 1', materi: 'Pecahan Senilai', nilai: 92, keterangan: 'Tuntas' },
    { id: 'nu-2', kelas_id: 'k6a', siswa_id: 's6a-2', tanggal: todayStr, mapel: 'Matematika', jenis: 'Ulangan Harian 1', materi: 'Pecahan Senilai', nilai: 85, keterangan: 'Tuntas' },
    { id: 'nu-3', kelas_id: 'k6a', siswa_id: 's6a-3', tanggal: todayStr, mapel: 'Matematika', jenis: 'Ulangan Harian 1', materi: 'Pecahan Senilai', nilai: 70, keterangan: 'Remedial' },
  ],
  pr: [
    { id: 'pr-1', kelas_id: 'k6a', tanggal: todayStr, mapel: 'Matematika', isi_pr: 'Kerjakan halaman 23\nNomor 1-10\nDikumpulkan Senin', deadline: '2026-07-06', catatan: 'Dikumpulkan pagi hari' },
    { id: 'pr-2', kelas_id: 'k1', tanggal: todayStr, mapel: 'Bahasa Indonesia', isi_pr: 'Membaca teks cerita halaman 5\nKerjakan soal di buku tulis', deadline: '2026-07-05', catatan: 'Paraf orang tua' },
  ],
  siswaAktif: [
    { id: 'sa-1', kelas_id: 'k6a', tanggal: todayStr, siswa_id: 's6a-1', aktivitas: 'Aktif menjawab pertanyaan pecahan', poin: 5, catatan: 'Sangat percaya diri' },
    { id: 'sa-2', kelas_id: 'k6a', tanggal: todayStr, siswa_id: 's6a-3', aktivitas: 'Berani maju mengerjakan soal di papan', poin: 5, catatan: 'Meningkatkan rasa percaya diri' },
  ],
  laporanSiswa: [
    { id: 'ls-1', kelas_id: 'k6a', tanggal: todayStr, siswa_id: 's6a-2', jenis: 'Kelalaian Tugas', catatan: 'Tidak membawa buku Matematika dan tidak mengerjakan tugas kemarin', tindak_lanjut: 'Dipanggil setelah pelajaran untuk bimbingan khusus', status: 'Selesai' },
    { id: 'ls-2', kelas_id: 'k1', tanggal: todayStr, siswa_id: 's1-2', jenis: 'Keaktifan Positif', catatan: 'Membantu merapikan meja guru', tindak_lanjut: 'Diberikan pujian verbal di depan kelas', status: 'Selesai' },
  ],
};
