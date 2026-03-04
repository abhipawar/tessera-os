import React from 'react';
import { Target, Zap, Rocket } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-white pt-32 pb-20 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-blue-500/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                    The Base Layer for AI Workers
                </h1>

                <p className="text-xl text-zinc-400 mb-20 font-light leading-relaxed mx-auto max-w-3xl">
                    Tessera OS was founded on a simple premise: LLMs alone are just conversationalists. To do real work, they need a deterministic execution environment with memory, tool routing, and human-in-the-loop safety.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mb-24">
                    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <Target className="text-blue-400 mb-6" size={32} />
                        <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
                        <p className="text-zinc-500 leading-relaxed text-sm">
                            To empower teams by abstracting away the tedious, repetitive digital labor, allowing humans to focus purely on creative and highly-strategic decisions.
                        </p>
                    </div>

                    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <Zap className="text-emerald-400 mb-6" size={32} />
                        <h3 className="text-xl font-semibold mb-3">The Technology</h3>
                        <p className="text-zinc-500 leading-relaxed text-sm">
                            Powered by a high-throughput directed acyclic graph (DAG) execution engine that dynamically routes context between specialized AI agents and enterprise databases.
                        </p>
                    </div>

                    <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                        <Rocket className="text-purple-400 mb-6" size={32} />
                        <h3 className="text-xl font-semibold mb-3">The Future</h3>
                        <p className="text-zinc-500 leading-relaxed text-sm">
                            We envision an internet where every enterprise SaaS application is effortlessly "plugged into" Tessera OS via Custom Tools, forming a massive, automated corporate nervous system.
                        </p>
                    </div>
                </div>

                <div className="border-t border-zinc-800/50 pt-20">
                    <h2 className="text-3xl font-bold mb-6">Invest in Tessera</h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
                        We are currently backed by top-tier venture capital firms. If you are a strategic partner interested in accelerating the autonomous enterprise, reach out.
                    </p>
                    <div className="flex justify-center gap-4">
                        <a href="mailto:partners@tesseraos.ai" className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                            Contact Founders
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
