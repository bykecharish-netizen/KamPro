'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/layout/AuthContext';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UserOption {
  id: string;
  nip_npm: string;
  nama_lengkap: string;
  gelar: string | null;
  prodi: string | null;
  roles: string[];
}

export default function ProposalModal({ isOpen, onClose, onSuccess }: ProposalModalProps) {
  const { user } = useAuth();

  const [scheme, setScheme] = useState('PKM-KC');
  const [title, setTitle] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberRole, setMemberRole] = useState('Anggota Tim');
  const [file, setFile] = useState<File | null>(null);

  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ambil daftar pengguna untuk pencarian anggota tim
  useEffect(() => {
    if (isOpen) {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            // Saring agar ketua tidak memilih dirinya sendiri
            setAvailableUsers(data.data.filter((u: UserOption) => u.id !== user?.id));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Judul proposal wajib diisi.');
      return;
    }

    if (!file) {
      setErrorMessage('Berkas draft proposal PDF wajib diunggah.');
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
      formData.append('judul', title.trim());
      formData.append('skema', scheme);
      formData.append('file', file);

      if (selectedMemberId) {
        const anggotaArray = [
          {
            user_id: selectedMemberId,
            peran_tim: memberRole,
          },
        ];
        formData.append('anggota', JSON.stringify(anggotaArray));
      }

      const res = await fetch('/api/proposals', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan proposal');
      }

      // Berhasil
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      id="proposal-modal"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-sky-600">note_add</span>
            <h3 className="text-base font-bold text-slate-900">Formulir Pengajuan Usulan PKM Baru</h3>
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

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          {/* Identitas Ketua Auto-Fill Sesi Server (Read-Only) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">
                Ketua Pengusul (Otomatis dari Sesi Server)
              </span>
              <span className="text-[10px] font-mono bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                Read-Only
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700">
              <div>
                <span className="text-slate-400">Nama:</span>{' '}
                <strong>
                  {user?.nama_lengkap}
                  {user?.gelar ? `, ${user.gelar}` : ''}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">NIP/NPM:</span>{' '}
                <strong>{user?.nip_npm}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Program Studi:</span>{' '}
                <strong>{user?.prodi || 'Rekayasa Kriptografi'}</strong>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Skema PKM / Penelitian
            </label>
            <select
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white"
              id="modal-scheme"
              value={scheme}
              onChange={(e) => setScheme(e.target.value)}
            >
              <option value="PKM-KC">PKM-KC (Karsa Cipta - Lab Kriptografi)</option>
              <option value="PKM-RE">PKM-RE (Riset Eksakta - Lab Siber)</option>
              <option value="PKM-PI">PKM-PI (Penerapan Iptek - Keamanan Desa)</option>
              <option value="PKM-K">PKM-K (Kewirausahaan Siber)</option>
              <option value="PDP">PDP (Penelitian Dosen Pemula - Lanjutan)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Judul Usulan Proposal
            </label>
            <input
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 focus:border-sky-500 focus:ring-sky-500 bg-white"
              id="modal-title"
              placeholder="Contoh: Rancang Bangun Enkripsi Homomorfik pada Database Medis..."
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Pilih Anggota Tim / Pembimbing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
                Anggota Tim / Pembimbing (Pilih via NIP/NPM)
              </label>
              <select
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                <option value="">-- Pilih Anggota Tim (Opsional) --</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nip_npm} - {u.nama_lengkap} {u.gelar ? `(${u.gelar})` : ''} [{u.roles.join(', ')}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
                Peran dalam Tim
              </label>
              <select
                className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white"
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
              >
                <option value="Anggota Taruna">Anggota Taruna</option>
                <option value="Dosen Pembimbing">Dosen Pembimbing</option>
                <option value="Anggota Dosen">Anggota Dosen</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Berkas Draft Proposal (.PDF maks 10MB)
            </label>
            <input
              accept=".pdf,application/pdf"
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
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
              className="px-4 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
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
                  <span>Ajukan Proposal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
