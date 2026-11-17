'use client';

import React, { useState, useEffect } from 'react';

interface ReviewerOption {
  id: string;
  nip_npm: string;
  nama_lengkap: string;
  gelar: string | null;
  prodi: string | null;
  kelompok_keilmuan: string | null;
}

interface AssignReviewersModalProps {
  isOpen: boolean;
  proposal: {
    id: string;
    judul: string;
    no_agenda: string | null;
    no_registrasi: string | null;
    ketua?: {
      id?: string;
      nama_lengkap: string;
    } | null;
    members?: Array<{
      user_id?: string;
      peran_tim: string;
      user?: {
        nama_lengkap: string;
      };
    }>;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignReviewersModal({
  isOpen,
  proposal,
  onClose,
  onSuccess,
}: AssignReviewersModalProps) {
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([]);
  const [slot1, setSlot1] = useState('');
  const [slot2, setSlot2] = useState('');
  const [slot3, setSlot3] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ambil daftar seluruh reviewer terdaftar
  useEffect(() => {
    if (isOpen) {
      fetch('/api/users?role=REVIEWER')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setReviewers(data.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !proposal) return null;

  // Kumpulan ID yang memiliki konflik kepentingan (Ketua & Anggota)
  const conflictUserIds = new Set<string>();
  if (proposal.ketua?.id) {
    conflictUserIds.add(proposal.ketua.id);
  }
  if (proposal.members) {
    proposal.members.forEach((m) => {
      if (m.user_id) conflictUserIds.add(m.user_id);
    });
  }

  const isCoiConflicted = (reviewerId: string) => {
    return conflictUserIds.has(reviewerId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const assignments: Array<{ reviewer_id: string; reviewer_slot: number }> = [];
    if (slot1) assignments.push({ reviewer_id: slot1, reviewer_slot: 1 });
    if (slot2) assignments.push({ reviewer_id: slot2, reviewer_slot: 2 });
    if (slot3) assignments.push({ reviewer_id: slot3, reviewer_slot: 3 });

    if (assignments.length === 0) {
      setErrorMessage('Minimal 1 orang penelaah (Slot 1) harus dipilih.');
      return;
    }

    // Validasi duplikasi slot di sisi klien
    const ids = assignments.map((a) => a.reviewer_id);
    if (new Set(ids).size !== ids.length) {
      setErrorMessage('Penelaah yang sama tidak boleh ditugaskan pada lebih dari satu slot.');
      return;
    }

    // Validasi COI di sisi klien
    for (const a of assignments) {
      if (isCoiConflicted(a.reviewer_id)) {
        setErrorMessage('Salah satu penelaah yang dipilih terdaftar sebagai Ketua/Anggota pada berkas ini (Konflik Kepentingan).');
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.id}/assign-reviewers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignments }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menugaskan penelaah');
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
            <span className="material-symbols-outlined text-sky-600">group_add</span>
            <h3 className="text-base font-bold text-slate-900">
              Penunjukan Penelaah (Slot 1–3) Bebas COI
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

        {/* Informasi Proposal & Tim Pengusul */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">No. Registrasi / Agenda:</span>
            <span className="font-bold text-sky-700">{proposal.no_registrasi || proposal.no_agenda}</span>
          </div>
          <div className="mt-1">
            <span className="text-slate-400">Judul:</span>
            <p className="font-semibold text-slate-800 font-sans text-xs line-clamp-2 mt-0.5">
              {proposal.judul}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            <span>Tim Pengusul: </span>
            <strong className="text-slate-700">
              {proposal.ketua?.nama_lengkap || 'Ketua'}
              {proposal.members && proposal.members.length > 0
                ? `, ${proposal.members.map((m) => m.user?.nama_lengkap).filter(Boolean).join(', ')}`
                : ''}
            </strong>
          </div>
        </div>

        {/* Banner Anti-COI Guard */}
        <div className="mt-3 p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start space-x-2 text-[11px] font-mono text-blue-900">
          <span className="material-symbols-outlined text-blue-600 text-sm mt-0.5">shield</span>
          <span>
            Sistem otomatis memblokir penunjukan penelaah jika tercatat sebagai Ketua atau Anggota Tim (coiGuard ASVS Level 1).
          </span>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          {/* Slot 1 (Wajib) */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Penelaah Slot 1 <span className="text-rose-500">*</span>
            </label>
            <select
              required
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white"
              value={slot1}
              onChange={(e) => setSlot1(e.target.value)}
            >
              <option value="">-- Pilih Penelaah Slot 1 --</option>
              {reviewers.map((r) => {
                const conflicted = isCoiConflicted(r.id);
                return (
                  <option key={`slot1-${r.id}`} value={r.id} disabled={conflicted}>
                    {r.nama_lengkap} {r.gelar ? `(${r.gelar})` : ''} — {r.kelompok_keilmuan || r.prodi}{' '}
                    {conflicted ? '⛔ [KONFLIK KEPENTINGAN]' : ''}
                  </option>
                );
              })}
            </select>
            {slot1 && isCoiConflicted(slot1) && (
              <p className="text-[11px] text-rose-600 mt-1 font-mono">
                ⛔ Terdeteksi Konflik Kepentingan: Penelaah tercatat di tim pengusul!
              </p>
            )}
          </div>

          {/* Slot 2 */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Penelaah Slot 2 (Opsional)
            </label>
            <select
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white"
              value={slot2}
              onChange={(e) => setSlot2(e.target.value)}
            >
              <option value="">-- Pilih Penelaah Slot 2 --</option>
              {reviewers.map((r) => {
                const conflicted = isCoiConflicted(r.id);
                return (
                  <option key={`slot2-${r.id}`} value={r.id} disabled={conflicted || r.id === slot1}>
                    {r.nama_lengkap} {r.gelar ? `(${r.gelar})` : ''} — {r.kelompok_keilmuan || r.prodi}{' '}
                    {conflicted ? '⛔ [KONFLIK KEPENTINGAN]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Slot 3 */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
              Penelaah Slot 3 (Opsional)
            </label>
            <select
              className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white"
              value={slot3}
              onChange={(e) => setSlot3(e.target.value)}
            >
              <option value="">-- Pilih Penelaah Slot 3 --</option>
              {reviewers.map((r) => {
                const conflicted = isCoiConflicted(r.id);
                return (
                  <option
                    key={`slot3-${r.id}`}
                    value={r.id}
                    disabled={conflicted || r.id === slot1 || r.id === slot2}
                  >
                    {r.nama_lengkap} {r.gelar ? `(${r.gelar})` : ''} — {r.kelompok_keilmuan || r.prodi}{' '}
                    {conflicted ? '⛔ [KONFLIK KEPENTINGAN]' : ''}
                  </option>
                );
              })}
            </select>
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
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">assignment_ind</span>
                  <span>Tugaskan Penelaah</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
