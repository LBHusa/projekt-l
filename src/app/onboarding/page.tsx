'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import IntroSlides from '@/components/onboarding/IntroSlides';
import { Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [introCompleted, setIntroCompleted] = useState(false);

  useEffect(() => {
    // Check if intro was already completed (for page refresh)
    const stored = localStorage.getItem('onboarding_intro_completed');
    if (stored === 'true') {
      setIntroCompleted(true);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        router.push('/auth/login');
        return;
      }

      // Check if onboarding is already completed
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', authUser.id)
        .single();

      if (profile?.onboarding_completed) {
        // Clear intro flag when onboarding is done
        localStorage.removeItem('onboarding_intro_completed');
        router.push('/');
        return;
      }

      setUser({ id: authUser.id, email: authUser.email || undefined });
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleIntroComplete = () => {
    localStorage.setItem('onboarding_intro_completed', 'true');
    setIntroCompleted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-adaptive-muted">Lade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show intro slides first, then the wizard
  if (!introCompleted) {
    return <IntroSlides onComplete={handleIntroComplete} />;
  }

  return <OnboardingWizard userId={user.id} userEmail={user.email} />;
}
