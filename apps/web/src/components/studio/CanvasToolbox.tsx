import React, { useState } from 'react';
import { Network, Search, GripVertical, Bot, Plus, X, Wrench, PlayCircle, SplitSquareHorizontal, CheckCircle2 } from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';

export default function CanvasToolbox() {
    const { agents, isLoadingAgents, searchQuery, setSearchQuery, configuredTools } = useStudioStore();
    const [isOpen, setIsOpen] = useState(false);

    const onDragStart = (event: React.DragEvent, item: any, type: string) => {
        let payload: any = {};

        if (type === 'tool') {
            payload = {
                type: 'toolNode',
                label: item.connection_name || item.global_tools.name,
                description: item.global_tools.description,
                tool_id: item.id
            };
        } else {
            payload = {
                type: item.type_override || 'customAgent',
                label: item.name,
                description: item.description,
                systemPrompt: item.system_prompt || '',
                condition: item.type_override === 'conditionalNode' ? 'If the payload contains...' : undefined,
                tools: []
            };
        }

        event.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
        event.dataTransfer.effectAllowed = 'move';
    };

    // Construct Node Categories
    const controlNodes = [
        {
            id: 'node_trigger',
            name: 'Async Trigger',
            description: 'Starts the execution thread based on a webhook payload.',
            type_override: 'triggerNode',
            icon: PlayCircle
        },
        {
            id: 'node_scheduler',
            name: 'Scheduled Trigger',
            description: 'Wakes the workspace at a precise frequency via cron jobs.',
            type_override: 'triggerNode',
            icon: PlayCircle
        },
        {
            id: 'node_approval',
            name: 'Approval Checkpoint',
            description: 'Pauses the execution thread and alerts a human. Resumes upon explicit UI approval.',
            type_override: 'approvalNode',
            icon: CheckCircle2
        },
        {
            id: 'node_conditional',
            name: 'Conditional Splitter',
            description: 'Branches the execution flow (True/False) based on an AI-evaluated natural language condition.',
            type_override: 'conditionalNode',
            icon: SplitSquareHorizontal
        }
    ];

    const groupedItems = [
        { category: 'Flow Control', items: controlNodes, type: 'agent' },
        { category: 'AI Agents', items: agents.map(a => ({ ...a, icon: Bot })), type: 'agent' },
        {
            category: 'Connected Tools',
            items: configuredTools.map(t => ({
                ...t,
                name: t.connection_name || t.global_tools.name,
                description: t.global_tools.description,
                icon: Wrench
            })),
            type: 'tool'
        }
    ];

    const filteredCategories = groupedItems.map(group => ({
        ...group,
        items: group.items.filter((item: any) => {
            const nameMatch = item.name ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            const descMatch = item.description ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) : false;
            return nameMatch || descMatch;
        })
    })).filter(group => group.items.length > 0);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="absolute left-6 top-24 z-50 flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-[0_8px_32px_rgba(79,70,229,0.4)] transition-all font-medium border border-indigo-400/50 hover:scale-105"
            >
                <Plus size={20} />
                Add Node
            </button>
        );
    }

    return (
        <div className="absolute left-6 top-24 bottom-24 w-80 flex flex-col border border-zinc-800/80 bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-[0_16px_64px_rgba(0,0,0,0.8)] z-50 overflow-hidden font-sans animation-slide-in-left">
            <div className="p-4 border-b border-zinc-800/50 space-y-4">
                <div className="flex items-center justify-between text-zinc-100">
                    <div className="flex items-center gap-2">
                        <Network className="text-indigo-400" size={20} />
                        <h2 className="text-lg font-bold">Node Toolbox</h2>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 rounded-full p-1.5">
                        <X size={16} />
                    </button>
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search nodes & tools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-zinc-200 placeholder:text-zinc-600 shadow-inner"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {isLoadingAgents ? (
                    <div className="text-center text-sm text-zinc-500 mt-10">Loading catalog...</div>
                ) : filteredCategories.length === 0 ? (
                    <div className="text-center text-sm text-zinc-500 mt-10 p-6 bg-zinc-950/50 rounded-xl border border-zinc-800/50">Cannot find node "{searchQuery}"</div>
                ) : (
                    filteredCategories.map(({ category, items, type }) => (
                        <div key={category} className="space-y-3">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{category}</h3>
                            <div className="space-y-2">
                                {items.map((item: any) => {
                                    const IconNode = item.icon || Bot;
                                    return (
                                        <div
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, item, type)}
                                            className="p-3.5 bg-zinc-950/50 border border-zinc-800/80 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:bg-indigo-900/10 hover:shadow-[0_4px_20px_rgba(79,70,229,0.15)] transition-all group flex items-start gap-3 relative overflow-hidden"
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/0 group-hover:bg-indigo-500/50 transition-colors" />
                                            <div className="mt-0.5 text-zinc-700 group-hover:text-indigo-400 transition-colors">
                                                <GripVertical size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <IconNode size={14} className={type === 'tool' ? "text-emerald-400" : "text-blue-400"} />
                                                    <span className="text-sm font-semibold text-zinc-200 truncate">{item.name}</span>
                                                </div>
                                                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #3f3f46;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #52525b;
                }
            `}</style>
        </div>
    );
}
