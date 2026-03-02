import React, { useState, useEffect } from 'react';
import { Settings, X, Cpu, Loader2, Info } from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';
import { createBrowserClient } from '@supabase/ssr';

export default function ConfigurationPanel() {
    const { selectedNode, setSelectedNode, setNodes, configuredTools } = useStudioStore();
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
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">System Instructions</label>
                            <textarea
                                value={selectedNode.data.systemPrompt || ''}
                                onChange={(e) => updateNodeData('systemPrompt', e.target.value)}
                                placeholder="Define how this agent should behave (Supports dynamic {{variables}})..."
                                className="w-full text-sm p-2.5 bg-zinc-950/50 border border-zinc-800/50 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                            />
                            <div className="mt-2 text-[10px] text-zinc-500 bg-blue-500/5 rounded p-2 border border-blue-500/10 flex items-start gap-1.5">
                                <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-semibold text-blue-400 block mb-1">Data Mapping Guide:</span>
                                    Inject dynamic data at runtime using double brackets. <br />
                                    <span className="text-zinc-400">Webhook Trigger payload:</span> <code className="text-zinc-300 font-mono">{'{{trigger.payload.key}}'}</code><br />
                                    <span className="text-zinc-400">Agent Output:</span> <code className="text-zinc-300 font-mono">{'{{Agent Name.output}}'}</code><br />
                                    <span className="text-zinc-400">User Query:</span> <code className="text-zinc-300 font-mono">{'{{user.query}}'}</code>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 block border-b border-zinc-800 pb-2">
                                Assigned Intergrations & Tools
                            </label>
                            <div className="space-y-6">
                                {configuredTools.length === 0 ? (
                                    <p className="text-sm text-zinc-500 italic p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">No tools configured in Integrations Hub yet.</p>
                                ) : (
                                    (Object.entries(
                                        configuredTools.reduce((acc, tool) => {
                                            const category = tool.name; // The global template name acts as category
                                            if (!acc[category]) acc[category] = [];
                                            acc[category].push(tool);
                                            return acc;
                                        }, {} as Record<string, any[]>)
                                    ) as [string, any[]][]).map(([category, tools]) => (
                                        <div key={category} className="space-y-2">
                                            <h4 className="text-xs font-bold text-zinc-400 capitalize flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                {category}
                                            </h4>
                                            <div className="space-y-2 pl-3 border-l border-zinc-800/50 ml-1">
                                                {tools.map((tool: any) => {
                                                    const isAssigned = selectedNode.data.tools?.includes(tool.tenant_tool_id);
                                                    return (
                                                        <label key={tool.tenant_tool_id} className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all border ${isAssigned ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isAssigned || false}
                                                                onChange={() => toggleToolAssignment(tool.tenant_tool_id)}
                                                                className="w-4 h-4 bg-zinc-950 border-zinc-700 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
                                                            />
                                                            <div className="flex-1">
                                                                <div className={`text-sm font-semibold transition-colors ${isAssigned ? 'text-blue-400' : 'text-zinc-200'}`}>
                                                                    {tool.connection_name || tool.name}
                                                                </div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
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
        </div>
    );
}
