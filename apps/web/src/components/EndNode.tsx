import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Square } from 'lucide-react';

function EndNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <div className={`px-4 py-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] rounded-xl border border-red-500/30 bg-zinc-900/90 backdrop-blur-sm min-w-[200px] flex flex-col overflow-hidden transition-all duration-200 ${selected ? 'ring-2 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'hover:border-red-500/50'}`}>
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-zinc-800 border-2 border-red-500 hover:bg-red-400 hover:scale-125 hover:shadow-[0_0_10px_rgba(239,68,68,0.8)] transition-all"
            />

            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Square className="text-red-500" size={14} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-100">{data.label || 'End'}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-red-400">Terminal</span>
                </div>
            </div>
        </div>
    );
}

export default memo(EndNode);
