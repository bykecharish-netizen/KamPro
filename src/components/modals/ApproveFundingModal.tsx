'use client';

import React, { useState } from 'react';

interface ApproveFundingModalProps {
  isOpen: boolean;
  proposal: {
    id: string;
    judul: string;
    no_agenda: string | null;
    no_registrasi: string | null;
    prodi: string;
    skor_rata_rata: number | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveFundingModal({
  isOpen,
  proposal,
  onClose,
  onSuccess,
}: ApproveFundingModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [catatan, setCatatan] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Konfirmasi kata sandi pimpinan wajib diisi sebagai tanda tangan digital.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/approve-funding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          catatan: catatan.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengesahkan penetapan dana');
      }

      setGeneratedQr(data.qr_code);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    setGeneratedQr(null);
    setPassword('');
    setCatatan('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-emerald-600">verified_user</span>
            <h3 className="text-base font-bold text-slate-900">
              Penetapan &amp; Pengesahan Pendanaan Riset
            </h3>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={handleFinish}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
            <span className="material-symbols-outlined text-sm text-rose-600">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tampilan Bukti QR Code Pengesahan Digital jika sudah berhasil */}
        {generatedQr ? (
          <div className="mt-4 p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <span className="material-symbols-outlined text-2xl">check</span>
            </div>
            <h4 className="text-sm font-bold text-emerald-900">
              Penetapan Pendanaan Berhasil Disahkan!
            </h4>
            <p className="text-xs text-emerald-800">
              Surat Keputusan (SK) Direktur telah diterbitkan dengan tanda pengesahan digital internal berbasis SHA-256 Digest:
            </p>
            <div className="bg-white p-3 rounded-xl border border-emerald-200 inline-block shadow-sm">
              <img
                src={generatedQr}
                alt="QR Pengesahan Direktur"
                className="w-48 h-48 mx-auto"
              />
            </div>
            <p className="text-[10px] font-mono text-slate-500">
              ID Berkas: {proposal.id} • SHA-256 BSrE Verified
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
              >
                Selesai &amp; Tutup
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
            {/* Ringkasan Proposal */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">No. Registrasi:</span>
                <span className="font-bold text-sky-700">{proposal.no_registrasi || proposal.no_agenda}</span>
              </div>
              <div className="mt-1">
                <span className="text-slate-400">Judul Usulan:</span>
                <p className="font-semibold text-slate-800 font-sans text-xs line-clamp-2 mt-0.5">
                  {proposal.judul}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-400">Skor Rata-Rata Penelaah:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {proposal.skor_rata_rata !== null ? `${proposal.skor_rata_rata} / 100` : 'Memenuhi Syarat'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
                Nomor SK / Catatan Kebijakan Pendanaan
              </label>
              <textarea
                rows={2}
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="Contoh: SK Direktur No. 042/PKM/2026 tentang Penetapan Hibah Riset Unggulan..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            {/* Konfirmasi Kata Sandi Direktur (Pengesahan Digital BSrE) */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center space-x-1 text-[11px] font-mono font-bold text-emerald-900 mb-1">
                <span className="material-symbols-outlined text-sm text-emerald-700">lock</span>
                <span>Konfirmasi Kata Sandi Direktur (Tanda Tangan Digital)</span>
              </div>
              <p className="text-[11px] text-emerald-800 mb-2 leading-relaxed">
                Pengesahan ini setara dengan penerbitan Surat Keputusan resmi penetapan pendanaan internal Poltek SSN dan akan dicatat permanen pada riwayat audit log.
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full text-xs rounded-lg border border-emerald-300 py-2 pl-3 pr-10 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
                  placeholder="Masukkan kata sandi akun Direktur..."
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
                onClick={handleFinish}
                type="button"
                disabled={isLoading}
              >
                Batal
              </button>
              <button
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-sm"
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
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <span>Sahkan Penetapan Dana</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
