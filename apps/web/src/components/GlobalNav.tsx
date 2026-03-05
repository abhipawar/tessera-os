"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Network, MessageSquare, Activity, Settings, LogOut, ShieldAlert, Plug, LayoutTemplate, Inbox } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export default function GlobalNav({
  initialUser,
  isSuperAdmin
}: {
  initialUser: { email?: string } | null,
  isSuperAdmin: boolean
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Hydrate immediately from server props!
  const [isAdmin, setIsAdmin] = useState(isSuperAdmin);
  const [isLoggedIn, setIsLoggedIn] = useState(!!initialUser);

  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // Check if the current user is a Super Admin
  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async (user: any) => {
      if (!user) {
        if (mounted) {
          setIsAdmin(false);
          setIsLoggedIn(false);
        }
        return;
      }

      if (mounted) setIsLoggedIn(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_tessera_admin')
        .eq('id', user.id)
        .single();

      if (mounted) {
        setIsAdmin(!!profile?.is_tessera_admin);
      }
    };

    // Fetch the absolute truth from the database cookie
    const checkState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      await checkAdminStatus(user);
    };

    // 1. Check immediately on mount
    checkState();

    // 2. Listen for auth state changes instead of polling
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) checkState();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.location.replace('/');
  };

  // Removed conditional hide to make sidebar global on all pages
  // Base navigation links for everyone
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Command Center', path: '/inbox', icon: Inbox },
    { name: 'Templates', path: '/templates', icon: LayoutTemplate },
    { name: 'Agent Studio', path: '/studio', icon: Network },
    { name: 'Integrations', path: '/integrations', icon: Plug }, // <-- Add this line!
    { name: 'Co-Pilot Chat', path: '/chat', icon: MessageSquare },
  ];

  // Dynamically inject the Admin route if they have permissions
  if (isAdmin) {
    navLinks.push({ name: 'Control Plane', path: '/admin', icon: ShieldAlert });
  }

  return (
    <nav className="w-16 h-screen bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-900 flex flex-col items-center py-6 shrink-0 z-50 transition-all font-sans">
      <Link href="/" className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] mb-8 hover:scale-110 transition-transform">
        <Activity size={20} className="text-white" />
      </Link>

      <div className="flex flex-col gap-4 w-full px-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.path);

          return (
            <Link
              key={link.name}
              href={link.path}
              title={link.name}
              className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all group relative ${isActive
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 border border-transparent'
                }`}
            >
              <Icon size={20} />

              {/* Optional Active Glow Indicator on the side */}
              {isActive && (
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
              )}
            </Link>
          );
        })}
      </div>

      {isLoggedIn && (
        <div className="mt-auto w-full px-2 flex flex-col gap-2">
          <button title="Settings" className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300 transition-all border border-transparent">
            <Settings size={20} />
          </button>

          <button title="Log Out" onClick={handleLogout} className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-zinc-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all border border-transparent">
            <LogOut size={20} />
          </button>
        </div>
      )}
    </nav>
  );
}