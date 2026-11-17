'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type RoleType = 'TARUNA' | 'DOSEN_PENGUSUL' | 'REVIEWER' | 'KAPRODI';

const ROLE_OPTIONS = [
  {
    id: 'TARUNA' as RoleType,
    label: 'Taruna',
    sub: 'Pengusul Mahasiswa',
    icon: 'school',
  },
  {
    id: 'DOSEN_PENGUSUL' as RoleType,
    label: 'Dosen',
    sub: 'Pengusul Dosen',
    icon: 'menu_book',
  },
  {
    id: 'REVIEWER' as RoleType,
    label: 'Reviewer',
    sub: 'Penelaah Proposal',
    icon: 'rate_review',
  },
  {
    id: 'KAPRODI' as RoleType,
    label: 'Kaprodi',
    sub: 'Validasi CPL',
    icon: 'verified_user',
  },
];

export default function RegisterForm() {
  const router = useRouter();

  const [roleType, setRoleType] = useState<RoleType>('TARUNA');
  const [nipNpm, setNipNpm] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [gelar, setGelar] = useState('');
  const [prodi, setProdi] = useState('Rekayasa Kriptografi');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Kata sandi minimal harus 8 karakter.');
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
    <div className="min-h-screen flex flex-col justify-between font-sans text-slate-800 antialiased selection:bg-sky-500 selection:text-white relative overflow-x-hidden">
      {/* Fixed Fullscreen Background: Terkunci pada viewport sehingga saat di-scroll ke atas/bawah latar belakang tetap penuh dan tidak menampilkan warna biru polos */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#071933]">
        <img
          src="/images/bg-poltekssn.jpg"
          alt="Latar Belakang Poltek SSN"
          className="w-full h-full object-cover object-right"
        />
        {/* Dynamic Overlay: Pekat di kiri (agar form terbaca jelas), Transparan di kanan (agar bendera Poltek SSN terlihat 100% utuh & tajam) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/35 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-slate-950/15 pointer-events-none" />
      </div>

      {/* Top Header */}
      <header className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-auto">
        <a
          className="inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full bg-[#061E45]/85 backdrop-blur-md border border-white/25 text-white text-xs font-medium hover:bg-[#061E45] transition shadow-md group"
          href="/login"
        >
          <svg
            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <span>Kembali ke Halaman Masuk</span>
        </a>
      </header>

      {/* Main Content: Kartu Form di Kiri agar Bendera Poltek SSN di Kanan Terlihat Bebas */}
      <main className="min-h-screen flex items-center justify-center lg:justify-start lg:pl-16 xl:pl-28 px-4 sm:px-6 py-24 relative z-10">
        <section className="w-full max-w-[500px] bg-white/95 backdrop-blur-md border border-white/80 shadow-[0_20px_50px_rgba(6,30,69,0.35)] rounded-2xl p-6 sm:p-7 transition-all my-auto">
          {/* Card Header */}
          <div className="flex items-center gap-3">
            <img
              alt="Logo Resmi Poltek SSN"
              className="w-11 h-11 object-contain shrink-0 drop-shadow-sm"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5RTdwx26o6DLl9b8fQu2mMbPNtnAPiT9pLP9ikUEFL1tmVBA7im5bww_EfcmudoatKXPeyJywBXCMo6iZ8udjXsvjPUrLpmNMV24AZ11S9ffp-QZLa8MF8UTyhKHyWGgBYlb3UssdEGVz-OKD5nTFnbjOj2HhDVREvSru0YW8XhkIgyfvYwYZNdOavBlcTvo18o_fst4ctKupu9V947UJ1h-CFKMUg95xFQ7hraEWN5s-Yp5Ce0X6zA"
            />
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[#0F172A] leading-tight">Pendaftaran Akun</h2>
              <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase font-mono">
                SIM-PKM POLITEKNIK SIBER DAN SANDI NEGARA
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
            Daftarkan akun sesuai peran tugas Anda di lingkungan Poltek SSN. Peran ini akan menentukan akses menu dan wewenang dasbor Anda.
          </p>

          {/* Alert Sukses */}
          {successMessage && (
            <div className="mt-3.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
              <span>{successMessage} Mengalihkan ke halaman masuk...</span>
            </div>
          )}

          {/* Alert Error */}
          {errorMessage && (
            <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <span className="material-symbols-outlined text-sm text-rose-600">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
            {/* Pilihan Peran Akun (Role Mapping) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 tracking-wider uppercase mb-1.5 font-mono">
                Pilih Peran Akun <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoleType(opt.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all cursor-pointer ${
                      roleType === opt.id
                        ? 'bg-[#0F172A] text-white shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px] mb-0.5">
                      {opt.icon}
                    </span>
                    <span className="text-[11px] leading-tight">{opt.label}</span>
                    <span className={`text-[9px] mt-0.5 ${roleType === opt.id ? 'text-slate-300' : 'text-slate-400'}`}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid 1: NIP/NPM & Nama Lengkap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  {isTaruna ? 'NPM (Nomor Pokok Mahasiswa)' : 'NIP (Nomor Induk Pegawai)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isTaruna ? 'Contoh: 2120014' : 'Contoh: 198503152010121001'}
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500 font-mono"
                  value={nipNpm}
                  onChange={(e) => setNipNpm(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                />
              </div>
            </div>

            {/* Grid 2: Gelar (Khusus Dosen/Reviewer/Kaprodi) atau Kelas (Khusus Taruna) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {isTaruna ? (
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                    Tingkat / Kelas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Tingkat IV / K-41"
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                    Gelar Akademik
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: S.ST., M.Kom., Ph.D."
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500"
                    value={gelar}
                    onChange={(e) => setGelar(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  {roleType === 'KAPRODI'
                    ? 'Prodi yang Dipimpin'
                    : 'Program Studi'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500"
                  value={prodi}
                  onChange={(e) => setProdi(e.target.value)}
                >
                  <option value="Rekayasa Kriptografi">Rekayasa Kriptografi</option>
                  <option value="Rekayasa Perangkat Keras Kriptografi">
                    Rekayasa Perangkat Keras Kriptografi
                  </option>
                  <option value="Rekayasa Keamanan Siber">Rekayasa Keamanan Siber</option>
                </select>
              </div>
            </div>

            {/* Kelompok Keilmuan / Bidang Keahlian (Bila bukan Taruna) */}
            {!isTaruna && (
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  {roleType === 'REVIEWER'
                    ? 'Bidang Keahlian / Kepakaran Review'
                    : 'Kelompok Keilmuan'}
                </label>
                <input
                  type="text"
                  placeholder={
                    roleType === 'REVIEWER'
                      ? 'Contoh: Kriptografi Kuantum, Forensik Siber'
                      : 'Contoh: Kriptografi Terapan'
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500"
                  value={kelompokKeilmuan}
                  onChange={(e) => setKelompokKeilmuan(e.target.value)}
                />
              </div>
            )}

            {/* Grid 3: Email Dinas & No HP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  Email Dinas (@poltekssn.ac.id) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nama@poltekssn.ac.id"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500 font-mono"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  Nomor HP (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500 font-mono"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                />
              </div>
            </div>

            {/* Grid 4: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 8 karakter"
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 pl-3 pr-8 bg-white focus:border-sky-500 focus:ring-sky-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ulangi kata sandi"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-sky-500 focus:ring-sky-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    <span>
                      Daftar sebagai{' '}
                      {roleType === 'TARUNA'
                        ? 'Taruna Pengusul'
                        : roleType === 'DOSEN_PENGUSUL'
                        ? 'Dosen Pengusul'
                        : roleType === 'REVIEWER'
                        ? 'Penelaah (Reviewer)'
                        : 'Kaprodi'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Card */}
          <footer className="border-t border-slate-100 pt-4 mt-4 flex flex-col items-center gap-1 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
              <span>Sudah memiliki akun?</span>
              <a className="text-sky-600 font-semibold hover:underline" href="/login">
                Masuk ke Portal
              </a>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Politeknik Siber dan Sandi Negara • 2026
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
