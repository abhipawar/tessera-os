'use client'

import Link from 'next/link'
import { ArrowRight, Bot, BrainCircuit, Database, Lock, Network, ShieldCheck, Cpu, GitBranch, Zap, Code2, Server, Users, Eye } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-blue-500/30 font-sans overflow-x-hidden">

      {/* 1. Global Navigation / Header */}
      <header className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Network size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Tessera OS</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/onboarding" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)]">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">

        {/* 2. Hero Section */}
        <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          {/* Background Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Enterprise-Grade Agent Orchestration.
            </div>

            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter leading-[1.1] mb-8">
              The Autonomous <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-300">
                Workforce.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-10 font-light leading-relaxed">
              Design, compile, and deploy an autonomous digital workforce. Stop building brittle workflows and start managing intelligent agents that reason, code, and execute.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/onboarding" className="group h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]">
                Deploy Your Digital Workforce
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="h-14 px-8 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-full font-semibold flex items-center transition-all">
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Problem / Solution Ribbon */}
        <section className="border-y border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm relative py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-px bg-zinc-800/50 border border-zinc-800/50 rounded-2xl overflow-hidden animate-in fade-in duration-1000 delay-300">

              {/* Old Way */}
              <div className="bg-zinc-900 p-8">
                <div className="text-red-400 text-sm font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
                  <XCircleIcon /> The Old Way
                </div>
                <ul className="space-y-4 text-zinc-400">
                  <RibbonItem title="Rigid IF/ELSE Logic" desc="Workflows fail silently when complex data deviates from hardcoded formatting." />
                  <RibbonItem title="Machine-Only Processes" desc="Pausing automated pipelines for human oversight requires highly complex engineering." />
                  <RibbonItem title="Stateless Execution" desc="Linear scripts trigger, run once, and die with zero contextual memory." />
                </ul>
              </div>

              {/* Tessera Way */}
              <div className="bg-zinc-900 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="text-emerald-400 text-sm font-bold tracking-wider uppercase mb-6 flex items-center gap-2 relative z-10">
                  <CheckCircleIcon /> The Tessera Way
                </div>
                <ul className="space-y-4 text-zinc-300 relative z-10">
                  <RibbonItem title="Cognitive Orchestration" desc="Supervisors understand nuance and route tasks dynamically without brittle regex." />
                  <RibbonItem title="Controlled Autonomy" desc="Run fully autonomous workflows, or natively inject approval checkpoints for human sign-off." />
                  <RibbonItem title="Persistent AI Memory" desc="Graph-backed agents retain deep context. Collaborate across multiple conversational turns." />
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* 4. Target Audience Value Props */}
        <section className="max-w-7xl mx-auto px-6 py-32">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Human-Machine Synergy */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-3xl hover:border-zinc-700 transition-colors group">
              <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="text-zinc-300" size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Controlled Autonomy</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">
                Full autonomy with optional oversight. Deploy a digital workforce that runs entirely on its own, or seamlessly inject approval checkpoints where agents deterministically pause to request human authorization before critical actions.
              </p>
            </div>

            {/* Enterprises */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-3xl hover:border-zinc-700 transition-colors group">
              <div className="w-14 h-14 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">Secure, Edge-Deployed AI</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">
                For Enterprises. Seamless integration with legacy systems via Bring Your Own Cloud (BYOC) and Bring Your Own Key (BYOK). Zero sensitive data leaves your VPC wrapper.
              </p>
            </div>

            {/* Investors */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-3xl hover:border-zinc-700 transition-colors group">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-3">The Infinite Moat</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">
                For Investors. Tessera isn't a wrapper. It's a self-coding intelligent network that compounds in value over time as agents permanently map and master unknown enterprise UIs.
              </p>
            </div>

          </div>
        </section>

        {/* 5. Feature Grid (The Studio) */}
        <section className="bg-zinc-900 border-y border-zinc-800 py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8">
              <h2 className="text-4xl font-bold mb-4">Orchestrate the Unimaginable</h2>
              <p className="text-xl text-zinc-400">Tessera's Studio transforms visual organizational charts into highly resilient, compiled Python LangGraph architectures.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

              <FeatureCard
                icon={<Network />}
                title="Drag-and-Drop Org Chart"
                desc="Visually connect global agents onto a canvas. Define managers, workers, and reporting structures effortlessly."
              />
              <FeatureCard
                icon={<GitBranch />}
                title="Cognitive Routing"
                desc="Top-level Supervisors autonomously decompose complex language requests and route them to their specialized direct reports without writing IF/ELSE statements."
              />
              <FeatureCard
                icon={<Database />}
                title="Stateful Vector Memory"
                desc="Powered by Supabase's PostgresSaver, agents have persistent memory. Pick up a conversation from exactly where it left off weeks ago."
              />
              <FeatureCard
                icon={<Eye />}
                title="Process Discovery"
                desc="A background Chrome extension quietly observes your top performers and uses a Synthesis Engine to auto-generate the standard operating procedures for your agents."
              />
              <FeatureCard
                icon={<Code2 />}
                title="Dynamic Tool Injection"
                desc="Equip agents with specific API credentials or database access so they can act securely within your enterprise bounds."
              />
              <FeatureCard
                icon={<Zap />}
                title="LLM Independence"
                desc="Don't get locked in. Mix and match OpenAI, Anthropic, or Gemini models on a per-agent basis to optimize costs."
              />

            </div>
          </div>
        </section>

        {/* 6. The Flywheel (Investor Catnip) */}
        <section className="max-w-7xl mx-auto px-6 py-32 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-900/10 blur-[150px] pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
            <div className="lg:w-1/2">
              <div className="text-emerald-400 font-bold tracking-widest uppercase text-sm mb-4">The Self-Coding Engine</div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">The platform that learns. By writing code.</h2>
              <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                When a Tessera agent encounters a legacy UI or an undocumented API it doesn't understand, it doesn't fail. Instead, it spins up a secure, ephemeral MicroVM, writes a custom Python script to navigate the obstacle, tests it, and then commits that learned capability to the Global Catalog for your entire organization to use forever.
              </p>
              <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
                <div className="flex items-center gap-2"><CheckCircleIcon className="text-emerald-500" /> Ephemeral MicroVMs</div>
                <div className="flex items-center gap-2"><CheckCircleIcon className="text-emerald-500" /> Auto-Generated CI/CD</div>
              </div>
            </div>

            {/* Fake Terminal UI */}
            <div className="lg:w-1/2 w-full">
              <div className="bg-[#0D1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="h-10 border-b border-zinc-800 flex items-center px-4 gap-2 bg-[#161B22]">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="ml-4 text-xs font-mono text-zinc-500">agent_execution_engine.py</div>
                </div>
                <div className="p-6 font-mono text-sm leading-relaxed overflow-hidden">
                  <div className="text-zinc-500 line-through mb-1"># Error: Unable to locate element on SAP Legacy Dashboard</div>
                  <div className="text-blue-400 mb-1">&gt; Initiating Cognitive Bypass...</div>
                  <div className="text-emerald-400 mb-1">&gt; Writing custom playwright automation script...</div>
                  <div className="text-purple-400 mb-1">def bypass_legacy_auth():</div>
                  <div className="text-zinc-300 ml-4 mb-1">page.goto("https://internal.legacy.corp")</div>
                  <div className="text-zinc-300 ml-4 mb-1">page.evaluate("document.getElementById('hidden_token').value")</div>
                  <div className="text-emerald-400 mt-3">&gt; Test passed. Execution successful.</div>
                  <div className="text-blue-400">&gt; Committing tool to Universal Semantic Catalog...</div>
                  <div className="mt-4 flex gap-2 animate-pulse">
                    <div className="w-2 h-4 bg-white/80"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Deployment Split */}
        <section className="border-t border-zinc-800 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-6 py-24">
            <h2 className="text-3xl font-bold text-center mb-16">Deployment Architectures</h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Cloud SaaS */}
              <div className="border border-zinc-800 bg-zinc-900/30 p-10 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[40px] rounded-full" />
                <Server className="text-blue-400 mb-6" size={32} />
                <h3 className="text-2xl font-bold mb-4">Cloud SaaS Tier</h3>
                <p className="text-zinc-400 mb-6">Instant onboarding. Fully managed infrastructure. Perfect for agile startups and scale-ups ready to transform their headcount dynamics immediately.</p>
                <ul className="space-y-3 pl-4 text-sm text-zinc-300">
                  <li className="list-disc marker:text-blue-500">Multi-tenant isolation</li>
                  <li className="list-disc marker:text-blue-500">Global Catalog Access</li>
                  <li className="list-disc marker:text-blue-500">Pre-built LLM Integrations</li>
                </ul>
              </div>

              {/* Edge Tier */}
              <div className="border border-zinc-800 bg-zinc-900/30 p-10 rounded-3xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full" />
                <Lock className="text-emerald-400 mb-6" size={32} />
                <h3 className="text-2xl font-bold mb-4">Enterprise Edge Tier</h3>
                <p className="text-zinc-400 mb-6">Zero-trust architecture. Deploy Tessera natively inside your own Virtual Private Cloud. Your data, your models, your exact governance rules.</p>
                <ul className="space-y-3 pl-4 text-sm text-zinc-300">
                  <li className="list-disc marker:text-emerald-500">Single-tenant bare metal</li>
                  <li className="list-disc marker:text-emerald-500">Local LLM compatibility</li>
                  <li className="list-disc marker:text-emerald-500">Air-gapped secure execution</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

// Mini Components
function XCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
  )
}

function CheckCircleIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
  )
}

function ZodiacIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300"><path d="M12 3a9 9 0 1 0 9 9" /><path d="M19 3v4" /><path d="M21 5h-4" /><path d="M15 21v-4" /><path d="M17 19h-4" /></svg>
  )
}

function RibbonItem({ title, desc }: { title: string, desc: string }) {
  return (
    <li className="flex flex-col">
      <span className="font-semibold text-white mb-1">{title}</span>
      <span className="text-sm">{desc}</span>
    </li>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl hover:bg-zinc-900/50 transition-colors">
      <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center mb-6 text-zinc-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  )
}