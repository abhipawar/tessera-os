import React, { useMemo } from 'react';
import { useStudioStore } from '@/store/studioStore';
import { Panel } from 'reactflow';
import { X, Activity, Database, TerminalSquare, AlertCircle, Loader2 } from 'lucide-react';

export default function ExecutionInspector({ onClose }: { onClose: () => void }) {
    const {
        selectedNode,
        executionHistory,
        isFetchingHistory,
        fetchWorkspaceExecutionHistory
    } = useStudioStore();

    // Fetch history when the panel opens if we haven't already
    React.useEffect(() => {
        fetchWorkspaceExecutionHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sanitize label to match LangChain AI message formatting (same as chat.py)
    const getSafeLabel = (label: string) => {
        return label.replace(/[^a-zA-Z0-9_-]/g, '_');
    };

    // Filter history for the selected node
    const nodeHistory = useMemo(() => {
        if (!selectedNode || !executionHistory) return [];
        const safeName = getSafeLabel(selectedNode.data?.label || '');

        return executionHistory.filter(item => {
            if (item.type === 'ai' && item.name === safeName) return true;
            // For Human approval nodes, we might need a different check, 
            // but for now, we rely on the node's name matching the AI output.
            return false;
        });
    }, [selectedNode, executionHistory]);

    if (!selectedNode) return null;

    return (
        <Panel position="bottom-right" className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-[450px] max-h-[600px] flex flex-col z-50 overflow-hidden m-4 mb-20 relative">

            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
                        <Activity size={14} className="text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Execution Inspector</h3>
                        <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">Node: {selectedNode.data?.label}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchWorkspaceExecutionHistory()}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                        title="Refresh Trace"
                    >
                        {isFetchingHistory ? <Loader2 size={16} className="animate-spin text-emerald-500" /> : <Database size={16} />}
                    </button>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isFetchingHistory && executionHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 space-y-3">
                        <Loader2 size={24} className="animate-spin text-emerald-500" />
                        <span className="text-xs text-zinc-500">Querying Execution Engine...</span>
                    </div>
                ) : nodeHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 space-y-3 text-center px-4">
                        <AlertCircle size={32} className="text-zinc-700" />
                        <div className="space-y-1">
                            <p className="text-sm text-zinc-400 font-medium">No execution trace found</p>
                            <p className="text-xs text-zinc-600">This node hasn't run in the most recent chat session, or its name doesn't match the output log.</p>
                        </div>
                    </div>
                ) : (
                    nodeHistory.map((item, idx) => (
                        <div key={idx} className="space-y-4">
                            {/* Context Variables / Input State */}
                            {item.context_variables && Object.keys(item.context_variables).length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Database size={12} /> Graph Memory State
                                    </h4>
                                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-x-auto">
                                        <pre className="text-[11px] text-emerald-400/90 font-mono leading-relaxed">
                                            {JSON.stringify(item.context_variables, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Node Output */}
                            <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <TerminalSquare size={12} /> Agent Output
                                </h4>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <p className="text-xs text-zinc-300 leading-relaxed break-words whitespace-pre-wrap">
                                        {item.content}
                                    </p>
                                </div>
                            </div>

                            {/* Tool Calls */}
                            {item.tool_calls && item.tool_calls.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Activity size={12} /> Tool Invocations
                                    </h4>
                                    {item.tool_calls.map((tc: any, tIdx: number) => (
                                        <div key={tIdx} className="bg-zinc-900 border border-blue-900/30 rounded-lg p-3 overflow-x-auto">
                                            <div className="text-[11px] text-blue-400 font-bold uppercase mb-2">{tc.name}</div>
                                            <pre className="text-[11px] text-zinc-400 font-mono">
                                                {JSON.stringify(tc.args, null, 2)}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {idx < nodeHistory.length - 1 && <hr className="border-t border-zinc-800 my-4" />}
                        </div>
                    ))
                )}
            </div>

        </Panel>
    );
}
