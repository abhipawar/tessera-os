"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Network, MessageSquare, Activity, Settings } from 'lucide-react';

export default function GlobalNav() {
  const pathname = usePathname();

  // Hide the nav bar if the user is on a login page (if you build one later)
  if (pathname === '/login') return null;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Org Chart Builder', path: '/org-chart', icon: Network },
    { name: 'Agent Workspace', path: '/workspace', icon: MessageSquare },
  ];

  return (
    <nav className="w-16 h-screen bg-slate-900 flex flex-col items-center py-6 shrink-0 z-50">
      {/* App Logo */}
      <Link href="/dashboard" className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg mb-8 hover:bg-blue-500 transition-colors">
        <Activity size={20} className="text-white" />
      </Link>

      {/* Navigation Links */}
      <div className="flex flex-col gap-4 w-full px-2">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname.startsWith(link.path);
          
          return (
            <Link 
              key={link.name} 
              href={link.path}
              title={link.name}
              className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all group relative ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
            </Link>
          );
        })}
      </div>

      {/* Bottom Settings Icon */}
      <div className="mt-auto w-full px-2">
        <button 
          title="Settings"
          className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
}