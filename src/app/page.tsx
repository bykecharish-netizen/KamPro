import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/auth/session';
import MainPortalClient from '@/components/portal/MainPortalClient';
import type { PortalUserDto } from '@/components/portal/portalData';

async function PortalSessionLoader() {
  const session = await getCurrentSession();

  const initialUser: PortalUserDto | null = session
    ? {
        id: session.user.id,
        nip_npm: session.user.nip_npm,
        nama_lengkap: session.user.nama_lengkap,
        gelar: session.user.gelar,
        prodi: session.user.prodi,
        roles: session.user.roles.map((r: any) => r.role || r),
        active_role: session.active_role,
      }
    : null;

  return <MainPortalClient initialUser={initialUser} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen bg-[#F8FAFC] flex items-center justify-center">
          <div className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium inline-flex items-center gap-2.5 shadow-xs">
            <span className="w-3.5 h-3.5 border-2 border-[#0F172A] border-t-transparent rounded-full animate-spin" />
            <span>Memuat Portal SIM-PKM Poltek SSN...</span>
          </div>
        </div>
      }
    >
      <PortalSessionLoader />
    </Suspense>
  );
}
