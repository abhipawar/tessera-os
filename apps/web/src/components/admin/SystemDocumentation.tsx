"use client";

import React, { useState } from 'react';
import { Network, Server, Code, Workflow, BookOpen, AlertTriangle, Lightbulb, Compass, GitBranch, ArrowRight, CheckCircle2, Shield, TrendingUp, Cpu, Lock, Database, Eye, Clock, Box, MonitorPlay, Mic, Headphones, PhoneCall, Volume2, Video } from 'lucide-react';

export default function SystemDocumentation() {
  const [activeTab, setActiveTab] = useState('architecture');

  const tabs = [
    { id: 'architecture', label: 'Architecture & Ecosystem', icon: Network },
    { id: 'security', label: 'Security & Governance', icon: Shield },
    { id: 'topologies', label: 'Agent Topologies', icon: Workflow },
    { id: 'e2b', label: 'E2B Sandboxed Execution', icon: Cpu },
    { id: 'vlm', label: 'VLM', icon: Eye, soon: true },
    { id: 'audio', label: 'Voice AI Engine', icon: Mic, soon: true },
    { id: 'recorder', label: 'Process Recorder & Replayer', icon: Video },
    { id: 'telemetry', label: 'Telemetry & Discovery', icon: ActivityIcon },
    { id: 'scale', label: 'Cost & Scalability', icon: TrendingUp },
    { id: 'strategy', label: 'Strategy & Vision', icon: Compass },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl my-8">
      <div className="p-6 border-b border-zinc-800 bg-zinc-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="text-indigo-400" />
            Superadmin Blueprint
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">Strictly confidential system-level documentation & strategic gap analysis.</p>
        </div>
      </div>

      {/* Modern Pill Tabs */}
      <div className="flex flex-wrap gap-2 p-4 bg-zinc-950/30 border-b border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-inner'
                : 'bg-zinc-900 text-zinc-500 border border-transparent hover:text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <tab.icon size={16} className={tab.soon ? 'text-indigo-400/50' : ''} />
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.soon && (
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider relative -top-[1px]">
                  Coming Soon
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="p-6 text-zinc-300 text-sm leading-relaxed max-h-[600px] overflow-y-auto custom-scrollbar">
        
        {/* TECH STACK & DEPLOYMENT */}
        {/* TAB 1: ARCHITECTURE & ECOSYSTEM */}
        {activeTab === 'architecture' && (
          <div className="space-y-8 animate-fade-in">
            {/* 1. Global Deployment */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Server className="text-indigo-400"/> Tech Stack & Global Deployment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
                  <h4 className="text-emerald-400 font-bold mb-2">Frontend (Vercel)</h4>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong>Next.js 15:</strong> Server components & App Router for highly secure layouts.</li>
                    <li><strong>ReactFlow:</strong> Visual orchestration DAG canvas.</li>
                    <li><strong>Zustand:</strong> Fast, un-opinionated state management.</li>
                    <li><strong>Tailwind CSS:</strong> Rapid UI token implementation.</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
                  <h4 className="text-blue-400 font-bold mb-2">Backend (Railway)</h4>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong>FastAPI (Python):</strong> High-performance AI orchestration API.</li>
                    <li><strong>LangGraph / LangChain:</strong> Core async state machine execution.</li>
                    <li><strong>SQLAlchemy / PostgREST:</strong> Direct ORM mappings where needed.</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
                  <h4 className="text-purple-400 font-bold mb-2">Database & Auth (Supabase)</h4>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong>PostgreSQL:</strong> Master data storage with PgBouncer pools.</li>
                    <li><strong>Supabase Auth:</strong> Secure multi-tenant SSR hydration.</li>
                    <li><strong>Row Level Security (RLS):</strong> Hardware-level tenant isolation.</li>
                  </ul>
                </div>
                <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800">
                  <h4 className="text-orange-400 font-bold mb-2">Edge Routing (Cloudflare)</h4>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li><strong>Cloudflare Workers:</strong> Headless webhook mappings.</li>
                    <li><strong>Inbound Email Ingestion:</strong> Catch-all email routing mapped to Thread IDs.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. System Design Paradigm */}
            <div className="border-t border-zinc-800 pt-8">
               <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Code className="text-indigo-400"/> System Design Paradigm</h3>
               <p className="text-zinc-400">Tessera OS is engineered utilizing a strictly decoupled micro-services philosophy designed for AI-native workloads.</p>
               
               <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 my-6">
                  <h4 className="text-sm font-bold text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Full Request Lifecycle Flow</h4>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
                     <div className="px-4 py-2 border border-zinc-700 rounded bg-zinc-900 text-xs shadow-md"><span className="text-blue-400 font-bold block mb-1">1. Presentation</span>User Interaction (UI)</div>
                     <ArrowRight size={14} className="text-zinc-600 hidden md:block" />
                     <div className="px-4 py-2 border border-zinc-700 rounded bg-zinc-900 text-xs shadow-md"><span className="text-emerald-400 font-bold block mb-1">2. Gateway</span>Next.js Reverse Proxy</div>
                     <ArrowRight size={14} className="text-zinc-600 hidden md:block" />
                     <div className="px-4 py-2 border border-blue-500/30 rounded bg-blue-900/10 text-xs shadow-md"><span className="text-indigo-400 font-bold block mb-1">3. Orchestrator</span>FastAPI Context Inject</div>
                     <ArrowRight size={14} className="text-zinc-600 hidden md:block" />
                     <div className="px-4 py-2 border border-purple-500/30 rounded bg-purple-900/10 text-xs shadow-md"><span className="text-purple-400 font-bold block mb-1">4. Intelligence</span>LangGraph Agents</div>
                     <ArrowRight size={14} className="text-zinc-600 hidden md:block" />
                     <div className="px-4 py-2 border border-amber-500/30 rounded bg-amber-900/10 text-xs shadow-md"><span className="text-amber-400 font-bold block mb-1">5. Persistence</span>Supabase Postgres</div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="border-l-[3px] border-indigo-500 pl-4 py-2 bg-indigo-500/5 rounded-r">
                    <h4 className="font-bold text-indigo-300">The Presentation Layer (Tethered)</h4>
                    <p className="text-zinc-400 mt-1 text-xs">The frontend strictly acts as a stateless terminal. It parses AST schemas from the backend to dynamically render complex configuration UIs. It utilizes long-polling to listen for server updates.</p>
                  </div>
                  <div className="border-l-[3px] border-emerald-500 pl-4 py-2 bg-emerald-500/5 rounded-r">
                    <h4 className="font-bold text-emerald-300">The Context Pipeline (Stateless Router)</h4>
                    <p className="text-zinc-400 mt-1 text-xs">FastAPI acts as a robust traffic cop. When it receives a triggering event, it queries Supabase for the specific Tenant's decrypted Tool API Keys and compiles these states into an ephemeral execution context.</p>
                  </div>
               </div>
            </div>

            {/* 3. Architecture Topology Flow */}
            <div className="border-t border-zinc-800 pt-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Network className="text-indigo-400"/> Logical Architecture Topology</h3>
              <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 overflow-x-auto custom-scrollbar">
                <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-center min-w-[600px]">
                  <div className="flex flex-col items-center">
                     <div className="p-4 border-2 border-dashed border-blue-500/50 rounded-lg bg-blue-900/10 w-40 relative">
                       <span className="font-bold text-blue-400">1. Trigger Event</span><br/>
                       <span className="text-xs text-zinc-500">Cron, UI, Hook</span>
                       <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-zinc-600 hidden md:block">➔</div>
                     </div>
                  </div>
                  <div className="flex flex-col items-center">
                     <div className="p-4 border-2 border-solid border-emerald-500/50 rounded-lg bg-emerald-900/10 w-40 relative shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                       <span className="font-bold text-emerald-400">2. DAG Compile</span><br/>
                       <span className="text-xs text-zinc-500">FastAPI ReactFlow</span>
                       <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-zinc-600 hidden md:block">➔</div>
                     </div>
                  </div>
                  <div className="flex flex-col items-center">
                     <div className="p-4 border-2 border-solid border-purple-500/50 rounded-lg bg-purple-900/10 w-40 relative shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                       <span className="font-bold text-purple-400">3. Orchestration</span><br/>
                       <span className="text-xs text-zinc-500">LangGraph (State)</span>
                       <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-zinc-600 hidden md:block">➔</div>
                     </div>
                     <div className="h-4 w-px bg-zinc-700 my-1"></div>
                     <div className="p-2 border border-zinc-700 rounded bg-zinc-900 text-[10px] text-zinc-400">Supabase Checkpoint Sync</div>
                  </div>
                  <div className="flex flex-col items-center">
                     <div className="p-4 border-2 border-dashed border-amber-500/50 rounded-lg bg-amber-900/10 w-40">
                       <span className="font-bold text-amber-400">4. Execution</span><br/>
                       <span className="text-xs text-zinc-500">LLM Tool Invocation</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY & GOVERNANCE */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Shield className="text-indigo-400"/> Security & Hardware Isolation</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-zinc-950 p-5 rounded-lg border-2 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)] text-center">
                  <Database className="text-emerald-400 mx-auto mb-3" size={32} />
                  <h4 className="text-emerald-300 font-bold mb-2">Hardware Tenant Isolation</h4>
                  <p className="text-xs text-zinc-400">All Postgres data is filtered by strictly enforced Supabase Row Level Security (RLS). Cross-org data leaks are blocked mechanically at the database level.</p>
               </div>
               <div className="bg-zinc-950 p-5 rounded-lg border-2 border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.05)] text-center">
                  <Lock className="text-indigo-400 mx-auto mb-3" size={32} />
                  <h4 className="text-indigo-300 font-bold mb-2">FERNET Credential Vault</h4>
                  <p className="text-xs text-zinc-400">User API keys (Salesforce, Zendesk) are never stored in plaintext. They are encrypted via FERNET on the backend and injected ephemerally into LangChain headers.</p>
               </div>
               <div className="bg-zinc-950 p-5 rounded-lg border-2 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)] text-center">
                  <AlertTriangle className="text-amber-400 mx-auto mb-3" size={32} />
                  <h4 className="text-amber-300 font-bold mb-2">Browser PII Scrubbing</h4>
                  <p className="text-xs text-zinc-400">Our Chrome extension locally parses all DOM text using regex heuristics. SSNs, credit cards, and emails are scrubbed before HTTP requests ever trigger.</p>
               </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-900/20 to-transparent border-l-4 border-emerald-500 p-5 rounded-r">
               <h4 className="font-bold text-emerald-400">Next.js Edge JWT Validation</h4>
               <p className="text-sm text-zinc-300 mt-2">Every inbound request runs through a Vercel Edge Middleware function. Token signatures are validated, and the user's `current_tenant_id` is stamped onto all NextJS headers before hitting any protected routes or passing to the Python FastAPI backend.</p>
            </div>
          </div>
        )}

        {/* TAB 3: AGENTIC TOPOLOGIES */}
        {activeTab === 'topologies' && (
          <div className="space-y-6 animate-fade-in">
             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Workflow className="text-indigo-400"/> Explicit Agentic Topologies</h3>
             <p className="text-zinc-400">Tessera OS enables deterministic execution paths, ensuring LLMs cannot arbitrarily trigger unauthorized tool workflows.</p>
             
             <div className="space-y-6 mt-8">
                {/* Supervisor Block */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 relative shadow-inner">
                   <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg">TOPOLOGY 1</div>
                   <h4 className="font-bold text-white mb-4">Supervisor-Worker Networks</h4>
                   <div className="flex justify-center items-center h-40 relative">
                     <div className="absolute top-2 w-32 py-2 bg-blue-600 rounded text-center text-xs font-bold text-white z-10">Meta-Agent Supervisor</div>
                     
                     <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                         <path d="M50% 30% C40% 50%, 30% 60%, 25% 75%" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="4 2"/>
                         <path d="M50% 30% C60% 50%, 70% 60%, 75% 75%" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="4 2"/>
                     </svg>
                     
                     <div className="absolute bottom-4 left-1/4 -ml-16 w-32 py-2 bg-zinc-800 border border-blue-500/50 rounded text-center text-[10px] text-blue-300 z-10">Math Execution Worker</div>
                     <div className="absolute bottom-4 right-1/4 -mr-16 w-32 py-2 bg-zinc-800 border border-blue-500/50 rounded text-center text-[10px] text-blue-300 z-10">Data Retrieval Worker</div>
                   </div>
                   <p className="text-[11px] text-zinc-500 text-center mt-2">The Supervisor dynamically evaluates the input and routes sub-tasks to highly specialized, sandboxed workers.</p>
                </div>

                {/* HITL Block */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 relative shadow-inner">
                   <div className="absolute top-0 right-0 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg">TOPOLOGY 2</div>
                   <h4 className="font-bold text-white mb-4">Human-in-the-Loop (HITL) Checkpointing</h4>
                   <div className="flex items-center justify-center gap-4 text-center h-20">
                      <div className="px-4 py-2 border border-zinc-700 bg-zinc-800 rounded text-xs text-zinc-300 z-10">Data Agent</div>
                      <ArrowRight size={16} className="text-zinc-600" />
                      <div className="px-4 py-3 border-2 border-amber-500 rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 z-10 animate-pulse">Wait for User Inbox Approval</div>
                      <ArrowRight size={16} className="text-zinc-600" />
                      <div className="px-4 py-2 border border-zinc-700 bg-zinc-800 rounded text-xs text-zinc-300 z-10">Action Agent</div>
                   </div>
                   <p className="text-[11px] text-zinc-500 text-center mt-2">LangGraph suspends thread execution until a human Superadmin explicitly clicks Approve.</p>
                </div>
             </div>
          </div>
        )}

        {/* TAB 4: E2B EXECUTION */}
        {activeTab === 'e2b' && (
          <div className="space-y-6 animate-fade-in">
             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Cpu className="text-indigo-400"/> E2B Sandboxed Execution Tooling</h3>
             <p className="text-zinc-400">Tessera OS utilizes isolated E2B Micro-VMs allowing AI agents to generate, execute, and validate real code on-the-fly without risking host system security.</p>
             
             <div className="mt-8 border border-zinc-800 rounded-lg bg-zinc-950 overflow-hidden shadow-2xl">
                <div className="bg-black/50 p-2 border-b border-zinc-800 flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500"></div>
                   <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                   <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                   <span className="text-[10px] text-zinc-500 ml-4 font-mono">e2b-sandbox-terminal</span>
                </div>
                
                <div className="p-6 font-mono text-xs">
                   <div className="text-emerald-400 mb-2">▶ [Agent Log]: Target API returns malformed CSV payload. Generating pandas dataframe parser logic...</div>
                   
                   <div className="bg-zinc-900 border border-zinc-800 p-4 rounded text-zinc-300 mt-4">
                      <span className="text-blue-400">import</span> pandas <span className="text-blue-400">as</span> pd<br/>
                      <span className="text-blue-400">import</span> io<br/><br/>
                      <span className="text-zinc-500"># Generated on-the-fly to handle arbitrary edge case</span><br/>
                      df = pd.read_csv(io.StringIO(api_response))<br/>
                      cleaned_data = df.dropna().to_json(orient="records")<br/>
                      print(cleaned_data)
                   </div>

                   <div className="text-indigo-400 mt-6 mb-2">▶ [E2B VM Executing] Spinning up micro-vm with python3...</div>
                   <div className="text-zinc-500 mb-2">stdout: </div>
                   <div className="bg-black p-3 rounded border border-zinc-800 text-amber-300 font-bold">
                      [{'{"id": 412, "status": "active"}'}, {'{"id": 413, "status": "pending"}'}]
                   </div>
                   
                   <div className="text-emerald-400 mt-4">▶ [Agent Log]: Code executed successfully. Asserting returned JSON into workflow state memory.</div>
                </div>
             </div>

             <div className="border border-indigo-500/30 bg-indigo-500/5 rounded p-4 mt-6">
                <h4 className="font-bold text-indigo-400 text-sm">Enterprise Benefit</h4>
                <p className="text-zinc-400 text-xs mt-1">Unlike standard LLMs that generate code for *humans* to copy-paste, the E2B Sandbox enables "Code Interpreting" directly within the async graph. Agents can write secure Python, run it instantly, visually verify the output array, and proceed with automation without manual human deployment.</p>
             </div>
          </div>
        )}

        {/* TAB 5: VLM LOGISTICS */}
        {activeTab === 'vlm' && (
          <div className="space-y-6 animate-fade-in">
             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <Eye className="text-indigo-400" />
               Conceptual Architecture Synthesis: VLM Logistics
             </h3>
             <p className="text-zinc-400">
               An enterprise AI agent platform orchestrating long-running logistics workflows. This architecture illustrates the mechanical distinction between durable orchestration (Temporal), cognitive reasoning (LangGraph), and secure localized execution (ephemeral VLMs).
             </p>

             {/* VLM ARCHITECTURE VISUALIZATION */}
             <div className="mt-8 border border-zinc-800 rounded-lg bg-zinc-950 p-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <Network size={200} />
                </div>
                
                <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-sm mb-8 text-center border-b border-zinc-800 pb-4">Multi-Modal Logistics Pipeline</h4>
                
                <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
                   
                   {/* Zone 1 & 5 Row */}
                   <div className="flex flex-col md:flex-row justify-between items-start gap-4 z-10 relative">
                       {/* Zone 1 */}
                       <div className="flex-1 w-full border-2 border-dashed border-indigo-500/30 bg-indigo-900/10 rounded-xl p-4 transition-all hover:bg-indigo-900/20">
                          <h5 className="text-indigo-400 font-bold text-xs mb-2 flex items-center gap-2"><ArrowRight size={14}/> Zone 1: Ingestion & Triage Layer</h5>
                          <div className="flex flex-col gap-2">
                             <div className="bg-zinc-900 border border-zinc-700 p-2 rounded text-[10px] text-zinc-300 shadow">
                                Unstructured Sources (Email, Legacy Webhooks)
                             </div>
                             <div className="bg-indigo-900/30 border border-indigo-500/50 p-2 rounded text-[10px] shadow text-indigo-200">
                                <span className="font-bold text-indigo-300 block mb-1">Triage Agent (Llama-3-8B classifier)</span>
                                Classifies intent & determines "Agentic" vs "Deterministic" mapping.
                             </div>
                          </div>
                          <p className="text-[9px] text-indigo-300/60 mt-2 text-center uppercase">Routes to Durable Logic Pathway</p>
                       </div>
                       
                       {/* Connector (hidden on mobile) */}
                       <div className="w-16 hidden md:flex items-center justify-center pt-10 text-zinc-600 font-bold">
                           ~
                       </div>

                       {/* Zone 5 */}
                       <div className="flex-1 w-full border-2 border-solid border-amber-500/30 bg-amber-900/10 rounded-xl p-4 transition-all hover:bg-amber-900/20">
                          <h5 className="text-amber-400 font-bold text-xs mb-2 flex items-center gap-2"><CheckCircle2 size={14}/> Zone 5: System of Record</h5>
                          <div className="flex flex-col gap-2">
                             <div className="bg-zinc-900 border border-amber-700/50 p-2 rounded text-[10px] shadow text-zinc-300 flex items-center justify-between">
                                <span>Enterprise ERP (Odoo / SAP)</span>
                                <Database size={12} className="text-amber-500" />
                             </div>
                             <div className="bg-amber-900/30 border border-amber-500/50 p-2 rounded text-[10px] shadow text-amber-200 flex items-center justify-between">
                                <span>Human-in-the-Loop Gateway</span>
                                <Lock size={12} className="text-amber-400" />
                             </div>
                          </div>
                          <p className="text-[9px] text-amber-600/60 mt-2 text-center uppercase">Physical State & Approvals</p>
                       </div>
                   </div>

                   <div className="flex justify-center text-zinc-700">
                      <div className="h-6 w-px bg-zinc-700"></div>
                   </div>

                   {/* Zone 2 (Center Pivot) */}
                   <div className="w-full border-2 border-solid border-blue-500/40 bg-blue-900/20 rounded-xl p-6 z-10 relative shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20">
                       <h5 className="text-blue-400 font-bold text-xs mb-4 text-center flex items-center justify-center gap-2 uppercase tracking-wide"><Clock size={16} /> Zone 2: Durable Orchestration (Temporal)</h5>
                       <div className="flex flex-col md:flex-row justify-center items-stretch gap-4">
                          <div className="flex-[0.8] bg-zinc-900 border-2 border-blue-800/50 p-3 rounded-lg text-center text-[10px] shadow-lg text-zinc-300 flex flex-col justify-center">
                             <strong className="text-blue-300 text-xs mb-1 block">Temporal Server</strong>
                             <span className="text-zinc-500">Workflow History Database (Persistence Matrix)</span>
                          </div>
                          <div className="flex text-blue-500 items-center justify-center">
                             ⟷
                          </div>
                          <div className="flex-1 bg-blue-900/40 border-2 border-blue-500/50 p-3 rounded-lg flex flex-col justify-center items-center text-center text-[10px] shadow-lg text-blue-200">
                             <strong className="text-blue-100 text-xs mb-1 block">Temporal Worker Cluster</strong>
                             <span className="text-blue-300/80">Manages workflow lifecycle, HITL sleep timers, exponential retries, context routing.</span>
                          </div>
                       </div>
                   </div>

                   <div className="flex justify-around md:justify-between md:px-24 text-zinc-700">
                      <div className="flex items-center text-zinc-500 text-[10px] gap-2"><div className="h-6 w-px bg-zinc-700"></div> Invokes Agent Edge</div>
                      <div className="flex items-center text-zinc-500 text-[10px] gap-2">Spins Sandbox <div className="h-6 w-px bg-zinc-700"></div></div>
                   </div>

                   {/* Zone 3 & 4 Row */}
                   <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 z-10 relative">
                       {/* Zone 3 */}
                       <div className="flex-[1.2] border-2 border-solid border-purple-500/30 bg-purple-900/10 rounded-xl p-4 flex flex-col transition-all hover:bg-purple-900/20 hover:border-purple-500/50 mt-4 md:mt-0">
                          <h5 className="text-purple-400 font-bold text-xs mb-4 flex items-center gap-2"><MonitorPlay size={14}/> Zone 3: Cognitive Layer</h5>
                          <div className="flex-1 flex flex-col justify-between gap-4">
                             <div className="bg-purple-900/40 border border-purple-500/50 p-3 rounded-lg text-xs shadow-inner text-purple-200 text-center relative overflow-hidden flex flex-col gap-1 items-center justify-center">
                                <span className="font-bold relative z-10 text-white">LangGraph Agent</span>
                                <span className="relative z-10 text-[9px] uppercase tracking-wider text-purple-300">(ReAct State Loop)</span>
                                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent animate-pulse"></div>
                             </div>
                             
                             <div className="flex flex-col items-center py-1 relative">
                                <span className="text-[9px] text-purple-200 bg-purple-500/40 border border-purple-500/50 px-2 py-0.5 rounded shadow whitespace-nowrap z-10">Generates JSON Call: {`{"click": [X, Y]}`}</span>
                                <div className="absolute h-full w-px bg-purple-500/50 top-0 left-1/2 -translate-x-1/2"></div>
                             </div>

                             <div className="bg-zinc-900 border border-purple-700/50 p-3 rounded-lg text-[10px] text-zinc-300 shadow relative">
                                <span className="font-bold text-purple-300 block mb-1">VLM Reasoning API</span>
                                <p className="text-zinc-500">(Gemini 1.5 Pro / Claude 3.5). Visual analysis engine mapping UI pixels to deterministic tool coordinates.</p>
                             </div>
                          </div>
                       </div>

                       {/* Zone 4 */}
                       <div className="flex-[1.5] border-2 border-dashed border-red-500/40 bg-red-950/20 rounded-xl p-4 shadow-[0_0_20px_rgba(225,29,72,0.1)] transition-all hover:border-red-500/60 mt-4 md:mt-0 relative overflow-hidden">
                          <h5 className="text-red-400 font-bold text-xs mb-4 flex items-center gap-2 relative z-10"><Box size={14}/> Zone 4: Secure Execution</h5>
                          <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-4 text-[10px] h-full flex flex-col relative z-10">
                             <div className="font-bold text-red-300 mb-4 border-b border-red-500/30 pb-2 text-center uppercase tracking-wider">Ephemeral Desktop Sandbox (Micro-VM)</div>
                             <div className="grid grid-cols-2 gap-3 flex-1 mb-2">
                                <div className="bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-300 text-center flex items-center justify-center shadow">Xvfb Virtual Framebuffer</div>
                                <div className="bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-300 text-center flex items-center justify-center shadow">Target Legacy App</div>
                                <div className="bg-red-500/10 border border-red-500/40 p-2 rounded text-red-200 font-bold text-center flex items-center justify-center shadow animate-pulse">Execution Agent (xdotool API)</div>
                                <div className="bg-zinc-900 border border-zinc-700 p-2 rounded text-zinc-300 text-center flex items-center justify-center shadow">Observation Hub (Screenshot Array)</div>
                             </div>
                             
                             <div className="mt-4 flex flex-col gap-2 relative">
                                <div className="flex justify-between items-center gap-3">
                                   <div className="flex-[0.6] bg-zinc-950 border border-zinc-800 p-2 rounded text-center text-zinc-500">Docker Registry (Pull Image)</div>
                                   <div className="flex-1 bg-amber-900/20 border border-amber-500/30 p-2 rounded text-center text-amber-500/80 font-bold">Secure VNC Human Relay</div>
                                </div>
                             </div>
                          </div>
                       </div>
                   </div>
                </div>
             </div>
             
             {/* Textual Explanation Block */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-blue-900/10 border-l-2 border-blue-500 p-4 rounded-r shadow-sm transition-all hover:bg-blue-900/20">
                   <h4 className="font-bold text-sm text-blue-300">Durable Execution Mechanics</h4>
                   <p className="text-xs text-zinc-400 mt-2 leading-relaxed">Temporal guarantees that multi-hour logistics workflows survive network outages or API timeouts. <strong>Zone 2</strong> acts as the impenetrable state machine backbone—managing exponential retries, crash recovery, and freezing execution arrays indefinitely during Human-in-the-Loop (HITL) manual reviews.</p>
                </div>
                <div className="bg-purple-900/10 border-l-2 border-purple-500 p-4 rounded-r shadow-sm transition-all hover:bg-purple-900/20">
                   <h4 className="font-bold text-sm text-purple-300">Cognitive vs. Physical Discoupling</h4>
                   <p className="text-xs text-zinc-400 mt-2 leading-relaxed"><strong>Zone 3</strong> isolates reasoning. The VLM acts purely as a "brain"—receiving image arrays from the container via LangGraph and replying with deterministic JSON paths. <strong>Zone 4</strong> acts as the "hands"—a highly disposable local sandbox injecting physical simulated xdotool API keystrokes into legacy thick-clients.</p>
                </div>
             </div>
          </div>
        )}

        {/* TAB 6: AUDIO & VOICE AI */}
        {activeTab === 'audio' && (
          <div className="space-y-6 animate-fade-in">
             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <Mic className="text-indigo-400" />
               End-to-End Voice AI Architecture
             </h3>
             <p className="text-zinc-400 leading-relaxed">
               Unlike VLM processes where Temporal spins up a Docker container, the Voice architecture requires managing extreme latency constraints via real-time WebSocket streams, concurrency, and multi-threaded barge-in logic.
             </p>

             <div className="mt-8 border border-zinc-800 rounded-xl bg-zinc-950 p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                   <Headphones size={200} />
                </div>
                
                <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-sm mb-6 text-center border-b border-zinc-800 pb-4">Real-Time Telephony Lifecycle</h4>
                
                <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto relative z-10">
                   
                   {/* Barge-In Interrupt Circuit (Spans the Left Side) */}
                   <div className="absolute -left-4 top-16 bottom-16 w-8 border-l-4 border-y-4 border-red-500/50 rounded-l-2xl z-0 hidden md:block"></div>
                   <div className="absolute left-[-6rem] top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold text-red-500/80 tracking-widest hidden md:block">
                      PHASE 5: BARGE-IN CIRCUIT (VAD)
                   </div>

                   {/* Phase 1: Telephony Handshake */}
                   <div className="border-2 border-indigo-500/30 bg-indigo-900/10 rounded-xl p-4 shadow-sm ml-0 md:ml-8 relative hover:bg-indigo-900/20 transition-all">
                      <div className="absolute -left-[1.35rem] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500/80 animate-pulse hidden md:block shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                      <h5 className="text-indigo-400 font-bold text-xs mb-3 flex items-center gap-2"><PhoneCall size={14}/> Phase 1: The Telephony Handshake</h5>
                      <div className="flex flex-col md:flex-row gap-4">
                         <div className="flex-[0.8] bg-zinc-900 border border-indigo-700/50 p-3 rounded-lg text-[10px] text-zinc-300 shadow">
                            <span className="text-indigo-300 font-bold block mb-1">1. The Trigger</span>
                            Temporal executes API call to SIP Provider (Twilio). Outbound Dial initiates automatically.
                         </div>
                         <div className="flex-1 bg-indigo-900/40 border border-indigo-500/50 p-3 rounded-lg text-[10px] text-indigo-200 shadow">
                            <span className="text-white font-bold block mb-1">2. The Media Stream</span>
                            WebSocket opens directly to FastAPI. Streams raw, base64-encoded <strong>mulaw</strong> audio chunks every 20ms.
                         </div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800 p-2 rounded-md text-[9px] font-mono text-zinc-500 mt-3 text-center tracking-wider">
                         {`{"event": "media", "streamSid": "MZ18...", "media": {"payload": "fHh..."}}`}
                      </div>
                   </div>

                   <div className="flex justify-center text-indigo-500/50 -my-2"><ArrowRight className="rotate-90" size={20}/></div>

                   {/* Phase 2: The Ears (ASR) */}
                   <div className="border-2 border-emerald-500/30 bg-emerald-900/10 rounded-xl p-4 shadow-sm ml-0 md:ml-8 hover:bg-emerald-900/20 transition-all">
                      <h5 className="text-emerald-400 font-bold text-xs mb-3 flex items-center gap-2"><Mic size={14}/> Phase 2: The Ears (Streaming ASR)</h5>
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                         <div className="flex-[0.8] bg-zinc-900 border border-emerald-700/50 p-3 rounded-lg text-[10px] text-zinc-300 shadow w-full">
                            FastAPI pipes the 20ms chunks directly into a secondary outbound WebSocket connected to an Automatic Speech Recognition API (Deepgram/AssemblyAI).
                         </div>
                         <div className="flex-1 bg-emerald-900/30 border border-emerald-500/50 p-3 rounded-lg text-[10px] text-emerald-200 w-full shadow">
                            <span className="font-bold text-white block mb-1">Interim Transcripts:</span>
                            <div className="font-mono mt-1 space-y-0.5">
                                <span className="text-zinc-500">50ms:</span> "Hello"<br/>
                                <span className="text-zinc-400">100ms:</span> "Hello this is"<br/>
                                <span className="text-emerald-400 font-bold">150ms:</span> "Hello this is XPO Logistics." (Final)
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-center text-emerald-500/50 -my-2"><ArrowRight className="rotate-90" size={20}/></div>

                   {/* Phase 3: The Brain (LLM) */}
                   <div className="border-2 border-purple-500/40 bg-purple-900/20 rounded-xl p-6 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20 ml-0 md:ml-8 transition-all hover:bg-purple-900/30">
                      <h5 className="text-purple-400 font-bold text-xs mb-4 flex items-center gap-2"><Cpu size={14}/> Phase 3: The Brain (Streaming LLM & LangGraph)</h5>
                      <div className="flex flex-col md:flex-row gap-4">
                         <div className="flex-1 bg-zinc-900 border border-purple-800/50 p-3 rounded-lg text-[10px] text-zinc-300 shadow-inner flex flex-col justify-center">
                            <span className="text-purple-300 font-bold block mb-1">Context Injection</span>
                            LangGraph packages the system prompt ("You are BackOps AI claim agent...") + the final transcript routing to a speed-optimized model (Claude 3 Haiku).
                         </div>
                         <div className="flex-1 bg-purple-900/40 border-2 border-purple-500/50 p-3 rounded-lg text-[10px] text-purple-200 shadow">
                            <span className="text-white font-bold block mb-1">The Dynamic Router</span>
                            LLM streams tokens. LangGraph parses the stream in real-time.
                            <ul className="mt-2 space-y-2">
                               <li className="flex gap-2 bg-purple-900/50 p-1.5 rounded text-[9px]"><span className="text-purple-400 font-bold w-12">IF TOOL:</span> Sends <span className="font-mono text-zinc-300">{`{"send_dtmf", "1"}`}</span> to Twilio IVR.</li>
                               <li className="flex gap-2 bg-emerald-900/30 p-1.5 rounded text-[9px]"><span className="text-emerald-400 font-bold w-12">IF TEXT:</span> Routes text stream to Phase 4.</li>
                            </ul>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-center text-purple-500/50 -my-2"><ArrowRight className="rotate-90" size={20}/></div>

                   {/* Phase 4: The Mouth (TTS) */}
                   <div className="border-2 border-amber-500/30 bg-amber-900/10 rounded-xl p-4 shadow-sm ml-0 md:ml-8 relative hover:bg-amber-900/20 transition-all">
                      <div className="absolute -left-[1.35rem] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500/80 animate-pulse hidden md:block shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                      <h5 className="text-amber-400 font-bold text-xs mb-3 flex items-center gap-2"><Volume2 size={14}/> Phase 4: The Mouth (Streaming TTS)</h5>
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                         <div className="flex-1 bg-amber-900/30 border border-amber-500/40 p-3 rounded-lg text-[10px] text-amber-200 w-full shadow text-center">
                            <span className="text-white font-bold block mb-1">Sentence Chunking (ElevenLabs)</span>
                            Backend buffers tokens &rarr; Detects punctuation (, or .) &rarr; Instantly fires 1-sentence chunk to TTS engine for localized rendering.
                         </div>
                         <div className="flex-1 bg-zinc-900 border border-amber-700/50 p-3 rounded-lg text-[10px] text-zinc-300 w-full shadow text-center">
                            <span className="text-amber-400 font-bold block mb-1">Twilio PCM Injection</span>
                            Raw synthesized PCM bytes returned via stream, converted to mulaw, and pushed down WebSocket. Human hears AI speak.
                         </div>
                      </div>
                   </div>

                </div>
             </div>

             {/* Barge-In Deep Dive Block */}
             <div className="mt-6 border border-red-500/40 bg-red-950/30 rounded-xl p-6 relative shadow-[0_0_30px_rgba(225,29,72,0.15)] overflow-hidden ring-1 ring-red-500/20">
                <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-bounce z-10">
                   <AlertTriangle size={20} />
                </div>
                <h4 className="font-bold text-red-400 mb-2 uppercase tracking-widest text-sm flex items-center gap-2 relative z-10">Phase 5: The "Barge-in" Interrupt Circuit</h4>
                <p className="text-xs text-zinc-300 mb-6 relative z-10 leading-relaxed">If the human interrupts mid-sentence, the system must <strong>react instantly</strong>. While the AI speaks, the backend continues to listen to the Twilio inbound stream, processing a local ultra-fast Voice Activity Detection (VAD) model.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                   <div className="bg-black/60 border border-red-500/30 p-4 rounded-lg text-[10px] text-zinc-300 shadow">
                      <strong className="text-red-300 text-xs block mb-1">1. The Hard Stop</strong>
                      <span className="text-zinc-400 leading-relaxed block mt-2">VAD detects human amplitude spike. Server instantly forces a <br/><span className="font-mono text-white bg-red-900/50 px-1 rounded">{`{"event": "clear"}`}</span><br/> command to Twilio, wiping the audio buffer mid-syllable.</span>
                   </div>
                   <div className="bg-black/60 border border-red-500/30 p-4 rounded-lg text-[10px] text-zinc-300 shadow">
                      <strong className="text-red-300 text-xs block mb-1">2. Cancellation Tokens</strong>
                      <span className="text-zinc-400 leading-relaxed block mt-2">Server propagates <strong>cancellation thread signals</strong> to the active LLM async task and the TTS engine to halt data generation safely without memory leaks.</span>
                   </div>
                   <div className="bg-black/60 border border-red-500/30 p-4 rounded-lg text-[10px] text-zinc-300 shadow">
                      <strong className="text-red-300 text-xs block mb-1">3. Context Flush</strong>
                      <span className="text-zinc-400 leading-relaxed block mt-2">LangGraph halts, flushes the interrupted thought context, appends the human's newly recognized question to state, and restarts the loop entirely.</span>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* TAB 7: PROCESS RECORDER */}
        {activeTab === 'recorder' && (
          <div className="space-y-6 animate-fade-in">
             <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
               <Video className="text-indigo-400" />
               Process Recorder & E2B Replayer
             </h3>
             <p className="text-zinc-400 leading-relaxed">
               The Process Recorder leverages a local Chrome Extension to physically trap <code>click</code> and <code>input</code> events across legacy web apps, while simultaneously routing the payload into an automated Execution Pipeline.
             </p>

             <div className="mt-6 border border-zinc-800 rounded-xl bg-zinc-950 p-6 shadow-2xl relative">
                <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-sm mb-6 border-b border-zinc-800 pb-4">Data Ingestion & Replication Flow</h4>
                
                <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                   
                   {/* Capture Phase */}
                   <div className="flex gap-4 items-stretch">
                      <div className="w-10 bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center rounded-lg text-indigo-400 font-bold">1</div>
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                         <h5 className="font-bold text-white text-sm mb-1">Telemetry Capture (Chrome Extension)</h5>
                         <p className="text-xs text-zinc-400">Extracts DOM XPath selectors natively. Takes synchronous base64 visual snapshots using <code>chrome.tabs.captureVisibleTab()</code>. Automatically scrubs PII from password input fields locally.</p>
                      </div>
                   </div>

                   {/* Storage Phase */}
                   <div className="flex gap-4 items-stretch ml-4">
                      <div className="w-10 bg-blue-900/30 border border-blue-500/30 flex items-center justify-center rounded-lg text-blue-400 font-bold">2</div>
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                         <h5 className="font-bold text-white text-sm mb-1">State Management (Supabase)</h5>
                         <p className="text-xs text-zinc-400">Stores metadata in Postgres. Moves heavy base64 screenshot blobs into the <code>process_screenshots</code> Storage Bucket to preserve index performance on the main <code>recording_events</code> timeline.</p>
                      </div>
                   </div>

                   {/* LLM Phase */}
                   <div className="flex gap-4 items-stretch ml-8">
                      <div className="w-10 bg-purple-900/30 border border-purple-500/30 flex items-center justify-center rounded-lg text-purple-400 font-bold">3</div>
                      <div className="flex-1 bg-zinc-900 border border-purple-800/50 p-4 rounded-lg shadow-inner">
                         <h5 className="font-bold text-purple-300 text-sm mb-1">Intent Synthesis (LangChain)</h5>
                         <p className="text-xs text-zinc-400">FastAPI backend processes the raw sequential array mapping (<i>Click Div &rarr; Type Text &rarr; Click Button</i>) and feeds it into an LLM context window to generate a clean, executive SOP summary.</p>
                      </div>
                   </div>

                   {/* Execution Phase */}
                   <div className="flex gap-4 items-stretch ml-12">
                      <div className="w-10 bg-emerald-900/40 border border-emerald-500/50 flex items-center justify-center rounded-lg text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">4</div>
                      <div className="flex-1 bg-emerald-950/20 border-2 border-emerald-500/50 p-4 rounded-lg">
                         <h5 className="font-bold text-emerald-400 text-sm mb-1">Headless Replication (E2B Sandbox)</h5>
                         <p className="text-xs text-zinc-300">The <code>/replicate</code> API dynamically cross-compiles the DB timeline into a native Python Playwright script. The script is deployed into a secure E2B container which fires up Chromium and mechanically simulates the exact stored trajectory against the target domain.</p>
                      </div>
                   </div>

                </div>
             </div>
          </div>
        )}

        {/* TELEMETRY */}
        {activeTab === 'telemetry' && (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><ActivityIcon className="text-indigo-400"/> Telemetry & Process Discovery</h3>
              <p className="text-zinc-400 leading-relaxed">The Process Automation engine utilizes our lightweight Chrome Extension to invisibly track, identify, and automate severe workflow friction across cloud environments.</p>

              <div className="bg-zinc-950 p-5 rounded-lg border border-zinc-800 mt-4">
                <h4 className="text-indigo-400 font-bold mb-3 border-b border-zinc-800 pb-2">Step-by-Step Data Flow</h4>
                <ol className="list-decimal list-inside space-y-3 text-zinc-400">
                  <li><strong className="text-zinc-200">Event Capture:</strong> The browser extension binds listeners to DOM elements (Clicks, Keyboard Inputs, Copy/Pasting).</li>
                  <li><strong className="text-zinc-200">Local Scrubbing (Privacy):</strong> Before data leaves the browser, a regex-based heuristic engine attempts to scrub SSNs, Credit Cards, and explicit passwords from DOM text content.</li>
                  <li><strong className="text-zinc-200">Batch Processing:</strong> To prevent HTTP request flooding, events are grouped and POSTed to `/api/telemetry` over high-interval bursts.</li>
                  <li><strong className="text-zinc-200">Synthesis Engine (LLM):</strong> The `telemetry.py` backend injects the raw actions + your Tenant's Active Tools + the Global Config Catalog into a heavy LLM prompt.</li>
                  <li><strong className="text-zinc-200">JSON Parsing:</strong> The LLM returns a strict `ReactFlowJSON` data structure, automatically inserting `systemPrompts` and Tool IDs into agent capabilities.</li>
                </ol>
              </div>

              <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200">
                <AlertTriangle size={24} className="shrink-0 mt-1" />
                <p><strong>Missing Capabilities Engine:</strong> If the Synthesis LLM identifies that a user needs a specific API to automate a workflow, but the tenant hasn't provided credentials, the LLM safely routes the requirement to a `recommended_global_tools` array, triggering our Amber UI warnings instead of failing the schema compilation.</p>
              </div>

              <div className="mt-8 border-t border-zinc-800 pt-6">
                 <h4 className="text-lg font-bold text-white mb-4">Real World Enterprise Scenarios Enabled</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                       <h5 className="font-bold text-blue-400">Sales Development (SDR)</h5>
                       <p className="text-xs text-zinc-400 mt-2"><strong>Discovery:</strong> Extension notices an SDR sequentially highlighting company names in Salesforce, copying them, pasting them into LinkedIn to find CEOs, and pasting their emails back into Gmail.</p>
                       <p className="text-xs text-zinc-400 mt-2"><strong>Synthesized Output:</strong> Auto-generates an `Inbound SDR` Agent hooked to Salesforce and Resend tools, capable of researching and drafting personalized cold outreach autonomously.</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                       <h5 className="font-bold text-emerald-400">Customer Support Triage</h5>
                       <p className="text-xs text-zinc-400 mt-2"><strong>Discovery:</strong> Support agent clicks through 40 Zendesk pages an hour, categorizing them into 'Urgent' or 'Low', and pasting standard templated replies into standard fields.</p>
                       <p className="text-xs text-zinc-400 mt-2"><strong>Synthesized Output:</strong> A multi-agent node cluster. Agent 1 reads inbound text/sentiment via webhook payload, categorizes it, and Conditional paths it to Agent 2 to draft standard replies pending an Approval HITL node.</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                       <h5 className="font-bold text-amber-400">HR Compliance Data Entry</h5>
                       <p className="text-xs text-zinc-400 mt-2"><strong>Discovery:</strong> HR user downloads PDFs, manually reads I-9 forms, and blindly types extracted names and socials into a separate internal Workday portal.</p>
                       <p className="text-xs text-zinc-400 mt-2"><strong>Synthesized Output:</strong> A secure PDF extraction agent mapped to a data-lake tool. The agent automatically OCRs standard structures and securely issues API PUTs into the ERP software without human exposure to the PII.</p>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* TAB 6: COST & SCALABILITY */}
        {activeTab === 'scale' && (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><TrendingUp className="text-indigo-400"/> Infrastructure Scale & Cloud Economics</h3>
              <p className="text-zinc-400">Tessera OS utilizes physical backend caching and horizontal scaling to decouple compute scaling from LLM token costs.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                 <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 shadow-inner">
                    <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2"><Server size={18}/> Hardware Scaling Pipeline</h4>
                    <ul className="space-y-3 text-sm text-zinc-400 mt-4">
                       <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span><strong>Vercel Edge Network:</strong> UI and JWT validation offloaded globally. Zero cold starts for initial request handling.</span>
                       </li>
                       <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span><strong>Railway Auto-Scaling:</strong> The Python FastAPI image is horizontally cloned across Railway containers when webhook concurrency spikes above threshold.</span>
                       </li>
                       <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                          <span><strong>PgBouncer Connection Pooling:</strong> Supabase natively pools up to 10,000 concurrent Postgres Checkpoint queries via transaction routing.</span>
                       </li>
                    </ul>
                 </div>

                 <div className="bg-zinc-950 p-6 rounded-lg border border-zinc-800 shadow-inner">
                    <h4 className="text-emerald-400 font-bold mb-3 flex items-center gap-2"><Database size={18}/> LLM Token Economics</h4>
                    <p className="text-xs text-zinc-500 mb-4 bg-zinc-900 p-3 rounded">Traditional orchestrators reinject the *entire* conversation history context on every single agent loop, causing <strong>O(n²)</strong> token scaling costs.</p>
                    <ul className="space-y-3 text-sm text-zinc-400">
                       <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                          <span><strong>LangGraph Checkpoints:</strong> By writing `thread_id` states to Postgres, agents only ever process the *diff* of the current node. This collapses token expenditure significantly.</span>
                       </li>
                       <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                          <span><strong>Semantic Routing (Roadmap):</strong> RedisVL will intercept incoming user commands. If a command matches an existing vector hash by 95% threshold, the cached graph triggers natively, resulting in <strong>$0.00</strong> LLM compute.</span>
                       </li>
                    </ul>
                 </div>
              </div>
           </div>
        )}

        {/* TAB 7: STRATEGY & VISION */}
        {activeTab === 'strategy' && (
           <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Lightbulb className="text-indigo-400"/> Future Org Design (The Agentic Era)</h3>
              
              {/* Native Org Design Visual */}
              <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-xl overflow-x-auto custom-scrollbar">
                 <div className="flex flex-col md:flex-row gap-8 justify-around min-w-[700px]">
                    
                    {/* TRADITIONAL ORG */}
                    <div className="flex-1 border border-red-500/20 bg-red-900/10 p-6 rounded-xl relative">
                       <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl">TRADITIONAL</div>
                       <h4 className="text-center font-bold text-zinc-300 mb-6">Rigid Command Hierarchy</h4>
                       
                       <div className="flex flex-col items-center gap-2">
                          <div className="w-32 py-2 bg-zinc-800 border border-zinc-700 rounded text-center text-xs text-white shadow-md z-10">Director / VP</div>
                          <div className="flex gap-4">
                             <div className="w-[2px] h-6 bg-zinc-700 rotate-[30deg] translate-x-4"></div>
                             <div className="w-[2px] h-6 bg-zinc-700 -rotate-[30deg] -translate-x-4"></div>
                          </div>
                          
                          <div className="flex gap-4 w-full justify-center">
                             <div className="w-24 py-2 bg-zinc-800 border border-zinc-700 rounded text-center text-xs text-white shadow-md z-10">Manager</div>
                             <div className="w-24 py-2 bg-zinc-800 border border-zinc-700 rounded text-center text-xs text-white shadow-md z-10">Manager</div>
                          </div>
                          
                          <div className="flex gap-[4rem] w-full justify-center">
                             <div className="flex gap-2">
                                <div className="w-[2px] h-6 bg-zinc-700 rotate-[20deg] translate-x-2"></div>
                                <div className="w-[2px] h-6 bg-zinc-700 -rotate-[20deg] -translate-x-2"></div>
                             </div>
                             <div className="flex gap-2">
                                <div className="w-[2px] h-6 bg-zinc-700 rotate-[20deg] translate-x-2"></div>
                                <div className="w-[2px] h-6 bg-zinc-700 -rotate-[20deg] -translate-x-2"></div>
                             </div>
                          </div>

                          <div className="flex gap-2 w-full justify-center">
                             <div className="w-16 py-2 bg-red-500/20 border border-red-500/50 rounded text-center text-[10px] text-red-200">Execution</div>
                             <div className="w-16 py-2 bg-red-500/20 border border-red-500/50 rounded text-center text-[10px] text-red-200">Execution</div>
                             <div className="w-16 py-2 bg-red-500/20 border border-red-500/50 rounded text-center text-[10px] text-red-200">Execution</div>
                             <div className="w-16 py-2 bg-red-500/20 border border-red-500/50 rounded text-center text-[10px] text-red-200">Execution</div>
                          </div>
                       </div>
                       
                       <p className="text-center text-[10px] text-zinc-500 mt-6">Knowledge is bottlenecked. Humans perform rigid, repeatable tasks.</p>
                    </div>

                    {/* AGENTIC ORG */}
                    <div className="flex-1 border border-emerald-500/20 bg-emerald-900/10 p-6 rounded-xl relative shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                       <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-xl">THE FUTURE</div>
                       <h4 className="text-center font-bold text-emerald-400 mb-6">Orchestrated Networks</h4>
                       
                       <div className="relative flex items-center justify-center h-48">
                          {/* Core Orchestrator */}
                          <div className="absolute z-20 w-32 py-3 bg-indigo-600 border border-indigo-400 rounded-lg text-center text-sm font-bold text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                             Human Orchestrator
                             <div className="text-[9px] font-normal text-indigo-200 mt-1">Review & Strategy</div>
                          </div>
                          
                          {/* Top Left Agent */}
                          <div className="absolute top-2 left-6 w-24 py-2 bg-zinc-900 border border-emerald-500/50 rounded text-center text-[10px] text-emerald-300 z-10 border-dashed">
                             Research Agent
                          </div>
                          {/* Top Right Agent */}
                          <div className="absolute top-2 right-6 w-24 py-2 bg-zinc-900 border border-emerald-500/50 rounded text-center text-[10px] text-emerald-300 z-10 border-dashed">
                             Data Entry Agent
                          </div>
                          {/* Bottom Left Agent */}
                          <div className="absolute bottom-2 left-6 w-24 py-2 bg-zinc-900 border border-emerald-500/50 rounded text-center text-[10px] text-emerald-300 z-10 border-dashed">
                             Outreach Agent
                          </div>
                          {/* Bottom Right Agent */}
                          <div className="absolute bottom-2 right-6 w-24 py-2 bg-zinc-900 border border-emerald-500/50 rounded text-center text-[10px] text-emerald-300 z-10 border-dashed">
                             Analysis Agent
                          </div>

                          {/* Connecting lines */}
                          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
                             <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" opacity="0.5"/>
                             <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" opacity="0.5"/>
                             <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" opacity="0.5"/>
                             <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="#10b981" strokeWidth="1" strokeDasharray="4 2" opacity="0.5"/>
                          </svg>
                       </div>

                       <p className="text-center text-[10px] text-emerald-500/80 mt-2">Humans shift to approving outcomes. Execution is fully automated.</p>
                    </div>

                 </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-red-900/40 to-transparent border-l-4 border-red-500 rounded-r-lg mb-6">
                 <h4 className="font-bold text-red-200">The Structural Mismatch Gap</h4>
                 <p className="text-sm text-red-100/70 mt-1">Historically, traditional hierarchies rely on manual coordination and task processing based on rigid execution roles. Current data forecasts a <strong>39% core skill shift by 2030</strong> algorithms and an <strong>18-month role life span prediction</strong>. Currently, only 1% of organizations are strategically aligned for this automated friction.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-zinc-200 font-bold">1. Hire for Orchestration</h4>
                    <p className="text-xs text-zinc-400 mt-1">Shift from task completion to outcomes. Humans will act as designers of Agent workflows rather than physical executors.</p>
                 </div>
                 <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-zinc-200 font-bold">2. Deconstruct Roles</h4>
                    <p className="text-xs text-zinc-400 mt-1">Roles must be broken into dynamic human vs machine task portfolios. Monolithic job descriptions will become obsolete.</p>
                 </div>
                 <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-zinc-200 font-bold">3. AI Fluency as a Gate</h4>
                    <p className="text-xs text-zinc-400 mt-1">Understanding *why* an agent failed or hallucinates matters substantially more than knowing how to prompt it.</p>
                 </div>
                 <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-zinc-200 font-bold">4. Flatten the Organization</h4>
                    <p className="text-xs text-zinc-400 mt-1">Agents automate mundane task routing. Middle management must shift to strategic pivots because 'information relay' holds zero value.</p>
                 </div>
                 <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-zinc-200 font-bold">5. Reinvention inside the OS</h4>
                    <p className="text-xs text-zinc-400 mt-1">Learning must be deeply embedded into workflow automation (like Tessera Process Discovery) to combat the exponential tech curve.</p>
                 </div>
                 <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                    <h4 className="text-zinc-200 font-bold">6. Treat Design as a Weapon</h4>
                    <p className="text-xs text-zinc-400 mt-1">Organizations that build human-agent tandem teams will disproportionately capture value by targeting emerging vectors over established ones.</p>
                 </div>
              </div>
              <div className="w-full h-px border-b border-zinc-700 my-12" />

              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Compass className="text-indigo-400"/> What's Next: Enterprise Architecture Analysis</h3>
              
              {/* Native Enterprise Architecture Diagram */}
              <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-x-auto custom-scrollbar">
                 <h4 className="text-center font-bold text-zinc-200 mb-6 uppercase tracking-wider text-sm">Enterprise AI Architecture Pipeline</h4>
                 
                 <div className="min-w-[800px] flex flex-col gap-4">
                    
                    {/* Top Layer: The Pipeline */}
                    <div className="flex gap-4 items-stretch h-48">
                       
                       {/* Data Layer */}
                       <div className="w-1/4 flex flex-col gap-2 border border-red-500/20 bg-red-900/10 p-3 rounded-lg relative">
                          <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-bl rounded-tr-lg">ZONES 1-3</div>
                          <h5 className="text-[10px] uppercase font-bold text-zinc-400 text-center mb-1">Data & Context</h5>
                          
                          <div className="flex-1 border border-zinc-700 bg-zinc-900/80 rounded flex flex-col items-center justify-center text-center p-2 shadow-inner">
                             <span className="text-xs font-bold text-red-400 mb-1">Ingestion</span>
                             <span className="text-[9px] text-zinc-500 hover:text-red-300 transition-colors cursor-help" title="Missing: Airflow / dbt">Missing Pipeline</span>
                          </div>
                          <div className="flex-1 border border-zinc-700 bg-zinc-900/80 rounded flex flex-col items-center justify-center text-center p-2 shadow-inner">
                             <span className="text-xs font-bold text-red-400 mb-1">Retrieval (RAG)</span>
                             <span className="text-[9px] text-zinc-500 hover:text-red-300 transition-colors cursor-help" title="Missing: Milvus / pgvector">Missing Vector DB</span>
                          </div>
                       </div>

                       <div className="flex items-center text-zinc-600">➔</div>

                       {/* Orchestration Layer */}
                       <div className="w-1/2 flex flex-col gap-2 border border-emerald-500/30 bg-emerald-900/10 p-3 rounded-lg relative shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                          <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-bl rounded-tr-lg">ZONES 4, 6</div>
                          <h5 className="text-[10px] uppercase font-bold text-zinc-400 text-center mb-1">Routing & Logic</h5>
                          
                          <div className="flex gap-2 h-full">
                             <div className="w-1/3 border border-orange-500/30 bg-zinc-900/80 rounded flex flex-col items-center justify-center text-center p-2 relative">
                                <span className="text-xs font-bold text-orange-400 mb-1">Router</span>
                                <span className="text-[9px] text-zinc-500">Semantic Cache</span>
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                             </div>
                             
                             <div className="flex-1 border-2 border-emerald-500/50 bg-emerald-900/20 rounded flex flex-col items-center justify-center text-center p-2 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]">
                                <span className="text-sm font-bold text-emerald-400 mb-1">Agent Orchestrator</span>
                                <span className="text-[10px] text-zinc-300">LangGraph Execution</span>
                                <span className="text-[9px] text-emerald-500 mt-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">ACTIVE</span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center text-zinc-600">➔</div>

                       {/* Execution / Models Layer */}
                       <div className="w-1/4 flex flex-col gap-2 border border-blue-500/20 bg-blue-900/10 p-3 rounded-lg relative">
                          <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-bl rounded-tr-lg">ZONES 5, 7</div>
                          <h5 className="text-[10px] uppercase font-bold text-zinc-400 text-center mb-1">Models & Serving</h5>
                          
                          <div className="flex-1 border border-zinc-700 bg-zinc-900/80 rounded flex flex-col items-center justify-center text-center p-2 shadow-inner relative">
                             <span className="text-xs font-bold text-zinc-300 mb-1">SaaS LLMs</span>
                             <span className="text-[9px] text-emerald-400">OpenAI / Anthropic</span>
                             <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500"></div>
                          </div>
                          <div className="flex-1 border border-zinc-700 bg-zinc-900/80 rounded flex flex-col items-center justify-center text-center p-2 shadow-inner">
                             <span className="text-xs font-bold text-blue-400 mb-1">Specialized Models</span>
                             <span className="text-[9px] text-zinc-500">Missing Local KubeFlow</span>
                          </div>
                       </div>
                    </div>

                    {/* Bottom Layer: Governance & Observability */}
                    <div className="flex gap-4">
                       <div className="flex-1 border border-indigo-500/30 bg-indigo-900/10 p-3 rounded-lg flex items-center justify-between relative shadow-inner">
                          <div className="absolute top-0 right-0 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-bl rounded-tr-lg">ZONE 8</div>
                          <div>
                             <span className="font-bold text-indigo-400 text-sm block">Observability & Tracing</span>
                             <span className="text-[10px] text-zinc-400">Tracks cost, latency, and Triad Relevance across entire pipeline.</span>
                          </div>
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Missing: LangSmith</span>
                       </div>

                       <div className="flex-1 border border-purple-500/30 bg-purple-900/10 p-3 rounded-lg flex items-center justify-between relative shadow-inner">
                          <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-400 text-[9px] font-bold px-2 py-0.5 rounded-bl rounded-tr-lg">ZONE 9</div>
                          <div>
                             <span className="font-bold text-purple-400 text-sm block">Governance & Guardrails</span>
                             <span className="text-[10px] text-zinc-400">Intercepts toxic behavior and enforces physical action policies.</span>
                          </div>
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">Missing: OPA / NeMo</span>
                       </div>
                    </div>

                 </div>
              </div>

              <div className="space-y-4">
                 
                 <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-5">
                    <h4 className="text-red-400 font-bold flex items-center gap-2"><GitBranch size={16}/> Gaps: Zone 2 & 3 (Data Context & Retrieval)</h4>
                    <p className="text-sm mt-2 text-zinc-300">Currently, agents rely exclusively on live Tool APIs for external context. We lack a robust unstructured Context Engineering pipeline.</p>
                    <ul className="list-disc list-inside mt-3 text-xs text-zinc-400 space-y-1 ml-2">
                       <li><strong>Capability Enablement:</strong> Implement Apache Airflow / dbt pipelines to ingest enterprise Lakehouse items into Milvus or pgvector databases.</li>
                       <li><strong>Scenario:</strong> True RAG architecture allows the `Research Agent` to query internal PDF SOPs seamlessly rather than just Web Searching.</li>
                    </ul>
                 </div>

                 <div className="border border-orange-500/30 bg-orange-500/5 rounded-lg p-5">
                    <h4 className="text-orange-400 font-bold flex items-center gap-2"><GitBranch size={16}/> Gaps: Zone 4 (Prompt Routing & Efficiency)</h4>
                    <p className="text-sm mt-2 text-zinc-300">Our LLM calls are deterministic and direct. We are missing abstraction optimization.</p>
                    <ul className="list-disc list-inside mt-3 text-xs text-zinc-400 space-y-1 ml-2">
                       <li><strong>Capability Enablement:</strong> Introduce RedisVL Semantic Caching to intercept repetitive chat commands before incurring token costs. Execute PII anonymization routers automatically before hitting public LLMs.</li>
                    </ul>
                 </div>

                 <div className="border border-indigo-500/30 bg-indigo-500/5 rounded-lg p-5">
                    <h4 className="text-indigo-400 font-bold flex items-center gap-2"><GitBranch size={16}/> Gaps: Zone 8 & 9 (Observability & Governance)</h4>
                    <p className="text-sm mt-2 text-zinc-300">Tessera assumes benign tool execution post-HITL approval. We need stringent automated guardrails.</p>
                    <ul className="list-disc list-inside mt-3 text-xs text-zinc-400 space-y-1 ml-2">
                       <li><strong>Capability Enablement:</strong> Implementation of Nvidia NeMo Guardrails alongside OPA Policy engines blocking dangerous LLM hallucination outputs. Full integration of LangSmith Tracing for triad relevance evaluation.</li>
                       <li><strong>Scenario:</strong> System automatically terminates an email Agent thread if the LLM output drifts into off-brand or offensive language before it ever reaches the Human Approval queue.</li>
                    </ul>
                 </div>

                 <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-5">
                    <h4 className="text-emerald-400 font-bold flex items-center gap-2"><GitBranch size={16}/> Gaps: Zone 5 & 7 (Model Customization & Serving)</h4>
                    <p className="text-sm mt-2 text-zinc-300">We currently route entirely to external SaaS LLMs (OpenAI, Anthropic).</p>
                    <ul className="list-disc list-inside mt-3 text-xs text-zinc-400 space-y-1 ml-2">
                       <li><strong>Capability Enablement:</strong> Integrate KubeFlow MLFlow registries to fine-tune custom specialized base models across auto-scaling K8s GPU clusters, providing multi-tenant local model serving.</li>
                    </ul>
                 </div>

              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800 rounded-lg overflow-hidden shadow-xl">
                 <h4 className="font-bold text-zinc-400 mb-4 uppercase tracking-wider text-sm">Original Reference Diagram</h4>
                 <img src="/docs/enterprise-arch.jpg" alt="Enterprise AI Architecture" className="w-full object-contain max-h-[500px] bg-zinc-950 rounded-lg border border-zinc-800" />
              </div>
           </div>
        )}

      </div>
    </div>
  );
}

// Temporary icon fallback since Activity isn't universally imported if using lucide strictly
function ActivityIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
