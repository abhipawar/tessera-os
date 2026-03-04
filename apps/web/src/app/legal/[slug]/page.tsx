import React from 'react';
import { Scale } from 'lucide-react';

export default function LegalPage({ params }: { params: { slug: string } }) {
    const isPrivacy = params.slug === 'privacy';

    return (
        <div className="min-h-screen bg-[#09090b] text-white pt-32 pb-20 border-t border-zinc-900">
            <div className="max-w-3xl mx-auto px-6">

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium mb-6">
                    <Scale size={14} /> Legal & Compliance
                </div>

                <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">
                    {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
                </h1>

                <p className="text-sm text-zinc-500 mb-12 border-b border-zinc-800/50 pb-8">
                    Last Updated: March 2026
                </p>

                <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-relaxed prose-h2:mt-12 prose-h2:mb-4">
                    <p>
                        {isPrivacy
                            ? "At Tessera AI, Inc., we take the privacy and security of your enterprise data extremely seriously. This policy describes how we collect, use, and handle your information."
                            : "These Terms of Service govern your use of the Tessera OS platform, Orchestration Engine, and associated APIs. By accessing our services, you agree to these enterprise terms."
                        }
                    </p>

                    <h2>1. Data Ownership</h2>
                    <p>
                        You retain full ownership of all workflows, prompts, and synthetic data generated within your private tenant. Tessera OS acts strictly as a data processor. We do not use your proprietary workflows to train our base orchestration models.
                    </p>

                    <h2>2. Security & Encryption</h2>
                    <p>
                        All API keys and external tool credentials stored in the platform are encrypted at rest using AES-256 and Fernet symmetric encryption. Data in transit is protected via TLS 1.3.
                    </p>

                    <h2>3. Compliance (SOC2)</h2>
                    <p>
                        Tessera AI is currently undergoing SOC2 Type II compliance audits. If you require a copy of our attestation report, please email <a href="mailto:security@tesseraos.ai" className="text-blue-400">security@tesseraos.ai</a>.
                    </p>
                </div>

            </div>
        </div>
    );
}
