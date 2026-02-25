"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '../lib/auth';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Navigation() {
  const { user, signOut } = useUser();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  async function handleSignOut() {
    await signOut();
    setMobileOpen(false);
    router.push('/');
  }

  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function loadMeta() {
      if (!user?.id) {
        if (active) {
          setProfileHandle(null);
          setUnreadCount(0);
        }
        return;
      }
      const [{ data: profile }, { count }] = await Promise.all([
        supabase.from('users').select('handle').eq('id', user.id).single(),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
      ]);
      if (!active) return;
      setProfileHandle(profile?.handle || null);
      setUnreadCount(count || 0);
    }

    loadMeta();
    if (user?.id) {
      interval = setInterval(loadMeta, 60000);
    }
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [user?.id]);

  const linkTone = 'text-charcoal/70 hover:text-charcoal';
  const brandTone = 'text-charcoal';

  return (
    <nav className="w-full border-b border-charcoal/6 sticky top-0 z-50 transition-colors duration-300 bg-paper/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group"
            aria-label="The WriteWay home"
          >
            <img
              src="/writeway-logo.svg"
              alt=""
              aria-hidden
              className="h-9 w-9 rounded-full border border-charcoal/10 shadow-sm"
            />
            <span className={`font-display text-xl font-semibold tracking-tight group-hover:text-accent transition-colors duration-500 ${brandTone}`}>
              The WriteWay
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            <Link href="/about" className={`px-3 py-2 text-meta transition-colors ${linkTone}`}>About</Link>
            <Link href="/standards" className={`px-3 py-2 text-meta transition-colors ${linkTone}`}>Standards</Link>
            <Link href="/safety" className={`px-3 py-2 text-meta transition-colors ${linkTone}`}>Safety</Link>
            <Link href="/feed" className={`px-3 py-2 text-meta transition-colors ${linkTone}`}>Feed</Link>
            {user ? (
              <>
                <span className="w-px h-4 bg-charcoal/15 mx-1" aria-hidden />
                <Link href={profileHandle ? `/profiles/${profileHandle}` : "/profile"} className={`px-3 py-2 text-meta transition-colors relative ${linkTone}`}>
                  Profile
                  {unreadCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-hope" aria-hidden />}
                </Link>
                <Link href="/dashboard" className={`px-3 py-2 text-meta transition-colors ${linkTone}`}>Dashboard</Link>
                <Link href="/submit" className="ml-2 px-4 py-2 bg-accent text-white text-meta font-medium rounded-sm hover:bg-accent-deep transition-all duration-300 hover:-translate-y-0.5">Submit</Link>
                <button onClick={handleSignOut} className={`px-3 py-2 text-meta transition-colors ${linkTone}`}>Sign out</button>
              </>
            ) : (
              <>
                <span className="w-px h-4 bg-charcoal/15 mx-1" aria-hidden />
                <Link href="/login" className={`px-3 py-2 text-meta transition-colors ${linkTone}`}>Log in</Link>
                <Link href="/signup" className="ml-2 px-4 py-2 bg-accent text-white text-meta font-medium rounded-sm hover:bg-accent-deep transition-all duration-300 hover:-translate-y-0.5">Sign up</Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {user && (
              <Link href="/submit" className="px-3 py-2 bg-accent text-white text-xs font-medium rounded-sm">
                Submit
              </Link>
            )}
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-panel"
              onClick={() => setMobileOpen((v) => !v)}
              className="px-3 py-2 text-sm border rounded-sm transition-colors border-charcoal/20 text-charcoal/80 hover:bg-charcoal/5"
            >
              Menu
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-nav-panel" className="md:hidden border-t border-charcoal/10 bg-paper/95 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 grid gap-1">
            <Link href="/about" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">About</Link>
            <Link href="/standards" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">Standards</Link>
            <Link href="/safety" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">Safety</Link>
            <Link href="/feed" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">Feed</Link>
            {user ? (
              <>
                <Link href={profileHandle ? `/profiles/${profileHandle}` : "/profile"} onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">
                  Profile {unreadCount > 0 ? `(${unreadCount} new)` : ""}
                </Link>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">Dashboard</Link>
                <Link href="/notifications" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">
                  Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}
                </Link>
                <button onClick={handleSignOut} className="px-3 py-2 text-left text-charcoal/80 hover:text-charcoal">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">Log in</Link>
                <Link href="/signup" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-charcoal/80 hover:text-charcoal">Sign up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
