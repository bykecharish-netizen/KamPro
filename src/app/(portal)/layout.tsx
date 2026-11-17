'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/components/layout/AuthContext';
import GuidanceModal from '@/components/modals/GuidanceModal';
import ProposalModal from '@/components/modals/ProposalModal';

function formatRoleLabel(role: string): string {
  switch (role) {
    case 'PENGUSUL':
      return 'Pengusul';
    case 'KAPRODI':
      return 'Kaprodi';
    case 'KA_PPM':
      return 'Kepala PPM';
    case 'REVIEWER':
      return 'Reviewer';
    case 'DIREKTUR':
      return 'Direktur';
    case 'ADMIN':
      return 'Admin PPM';
    default:
      return role;
  }
}

function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const cleanParts = parts.filter(
    (p) =>
      !p.endsWith('.') &&
      !['tni', 'marsekal', 'letkol', 'mayor', 'kapten', 'dr', 'ir', 'drs'].includes(
        p.toLowerCase()
      )
  );
  if (cleanParts.length >= 2) {
    return (cleanParts[0][0] + cleanParts[1][0]).toUpperCase();
  }
  if (cleanParts.length === 1) {
    return cleanParts[0].substring(0, 2).toUpperCase();
  }
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].substring(0, 2).toUpperCase();
}

