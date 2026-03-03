import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

function AgentNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <div
      className={`
        relative min-w-[220px] max-w-[280px] bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-xl p-3 transition-all duration-300
        ${selected ? 'border-blue-500 shadow-[0_0_25px_rgba(37,99,235,0.3)] scale-[1.02]' : 'shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-zinc-700/80'}
      `}
    >
      {/* Top Handle (Incoming Connections) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-5 h-5 bg-zinc-900 border-2 border-zinc-500 rounded-full -mt-2.5 hover:bg-blue-500 hover:border-blue-400 hover:scale-150 transition-all z-20"
      />

      <div className="flex items-start gap-3">
        {/* Agent Icon Area */}
        <div
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-inner
            ${selected ? 'bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-zinc-950 border border-zinc-800 text-zinc-400'}
          `}
        >
          <Bot size={20} />
        </div>

        {/* Text Area */}
        <div className="flex flex-col overflow-hidden pt-0.5">
          <span className="text-sm font-semibold text-zinc-100 truncate">
            {data.label}
          </span>
          <span className="text-xs text-zinc-500 line-clamp-2 mt-0.5 leading-snug">
            {data.description || 'Autonomous Agent'}
          </span>
        </div>
      </div>

      {/* Bottom Handle (Outgoing Connections) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-5 h-5 bg-zinc-900 border-2 border-zinc-500 rounded-full -mb-2.5 hover:bg-emerald-500 hover:border-emerald-400 hover:scale-150 transition-all z-20"
      />
    </div>
  );
}

export default memo(AgentNode);