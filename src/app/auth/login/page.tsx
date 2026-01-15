import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-[var(--background-secondary)] rounded-xl border border-[var(--orb-border)]">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Login zu Projekt L</h1>
        <LoginForm />
        <p className="mt-4 text-center text-white/60 text-sm">
          Noch kein Account?{' '}
          <Link href="/auth/signup" className="text-[var(--accent)] hover:underline">Registrieren</Link>
        </p>
      </div>
    </div>
  );
}
