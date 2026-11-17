import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import RegisterForm from './RegisterForm';

async function AuthCheck() {
  const session = await getCurrentSession();
  if (session) {
    redirect('/dashboard');
  }
  return <RegisterForm />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterForm />}>
      <AuthCheck />
    </Suspense>
  );
}
