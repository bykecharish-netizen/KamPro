'use client';

import React, { useState } from 'react';

interface ReviewModalProps {
  isOpen: boolean;
  proposal: {
    id: string;
    judul: string;
    no_agenda: string | null;
    no_registrasi: string | null;
    tahap: string;
    skema: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({
  isOpen,
  proposal,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [scoreKriteria1, setScoreKriteria1] = useState(80); // 30% Keterbaruan & Urgensi
  const [scoreKriteria2, setScoreKriteria2] = useState(85); // 40% Metodologi & Desain
  const [scoreKriteria3, setScoreKriteria3] = useState(80); // 30% Potensi Luaran Sandi/Siber

  const [catatan, setCatatan] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  // Hitung total skor bobot (30% + 40% + 30%)
  const totalScore = Math.round(
    scoreKriteria1 * 0.3 + scoreKriteria2 * 0.4 + scoreKriteria3 * 0.3
  );

  const isBlindReview = proposal.tahap === 'PROPOSAL';

  const handleOpenDocument = async () => {
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/document`);
      const data = await res.json();
      if (data.success && data.document_url) {
        window.open(data.document_url, '_blank');
      } else {
        alert('Tautan dokumen tidak tersedia.');
      }
    } catch {
      alert('Gagal mengambil tautan dokumen.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatan || catatan.trim().length < 5) {
      setErrorMessage('Catatan telaah minimal 5 karakter.');
      return;
    }

    if (isLocking && !password) {
      setErrorMessage(
        'Konfirmasi kata sandi akun wajib diisi untuk mengunci penilaian secara resmi.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/reviews/${proposal.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skor: totalScore,
          catatan: catatan.trim(),
          is_locked: isLocking,
          password: isLocking ? password : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan penilaian');
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
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-sky-600">rate_review</span>
            <h3 className="text-base font-bold text-slate-900">
              Formulir Evaluasi Substansi ({proposal.tahap === 'PROPOSAL' ? 'FO-018' : 'FO-021'})
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

        {/* Indikator Status Blind Review (Double-Blind Review Aktif) */}
        {isBlindReview ? (
          <div className="mt-3 p-3 bg-slate-900 border border-sky-400/40 rounded-xl text-xs font-mono text-cyan-300 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-sky-400 text-lg">visibility_off</span>
              <div>
                <p className="font-bold text-white tracking-wide">DOUBLE-BLIND REVIEW AKTIF (FO-016)</p>
                <p className="text-[11px] text-slate-300">
                  Identitas pengusul, NIP/NPM, dan metadata berkas telah dibersihkan oleh sistem.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenDocument}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-sans font-semibold transition-all shrink-0 flex items-center space-x-1"
            >
              <span className="material-symbols-outlined text-[14px]">file_open</span>
              <span>Buka Dokumen Anonim</span>
            </button>
          </div>
        ) : (
          <div className="mt-3 p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs font-mono text-sky-900 flex items-center justify-between">
            <div>
              <p className="font-bold text-sky-800">TAHAP LAPORAN (FO-023/FO-018)</p>
              <p className="text-[11px] text-sky-700">Identitas pengusul dibuka untuk evaluasi capaian akhir.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenDocument}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-sans font-semibold transition-all shrink-0 flex items-center space-x-1"
            >
              <span className="material-symbols-outlined text-[14px]">file_open</span>
              <span>Buka Berkas</span>
            </button>
          </div>
        )}

        {/* Informasi Proposal */}
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">No. Registrasi / Agenda:</span>
            <span className="font-bold text-sky-700">{proposal.no_registrasi || proposal.no_agenda}</span>
          </div>
          <div className="mt-1">
            <span className="text-slate-400">Judul Usulan:</span>
            <p className="font-semibold text-slate-800 font-sans text-xs line-clamp-2 mt-0.5">
              {proposal.judul}
            </p>
          </div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {/* Rubrik Penilaian FO-018 / FO-021 */}
          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                Rubrik Penilaian Substansi
              </span>
              <span className="text-xs font-mono font-bold text-sky-700 bg-sky-100 px-2.5 py-0.5 rounded-full">
                Skor Akhir: {totalScore} / 100
              </span>
            </div>

            {/* Kriteria 1: 30% */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-medium text-slate-700">
                  1. Keterbaruan, Urgensi &amp; Keaslian Riset Sandi/Siber (30%)
                </label>
                <span className="font-mono font-bold text-slate-800">{scoreKriteria1}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={scoreKriteria1}
                onChange={(e) => setScoreKriteria1(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            {/* Kriteria 2: 40% */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-medium text-slate-700">
                  2. Ketepatan Metodologi, Fuzzing &amp; Roadmap Riset (40%)
                </label>
                <span className="font-mono font-bold text-slate-800">{scoreKriteria2}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={scoreKriteria2}
                onChange={(e) => setScoreKriteria2(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            {/* Kriteria 3: 30% */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-medium text-slate-700">
                  3. Potensi Luaran (Paten, Jurnal Sinta &amp; Dampak Pertahanan) (30%)
                </label>
                <span className="font-mono font-bold text-slate-800">{scoreKriteria3}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={scoreKriteria3}
                onChange={(e) => setScoreKriteria3(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
          </div>

          {/* Catatan Telaah Kritis */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Catatan Telaah &amp; Rekomendasi Substantif <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:border-sky-500 focus:ring-sky-500 bg-white"
              placeholder="Berikan catatan teknis mendalam mengenai kelemahan protokol, pengujian side-channel, atau penguatan teorema..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>

          {/* Pilihan: Simpan Sementara vs Kunci Permanen */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="lock-check"
                checked={isLocking}
                onChange={(e) => setIsLocking(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <label htmlFor="lock-check" className="text-xs font-mono font-bold text-slate-800">
                Kunci &amp; Sahkan Penilaian Resmi (is_locked = true)
              </label>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pl-5">
              Penilaian yang telah dikunci tidak dapat diubah kembali. Skor rata-rata akan otomatis direkapitulasi setelah dewan reviewer lainnya menyelesaikan penguncian.
            </p>

            {/* Konfirmasi Kata Sandi jika Kunci Dipilih */}
            {isLocking && (
              <div className="mt-2 pt-2 border-t border-slate-200 pl-5">
                <label className="block text-[11px] font-mono font-medium text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Akun Penelaah:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={isLocking}
                    className="w-full text-xs rounded-lg border border-slate-300 py-2 pl-3 pr-10 bg-white focus:border-sky-500 focus:ring-sky-500"
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
            )}
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
                isLocking
                  ? 'bg-slate-900 hover:bg-slate-800'
                  : 'bg-sky-600 hover:bg-sky-500'
              }`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">
                    {isLocking ? 'lock' : 'save'}
                  </span>
                  <span>{isLocking ? 'Kunci & Sahkan Nilai' : 'Simpan Draft'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
