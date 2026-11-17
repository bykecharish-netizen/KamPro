'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/layout/AuthContext';
import ProposalModal from '@/components/modals/ProposalModal';
import ValidateCplModal from '@/components/modals/ValidateCplModal';
import RevisionModal from '@/components/modals/RevisionModal';
import AssignReviewersModal from '@/components/modals/AssignReviewersModal';
import ReviewModal from '@/components/modals/ReviewModal';
import ApproveFundingModal from '@/components/modals/ApproveFundingModal';
import BypassModal from '@/components/modals/BypassModal';

type FilterTab = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE';

interface ProposalItem {
  id: string;
  no_agenda: string | null;
  no_registrasi: string | null;
  judul: string;
  skema: string;
  tahap: string;
  status: string;
  prodi: string;
  file_url: string;
  skor_rata_rata: number | null;
  is_bypass: boolean;
  alasan_bypass: string | null;
  created_at: string;
  category: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  ketua?: {
    id?: string;
    nama_lengkap: string;
    nip_npm?: string;
    email?: string;
    gelar?: string | null;
  } | null;
  members?: Array<{
    id: string;
    user_id?: string;
    peran_tim: string;
    user?: {
      nama_lengkap: string;
      gelar?: string | null;
      nip_npm?: string;
    };
  }>;
  reviews?: Array<{
    id?: string;
    reviewer_slot: number;
    skor: number | null;
    catatan: string | null;
    is_locked: boolean;
    reviewer?: {
      nama_lengkap: string;
      gelar?: string | null;
    } | null;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // State Data Proposal & Metrik dari API
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [metrics, setMetrics] = useState({
    countPending: 0,
    countInProgress: 0,
    countDone: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State Modal-Modal Aksi
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedCplProposal, setSelectedCplProposal] = useState<ProposalItem | null>(null);
  const [selectedRevisionProposal, setSelectedRevisionProposal] = useState<ProposalItem | null>(null);
  const [selectedAssignProposal, setSelectedAssignProposal] = useState<ProposalItem | null>(null);
  const [selectedReviewProposal, setSelectedReviewProposal] = useState<ProposalItem | null>(null);
  const [selectedApproveProposal, setSelectedApproveProposal] = useState<ProposalItem | null>(null);
  const [selectedBypassProposal, setSelectedBypassProposal] = useState<ProposalItem | null>(null);
  const [isCreateBypassOpen, setIsCreateBypassOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Mengambil data usulan secara dinamis dari GET /api/proposals
  const fetchProposals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/proposals', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProposals(data.data || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil daftar proposal:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals, user?.active_role]);

  if (!user) return null;

  // Aksi Cepat Ka. Pusat PPM: Terbitkan No. Registrasi
  const handleRegisterProposal = async (prop: ProposalItem) => {
    try {
      const res = await fetch(`/api/proposals/${prop.id}/register`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menerbitkan nomor registrasi');
      }
      showToast(`Nomor Registrasi ${data.no_registrasi} berhasil diterbitkan!`);
      fetchProposals();
    } catch (err: any) {
      alert(err.message || 'Gagal menerbitkan nomor registrasi');
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (activeTab === 'ALL') return true;
    return p.category === activeTab;
  });

  const displayName = `${user.nama_lengkap}${user.gelar ? ', ' + user.gelar : ''}`;

  // Helper untuk menentukan status visual, label, dan stepper
  const getStageInfo = (prop: ProposalItem) => {
    let stageStep = 2;
    let statusLabel = 'Dalam Proses';
    let statusBadgeClass = 'bg-sky-50 text-sky-800 border-sky-200';

    switch (prop.status) {
      case 'DRAFT':
        stageStep = 1;
        statusLabel = 'Draft Usulan';
        statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-200';
        break;
      case 'MENUNGGU_VALIDASI_PRODI':
        stageStep = 2;
        statusLabel = 'Menunggu Validasi CPL Prodi';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
        break;
      case 'MENUNGGU_REGISTRASI_PPM':
      case 'TERVERIFIKASI_ADMIN':
        stageStep = 2;
        statusLabel = 'Verifikasi Pusat PPM';
        statusBadgeClass = 'bg-indigo-50 text-indigo-800 border-indigo-200';
        break;
      case 'PENILAIAN_REVIEWER':
      case 'PROSES_REVIEW':
        stageStep = 3;
        statusLabel = 'Penilaian Reviewer (Slot 1–3)';
        statusBadgeClass = 'bg-sky-50 text-sky-800 border-sky-200';
        break;
      case 'REVISI':
        stageStep = 2;
        statusLabel = prop.skor_rata_rata !== null && prop.skor_rata_rata < 60
          ? `Revisi Diperlukan (Skor: ${prop.skor_rata_rata} < 60)`
          : 'Revisi Berkas';
        statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
        break;
      case 'MENUNGGU_PENETAPAN':
        stageStep = 3;
        statusLabel = 'Menunggu Penetapan Direktur';
        statusBadgeClass = 'bg-purple-50 text-purple-800 border-purple-200';
        break;
      case 'DISETUJUI':
      case 'SELESAI':
      case 'LOLOS':
        stageStep = 4;
        statusLabel = 'Disetujui / Lolos Penetapan';
        statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        break;
      case 'DITOLAK':
        stageStep = 4;
        statusLabel = 'Tidak Lolos Seleksi';
        statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-300';
        break;
      default:
        stageStep = 2;
        statusLabel = prop.status;
        statusBadgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
        break;
    }

    return { stageStep, statusLabel, statusBadgeClass };
  };

  return (
    <div id="dashboard-content-panel">
      {/* Toast Notifikasi Sukses */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-mono py-2.5 px-4 rounded-xl shadow-2xl border border-sky-500/50 flex items-center space-x-2 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Banner Sapaan Pengguna (#EAF4FF ke #D6E9FF) */}
      <div className="bg-gradient-to-r from-[#EAF4FF] to-[#D6E9FF] border border-sky-200/80 rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-[11px] font-mono font-bold tracking-wider text-sky-800 uppercase mb-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
              <span>Pusat Komando Riset &amp; Inovasi Taruna • T.A. 2026</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              Selamat Datang, {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-mono mt-1">
              NIP/NPM: <strong className="text-slate-800">{user.nip_npm}</strong>
              {user.prodi && (
                <>
                  {' '}• Program Studi: <strong className="text-slate-800">{user.prodi}</strong>
                </>
              )}
              {user.kelompok_keilmuan && (
                <>
                  {' '}• Kelompok Keilmuan: <strong className="text-slate-800">{user.kelompok_keilmuan}</strong>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {user.active_role === 'PENGUSUL' && (
              <button
                onClick={() => setIsProposalModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>+ Ajukan Usulan Baru</span>
              </button>
            )}

            {user.active_role === 'KAPRODI' && (
              <span className="whitespace-nowrap inline-flex items-center px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-mono font-semibold shadow-sm">
                ● Mode Validasi CPL Prodi ({user.prodi || 'Semua'})
              </span>
            )}

            {user.active_role === 'KA_PPM' && (
              <span className="whitespace-nowrap inline-flex items-center px-3 py-1.5 rounded-xl bg-sky-700 text-white text-xs font-mono font-semibold shadow-sm">
                ● Kelola Registrasi &amp; Penugasan Reviewer
              </span>
            )}

            {user.active_role === 'REVIEWER' && (
              <span className="whitespace-nowrap inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-cyan-300 border border-sky-400/40 text-xs font-mono font-semibold shadow-sm">
                ● Dewan Reviewer (Blind Review Aktif)
              </span>
            )}

            {user.active_role === 'DIREKTUR' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsCreateBypassOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-all flex items-center space-x-1.5"
                >
                  <span className="material-symbols-outlined text-[17px]">bolt</span>
                  <span>+ Penugasan Langsung (Bypass)</span>
                </button>
                <span className="whitespace-nowrap inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-800 text-emerald-100 text-xs font-mono font-semibold shadow-sm">
                  ● Penetapan Pendanaan
                </span>
              </div>
            )}

            {user.active_role === 'ADMIN' && (
              <span className="whitespace-nowrap inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-mono font-semibold shadow-sm">
                ● Administrator Sistem &amp; Audit Log
              </span>
            )}
          </div>
        </div>

        {/* Pola latar dekoratif SVG */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 400 400">
            <defs>
              <pattern height="20" id="dot-grid" patternUnits="userSpaceOnUse" width="20">
                <circle cx="2" cy="2" fill="#0284C7" r="1.5" />
              </pattern>
            </defs>
            <rect fill="url(#dot-grid)" height="100%" width="100%" />
          </svg>
        </div>
      </div>

      {/* 2. Kartu Ringkasan Metrik (3 Kartu Sesuai ScopeFilter Peran Aktif) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* Metrik 1: Menunggu Tindakan */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-amber-800 uppercase font-bold">
                Menunggu Tindakan
              </p>
              <span className="material-symbols-outlined text-[20px] text-amber-600">
                pending_actions
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-900 font-mono mt-1">
              {metrics.countPending}{' '}
              <span className="text-xs font-sans font-normal text-amber-700">Berkas</span>
            </p>
          </div>
          <p className="text-[11px] text-amber-700 mt-2 font-mono">
            {user.active_role === 'KAPRODI'
              ? 'Menunggu validasi CPL prodi Anda'
              : user.active_role === 'KA_PPM'
              ? 'Menunggu nomor registrasi & penugasan'
              : user.active_role === 'PENGUSUL'
              ? 'Menunggu unggah revisi / aksi pengusul'
              : 'Menunggu telaah dan aksi aktif'}
          </p>
        </div>

        {/* Metrik 2: Sedang Diproses */}
        <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-sky-700 uppercase font-bold">
                Sedang Diproses
              </p>
              <span className="material-symbols-outlined text-[20px] text-sky-600">
                sync
              </span>
            </div>
            <p className="text-2xl font-bold text-sky-800 font-mono mt-1">
              {metrics.countInProgress}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">Berkas</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            Dalam tahap penelaahan dan scoring
          </p>
        </div>

        {/* Metrik 3: Selesai */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-emerald-700 uppercase font-bold">
                Selesai / Lolos
              </p>
              <span className="material-symbols-outlined text-[20px] text-emerald-600">
                task_alt
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">
              {metrics.countDone}{' '}
              <span className="text-xs font-sans font-normal text-emerald-800">Berkas</span>
            </p>
          </div>
          <p className="text-[11px] text-emerald-700 mt-2 font-mono">
            Lolos seleksi internal &amp; Belmawa
          </p>
        </div>
      </div>

      {/* 3. Tabel "Tugas Saya" / Daftar Usulan */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Tugas Saya — Penelaahan &amp; Progres Usulan</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Peran Aktif: <strong className="text-sky-700">{user.active_role}</strong> • Sesuai Otorisasi ScopeFilter Server
            </p>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-mono">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white font-bold text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({proposals.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'PENDING'
                  ? 'bg-white font-bold text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Menunggu ({metrics.countPending})
            </button>
            <button
              onClick={() => setActiveTab('IN_PROGRESS')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'IN_PROGRESS'
                  ? 'bg-white font-bold text-sky-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Diproses ({metrics.countInProgress})
            </button>
            <button
              onClick={() => setActiveTab('DONE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'DONE'
                  ? 'bg-white font-bold text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selesai ({metrics.countDone})
            </button>
          </div>
        </div>

        {/* Tabel Data Pekerjaan */}
        <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono text-slate-600 uppercase">
                <tr>
                  <th className="p-3.5">ID &amp; Judul Usulan</th>
                  <th className="p-3.5 hidden sm:table-cell">Skema</th>
                  <th className="p-3.5 hidden md:table-cell">Tahapan Seleksi</th>
                  <th className="p-3.5">Status &amp; Skor</th>
                  <th className="p-3.5 text-right">Aksi Kontekstual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-mono text-xs">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                        <span>Memuat data usulan dari server...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProposals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-mono text-xs">
                      Tidak ada usulan dalam kategori ini untuk peran {user.active_role}.
                    </td>
                  </tr>
                ) : (
                  filteredProposals.map((prop) => {
                    const { stageStep, statusLabel, statusBadgeClass } = getStageInfo(prop);
                    const canRevise =
                      user.active_role === 'PENGUSUL' &&
                      prop.status === 'REVISI' &&
                      prop.skor_rata_rata !== null &&
                      prop.skor_rata_rata < 60;

                    return (
                      <tr key={prop.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Judul & Monospace IDs */}
                        <td className="p-3.5 max-w-xs sm:max-w-md">
                          <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-500 mb-0.5">
                            <span className="font-bold text-sky-700">
                              {prop.no_registrasi || '(Belum Terbit No. Reg)'}
                            </span>
                            <span>•</span>
                            <span>{prop.no_agenda || prop.id.slice(0, 8)}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">
                            {prop.judul}
                          </h3>
                          <p className="text-[11px] font-mono text-slate-500 mt-1">
                            {user.active_role === 'REVIEWER' && prop.tahap === 'PROPOSAL' ? (
                              <span className="italic text-slate-400">
                                Pengusul: [Disamarkan — Double-Blind Review]
                              </span>
                            ) : (
                              <>
                                Ketua: <strong className="text-slate-700">{prop.ketua?.nama_lengkap || '-'}</strong>
                                {prop.prodi && ` • Prodi: ${prop.prodi}`}
                                {prop.members && prop.members.length > 0 && (
                                  <>
                                    {' '}• Anggota: {prop.members.map((m) => m.user?.nama_lengkap).filter(Boolean).join(', ')}
                                  </>
                                )}
                              </>
                            )}
                          </p>
                        </td>

                        {/* Skema Badge */}
                        <td className="p-3.5 hidden sm:table-cell whitespace-nowrap">
                          <span
                            className={`whitespace-nowrap inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              prop.skema.includes('PKM-KC')
                                ? 'bg-sky-50 text-sky-700 border-sky-100'
                                : prop.skema.includes('PKM-RE')
                                ? 'bg-slate-100 text-slate-800 border-slate-200'
                                : prop.skema.includes('PKM-PI')
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            {prop.skema}
                          </span>
                        </td>

                        {/* Bilah Progres Tahapan (Stepper Mini) */}
                        <td className="p-3.5 hidden md:table-cell whitespace-nowrap">
                          <div className="w-36">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                              <span>Tahap {stageStep}/4</span>
                              <span className="font-semibold text-sky-700">
                                {stageStep * 25}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  stageStep === 4
                                    ? 'bg-emerald-500'
                                    : stageStep >= 2
                                    ? 'bg-sky-500'
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${stageStep * 25}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status & Skor */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${statusBadgeClass}`}
                          >
                            ● {statusLabel}
                          </span>
                          {prop.skor_rata_rata !== null && (
                            <span className="block text-[11px] font-mono text-slate-500 mt-1 font-semibold">
                              Skor Evaluasi: {prop.skor_rata_rata} / 100
                            </span>
                          )}
                        </td>

                        {/* Tombol Aksi Kontekstual Sesuai active_role */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {user.active_role === 'PENGUSUL' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              {canRevise ? (
                                <button
                                  onClick={() => setSelectedRevisionProposal(prop)}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    upload_file
                                  </span>
                                  <span>Unggah Revisi</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (prop.file_url) {
                                      window.open(prop.file_url, '_blank');
                                    } else {
                                      alert('Tautan berkas usulan belum tersedia.');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center space-x-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    visibility
                                  </span>
                                  <span>Lihat</span>
                                </button>
                              )}
                            </div>
                          )}

                          {user.active_role === 'KAPRODI' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              {prop.status === 'MENUNGGU_VALIDASI_PRODI' ? (
                                <button
                                  onClick={() => setSelectedCplProposal(prop)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    verified
                                  </span>
                                  <span>Validasi CPL</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (prop.file_url) {
                                      window.open(prop.file_url, '_blank');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center space-x-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    visibility
                                  </span>
                                  <span>Lihat</span>
                                </button>
                              )}
                            </div>
                          )}

                          {user.active_role === 'KA_PPM' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              {!prop.no_registrasi && (
                                <button
                                  onClick={() => handleRegisterProposal(prop)}
                                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">badge</span>
                                  <span>Terbitkan No. Reg</span>
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedAssignProposal(prop)}
                                className="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  group_add
                                </span>
                                <span>Tunjuk Reviewer</span>
                              </button>
                            </div>
                          )}

                          {user.active_role === 'REVIEWER' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setSelectedReviewProposal(prop)}
                                className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  rate_review
                                </span>
                                <span>Nilai Berkas</span>
                              </button>
                            </div>
                          )}

                          {user.active_role === 'DIREKTUR' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setSelectedApproveProposal(prop)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  verified_user
                                </span>
                                <span>Tetapkan Dana</span>
                              </button>
                              <button
                                onClick={() => setSelectedBypassProposal(prop)}
                                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">bolt</span>
                                <span>Bypass</span>
                              </button>
                            </div>
                          )}

                          {user.active_role === 'ADMIN' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() =>
                                  alert(
                                    `Melihat jejak audit log lengkap untuk berkas ${prop.no_registrasi || prop.no_agenda}...`
                                  )
                                }
                                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center space-x-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">shield</span>
                                <span>Audit Log</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Skema PKM Aktif Poltek SSN (4 Cards persis dari Stitch unified-portal.html) */}
      <div id="skema-section" className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Skema PKM Aktif Poltek SSN</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Tahun Anggaran 2026</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* PKM-KC */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-400 transition-colors duration-200 flex flex-col justify-between relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#0284C7]" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="whitespace-nowrap inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                  PKM-KC
                </span>
                <span className="text-[11px] font-mono text-slate-400">85% Kuota</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Karsa Cipta</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">24 Tim Terdaftar</p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#0284C7] h-full rounded-full" style={{ width: '85%' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                <span>Lab Kriptografi</span>
                <span className="font-mono text-slate-600 font-semibold">24/28 Tim</span>
              </div>
            </div>
          </div>

          {/* PKM-RE */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-500 transition-colors duration-200 flex flex-col justify-between relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#0F172A]" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="whitespace-nowrap inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  PKM-RE
                </span>
                <span className="text-[11px] font-mono text-slate-400">75% Kuota</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Riset Eksakta</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">18 Tim Terdaftar</p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#0F172A] h-full rounded-full" style={{ width: '75%' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                <span>Lab Siber</span>
                <span className="font-mono text-slate-600 font-semibold">18/24 Tim</span>
              </div>
            </div>
          </div>

          {/* PKM-PI */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-cyan-400 transition-colors duration-200 flex flex-col justify-between relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#06B6D4]" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="whitespace-nowrap inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-100">
                  PKM-PI
                </span>
                <span className="text-[11px] font-mono text-slate-400">50% Kuota</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Penerapan Iptek</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">12 Tim Terdaftar</p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#06B6D4] h-full rounded-full" style={{ width: '50%' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                <span>Mitra Siber Desa</span>
                <span className="font-mono text-slate-600 font-semibold">12/24 Tim</span>
              </div>
            </div>
          </div>

          {/* PKM-K */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-400 transition-colors duration-200 flex flex-col justify-between relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-[#D97706]" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="whitespace-nowrap inline-flex items-center text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                  PKM-K
                </span>
                <span className="text-[11px] font-mono text-slate-400">65% Kuota</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Kewirausahaan</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">15 Tim Terdaftar</p>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#D97706] h-full rounded-full" style={{ width: '65%' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                <span>Inkubator Siber</span>
                <span className="font-mono text-slate-600 font-semibold">15/20 Tim</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Linimasa Seleksi PKM Poltek SSN 2026 */}
      <div id="linimasa-section" className="mt-10">
        <h2 className="text-sm font-bold text-slate-900 tracking-tight mb-4 flex items-center space-x-2">
          <span className="material-symbols-outlined text-amber-500 text-[18px]">event</span>
          <span>Linimasa Seleksi PKM Poltek SSN 2026</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50">
            <span className="text-[10px] font-mono text-sky-700 font-bold block mb-1">
              01 - 25 JAN 2026
            </span>
            <p className="font-bold text-slate-900">Pengajuan Usulan</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Unggah proposal &amp; lembar pengesahan pembimbing.
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] font-mono text-slate-400 font-bold block mb-1">
              26 JAN - 05 FEB
            </span>
            <p className="font-bold text-slate-900">Review Pembimbing</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Persetujuan substansi awal dosen pembimbing.
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] font-mono text-slate-400 font-bold block mb-1">
              06 - 15 FEB 2026
            </span>
            <p className="font-bold text-slate-900">Penilaian Reviewer</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Scoring rubrik substantif oleh dewan reviewer.
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] font-mono text-slate-400 font-bold block mb-1">
              20 FEB 2026
            </span>
            <p className="font-bold text-slate-900">Submit Belmawa</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Pengajuan serentak ke portal Simbelmawa Nasional.
            </p>
          </div>
        </div>
      </div>

      {/* Modal 1: Pengajuan Usulan Baru (PENGUSUL) */}
      <ProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        onSuccess={() => {
          showToast('Usulan proposal baru berhasil diajukan!');
          fetchProposals();
        }}
      />

      {/* Modal 2: Validasi CPL Prodi (KAPRODI) */}
      <ValidateCplModal
        isOpen={selectedCplProposal !== null}
        proposal={selectedCplProposal}
        onClose={() => setSelectedCplProposal(null)}
        onSuccess={() => {
          showToast('Validasi CPL berhasil disahkan dan diteruskan ke Pusat PPM!');
          fetchProposals();
        }}
      />

      {/* Modal 3: Unggah Berkas Revisi (PENGUSUL) */}
      <RevisionModal
        isOpen={selectedRevisionProposal !== null}
        proposal={selectedRevisionProposal}
        onClose={() => setSelectedRevisionProposal(null)}
        onSuccess={() => {
          showToast('Berkas revisi berhasil diunggah!');
          fetchProposals();
        }}
      />

      {/* Modal 4: Penunjukan Penelaah Anti-COI (KA_PPM) */}
      <AssignReviewersModal
        isOpen={selectedAssignProposal !== null}
        proposal={selectedAssignProposal}
        onClose={() => setSelectedAssignProposal(null)}
        onSuccess={() => {
          showToast('Dewan penelaah berhasil ditugaskan bebas konflik kepentingan!');
          fetchProposals();
        }}
      />

      {/* Modal 5: Evaluasi Substansi FO-018/FO-021 (REVIEWER) */}
      <ReviewModal
        isOpen={selectedReviewProposal !== null}
        proposal={selectedReviewProposal}
        onClose={() => setSelectedReviewProposal(null)}
        onSuccess={() => {
          showToast('Penilaian substansi penelaah berhasil disimpan!');
          fetchProposals();
        }}
      />

      {/* Modal 6: Penetapan Pendanaan Akhir (DIREKTUR) */}
      <ApproveFundingModal
        isOpen={selectedApproveProposal !== null}
        proposal={selectedApproveProposal}
        onClose={() => setSelectedApproveProposal(null)}
        onSuccess={() => {
          showToast('Penetapan pendanaan riset berhasil disahkan!');
          fetchProposals();
        }}
      />

      {/* Modal 7: Penugasan Langsung / Bypass Berkas Existing (DIREKTUR) */}
      <BypassModal
        isOpen={selectedBypassProposal !== null}
        proposal={selectedBypassProposal}
        onClose={() => setSelectedBypassProposal(null)}
        onSuccess={() => {
          showToast('Penugasan langsung (Bypass) berhasil dieksekusi!');
          fetchProposals();
        }}
      />

      {/* Modal 8: Penugasan Strategis Top-Down Baru (DIREKTUR) */}
      <BypassModal
        isOpen={isCreateBypassOpen}
        proposal={null}
        onClose={() => setIsCreateBypassOpen(false)}
        onSuccess={() => {
          showToast('Riset strategis top-down berhasil diterbitkan!');
          fetchProposals();
        }}
      />
    </div>
  );
}
