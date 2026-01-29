import { SignupForm } from '@/components/auth/SignupForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <AuthLayout title="Account erstellen">
      <SignupForm />
      <p className="mt-4 text-center text-adaptive-muted text-sm">
        Bereits registriert?{' '}
        <Link href="/auth/login" className="text-[var(--accent)] hover:underline">Login</Link>
      </p>
    </AuthLayout>
  );
}
