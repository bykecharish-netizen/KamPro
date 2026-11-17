'use client';

import React, { useState } from 'react';

interface ValidateCplModalProps {
  isOpen: boolean;
  proposal: {
    id: string;
    judul: string;
    no_agenda: string | null;
    no_registrasi: string | null;
    prodi: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ValidateCplModal({
  isOpen,
  proposal,
  onClose,
  onSuccess,
}: ValidateCplModalProps) {
  const [isApproved, setIsApproved] = useState(true);
  const [catatan, setCatatan] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Konfirmasi kata sandi wajib diisi sebagai tanda tangan digital internal.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/validate-cpl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          is_approved: isApproved,
          catatan: catatan.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses validasi CPL');
      }

      onClose();
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-emerald-600">verified</span>
            <h3 className="text-base font-bold text-slate-900">
              Validasi Kesesuaian CPL Prodi
            </h3>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm text-rose-600">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Informasi Proposal */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
          <p className="text-slate-400">ID / No. Agenda:</p>
          <p className="font-bold text-sky-700">{proposal.no_registrasi || proposal.no_agenda || proposal.id}</p>
          <p className="text-slate-400 mt-1">Judul Usulan:</p>
          <p className="font-semibold text-slate-800 font-sans text-xs line-clamp-2">{proposal.judul}</p>
          <p className="text-slate-400 mt-1">Program Studi:</p>
          <p className="font-bold text-slate-700">{proposal.prodi}</p>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          {/* Pilihan Keputusan */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1.5">
              Keputusan Validasi CPL
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsApproved(true)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  isApproved
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                <span>Setujui CPL</span>
              </button>
              <button
                type="button"
                onClick={() => setIsApproved(false)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                  !isApproved
                    ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm text-amber-600">published_with_changes</span>
                <span>Minta Revisi</span>
              </button>
            </div>
          </div>

          {/* Catatan Validasi */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Catatan Kesesuaian CPL &amp; Rekomendasi
            </label>
            <textarea
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
              placeholder="Catatan telaah kurikulum, ketercapaian capaian pembelajaran lulusan, atau masukan substansi..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>

          {/* Konfirmasi Kata Sandi (Tanda Tangan Digital Internal OWASP ASVS) */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center space-x-1 text-[11px] font-mono font-bold text-amber-900 mb-1">
              <span className="material-symbols-outlined text-sm text-amber-700">enhanced_encryption</span>
              <span>Pengesahan Digital Internal (Konfirmasi Kata Sandi)</span>
            </div>
            <p className="text-[11px] text-amber-800 mb-2 leading-relaxed">
              Sesuai ketentuan Perdir Poltek SSN No. 1/2025, pengesahan CPL memerlukan otentikasi ulang kata sandi pengguna sebagai tanda tangan digital internal resmi yang dicatat pada audit log.
            </p>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full text-xs rounded-lg border border-amber-300 py-2 pl-3 pr-10 focus:border-amber-500 focus:ring-amber-500 bg-white"
                placeholder="Masukkan kata sandi akun Anda..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
              type="button"
              disabled={isLoading}
            >
              Batal
            </button>
            <button
              className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-colors ${
                isApproved
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengesahkan...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>{isApproved ? 'Sahkan Validasi CPL' : 'Kembalikan untuk Revisi'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
