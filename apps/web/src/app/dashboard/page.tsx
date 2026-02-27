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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* GLOBAL HEADER */}
            

            <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8">
                {/* WELCOME BANNER */}
                <section>
                    <h2 className="text-3xl font-bold text-slate-900">Welcome to your Command Center</h2>
                    <p className="text-slate-500 mt-2 text-lg">Manage your autonomous digital workforce, monitor agent skills, and design new workflows.</p>
                </section>

                {/* METRICS OVERVIEW */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Chats</span>
                        <span className="text-4xl font-bold text-slate-800 mt-2">{recentCharts.length || 0}</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Deployed Agents</span>
                        <span className="text-4xl font-bold text-slate-800 mt-2">--</span>
                        <span className="text-xs text-slate-400 mt-1">Awaiting LangGraph sync</span>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Learned Skills (Vector DB)</span>
                        <span className="text-4xl font-bold text-slate-800 mt-2">--</span>
                        <span className="text-xs text-slate-400 mt-1">Awaiting sync</span>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
                    {/* PLATFORM MODULES (NAVIGATION) */}
                    <section className="lg:col-span-2 flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Platform Modules
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Studio Card */}
                            <Link href="/studio" className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col h-full">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Network size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-800 mb-1">Studio Builder</h4>
                                <p className="text-sm text-slate-500 flex-1">Visually design your digital workforce. Drag and drop agents, assign roles, and map out workflows.</p>
                                <div className="mt-4 flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                                    Launch Builder <ArrowRight size={16} className="ml-1" />
                                </div>
                            </Link>

                            {/* Chat Chat Card */}
                            <Link href="/chat" className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:indigo-400 transition-all cursor-pointer flex flex-col h-full">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <MessageSquare size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-1">Agent Interface</h4>
                            <p className="text-sm text-slate-500 flex-1">Chat directly with your deployed Supervisor agents to execute tasks and monitor live progress.</p>
                            <div className="mt-4 flex items-center text-indigo-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                                Open Chat <ArrowRight size={16} className="ml-1" />
                            </div>
                        </Link>

                        {/* Skill Library Card (Future) */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col h-full opacity-70">
                            <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center mb-4">
                                <BrainCircuit size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-1">Skill Library</h4>
                            <p className="text-sm text-slate-500 flex-1">View the autonomous Python code and workflows your agents have permanently memorized.</p>
                            <div className="mt-4 flex items-center text-slate-400 font-semibold text-sm">
                                Coming Soon
                            </div>
                        </div>

                        {/* Integrations Card (Live!) */}
                        <Link href="/integrations" className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer flex flex-col h-full">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Key size={24} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-1">Integrations & BYOK</h4>
                            <p className="text-sm text-slate-500 flex-1">Connect your secure API keys and internal databases directly to your tenant.</p>
                            <div className="mt-4 flex items-center text-emerald-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                                Configure Tools <ArrowRight size={16} className="ml-1" />
                            </div>
                        </Link>

                </div>
            </section>

            {/* RECENT WORKSPACES SIDEBAR */}
            <section className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-slate-800">Recent Chats</h3>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2">
                    {isLoading ? (
                        <div className="text-sm text-slate-500 text-center py-8 animate-pulse">Loading chats...</div>
                    ) : recentCharts.length > 0 ? (
                        recentCharts.map((chart) => (
                            <Link href="/studio" key={chart.id} className="p-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Network size={16} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-800">{chart.name}</div>
                                        <div className="text-xs text-slate-400">
                                            Updated {new Date(chart.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </Link>
                        ))
                    ) : (
                        <div className="text-sm text-slate-500 text-center py-8">No chats found.</div>
                    )}

                    <Link href="/studio" className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 transition-colors">
                        <Plus size={16} /> Create New Workspace
                    </Link>
                </div>
            </section>
        </div>
            </main >
        </div >
    );
}