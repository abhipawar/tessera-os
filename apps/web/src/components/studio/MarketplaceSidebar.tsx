import React from 'react';
import { Network, Search, GripVertical, Bot } from 'lucide-react';
import { useStudioStore, GlobalAgent } from '@/store/studioStore';

export default function MarketplaceSidebar() {
    const { agents, isLoadingAgents, searchQuery, setSearchQuery } = useStudioStore();

    const onDragStart = (event: React.DragEvent, agent: any) => {
        const payload = {
            type: agent.type_override || 'customAgent',
            label: agent.name,
            description: agent.description,
            systemPrompt: agent.system_prompt || '',
            condition: agent.type_override === 'conditionalNode' ? 'If the payload contains...' : undefined,
            tools: []
        };
        event.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
        event.dataTransfer.effectAllowed = 'move';
    };

    const groupedAgents = [
        ...agents,
        {
            id: 'node_trigger',
            name: 'Async Trigger',
            description: 'Starts the execution thread based on a webhook payload.',
            system_prompt: '',
            tool_categories: { display_name: 'Flow Control' },
            type_override: 'triggerNode'
        },
        {
            id: 'node_scheduler',
            name: 'Scheduled Trigger',
            description: 'Wakes the workspace at a precise frequency (e.g., hourly, daily) via cron job events.',
            system_prompt: '',
            tool_categories: { display_name: 'Flow Control' },
            type_override: 'triggerNode'
        },
        {
            id: 'node_approval',
            name: 'Approval Checkpoint',
            description: 'Pauses the execution thread and alerts a human. Will resume upon explicit UI approval.',
            system_prompt: '',
            tool_categories: { display_name: 'Flow Control' },
            type_override: 'approvalNode'
        },
        {
            id: 'node_conditional',
            name: 'Conditional Splitter',
            description: 'Branches the execution flow (True/False) based on an AI-evaluated natural language condition.',
            system_prompt: '',
            tool_categories: { display_name: 'Flow Control' },
            type_override: 'conditionalNode'
        }
    ].reduce((acc, agent) => {
        const categoryName = agent.tool_categories?.display_name || 'General Agents';
        if (!acc[categoryName]) acc[categoryName] = [];
        acc[categoryName].push(agent);
        return acc;
    }, {} as Record<string, any[]>);

    const filteredCategories = Object.entries(groupedAgents).map(([category, catAgents]) => ({
        category,
        agents: catAgents.filter(a => {
            const nameMatch = a.name ? a.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            const descMatch = a.description ? a.description.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            return nameMatch || descMatch;
        })
    })).filter(group => group.agents.length > 0);

    return (
        <div className="w-80 flex flex-col border-r border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl shrink-0 z-10 font-sans">
            <div className="p-4 border-b border-zinc-800/50 space-y-4">
                <div className="flex items-center gap-2 text-zinc-100">
                    <Network className="text-blue-500" size={20} />
                    <h2 className="text-lg font-bold">Agent Marketplace</h2>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search catalog..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1.5 pl-9 pr-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-zinc-300"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {isLoadingAgents ? (
                    <div className="text-center text-sm text-zinc-500 mt-10">Loading catalog...</div>
                ) : filteredCategories.length === 0 ? (
                    <div className="text-center text-sm text-zinc-500 mt-10">No agents found.</div>
                ) : (
                    filteredCategories.map(({ category, agents }) => (
                        <div key={category} className="space-y-3">
                            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{category}</h3>
                            <div className="space-y-2">
                                {agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, agent)}
                                        className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:bg-blue-900/10 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5 text-zinc-600 group-hover:text-blue-500 transition-colors">
                                                <GripVertical size={16} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Bot size={14} className="text-blue-400" />
                                                    <span className="text-sm font-semibold text-zinc-200">{agent.name}</span>
                                                </div>
                                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                                    {agent.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
