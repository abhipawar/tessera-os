import React, { useState } from 'react';
import { 
  Database, 
  MessageSquare, 
  Briefcase, 
  Code, 
  Truck, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Bot
} from 'lucide-react';

// 1. The Global Catalog Data Structure
const MARKETPLACE_CATALOG = [
  {
    id: 'data-engineering',
    title: 'Data & Engineering',
    items: [
      { type: 'customAgent', label: 'Data Analyst', description: 'SQL & Reporting', icon: Database },
      { type: 'customAgent', label: 'Python Sandbox', description: 'E2B Code Exec', icon: Code }
    ]
  },
  {
    id: 'operations',
    title: 'Operations & Supply',
    items: [
      { type: 'customAgent', label: 'Procurement Spec', description: 'Vendor Mgmt', icon: Truck },
      { type: 'customAgent', label: 'Inventory Watcher', description: 'Stock Levels', icon: Database }
    ]
  },
  {
    id: 'hr-internal',
    title: 'HR & Internal',
    items: [
      { type: 'customAgent', label: 'HR Specialist', description: 'Onboarding Info', icon: Briefcase },
      { type: 'customAgent', label: 'Policy Bot', description: 'Company Rules', icon: FileText }
    ]
  },
  {
    id: 'communications',
    title: 'Communications',
    items: [
      { type: 'customAgent', label: 'Comms Agent', description: 'Email & Slack', icon: MessageSquare },
      { type: 'customAgent', label: 'Support Rep', description: 'Ticketing Triage', icon: Bot }
    ]
  }
];

export default function AgentToolbox() {
  // Keep all categories open by default so the user sees the options immediately
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    MARKETPLACE_CATALOG.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, description: string) => {
    const payload = JSON.stringify({ type: nodeType, label, description });
    event.dataTransfer.setData('application/reactflow', payload);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agent Marketplace</div>
        <div className="text-xs text-slate-400 mt-1">Drag workers onto the canvas</div>
      </div>
      
      {/* Scrollable Container for the Catalog */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {MARKETPLACE_CATALOG.map((category) => (
          <div key={category.id} className="flex flex-col">
            
            {/* Accordion Header */}
            <button 
              onClick={() => toggleSection(category.id)}
              className="flex items-center justify-between py-2 px-1 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors w-full"
            >
              {category.title}
              {openSections[category.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {/* Draggable Agent Cards */}
            {openSections[category.id] && (
              <div className="flex flex-col gap-2 mt-2">
                {category.items.map((agent, idx) => {
                  const Icon = agent.icon;
                  return (
                    <div 
                      key={idx}
                      className="p-3 border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm transition-all flex items-center gap-3 bg-white"
                      onDragStart={(e) => onDragStart(e, agent.type, agent.label, agent.description)}
                      draggable
                    >
                      <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{agent.label}</span>
                        <span className="text-xs text-slate-500">{agent.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}