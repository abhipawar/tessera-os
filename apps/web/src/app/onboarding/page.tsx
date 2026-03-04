'use client';

import { useState, useTransition } from 'react';
import { Network, Loader2, ArrowRight, User, Building, Mail, Lock, Key } from 'lucide-react';
import Link from 'next/link';
import { onboardTenant } from './actions';

export default function OnboardingPage() {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendCode = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setErrorMsg("");

    // Grab the email directly from the form without submitting it
    const form = e.currentTarget.closest('form');
    if (!form) return;

    // Basic validation
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const company = (form.elements.namedItem('companyName') as HTMLInputElement).value;

    if (!email || !password || !name || !company) {
      setErrorMsg("Please fill in all fields before verifying.");
      return;
    }

    setIsSendingCode(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send code");
      }

      // Success! Move to Step 2
      setStep(2);

    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col justify-center items-center p-4 z-50 absolute top-0 left-0 overflow-hidden font-sans">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Logo Area */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            <Network size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Create Environment</h1>
          <p className="text-sm text-zinc-400 font-medium text-center">Provision your Organization's Digital Twin.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl relative">

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
              {errorMsg}
            </div>
          )}

          <form action={(formData) => startTransition(() => onboardTenant(formData))} className="space-y-5">

            {/* STEP 1: Details */}
            <div className={`space-y-5 transition-all duration-300 ${step === 2 ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Admin Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="Abhi"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-100 transition-all font-mono text-sm"
                      disabled={step === 2 || isSendingCode}
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
                      name="companyName"
                      required
                      placeholder="Rivian"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-100 transition-all font-mono text-sm"
                      disabled={step === 2 || isSendingCode}
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
                    name="email"
                    required
                    placeholder="founder@company.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-zinc-100 transition-all font-mono text-sm"
                    disabled={step === 2 || isSendingCode}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950/50 border border-zinc-800 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-zinc-100 transition-all font-mono text-sm tracking-widest"
                    disabled={step === 2 || isSendingCode}
                  />
                </div>
              </div>

              {step === 1 && (
                <div className="pt-2">
                  <button
                    onClick={handleSendCode}
                    disabled={isSendingCode}
                    className="group w-full flex justify-center items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all"
                  >
                    {isSendingCode ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                    {isSendingCode ? 'Sending verification email...' : 'Verify Email Address'}
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2: OTP Verification */}
            {step === 2 && (
              <div className="absolute bottom-8 left-8 right-8 animate-in slide-in-from-bottom-4 duration-500 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl z-20">
                <div className="space-y-1.5 mb-4">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Verification Code</label>
                  <p className="text-xs text-zinc-500 mb-2 ml-1">We sent a 6-digit code to your email.</p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      name="otpCode"
                      required
                      placeholder="123456"
                      maxLength={6}
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-emerald-500/50 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-emerald-100 transition-all font-mono text-lg tracking-widest text-center"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="group w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] disabled:opacity-50 disabled:hover:shadow-none"
                >
                  {isPending ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  {isPending ? 'Validating & Provisioning...' : 'Deploy Digital Workforce'}
                </button>
              </div>
            )}

          </form>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-2">
            <ArrowRight size={14} className="rotate-180" /> Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}