import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Loader2, Info, Sparkles } from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';
import { useNotificationStore } from '@/store/notificationStore';
import { API_URL } from '@/config';
import { createBrowserClient } from '@supabase/ssr';
import CustomToolModal from './CustomToolModal';

export default function ConfigurationPanel() {
    const { nodes, edges, selectedNode, setSelectedNode, setNodes, configuredTools } = useStudioStore();
    const [isCustomToolModalOpen, setIsCustomToolModalOpen] = useState(false);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    if (!selectedNode) return null;

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleEnhancePrompt = async () => {
        const currentPrompt = selectedNode.data.systemPrompt;
        if (!currentPrompt || currentPrompt.trim().length < 5) {
            useNotificationStore.getState().showNotification({
                title: "Prompt Error",
                message: "Please write at least a basic sentence describing the agent's goal before enhancing.",
                type: "warning"
            });
            return;
        }

        setIsEnhancingPrompt(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${API_URL}/api/tenant/enhance-prompt`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rough_prompt: currentPrompt })
            });
            const data = await res.json();
            if (data.success && data.enhanced_prompt) {
                updateNodeData('systemPrompt', data.enhanced_prompt);
                useNotificationStore.getState().showNotification({
                    title: "Prompt Enhanced",
                    message: "AI has successfully rewritten your agent's system instructions.",
                    type: "success"
                });
            } else {
                throw new Error(data.error || "Failed to enhance prompt");
            }
        } catch (err: any) {
            useNotificationStore.getState().showNotification({
                title: "Enhancement Failed",
                message: err.message,
                type: "error"
            });
        } finally {
            setIsEnhancingPrompt(false);
        }
    };

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
    const getUpstreamNodes = (nodeId: string): any[] => {
        const directSourceIds = edges.filter(e => e.target === nodeId).map(e => e.source);
        return nodes.filter(n => directSourceIds.includes(n.id));
    };

    const upstreamNodes = getUpstreamNodes(selectedNode.id);

    const connectedToolNodes = nodes.filter(n =>
        n.type === 'toolNode' &&
        edges.some(e => e.target === selectedNode.id && e.source === n.id)
    );

    const llmIntegrations = configuredTools.filter((t: any) => t.name.toLowerCase().includes('llm') || t.name.toLowerCase().includes('ai compute'));

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
                        value={selectedNode.data.description || ''}
                        onChange={(e) => updateNodeData('description', e.target.value)}
                        className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                    />
                </div>
                {selectedNode.type === 'conditionalNode' ? (
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Natural Language Condition</label>
                        <textarea
                            value={selectedNode.data.condition || ''}
                            onChange={(e) => updateNodeData('condition', e.target.value)}
                            placeholder="e.g. 'If {{Data Analyst.output}} contains the word URGENT'"
                            className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                        />
                        <div className="mt-2 text-[10px] text-zinc-500 bg-amber-500/5 rounded p-2 border border-amber-500/10 flex items-start gap-1.5">
                            <Info size={12} className="text-amber-400 mt-0.5 shrink-0" />
                            <div>
                                <span className="font-semibold text-amber-400 block mb-1">Conditional Routing:</span>
                                The AI Execution Engine will evaluate this condition at runtime to return a simple True or False, and route the pipeline down the corresponding path.
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-0">
                            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">AI Model Integration</label>
                            <select
                                value={selectedNode.data.llm_integration_id || ''}
                                onChange={(e) => updateNodeData('llm_integration_id', e.target.value)}
                                className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                            >
                                <option value="">Default Workspace LLM</option>
                                {llmIntegrations.map((llm: any) => (
                                    <option key={llm.tenant_tool_id} value={llm.tenant_tool_id}>
                                        {llm.connection_name || llm.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">System Instructions</label>
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancingPrompt}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded border border-indigo-500/20 transition-colors disabled:opacity-50"
                                >
                                    {isEnhancingPrompt ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                    {isEnhancingPrompt ? 'Enhancing...' : 'Enhance'}
                                </button>
                            </div>
                            <textarea
                                value={selectedNode.data.systemPrompt || ''}
                                onChange={(e) => updateNodeData('systemPrompt', e.target.value)}
                                placeholder="Define how this agent should behave (Supports dynamic {{variables}})..."
                                className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                            />
                            <div className="mt-4">
                                <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider text-emerald-500/80">Input Schema (Available Context)</label>
                                {upstreamNodes.length > 0 ? (
                                    <div className="text-[10px] text-zinc-400 bg-zinc-950/50 rounded-lg p-3 border border-emerald-900/30 leading-relaxed shadow-inner">
                                        <div className="mb-2 italic text-zinc-500">Variables available for injection into instructions via <code className="text-zinc-400 font-mono bg-zinc-900 px-1 py-0.5 rounded">{'{{variable}}'}</code>:</div>

                                        {/* Always show the standard context available globally to the node */}
                                        <div className="mb-3 last:mb-0">
                                            <span className="font-semibold text-zinc-300">Global Context:</span>
                                            <div className="ml-2 pl-2 border-l border-zinc-800/50 mt-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-blue-400 font-mono text-[10px]">{'{{user.query}}'}</code>
                                                    <span className="text-zinc-600 px-1 py-0.5 rounded bg-zinc-900 uppercase text-[8px] tracking-wider">string</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="text-blue-400 font-mono text-[10px]">{'{{trigger.payload}}'}</code>
                                                    <span className="text-zinc-600 px-1 py-0.5 rounded bg-zinc-900 uppercase text-[8px] tracking-wider">object</span>
                                                </div>
                                            </div>
                                        </div>

                                        {upstreamNodes.map(upNode => (
                                            <div key={upNode.id} className="mb-3 last:mb-0">
                                                <span className="font-semibold text-emerald-400/80">{upNode.data.label} Output Schema:</span>
                                                <div className="ml-2 pl-2 border-l border-zinc-800/50 mt-1 space-y-1">
                                                    {(() => {
                                                        try {
                                                            const schema = JSON.parse(upNode.data.outputSchema);
                                                            if (schema.properties) {
                                                                return Object.keys(schema.properties).map(key => (
                                                                    <div key={key} className="flex items-center gap-2 py-0.5">
                                                                        <code className="text-emerald-400 font-mono text-[10px] bg-emerald-950/30 px-1 py-0.5 rounded border border-emerald-900/50">{'{{' + upNode.data.label + '.output.' + key + '}}'}</code>
                                                                        <div className="text-zinc-600 flex items-center gap-1">
                                                                            <span className="px-1 py-0.5 rounded bg-zinc-900 uppercase text-[8px] tracking-wider">{schema.properties[key].type}</span>
                                                                            {schema.properties[key].description && <span className="truncate text-[9px]" title={schema.properties[key].description}>- {schema.properties[key].description}</span>}
                                                                        </div>
                                                                    </div>
                                                                ));
                                                            }
                                                        } catch (e) { }
                                                        return (
                                                            <div className="flex items-center gap-2 py-0.5">
                                                                <code className="text-zinc-400 font-mono text-[10px] bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">{'{{' + upNode.data.label + '.output}}'}</code>
                                                                <span className="text-zinc-600 italic text-[9px]">(Raw unstructured output text)</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-zinc-600 italic p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                                        No upstream nodes connected. Add connections to inherit schemas dynamically.
                                        <div className="mt-2 pt-2 border-t border-zinc-800/50 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <code className="text-blue-400 font-mono text-[10px]">{'{{user.query}}'}</code>
                                                <span className="text-zinc-600 px-1 py-0.5 rounded bg-zinc-900 uppercase text-[8px] tracking-wider">string</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="text-blue-400 font-mono text-[10px]">{'{{trigger.payload}}'}</code>
                                                <span className="text-zinc-600 px-1 py-0.5 rounded bg-zinc-900 uppercase text-[8px] tracking-wider">object</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Output Schema (JSON)</label>
                            <textarea
                                value={selectedNode.data.outputSchema || ''}
                                onChange={(e) => updateNodeData('outputSchema', e.target.value)}
                                placeholder='{"type": "object", "properties": {"summary": {"type": "string"}}}'
                                className="w-full text-[10px] p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg h-32 resize-none font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-300"
                                spellCheck="false"
                            />
                            <div className="mt-2 text-[10px] text-zinc-500 bg-zinc-950/50 rounded p-2 border border-zinc-800/50 flex items-start gap-1.5">
                                <Info size={12} className="text-zinc-400 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-semibold text-zinc-300 block mb-0.5">Strict Output Formatting:</span>
                                    Define a JSON Schema. If specified, the engine will strictly format this agent's output and store it as a JSON object, enabling downstream variables like <code className="text-blue-400">{'{{' + selectedNode.data.label + '.output.key}}'}</code>.
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-900/20 to-blue-900/5 border border-blue-500/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[30px] rounded-full group-hover:bg-blue-500/20 transition-all pointer-events-none"></div>
                                <div className="flex items-start gap-3 relative z-10">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                        <Cpu size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-blue-400 mb-1 flex items-center gap-2">
                                            {selectedNode.data.llm_integration_id ? 'Node LLM Override Active' : 'Tenant Intelligence Active'}
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-300 tracking-wider">
                                                {selectedNode.data.llm_integration_id ? 'LOCAL' : 'GLOBAL'}
                                            </span>
                                        </h4>
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            {selectedNode.data.llm_integration_id
                                                ? 'This Agent is explicitly powered by a customized, node-level LLM Integration rather than the workspace default.'
                                                : 'This Agent is automatically powered by the global language model configured in your Tenant Integrations Hub.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 block border-b border-zinc-800 pb-2">
                                Connected Capabilities
                            </label>
                            <div className="space-y-3">
                                {connectedToolNodes.length === 0 ? (
                                    <div className="text-[10px] text-zinc-600 italic p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
                                        No tools connected. Drag a tool from the "Add Node" menu and wire it to the bottom of this agent.
                                    </div>
                                ) : (
                                    connectedToolNodes.map(tNode => (
                                        <div key={tNode.id} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl relative overflow-hidden group">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                                <Sparkles size={14} className="text-emerald-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-zinc-200 truncate">{tNode.data.label}</h4>
                                                <p className="text-[10px] text-zinc-500 truncate">{tNode.data.description}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button
                                onClick={() => setIsCustomToolModalOpen(true)}
                                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all"
                            >
                                <span className="text-orange-400 font-bold text-sm">+</span> Build Sandboxed Script
                            </button>
                        </div>
                    </>
                )}

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
            <CustomToolModal isOpen={isCustomToolModalOpen} onClose={() => setIsCustomToolModalOpen(false)} />
        </div>
    );
}
