'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    userId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          setState({ user: null, userId: null, loading: false, error: error.message });
        } else if (session?.user) {
          setState({ user: session.user, userId: session.user.id, loading: false, error: null });
        } else {
          setState({ user: null, userId: null, loading: false, error: null });
        }
      } catch (err) {
        setState({ user: null, userId: null, loading: false, error: 'Failed to get session' });
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState({ user: session.user, userId: session.user.id, loading: false, error: null });
      } else {
        setState({ user: null, userId: null, loading: false, error: null });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

// Helper function to get user ID from server-side (API routes)
export async function getServerUserId(): Promise<string | null> {
  // This would be called from API routes where we have access to cookies
  // For now, return null - API routes should use their own session check
  return null;
}
