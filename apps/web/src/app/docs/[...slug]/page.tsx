import React from 'react';
import Link from 'next/link';
import { BookOpen, Terminal, Code, Shield } from 'lucide-react';

export default async function DocsPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const resolvedParams = await params;
    const section = resolvedParams.slug?.[0] || 'overview';

    return (
        <div className="min-h-screen bg-[#09090b] text-white pt-32 pb-20 border-t border-zinc-900">
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">

                {/* Simulated Sidebar */}
                <div className="hidden md:block col-span-1 border-r border-zinc-800/50 pr-8">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Developers</div>
                    <ul className="space-y-3">
                        <li><Link href="/docs/overview" className={`block px-3 py-2 rounded-md ${section === 'overview' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors'}`}>Documentation</Link></li>
                        <li><Link href="/docs/api" className={`block px-3 py-2 rounded-md ${section === 'api' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors'}`}>API Reference</Link></li>
                        <li><Link href="/docs/sdk" className={`block px-3 py-2 rounded-md ${section === 'sdk' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors'}`}>Custom Tool SDK</Link></li>
                        <li><Link href="/docs/byoc" className={`block px-3 py-2 rounded-md ${section === 'byoc' ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors'}`}>Bring Your Own Cloud</Link></li>
                    </ul>
                </div>

                {/* Main Content Area */}
                <div className="col-span-1 md:col-span-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium mb-6">
                        <Terminal size={14} /> v2.4 Developer Preview
                    </div>

                    <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
                        {section === 'overview' && 'Documentation'}
                        {section === 'api' && 'REST API Reference'}
                        {section === 'sdk' && 'Custom Tool SDK'}
                        {section === 'byoc' && 'Bring Your Own Cloud (BYOC)'}
                    </h1>

                    <p className="text-lg text-zinc-400 mb-12">
                        Building deterministic AI systems requires powerful primitives. Our developer tools give you bare-metal access to the Tessera routing engine.
                    </p>

                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                        <Code size={48} className="text-zinc-700 mb-6" />
                        <h3 className="text-xl font-semibold mb-2 text-zinc-200">Developer Portal Locked</h3>
                        <p className="text-zinc-500 mb-6 max-w-sm">
                            Access to the full API reference and SDK binaries requires an active enterprise tenant token.
                        </p>
                        <Link href="/login" className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors">
                            Authenticate to View
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}
