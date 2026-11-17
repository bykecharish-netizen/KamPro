'use client';

import React, { useState } from 'react';

interface BypassModalProps {
  isOpen: boolean;
  proposal?: {
    id: string;
    judul: string;
    no_agenda: string | null;
    no_registrasi: string | null;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BypassModal({
  isOpen,
  proposal,
  onClose,
  onSuccess,
}: BypassModalProps) {
  const [alasanBypass, setAlasanBypass] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newScheme, setNewScheme] = useState('Penelitian Strategis Pertahanan Siber');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isBypassingExisting = Boolean(proposal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasanBypass.trim() || alasanBypass.trim().length < 10) {
      setErrorMessage(
        'Alasan kebijakan bypass wajib diisi minimal 10 karakter untuk pertanggungjawaban audit log.'
      );
      return;
    }

    if (!isBypassingExisting && (!newTitle.trim() || newTitle.trim().length < 5)) {
      setErrorMessage('Judul usulan penugasan strategis minimal 5 karakter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload: any = {
        alasan_bypass: alasanBypass.trim(),
      };

      if (isBypassingExisting && proposal) {
        payload.proposal_id = proposal.id;
      } else {
        payload.judul = newTitle.trim();
        payload.skema = newScheme;
      }

      const res = await fetch('/api/proposals/bypass-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengeksekusi penugasan langsung');
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
            <span className="material-symbols-outlined text-amber-600">bolt</span>
            <h3 className="text-base font-bold text-slate-900">
              Penugasan Langsung (Bypass Top-Down Direktur)
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

        {/* Peringatan Kebijakan & Audit Log */}
        <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs text-amber-900 font-mono">
          <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">warning</span>
          <p className="leading-relaxed">
            Fitur Bypass mengecualikan proposal dari tahapan telaah normal dan langsung menetapkannya sebagai riset strategis yang didanai. Alasan tertulis dicatat permanen pada Audit Log.
          </p>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          {isBypassingExisting && proposal ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
              <span className="text-slate-400">Berkas Target Bypass:</span>
              <p className="font-bold text-sky-700 mt-0.5">
                {proposal.no_registrasi || proposal.no_agenda}
              </p>
              <p className="font-semibold text-slate-800 font-sans text-xs line-clamp-2 mt-1">
                {proposal.judul}
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
                  Judul Riset Strategis Top-Down <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:border-amber-500 focus:ring-amber-500"
                  placeholder="Contoh: Operasi Pengamanan Kriptografi Pasca-Kuantum pada Infrastruktur Kritis Nasional..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
                  Kategori Skema Strategis
                </label>
                <input
                  type="text"
                  className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-slate-50 text-slate-700"
                  value={newScheme}
                  onChange={(e) => setNewScheme(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Alasan Kebijakan Bypass Wajib */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Alasan Kebijakan Penugasan Langsung <span className="text-rose-500">* (Min. 10 Karakter)</span>
            </label>
            <textarea
              required
              rows={3}
              className="w-full text-xs rounded-lg border border-amber-300 py-2 px-3 bg-white focus:border-amber-500 focus:ring-amber-500"
              placeholder="Contoh: Mandat percepatan riset pertahanan siber sesuai arahan pimpinan BSSN untuk pengujian kerentanan nasional..."
              value={alasanBypass}
              onChange={(e) => setAlasanBypass(e.target.value)}
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
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-sm"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengeksekusi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  <span>Eksekusi Bypass</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
