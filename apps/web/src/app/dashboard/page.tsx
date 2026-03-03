"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import {
    Network,
    MessageSquare,
    BrainCircuit,
    Key,
    ArrowRight,
    Activity,
    Plus,
    Bot,
    Download,
    ShieldCheck,
    X
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Dashboard() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [recentCharts, setRecentCharts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showInstallModal, setShowInstallModal] = useState(false);

    // Synthesis State
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [synthesisTimeRange, setSynthesisTimeRange] = useState('last_24h');
    const [synthesisResult, setSynthesisResult] = useState<any>(null);
    const [synthesisError, setSynthesisError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRecentWorkspaces = async () => {
            // Update table name to 'workspaces', cast it so TS doesn't complain about implicit unknown if schema string doesn't exist
            const { data, error } = await supabase
                .from('workspaces')
                .select('id, name, updated_at')
                .order('updated_at', { ascending: false })
                .limit(3);

            if (!error && data) {
                setRecentCharts(data as any[]);
            }
            setIsLoading(false);
        };

        fetchRecentWorkspaces();
    }, []);

    const handleSynthesize = async () => {
        setIsSynthesizing(true);
        setSynthesisError(null);
        setSynthesisResult(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                setSynthesisError('Authentication error. Please log in again.');
                setIsSynthesizing(false);
                return;
            }

            const res = await fetch(`${API_URL}/api/telemetry/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ time_range: synthesisTimeRange })
            });

            if (!res.ok) {
                const errData = await res.json();
                if (errData.detail === 'missing_llm_key') {
                    setSynthesisError('missing_llm');
                } else {
                    setSynthesisError('API Error: ' + errData.detail);
                }
                setIsSynthesizing(false);
                return;
            }

            const data = await res.json();
            setSynthesisResult(data);
        } catch (error: any) {
            setSynthesisError('Network error connecting to synthesis engine.');
        } finally {
            setIsSynthesizing(false);
        }
    };


    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-white relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none z-0" />

            {/* Install Instructions Modal */}
            {showInstallModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-white">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowInstallModal(false)}
                            className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Download className="text-blue-500" /> Install Discovery Extension
                        </h3>
                        <p className="text-zinc-400 mb-6 text-sm">
                            The extension is currently in Developer Preview. Follow these steps to install it in your chromium-based browser:
                        </p>
                        <ol className="list-decimal list-inside space-y-3 text-sm text-zinc-300 mb-6">
                            <li>Open a new tab and navigate to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-blue-400 font-mono text-xs">chrome://extensions/</code></li>
                            <li>Toggle <strong>Developer mode</strong> in the top right corner.</li>
                            <li>Click the <strong>Load unpacked</strong> button.</li>
                            <li>Select the <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 font-mono text-xs">apps/task-miner/dist</code> folder in your local Tessera OS repository.</li>
                        </ol>
                        <div className="flex justify-end pt-2 border-t border-zinc-800/50">
                            <button onClick={() => setShowInstallModal(false)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                {/* ZERO STATE HOOK BANNER / PROCESS DISCOVERY */}
                <section className="bg-gradient-to-r from-blue-900/20 to-emerald-900/20 border border-blue-500/30 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />

                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8 justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 uppercase tracking-wider">
                                    Process Discovery Insight
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Automate Your Workflow</h3>
                            <p className="text-zinc-300 mb-4 text-lg">
                                Have the extension installed? Let our synthesis engine analyze your recent activity to auto-generate an agent workflow map.
                            </p>
                            <p className="text-sm text-zinc-400 flex items-center gap-2 mb-6">
                                <ShieldCheck size={16} className="text-emerald-400" />
                                Data is scrubbed locally in your browser before analysis.
                            </p>

                            {/* Controls */}
                            <div className="flex items-center gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 w-fit">
                                <select
                                    className="bg-zinc-800 text-white border border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 transition-colors"
                                    value={synthesisTimeRange}
                                    onChange={(e) => setSynthesisTimeRange(e.target.value)}
                                    disabled={isSynthesizing}
                                >
                                    <option value="last_24h">Last 24 Hours</option>
                                    <option value="last_7d">Last 7 Days</option>
                                </select>

                                <button
                                    onClick={handleSynthesize}
                                    disabled={isSynthesizing}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                                >
                                    {isSynthesizing ? <><Activity size={18} className="animate-spin" /> Synthesizing...</> : <><BrainCircuit size={18} /> Analyze My Activity</>}
                                </button>
                            </div>

                            {/* Status Feedbacks */}
                            {synthesisError === 'missing_llm' && (
                                <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-4 animate-in fade-in">
                                    <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><Key size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-red-200">Missing LLM Provider</h4>
                                        <p className="text-sm text-red-300 mt-1">Please connect an LLM Provider (like OpenAI or Anthropic) in your Tools before running Process Discovery.</p>
                                        <Link href="/integrations" className="inline-block mt-3 text-sm font-semibold text-blue-400 hover:text-blue-300">
                                            Go to Integrations &rarr;
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {synthesisError && synthesisError !== 'missing_llm' && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    {synthesisError}
                                </div>
                            )}

                            {synthesisResult && synthesisResult.pattern_found === false && (
                                <div className="mt-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl flex items-start gap-4 animate-in fade-in">
                                    <div className="p-2 bg-zinc-700 rounded-lg text-zinc-400"><Activity size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-white">No clear patterns found</h4>
                                        <p className="text-sm text-zinc-400 mt-1">Keep working! We need a bit more repetitive data to comfortably map out a confident automation for you.</p>
                                    </div>
                                </div>
                            )}

                            {synthesisResult && synthesisResult.pattern_found === true && (
                                <div className="mt-6 p-5 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-start gap-4 animate-in fade-in zoom-in-95">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Bot size={24} /></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-emerald-300 text-lg">Pattern Identified!</h4>
                                                <p className="text-sm text-emerald-100 font-semibold mt-1">{synthesisResult.name}</p>
                                                <p className="text-sm text-zinc-400 mt-1">{synthesisResult.description}</p>
                                            </div>
                                            <Link href="/studio" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm shadow-lg border border-emerald-400/50 transition-colors whitespace-nowrap">
                                                Review & Activate
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        <div className="shrink-0 flex flex-col items-center p-6 bg-zinc-950/50 border border-zinc-800 rounded-2xl w-full md:w-auto">
                            <span className="text-zinc-400 text-sm font-semibold mb-3">No extension yet?</span>
                            <button onClick={() => setShowInstallModal(true)} className="flex items-center justify-center gap-2 px-6 py-3 w-full border border-blue-500/50 hover:bg-blue-600/10 text-blue-400 font-bold rounded-xl transition-colors">
                                <Download size={18} />
                                Install Extension
                            </button>
                        </div>
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