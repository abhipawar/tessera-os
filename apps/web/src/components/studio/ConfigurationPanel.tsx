import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Loader2 } from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';
import { createBrowserClient } from '@supabase/ssr';

export default function ConfigurationPanel() {
    const { selectedNode, setSelectedNode, setNodes, configuredTools } = useStudioStore();
    const [models, setModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    const computeEngines = configuredTools.filter(t => t.logo_icon === 'bot' || t.name.includes("Compute"));
    const selectedEngineId = selectedNode?.data?.llm_engine || '';
    const selectedModel = selectedNode?.data?.llm_model || '';

    useEffect(() => {
        if (!selectedEngineId) {
            setModels([]);
            return;
        }

        let isMounted = true;
        const fetchModels = async () => {
            setIsLoadingModels(true);
            try {
                const supabase = createBrowserClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

                const res = await fetch(`${API_URL}/api/tenant/tools/${selectedEngineId}/models`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && isMounted) {
                        setModels(data.models || []);

                        // Default to the first model if none selected and we have a valid list
                        // Uses setNodes to safely update state without infinite loops
                        if (selectedNode && !selectedNode.data?.llm_model && data.models?.length > 0) {
                            setNodes((nds) =>
                                nds.map((n) => {
                                    if (n.id === selectedNode.id) {
                                        return { ...n, data: { ...n.data, llm_model: data.models[0] } };
                                    }
                                    return n;
                                })
                            );
                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, llm_model: data.models[0] } });
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch models", err);
            } finally {
                if (isMounted) setIsLoadingModels(false);
            }
        };

        fetchModels();
        return () => { isMounted = false; };
    }, [selectedEngineId]);

    if (!selectedNode) return null;

    const updateNodeData = (field: string, value: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === selectedNode.id) {
                    node.data = { ...node.data, [field]: value };
                }
                return node;
            })
        );
        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, [field]: value } });
    };

    const toggleToolAssignment = (toolId: string) => {
        const currentTools = selectedNode.data.tools || [];
        const newTools = currentTools.includes(toolId)
            ? currentTools.filter((id: string) => id !== toolId)
            : [...currentTools, toolId];

        updateNodeData('tools', newTools);
    };



    return (
        <div className="absolute top-4 right-4 w-80 bg-zinc-900/80 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-2xl border border-zinc-800/50 flex flex-col z-50 overflow-hidden font-sans">
            <div className="px-5 py-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-950/50 backdrop-blur-md">
                <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
                    <Settings size={16} /> Agent Configuration
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-zinc-500 hover:text-zinc-300">
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Agent Name</label>
                    <input
                        type="text"
                        value={selectedNode.data.label}
                        onChange={(e) => updateNodeData('label', e.target.value)}
                        className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Role Description</label>
                    <input
                        type="text"
                        value={selectedNode.data.description}
                        onChange={(e) => updateNodeData('description', e.target.value)}
                        className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">System Instructions</label>
                    <textarea
                        value={selectedNode.data.systemPrompt || ''}
                        onChange={(e) => updateNodeData('systemPrompt', e.target.value)}
                        placeholder="Define how this agent should behave..."
                        className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                    />
                </div>

                <div className="mt-4 p-4 border border-zinc-800 rounded-lg bg-zinc-950/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Cpu size={16} className="text-blue-500" />
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                            AI Compute Engine
                        </label>
                    </div>

                    {computeEngines.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic">No compute engines configured in Integrations Hub.</p>
                    ) : (
                        <div className="space-y-3">
                            <select
                                value={selectedEngineId}
                                onChange={(e) => {
                                    updateNodeData('llm_engine', e.target.value);
                                    updateNodeData('llm_model', '');
                                }}
                                className="w-full text-sm p-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100 placeholder-zinc-500"
                            >
                                <option value="" disabled>Select a Compute Engine...</option>
                                {computeEngines.map(engine => (
                                    <option key={engine.tenant_tool_id} value={engine.tenant_tool_id}>
                                        {engine.name} ({engine.connection_name})
                                    </option>
                                ))}
                            </select>

                            {selectedEngineId && (
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Model</label>
                                        {isLoadingModels && <Loader2 size={12} className="animate-spin text-blue-500" />}
                                    </div>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => updateNodeData('llm_model', e.target.value)}
                                        disabled={isLoadingModels || models.length === 0}
                                        className="w-full text-sm p-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 outline-none transition-all text-zinc-100"
                                    >
                                        <option value="" disabled>
                                            {isLoadingModels ? "Loading models..." : "Select a model..."}
                                        </option>
                                        {models.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">
                        Assigned Tools
                    </label>
                    <div className="space-y-2">
                        {configuredTools.length === 0 ? (
                            <p className="text-sm text-zinc-500 italic">No tools configured in Integrations Hub yet.</p>
                        ) : (
                            configuredTools.filter(t => t.logo_icon !== 'bot' && !t.name.includes("Compute")).map(tool => {
                                const isAssigned = selectedNode.data.tools?.includes(tool.tenant_tool_id);

                                return (
                                    <label key={tool.tenant_tool_id} className="flex items-center space-x-3 bg-zinc-900/50 border border-zinc-800/50 p-3 rounded-xl cursor-pointer hover:border-blue-500/50 hover:bg-zinc-800/50 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={isAssigned || false}
                                            onChange={() => toggleToolAssignment(tool.tenant_tool_id)}
                                            className="w-4 h-4 bg-zinc-950 border-zinc-700 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-zinc-200">{tool.name}</div>
                                            <div className="text-xs text-zinc-500">{tool.connection_name}</div>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="pt-4 mt-2 border-t border-zinc-800 flex justify-end">
                    <button
                        onClick={() => {
                            setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                            setSelectedNode(null);
                        }}
                        className="text-xs text-red-500 hover:text-red-400 font-semibold p-2"
                    >
                        Remove Agent
                    </button>
                </div>
            </div>
        </div>
    );
}
