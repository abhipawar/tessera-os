import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

function TriggerNode({ data, selected }: { data: any, selected: boolean }) {
    return (
        <div
            className={`
        relative min-w-[220px] max-w-[280px] bg-indigo-950/80 backdrop-blur-xl border border-indigo-800/50 rounded-xl p-3 transition-all duration-300
        ${selected ? 'border-indigo-400 shadow-[0_0_25px_rgba(129,140,248,0.3)] scale-[1.02]' : 'shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-indigo-700/80'}
      `}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner
            ${selected ? 'bg-gradient-to-br from-indigo-500/30 to-indigo-500/10 border border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(129,140,248,0.2)]' : 'bg-indigo-950/50 border border-indigo-800/50 text-indigo-400'}
          `}
                >
                    <Zap size={20} />
                </div>

                <div className="flex flex-col overflow-hidden pt-0.5">
                    <span className="text-sm font-semibold text-zinc-100 truncate">
                        {data.label}
                    </span>
                    <span className="text-xs text-indigo-300/70 line-clamp-2 mt-0.5 leading-snug">
                        {data.description || 'Async Entry Point'}
                    </span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-zinc-950 border-2 border-indigo-500 rounded-full -mb-1.5 hover:bg-emerald-400 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(52,211,153,0.8)] transition-all"
            />
        </div>
    );
}

export default memo(TriggerNode);