function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, switchRole, logout } = useAuth();
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#061E45] flex flex-col items-center justify-center text-white font-mono text-xs">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-300">Memverifikasi sesi aman...</p>
      </div>
    );
  }

  const handleRoleChange = async (targetRole: string) => {
    if (targetRole === user.active_role || isSwitching) return;
    setIsSwitching(true);
    await switchRole(targetRole);
    setIsSwitching(false);
  };

  const displayName = `${user.nama_lengkap}${user.gelar ? ', ' + user.gelar : ''}`;
  const initials = getInitials(user.nama_lengkap);

  return (
    <div className="font-sans antialiased text-slate-800 min-h-screen selection:bg-sky-100 selection:text-sky-900 bg-[#061E45] relative">
      {/* Full-bleed Sovereign Cyber Illustration Background */}
      <div className="fixed inset-0 z-0 bg-[#0A192F] bg-gradient-to-b from-[#0B1E3B] via-[#081528] to-[#040C18] pointer-events-none" />

      {/* Top Ribbon */}
      <div className="fixed top-0 inset-x-0 z-50 bg-slate-950/90 text-white backdrop-blur-md border-b border-sky-500/20 py-1.5 px-4 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sky-400 font-semibold">
              Peran Aktif: {user.active_role}
            </span>
          </div>

          <div className="text-slate-400 text-[11px] font-mono flex items-center space-x-2">
            <span>Sesi Aman</span>
            <span className="text-slate-600">•</span>
            <span>NIP/NPM: {user.nip_npm}</span>
          </div>
        </div>
      </div>

      {/* Transparent Top Navigation Bar */}
      <header className="fixed top-7 inset-x-0 z-40 transition-all duration-300 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">
          {/* Left: Institutional Brand Identity */}
          <a className="flex items-center space-x-3 group" href="/dashboard">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shadow-lg group-hover:border-sky-400/50 transition-colors">
              <img
                alt="Logo Resmi Politeknik Siber dan Sandi Negara"
                className="w-10 h-10 object-contain drop-shadow-sm"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuARYfXaAwCGtJHkMtFS-XKajJdyl12tmIb3mHc0mKSvDs2Fl5rCss5BPgDnLpSKiaGZiERJdjEQ4g6gTxkBqfYUy-KySh3TbkDSyKewIaGU4wsxUYn3zwK0wHvBOeNKYhC0Zoqi4FQEC_t9abgIei8-D5i_GCK2B-D4h3AtPNrk7eAhBjZWilne9fjOwbGImDuQ8hZEOKdxY-ZBU4t-z8fhP6EDJmY_gOpGdh9CzGQSEh3CS7_PhC7j2g"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold text-lg tracking-tight">SIM-PKM</span>
                <span className="text-[10px] font-mono tracking-wider text-sky-400 bg-sky-950/60 border border-sky-400/30 px-1.5 py-0.5 rounded">
                  v2.6-PROD
                </span>
              </div>
              <span className="whitespace-nowrap inline-flex items-center text-cyan-200/85 text-[10px] font-mono tracking-wider uppercase">
                POLITEKNIK SIBER DAN SANDI NEGARA
              </span>
            </div>
          </a>

          {/* Right: Authenticated User Bar + Multi-Role Switcher */}
          <div className="flex items-center space-x-3" id="nav-auth-container">
            {/* Role Switcher Dropdown (Only visible if user has > 1 role) */}
            {user.roles && user.roles.length > 1 && (
              <div className="relative inline-block text-left">
                <select
                  aria-label="Pilih Peran Aktif"
                  value={user.active_role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={isSwitching}
                  className="bg-slate-800 text-cyan-300 border border-sky-500/40 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:ring-sky-500 focus:border-sky-500 cursor-pointer disabled:opacity-50"
                >
                  {user.roles.map((r) => (
                    <option key={r} value={r}>
                      Peran: {formatRoleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User Profile Badge */}
            <div className="flex items-center space-x-2.5 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                {initials}
              </div>
              <span
                className="text-white text-xs font-semibold max-w-[140px] sm:max-w-[200px] truncate"
                title={displayName}
              >
                {displayName}
              </span>
              <span className="whitespace-nowrap inline-flex items-center text-[10px] font-mono uppercase bg-sky-500/30 border border-sky-400/40 text-sky-200 px-2 py-0.5 rounded-full font-bold">
                {formatRoleLabel(user.active_role)}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Keluar / Logout"
              className="text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-600/40 border border-rose-500/30 px-3 py-1.5 rounded-full text-xs font-mono transition-colors flex items-center space-x-1"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace View Container */}
      <div className="relative z-10" id="main-workspace-view">
        {/* Unobstructed Hero Stage: Top 42vh reserved for flag, emblem, cyber nodes, and cloud line */}
        <div className="pt-28 pb-6 w-full relative flex flex-col items-center justify-center text-center px-4">
          <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-xs font-mono tracking-wide shadow-xl mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SANATA PAROKSHARTA BHAKTI • PORTAL USULAN PKM</span>
          </div>
          <h1 className="text-white font-bold text-2xl sm:text-3xl tracking-tight">
            Sistem Informasi Manajemen PKM Poltek SSN
          </h1>
          <p className="text-cyan-200/80 text-xs sm:text-sm font-mono mt-1">
            Mewujudkan Taruna Berjiwa Inovatif, Berkarakter Pengabdian Siber &amp; Sandi Negara
          </p>
        </div>

        {/* Main Editorial White Card */}
        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="bg-white/95 backdrop-blur-xl rounded-t-3xl border border-white/70 shadow-[0_-12px_45px_rgba(6,30,69,0.18)] overflow-hidden">
            {/* Top Hairline indicator */}
            <div className="h-[3px] w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-600" />

            {/* Banner Image */}
            <div className="relative w-full sm:h-80 lg:h-96 overflow-hidden border-b border-slate-200 bg-slate-900 h-80">
              <img
                alt="Ilustrasi Pengabdian dan Inovasi Siber Taruna Poltek SSN"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 25%' }}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEtbtQqXVBDqoPkQ1iP1YCf7OwgItwzjWaPJdCR7nX4TExTfLajHv_1bX9A3nQJVrnZ5Vl6aum5-nQW45GyBpWXW4wp8S9qfwDfshnGePRacvO7O_gKMjpUDuPgKZPqBc3wpzkabYBEqKMCV6FRG8NlDCNssWUuPHrJ7p7hW28O2oBKnUPFptudH5a6FjjYgcKGDpI5eWoS7ckxgFul06jCcvG9uzihT3KInJvdlWdQNKDXoUm0Bt1Mg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent flex items-end p-6 sm:p-8">
                <div className="text-white">
                  <span className="px-2.5 py-1 rounded bg-sky-500/90 text-white text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm">
                    Wahana Pengabdian &amp; Riset Siber
                  </span>
                  <h2 className="text-lg sm:text-2xl font-bold text-white mt-1.5 drop-shadow-md">
                    Pemberdayaan Talenta Siber Taruna Poltek SSN untuk Masyarakat
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl drop-shadow-sm">
                    Kolaborasi riset teknologi persandian, edukasi keamanan informasi publik, dan inkubasi inovasi rekayasa kriptografi 2026.
                  </p>
                </div>
              </div>
            </div>

            {/* 12-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
              {/* Sidebar (3 Columns) */}
              <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200/80 p-6 flex flex-col justify-between bg-slate-50/50">
                <div>
                  {/* Institutional Emblem Header */}
                  <div className="flex items-center space-x-3 pb-5 border-b border-slate-200/70">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 p-1 flex items-center justify-center shadow-md">
                      <img
                        alt="Logo Poltek SSN"
                        className="w-10 h-10 object-contain"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuARYfXaAwCGtJHkMtFS-XKajJdyl12tmIb3mHc0mKSvDs2Fl5rCss5BPgDnLpSKiaGZiERJdjEQ4g6gTxkBqfYUy-KySh3TbkDSyKewIaGU4wsxUYn3zwK0wHvBOeNKYhC0Zoqi4FQEC_t9abgIei8-D5i_GCK2B-D4h3AtPNrk7eAhBjZWilne9fjOwbGImDuQ8hZEOKdxY-ZBU4t-z8fhP6EDJmY_gOpGdh9CzGQSEh3CS7_PhC7j2g"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono tracking-widest uppercase text-sky-700 font-bold">
                        Direktorat PPM
                      </p>
                      <h2 className="text-xs font-bold text-slate-900">Poltek SSN Cyber Hub</h2>
                    </div>
                  </div>

                  {/* Context-aware Navigation Links based on active_role */}
                  <nav className="mt-6 space-y-1.5" id="sidebar-nav">
                    {user.active_role === 'PENGUSUL' && (
                      <>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg bg-sky-50/70 border-l-[3px] border-[#0284C7] transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-sky-700 text-[18px]">
                              assignment
                            </span>
                            <span className="text-sm font-bold text-slate-900">Proposal Tim Saya</span>
                          </div>
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        </a>
                        <button
                          onClick={() => setIsProposalOpen(true)}
                          className="w-full group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              add_circle
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              + Usulan Baru
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => setIsGuidanceOpen(true)}
                          className="w-full group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              menu_book
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              Panduan &amp; Template
                            </span>
                          </div>
                        </button>
                      </>
                    )}

                    {user.active_role === 'KAPRODI' && (
                      <>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg bg-sky-50/70 border-l-[3px] border-[#0284C7] transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-sky-700 text-[18px]">
                              verified
                            </span>
                            <span className="text-sm font-bold text-slate-900">Validasi CPL Prodi</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-200 text-sky-900 font-bold">
                            3
                          </span>
                        </a>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              history
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              Riwayat Validasi
                            </span>
                          </div>
                        </a>
                      </>
                    )}

                    {user.active_role === 'REVIEWER' && (
                      <>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg bg-sky-50/70 border-l-[3px] border-[#0284C7] transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-sky-700 text-[18px]">
                              fact_check
                            </span>
                            <span className="text-sm font-bold text-slate-900">Tugas Penilaian</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-200 text-amber-900 font-bold">
                            5 Tim
                          </span>
                        </a>
                        <button
                          onClick={() => setIsGuidanceOpen(true)}
                          className="w-full group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              rule
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              Rubrik Penilaian
                            </span>
                          </div>
                        </button>
                      </>
                    )}

                    {(user.active_role === 'KA_PPM' || user.active_role === 'ADMIN') && (
                      <>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg bg-sky-50/70 border-l-[3px] border-[#0284C7] transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-sky-700 text-[18px]">
                              admin_panel_settings
                            </span>
                            <span className="text-sm font-bold text-slate-900">Manajemen PPM</span>
                          </div>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </a>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              group_add
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              Plotting Reviewer
                            </span>
                          </div>
                        </a>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              tune
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              Distribusi Kuota
                            </span>
                          </div>
                        </a>
                      </>
                    )}

                    {user.active_role === 'DIREKTUR' && (
                      <>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg bg-sky-50/70 border-l-[3px] border-[#0284C7] transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-sky-700 text-[18px]">
                              verified_user
                            </span>
                            <span className="text-sm font-bold text-slate-900">Penetapan Pendanaan</span>
                          </div>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </a>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              bolt
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              Penugasan Langsung (Bypass)
                            </span>
                          </div>
                        </a>
                        <a
                          href="/dashboard"
                          className="group flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-100/60 border-l-[3px] border-transparent transition-all"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">
                              bar_chart
                            </span>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900">
                              Laporan Eksekutif
                            </span>
                          </div>
                        </a>
                      </>
                    )}
                  </nav>
                </div>

                {/* Bottom Sidebar Info & Downloads */}
                <div className="mt-8 pt-5 border-t border-slate-200/70 space-y-3">
                  <button
                    className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-all"
                    onClick={() => setIsGuidanceOpen(true)}
                  >
                    <span className="material-symbols-outlined text-[18px] text-sky-600">
                      download
                    </span>
                    <span>Unduh Panduan PKM 2026</span>
                  </button>
                  <div className="p-3 rounded-lg bg-sky-50/60 border border-sky-100 text-[11px] font-mono text-slate-600">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span>Sandi Internal</span>
                      <span className="text-emerald-600 font-semibold">Aktif</span>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">
                      <p className="whitespace-nowrap inline-flex items-center font-medium">
                        Poltek SSN • Ciseeng, Bogor
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">SIM-PKM Build 2026.04-L1</p>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main Content Area (9 Columns) */}
              <section className="lg:col-span-9 p-6 lg:p-8 flex flex-col justify-between">
                {children}

                {/* Institutional Micro Footer within Content Area */}
                <div className="mt-12 pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="whitespace-nowrap inline-flex items-center">
                      Server: SANAPATI-NODE-01
                    </span>
                    <span>•</span>
                    <span>Latensi: 14ms (Enkripsi TLS 1.3)</span>
                  </div>
                  <p className="text-center sm:text-right">
                    © 2026 Pusat Penelitian &amp; Pengabdian Masyarakat — Politeknik Siber dan Sandi Negara
                  </p>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <GuidanceModal isOpen={isGuidanceOpen} onClose={() => setIsGuidanceOpen(false)} />
      <ProposalModal isOpen={isProposalOpen} onClose={() => setIsProposalOpen(false)} />
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalShell>{children}</PortalShell>
    </AuthProvider>
  );
}
