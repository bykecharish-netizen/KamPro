'use client';

import React from 'react';

interface GuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuidanceModal({ isOpen, onClose }: GuidanceModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
      id="guidance-modal"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-sky-600">menu_book</span>
            <h3 className="text-base font-bold text-slate-900">
              Pedoman &amp; Dokumen Resmi PKM 2026
            </h3>
          </div>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Buku Panduan Teknis PKM Internal Poltek SSN 2026
              </h4>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                PDF • 3.4 MB • Rev. 1.2 Terverifikasi PPM
              </p>
            </div>
            <button
              className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-500 transition-colors flex items-center space-x-1"
              onClick={() => {
                alert('Mengunduh Buku Panduan Teknis PKM Internal Poltek SSN 2026...');
                onClose();
              }}
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Unduh</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Format Lembar Pengesahan Resmi (Format LaTeX &amp; DOCX)
              </h4>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                ZIP • 1.1 MB • Sesuai Standar Belmawa Dikti
              </p>
            </div>
            <button
              className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-500 transition-colors flex items-center space-x-1"
              onClick={() => {
                alert('Mengunduh Format Lembar Pengesahan Resmi...');
                onClose();
              }}
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Unduh</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Pedoman Rubrik Penilaian Reviewer Internal
              </h4>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                PDF • 1.8 MB • Form FO-018 / FO-021
              </p>
            </div>
            <button
              className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-500 transition-colors flex items-center space-x-1"
              onClick={() => {
                alert('Mengunduh Pedoman Rubrik Penilaian Reviewer Internal...');
                onClose();
              }}
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Unduh</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
