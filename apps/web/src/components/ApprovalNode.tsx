import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ShieldCheck } from 'lucide-react';

import { useStudioStore } from '@/store/studioStore';

function ApprovalNode({ id, data, selected }: { id: string, data: any, selected: boolean }) {
    const { runningNodes } = useStudioStore();
    const isRunning = runningNodes.includes(id);

    return (
        <div
            className={`
        relative min-w-[220px] max-w-[280px] bg-amber-950/80 backdrop-blur-xl border border-amber-800/50 rounded-xl p-3 transition-all duration-300
        ${isRunning ? 'border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-pulse scale-[1.03]' :
                    selected ? 'border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.3)] scale-[1.02]' : 'shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-amber-700/80'}
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-zinc-950 border-2 border-amber-500 rounded-full -mt-1.5 hover:bg-amber-400 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(251,191,36,0.8)] transition-all"
            />

            <div className="flex items-start gap-3">
                <div
                    className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner
            ${isRunning ? 'bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/50 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]' :
                            selected ? 'bg-gradient-to-br from-amber-500/30 to-amber-500/10 border border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'bg-amber-950/50 border border-amber-800/50 text-amber-500'}
          `}
                >
                    <ShieldCheck size={20} />
                </div>

                <div className="flex flex-col overflow-hidden pt-0.5">
                    <span className="text-sm font-semibold text-zinc-100 truncate">
                        {data.label}
                    </span>
                    <span className="text-xs text-amber-300/70 line-clamp-2 mt-0.5 leading-snug">
                        {data.description || 'Human-in-the-Loop Checkpoint'}
                    </span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-zinc-950 border-2 border-amber-500 rounded-full -mb-1.5 hover:bg-emerald-400 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(52,211,153,0.8)] transition-all"
            />
        </div>
    );
}

export default memo(ApprovalNode);
