import React from 'react';
import { ShieldCheck, Lock, Server, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white pt-32 pb-20 overflow-hidden relative">

            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto px-6">

                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
                        <ShieldCheck size={16} /> Enterprise Security
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                        Zero-Trust Orchestration
                    </h1>

                    <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
                        Tessera OS was built from the ground up for bank-grade security.
                        Your agents execute in completely isolated sandboxes.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
                    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <Lock className="text-blue-400 mb-6" size={32} />
                        <h3 className="text-xl font-semibold mb-3">Military-Grade Encryption</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            Tool connections are encrypted via AES-256 and Fernet keys before ever touching PostgreSQL. Your raw keys are never logged.
                        </p>
                    </div>

                    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full" />
                        <ShieldCheck className="text-emerald-400 mb-6" size={32} />
                        <h3 className="text-xl font-semibold mb-3">SOC2 Type II</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            We undergo rigorous continuous compliance auditing to ensure data integrity and access control matrices remain flawless.
                        </p>
                    </div>

                    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <Server className="text-purple-400 mb-6" size={32} />
                        <h3 className="text-xl font-semibold mb-3">VPC & BYOC Deployments</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            Run Tessera OS entirely inside your own AWS/GCP subnets. No telemetry or log data ever leaves your corporate perimeter.
                        </p>
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                        <h3 className="text-2xl font-bold mb-2">Need our Security Whitepaper?</h3>
                        <p className="text-zinc-400">Request our penetration testing results and detailed architecture diagrams.</p>
                    </div>
                    <a href="mailto:security@tesseraos.ai" className="px-6 py-3 shrink-0 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                        Request Whitepaper
                    </a>
                </div>

            </div>
        </div>
    );
}
