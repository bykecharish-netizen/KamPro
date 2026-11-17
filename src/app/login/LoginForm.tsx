'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sanitizePlainText } from '@/lib/sanitization';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const nipParam = searchParams.get('nip');
    if (nipParam) {
      setIdentifier(sanitizePlainText(nipParam));
    }
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setErrorMessage(sanitizePlainText(errorParam));
    }
  }, [searchParams]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // OWASP ASVS V2.2.1 Brute-Force lockout
  const [lockoutSecondsRemaining, setLockoutSecondsRemaining] = useState(0);

  // Modal lupa password
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Timer countdown lockout
  useEffect(() => {
    if (lockoutSecondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setLockoutSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutSecondsRemaining]);

  // Client-side quick check: if session already exists, redirect to /dashboard
  useEffect(() => {
    fetch('/api/auth/me', { headers: { 'Cache-Control': 'no-cache' } })
      .then((res) => {
        if (res.ok) {
          router.replace('/dashboard');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutSecondsRemaining > 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // POST ke /api/auth/login via HTTP body JSON (DILARANG via GET / query string)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else if (res.status === 429) {
        // OWASP ASVS V2.2.1 Lockout penanganan
        const waitSec = data.retryAfterSeconds || 60;
        setLockoutSecondsRemaining(waitSec);
        setErrorMessage(
          `Terlalu banyak percobaan gagal. Akun/IP dikunci sementara selama ${waitSec} detik.`
        );
      } else {
        // Uniform error message (Anti-Enumeration ASVS V2.2.2)
        setErrorMessage(data.error || 'NIP/NPM atau kata sandi salah');
      }
    } catch {
      setErrorMessage('Terjadi gangguan jaringan. Silakan coba lagi.');
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
        {/* Dynamic Overlay: Pekat di kiri (agar form login terbaca tajam), Transparan di kanan (agar bendera Poltek SSN terlihat 100% jelas & berkibar) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/35 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-slate-950/15 pointer-events-none" />
      </div>

      {/* Top Navigation Bar */}
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
          <span>SIM-PPM Poltek SSN</span>
        </a>

        <div className="flex items-center gap-2">
          <a
            className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full bg-sky-600/90 hover:bg-sky-500 backdrop-blur-md border border-sky-400/30 text-white text-xs font-semibold shadow-md transition"
            href="/register"
          >
            <span className="material-symbols-outlined text-[15px]">person_add</span>
            <span>Registrasi Akun</span>
          </a>
        </div>
      </header>

      {/* Main Content: Kartu Login di Kiri agar Bendera Poltek SSN di Kanan Terlihat Sangat Jelas */}
      <main className="min-h-screen flex items-center justify-center lg:justify-start lg:pl-16 xl:pl-28 px-4 sm:px-6 py-20 relative z-10">
        <section className="w-full max-w-[430px] bg-white/95 backdrop-blur-md border border-white/80 shadow-[0_20px_50px_rgba(6,30,69,0.35)] rounded-2xl p-7 sm:p-8 transition-all my-auto">
          {/* Card Header: Official Emblem & Institution Title */}
          <div className="flex items-center gap-3">
            <img
              alt="Logo Resmi Poltek SSN"
              className="w-11 h-11 object-contain shrink-0 drop-shadow-sm"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5RTdwx26o6DLl9b8fQu2mMbPNtnAPiT9pLP9ikUEFL1tmVBA7im5bww_EfcmudoatKXPeyJywBXCMo6iZ8udjXsvjPUrLpmNMV24AZ11S9ffp-QZLa8MF8UTyhKHyWGgBYlb3UssdEGVz-OKD5nTFnbjOj2HhDVREvSru0YW8XhkIgyfvYwYZNdOavBlcTvo18o_fst4ctKupu9V947UJ1h-CFKMUg95xFQ7hraEWN5s-Yp5Ce0X6zA"
            />
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[#0F172A] leading-tight">SIM-PKM</h2>
              <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase font-mono">
                POLITEKNIK SIBER DAN SANDI NEGARA
              </p>
            </div>
          </div>

          {/* Header Title & Subtitle */}
          <h1 className="text-2xl font-bold text-slate-900 mt-4 mb-0.5 tracking-tight">
            Masuk ke Portal
          </h1>
          <p className="text-xs text-slate-500 mb-6">
            Masukkan NIP atau NPM dan kata sandi untuk mengakses sistem PKM
          </p>

          {/* Unified Error Banner (OWASP ASVS V2.2.2 Anti-Enumeration) */}
          {errorMessage && (
            <div
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in"
              id="errorAlert"
              role="alert"
            >
              <svg
                className="w-4 h-4 shrink-0 text-red-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <span className="leading-relaxed" id="errorMessage">
                {errorMessage}
              </span>
            </div>
          )}

          {/* Lockout Alert Banner (OWASP ASVS V2.2.1 Brute-Force Rate Limiting) */}
          {lockoutSecondsRemaining > 0 && (
            <div
              className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800"
              id="lockoutAlert"
              role="alert"
            >
              <svg
                className="w-4 h-4 shrink-0 text-amber-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <span className="leading-relaxed" id="lockoutMessage">
                Terlalu banyak percobaan masuk. Silakan tunggu{' '}
                <span className="font-mono font-bold" id="lockoutCountdown">
                  {lockoutSecondsRemaining}
                </span>{' '}
                detik sebelum mencoba kembali.
              </span>
            </div>
          )}

          {/* LoginForm */}
          <form className="space-y-4" id="loginForm" onSubmit={handleLoginSubmit}>
            {/* Input Field: NIP / NPM */}
            <div>
              <label
                className="block text-xs font-medium text-slate-700 mb-1.5"
                htmlFor="identifier"
                id="identifierLabel"
              >
                Nomor Induk (NIP / NPM)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <input
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 transition-all font-mono"
                  id="identifier"
                  name="identifier"
                  placeholder="Masukkan NIP atau NPM Anda"
                  required
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={isLoading || lockoutSecondsRemaining > 0}
                />
              </div>
            </div>

            {/* Input Field: Password with toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700" htmlFor="password">
                  Kata Sandi
                </label>
                <button
                  className="text-xs text-sky-600 hover:text-sky-700 font-medium transition-colors cursor-pointer"
                  onClick={() => {
                    setIsForgotModalOpen(true);
                    setForgotSuccess(false);
                  }}
                  type="button"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 pointer-events-none text-slate-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <input
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 transition-all"
                  id="password"
                  name="password"
                  placeholder="••••••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || lockoutSecondsRemaining > 0}
                />
                <button
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      id="eyeOpenIcon"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                      <path
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      id="eyeOffIcon"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Shared-Device Session Hygiene (OWASP ASVS V3.2 & V3.3) */}
            <div className="pt-1">
              <label className="text-xs text-slate-700 flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  className="w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-slate-700">
                    Ingat sesi ini di perangkat ini
                  </span>
                  <span className="text-[11px] text-slate-400 leading-tight mt-0.5">
                    Jangan aktifkan pada komputer laboratorium atau perangkat bersama.
                  </span>
                </div>
              </label>
            </div>

            {/* CTA Submit Button */}
            <button
              className="w-full mt-3 py-3 px-4 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="submitBtn"
              type="submit"
              disabled={isLoading || lockoutSecondsRemaining > 0}
            >
              <span>{isLoading ? 'Memproses...' : 'Masuk ke Portal'}</span>
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </form>

          {/* High-Contrast Card Footer */}
          <footer className="border-t border-slate-100 pt-5 mt-6 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-600">
              <span>Belum memiliki akun?</span>
              <a
                className="text-sky-600 font-semibold hover:underline"
                href="/register"
              >
                Daftar Akun Baru
              </a>
            </div>
            <p className="text-[11px] text-slate-500 font-medium text-center">
              Direktorat PPM Politeknik Siber dan Sandi Negara • 2026
            </p>
            <a className="text-[11px] text-sky-600 hover:underline text-center" href="#">
              Butuh bantuan akun? Hubungi Admin PPM
            </a>
          </footer>
        </section>
      </main>

      {/* Non-Enumerating Password Recovery Modal (OWASP ASVS V2.5) */}
      {isForgotModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          id="forgotModal"
        >
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-white/80 animate-fade-in">
            <button
              aria-label="Tutup dialog"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
              onClick={() => setIsForgotModalOpen(false)}
              type="button"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>

            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Pemulihan Kata Sandi
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Masukkan NIP atau NPM yang terdaftar. Jika akun terdaftar, tautan verifikasi
              pemulihan akan dikirimkan ke email resmi dinas Poltek SSN Anda.
            </p>

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-relaxed mb-4">
                Instruksi pemulihan telah dikirim jika identitas terdaftar dalam sistem.
                Silakan periksa kotak masuk atau folder spam email dinas Anda.
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setForgotSuccess(true);
                }}
              >
                <div>
                  <label
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                    htmlFor="forgotIdentifier"
                  >
                    NIP / NPM Pengguna
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none font-mono"
                    id="forgotIdentifier"
                    placeholder="Contoh: 198503152010121001 atau 2120014"
                    required
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition cursor-pointer"
                    onClick={() => setIsForgotModalOpen(false)}
                    type="button"
                  >
                    Batal
                  </button>
                  <button
                    className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-xl shadow transition cursor-pointer"
                    type="submit"
                  >
                    Kirim Tautan
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
