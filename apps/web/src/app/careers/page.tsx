import React from 'react';
import { Users, Briefcase, ChevronRight, Zap, Target } from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
    const roles = [
        { title: "Lead AI Systems Engineer", location: "San Francisco / Remote", tag: "Engineering" },
        { title: "Founding Account Executive", location: "New York / Remote", tag: "Sales" },
        { title: "Chief of Staff (Agent Ops)", location: "Remote", tag: "Operations" },
        { title: "Prompt Orchestration Designer", location: "San Francisco", tag: "Product" },
        { title: "Rust/WASM Performance Engineer", location: "Remote", tag: "Engineering" }
    ];

    return (
        <div className="min-h-screen bg-[#09090b] text-white pt-32 pb-20 relative">

            <div className="max-w-5xl mx-auto px-6">

                <div className="mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
                        <Users size={16} /> Currently Hiring
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                        Join the Autonomous Revolution
                    </h1>

                    <p className="text-xl text-zinc-400 max-w-2xl mb-12 font-light leading-relaxed">
                        We aren't building just another chatbot. We are building the operating system for the Enterprise. Join us to literally redefine what humans do at work.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Open Roles</h2>
                        <div className="space-y-4 border-t border-zinc-800/50 pt-4">
                            {roles.map((role, i) => (
                                <a key={i} href={`mailto:careers@tesseraos.ai?subject=Application for ${role.title}`} className="group block p-6 border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-800/50 rounded-xl transition-all hover:border-zinc-700">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">{role.title}</h3>
                                            <p className="text-sm text-zinc-500 mt-1">{role.location} &bull; {role.tag}</p>
                                        </div>
                                        <ChevronRight size={20} className="text-zinc-600 group-hover:text-zinc-400 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-zinc-900 to-[#0a0a0c] border border-zinc-800 p-8 rounded-2xl flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px]" />
                        <Briefcase className="text-emerald-500 mb-6" size={48} />
                        <h3 className="text-2xl font-bold mb-4 z-10">Don't see a fit?</h3>
                        <p className="text-zinc-400 leading-relaxed mb-8 z-10 pr-8">
                            We are growing exceptionally fast. If you're a world-class builder, designer, or operator who believes in human-agent collaboration, we want to hear from you anyway.
                        </p>
                        <a href="mailto:careers@tesseraos.ai?subject=General Application" className="inline-flex w-fit px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors z-10">
                            Email Us Directly
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
