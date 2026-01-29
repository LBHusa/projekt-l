import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <AuthLayout title="Login zu Projekt L">
      <LoginForm />
      <p className="mt-4 text-center text-adaptive-muted text-sm">
        Noch kein Account?{' '}
        <Link href="/auth/signup" className="text-[var(--accent)] hover:underline">Registrieren</Link>
      </p>
    </AuthLayout>
  );
}
