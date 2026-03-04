'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network } from 'lucide-react';

export default function Footer() {
    const pathname = usePathname();

    // The footer should only be visible on public pages (Landing, Login, Onboarding, Join)
    const showOnRoutes = ['/', '/login', '/onboarding', '/join'];
    if (!showOnRoutes.includes(pathname)) return null;

    return (
        <footer className="bg-[#09090b] border-t border-zinc-800/50 pt-20 pb-10 font-sans text-sm selection:bg-blue-500/30 w-full mt-auto">
            <div className="max-w-7xl mx-auto px-6">

                {/* Top 4-Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-20">

                    {/* Column 1: Brand & Status (Takes up 2 cols on lg screens for spacing) */}
                    <div className="lg:col-span-2 pr-8">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                                <Network size={18} className="text-white" />
                            </div>
                            <span className="font-bold text-lg tracking-tight text-white">Tessera OS</span>
                        </Link>
                        <p className="text-zinc-500 mb-8 leading-relaxed max-w-sm">
                            The operating system for the autonomous enterprise. Scale execution natively without scaling headcount.
                        </p>

                        {/* System Status Indicator */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/50 border border-zinc-800/50 rounded-full inline-flex">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-zinc-300 font-medium text-xs tracking-wide uppercase">All Systems Operational</span>
                        </div>
                    </div>

                    {/* Column 2: Platform */}
                    <div>
                        <h4 className="text-white font-semibold mb-6">Platform</h4>
                        <ul className="space-y-4 text-zinc-500">
                            <li><Link href="/login" className="hover:text-white transition-colors">Action Canvas</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Orchestration Engine</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Process Discovery</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Global Catalog</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Telemetry & Insights</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Developers */}
                    <div>
                        <h4 className="text-white font-semibold mb-6">Developers</h4>
                        <ul className="space-y-4 text-zinc-500">
                            <li><Link href="/login" className="hover:text-white transition-colors">Documentation</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">API Reference</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Custom Tool SDK</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Bring Your Own Cloud</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors flex items-center gap-2">Security & Trust <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-wider">SOC2</span></Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Company */}
                    <div>
                        <h4 className="text-white font-semibold mb-6">Company</h4>
                        <ul className="space-y-4 text-zinc-500">
                            <li><Link href="/login" className="hover:text-white transition-colors">About Tessera</Link></li>
                            <li><a href="mailto:enterprise@tesseraos.ai" className="hover:text-white transition-colors">Enterprise Sales</a></li>
                            <li><a href="mailto:partners@tesseraos.ai" className="hover:text-white transition-colors">Partners & Integrators</a></li>
                            <li><a href="mailto:careers@tesseraos.ai" className="hover:text-white transition-colors flex items-center gap-2">Careers <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold tracking-wider">Hiring</span></a></li>
                            <li><a href="mailto:hello@tesseraos.ai" className="hover:text-white transition-colors">Contact Us</a></li>
                        </ul>
                    </div>

                </div>

                {/* Bottom Ribbon */}
                <div className="border-t border-zinc-800/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-zinc-600 text-xs">
                        &copy; {new Date().getFullYear()} Tessera AI, Inc. All rights reserved.
                    </div>
                    <div className="flex items-center gap-6 text-xs text-zinc-600">
                        <Link href="/login" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
                        <Link href="/login" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
                        <a href="mailto:security@tesseraos.ai?subject=SOC2 Report Request" className="hover:text-zinc-400 transition-colors">SOC2 Report Request</a>
                    </div>
                </div>

            </div>
        </footer>
    );
}
