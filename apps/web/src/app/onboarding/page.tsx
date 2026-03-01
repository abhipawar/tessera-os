'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Network, Loader2, ArrowRight, User, Building, Mail, Lock } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    companyName: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.email.trim() || !formData.password.trim()) return;

    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // 1. Tell Python to securely create the User, Tenant, and Workspace
      const res = await fetch(`${API_URL}/api/signup-onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          company_name: formData.companyName
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // 2. Log the user into the Next.js frontend using the credentials they just provided
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      // 3. Send them to their new Studio!
      router.push('/studio');

    } catch (error: any) {
      console.error("Registration failed:", error);
      alert(`Failed to register: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col justify-center items-center p-4 z-50 absolute top-0 left-0 overflow-hidden font-sans">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Logo Area */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            <Network size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Create Environment</h1>
          <p className="text-sm text-zinc-400 font-medium text-center">Provision your Organization's Digital Twin.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Admin Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Abhi"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-100 transition-all font-mono text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Tenant Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Rivian"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-100 transition-all font-mono text-sm"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Work Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="founder@company.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-100 transition-all font-mono text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Decryption Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-zinc-100 transition-all font-mono text-sm tracking-widest"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!formData.companyName.trim() || !formData.email.trim() || formData.password.length < 6 || isSubmitting}
                className="group w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:hover:shadow-none"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                {isSubmitting ? 'Provisioning Tenant...' : 'Deploy digital workforce'}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2">
            <ArrowRight size={14} className="rotate-180" /> Return to Genesis
          </Link>
        </div>
      </div>
    </div>
  );
}