import { MapanState, Siswa } from './types';

/**
 * Clean up strings for filenames
 */
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

/**
 * Gather evaluation data for a single student
 */
export const getStudentEvaluationData = (state: MapanState, studentId: string) => {
  const student = state.students.find((s) => s.id === studentId);
  if (!student) return null;

  const activeClass = state.classes.find((c) => c.id === student.kelas_id);
  const className = activeClass ? activeClass.nama_kelas : '-';

  // Get harian grades
  const harian = state.nilaiHarian.filter((n) => n.siswa_id === studentId);
  // Get exam grades
  const exams = state.nilaiUlangan.filter((n) => n.siswa_id === studentId);
  // Get active activities
  const activeLogs = state.siswaAktif.filter((n) => n.siswa_id === studentId);
  // Get behavior reports
  const behaviorLogs = state.laporanSiswa.filter((n) => n.siswa_id === studentId);

  // Calculate averages
  const harianAvg = harian.length > 0 ? (harian.reduce((sum, item) => sum + item.nilai, 0) / harian.length).toFixed(1) : '-';
  const examsAvg = exams.length > 0 ? (exams.reduce((sum, item) => sum + item.nilai, 0) / exams.length).toFixed(1) : '-';
  const totalActivePoints = activeLogs.reduce((sum, item) => sum + item.poin, 0);

  return {
    student,
    className,
    harian,
    exams,
    activeLogs,
    behaviorLogs,
    harianAvg,
    examsAvg,
    totalActivePoints,
  };
};

/**
 * Generate MS Word (.doc) Content
 */
