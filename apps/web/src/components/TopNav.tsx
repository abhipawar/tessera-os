"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { UserCircle, Bell } from 'lucide-react';

export default function TopNav() {
  const pathname = usePathname();
  const [role, setRole] = useState("Loading...");
  const [email, setEmail] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUser = async (user: any) => {
      setEmail(user.email || "");
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_tessera_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_tessera_admin) {
        setRole("Super Admin");
      } else {
        const { data: tenantMember } = await supabase
          .from('tenant_members')
          .select('tenant_role')
          .eq('user_id', user.id)
          .single();

        if (tenantMember) {
          const formattedRole = tenantMember.tenant_role.charAt(0).toUpperCase() + tenantMember.tenant_role.slice(1);
          setRole(`Tenant ${formattedRole}`);
        } else {
          setRole("User");
        }
      }
    };

    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUser(session.user);
    });

    // 2. Listen for login events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Hide the TopNav on auth/onboarding routes
  const hideOnRoutes = ['/', '/login', '/onboarding'];
  if (hideOnRoutes.includes(pathname)) return null;

  // Dynamically set the page title based on the URL
  const getPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/studio')) return 'Agent Studio';
    if (pathname.startsWith('/chat')) return 'Co-Pilot Chat';
    if (pathname.startsWith('/admin')) return 'Control Plane';
    return 'Tessera OS';
  };

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-between px-8 shrink-0 z-40 sticky top-0">
      <h1 className="text-lg font-semibold text-zinc-100">{getPageTitle()}</h1>

      <div className="flex items-center gap-4">
        <button className="text-zinc-400 hover:text-white transition-colors">
          <Bell size={18} />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-zinc-200">{email}</span>
            <span className="text-xs text-blue-400 font-medium">{role}</span>
          </div>
          <UserCircle size={32} className="text-zinc-500" />
        </div>
      </div>
    </header>
  );
}