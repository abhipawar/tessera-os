"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import {
    Network,
    MessageSquare,
    BrainCircuit,
    Key,
    ArrowRight,
    Activity,
    Plus,
    Bot
} from 'lucide-react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Dashboard() {
    const [recentCharts, setRecentCharts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRecentWorkspaces = async () => {
            // Update table name to 'workspaces'
            const { data, error } = await supabase
                .from('workspaces')
                .select('id, name, updated_at')
                .order('updated_at', { ascending: false })
                .limit(3);

            if (!error && data) {
                setRecentCharts(data);
            }
            setIsLoading(false);
        };

        fetchRecentWorkspaces();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-white relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none z-0" />

            {/* GLOBAL HEADER */}


            <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* WELCOME BANNER */}
                <section>
                    <h2 className="text-3xl font-bold text-white">Welcome to your Command Center</h2>
                    <p className="text-zinc-400 mt-2 text-lg">Manage your autonomous digital workforce, monitor agent skills, and design new workflows.</p>
                </section>

                {/* METRICS OVERVIEW */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-zinc-800/50 shadow-sm flex flex-col hover:border-zinc-700/50 transition-colors">
                        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Active Chats</span>
                        <span className="text-4xl font-bold text-white mt-2">{recentCharts.length || 0}</span>
                    </div>
                    <div className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-zinc-800/50 shadow-sm flex flex-col hover:border-zinc-700/50 transition-colors">
                        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Deployed Agents</span>
                        <span className="text-4xl font-bold text-white mt-2">--</span>
                        <span className="text-xs text-zinc-500 mt-1">Awaiting LangGraph sync</span>
                    </div>
                    <div className="bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-zinc-800/50 shadow-sm flex flex-col hover:border-zinc-700/50 transition-colors">
                        <span className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Learned Skills (Vector DB)</span>
                        <span className="text-4xl font-bold text-white mt-2">--</span>
                        <span className="text-xs text-zinc-500 mt-1">Awaiting sync</span>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    {/* PLATFORM MODULES (NAVIGATION) */}
                    <section className="lg:col-span-2 flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            Platform Modules
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Studio Card */}
                            <Link href="/studio" className="group bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-zinc-800/50 hover:border-blue-500/50 hover:bg-blue-900/10 hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] transition-all cursor-pointer flex flex-col h-full">
                                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                                    <Network size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">Studio Builder</h4>
                                <p className="text-sm text-zinc-400 flex-1">Visually design your digital workforce. Drag and drop agents, assign roles, and map out workflows.</p>
                                <div className="mt-4 flex items-center text-blue-500 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                                    Launch Builder <ArrowRight size={16} className="ml-1" />
                                </div>
                            </Link>

                            {/* Chat Chat Card */}
                            <Link href="/chat" className="group bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-zinc-800/50 hover:border-indigo-500/50 hover:bg-indigo-900/10 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all cursor-pointer flex flex-col h-full">
                                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                    <MessageSquare size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">Agent Interface</h4>
                                <p className="text-sm text-zinc-400 flex-1">Chat directly with your deployed Supervisor agents to execute tasks and monitor live progress.</p>
                                <div className="mt-4 flex items-center text-indigo-500 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                                    Open Chat <ArrowRight size={16} className="ml-1" />
                                </div>
                            </Link>

                            {/* Skill Library Card (Future) */}
                            <div className="bg-zinc-900/30 backdrop-blur-xl p-6 rounded-3xl border border-zinc-800/50 flex flex-col h-full opacity-70">
                                <div className="w-12 h-12 bg-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center mb-4">
                                    <BrainCircuit size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">Skill Library</h4>
                                <p className="text-sm text-zinc-500 flex-1">View the autonomous Python code and workflows your agents have permanently memorized.</p>
                                <div className="mt-4 flex items-center text-zinc-600 font-semibold text-sm">
                                    Coming Soon
                                </div>
                            </div>

                            {/* Integrations Card (Live!) */}
                            <Link href="/integrations" className="group bg-zinc-900/50 backdrop-blur-xl p-6 rounded-3xl border border-zinc-800/50 hover:border-emerald-500/50 hover:bg-emerald-900/10 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all cursor-pointer flex flex-col h-full">
                                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                    <Key size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-1">Integrations & BYOK</h4>
                                <p className="text-sm text-zinc-400 flex-1">Connect your secure API keys and internal databases directly to your tenant.</p>
                                <div className="mt-4 flex items-center text-emerald-500 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                                    Configure Tools <ArrowRight size={16} className="ml-1" />
                                </div>
                            </Link>

                        </div>
                    </section>

                    {/* RECENT WORKSPACES SIDEBAR */}
                    <section className="flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-white">Recent Chats</h3>
                        <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl border border-zinc-800/50 shadow-sm p-5 flex flex-col gap-2 relative">
                            {isLoading ? (
                                <div className="text-sm text-zinc-500 text-center py-8 animate-pulse">Loading chats...</div>
                            ) : recentCharts.length > 0 ? (
                                recentCharts.map((chart) => (
                                    <Link href="/studio" key={chart.id} className="p-3 hover:bg-zinc-800/50 rounded-xl border border-transparent hover:border-zinc-700/50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all">
                                                <Network size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{chart.name}</div>
                                                <div className="text-xs text-zinc-500">
                                                    Updated {new Date(chart.updated_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight size={16} className="text-zinc-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                    </Link>
                                ))
                            ) : (
                                <div className="text-sm text-zinc-500 text-center py-8">No chats found.</div>
                            )}

                            <Link href="/studio" className="mt-2 flex items-center justify-center gap-2 w-full py-3 bg-zinc-800/30 hover:bg-zinc-800/80 text-white font-semibold text-sm rounded-xl border border-zinc-800/50 transition-colors">
                                <Plus size={16} /> Create New Workspace
                            </Link>
                        </div>
                    </section>
                </div>
            </main >
        </div >
    );
}