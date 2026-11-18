'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

type RoleType = 'TARUNA' | 'DOSEN_PENGUSUL' | 'REVIEWER' | 'KAPRODI';

const ROLE_OPTIONS: Array<{
  id: RoleType;
  label: string;
  sub: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'TARUNA',
    label: 'Taruna',
    sub: 'Pengusul',
    Icon: GraduationCap,
  },
  {
    id: 'DOSEN_PENGUSUL',
    label: 'Dosen',
    sub: 'Pengusul',
    Icon: BookOpen,
  },
  {
    id: 'REVIEWER',
    label: 'Reviewer',
    sub: 'Penelaah',
    Icon: ClipboardCheck,
  },
  {
    id: 'KAPRODI',
    label: 'Kaprodi',
    sub: 'Validasi',
    Icon: ShieldCheck,
  },
];

const inputBaseClass =
  'w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#0284C7] focus:ring-2 focus:ring-sky-100 focus:outline-none transition-all';

export default function RegisterForm() {
  const router = useRouter();

  const [roleType, setRoleType] = useState<RoleType>('TARUNA');
  const [nipNpm, setNipNpm] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [gelar, setGelar] = useState('');
  const [prodi, setProdi] = useState('Rekayasa Keamanan Siber');
  const [kelompokKeilmuan, setKelompokKeilmuan] = useState('');
  const [kelas, setKelas] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isTaruna = roleType === 'TARUNA';
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordTooShort = password.length > 0 && password.length < 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setErrorMessage('Kata sandi minimal harus 8 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_type: roleType,
          nip_npm: nipNpm.trim(),
          nama_lengkap: namaLengkap.trim(),
          gelar: !isTaruna && gelar.trim() ? gelar.trim() : undefined,
          prodi,
          kelompok_keilmuan: !isTaruna && kelompokKeilmuan.trim() ? kelompokKeilmuan.trim() : undefined,
          kelas: isTaruna && kelas.trim() ? kelas.trim() : undefined,
          email: email.trim(),
          no_hp: noHp.trim() || undefined,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan registrasi');
      }

      setSuccessMessage(data.message || 'Registrasi akun berhasil!');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-900 relative overflow-x-hidden">
      {/* Fixed Fullscreen Background: Tetap penuh saat di-scroll, bendera Poltek SSN jelas di sisi kanan */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#071933]">
        <img
          src="/images/bg-poltekssn.jpeg"
          alt="Latar Belakang Poltek SSN"
          className="w-full h-full object-cover object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#061E45]/85 via-slate-900/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-slate-950/10 pointer-events-none" />
      </div>

      {/* Top Navigation */}
      <header className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full bg-[#061E45]/80 backdrop-blur-md border border-white/25 text-white text-xs font-medium hover:bg-[#061E45] transition shadow-md group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </header>

      {/* Main Form Container: Anchored left on desktop so Poltek SSN flag on the right remains unobstructed */}
      <main className="min-h-screen flex items-center justify-center lg:justify-start lg:pl-14 xl:pl-24 px-4 sm:px-6 py-24 relative z-10">
        <section className="w-full max-w-[560px] bg-white/97 backdrop-blur-xl border border-white/80 shadow-[0_24px_60px_rgba(6,30,69,0.32)] rounded-2xl overflow-hidden my-auto">
          {/* Thin Institutional Top Accent */}
          <div className="h-[3px] w-full bg-gradient-to-r from-[#061E45] via-[#0284C7] to-[#F59E0B]" />

          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100">
              <img
                src="/images/logo-poltekssn.png"
                alt="Logo Resmi Poltek SSN"
                className="w-11 h-11 object-contain shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight leading-tight">
                  Pendaftaran Akun Baru
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  SIM-PKM Politeknik Siber dan Sandi Negara
                </p>
              </div>
            </div>

            {/* Alert Sukses */}
            {successMessage && (
              <div
                role="status"
                className="mt-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage} Mengalihkan ke halaman masuk...</span>
              </div>
            )}

            {/* Alert Error */}
            {errorMessage && (
              <div
                role="alert"
                className="mt-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
              {/* Pilihan Peran */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Kategori Pengguna <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/70">
                  {ROLE_OPTIONS.map(({ id, label, sub, Icon }) => {
                    const active = roleType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRoleType(id)}
                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                          active
                            ? 'bg-[#0F172A] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white/80 hover:text-[#0F172A]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 mb-1 ${active ? 'text-sky-400' : 'text-slate-400'}`}
                        />
                        <span className="text-xs font-semibold leading-none">{label}</span>
                        <span
                          className={`text-[10px] mt-1 leading-none ${
                            active ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bagian 1: Identitas Akademik */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#0284C7]">01</span>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Identitas Akademik
                  </h2>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-nip-npm"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {isTaruna ? 'NPM' : 'NIP'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-nip-npm"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder={isTaruna ? 'Contoh: 2423102007' : 'Contoh: 198503152010121001'}
                      className={`${inputBaseClass} font-mono`}
                      value={nipNpm}
                      onChange={(e) => setNipNpm(e.target.value)}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-nama"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-nama"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Sesuai data akademik"
                      className={inputBaseClass}
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-prodi"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {roleType === 'KAPRODI' ? 'Prodi yang Dipimpin' : 'Program Studi'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="reg-prodi"
                      required
                      className={`${inputBaseClass} cursor-pointer`}
                      value={prodi}
                      onChange={(e) => setProdi(e.target.value)}
                    >
                      <option value="Rekayasa Keamanan Siber">Rekayasa Keamanan Siber</option>
                      <option value="Rekayasa Kriptografi">Rekayasa Kriptografi</option>
                      <option value="Rekayasa Perangkat Keras Kriptografi">
                        Rekayasa Perangkat Keras Kriptografi
                      </option>
                    </select>
                  </div>

                  {isTaruna ? (
                    <div>
                      <label
                        htmlFor="reg-kelas"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Tingkat / Kelas{' '}
                        <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        id="reg-kelas"
                        type="text"
                        placeholder="Contoh: Tingkat III / K-42"
                        className={inputBaseClass}
                        value={kelas}
                        onChange={(e) => setKelas(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="reg-gelar"
                        className="block text-xs font-medium text-slate-700 mb-1.5"
                      >
                        Gelar Akademik{' '}
                        <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        id="reg-gelar"
                        type="text"
                        placeholder="Contoh: S.ST., M.Kom."
                        className={inputBaseClass}
                        value={gelar}
                        onChange={(e) => setGelar(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {!isTaruna && (
                  <div>
                    <label
                      htmlFor="reg-keilmuan"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      {roleType === 'REVIEWER' ? 'Bidang Kepakaran Review' : 'Kelompok Keilmuan'}{' '}
                      <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      id="reg-keilmuan"
                      type="text"
                      placeholder={
                        roleType === 'REVIEWER'
                          ? 'Contoh: Kriptografi Terapan, Forensik Siber'
                          : 'Contoh: Keamanan Jaringan & Sistem'
                      }
                      className={inputBaseClass}
                      value={kelompokKeilmuan}
                      onChange={(e) => setKelompokKeilmuan(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Bagian 2: Kontak */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#0284C7]">02</span>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Kontak Resmi
                  </h2>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Email Dinas <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="nama@poltekssn.ac.id"
                      className={inputBaseClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-hp"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      No. WhatsApp{' '}
                      <span className="text-slate-400 font-normal">(Opsional)</span>
                    </label>
                    <input
                      id="reg-hp"
                      type="tel"
                      autoComplete="tel"
                      placeholder="081234567890"
                      className={`${inputBaseClass} font-mono`}
                      value={noHp}
                      onChange={(e) => setNoHp(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 3: Kata Sandi */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#0284C7]">03</span>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Kata Sandi Akun
                  </h2>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Kata Sandi <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        placeholder="Minimal 8 karakter"
                        className={`${inputBaseClass} pr-10`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-confirm-password"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Konfirmasi Sandi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="reg-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Ulangi kata sandi"
                      className={`${inputBaseClass} ${
                        passwordsMismatch
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                          : ''
                      }`}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Inline Helper Text */}
                <p
                  className={`text-[11px] leading-relaxed ${
                    passwordsMismatch || passwordTooShort ? 'text-rose-600' : 'text-slate-400'
                  }`}
                >
                  {passwordsMismatch
                    ? 'Konfirmasi kata sandi belum sama dengan kata sandi di atas.'
                    : passwordTooShort
                    ? 'Gunakan minimal 8 karakter agar kata sandi memenuhi ketentuan.'
                    : 'Gunakan kombinasi huruf, angka, dan simbol minimal 8 karakter (tidak sama dengan NPM/NIP).'}
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 px-4 bg-[#0F172A] hover:bg-[#0284C7] text-white font-semibold text-sm rounded-xl shadow-sm transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mendaftarkan Akun...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>
                        Daftar sebagai{' '}
                        {roleType === 'TARUNA'
                          ? 'Taruna'
                          : roleType === 'DOSEN_PENGUSUL'
                          ? 'Dosen Pengusul'
                          : roleType === 'REVIEWER'
                          ? 'Reviewer'
                          : 'Kaprodi'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <footer className="border-t border-slate-100 pt-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
              <div>
                Sudah memiliki akun?{' '}
                <Link href="/login" className="text-[#0284C7] font-semibold hover:underline">
                  Masuk ke Portal
                </Link>
              </div>
              <span className="text-[11px] text-slate-400">Unit PPM • Poltek SSN 2026</span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
