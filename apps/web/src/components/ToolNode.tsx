import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Wrench } from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';

const ToolNode = ({ data, id }: any) => {
    const { runningNodes, selectedNode } = useStudioStore();
    const isRunning = runningNodes.includes(id);
    const isSelected = selectedNode?.id === id;

    return (
        <div className={`
            min-w-[180px] rounded-2xl border transition-all duration-300 relative shadow-lg
            ${isSelected ? 'bg-zinc-900 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500' : 'bg-zinc-900/90 border-zinc-700 hover:border-emerald-500/50 backdrop-blur-md'}
        `}>
            {/* INCOMING HANDLE (From Agent) */}
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-zinc-800 border-2 border-emerald-500 rounded-sm -mt-1.5 transition-colors hover:bg-emerald-500"
            />

            <div className="p-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                        <Wrench size={16} className="text-emerald-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-zinc-100 truncate flex items-center gap-2">
                            {data.label}
                        </h3>
                        <p className="text-[10px] text-zinc-400 truncate opacity-80 mt-0.5">
                            {isRunning ? 'Executing Tool...' : 'Tool Integration'}
                        </p>
                    </div>
                </div>
            </div>

            {isRunning && (
                <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 blur-sm pointer-events-none animate-pulse" />
            )}
        </div>
    );
};

export default memo(ToolNode);
