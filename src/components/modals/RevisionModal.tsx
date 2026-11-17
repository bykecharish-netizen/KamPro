'use client';

import React, { useState } from 'react';

interface RevisionModalProps {
  isOpen: boolean;
  proposal: {
    id: string;
    judul: string;
    no_agenda: string | null;
    no_registrasi: string | null;
    skor_rata_rata: number | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RevisionModal({
  isOpen,
  proposal,
  onClose,
  onSuccess,
}: RevisionModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !proposal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Berkas perbaikan proposal format .PDF wajib diunggah.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Format berkas harus berupa dokumen .PDF yang sah.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('catatan_revisi', catatanRevisi.trim());

      const res = await fetch(`/api/proposals/${proposal.id}/revision`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah berkas revisi');
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
            <span className="material-symbols-outlined text-amber-600">upload_file</span>
            <h3 className="text-base font-bold text-slate-900">
              Unggah Berkas Revisi Usulan (Skor &lt; 60)
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

        {/* Informasi Proposal & Skor */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ID / Registrasi:</span>
            <span className="font-bold text-sky-700">
              {proposal.no_registrasi || proposal.no_agenda || proposal.id}
            </span>
          </div>
          <div className="mt-1">
            <span className="text-slate-500">Judul:</span>
            <p className="font-semibold text-slate-800 font-sans text-xs line-clamp-2 mt-0.5">
              {proposal.judul}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">Skor Rata-Rata Evaluasi:</span>
            <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              {proposal.skor_rata_rata !== null ? `${proposal.skor_rata_rata} / 100` : 'Di bawah batas minimum (< 60)'}
            </span>
          </div>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Catatan Perubahan / Tanggapan Revisi
            </label>
            <textarea
              rows={3}
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:border-amber-500 focus:ring-amber-500 bg-white"
              placeholder="Jelaskan ringkasan perbaikan bab atau metodologi yang telah disempurnakan..."
              value={catatanRevisi}
              onChange={(e) => setCatatanRevisi(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Berkas Dokumen Revisi (.PDF maks 10MB)
            </label>
            <input
              accept=".pdf,application/pdf"
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
              required
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
            />
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
              className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengunggah...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  <span>Unggah Berkas Revisi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
