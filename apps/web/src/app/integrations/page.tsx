'use client'

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Plug, Database, Server, CheckCircle2, XCircle, Loader2, Key, Plus, Lock, Settings } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { API_URL } from '@/config';

type Tool = {
  id: string;
  tenant_tool_id?: string;
  name: string;
  connection_name?: string;
  description: string;
  logo_icon: string;
  is_connected?: boolean;
  config_schema?: { fields: string[] };
  credentials?: Record<string, string>;
}

export default function IntegrationsPage() {
  const [activeTools, setActiveTools] = useState<Tool[]>([]);
  const [catalogTools, setCatalogTools] = useState<Tool[]>([]);
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
  const [availableModels, setAvailableModels] = useState<string[]>([]);

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


      const res = await fetch(`${API_URL}/api/tenant/tools`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      if (data.success) {
        if (data.active_tools && data.catalog_tools) {
          setActiveTools(data.active_tools);
          setCatalogTools(data.catalog_tools);
        } else if (data.tools) {
          setActiveTools(data.tools.filter((t: any) => t.is_connected));
          setCatalogTools(data.tools.filter((t: any) => !t.is_connected));
        }
      }
    } catch (error) {
      console.error("Failed to load integrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openToolModal = (tool: Tool, isEdit: boolean = false) => {
    setSelectedTool(tool);
    setAvailableModels([]);
    if (isEdit) {
      setFormData({ tenant_tool_id: tool.tenant_tool_id || '', ...(tool.credentials || {}) });
      setConnectionName(tool.connection_name || tool.name);
      if (tool.credentials?.model_name) {
        setAvailableModels([tool.credentials.model_name]);
      }
      if (tool.credentials?.api_key || tool.credentials?.connection_url || tool.credentials?.host) {
        setTimeout(() => handleTestConnection(tool.credentials), 100);
      }
    } else {
      setFormData({});
      setConnectionName('');
    }
    setTestResult(null);
    if (tool.name.includes('Database')) {
      setFormData(prev => ({ ...prev, tool_type: 'database', db_type: prev.db_type || 'postgresql' }));
      if (isEdit && tool.credentials?.host) {
        setConnectionMode('fields');
      } else {
        setConnectionMode('url');
      }
    } else if (tool.name.includes('LLM') || tool.name.includes('AI Compute')) {
      setFormData(prev => ({ ...prev, tool_type: 'llm', provider: prev.provider || 'google gemini' }));
      setConnectionMode('url');
    }
  };

  const closeToolModal = () => {
    setSelectedTool(null);
    setTestResult(null);
  };

  const handleTestConnection = async (overrideData?: Record<string, string>) => {
    const dataToTest = overrideData || formData;
    if (!selectedTool && !overrideData) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();


      const res = await fetch(`${API_URL}/api/tenant/tools/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToTest)
      });

      const data = await res.json();
      setTestResult({ success: data.success, message: data.success ? data.message : data.error });
      if (data.success && data.models) {
        setAvailableModels(data.models);
        if (data.models.length > 0) {
          setFormData(prev => {
            if (!prev.model_name || !data.models.includes(prev.model_name)) {
              return { ...prev, model_name: data.models[0] };
            }
            return prev;
          });
        }
      }
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


      const res = await fetch(`${API_URL}/api/tenant/tools`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tool_id: selectedTool.id,
          tenant_tool_id: formData.tenant_tool_id,
          connection_name: connectionName || `${selectedTool.name} Connection`,
          credentials: formData
        })
      });

      const data = await res.json();
      if (data.success) {
        useNotificationStore.getState().showNotification({
          title: "Integration Saved",
          message: "The integration credentials were successfully saved to your tenant vault.",
          type: "success"
        });
        closeToolModal();
        fetchTools(); // This instantly moves the tool to the "Active" section!
      } else {
        useNotificationStore.getState().showNotification({
          title: "Configuration Error",
          message: "Error saving integration: " + data.error,
          type: "error"
        });
      }
    } catch (error) {
      useNotificationStore.getState().showNotification({
        title: "Network Error",
        message: "Critical error connecting to the credential vault.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getCategorizedModels = () => {
    const provider = formData.provider || 'google gemini';
    const groups: Record<string, string[]> = {
      'Latest & Pro': [],
      'Standard & Flash': [],
      'Experimental & Preview': [],
      'Legacy': [],
      'Other': []
    };

    availableModels.forEach(m => {
      const lower = m.toLowerCase();
      if (provider === 'google gemini') {
        if (lower.includes('pro')) {
          if (lower.includes('exp') || lower.includes('preview')) groups['Experimental & Preview'].push(m);
          else if (lower === 'gemini-pro') groups['Legacy'].push(m);
          else groups['Latest & Pro'].push(m);
        } else if (lower.includes('flash') || lower.includes('lite')) {
          if (lower.includes('exp') || lower.includes('preview')) groups['Experimental & Preview'].push(m);
          else groups['Standard & Flash'].push(m);
        } else if (lower.includes('1.0') || lower.includes('vision') || lower === 'gemini-ultra') {
          groups['Legacy'].push(m);
        } else {
          groups['Other'].push(m);
        }
      } else if (provider === 'openai') {
        if (lower.includes('o1') || lower.includes('o3') || lower.includes('gpt-4o') || lower.includes('gpt-4-turbo')) {
          if (lower.includes('mini')) groups['Standard & Flash'].push(m);
          else groups['Latest & Pro'].push(m);
        } else {
          groups['Other'].push(m);
        }
      } else if (provider === 'anthropic') {
        if (lower.includes('opus')) groups['Latest & Pro'].push(m);
        else if (lower.includes('sonnet') || lower.includes('haiku')) groups['Standard & Flash'].push(m);
        else groups['Other'].push(m);
      } else {
        groups['Other'].push(m);
      }
    });

    // Remove empty groups and sort remaining elements
    const result: Record<string, string[]> = {};
    Object.keys(groups).forEach(key => {
      if (groups[key] && groups[key].length > 0) {
        result[key] = groups[key].sort();
      }
    });

    if (Object.keys(result).length === 0 && availableModels.length > 0) {
      result['Available Models'] = availableModels;
    }

    return result;
  };

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

                      <h3 className="text-xl font-bold text-zinc-100 mb-2">{tool.connection_name || tool.name}</h3>
                      <p className="text-sm text-zinc-400 flex-1 leading-relaxed"><span className="text-zinc-600 font-semibold uppercase text-xs tracking-wider block mb-1">Type: {tool.name}</span>{tool.description}</p>

                      <div className="mt-6 flex gap-2 w-full">
                        <button
                          onClick={() => openToolModal(tool, true)}
                          className="flex-1 py-2.5 bg-zinc-950/50 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/50 text-zinc-300 hover:text-blue-400 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Settings size={16} /> Edit
                        </button>
                        <button
                          onClick={() => openToolModal(tool)}
                          className="flex-1 py-2.5 bg-zinc-950/50 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={16} /> New
                        </button>
                      </div>
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
      {
        selectedTool && (
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
                {(selectedTool.name.includes('Database')) && (
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
                          value={formData.connection_url || ''}
                          onChange={(e) => setFormData({ ...formData, connection_url: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-3 animate-in fade-in duration-200">
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Host</label>
                            <input type="text" placeholder="db.example.com" value={formData.host || ''} onChange={(e) => setFormData({ ...formData, host: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Port</label>
                            <input type="text" placeholder="5432" value={formData.port || ''} onChange={(e) => setFormData({ ...formData, port: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                          </div>
                        </div>
                        <div className="animate-in fade-in duration-200">
                          <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Database Name</label>
                          <input type="text" value={formData.database || ''} onChange={(e) => setFormData({ ...formData, database: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Username</label>
                            <input type="text" value={formData.username || ''} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase tracking-wider">Password</label>
                            <input type="password" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500" />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {(selectedTool.name.includes('LLM') || selectedTool.name.includes('AI Compute')) && (
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
                        value={formData.api_key || ''}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </div>
                    {availableModels.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-bold text-blue-400 mb-1 uppercase tracking-wider">Select Authorized Model</label>
                        <select
                          value={formData.model_name || availableModels[0]}
                          onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                          className="w-full bg-blue-950/20 border border-blue-500/30 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-blue-500 outline-none"
                        >
                          {Object.entries(getCategorizedModels()).map(([groupName, models]) => (
                            <optgroup key={groupName} label={groupName} className="bg-zinc-950 text-blue-400 font-bold tracking-wider">
                              {models.map(m => (
                                <option key={m} value={m} className="bg-zinc-900 text-zinc-100 font-normal py-1">{m}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
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
                  onClick={() => handleTestConnection()}
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
        )
      }

    </div >
  );
}