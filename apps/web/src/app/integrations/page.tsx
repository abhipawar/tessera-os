'use client'

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Plug, Database, Server, CheckCircle2, XCircle, Loader2, Key, Plus, Lock } from 'lucide-react';

type Tool = {
  id: string;
  name: string;
  description: string;
  logo_icon: string;
  is_connected: boolean;
  config_schema?: { fields: string[] };
}

export default function IntegrationsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [connectionName, setConnectionName] = useState('');
  const [connectionMode, setConnectionMode] = useState<'url' | 'fields'>('url');

  // Testing & Saving State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/tenant/tools`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      if (data.success) {
        setTools(data.tools);
      }
    } catch (error) {
      console.error("Failed to load integrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openToolModal = (tool: Tool) => {
    setSelectedTool(tool);
    setFormData({});
    setConnectionName('');
    setTestResult(null);
    setConnectionMode('url');
    if (tool.name === 'Application Database') {
      setFormData({ tool_type: 'database', db_type: 'postgresql' });
    } else if (tool.name === 'AI Compute Engine') {
      setFormData({ tool_type: 'llm', provider: 'google gemini' });
    }
  };

  const closeToolModal = () => {
    setSelectedTool(null);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!selectedTool) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await fetch(`${API_URL}/api/tenant/tools/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      setTestResult({ success: data.success, message: data.success ? data.message : data.error });
    } catch (error: any) {
      setTestResult({ success: false, message: "Network error occurred while testing." });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveIntegration = async () => {
    if (!selectedTool) return;
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await fetch(`${API_URL}/api/tenant/tools`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tool_id: selectedTool.id,
          connection_name: connectionName || `${selectedTool.name} Connection`,
          credentials: formData
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("Integration successfully saved!");
        closeToolModal();
        fetchTools(); // This instantly moves the tool to the "Active" section!
      } else {
        alert("Error saving integration: " + data.error);
      }
    } catch (error) {
      alert("Critical error saving integration.");
    } finally {
      setIsSaving(false);
    }
  };

  // UI Helper: Split the tools into two categories based on connectivity
  const activeTools = tools.filter(tool => tool.is_connected);
  const catalogTools = tools.filter(tool => !tool.is_connected);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 relative overflow-hidden font-sans">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">

        <header className="flex items-center justify-between">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
              <Plug className="text-blue-500" size={32} />
              Integrations Hub
            </h1>
            <p className="text-zinc-400 mt-2 font-medium">Securely connect your enterprise data sources to your AI workforce (BYOK).</p>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-zinc-500" size={32} /></div>
        ) : (
          <div className="space-y-12">

            {/* 1. ACTIVE CONNECTIONS SECTION */}
            {activeTools.length > 0 && (
              <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-800/50 pb-3 tracking-wide">
                  <CheckCircle2 className="text-emerald-500" size={24} />
                  Active for this Tenant
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="bg-zinc-900/50 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.1)] rounded-2xl p-6 hover:border-emerald-500/60 transition-all group flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-bl-xl border-b border-l border-emerald-500/20 flex items-center gap-1.5 tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        ACTIVE
                      </div>

                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center mb-5 text-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        {tool.logo_icon === 'database' ? <Database size={26} /> : <Server size={26} />}
                      </div>

                      <h3 className="text-xl font-bold text-zinc-100 mb-2">{tool.name}</h3>
                      <p className="text-sm text-zinc-400 flex-1 leading-relaxed">{tool.description}</p>

                      <button
                        onClick={() => openToolModal(tool)}
                        className="mt-6 w-full py-2.5 bg-zinc-950/50 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Add Another Instance
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. GLOBAL CATALOG SECTION */}
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
              <h2 className="text-xl font-bold text-zinc-100 mb-6 border-b border-zinc-800/50 pb-3 tracking-wide">
                Global Catalog
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catalogTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-6 hover:bg-zinc-900/80 hover:border-blue-500/30 transition-all group flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-800/50 flex items-center justify-center mb-5 text-zinc-400 group-hover:text-blue-400 group-hover:border-blue-500/30 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all">
                      {tool.logo_icon === 'database' ? <Database size={26} /> : <Server size={26} />}
                    </div>

                    <h3 className="text-xl font-bold text-zinc-100 mb-2">{tool.name}</h3>
                    <p className="text-sm text-zinc-500 flex-1 leading-relaxed group-hover:text-zinc-400 transition-colors">{tool.description}</p>

                    <button
                      onClick={() => openToolModal(tool)}
                      className="mt-6 w-full py-2.5 bg-zinc-950/50 hover:bg-blue-600 border border-zinc-800 hover:border-blue-500 text-zinc-300 hover:text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                    >
                      <Key size={16} /> Configure Setup
                    </button>
                  </div>
                ))}
              </div>

              {catalogTools.length === 0 && (
                <div className="text-center py-16 text-zinc-500 border border-dashed border-zinc-800/50 rounded-2xl bg-zinc-900/20 backdrop-blur-sm mt-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-500">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-300 mb-2">Platform Mastered</h3>
                  <p>You have configured every tool available in the global catalog.</p>
                </div>
              )}
            </section>

          </div>
        )}

      </div>

      {/* CONFIGURATION MODAL */}
      {selectedTool && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">

            <div className="p-6 border-b border-zinc-800/50 flex justify-between items-start bg-zinc-950/30">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{selectedTool.name}</h2>
                <div className="flex items-center gap-1.5 mt-2">
                  <Lock size={12} className="text-emerald-500" />
                  <p className="text-xs text-zinc-400 font-medium">Credentials encrypted at rest</p>
                </div>
              </div>
              <button onClick={closeToolModal} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"><XCircle size={24} /></button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Connection Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Connection Name</label>
                <input
                  type="text"
                  placeholder="e.g. Production HR Database"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Dynamic Fields */}
              {selectedTool.name === 'Application Database' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Engine</label>
                    <select
                      value={formData.db_type || 'postgresql'}
                      onChange={(e) => setFormData({ ...formData, db_type: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-blue-500 outline-none"
                    >
                      <option value="postgresql">PostgreSQL</option>
                      <option value="snowflake">Snowflake</option>
                    </select>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setConnectionMode('url')}
                      className={`flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${connectionMode === 'url' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Connection URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionMode('fields')}
                      className={`flex-1 text-xs font-bold uppercase tracking-wider py-2 rounded-md transition-colors ${connectionMode === 'fields' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Individual Fields
                    </button>
                  </div>

                  {connectionMode === 'url' ? (
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Connection String</label>
                      <input
                        type="password"
                        placeholder="postgresql://user:password@host:port/dbname"
                        onChange={(e) => setFormData({ ...formData, connection_url: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-200">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Host</label>
                          <input type="text" placeholder="db.example.com" onChange={(e) => setFormData({ ...formData, host: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Port</label>
                          <input type="text" placeholder="5432" onChange={(e) => setFormData({ ...formData, port: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                        </div>
                      </div>
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Database Name</label>
                        <input type="text" onChange={(e) => setFormData({ ...formData, database: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Username</label>
                          <input type="text" onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Password</label>
                          <input type="password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {selectedTool.name === 'AI Compute Engine' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">AI Intelligence Provider</label>
                    <select
                      value={formData.provider || 'google gemini'}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-blue-500 outline-none"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google gemini">Google Gemini</option>
                      <option value="groq">Groq</option>
                    </select>
                  </div>
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">API Key</label>
                    <input
                      type="password"
                      placeholder={`Enter your ${formData.provider || 'google gemini'} API Key...`}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Test Results Display */}
            {testResult && (
              <div className={`mx-6 p-3 rounded-lg text-sm border flex items-start gap-2 ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {testResult.success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                <span className="leading-snug">{testResult.message}</span>
              </div>
            )}

            {/* Action Footer */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3 mt-4">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || Object.keys(formData).length === 0}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isTesting && <Loader2 size={14} className="animate-spin" />}
                Test Connection
              </button>
              <button
                onClick={handleSaveIntegration}
                disabled={!testResult?.success || isSaving || !connectionName}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Save Integration
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}