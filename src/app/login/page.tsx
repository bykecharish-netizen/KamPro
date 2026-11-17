import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import LoginForm from './LoginForm';

async function AuthCheck() {
  const session = await getCurrentSession();
  if (session) {
    redirect('/dashboard');
  }
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#071933] flex items-center justify-center text-white font-mono text-xs">
          Memuat halaman masuk...
        </div>
      }
    >
      <AuthCheck />
    </Suspense>
  );
}
