import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

function AgentNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <div 
      className={`
        relative min-w-[220px] max-w-[280px] bg-zinc-950 border-2 rounded-xl p-3 shadow-2xl transition-all duration-200
        ${selected ? 'border-blue-500 shadow-blue-900/20' : 'border-zinc-800 hover:border-zinc-700'}
      `}
    >
      {/* Top Handle (Incoming Connections) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-zinc-950 border-2 border-zinc-500 rounded-full -mt-1.5 hover:bg-blue-400 hover:border-blue-400 transition-colors"
      />

      <div className="flex items-start gap-3">
        {/* Agent Icon Area */}
        <div 
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
            ${selected ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}
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
        className="w-3 h-3 bg-zinc-950 border-2 border-zinc-500 rounded-full -mb-1.5 hover:bg-blue-400 hover:border-blue-400 transition-colors"
      />
    </div>
  );
}

export default memo(AgentNode);