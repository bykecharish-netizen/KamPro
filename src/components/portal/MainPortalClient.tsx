'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FolderOpen,
  GraduationCap,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  DEMO_WORKSPACE_PROPOSALS,
  OFFICIAL_GUIDES,
  PKM_SCHEMES,
  PUBLIC_WORKFLOW_STEPS,
  TIMELINE_PHASES,
  getRoleDisplayLabel,
  mapServerRoleToPortalMode,
  sanitizeSearchInput,
  type PortalRoleMode,
  type PortalUserDto,
  type ProposalStatusLabel,
  type SchemeCode,
  type WorkspaceProposalRow,
} from './portalData';

interface MainPortalClientProps {
  initialUser: PortalUserDto | null;
}

type NavSectionId = 'beranda' | 'skema' | 'usulan' | 'jadwal' | 'pedoman';

const ROLE_PREVIEW_OPTIONS: Array<{ mode: PortalRoleMode; label: string }> = [
  { mode: 'GUEST', label: 'Publik' },
  { mode: 'TARUNA', label: 'Taruna' },
  { mode: 'DOSEN', label: 'Dosen' },
  { mode: 'REVIEWER', label: 'Reviewer' },
  { mode: 'ADMIN', label: 'Admin' },
];

const NAV_ITEMS: Array<{ id: NavSectionId; index: string; label: string }> = [
  { id: 'beranda', index: '01', label: 'Beranda' },
  { id: 'skema', index: '02', label: 'Skema PKM' },
  { id: 'usulan', index: '03', label: 'Data Usulan' },
  { id: 'jadwal', index: '04', label: 'Jadwal Pelaksanaan' },
  { id: 'pedoman', index: '05', label: 'Unduh Pedoman' },
];

