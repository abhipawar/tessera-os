import React from 'react';
import Link from 'next/link';
import { ArrowRight, Box, Cpu, Workflow, Eye, Globe } from 'lucide-react';

const contentMap: Record<string, any> = {
    canvas: {
        title: "Action Canvas",
        tagline: "Where Agents Come to Life",
        desc: "Design complex, multi-modal workflows with our intuitive drag-and-drop React Flow interface. Connect tools, define constraints, and deploy instantly.",
        icon: Workflow,
    },
    engine: {
        title: "Orchestration Engine",
        tagline: "Deterministic Execution",
        desc: "The hyper-fast Rust-inspired execution layer that runs your directed acyclic graphs (DAGs). Zero hallucinations, 100% auditable traces.",
        icon: Cpu,
    },
    discovery: {
        title: "Process Discovery",
        tagline: "Turn Telemetry into SOPs",
        desc: "Install our browser extension and watch as Tessera OS passively records your team's clicks, automatically synthesizing them into deployable Agent workflows.",
        icon: Eye,
    },
    catalog: {
        title: "Global Catalog",
        tagline: "The App Store for Enterprise Work",
        desc: "Don't build from scratch. Instantiate massive, pre-trained AI workflows for HR, Sales, Legal, and IT with a single click.",
        icon: Globe,
    },
    telemetry: {
        title: "Telemetry & Insights",
        tagline: "God-Mode Visibility",
        desc: "Track token usage, cost-per-execution, latency, and agent success rates down to the millisecond across your entire organization.",
        icon: Box,
    }
};

export default function ProductPage({ params }: { params: { slug: string } }) {
    const data = contentMap[params.slug] || {
        title: "Platform Feature",
        tagline: "Coming in V2",
        desc: "We are actively building the next generation of autonomous enterprise tools.",
        icon: Box
    };

    const Icon = data.icon;

    return (
        <div className="min-h-screen bg-[#09090b] text-white pt-32 pb-20 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
                    <Icon size={16} /> Platform
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500">
                    {data.title}
                </h1>

                <p className="text-2xl text-zinc-400 mb-8 font-light">
                    {data.tagline}
                </p>

                <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed">
                    {data.desc}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/login" className="px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2">
                        Get Early Access <ArrowRight size={18} />
                    </Link>
                    <a href="mailto:enterprise@tesseraos.ai" className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-800 transition-colors">
                        Request Custom Demo
                    </a>
                </div>
            </div>
        </div>
    );
}
