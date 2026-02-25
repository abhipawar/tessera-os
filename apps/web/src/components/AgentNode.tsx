import React from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

// Added 'selected' to the props so React Flow can tell us when it's clicked
export default function AgentNode({ data, selected }: { data: any, selected: boolean }) {
  return (
    <div className={`px-4 py-3 shadow-lg rounded-xl bg-white border min-w-[250px] transition-all hover:shadow-xl ${
      selected ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200 hover:border-blue-400'
    }`}>
      <div className="flex items-center">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-blue-50 text-blue-600 border border-blue-100">
          <Bot size={24} />
        </div>
        <div className="ml-4">
          <div className="text-sm font-bold text-slate-800">{data.label}</div>
          <div className="text-xs text-slate-500 mt-0.5">{data.description || 'Autonomous Worker'}</div>
        </div>
      </div>

      {/* Target Handle (Top) - Where incoming lines connect */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-4 h-4 !bg-slate-400 border-2 border-white shadow-sm" 
      />
      
      {/* Source Handle (Bottom) - Where you drag from to create a new line */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-4 h-4 !bg-blue-500 border-2 border-white shadow-sm" 
      />
    </div>
  );
}