export default function MainPortalClient({ initialUser }: MainPortalClientProps) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUserDto | null>(initialUser);
  const verifiedRoleMode: PortalRoleMode = user
    ? mapServerRoleToPortalMode(user.active_role)
    : 'GUEST';

  const [viewMode, setViewMode] = useState<PortalRoleMode>(verifiedRoleMode);
  const [activeNav, setActiveNav] = useState<NavSectionId>('beranda');
  const [selectedScheme, setSelectedScheme] = useState<SchemeCode | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [liveProposals, setLiveProposals] = useState<WorkspaceProposalRow[] | null>(null);
  const [actionPrompt, setActionPrompt] = useState<{
    title: string;
    description: string;
    requiresLogin: boolean;
  } | null>(null);

  const isRoleOverridePreview = !!user && viewMode !== verifiedRoleMode;

  useEffect(() => {
    if (!user) {
      setLiveProposals(null);
      return;
    }

    let cancelled = false;
    fetch('/api/proposals', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.success || !Array.isArray(payload.data)) return;
        const mapped: WorkspaceProposalRow[] = payload.data.map((p: any, idx: number) => {
          const schemeCode: SchemeCode =
            p.skema === 'PKM-RE' || p.skema === 'PKM-PI' || p.skema === 'PKM-K'
              ? p.skema
              : 'PKM-KC';

          let statusLabel: ProposalStatusLabel = 'Menunggu Verifikasi';
          if (p.status === 'DIDANAI' || p.status === 'SELESAI' || p.status === 'LOLOS') {
            statusLabel = 'Disetujui';
          } else if (p.status === 'REVISI' || p.status === 'PERLU_REVISI') {
            statusLabel = 'Perlu Revisi';
          }

          return {
            id: String(p.id || `live-${idx}`),
            code: String(p.no_registrasi || p.no_agenda || `PKM-KC-2026-0${idx + 14}`),
            scheme: schemeCode,
            title: String(p.judul || 'Usulan Proposal PKM'),
            teamLead: p.ketua?.nama_lengkap ? String(p.ketua.nama_lengkap) : 'Tim Pengusul',
            prodi: String(p.prodi || 'Rekayasa Keamanan Siber'),
            supervisor:
              p.ketua?.nama_lengkap && p.tahap !== 'PROPOSAL'
                ? String(p.ketua.nama_lengkap)
                : 'Dosen Pembimbing Terdaftar',
            status: statusLabel,
            assignedToRole: ['TARUNA', 'DOSEN', 'REVIEWER', 'ADMIN'],
          };
        });
        if (mapped.length > 0) {
          setLiveProposals(mapped);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setLiveProposals(null);
      setViewMode('GUEST');
      setIsLoggingOut(false);
      router.refresh();
    }
  };

  const scrollToSection = (id: NavSectionId) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(sanitizeSearchInput(e.target.value));
  };

  const handleSchemeCardClick = (code: SchemeCode) => {
    setSelectedScheme((prev) => (prev === code ? 'ALL' : code));
    if (viewMode !== 'GUEST') {
      scrollToSection('usulan');
    }
  };

  const filteredProposals = useMemo(() => {
    if (viewMode === 'GUEST') return [];

    const source: WorkspaceProposalRow[] =
      user && !isRoleOverridePreview && liveProposals && liveProposals.length > 0
        ? liveProposals
        : DEMO_WORKSPACE_PROPOSALS.filter((item) => item.assignedToRole.includes(viewMode));

    const q = searchQuery.trim().toLowerCase();
    return source.filter((item) => {
      if (selectedScheme !== 'ALL' && item.scheme !== selectedScheme) return false;
      if (q) {
        const text = `${item.code} ${item.title} ${item.scheme} ${item.supervisor} ${item.status}`.toLowerCase();
        return text.includes(q);
      }
      return true;
    });
  }, [viewMode, user, isRoleOverridePreview, liveProposals, selectedScheme, searchQuery]);

  const handleProposalAction = (actionLabel: string, proposalCode?: string) => {
    if (!user) {
      setActionPrompt({
        title: 'Masuk Akun Diperlukan',
        description: `Silakan masuk menggunakan akun sivitas Poltek SSN untuk melanjutkan tindakan "${actionLabel}"${
          proposalCode ? ` pada usulan ${proposalCode}` : ''
        }.`,
        requiresLogin: true,
      });
      return;
    }

    if (isRoleOverridePreview) {
      setActionPrompt({
        title: 'Mode Pratinjau Tampilan',
        description: `Anda sedang melihat pratinjau tampilan ${getRoleDisplayLabel(
          viewMode
        )}. Buka halaman dasbor utama untuk mengelola usulan sesuai peran akun aktif Anda.`,
        requiresLogin: false,
      });
      return;
    }

    router.push('/dashboard');
  };

  // Warna semantik lembut (pastel tenang) agar mudah dipindai tanpa terasa mencolok
  const getStatusPillStyle = (status: ProposalStatusLabel) => {
    switch (status) {
      case 'Disetujui':
        return {
          pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
      case 'Perlu Revisi':
        return {
          pill: 'bg-amber-50 text-amber-800 border border-amber-200/80',
          dot: 'bg-amber-500',
        };
      default:
        return {
          pill: 'bg-sky-50 text-sky-700 border border-sky-200/80',
          dot: 'bg-sky-500',
        };
    }
  };

  const getRoleActionLabel = (mode: PortalRoleMode) => {
    switch (mode) {
      case 'TARUNA':
        return 'Detail / Revisi';
      case 'DOSEN':
        return 'Verifikasi';
      case 'REVIEWER':
        return 'Beri Nilai';
      case 'ADMIN':
        return 'Kelola';
      default:
        return 'Detail';
    }
  };

  const sidebarContent = (
    <>
      <div className="space-y-8">
        {/* Brand Header */}
        <Link href="/" className="flex items-center gap-3 focus:outline-none">
          <img
            src="/images/logo-poltekssn.png"
            alt="Logo Politeknik Siber dan Sandi Negara"
            className="w-10 h-10 object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="text-lg font-bold text-[#0F172A] leading-tight tracking-tight">
              SIM-PKM
            </p>
            <p className="text-xs text-slate-500 leading-tight">Poltek SSN</p>
          </div>
        </Link>

        {/* Primary Navigation Menu */}
        <nav aria-label="Menu Utama" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center gap-3 text-left text-sm transition-all cursor-pointer rounded-xl px-3.5 py-2.5 ${
                  isActive
                    ? 'bg-[#0F172A] text-white font-medium shadow-xs'
                    : 'text-slate-600 hover:bg-sky-50/70 hover:text-[#0F172A]'
                }`}
              >
                <span
                  className={`font-mono text-xs ${
                    isActive ? 'text-sky-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {item.index}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="space-y-4 pt-6 border-t border-slate-200/80">
        <a
          href="/docs/panduan-pkm-2026.pdf"
          download="Buku-Pedoman-PKM-Poltek-SSN-2026.pdf"
          className="w-full border border-slate-200 bg-slate-50/70 text-slate-700 hover:border-sky-300 hover:bg-sky-50/60 hover:text-[#0F172A] rounded-xl py-2.5 px-3 text-xs font-medium whitespace-nowrap inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
          <span>Unduh Buku Pedoman PKM</span>
        </a>
        <p className="text-xs text-slate-400 text-center">Unit PPM • Poltek SSN</p>
      </div>
    </>
  );

  return (
    <div className="w-full min-h-screen flex bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* ===================================================================
          A. LEFT NAVIGATION SIDEBAR
         =================================================================== */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200/90 flex-col justify-between p-6 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0F172A]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-50 w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col justify-between p-6 h-full">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu"
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ===================================================================
          B. MAIN CONTENT AREA
         =================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 1. Clean & Uncluttered Top Header Bar */}
        <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-[#0F172A] truncate">
              Portal Program Kreativitas Mahasiswa
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap bg-sky-50 text-sky-700 border border-sky-200/70 text-xs px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              Tahun Akademik 2026
            </span>
          </div>

          {/* Right Auth Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {!user ? (
              <>
                <Link
                  href="/register"
                  className="whitespace-nowrap inline-flex items-center border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Daftar Akun
                </Link>
                <Link
                  href="/login"
                  className="whitespace-nowrap inline-flex items-center bg-[#0F172A] text-white hover:bg-[#0284C7] px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  Masuk
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center gap-2 text-xs text-slate-700 hover:text-[#0284C7] transition-colors whitespace-nowrap"
                >
                  <span className="font-semibold max-w-[160px] truncate">{user.nama_lengkap}</span>
                  <span className="whitespace-nowrap inline-flex items-center bg-sky-50 text-sky-700 border border-sky-200/80 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                    {getRoleDisplayLabel(verifiedRoleMode)}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="whitespace-nowrap inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
                </button>
              </>
            )}
          </div>
        </header>

        {/* 2. Simplified, Airy Workspace Content */}
        <main className="p-6 lg:p-8 space-y-8 max-w-6xl w-full mx-auto flex-1">
          {/* Banner Utama */}
          <section
            id="beranda"
            className="scroll-mt-24 relative rounded-2xl overflow-hidden border border-slate-200/90 min-h-[196px] flex flex-col md:flex-row md:items-center justify-between gap-6 p-7 sm:p-8 bg-cover bg-center shadow-xs"
            style={{ backgroundImage: "url('/images/bg-poltekssn.jpeg')" }}
          >
            {/* Refined Deep Navy -> Soft Sky Gradient Overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#061E45]/95 via-[#0F172A]/80 to-[#0284C7]/35"
            />
            {/* Thin Institutional Accent Hairline */}
            <div
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-[#0284C7] via-sky-400 to-[#F59E0B]"
            />

            <div className="relative z-10 space-y-1.5">
              <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wider text-sky-200 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                PROGRAM KREATIVITAS MAHASISWA • POLTEK SSN
              </p>
              <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Sistem Informasi Manajemen PKM
              </h2>
              <p className="text-sm text-slate-200/95 max-w-xl leading-relaxed">
                Layanan terpadu pendaftaran proposal, persetujuan dosen pembimbing, dan seleksi internal PKM Taruna Politeknik Siber dan Sandi Negara.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <Link
                href={user ? '/dashboard' : '/login'}
                className="bg-white text-[#0F172A] hover:bg-sky-50 px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-2 shadow-sm transition-colors"
              >
                <span>Ajukan Proposal</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0284C7]" />
              </Link>
            </div>
          </section>

          {/* Ringkasan Informasi — Simplified Single Unified Stat Strip */}
          <section aria-label="Ringkasan Informasi">
            <div className="bg-white border border-slate-200/90 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 shadow-2xs">
              <div className="p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Total Proposal Masuk</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-0.5 tracking-tight">69 Usulan</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Periode Seleksi 2026</p>
                </div>
              </div>

              <div className="p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Peserta Terdaftar</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-0.5 tracking-tight">284 Taruna</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">4 Program Studi</p>
                </div>
              </div>

              <div className="p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Dosen Pembimbing</p>
                  <p className="text-xl font-bold text-[#0F172A] mt-0.5 tracking-tight">32 Dosen</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Aktif Membimbing</p>
                </div>
              </div>

              <div className="p-5 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Batas Pengumpulan</p>
                  <p className="text-xl font-bold text-[#D97706] mt-0.5 tracking-tight">14 Hari Lagi</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Penutupan Tahap Internal</p>
                </div>
              </div>
            </div>
          </section>

          {/* 02 / Skema PKM — Clean Cards with Subtle Institutional Accent */}
          <section id="skema" className="scroll-mt-24 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-[#0284C7] font-medium">02 / Skema &amp; Kuota PKM</p>
                <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">Skema PKM yang Dibuka</h2>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection('pedoman')}
                className="whitespace-nowrap inline-flex items-center gap-1 text-xs font-medium text-[#0284C7] hover:text-[#0F172A] transition-colors cursor-pointer"
              >
                <span>Lihat Ketentuan Skema</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PKM_SCHEMES.map((scheme) => {
                const pct = Math.round((scheme.registeredTeams / scheme.maxTeams) * 100);
                const isSelected = selectedScheme === scheme.code;
                return (
                  <button
                    key={scheme.code}
                    type="button"
                    onClick={() => handleSchemeCardClick(scheme.code)}
                    className={`group text-left bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'border-[#0284C7] ring-2 ring-sky-100'
                        : 'border-slate-200/90 hover:border-sky-300/80 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-md whitespace-nowrap inline-flex items-center transition-colors ${
                          isSelected
                            ? 'bg-[#0284C7] text-white'
                            : 'bg-sky-50 text-sky-800 border border-sky-100 group-hover:bg-sky-100/80'
                        }`}
                      >
                        {scheme.code}
                      </span>
                      <span className="font-mono text-xs font-medium text-slate-500 whitespace-nowrap inline-flex items-center">
                        {scheme.registeredTeams}/{scheme.maxTeams} Tim
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#0284C7] transition-colors">
                        {scheme.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{scheme.focus}</p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#0F172A] to-[#0284C7] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 text-right">{pct}% terisi</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03 / Data Usulan — Adaptive Workspace with Integrated Role Switcher */}
          <section id="usulan" className="scroll-mt-24 space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-[#0284C7] font-medium">03 / Data Usulan</p>
                <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">
                  {viewMode === 'GUEST' ? 'Tahapan Pengajuan PKM' : 'Daftar Usulan PKM'}
                </h2>
              </div>

              {/* Clean Segmented Role Switcher right where it matters */}
              <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto max-w-full">
                <span className="text-[11px] text-slate-400 px-2 whitespace-nowrap hidden sm:inline">
                  Tampilan:
                </span>
                {ROLE_PREVIEW_OPTIONS.map((opt) => {
                  const active = viewMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => setViewMode(opt.mode)}
                      className={`whitespace-nowrap inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#0F172A] text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
              {viewMode === 'GUEST' ? (
                /* SIMPLIFIED PUBLIC / GUEST VIEW */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PUBLIC_WORKFLOW_STEPS.map((step) => (
                      <div key={step.number} className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-sky-50 text-[#0284C7] border border-sky-200/70 font-mono text-xs font-bold inline-flex items-center justify-center shrink-0">
                            0{step.number}
                          </span>
                          <h3 className="text-xs font-bold text-[#0F172A] leading-snug">
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed pl-9">
                          {step.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Clean Callout Strip */}
                  <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Silakan masuk menggunakan akun sivitas Poltek SSN untuk mengajukan proposal, memantau status verifikasi dosen, atau melihat daftar usulan.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/login"
                        className="whitespace-nowrap inline-flex items-center bg-[#0F172A] text-white hover:bg-[#0284C7] px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        Masuk
                      </Link>
                      <Link
                        href="/register"
                        className="whitespace-nowrap inline-flex items-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        Daftar Akun
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                /* LOGGED-IN / ROLE TABLE VIEW */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Cari nomor registrasi, judul, atau dosen pembimbing..."
                        aria-label="Cari data usulan"
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-[#F8FAFC] focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:ring-2 focus:ring-sky-100 transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label="Hapus pencarian"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Filter Skema PKM"
                        value={selectedScheme}
                        onChange={(e) => setSelectedScheme(e.target.value as SchemeCode | 'ALL')}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-[#0284C7] cursor-pointer"
                      >
                        <option value="ALL">Semua Skema</option>
                        <option value="PKM-KC">PKM-KC — Karsa Cipta</option>
                        <option value="PKM-RE">PKM-RE — Riset Eksakta</option>
                        <option value="PKM-PI">PKM-PI — Penerapan Iptek</option>
                        <option value="PKM-K">PKM-K — Kewirausahaan</option>
                      </select>

                      {user && !isRoleOverridePreview && (
                        <Link
                          href="/dashboard"
                          className="whitespace-nowrap inline-flex items-center gap-1.5 bg-[#0284C7] text-white hover:bg-sky-700 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors"
                        >
                          <span>Buka Dasbor</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <th className="py-3 pr-4 whitespace-nowrap">No. Registrasi</th>
                          <th className="py-3 px-4">Judul Proposal</th>
                          <th className="py-3 px-4 whitespace-nowrap">Skema</th>
                          <th className="py-3 px-4 whitespace-nowrap">Dosen Pembimbing</th>
                          <th className="py-3 px-4 whitespace-nowrap">Status</th>
                          <th className="py-3 pl-4 text-right whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredProposals.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                              Tidak ditemukan data usulan yang sesuai dengan kriteria pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredProposals.map((item) => {
                            const actionLabel = getRoleActionLabel(viewMode);
                            const statusStyle = getStatusPillStyle(item.status);
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 pr-4 font-mono font-semibold text-[#0F172A] whitespace-nowrap">
                                  {item.code}
                                </td>
                                <td className="py-3.5 px-4 min-w-[250px]">
                                  <p className="font-medium text-[#0F172A] leading-snug">
                                    {item.title}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">{item.prodi}</p>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-md whitespace-nowrap inline-flex items-center">
                                    {item.scheme}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                  {item.supervisor}
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span
                                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center gap-1.5 ${statusStyle.pill}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleProposalAction(actionLabel, item.code)}
                                    className="whitespace-nowrap inline-flex items-center border border-slate-200 bg-white text-slate-700 hover:border-[#0284C7] hover:bg-sky-50 hover:text-[#0284C7] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                                  >
                                    {actionLabel}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 04 / Jadwal Pelaksanaan & 05 / Unduh Pedoman — Clean 2-Column Split for Compactness */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 04 / Jadwal Pelaksanaan (7 cols) */}
            <section id="jadwal" className="lg:col-span-7 scroll-mt-24 space-y-3">
              <div>
                <p className="font-mono text-xs text-[#0284C7] font-medium">04 / Jadwal Pelaksanaan</p>
                <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">Linimasa PKM 2026</h2>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-2xs">
                {TIMELINE_PHASES.map((phase) => {
                  const isActive = phase.status === 'Berlangsung';
                  const isDone = phase.status === 'Selesai';
                  return (
                    <div
                      key={phase.step}
                      className={`p-4 flex items-start justify-between gap-4 ${
                        isActive ? 'bg-sky-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={`mt-0.5 w-6 h-6 rounded-full font-mono text-[11px] font-bold inline-flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-[#0284C7] text-white'
                              : isDone
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : phase.step}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-[#0F172A]">{phase.title}</h3>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {phase.description}
                          </p>
                          <p className="inline-flex items-center gap-1 text-[11px] text-slate-400 mt-1.5 font-mono">
                            <Calendar className="w-3 h-3" />
                            {phase.period}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center shrink-0 ${
                          isActive
                            ? 'bg-sky-50 text-[#0284C7] border border-sky-200'
                            : isDone
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {phase.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 05 / Unduh Pedoman (5 cols) */}
            <section id="pedoman" className="lg:col-span-5 scroll-mt-24 space-y-3">
              <div>
                <p className="font-mono text-xs text-[#0284C7] font-medium">05 / Unduh Pedoman</p>
                <h2 className="text-lg font-bold text-[#0F172A] mt-0.5">Dokumen Resmi</h2>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-2xs">
                {OFFICIAL_GUIDES.map((guide) => (
                  <div
                    key={guide.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-[#0F172A] leading-snug">
                          {guide.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{guide.meta}</p>
                      </div>
                    </div>

                    <a
                      href={guide.href}
                      download={guide.filename}
                      className="whitespace-nowrap inline-flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 hover:border-[#0284C7] hover:bg-sky-50 hover:text-[#0284C7] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh</span>
                    </a>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        {/* 3. Clean Institutional Footer */}
        <footer className="border-t border-slate-200/90 bg-white px-6 lg:px-8 py-5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Politeknik Siber dan Sandi Negara. Hak Cipta Dilindungi.</p>
          <p>Unit Penelitian dan Pengabdian kepada Masyarakat (UPPM)</p>
        </footer>
      </div>

      {/* Modal Prompt */}
      {actionPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-[#0F172A]">{actionPrompt.title}</h3>
              <button
                type="button"
                onClick={() => setActionPrompt(null)}
                aria-label="Tutup"
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{actionPrompt.description}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionPrompt(null)}
                className="whitespace-nowrap inline-flex items-center border border-slate-300 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
              <Link
                href={actionPrompt.requiresLogin ? '/login' : '/dashboard'}
                className="whitespace-nowrap inline-flex items-center bg-[#0F172A] text-white hover:bg-[#0284C7] px-4 py-2 rounded-lg text-xs font-medium transition-colors"
              >
                {actionPrompt.requiresLogin ? 'Masuk Sekarang' : 'Buka Dasbor'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