export const exportStudentToWord = (state: MapanState, studentId: string) => {
  const data = getStudentEvaluationData(state, studentId);
  if (!data) return;

  const { student, className, harian, exams, activeLogs, behaviorLogs, harianAvg, examsAvg, totalActivePoints } = data;
  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Laporan Hasil Evaluasi Siswa - ${student.nama}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333333; padding: 20px; }
        .header { text-align: center; border-bottom: 3px double #0f766e; padding-bottom: 15px; margin-bottom: 25px; }
        .header h1 { margin: 0; color: #0f766e; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 4px 0 0; font-size: 12px; color: #666666; font-style: italic; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .meta-table td { padding: 6px 10px; border: 1px solid #dddddd; font-size: 13px; }
        .meta-table td.label { font-weight: bold; background-color: #f5f7fa; width: 20%; }
        .section-title { font-size: 15px; color: #0f766e; border-bottom: 2px solid #14b8a6; padding-bottom: 3px; margin-top: 25px; margin-bottom: 12px; font-weight: bold; text-transform: uppercase; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
        .data-table th { background-color: #0f766e; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: bold; border: 1px solid #0f766e; }
        .data-table td { padding: 8px 10px; border: 1px solid #dddddd; }
        .data-table tr.odd { background-color: #f9fbfb; }
        .data-table tr.total-row { font-weight: bold; background-color: #e6f4f2; }
        .text-center { text-align: center; }
        .badge { display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px; }
        .badge-success { background-color: #d1fae5; color: #065f46; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .footer-sign { margin-top: 50px; float: right; width: 250px; text-align: center; font-size: 13px; }
        .signature-line { margin-top: 70px; border-bottom: 1px solid #333333; font-weight: bold; padding-bottom: 3px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MAPAN (Manajemen Pencatatan Nilai)</h1>
        <p>Laporan Hasil Evaluasi Perkembangan Belajar &amp; Perilaku Siswa</p>
      </div>

      <table class="meta-table">
        <tr>
          <td class="label">Nama Siswa</td>
          <td>${student.nama}</td>
          <td class="label">Kelas</td>
          <td>${className}</td>
        </tr>
        <tr>
          <td class="label">Rerata Harian</td>
          <td><strong>${harianAvg}</strong></td>
          <td class="label">Rerata Ulangan</td>
          <td><strong>${examsAvg}</strong></td>
        </tr>
        <tr>
          <td class="label">Poin Keaktifan</td>
          <td><strong>${totalActivePoints > 0 ? '+' : ''}${totalActivePoints} Poin</strong></td>
          <td class="label">Tanggal Cetak</td>
          <td>${todayStr}</td>
        </tr>
      </table>

      <!-- NILAI HARIAN -->
      <div class="section-title">I. Catatan Nilai Tugas Harian</div>
      ${
        harian.length === 0
          ? '<p style="font-size: 12px; color: #888888; font-style: italic;">Belum ada data pencatatan nilai harian untuk siswa ini.</p>'
          : `
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="30%">Mata Pelajaran</th>
                <th width="15%" class="text-center">Nilai</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${harian
                .map(
                  (item, i) => `
                <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                  <td>${item.tanggal}</td>
                  <td>${item.mapel}</td>
                  <td class="text-center" style="font-weight: bold; color: ${item.nilai < 75 ? '#b91c1c' : '#0f766e'}">${item.nilai}</td>
                  <td>${item.keterangan || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <!-- NILAI ULANGAN -->
      <div class="section-title">II. Catatan Nilai Ulangan</div>
      ${
        exams.length === 0
          ? '<p style="font-size: 12px; color: #888888; font-style: italic;">Belum ada data pencatatan nilai ulangan untuk siswa ini.</p>'
          : `
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="25%">Jenis Ulangan</th>
                <th width="25%">Materi</th>
                <th width="15%" class="text-center">Nilai</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${exams
                .map(
                  (item, i) => `
                <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                  <td>${item.tanggal}</td>
                  <td>${item.jenis}</td>
                  <td>${item.materi}</td>
                  <td class="text-center" style="font-weight: bold; color: ${item.nilai < 75 ? '#b91c1c' : '#0f766e'}">${item.nilai}</td>
                  <td>${item.keterangan || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <!-- SISWA AKTIF -->
      <div class="section-title">III. Catatan Aktivitas &amp; Partisipasi Kelas</div>
      ${
        activeLogs.length === 0
          ? '<p style="font-size: 12px; color: #888888; font-style: italic;">Belum ada catatan partisipasi aktif di kelas.</p>'
          : `
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="45%">Aktivitas</th>
                <th width="15%" class="text-center">Poin</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${activeLogs
                .map(
                  (item, i) => `
                <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                  <td>${item.tanggal}</td>
                  <td>${item.aktivitas}</td>
                  <td class="text-center" style="font-weight: bold; color: ${item.poin >= 0 ? '#10b981' : '#f59e0b'}">${item.poin >= 0 ? '+' : ''}${item.poin}</td>
                  <td>${item.catatan || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <!-- LAPORAN PERILAKU -->
      <div class="section-title">IV. Laporan Perilaku &amp; Pembinaan Siswa</div>
      ${
        behaviorLogs.length === 0
          ? '<p style="font-size: 12px; color: #888888; font-style: italic;">Sangat Baik. Tidak ada catatan pelanggaran atau kelalaian khusus.</p>'
          : `
          <table class="data-table">
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="20%">Jenis</th>
                <th width="30%">Catatan Perilaku</th>
                <th width="20%">Tindak Lanjut</th>
                <th width="15%">Status</th>
              </tr>
            </thead>
            <tbody>
              ${behaviorLogs
                .map(
                  (item, i) => `
                <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
                  <td>${item.tanggal}</td>
                  <td><strong>${item.jenis}</strong></td>
                  <td>${item.catatan}</td>
                  <td>${item.tindak_lanjut || '-'}</td>
                  <td class="text-center">${item.status}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <!-- TANDA TANGAN -->
      <div class="footer-sign">
        <p>Mengetahui,</p>
        <p>Guru Kelas / Pengampu</p>
        <div class="signature-line">Abdul Aziz, S.Pd</div>
        <p>NIP. 19920824 202601 1 002</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Evaluasi_${sanitizeFilename(student.nama)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Print Student Evaluation using native Browser printing
 */
export const printStudentPDF = (state: MapanState, studentId: string) => {
  const data = getStudentEvaluationData(state, studentId);
  if (!data) return;

  const { student, className, harian, exams, activeLogs, behaviorLogs, harianAvg, examsAvg, totalActivePoints } = data;
  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan popup browser untuk mencetak laporan PDF.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Cetak Laporan - ${student.nama}</title>
      <style>
        body {
          font-family: 'Inter', system-ui, sans-serif;
          line-height: 1.5;
          color: #1e293b;
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px double #0f766e;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .header h1 {
          margin: 0;
          color: #0f766e;
          font-size: 24px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 13px;
          color: #475569;
          font-style: italic;
        }
        .meta-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 16px;
        }
        .meta-item {
          font-size: 14px;
        }
        .meta-item span.label {
          font-weight: 600;
          color: #475569;
          display: inline-block;
          width: 140px;
        }
        .meta-item span.value {
          font-weight: 500;
          color: #0f2942;
        }
        .section-title {
          font-size: 16px;
          color: #0f766e;
          border-bottom: 2px solid #14b8a6;
          padding-bottom: 4px;
          margin-top: 32px;
          margin-bottom: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        th {
          background-color: #0f766e;
          color: white;
          text-align: left;
          padding: 10px 12px;
          font-weight: 600;
          border: 1px solid #0f766e;
        }
        td {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .text-center {
          text-align: center;
        }
        .no-data {
          font-style: italic;
          color: #64748b;
          font-size: 13px;
          margin-bottom: 16px;
          background: #f1f5f9;
          padding: 12px;
          border-radius: 6px;
        }
        .footer-container {
          margin-top: 60px;
          display: flex;
          justify-content: flex-end;
        }
        .footer-sign {
          text-align: center;
          font-size: 14px;
          width: 250px;
        }
        .signature-line {
          margin-top: 80px;
          border-bottom: 1px solid #0f172a;
          font-weight: 700;
          padding-bottom: 4px;
        }
        @media print {
          body { padding: 20px; }
          button { display: none; }
        }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #14b8a6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .print-btn:hover {
          background-color: #0d9488;
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Cetak Dokumen</button>

      <div class="header">
        <h1>MAPAN - Manajemen Pencatatan Nilai</h1>
        <p>Laporan Hasil Evaluasi Perkembangan Belajar &amp; Perilaku Siswa</p>
      </div>

      <div class="meta-container">
        <div>
          <div class="meta-item"><span class="label">Nama Siswa</span>: <span class="value">${student.nama}</span></div>
          <div class="meta-item"><span class="label">Kelas</span>: <span class="value">${className}</span></div>
          <div class="meta-item"><span class="label">Tanggal Cetak</span>: <span class="value">${todayStr}</span></div>
        </div>
        <div>
          <div class="meta-item"><span class="label">Rerata Harian</span>: <span class="value" style="font-weight:bold; color: #0f766e">${harianAvg}</span></div>
          <div class="meta-item"><span class="label">Rerata Ulangan</span>: <span class="value" style="font-weight:bold; color: #0f766e">${examsAvg}</span></div>
          <div class="meta-item"><span class="label">Poin Keaktifan</span>: <span class="value" style="font-weight:bold; color: #10b981">${totalActivePoints > 0 ? '+' : ''}${totalActivePoints} Poin</span></div>
        </div>
      </div>

      <!-- NILAI HARIAN -->
      <div class="section-title">I. Catatan Nilai Tugas Harian</div>
      ${
        harian.length === 0
          ? '<div class="no-data">Belum ada data pencatatan nilai harian untuk siswa ini.</div>'
          : `
          <table>
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="35%">Mata Pelajaran</th>
                <th width="15%" class="text-center">Nilai</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${harian
                .map(
                  (item) => `
                <tr>
                  <td>${item.tanggal}</td>
                  <td>${item.mapel}</td>
                  <td class="text-center" style="font-weight: bold; color: ${item.nilai < 75 ? '#ef4444' : '#0f766e'}">${item.nilai}</td>
                  <td>${item.keterangan || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <!-- NILAI ULANGAN -->
      <div class="section-title">II. Catatan Nilai Ulangan</div>
      ${
        exams.length === 0
          ? '<div class="no-data">Belum ada data pencatatan nilai ulangan untuk siswa ini.</div>'
          : `
          <table>
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="25%">Jenis Ulangan</th>
                <th width="25%">Materi</th>
                <th width="15%" class="text-center">Nilai</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${exams
                .map(
                  (item) => `
                <tr>
                  <td>${item.tanggal}</td>
                  <td>${item.jenis}</td>
                  <td>${item.materi}</td>
                  <td class="text-center" style="font-weight: bold; color: ${item.nilai < 75 ? '#ef4444' : '#0f766e'}">${item.nilai}</td>
                  <td>${item.keterangan || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <!-- SISWA AKTIF -->
      <div class="section-title">III. Catatan Aktivitas &amp; Partisipasi Kelas</div>
      ${
        activeLogs.length === 0
          ? '<div class="no-data">Belum ada catatan partisipasi aktif di kelas untuk siswa ini.</div>'
          : `
          <table>
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="50%">Aktivitas</th>
                <th width="15%" class="text-center">Poin</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              ${activeLogs
                .map(
                  (item) => `
                <tr>
                  <td>${item.tanggal}</td>
                  <td>${item.aktivitas}</td>
                  <td class="text-center" style="font-weight: bold; color: ${item.poin >= 0 ? '#10b981' : '#f59e0b'}">${item.poin >= 0 ? '+' : ''}${item.poin}</td>
                  <td>${item.catatan || '-'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <!-- LAPORAN PERILAKU -->
      <div class="section-title">IV. Laporan Perilaku &amp; Pembinaan Siswa</div>
      ${
        behaviorLogs.length === 0
          ? '<div class="no-data" style="color:#0f766e; background-color:#f0fdfa;">Sangat Baik. Tidak ada catatan pelanggaran atau tindakan indisipliner khusus.</div>'
          : `
          <table>
            <thead>
              <tr>
                <th width="15%">Tanggal</th>
                <th width="20%">Jenis Laporan</th>
                <th width="35%">Catatan Perilaku</th>
                <th width="20%">Tindak Lanjut</th>
                <th width="10%">Status</th>
              </tr>
            </thead>
            <tbody>
              ${behaviorLogs
                .map(
                  (item) => `
                <tr>
                  <td>${item.tanggal}</td>
                  <td><strong>${item.jenis}</strong></td>
                  <td>${item.catatan}</td>
                  <td>${item.tindak_lanjut || '-'}</td>
                  <td class="text-center">${item.status}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
      }

      <div class="footer-container">
        <div class="footer-sign">
          <p>Mengetahui,</p>
          <p style="margin-bottom: 60px;">Guru Kelas / Pengampu</p>
          <div class="signature-line">Abdul Aziz, S.Pd</div>
          <p style="font-size:12px; color:#475569; margin: 2px 0;">NIP. 19920824 202601 1 002</p>
        </div>
      </div>

      <script>
        // Auto open print dialog on load
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Generate full Class Summary Word Report
 */
export const exportClassSummaryToWord = (state: MapanState, classId: string) => {
  const activeClass = state.classes.find((c) => c.id === classId);
  if (!activeClass) return;

  const classStudents = state.students
    .filter((s) => s.kelas_id === classId)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const studentEvaluationRows = classStudents.map((siswa, index) => {
    const studentData = getStudentEvaluationData(state, siswa.id);
    return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><strong>${siswa.nama}</strong></td>
        <td class="text-center">${studentData?.harianAvg || '-'}</td>
        <td class="text-center">${studentData?.examsAvg || '-'}</td>
        <td class="text-center" style="font-weight: bold;">${studentData?.totalActivePoints !== undefined && studentData.totalActivePoints > 0 ? '+' : ''}${studentData?.totalActivePoints || 0}</td>
        <td>${studentData?.behaviorLogs && studentData.behaviorLogs.length > 0 ? `${studentData.behaviorLogs.length} Catatan Perilaku` : 'Sangat Baik'}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Rekapitulasi Evaluasi Kelas - ${activeClass.nama_kelas}</title>
      <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333333; padding: 20px; }
        .header { text-align: center; border-bottom: 3px double #0f766e; padding-bottom: 15px; margin-bottom: 25px; }
        .header h1 { margin: 0; color: #0f766e; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 4px 0 0; font-size: 12px; color: #666666; font-style: italic; }
        .section-title { font-size: 15px; color: #0f766e; border-bottom: 2px solid #14b8a6; padding-bottom: 3px; margin-top: 15px; margin-bottom: 12px; font-weight: bold; text-transform: uppercase; }
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
        .data-table th { background-color: #0f766e; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: bold; border: 1px solid #0f766e; }
        .data-table td { padding: 8px 10px; border: 1px solid #dddddd; }
        .data-table tr.odd { background-color: #f9fbfb; }
        .text-center { text-align: center; }
        .footer-sign { margin-top: 50px; float: right; width: 250px; text-align: center; font-size: 13px; }
        .signature-line { margin-top: 70px; border-bottom: 1px solid #333333; font-weight: bold; padding-bottom: 3px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>MAPAN (Manajemen Pencatatan Nilai)</h1>
        <p>Laporan Rekapitulasi Evaluasi Siswa - ${activeClass.nama_kelas}</p>
      </div>

      <div style="font-size: 13px; margin-bottom: 15px;">
        <strong>Kelas:</strong> ${activeClass.nama_kelas}<br>
        <strong>Jumlah Siswa:</strong> ${classStudents.length}<br>
        <strong>Tanggal Rekap:</strong> ${todayStr}
      </div>

      <div class="section-title">Daftar Rekapitulasi Nilai &amp; Aktivitas</div>
      <table class="data-table">
        <thead>
          <tr>
            <th width="8%" class="text-center">No</th>
            <th width="32%">Nama Siswa</th>
            <th width="15%" class="text-center">Rata-rata Tugas</th>
            <th width="15%" class="text-center">Rata-rata Ulangan</th>
            <th width="15%" class="text-center">Poin Aktif</th>
            <th>Catatan Perilaku / Sikap</th>
          </tr>
        </thead>
        <tbody>
          ${studentEvaluationRows}
        </tbody>
      </table>

      <!-- TANDA TANGAN -->
      <div class="footer-sign">
        <p>Mengetahui,</p>
        <p>Guru Kelas / Pengampu</p>
        <div class="signature-line">Abdul Aziz, S.Pd</div>
        <p>NIP. 19920824 202601 1 002</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Evaluasi_${sanitizeFilename(activeClass.nama_kelas)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Print Class Summary PDF
 */
export const printClassSummaryPDF = (state: MapanState, classId: string) => {
  const activeClass = state.classes.find((c) => c.id === classId);
  if (!activeClass) return;

  const classStudents = state.students
    .filter((s) => s.kelas_id === classId)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const studentRows = classStudents.map((siswa, index) => {
    const studentData = getStudentEvaluationData(state, siswa.id);
    return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td><strong>${siswa.nama}</strong></td>
        <td class="text-center">${studentData?.harianAvg || '-'}</td>
        <td class="text-center">${studentData?.examsAvg || '-'}</td>
        <td class="text-center" style="font-weight: bold; color: #10b981">${studentData?.totalActivePoints !== undefined && studentData.totalActivePoints > 0 ? '+' : ''}${studentData?.totalActivePoints || 0}</td>
        <td>${studentData?.behaviorLogs && studentData.behaviorLogs.length > 0 ? `<span style="color: #b91c1c; font-weight: 500;">${studentData.behaviorLogs.length} Catatan Perilaku</span>` : '<span style="color: #0f766e;">Sangat Baik</span>'}</td>
      </tr>
    `;
  }).join('');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Mohon izinkan popup browser untuk mencetak rekap PDF.');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Rekap PDF - ${activeClass.nama_kelas}</title>
      <style>
        body {
          font-family: 'Inter', system-ui, sans-serif;
          line-height: 1.5;
          color: #1e293b;
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px double #0f766e;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .header h1 {
          margin: 0;
          color: #0f766e;
          font-size: 24px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .header p {
          margin: 6px 0 0;
          font-size: 13px;
          color: #475569;
          font-style: italic;
        }
        .summary-info {
          margin-bottom: 24px;
          font-size: 14px;
          color: #334155;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 14px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        th {
          background-color: #0f766e;
          color: white;
          text-align: left;
          padding: 10px 12px;
          font-weight: 600;
          border: 1px solid #0f766e;
        }
        td {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .text-center {
          text-align: center;
        }
        .footer-container {
          margin-top: 60px;
          display: flex;
          justify-content: flex-end;
        }
        .footer-sign {
          text-align: center;
          font-size: 14px;
          width: 250px;
        }
        .signature-line {
          margin-top: 80px;
          border-bottom: 1px solid #0f172a;
          font-weight: 700;
          padding-bottom: 4px;
        }
        @media print {
          body { padding: 20px; }
          button { display: none; }
        }
        .print-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #14b8a6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .print-btn:hover {
          background-color: #0d9488;
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Cetak Dokumen</button>

      <div class="header">
        <h1>MAPAN - Manajemen Pencatatan Nilai</h1>
        <p>Rekapitulasi Evaluasi Hasil Belajar &amp; Perilaku Kelas</p>
      </div>

      <div class="summary-info">
        <div>
          <strong>Kelas:</strong> ${activeClass.nama_kelas}<br>
          <strong>Jumlah Siswa:</strong> ${classStudents.length} Siswa
        </div>
        <div style="text-align: right;">
          <strong>Tanggal Rekap:</strong> ${todayStr}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th width="8%" class="text-center">No</th>
            <th width="32%">Nama Siswa</th>
            <th width="15%" class="text-center">Rerata Tugas</th>
            <th width="15%" class="text-center">Rerata Ulangan</th>
            <th width="15%" class="text-center">Poin Aktif</th>
            <th>Catatan Perilaku / Sikap</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
      </table>

      <div class="footer-container">
        <div class="footer-sign">
          <p>Mengetahui,</p>
          <p style="margin-bottom: 60px;">Guru Kelas / Pengampu</p>
          <div class="signature-line">Abdul Aziz, S.Pd</div>
          <p style="font-size:12px; color:#475569; margin: 2px 0;">NIP. 19920824 202601 1 002</p>
        </div>
      </div>

      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
