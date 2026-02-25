// lib/auth.ts
// React hook to provide Supabase user info, designed for server and client components

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type UseUserResult = {
  user: null | {
    id: string;
    email?: string;
    [key: string]: any;
  };
  loading: boolean;
  signOut: () => Promise<void>;
};

export function useUser(): UseUserResult {
  const [user, setUser] = useState<UseUserResult['user']>(null);
  const [loading, setLoading] = useState<boolean>(true);

  function normalizeHandle(input: string) {
    const base = (input || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 24);
    return base || 'reader';
  }

  useEffect(() => {
    let unsubscribe: ReturnType<typeof supabase.auth.onAuthStateChange> | undefined;
    async function pickUniqueHandle(base: string, userId: string) {
      let candidate = normalizeHandle(base);
      for (let i = 0; i < 5; i += 1) {
        const { data } = await supabase
          .from('users')
          .select('id, handle')
          .eq('handle', candidate)
          .maybeSingle();
        if (!data || data.id === userId) return candidate;
        candidate = `${normalizeHandle(base)}${Math.floor(1000 + Math.random() * 9000)}`;
      }
      return `${normalizeHandle(base)}${Math.floor(100000 + Math.random() * 900000)}`;
    }

    async function ensureUserRow(userId: string, email: string | undefined | null) {
      // Check if user row exists
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, handle')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching user row', error);
      }

      if (!data) {
        const displayName = email ? email.split('@')[0] : 'User';
        const handle = await pickUniqueHandle(displayName, userId);
        const { error: insertError } = await supabase.from('users').insert([
          {
            id: userId,
            display_name: displayName,
            handle,
          },
        ]);
        if (insertError) {
          console.error('Failed to create user row', insertError);
        }
        return;
      }

      if (!data.handle) {
        const base = data.display_name || (email ? email.split('@')[0] : 'reader');
        const handle = await pickUniqueHandle(base, userId);
        const { error: updateError } = await supabase
          .from('users')
          .update({ handle })
          .eq('id', userId);
        if (updateError) {
          console.error('Failed to set handle', updateError);
        }
      }
    }

    async function getUser() {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Auth session error", error);
          try {
            await supabase.auth.signOut();
          } catch {}
          setUser(null);
          return;
        }

        const currentUser = data.session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await ensureUserRow(currentUser.id, currentUser.email);
        }
      } catch (err) {
        console.warn("Auth initialization failed", err);
        try {
          await supabase.auth.signOut();
        } catch {}
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    getUser();
    unsubscribe = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        void ensureUserRow(currentUser.id, currentUser.email);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe.data.subscription.unsubscribe();
      }
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return { user, loading, signOut };
}

// For server components, you should fetch user/role on the server --
// this hook exports only for client components/contexts.
