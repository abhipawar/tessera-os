import React from 'react';
import { TerminalSquare, X } from 'lucide-react';

interface AuditLog {
    id: string;
    tool_name: string;
    started_at: string;
    agent_name: string;
    status: string;
    output_preview: string;
}

interface AuditLogsSidebarProps {
    showLogs: boolean;
    setShowLogs: (show: boolean) => void;
    auditLogs: AuditLog[];
}

export default function AuditLogsSidebar({ showLogs, setShowLogs, auditLogs }: AuditLogsSidebarProps) {
    return (
        <div className={`w-96 border-l border-zinc-800 bg-zinc-950 flex flex-col absolute right-0 top-0 bottom-0 z-20 shadow-2xl transition-transform duration-300 ${showLogs ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
                <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                    <TerminalSquare size={16} className="text-emerald-500" />
                    Live Execution Logs
                </h2>
                <button onClick={() => setShowLogs(false)} className="text-zinc-500 hover:text-zinc-300">
                    <X size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {auditLogs.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center mt-10">No tool executions recorded yet.</p>
                ) : (
                    auditLogs.map((log) => (
                        <div key={log.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                    {log.tool_name}
                                </span>
                                <span className="text-[10px] text-zinc-600">
                                    {new Date(log.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-[11px] font-mono text-zinc-400 break-all bg-zinc-950 p-2 rounded">
                                <span className="text-blue-400">{log.agent_name}</span> executed tool
                            </p>
                            {log.status === 'success' ? (
                                <div className="text-[10px] text-zinc-400 line-clamp-4 overflow-hidden mt-2 font-mono bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                    {log.output_preview}
                                </div>
                            ) : (
                                <div className="text-[10px] text-red-400 bg-red-950/30 p-2 rounded mt-2 border border-red-900/30 font-mono">
                                    {log.output_preview}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
