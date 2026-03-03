import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

function StartNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <div className={`px-4 py-3 shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-xl border border-blue-500/30 bg-zinc-900/90 backdrop-blur-sm min-w-[200px] flex flex-col overflow-hidden transition-all duration-200 ${selected ? 'ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'hover:border-blue-500/50'}`}>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Play className="text-blue-500 ml-0.5" size={16} fill="currentColor" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-100">{data.label || 'Start'}</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-400">Entry Point</span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-zinc-800 border-2 border-blue-500 hover:bg-blue-400 hover:scale-125 hover:shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all"
            />
        </div>
    );
}

export default memo(StartNode);
