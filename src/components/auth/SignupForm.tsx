'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user && !data.session) {
      // Email confirmation required
      router.push('/auth/login?registered=true');
    } else if (data.session) {
      // Auto-logged in, redirect to onboarding
      router.push('/onboarding');
    } else {
      router.push('/auth/login?registered=true');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-adaptive-muted mb-1">Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3}
          className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent)]" />
      </div>
      <div>
        <label className="block text-sm text-adaptive-muted mb-1">E-Mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent)]" />
      </div>
      <div>
        <label className="block text-sm text-adaptive-muted mb-1">Passwort</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
          className="w-full px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[var(--accent)]" />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-2 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
        {loading ? 'Laden...' : 'Registrieren'}
      </button>
    </form>
  );
}
