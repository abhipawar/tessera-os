"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Network, MessageSquare, Activity, Settings, LogOut, ShieldAlert, Plug } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

export default function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  const [supabase] = useState(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ));

  // Check if the current user is a Super Admin
  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async (user: any) => {
      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }

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

    // 2. Poll the state to escape Next.js hydration races
    const interval = setInterval(() => {
      if (mounted) checkState();
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
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

  const hideOnRoutes = ['/', '/login', '/onboarding'];
  if (hideOnRoutes.includes(pathname)) return null;

  // Base navigation links for everyone
  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Agent Studio', path: '/studio', icon: Network },
    { name: 'Integrations', path: '/integrations', icon: Plug }, // <-- Add this line!
    { name: 'Co-Pilot Chat', path: '/chat', icon: MessageSquare },
  ];

  // Dynamically inject the Admin route if they have permissions
  if (isAdmin) {
    navLinks.push({ name: 'Control Plane', path: '/admin', icon: ShieldAlert });
  }

  return (
    <nav className="w-16 h-screen bg-slate-900 flex flex-col items-center py-6 shrink-0 z-50">
      <Link href="/dashboard" className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-8 hover:bg-blue-500 transition-colors">
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
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </div>

      <div className="mt-auto w-full px-2 flex flex-col gap-2">
        <button title="Settings" className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
          <Settings size={20} />
        </button>

        <button title="Log Out" onClick={handleLogout} className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all">
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}