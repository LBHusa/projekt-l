import { SignupForm } from '@/components/auth/SignupForm';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-md p-8 bg-[var(--background-secondary)] rounded-xl border border-[var(--orb-border)]">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Account erstellen</h1>
        <SignupForm />
        <p className="mt-4 text-center text-white/60 text-sm">
          Bereits registriert?{' '}
          <Link href="/auth/login" className="text-[var(--accent)] hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
