'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  Library,
  Star,
  ClipboardList,
  Settings as SettingsIcon,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Search,
  SlidersHorizontal,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  X,
  Menu,
  ChevronRight,
  Award,
  FileText,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

import { MapanState, Kelas, Siswa, NilaiHarian, NilaiUlangan, PR, SiswaAktif, LaporanSiswa } from '../lib/types';

type EditingRecord = NilaiHarian | NilaiUlangan | PR | SiswaAktif | LaporanSiswa;
import { INITIAL_STATE } from '../lib/initialData';
import { loadAllData, syncTable, deleteRecords } from '../lib/supabase';
import {
  exportStudentToWord,
  printStudentPDF,
  exportClassSummaryToWord,
  printClassSummaryPDF
} from '../lib/exporter';

function MapanLogo({ className = "w-6 h-6", alt = "MAPAN" }: { className?: string; alt?: string }) {
  return <img src="/logo_MAPAN_putih.png" alt={alt} className={className} />;
}

export default function MapanApp() {
  // --- Persistent State ---
  const [state, setState] = useState<MapanState | null>(null);
  const [activeScreen, setActiveScreen] = useState<string>('splash');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Filter & Selection State ---
  const [selectedClassId, setSelectedClassId] = useState<string>('k1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('Semua');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterJenisUlangan, setFilterJenisUlangan] = useState<string>('Semua');

  // --- Modal & Forms Control ---
  const [activeModal, setActiveModal] = useState<string | null>(null); // 'add_siswa' | 'edit_siswa' | 'add_record' | 'edit_record' | 'confirm_delete_all' | 'confirm_delete_item' | 'student_report'
  const [editingStudent, setEditingStudent] = useState<Siswa | null>(null);
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null);
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string | null>(null);
  const [deleteConfirmationType, setDeleteConfirmationType] = useState<string>(''); // Section name for bulk delete
  const [itemToDelete, setItemToDelete] = useState<{ id: string; section: string } | null>(null);

  // --- Temporary Form States ---
  // Student form
  const [studentNameInput, setStudentNameInput] = useState('');
  
  // Grade/Record Forms (Unified fields)
  const [formTanggal, setFormTanggal] = useState('');
  const [formMapel, setFormMapel] = useState('');
  const [formSiswaId, setFormSiswaId] = useState('');
  const [formNilai, setFormNilai] = useState(80);
  const [formKeterangan, setFormKeterangan] = useState('');
  
  // Exam extra fields
  const [formJenisUlangan, setFormJenisUlangan] = useState('Ulangan Harian 1');
  const [formMateri, setFormMateri] = useState('');
  
  // Homework (PR) extra fields
  const [formIsiPr, setFormIsiPr] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  
  // Active student extra fields
  const [formAktivitas, setFormAktivitas] = useState('');
  const [formPoin, setFormPoin] = useState(5);
  
  // Behavior report extra fields
  const [formLaporanJenis, setFormLaporanJenis] = useState('Kelalaian Tugas');
  const [formTindakLanjut, setFormTindakLanjut] = useState('');
  const [formLaporanStatus, setFormLaporanStatus] = useState('Selesai');

  // Multi-select tracking for checkboxes
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File input ref for data restore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(0);
  const PER_PAGE = 25;

  // Inline form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 1. Initialize data on mount — load from Supabase, fallback to localStorage seed
  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadAllData();
        const hasData = Object.values(data).some((arr: any[]) => arr.length > 0);
        if (hasData) {
          setState(data);
        } else {
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
        const saved = typeof window !== 'undefined' ? localStorage.getItem('mapan_db_state') : null;
        setState(saved ? JSON.parse(saved) : INITIAL_STATE);
      }
    };
    init();
  }, []);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Reset pagination on filter/search/screen change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterSubject, filterDate, filterJenisUlangan, activeScreen]);

  // Warn before leaving with dirty form
  useEffect(() => {
    if (!activeModal) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [activeModal]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.ctrlKey || e.metaKey) {
        const screenMap: Record<string, string> = {
          '1': 'dashboard', '2': 'nilai_harian', '3': 'nilai_ulangan',
          '4': 'pr', '5': 'siswa_aktif', '6': 'laporan_siswa', '7': 'pengaturan'
        };
        if (screenMap[e.key]) { e.preventDefault(); setActiveScreen(screenMap[e.key]); setSelectedItemIds([]); }
        if (e.key === 'n' && activeScreen !== 'dashboard' && activeScreen !== 'pengaturan' && activeScreen !== 'splash') {
          e.preventDefault();
          setEditingRecord(null);
          setActiveModal('add_record');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeScreen]);

  // 2. Persist state — update React state (instant UI), Supabase sync happens per handler
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

  const screenToStateKey: Record<string, keyof MapanState> = {
    nilai_harian: 'nilaiHarian',
    nilai_ulangan: 'nilaiUlangan',
    pr: 'pr',
    siswa_aktif: 'siswaAktif',
    laporan_siswa: 'laporanSiswa',
  };

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <RefreshCw className="w-10 h-10 text-tosca-600 animate-spin" />
        <p className="mt-4 text-sm text-slate-500 font-medium">Memuat Aplikasi MAPAN...</p>
      </div>
    );
  }

  const activeClass = state.classes.find(c => c.id === selectedClassId) || state.classes[0];

  // Helper: Get alphabetical sorted students of currently selected class
  const classStudents = state.students
    .filter(s => s.kelas_id === selectedClassId)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  // --- Helper Date Creator ---
  const getTodayDateString = () => {
    const d = new Date();
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };

  const todayStr = getTodayDateString();

  // --- CRUD Operations for Students ---
  const handleAddStudent = () => {
    if (!studentNameInput.trim()) {
      showToast('Nama siswa tidak boleh kosong');
      return;
    }
    const newStudent: Siswa = {
      id: 'siswa_' + Date.now(),
      kelas_id: selectedClassId,
      nama: studentNameInput.trim()
    };
    const updated = {
      ...state,
      students: [...state.students, newStudent]
    };
    saveState(updated);
    persistTable('students', updated.students);
    setStudentNameInput('');
    setActiveModal(null);
    showToast(`Siswa "${newStudent.nama}" berhasil ditambahkan`);
  };

  const handleEditStudent = () => {
    if (!editingStudent || !studentNameInput.trim()) return;
    const updatedStudents = state.students.map(s => 
      s.id === editingStudent.id ? { ...s, nama: studentNameInput.trim() } : s
    );
    const updated = {
      ...state,
      students: updatedStudents
    };
    saveState(updated);
    persistTable('students', updated.students);
    setEditingStudent(null);
    setStudentNameInput('');
    setActiveModal(null);
    showToast('Nama siswa berhasil diperbarui');
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    
    // Cascade delete records of this student
    const updated = {
      ...state,
      students: state.students.filter(s => s.id !== studentId),
      nilaiHarian: state.nilaiHarian.filter(n => n.siswa_id !== studentId),
      nilaiUlangan: state.nilaiUlangan.filter(n => n.siswa_id !== studentId),
      siswaAktif: state.siswaAktif.filter(n => n.siswa_id !== studentId),
      laporanSiswa: state.laporanSiswa.filter(n => n.siswa_id !== studentId)
    };
    saveState(updated);
    persistDelete('students', [studentId]);
    persistDelete('nilai_harian', state.nilaiHarian.filter(n => n.siswa_id === studentId).map(n => n.id));
    persistDelete('nilai_ulangan', state.nilaiUlangan.filter(n => n.siswa_id === studentId).map(n => n.id));
    persistDelete('siswa_aktif', state.siswaAktif.filter(n => n.siswa_id === studentId).map(n => n.id));
    persistDelete('laporan_siswa', state.laporanSiswa.filter(n => n.siswa_id === studentId).map(n => n.id));
    showToast(`Siswa "${student.nama}" dan seluruh nilai terkait berhasil dihapus`);
  };

  // --- Reset Unified Form Fields ---
  const resetFormFields = (section: string) => {
    setFormTanggal(todayStr);
    setFormMapel('Matematika');
    setFormSiswaId(classStudents[0]?.id || '');
    setFormNilai(80);
    setFormKeterangan('');
    
    setFormJenisUlangan('Ulangan Harian 1');
    setFormMateri('');
    
    setFormIsiPr('');
    setFormDeadline(todayStr);
    
    setFormAktivitas('');
    setFormPoin(5);
    
    setFormLaporanJenis('Kelalaian Tugas');
    setFormTindakLanjut('');
    setFormLaporanStatus('Selesai');
    setFormErrors({});
  };

  // --- Inline form validation ---
  const validateField = (field: string, value: string | number) => {
    const err: Record<string, string> = {};
    if (field === 'siswa_id' && activeScreen !== 'pr' && !value) err.siswa_id = 'Pilih siswa';
    if (field === 'mapel' && activeScreen !== 'siswa_aktif' && activeScreen !== 'laporan_siswa' && !value) err.mapel = 'Pilih mata pelajaran';
    if (field === 'nilai' && (Number(value) < 0 || Number(value) > 100)) err.nilai = 'Nilai 0-100';
    if (field === 'isi_pr' && !value) err.isi_pr = 'Deskripsi PR tidak boleh kosong';
    if (field === 'deadline' && !value) err.deadline = 'Tentukan deadline';
    setFormErrors(prev => ({ ...prev, ...err }));
    return Object.keys(err).length === 0;
  };

  // --- CRUD Operations for Records ---
  const handleOpenAddRecord = () => {
    resetFormFields(activeScreen);
    setEditingRecord(null);
    setActiveModal('add_record');
  };

  const handleOpenEditRecord = (record: EditingRecord) => {
    setEditingRecord(record);
    setFormTanggal(record.tanggal);
    setFormMapel('mapel' in record ? (record.mapel || '') : '');
    setFormSiswaId('siswa_id' in record ? (record.siswa_id || '') : '');
    setFormNilai('nilai' in record ? (record.nilai || 0) : 0);
    setFormKeterangan('keterangan' in record ? (record.keterangan || '') : 'catatan' in record ? (record.catatan || '') : '');
    
    if ('jenis' in record && 'materi' in record) {
      setFormJenisUlangan(record.jenis || '');
      setFormMateri(record.materi || '');
    } else if ('isi_pr' in record) {
      setFormIsiPr(record.isi_pr || '');
      setFormDeadline(record.deadline || '');
    } else if ('aktivitas' in record) {
      setFormAktivitas(record.aktivitas || '');
      setFormPoin(record.poin || 0);
    } else if ('tindak_lanjut' in record) {
      setFormLaporanJenis(record.jenis || '');
      setFormTindakLanjut(record.tindak_lanjut || '');
      setFormLaporanStatus(record.status || 'Selesai');
    }
    
    setActiveModal('edit_record');
  };

  const handleSaveRecord = () => {
    if (activeScreen === 'pr') {
      if (!formMapel || !formIsiPr) {
        showToast('Isi Mata Pelajaran dan Deskripsi PR');
        return;
      }
      if (!formDeadline) {
        showToast('Isi batas pengumpulan (deadline) PR');
        return;
      }
    } else {
      if (!formSiswaId) {
        showToast('Pilih nama siswa terlebih dahulu');
        return;
      }
    }

    const recordId = editingRecord ? editingRecord.id : 'rec_' + Date.now();

    if (activeScreen === 'nilai_harian') {
      const data: NilaiHarian = {
        id: recordId,
        kelas_id: selectedClassId,
        siswa_id: formSiswaId,
        tanggal: formTanggal,
        mapel: formMapel,
        nilai: Number(formNilai),
        keterangan: formKeterangan
      };
      
      const newList = editingRecord 
        ? state.nilaiHarian.map(r => r.id === recordId ? data : r)
        : [...state.nilaiHarian, data];
      
      saveState({ ...state, nilaiHarian: newList });
      persistTable('nilai_harian', newList);
      showToast('Pencatatan nilai harian berhasil disimpan');

    } else if (activeScreen === 'nilai_ulangan') {
      const data: NilaiUlangan = {
        id: recordId,
        kelas_id: selectedClassId,
        siswa_id: formSiswaId,
        tanggal: formTanggal,
        mapel: formMapel,
        jenis: formJenisUlangan,
        materi: formMateri,
        nilai: Number(formNilai),
        keterangan: formKeterangan
      };
      
      const newList = editingRecord 
        ? state.nilaiUlangan.map(r => r.id === recordId ? data : r)
        : [...state.nilaiUlangan, data];
      
      saveState({ ...state, nilaiUlangan: newList });
      persistTable('nilai_ulangan', newList);
      showToast('Pencatatan nilai ulangan berhasil disimpan');

    } else if (activeScreen === 'pr') {
      const data: PR = {
        id: recordId,
        kelas_id: selectedClassId,
        tanggal: formTanggal,
        mapel: formMapel,
        isi_pr: formIsiPr,
        deadline: formDeadline,
        catatan: formKeterangan
      };
      
      const newList = editingRecord 
        ? state.pr.map(r => r.id === recordId ? data : r)
        : [...state.pr, data];
      
      saveState({ ...state, pr: newList });
      persistTable('pr', newList);
      showToast('Pencatatan Pekerjaan Rumah (PR) berhasil disimpan');

    } else if (activeScreen === 'siswa_aktif') {
      const data: SiswaAktif = {
        id: recordId,
        kelas_id: selectedClassId,
        tanggal: formTanggal,
        siswa_id: formSiswaId,
        aktivitas: formAktivitas || 'Aktif menjawab pertanyaan',
        poin: Number(formPoin),
        catatan: formKeterangan
      };
      
      const newList = editingRecord 
        ? state.siswaAktif.map(r => r.id === recordId ? data : r)
        : [...state.siswaAktif, data];
      
      saveState({ ...state, siswaAktif: newList });
      persistTable('siswa_aktif', newList);
      showToast('Catatan keaktifan siswa berhasil disimpan');

    } else if (activeScreen === 'laporan_siswa') {
      const data: LaporanSiswa = {
        id: recordId,
        kelas_id: selectedClassId,
        siswa_id: formSiswaId,
        tanggal: formTanggal,
        jenis: formLaporanJenis,
        catatan: formKeterangan || 'Terlambat masuk kelas',
        tindak_lanjut: formTindakLanjut,
        status: formLaporanStatus
      };
      
      const newList = editingRecord 
        ? state.laporanSiswa.map(r => r.id === recordId ? data : r)
        : [...state.laporanSiswa, data];
      
      saveState({ ...state, laporanSiswa: newList });
      persistTable('laporan_siswa', newList);
      showToast('Laporan perilaku siswa berhasil disimpan');
    }

    setActiveModal(null);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string) => {
    let updated = { ...state };
    if (activeScreen === 'nilai_harian') {
      updated.nilaiHarian = state.nilaiHarian.filter(r => r.id !== id);
    } else if (activeScreen === 'nilai_ulangan') {
      updated.nilaiUlangan = state.nilaiUlangan.filter(r => r.id !== id);
    } else if (activeScreen === 'pr') {
      updated.pr = state.pr.filter(r => r.id !== id);
    } else if (activeScreen === 'siswa_aktif') {
      updated.siswaAktif = state.siswaAktif.filter(r => r.id !== id);
    } else if (activeScreen === 'laporan_siswa') {
      updated.laporanSiswa = state.laporanSiswa.filter(r => r.id !== id);
    }
    saveState(updated);
    const stateKey = screenToStateKey[activeScreen];
    if (stateKey) persistTable(activeScreen, updated[stateKey]);
    setSelectedItemIds(prev => prev.filter(itemId => itemId !== id));
    showToast('Catatan berhasil dihapus');
  };

  // --- Bulk Deletion Actions (PRD Section 11, 12, 16) ---
  const handleOpenBulkDeleteConfirmation = () => {
    if (selectedItemIds.length === 0) {
      setDeleteConfirmationType('ALL');
    } else {
      setDeleteConfirmationType('SELECTED');
    }
    setActiveModal('confirm_delete_all');
  };

  const handleExecuteBulkDelete = () => {
    let updated = { ...state };
    
    if (deleteConfirmationType === 'ALL') {
      // Delete ALL records of CURRENT section for the CURRENT class
      if (activeScreen === 'nilai_harian') {
        updated.nilaiHarian = state.nilaiHarian.filter(r => r.kelas_id !== selectedClassId);
      } else if (activeScreen === 'nilai_ulangan') {
        updated.nilaiUlangan = state.nilaiUlangan.filter(r => r.kelas_id !== selectedClassId);
      } else if (activeScreen === 'pr') {
        updated.pr = state.pr.filter(r => r.kelas_id !== selectedClassId);
      } else if (activeScreen === 'siswa_aktif') {
        updated.siswaAktif = state.siswaAktif.filter(r => r.kelas_id !== selectedClassId);
      } else if (activeScreen === 'laporan_siswa') {
        updated.laporanSiswa = state.laporanSiswa.filter(r => r.kelas_id !== selectedClassId);
      }
      setSelectedItemIds([]);
      showToast('Seluruh data di menu ini untuk kelas ini berhasil dibersihkan');
    } else {
      // Delete selected item IDs only
      if (activeScreen === 'nilai_harian') {
        updated.nilaiHarian = state.nilaiHarian.filter(r => !selectedItemIds.includes(r.id));
      } else if (activeScreen === 'nilai_ulangan') {
        updated.nilaiUlangan = state.nilaiUlangan.filter(r => !selectedItemIds.includes(r.id));
      } else if (activeScreen === 'pr') {
        updated.pr = state.pr.filter(r => !selectedItemIds.includes(r.id));
      } else if (activeScreen === 'siswa_aktif') {
        updated.siswaAktif = state.siswaAktif.filter(r => !selectedItemIds.includes(r.id));
      } else if (activeScreen === 'laporan_siswa') {
        updated.laporanSiswa = state.laporanSiswa.filter(r => !selectedItemIds.includes(r.id));
      }
      setSelectedItemIds([]);
      showToast(`${selectedItemIds.length} item terpilih berhasil dihapus`);
    }
    setActiveModal(null);
    saveState(updated);
    const stateKey = screenToStateKey[activeScreen];
    if (stateKey) persistTable(activeScreen, updated[stateKey]);
  };

  // Checkbox handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (sectionItems: any[]) => {
    const sectionIds = sectionItems.map(item => item.id);
    const allSelected = sectionIds.every(id => selectedItemIds.includes(id));
    
    if (allSelected) {
      // Uncheck all of these
      setSelectedItemIds(prev => prev.filter(id => !sectionIds.includes(id)));
    } else {
      // Check all of these
      setSelectedItemIds(prev => {
        const union = new Set([...prev, ...sectionIds]);
        return Array.from(union);
      });
    }
  };

  // --- Realtime Search and Multi-Criteria Filtering (PRD Section 18 & 19) ---
  const filterAndSearch = (items: any[]) => {
    return items.filter(item => {
      // 1. Class filter (implied by default view of active selectedClassId)
      if (item.kelas_id !== selectedClassId) return false;

      // 2. Student search or subject query match
      let matchesSearch = true;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (activeScreen === 'pr') {
          matchesSearch = item.mapel.toLowerCase().includes(query) || item.isi_pr.toLowerCase().includes(query);
        } else {
          const student = state.students.find(s => s.id === item.siswa_id);
          const studentName = student ? student.nama.toLowerCase() : '';
          const mapel = item.mapel ? item.mapel.toLowerCase() : '';
          const catatan = item.catatan ? item.catatan.toLowerCase() : '';
          matchesSearch = studentName.includes(query) || mapel.includes(query) || catatan.includes(query);
        }
      }

      // 3. Subject filter (Optional dropdown)
      let matchesSubject = true;
      if (filterSubject !== 'Semua') {
        const itemMapel = item.mapel || (activeScreen === 'nilai_ulangan' ? 'Matematika' : '');
        matchesSubject = itemMapel.toLowerCase() === filterSubject.toLowerCase();
      }

      // 4. Date filter (Optional picker)
      let matchesDate = true;
      if (filterDate !== '') {
        matchesDate = item.tanggal === filterDate;
      }

      // 5. Jenis Ulangan filter (only for Nilai Ulangan screen)
      let matchesJenisUlangan = true;
      if (activeScreen === 'nilai_ulangan' && filterJenisUlangan !== 'Semua' && item.jenis) {
        matchesJenisUlangan = item.jenis.toLowerCase() === filterJenisUlangan.toLowerCase();
      }

      return matchesSearch && matchesSubject && matchesDate && matchesJenisUlangan;
    });
  };

  // --- Sorting Helper ---
  const handleToggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const applySort = <T extends Record<string, any>>(items: T[]): T[] => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      const valA = a[sortField as keyof T]?.toString() || '';
      const valB = b[sortField as keyof T]?.toString() || '';
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  };

  // --- Statistics Calculation for Dashboard (PRD Section 17) ---
  const totalStudentsCount = state.students.filter(s => s.kelas_id === selectedClassId).length;
  const nilaiHariIniCount = state.nilaiHarian.filter(r => r.kelas_id === selectedClassId && r.tanggal === todayStr).length;
  const activePRCount = state.pr.filter(r => r.kelas_id === selectedClassId && new Date(r.deadline) >= new Date(todayStr)).length;
  const activeStudentsTodayCount = state.siswaAktif.filter(r => r.kelas_id === selectedClassId && r.tanggal === todayStr).length;
  const behaviorReportsCount = state.laporanSiswa.filter(r => r.kelas_id === selectedClassId).length;

  // --- Settings Import / Export (PRD Section 20) ---
  const handleBackupData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MAPAN_Backup_${todayStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Data berhasil diekspor sebagai cadangan');
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.classes) && Array.isArray(parsed.students)) {
          saveState(parsed);
          persistTable('classes', parsed.classes);
          persistTable('students', parsed.students);
          persistTable('nilai_harian', parsed.nilaiHarian);
          persistTable('nilai_ulangan', parsed.nilaiUlangan);
          persistTable('pr', parsed.pr);
          persistTable('siswa_aktif', parsed.siswaAktif);
          persistTable('laporan_siswa', parsed.laporanSiswa);
          showToast('Data berhasil dipulihkan dari cadangan!');
        } else {
          showToast('Struktur file cadangan tidak valid.');
        }
      } catch (err) {
        showToast('Gagal membaca file cadangan.');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.onerror = () => {
      showToast('Gagal membaca file.');
      setIsRestoring(false);
    };
    reader.readAsText(file);
  };

  // Get current filtered rows for lists
  const currentNilaiHarian = filterAndSearch(state.nilaiHarian);
  const currentNilaiUlangan = filterAndSearch(state.nilaiUlangan);
  const currentPR = filterAndSearch(state.pr);
  const currentSiswaAktif = filterAndSearch(state.siswaAktif);
  const currentLaporanSiswa = filterAndSearch(state.laporanSiswa);

  // Recent activity feed for dashboard
  const recentActivity = [
    ...state.nilaiHarian.filter(r => r.kelas_id === selectedClassId).map(r => ({
      ...r, _type: 'nilai_harian' as const, _label: r.mapel, _value: `${r.nilai}`, _siswaId: r.siswa_id
    })),
    ...state.nilaiUlangan.filter(r => r.kelas_id === selectedClassId).map(r => ({
      ...r, _type: 'nilai_ulangan' as const, _label: r.jenis, _value: `${r.nilai}`, _siswaId: r.siswa_id
    })),
    ...state.pr.filter(r => r.kelas_id === selectedClassId).map(r => ({
      ...r, _type: 'pr' as const, _label: r.mapel, _value: r.isi_pr.slice(0, 40), _siswaId: null
    })),
    ...state.siswaAktif.filter(r => r.kelas_id === selectedClassId).map(r => ({
      ...r, _type: 'siswa_aktif' as const, _label: r.aktivitas, _value: `${r.poin >= 0 ? '+' : ''}${r.poin}`, _siswaId: r.siswa_id
    })),
    ...state.laporanSiswa.filter(r => r.kelas_id === selectedClassId).map(r => ({
      ...r, _type: 'laporan_siswa' as const, _label: r.jenis, _value: r.status, _siswaId: r.siswa_id
    })),
  ]
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, 10);

  // Subjects list for filters
  const availableSubjects = Array.from(new Set([
    "Al Qur'an & Hadits",
    "Akidah Akhlak",
    "Fikih",
    "SKI",
    "Bahasa Arab",
    "Bahasa Indonesia",
    "Bahasa Inggris",
    "Bahasa Jawa",
    "PKN",
    "IPAS",
    "Matematika",
    "PJOK",
    "SBDB"
  ]));

  return (
    <div className={`bg-slate-50 flex flex-col font-sans ${activeScreen !== 'splash' ? 'h-screen overflow-hidden' : 'min-h-screen'}`} id="mapan-root">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 max-w-sm text-sm"
          >
            <CheckCircle2 className="w-5 h-5 text-tosca-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          SCREEN 1: SPLASH & LANDING PAGE (PRD Section 6)
          ========================================================================= */}
      {activeScreen === 'splash' && (
        <div className="flex-1 flex flex-col justify-between items-center bg-white p-6 md:p-12 text-center select-none" id="splash-page">
          
          {/* Decorative Background Accent */}
          <div className="absolute inset-0 bg-radial-gradient from-tosca-50/40 via-transparent to-transparent pointer-events-none" />

          {/* Spacer */}
          <div className="h-4" />

          {/* Main Logo & Identity Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center max-w-md z-10"
          >
            <div className="w-20 h-20 bg-tosca-500 rounded-3xl flex items-center justify-center shadow-lg shadow-tosca-500/20 mb-6 border-b-4 border-tosca-700 overflow-hidden p-2">
              <MapanLogo className="w-full h-full text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-display mb-2">
              MAPAN
            </h1>
            <p className="text-sm font-semibold tracking-widest text-tosca-600 uppercase mb-4">
              Manajemen Pencatatan Nilai
            </p>
            <div className="h-1 w-16 bg-tosca-500 rounded-full mb-6" />
            
            <p className="text-slate-600 text-sm md:text-base px-4 font-light leading-relaxed">
              Solusi cerdas bagi guru untuk mencatat nilai, tugas harian, perilaku harian, dan pencapaian siswa secara praktis, fleksibel, dan mobile-first.
            </p>
          </motion.div>

          {/* Call to Action Button */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full max-w-xs z-10 my-8"
          >
            <button
              onClick={() => setActiveScreen('dashboard')}
              id="masuk-dashboard-btn"
              className="w-full bg-tosca-500 hover:bg-tosca-600 active:bg-tosca-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer text-base md:text-lg flex items-center justify-center gap-2 border-b-4 border-tosca-700 group"
            >
              Masuk Dashboard
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

          {/* PRD Mandated Footer Section */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full border-t border-slate-100 pt-6 max-w-sm z-10 text-slate-400 text-xs flex flex-col gap-1.5"
          >
            <p className="font-semibold text-slate-800">
              Pembuat: <span className="text-tosca-600">Abdul Aziz, S.Pd</span>
            </p>
            <p className="italic text-slate-500 text-sm py-1 font-medium px-4 bg-slate-50 rounded-full border border-slate-100 self-center">
              {"\"Mencatat Lebih Mudah, Mengajar Lebih Bermakna.\""}
            </p>
            <p className="text-slate-400 mt-2 font-mono tracking-wider">
              Tahun Rilis: 2026
            </p>
          </motion.div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 2: APP DASHBOARD / WORKSPACE (PRD Section 6 - 20)
          ========================================================================= */}
      {activeScreen !== 'splash' && (
        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
          
          {/* DESKTOP SIDEBAR (PRD Section 7) */}
          <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 shrink-0 p-5 shadow-sm overflow-y-auto h-full">
            
            {/* Sidebar Logo */}
            <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-100 cursor-pointer" onClick={() => setActiveScreen('splash')}>
              <div className="w-10 h-10 bg-tosca-500 rounded-xl flex items-center justify-center text-white shadow shadow-tosca-500/10 shrink-0 overflow-hidden p-1">
                <MapanLogo className="w-full h-full" />
              </div>
              <div>
                <h2 className="font-extrabold font-display text-slate-950 tracking-tight text-lg leading-none">MAPAN</h2>
                <span className="text-[10px] text-slate-400 tracking-widest font-bold uppercase">Pencatatan Nilai</span>
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className="flex-1 flex flex-col gap-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'nilai_harian', label: 'Nilai Harian', icon: BookOpen },
                { id: 'nilai_ulangan', label: 'Nilai Ulangan', icon: FileSpreadsheet },
                { id: 'pr', label: 'PR (Tugas Rumah)', icon: Library },
                { id: 'siswa_aktif', label: 'Siswa Aktif', icon: Star },
                { id: 'laporan_siswa', label: 'Laporan Siswa', icon: ClipboardList },
                { id: 'pengaturan', label: 'Pengaturan', icon: SettingsIcon },
              ].map((item) => {
                const IconComp = item.icon;
                const isActive = activeScreen === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-link-${item.id}`}
                    onClick={() => {
                      setActiveScreen(item.id);
                      setSearchQuery('');
                      setSelectedItemIds([]);
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? 'bg-tosca-50 text-tosca-700 shadow-sm shadow-tosca-500/5' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <IconComp className={`w-5 h-5 ${isActive ? 'text-tosca-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Class Quick Selection Sidebar Widget */}
            <div className="mt-auto border-t border-slate-100 pt-5">
              <label className="text-[11px] font-bold tracking-widest text-slate-400 uppercase block mb-2.5">
                PILIH KELAS AKTIF
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {state.classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSelectedItemIds([]);
                    }}
                    className={`text-xs font-bold py-2 px-2.5 rounded-lg border transition-all cursor-pointer ${
                      selectedClassId === cls.id
                        ? 'bg-tosca-600 border-tosca-600 text-white shadow shadow-tosca-500/10'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cls.nama_kelas}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[10px] text-slate-400 text-center leading-tight">
                Ctrl+1-7 navigasi · Ctrl+N tambah data
              </div>
            </div>
          </aside>

          {/* MOBILE APP BAR & MENU BUTTON (PRD Section 6) */}
          <header className="md:hidden bg-white border-b border-slate-100 h-16 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveScreen('splash')}>
              <div className="w-8 h-8 bg-tosca-500 rounded-lg flex items-center justify-center text-white overflow-hidden p-1">
                <MapanLogo className="w-full h-full" />
              </div>
              <div>
                <h1 className="font-extrabold font-display text-slate-950 text-base tracking-tight leading-none">MAPAN</h1>
                <span className="text-[9px] text-slate-400 tracking-wider font-bold">SD/MI</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Class Dropdown for Mobile Header */}
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedItemIds([]);
                }}
                className="bg-slate-100 border-none text-xs font-bold py-1.5 px-2.5 rounded-lg text-slate-700 outline-none cursor-pointer"
              >
                {state.classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.nama_kelas}</option>
                ))}
              </select>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                id="mobile-menu-btn"
                className="w-10 h-10 flex items-center justify-center text-slate-600 rounded-xl hover:bg-slate-50 border border-slate-200 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* MOBILE NAVIGATION DRAWER */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
                />
                
                {/* Menu */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl p-6 md:hidden flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-tosca-500 rounded-lg flex items-center justify-center text-white overflow-hidden p-1">
                        <MapanLogo className="w-full h-full" />
                      </div>
                      <h2 className="font-bold text-slate-900 font-display">Navigasi Menu</h2>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <nav className="flex-1 flex flex-col gap-1.5">
                    {[
                      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                      { id: 'nilai_harian', label: 'Nilai Harian', icon: BookOpen },
                      { id: 'nilai_ulangan', label: 'Nilai Ulangan', icon: FileSpreadsheet },
                      { id: 'pr', label: 'PR (Tugas Rumah)', icon: Library },
                      { id: 'siswa_aktif', label: 'Siswa Aktif', icon: Star },
                      { id: 'laporan_siswa', label: 'Laporan Siswa', icon: ClipboardList },
                      { id: 'pengaturan', label: 'Pengaturan', icon: SettingsIcon },
                    ].map((item) => {
                      const IconComp = item.icon;
                      const isActive = activeScreen === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveScreen(item.id);
                            setMobileMenuOpen(false);
                            setSearchQuery('');
                            setSelectedItemIds([]);
                          }}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-tosca-500 text-white shadow-md' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <IconComp className="w-5 h-5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>

                  <div className="border-t border-slate-100 pt-5 text-center">
                    <p className="text-[11px] font-bold tracking-wide text-slate-400 uppercase">MAPAN v1.0</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Abdul Aziz, S.Pd © 2026</p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* MAIN CONTENT DISPLAY AREA */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col gap-6" id="main-workspace">
            
            {/* Header Title with Active Class Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
              <div>
                <span className="text-[11px] font-extrabold tracking-widest text-tosca-600 uppercase">
                  MANAJEMEN PENCATATAN NILAI
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display flex items-center gap-2 mt-1">
                  {activeScreen === 'dashboard' && 'Dashboard Utama'}
                  {activeScreen === 'nilai_harian' && 'Pencatatan Nilai Harian'}
                  {activeScreen === 'nilai_ulangan' && 'Pencatatan Nilai Ulangan'}
                  {activeScreen === 'pr' && 'Pencatatan Pekerjaan Rumah (PR)'}
                  {activeScreen === 'siswa_aktif' && 'Catatan Siswa Aktif'}
                  {activeScreen === 'laporan_siswa' && 'Laporan Perilaku & Sikap'}
                  {activeScreen === 'pengaturan' && 'Pengaturan Aplikasi'}
                </h1>
              </div>

              {/* Responsive Class Banner / Summary Widget */}
              <div className="bg-white border border-slate-200/80 rounded-2xl py-2 px-4 shadow-sm self-start md:self-auto flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-tosca-50 flex items-center justify-center text-tosca-600">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 leading-none">KELAS YANG DIKELOLA</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{activeClass.nama_kelas} ({totalStudentsCount} Siswa)</div>
                </div>
              </div>
            </div>

            {/* =========================================================================
                MODULE 1: DASHBOARD HUB (PRD Section 17)
                ========================================================================= */}
            {activeScreen === 'dashboard' && (
              <div className="flex flex-col gap-6 animate-fade-in" id="dashboard-view">
                
                {/* Stats Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 md:gap-5">
                  {[
                    { label: 'Nilai Hari Ini', val: nilaiHariIniCount, color: 'border-l-4 border-l-tosca-500', desc: 'Nilai tugas baru', icon: BookOpen, screen: 'nilai_harian' },
                    { label: 'PR Aktif', val: activePRCount, color: 'border-l-4 border-l-emerald-500', desc: 'Pekerjaan rumah', icon: Library, screen: 'pr' },
                    { label: 'Siswa Aktif', val: activeStudentsTodayCount, color: 'border-l-4 border-l-amber-500', desc: 'Poin partisipasi', icon: Star, screen: 'siswa_aktif' },
                    { label: 'Laporan Perilaku', val: behaviorReportsCount, color: 'border-l-4 border-l-rose-500', desc: 'Catatan bimbingan', icon: ClipboardList, screen: 'laporan_siswa' },
                    { label: 'Total Siswa', val: totalStudentsCount, color: 'border-l-4 border-l-indigo-500', desc: 'Siswa terdaftar', icon: User, screen: 'dashboard' },
                  ].map((card, idx) => {
                    const IconComp = card.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (card.screen !== 'dashboard') {
                            setActiveScreen(card.screen);
                            setSelectedItemIds([]);
                          }
                        }}
                        className={`bg-white p-4.5 rounded-2xl border border-slate-150 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all ${card.color} flex flex-col justify-between h-32`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                          <IconComp className="w-5 h-5 text-slate-400" />
                        </div>
                        <div>
                          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display leading-none mb-1">{card.val}</div>
                          <p className="text-[11px] text-slate-400 leading-none">{card.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Main Dashboard Layout (Split Content) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Student List Management & Alphabetical Sort (PRD Section 10) */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:col-span-1">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="font-extrabold text-slate-950 text-base font-display">Daftar Siswa</h3>
                        <p className="text-[11px] text-slate-400 leading-none mt-1">Urut otomatis abjad</p>
                      </div>
                      <button
                        onClick={() => {
                          setStudentNameInput('');
                          setEditingStudent(null);
                          setActiveModal('add_siswa');
                        }}
                        id="tambah-siswa-btn"
                        className="bg-tosca-500 hover:bg-tosca-600 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Nama
                      </button>
                    </div>

                    {/* Student List Scrollable Area */}
                    {classStudents.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm italic">
                        Belum ada data siswa di kelas ini.<br/>Klik Tambah Nama untuk memulai.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 max-h-[380px] overflow-y-auto pr-1">
                        {classStudents.map((siswa, i) => (
                          <div
                            key={siswa.id}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 group transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-mono font-semibold text-slate-300 w-5 text-right">{i + 1}</span>
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                {siswa.nama.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold text-slate-700 truncate">{siswa.nama}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Open report card summary */}
                              <button
                                title="Laporan Evaluasi Siswa (PDF / Word)"
                                onClick={() => {
                                  setSelectedStudentForReport(siswa.id);
                                  setActiveModal('student_report');
                                }}
                                className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-tosca-600 hover:bg-tosca-50 cursor-pointer"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                title="Edit Nama Siswa"
                                onClick={() => {
                                  setEditingStudent(siswa);
                                  setStudentNameInput(siswa.nama);
                                  setActiveModal('edit_siswa');
                                }}
                                className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                title="Hapus Siswa"
                                onClick={() => handleDeleteStudent(siswa.id)}
                                className="w-7.5 h-7.5 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Class Reports Download menu */}
                    {classStudents.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-slate-100">
                        <label className="text-[10px] font-bold tracking-widest text-slate-400 block mb-2 uppercase">UNDUH REKAPITULASI KELAS</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => exportClassSummaryToWord(state, selectedClassId)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            Format Word
                          </button>
                          <button
                            onClick={() => printClassSummaryPDF(state, selectedClassId)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-tosca-600" />
                            Cetak PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Dashboard Feed — Recent Activity */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-950 text-base font-display mb-4 pb-3 border-b border-slate-100">
                        Aktivitas Terbaru
                      </h3>

                      {/* Averages mini cards */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                          <div className="flex items-center gap-2 mb-1 text-tosca-700 font-bold text-xs">
                            <BookOpen className="w-3.5 h-3.5" />
                            Rata-rata Nilai Harian
                          </div>
                          <span className="text-lg font-extrabold text-slate-900 font-display">
                            {(() => {
                              const g = state.nilaiHarian.filter(r => r.kelas_id === selectedClassId);
                              return g.length === 0 ? '-' : (g.reduce((s, i) => s + i.nilai, 0) / g.length).toFixed(1);
                            })()}
                          </span>
                        </div>
                        <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                          <div className="flex items-center gap-2 mb-1 text-emerald-700 font-bold text-xs">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Rata-rata Nilai Ulangan
                          </div>
                          <span className="text-lg font-extrabold text-slate-900 font-display">
                            {(() => {
                              const g = state.nilaiUlangan.filter(r => r.kelas_id === selectedClassId);
                              return g.length === 0 ? '-' : (g.reduce((s, i) => s + i.nilai, 0) / g.length).toFixed(1);
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Recent activity feed */}
                      {recentActivity.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-8">
                          Belum ada aktivitas di kelas ini. Mulai catat nilai harian, ulangan, atau PR.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto pr-1">
                          {recentActivity.map(item => {
                            const siswa = item._siswaId ? state.students.find(s => s.id === item._siswaId) : null;
                            const iconMap = {
                              nilai_harian: BookOpen, nilai_ulangan: FileSpreadsheet, pr: Library,
                              siswa_aktif: Star, laporan_siswa: ClipboardList
                            };
                            const IconComp = iconMap[item._type];
                            const screenMap: Record<string, string> = {
                              nilai_harian: 'nilai_harian', nilai_ulangan: 'nilai_ulangan', pr: 'pr',
                              siswa_aktif: 'siswa_aktif', laporan_siswa: 'laporan_siswa'
                            };
                            return (
                              <div
                                key={item.id}
                                onClick={() => { setActiveScreen(screenMap[item._type]); setSelectedItemIds([]); }}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all group"
                              >
                                <div className="w-8 h-8 rounded-lg bg-tosca-50 flex items-center justify-center text-tosca-600 shrink-0">
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800 truncate">{siswa?.nama || (item._type === 'pr' ? 'PR Kelas' : 'Siswa')}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{item.tanggal}</span>
                                  </div>
                                  <div className="text-xs text-slate-500 truncate">{item._label}</div>
                                </div>
                                <div className="text-xs font-bold text-slate-700 bg-slate-100 py-1 px-2.5 rounded-lg shrink-0 group-hover:bg-tosca-50 group-hover:text-tosca-700 transition-colors">
                                  {item._value}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 text-[11px] text-slate-400 border-t border-slate-100 pt-3 text-center md:text-left">
                      Aplikasi MAPAN Manajemen Pencatatan Nilai Siswa SD/MI Berbasis Mobile-First.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                MODULE 2: EVALUATION AND GRADING WORKSPACES (Nilai Harian, Ulangan, PR, dsb.)
                ========================================================================= */}
            {activeScreen !== 'dashboard' && activeScreen !== 'pengaturan' && (
              <div className="flex flex-col gap-5 animate-fade-in">
                
                {/* Search & Custom Filter Controls Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  
                  {/* Realtime Search Field */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={activeScreen === 'pr' ? 'Cari mata pelajaran atau deskripsi PR...' : 'Cari nama siswa... (Realtime)'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-tosca-500 focus:bg-white transition-all font-medium text-slate-700"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Date Filter Dropdown */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
                      <Calendar className="w-4 h-4 text-slate-400 mr-1.5" />
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-transparent border-none text-xs font-semibold py-2.5 text-slate-600 outline-none cursor-pointer"
                      />
                      {filterDate && (
                        <button onClick={() => setFilterDate('')} className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Jenis Ulangan Filter (only for Nilai Ulangan screen) */}
                    {activeScreen === 'nilai_ulangan' && (
                      <select
                        value={filterJenisUlangan}
                        onChange={(e) => setFilterJenisUlangan(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold py-2.5 px-3 text-slate-600 outline-none cursor-pointer"
                      >
                        <option value="Semua">Semua Jenis Ulangan</option>
                        <option value="Ulangan Harian 1">Ulangan Harian 1</option>
                        <option value="Ulangan Harian 2">Ulangan Harian 2</option>
                        <option value="Ulangan Harian 3">Ulangan Harian 3</option>
                        <option value="UTS">UTS</option>
                        <option value="UAS">UAS</option>
                      </select>
                    )}

                    {/* Subject Filter (Harian, Ulangan, PR) */}
                    {(activeScreen === 'nilai_harian' || activeScreen === 'nilai_ulangan' || activeScreen === 'pr') && (
                      <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold py-2.5 px-3 text-slate-600 outline-none cursor-pointer"
                      >
                        <option value="Semua">Semua Mapel</option>
                        {availableSubjects.map((sub, i) => (
                          <option key={i} value={sub}>{sub}</option>
                        ))}
                      </select>
                    )}

                    {/* Add New Record Button */}
                    <button
                      onClick={handleOpenAddRecord}
                      id="tambah-data-btn"
                      className="bg-tosca-500 hover:bg-tosca-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow shadow-tosca-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Data
                    </button>
                    <span className="hidden md:inline text-[10px] text-slate-400 font-medium">Ctrl+N</span>
                  </div>
                </div>

                {/* Main Data Table Display Card */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  
                  {/* Table Toolbar (Bulk Actions) */}
                  <div className="bg-slate-50 border-b border-slate-100 py-3.5 px-4.5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Daftar Rekam Data</span>
                      {selectedItemIds.length > 0 && (
                        <span className="text-xs bg-tosca-50 text-tosca-700 font-bold px-2 py-0.5 rounded-md">
                          {selectedItemIds.length} terpilih
                        </span>
                      )}
                    </div>

                    {/* Bulk Action Trigger Buttons */}
                    <div className="flex items-center gap-2">
                      {selectedItemIds.length > 0 ? (
                        <button
                          onClick={handleOpenBulkDeleteConfirmation}
                          id="hapus-terpilih-btn"
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Terpilih
                        </button>
                      ) : (
                        <button
                          onClick={handleOpenBulkDeleteConfirmation}
                          id="hapus-semua-btn"
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Semua Kelas ini
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2A. LIST VIEW: NILAI HARIAN */}
                  {activeScreen === 'nilai_harian' && (() => {
                    const sorted = applySort(currentNilaiHarian);
                    const totalFiltered = sorted.length;
                    const filtered = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
                    return filtered.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm italic">
                        Belum ada catatan nilai harian yang cocok dengan filter / pencarian.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100 uppercase">
                              <th className="p-4 w-12 text-center">
                                <input
                                  type="checkbox"
                                  checked={filtered.length > 0 && filtered.every(item => selectedItemIds.includes(item.id))}
                                  onChange={() => handleToggleSelectAll(filtered)}
                                  className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                />
                              </th>
                              <th className="p-4 w-28 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('tanggal')}>Tanggal{sortField === 'tanggal' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4 w-40 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('mapel')}>Mata Pelajaran{sortField === 'mapel' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Nama Siswa</th>
                              <th className="p-4 w-24 text-center cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('nilai')}>Nilai{sortField === 'nilai' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Keterangan</th>
                              <th className="p-4 w-20 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((item) => {
                              const student = state.students.find(s => s.id === item.siswa_id);
                              return (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.includes(item.id)}
                                      onChange={() => handleToggleSelectItem(item.id)}
                                      className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                    />
                                  </td>
                                  <td className="p-4 font-mono font-medium text-slate-500 text-xs">{item.tanggal}</td>
                                  <td className="p-4 font-semibold text-slate-800 text-xs"><span className="bg-slate-100 py-1 px-2.5 rounded-full">{item.mapel}</span></td>
                                  <td className="p-4 font-bold text-slate-800">{student?.nama || 'Siswa Dihapus'}</td>
                                  <td className="p-4 text-center">
                                    <span className={`font-mono font-extrabold text-sm py-1 px-2 rounded-lg ${
                                      item.nilai < 75 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {item.nilai}
                                    </span>
                                  </td>
                                  <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{item.keterangan || '-'}</td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleOpenEditRecord(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"><Edit className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteRecord(item.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {/* Nilai Harian Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400">{totalFiltered} total item</span>
                          <div className="flex items-center gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Sebelumnya</button>
                            <span className="text-xs font-medium text-slate-500">Halaman {page + 1}/{Math.max(1, Math.ceil(totalFiltered / PER_PAGE))}</span>
                            <button disabled={(page + 1) * PER_PAGE >= totalFiltered} onClick={() => setPage(p => p + 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Selanjutnya</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2B. LIST VIEW: NILAI ULANGAN */}
                  {activeScreen === 'nilai_ulangan' && (() => {
                    const sorted = applySort(currentNilaiUlangan);
                    const totalFiltered = sorted.length;
                    const filtered = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
                    return filtered.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm italic">
                        Belum ada catatan nilai ulangan yang cocok dengan filter / pencarian.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100 uppercase">
                              <th className="p-4 w-12 text-center">
                                <input
                                  type="checkbox"
                                  checked={filtered.length > 0 && filtered.every(item => selectedItemIds.includes(item.id))}
                                  onChange={() => handleToggleSelectAll(filtered)}
                                  className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                />
                              </th>
                              <th className="p-4 w-28 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('tanggal')}>Tanggal{sortField === 'tanggal' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4 w-40 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('jenis')}>Jenis{sortField === 'jenis' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4 w-36 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('mapel')}>Mapel{sortField === 'mapel' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Nama Siswa</th>
                              <th className="p-4">Materi</th>
                              <th className="p-4 w-24 text-center cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('nilai')}>Nilai{sortField === 'nilai' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4 w-20 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((item) => {
                              const student = state.students.find(s => s.id === item.siswa_id);
                              return (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.includes(item.id)}
                                      onChange={() => handleToggleSelectItem(item.id)}
                                      className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                    />
                                  </td>
                                  <td className="p-4 font-mono font-medium text-slate-500 text-xs">{item.tanggal}</td>
                                  <td className="p-4 text-xs font-bold text-slate-600"><span className="bg-teal-50 border border-teal-150 py-1 px-2.5 rounded-md text-teal-800">{item.jenis}</span></td>
                                  <td className="p-4 font-semibold text-slate-800 text-xs"><span className="bg-slate-100 py-1 px-2.5 rounded-full">{item.mapel || 'Matematika'}</span></td>
                                  <td className="p-4 font-bold text-slate-800">{student?.nama || 'Siswa Dihapus'}</td>
                                  <td className="p-4 text-xs text-slate-500">{item.materi || '-'}</td>
                                  <td className="p-4 text-center">
                                    <span className={`font-mono font-extrabold text-sm py-1 px-2 rounded-lg ${
                                      item.nilai < 75 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {item.nilai}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleOpenEditRecord(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"><Edit className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteRecord(item.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {/* Nilai Ulangan Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400">{totalFiltered} total item</span>
                          <div className="flex items-center gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Sebelumnya</button>
                            <span className="text-xs font-medium text-slate-500">Halaman {page + 1}/{Math.max(1, Math.ceil(totalFiltered / PER_PAGE))}</span>
                            <button disabled={(page + 1) * PER_PAGE >= totalFiltered} onClick={() => setPage(p => p + 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Selanjutnya</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2C. LIST VIEW: PR (TUGAS RUMAH) */}
                  {activeScreen === 'pr' && (() => {
                    const sorted = applySort(currentPR);
                    const totalFiltered = sorted.length;
                    const filtered = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
                    return filtered.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm italic">
                        Belum ada catatan PR yang cocok dengan filter / pencarian.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100 uppercase">
                              <th className="p-4 w-12 text-center">
                                <input
                                  type="checkbox"
                                  checked={filtered.length > 0 && filtered.every(item => selectedItemIds.includes(item.id))}
                                  onChange={() => handleToggleSelectAll(filtered)}
                                  className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                />
                              </th>
                              <th className="p-4 w-28 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('tanggal')}>Tanggal{sortField === 'tanggal' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4 w-40 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('mapel')}>Mapel{sortField === 'mapel' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Isi Tugas PR</th>
                              <th className="p-4 w-32 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('deadline')}>Deadline{sortField === 'deadline' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Catatan</th>
                              <th className="p-4 w-20 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((item) => {
                              return (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.includes(item.id)}
                                      onChange={() => handleToggleSelectItem(item.id)}
                                      className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                    />
                                  </td>
                                  <td className="p-4 font-mono font-medium text-slate-500 text-xs">{item.tanggal}</td>
                                  <td className="p-4 font-semibold text-slate-800 text-xs"><span className="bg-slate-100 py-1 px-2.5 rounded-full">{item.mapel}</span></td>
                                  <td className="p-4 font-medium text-slate-700 whitespace-pre-line text-xs">{item.isi_pr}</td>
                                  <td className="p-4 font-mono text-rose-600 font-bold text-xs">{item.deadline}</td>
                                  <td className="p-4 text-xs text-slate-500">{item.catatan || '-'}</td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleOpenEditRecord(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"><Edit className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteRecord(item.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {/* PR Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400">{totalFiltered} total item</span>
                          <div className="flex items-center gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Sebelumnya</button>
                            <span className="text-xs font-medium text-slate-500">Halaman {page + 1}/{Math.max(1, Math.ceil(totalFiltered / PER_PAGE))}</span>
                            <button disabled={(page + 1) * PER_PAGE >= totalFiltered} onClick={() => setPage(p => p + 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Selanjutnya</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2D. LIST VIEW: SISWA AKTIF */}
                  {activeScreen === 'siswa_aktif' && (() => {
                    const sorted = applySort(currentSiswaAktif);
                    const totalFiltered = sorted.length;
                    const filtered = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
                    return filtered.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm italic">
                        Belum ada catatan siswa aktif yang cocok dengan filter / pencarian.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100 uppercase">
                              <th className="p-4 w-12 text-center">
                                <input
                                  type="checkbox"
                                  checked={filtered.length > 0 && filtered.every(item => selectedItemIds.includes(item.id))}
                                  onChange={() => handleToggleSelectAll(filtered)}
                                  className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                />
                              </th>
                              <th className="p-4 w-28 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('tanggal')}>Tanggal{sortField === 'tanggal' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Nama Siswa</th>
                              <th className="p-4">Aktivitas</th>
                              <th className="p-4 w-28 text-center cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('poin')}>Poin{sortField === 'poin' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Catatan Guru</th>
                              <th className="p-4 w-20 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((item) => {
                              const student = state.students.find(s => s.id === item.siswa_id);
                              return (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.includes(item.id)}
                                      onChange={() => handleToggleSelectItem(item.id)}
                                      className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                    />
                                  </td>
                                  <td className="p-4 font-mono font-medium text-slate-500 text-xs">{item.tanggal}</td>
                                  <td className="p-4 font-bold text-slate-800">{student?.nama || 'Siswa Dihapus'}</td>
                                  <td className="p-4 font-medium text-slate-700 text-xs">{item.aktivitas}</td>
                                  <td className="p-4 text-center">
                                    <span className={`font-mono font-extrabold text-sm py-1 px-2.5 rounded-lg flex items-center justify-center gap-1 max-w-[80px] mx-auto ${
                                      item.poin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                      <Award className="w-3.5 h-3.5" />
                                      {item.poin >= 0 ? `+${item.poin}` : item.poin}
                                    </span>
                                  </td>
                                  <td className="p-4 text-xs text-slate-500">{item.catatan || '-'}</td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleOpenEditRecord(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"><Edit className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteRecord(item.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {/* Siswa Aktif Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400">{totalFiltered} total item</span>
                          <div className="flex items-center gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Sebelumnya</button>
                            <span className="text-xs font-medium text-slate-500">Halaman {page + 1}/{Math.max(1, Math.ceil(totalFiltered / PER_PAGE))}</span>
                            <button disabled={(page + 1) * PER_PAGE >= totalFiltered} onClick={() => setPage(p => p + 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Selanjutnya</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2E. LIST VIEW: LAPORAN PERILAKU SISWA */}
                  {activeScreen === 'laporan_siswa' && (() => {
                    const sorted = applySort(currentLaporanSiswa);
                    const totalFiltered = sorted.length;
                    const filtered = sorted.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
                    return filtered.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-sm italic">
                        Belum ada laporan perilaku yang cocok dengan filter / pencarian.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100 uppercase">
                              <th className="p-4 w-12 text-center">
                                <input
                                  type="checkbox"
                                  checked={filtered.length > 0 && filtered.every(item => selectedItemIds.includes(item.id))}
                                  onChange={() => handleToggleSelectAll(filtered)}
                                  className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                />
                              </th>
                              <th className="p-4 w-28 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('tanggal')}>Tanggal{sortField === 'tanggal' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Nama Siswa</th>
                              <th className="p-4 w-40 cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('jenis')}>Jenis{sortField === 'jenis' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4">Catatan</th>
                              <th className="p-4">Tindak Lanjut</th>
                              <th className="p-4 w-24 text-center cursor-pointer hover:text-slate-800" onClick={() => handleToggleSort('status')}>Status{sortField === 'status' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</th>
                              <th className="p-4 w-20 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((item) => {
                              const student = state.students.find(s => s.id === item.siswa_id);
                              return (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedItemIds.includes(item.id)}
                                      onChange={() => handleToggleSelectItem(item.id)}
                                      className="rounded text-tosca-500 focus:ring-tosca-500 cursor-pointer w-4 h-4"
                                    />
                                  </td>
                                  <td className="p-4 font-mono font-medium text-slate-500 text-xs">{item.tanggal}</td>
                                  <td className="p-4 font-bold text-slate-800">{student?.nama || 'Siswa Dihapus'}</td>
                                  <td className="p-4 text-xs font-bold text-slate-600">
                                    <span className="bg-slate-100 text-slate-700 py-1 px-2.5 rounded-md flex items-center gap-1.5 w-max">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                      {item.jenis}
                                    </span>
                                  </td>
                                  <td className="p-4 text-xs text-slate-700 font-medium whitespace-pre-line">{item.catatan}</td>
                                  <td className="p-4 text-xs text-slate-500">{item.tindak_lanjut || '-'}</td>
                                  <td className="p-4 text-center">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase leading-none ${
                                      item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleOpenEditRecord(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"><Edit className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteRecord(item.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {/* Laporan Siswa Pagination */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400">{totalFiltered} total item</span>
                          <div className="flex items-center gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Sebelumnya</button>
                            <span className="text-xs font-medium text-slate-500">Halaman {page + 1}/{Math.max(1, Math.ceil(totalFiltered / PER_PAGE))}</span>
                            <button disabled={(page + 1) * PER_PAGE >= totalFiltered} onClick={() => setPage(p => p + 1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">Selanjutnya</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            )}

            {/* =========================================================================
                MODULE 3: SETTINGS / PENGATURAN SCREEN (PRD Section 20)
                ========================================================================= */}
            {activeScreen === 'pengaturan' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" id="settings-view">
                
                {/* 3A. About Application & Developer Credit */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                  <h3 className="font-extrabold text-slate-950 text-base font-display mb-4 pb-3 border-b border-slate-100">
                    Tentang Aplikasi MAPAN
                  </h3>

                  <div className="flex flex-col items-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-150 mb-4">
                    <div className="w-16 h-16 bg-tosca-500 rounded-2xl flex items-center justify-center shadow-lg shadow-tosca-500/10 text-white mb-3 overflow-hidden p-1.5">
                      <MapanLogo className="w-full h-full" />
                    </div>
                    <h4 className="font-bold text-slate-900 font-display text-lg">MAPAN v1.0</h4>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">Manajemen Pencatatan Nilai Siswa SD/MI</p>
                    
                    <div className="text-xs font-semibold text-slate-700 bg-tosca-100/50 text-tosca-800 py-1 px-3.5 rounded-full mt-3">
                      Slogan: {"\"Mencatat Lebih Mudah, Mengajar Lebih Bermakna\""}
                    </div>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-400 font-semibold">Pembuat / Developer</span>
                      <span className="font-bold text-slate-800">Abdul Aziz, S.Pd</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-400 font-semibold">Tahun Rilis</span>
                      <span className="font-bold text-slate-800 font-mono">2026</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-400 font-semibold">Target Platform</span>
                      <span className="font-semibold text-tosca-700">Mobile First (Responsive Web)</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400 font-semibold">Database Mode</span>
                      <span className="font-bold text-slate-800">Local Storage (Cadangan JSON)</span>
                    </div>
                  </div>
                </div>

                {/* 3B. Backup, Restore, and Theme Description */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-950 text-base font-display mb-4 pb-3 border-b border-slate-100">
                      Pusat Manajemen Cadangan Data
                    </h3>
                    
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Simpan data grading Anda ke komputer lokal atau pulihkan database grading yang telah disimpan sebelumnya. Tindakan ini sepenuhnya berjalan offline demi keamanan data murid Anda.
                    </p>

                    <div className="space-y-4">
                      {/* Backup Action */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase">Ekspor / Cadangkan Data</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Unduh seluruh state ke file .json</p>
                        </div>
                        <button
                          onClick={handleBackupData}
                          className="bg-tosca-500 hover:bg-tosca-600 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow shadow-tosca-500/10 transition-all duration-150"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Backup (.json)
                        </button>
                      </div>

                      {/* Restore Action */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase">Impor / Pulihkan Data</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Unggah file .json cadangan Anda</p>
                        </div>
                        <div>
                          <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleRestoreData}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isRestoring}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isRestoring ? (
                              <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            {isRestoring ? 'Memulihkan...' : 'Restore'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Palette Description */}
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block mb-2.5">
                      TEMA PALET WARNA (Minimalis Modern)
                    </label>
                    <div className="flex gap-2.5">
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <div className="w-4.5 h-4.5 rounded-full bg-tosca-500 shadow-sm shrink-0" />
                        Tosca (#14B8A6)
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <div className="w-4.5 h-4.5 rounded-full bg-tosca-700 shadow-sm shrink-0" />
                        Hijau Tua (#0F766E)
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                        <div className="w-4.5 h-4.5 rounded-full bg-slate-100 border border-slate-200 shrink-0" />
                        Abu Muda (#F5F7FA)
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* =========================================================================
          MODALS & FORM POPUPS (Unified control with AnimatePresence)
          ========================================================================= */}
      <AnimatePresence>
        
        {/* Backdrop for any active modal */}
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          >
            {/* Modal Content container wrapper */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* MODAL HEADER */}
              <div className="bg-slate-50 border-b border-slate-100 py-4 px-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-tosca-100 text-tosca-700 rounded-lg flex items-center justify-center">
                    {activeModal.includes('siswa') && <User className="w-4 h-4" />}
                    {activeModal.includes('record') && <Plus className="w-4 h-4" />}
                    {activeModal === 'confirm_delete_all' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    {activeModal === 'student_report' && <FileText className="w-4 h-4" />}
                  </div>
                  <h3 className="font-bold text-slate-900 font-display text-sm md:text-base leading-none">
                    {activeModal === 'add_siswa' && 'Tambah Siswa Baru'}
                    {activeModal === 'edit_siswa' && 'Perbarui Nama Siswa'}
                    {activeModal === 'add_record' && `Tambah Catatan Baru`}
                    {activeModal === 'edit_record' && 'Perbarui Rekam Data'}
                    {activeModal === 'confirm_delete_all' && 'Konfirmasi Hapus Data'}
                    {activeModal === 'student_report' && 'Unduh Laporan Evaluasi'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActiveModal(null);
                    setEditingStudent(null);
                    setEditingRecord(null);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* MODAL BODY (SCROLLABLE CONTENT) */}
              <div className="p-5 overflow-y-auto flex-1">
                
                {/* 1. Add / Edit Student Name */}
                {(activeModal === 'add_siswa' || activeModal === 'edit_siswa') && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Nama Kelas Aktif</label>
                      <input
                        type="text"
                        disabled
                        value={activeClass.nama_kelas}
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">Nama Lengkap Siswa</label>
                      <input
                        type="text"
                        placeholder="Contoh: Ahmad Budi Saputra"
                        value={studentNameInput}
                        onChange={(e) => setStudentNameInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-semibold transition-all"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* 2. Unified Record Add / Edit Form */}
                {(activeModal === 'add_record' || activeModal === 'edit_record') && (
                  <div className="space-y-4">
                    
                    {/* Date picker */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">Tanggal Pencatatan</label>
                      <input
                        type="date"
                        value={formTanggal}
                        onChange={(e) => setFormTanggal(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
                      />
                    </div>

                    {/* Class Selector (readonly informational) */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1.5">Kelas</label>
                      <input
                        type="text"
                        disabled
                        value={activeClass.nama_kelas}
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-not-allowed"
                      />
                    </div>

                    {/* Subject field (Harian, Ulangan, PR) */}
                    {(activeScreen === 'nilai_harian' || activeScreen === 'nilai_ulangan' || activeScreen === 'pr') && (
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">Mata Pelajaran</label>
                        <select
                          value={formMapel}
                          onChange={(e) => { setFormMapel(e.target.value); setFormErrors(prev => { const n = {...prev}; delete n.mapel; return n; }); }}
                          onBlur={() => validateField('mapel', formMapel)}
                          className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white text-slate-800 font-semibold cursor-pointer ${formErrors.mapel ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-tosca-500'}`}
                        >
                          {availableSubjects.map((sub, i) => (
                            <option key={i} value={sub}>{sub}</option>
                          ))}
                        </select>
                        {formErrors.mapel && <p className="text-rose-500 text-xs mt-1">{formErrors.mapel}</p>}
                      </div>
                    )}

                    {/* Student Select Dropdown (Required for all except PR) */}
                    {activeScreen !== 'pr' && (
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">Pilih Nama Siswa</label>
                        {classStudents.length === 0 ? (
                          <p className="text-xs text-rose-500 font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
                            Peringatan: Belum ada data siswa di kelas ini. Tambahkan nama siswa terlebih dahulu dari dashboard.
                          </p>
                        ) : (
                          <select
                            value={formSiswaId}
                            onChange={(e) => { setFormSiswaId(e.target.value); setFormErrors(prev => { const n = {...prev}; delete n.siswa_id; return n; }); }}
                            onBlur={() => validateField('siswa_id', formSiswaId)}
                            className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white text-slate-800 font-semibold cursor-pointer ${formErrors.siswa_id ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-tosca-500'}`}
                          >
                            <option value="">-- Pilih Siswa --</option>
                            {editingRecord ? (
                              state.students.map((st) => (
                                <option key={st.id} value={st.id}>{st.nama}</option>
                              ))
                            ) : (
                              classStudents.map((st) => (
                                <option key={st.id} value={st.id}>{st.nama}</option>
                              ))
                            )}
                          </select>
                        )}
                        {formErrors.siswa_id && <p className="text-rose-500 text-xs mt-1">{formErrors.siswa_id}</p>}
                      </div>
                    )}

                    {/* Sub-form fields: NILAI HARIAN / ULANGAN */}
                    {(activeScreen === 'nilai_harian' || activeScreen === 'nilai_ulangan') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5">Nilai (0-100)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formNilai}
                            onChange={(e) => { setFormNilai(Math.min(100, Math.max(0, Number(e.target.value)))); setFormErrors(prev => { const n = {...prev}; delete n.nilai; return n; }); }}
                            onBlur={() => validateField('nilai', formNilai)}
                            className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white text-slate-800 font-bold font-mono ${formErrors.nilai ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-tosca-500'}`}
                          />
                          {formErrors.nilai && <p className="text-rose-500 text-xs mt-1">{formErrors.nilai}</p>}
                        </div>
                        {activeScreen === 'nilai_ulangan' && (
                          <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1.5">Jenis Ulangan</label>
                            <select
                              value={formJenisUlangan}
                              onChange={(e) => setFormJenisUlangan(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-semibold cursor-pointer"
                            >
                              <option value="Ulangan Harian 1">Ulangan Harian 1</option>
                              <option value="Ulangan Harian 2">Ulangan Harian 2</option>
                              <option value="Ulangan Harian 3">Ulangan Harian 3</option>
                              <option value="UTS">UTS (Tengah Semester)</option>
                              <option value="UAS">UAS (Akhir Semester)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-form fields: ULANGAN MATERI */}
                    {activeScreen === 'nilai_ulangan' && (
                      <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">Materi Pembahasan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Pecahan Senilai"
                          value={formMateri}
                          onChange={(e) => setFormMateri(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-medium"
                        />
                      </div>
                    )}

                    {/* Sub-form fields: PR (TUGAS RUMAH) DESCRIPTIONS */}
                    {activeScreen === 'pr' && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5">Isi Tugas Pekerjaan Rumah (PR)</label>
                          <textarea
                            placeholder="Contoh: Kerjakan halaman 23 nomor 1 sampai 10"
                            value={formIsiPr}
                            onChange={(e) => { setFormIsiPr(e.target.value); setFormErrors(prev => { const n = {...prev}; delete n.isi_pr; return n; }); }}
                            onBlur={() => validateField('isi_pr', formIsiPr)}
                            rows={3}
                            className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white text-slate-800 font-medium whitespace-pre-line ${formErrors.isi_pr ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-tosca-500'}`}
                          />
                          {formErrors.isi_pr && <p className="text-rose-500 text-xs mt-1">{formErrors.isi_pr}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5">Batas Pengumpulan (Deadline)</label>
                          <input
                            type="date"
                            value={formDeadline}
                            onChange={(e) => { setFormDeadline(e.target.value); setFormErrors(prev => { const n = {...prev}; delete n.deadline; return n; }); }}
                            onBlur={() => validateField('deadline', formDeadline)}
                            className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white text-slate-800 font-medium cursor-pointer ${formErrors.deadline ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200 focus:border-tosca-500'}`}
                          />
                          {formErrors.deadline && <p className="text-rose-500 text-xs mt-1">{formErrors.deadline}</p>}
                        </div>
                      </>
                    )}

                    {/* Sub-form fields: ACTIVE STUDENT POINT LOGGER */}
                    {activeScreen === 'siswa_aktif' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5">Aktivitas Partisipasi</label>
                          <input
                            type="text"
                            placeholder="Contoh: Aktif menjawab"
                            value={formAktivitas}
                            onChange={(e) => setFormAktivitas(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-medium"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5">Skor Poin</label>
                          <select
                            value={formPoin}
                            onChange={(e) => setFormPoin(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-bold font-mono cursor-pointer"
                          >
                            <option value="5">+5 (Sangat Aktif)</option>
                            <option value="10">+10 (Luar Biasa)</option>
                            <option value="3">+3 (Menjawab Benar)</option>
                            <option value="-5">-5 (Indisipliner / Gaduh)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Sub-form fields: BEHAVIORAL REPORT */}
                    {activeScreen === 'laporan_siswa' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1.5">Jenis Sikap/Laporan</label>
                            <select
                              value={formLaporanJenis}
                              onChange={(e) => setFormLaporanJenis(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-semibold cursor-pointer"
                            >
                              <option value="Kelalaian Tugas">Kelalaian Tugas</option>
                              <option value="Indisipliner">Indisipliner</option>
                              <option value="Pertikaian">Pertikaian</option>
                              <option value="Keaktifan Positif">Keaktifan Positif</option>
                              <option value="Sopan Santun">Sopan Santun</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1.5">Status Bimbingan</label>
                            <select
                              value={formLaporanStatus}
                              onChange={(e) => setFormLaporanStatus(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-semibold cursor-pointer"
                            >
                              <option value="Selesai">Selesai</option>
                              <option value="Diproses">Diproses</option>
                              <option value="Tertunda">Tertunda</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1.5">Tindak Lanjut Pembinaan</label>
                          <input
                            type="text"
                            placeholder="Contoh: Dipanggil setelah pelajaran untuk dinasihati"
                            value={formTindakLanjut}
                            onChange={(e) => setFormTindakLanjut(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-medium"
                          />
                        </div>
                      </>
                    )}

                    {/* Common Keterangan/Catatan Field */}
                    <div>
                      <label className="text-xs font-bold text-slate-500 block mb-1.5">
                        {activeScreen === 'laporan_siswa' ? 'Isi Catatan Perilaku' : 'Keterangan Tambahan'}
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Memahami dengan sangat baik"
                        value={formKeterangan}
                        onChange={(e) => setFormKeterangan(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-tosca-500 focus:bg-white text-slate-800 font-medium"
                      />
                    </div>

                  </div>
                )}

                {/* 3. Confirm Bulk Delete Dialog (PRD Section 16) */}
                {activeModal === 'confirm_delete_all' && (
                  <div className="space-y-4 text-center py-4">
                    <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-100 shadow-sm">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 font-display text-base">Apakah Anda yakin ingin menghapus seluruh data?</h4>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed px-2">
                        Tindakan ini permanen dan akan langsung menghapus data yang dipilih untuk {activeClass.nama_kelas}. Pastikan Anda telah melakukan ekspor cadangan terlebih dahulu jika diperlukan.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Student individual report menu card */}
                {activeModal === 'student_report' && (() => {
                  const s = state.students.find(x => x.id === selectedStudentForReport);
                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-tosca-500 text-white flex items-center justify-center font-bold">
                          {s?.nama.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 font-display text-sm leading-none">{s?.nama}</h4>
                          <span className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase mt-1 block">Kelas: {activeClass.nama_kelas}</span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">PILIH FORMAT DOKUMEN</label>
                        
                        <button
                          onClick={() => {
                            if (s) exportStudentToWord(state, s.id);
                            setActiveModal(null);
                          }}
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm py-3 px-4 rounded-xl flex items-center gap-3.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-5 h-5 text-blue-600 shrink-0" />
                          <div>
                            <div className="text-left font-bold text-slate-800 text-xs">Unduh Microsoft Word (.doc)</div>
                            <div className="text-left text-[10px] text-slate-400 font-normal">Sangat cocok untuk diedit atau dicetak mandiri</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            if (s) printStudentPDF(state, s.id);
                            setActiveModal(null);
                          }}
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm py-3 px-4 rounded-xl flex items-center gap-3.5 cursor-pointer transition-colors"
                        >
                          <FileText className="w-5 h-5 text-tosca-600 shrink-0" />
                          <div>
                            <div className="text-left font-bold text-slate-800 text-xs">Cetak Laporan / Simpan PDF</div>
                            <div className="text-left text-[10px] text-slate-400 font-normal">Cetak langsung menggunakan modul printer browser</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })()}

              </div>

              {/* MODAL ACTIONS PANEL */}
              <div className="bg-slate-50 border-t border-slate-100 py-3.5 px-5 flex items-center justify-end gap-2.5 shrink-0">
                {activeModal === 'confirm_delete_all' ? (
                  <>
                    <button
                      onClick={() => {
                        setActiveModal(null);
                        setDeleteConfirmationType('');
                      }}
                      className="bg-white border border-slate-200 text-slate-600 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer hover:bg-slate-50 transition-all"
                    >
                      BATAL
                    </button>
                    <button
                      onClick={handleExecuteBulkDelete}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer transition-colors"
                    >
                      YA, HAPUS SEKARANG
                    </button>
                  </>
                ) : activeModal === 'student_report' ? (
                  <button
                    onClick={() => setActiveModal(null)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs py-2 px-5 rounded-xl cursor-pointer transition-colors"
                  >
                    Tutup
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (activeModal === 'add_record' || activeModal === 'edit_record') {
                          const isDirty = formTanggal !== getTodayDateString() || formMapel !== 'Matematika' || (formSiswaId !== (classStudents[0]?.id || ''));
                          if (isDirty && !window.confirm('Perubahan belum disimpan. Yakin ingin membatalkan?')) return;
                        }
                        setActiveModal(null);
                        setEditingStudent(null);
                        setEditingRecord(null);
                      }}
                      className="bg-white border border-slate-200 text-slate-600 font-bold text-xs py-2 px-4.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      onClick={
                        activeModal.includes('siswa')
                          ? (editingStudent ? handleEditStudent : handleAddStudent)
                          : handleSaveRecord
                      }
                      className="bg-tosca-500 hover:bg-tosca-600 text-white font-bold text-xs py-2 px-5 rounded-xl cursor-pointer transition-colors"
                    >
                      Simpan Perubahan
                    </button>
                  </>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
