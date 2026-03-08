import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

import { useStudioStore } from '@/store/studioStore';

function ConditionalNode({ id, data, selected }: { id: string, data: any, selected: boolean }) {
    const { runningNodes } = useStudioStore();
    const isRunning = runningNodes.includes(id);

    return (
        <div
            className={`
        relative min-w-[220px] max-w-[280px] bg-zinc-900 backdrop-blur-xl border rounded-xl p-3 transition-all duration-300
        ${isRunning ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-pulse scale-[1.03]' :
                    selected ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.2)] scale-[1.02]' : 'border-zinc-700/80 shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-amber-500/50'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="w-5 h-5 bg-zinc-900 border-2 border-zinc-500 rounded-full -mt-2.5 hover:bg-zinc-700 hover:border-zinc-400 hover:scale-150 transition-all z-20"
            />

            <div className="flex items-start gap-3">
                <div
                    className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner
            ${isRunning ? 'bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/50 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]' :
                            selected ? 'bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'bg-zinc-800/80 border border-zinc-700 text-amber-400'}
          `}
                >
                    <GitBranch size={20} />
                </div>

                <div className="flex flex-col overflow-hidden pt-0.5 w-full">
                    <span className="text-sm font-semibold text-zinc-100 truncate">
                        {data.label || 'Conditional Gateway'}
                    </span>
                    <span className="text-xs text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                        {data.condition || 'Add a condition...'}
                    </span>
                </div>
            </div>

            <div className="absolute -bottom-6 w-full flex justify-between px-6 text-[10px] font-bold text-zinc-500 font-mono">
                <span className="text-emerald-500">TRUE</span>
                <span className="text-red-500">FALSE</span>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                id="true"
                style={{ left: '30%' }}
                className="w-5 h-5 bg-zinc-900 border-2 border-emerald-500 rounded-full -mb-2.5 hover:bg-emerald-500 hover:border-emerald-400 hover:scale-150 transition-all z-20"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="false"
                style={{ left: '70%' }}
                className="w-5 h-5 bg-zinc-900 border-2 border-red-500 rounded-full -mb-2.5 hover:bg-red-500 hover:border-red-400 hover:scale-150 transition-all z-20"
            />
        </div>
    );
}

export default memo(ConditionalNode);
