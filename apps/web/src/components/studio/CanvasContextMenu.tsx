import React from 'react';
import { Copy, Trash2, Maximize, XCircle, Settings, Edit3, Unplug, ClipboardCopy, Palette, PlusSquare, Bot, ClipboardPaste, Activity } from 'lucide-react';
import { useReactFlow } from 'reactflow';
import { useStudioStore } from '@/store/studioStore';

interface CanvasContextMenuProps {
    x: number;
    y: number;
    type: 'node' | 'pane' | 'edge';
    nodeId?: string;
    edgeId?: string;
    onClose: () => void;
}

export default function CanvasContextMenu({ x, y, type, nodeId, edgeId, onClose }: CanvasContextMenuProps) {
    const { fitView, project } = useReactFlow();
    const { nodes, edges, setNodes, setEdges, setSelectedNode, setClipboardNode, clipboardNode, setIsTeamPanelOpen } = useStudioStore();

    // -- Node Actions --
    const handleDuplicateNode = () => {
        if (!nodeId) return;
        const nodeToDuplicate = nodes.find(n => n.id === nodeId);
        if (!nodeToDuplicate) return;

        const newNodeId = `${nodeToDuplicate.id}_copy_${Date.now()}`;
        const newNode = {
            ...nodeToDuplicate,
            id: newNodeId,
            position: { x: nodeToDuplicate.position.x + 50, y: nodeToDuplicate.position.y + 50 },
            selected: false,
            data: { ...nodeToDuplicate.data, label: `${nodeToDuplicate.data.label} (Copy)` }
        };
        setNodes([...nodes, newNode]);
        onClose();
    };

    const handleDeleteNode = () => {
        if (!nodeId) return;
        setNodes(nodes.filter(n => n.id !== nodeId));
        setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
        setSelectedNode(null);
        onClose();
    };

    const handleEditDetails = () => {
        if (!nodeId) return;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setSelectedNode(node);
            setIsTeamPanelOpen(false);
        }
        onClose();
    };

    const handleRenameNode = () => {
        if (!nodeId) return;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const newName = window.prompt("Enter new node name:", node.data.label);
        if (newName !== null && newName.trim() !== '') {
            setNodes(nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: newName.trim() } } : n));
        }
        onClose();
    };

    const handleDisconnectEdges = () => {
        if (!nodeId) return;
        setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
        onClose();
    };

    const handleCopyId = () => {
        if (!nodeId) return;
        navigator.clipboard.writeText(nodeId);
        onClose();
    };

    const handleCopyNode = () => {
        if (!nodeId) return;
        const node = nodes.find(n => n.id === nodeId);
        if (node) setClipboardNode(node);
        onClose();
    };

    const handleToggleColor = () => {
        if (!nodeId) return;
        setNodes(nodes.map(n => {
            if (n.id === nodeId) {
                const currentBg = n.style?.backgroundColor;
                const newBg = currentBg === '#3f3f46' ? undefined : '#3f3f46'; // Toggle zinc-700
                return { ...n, style: { ...n.style, backgroundColor: newBg } };
            }
            return n;
        }));
        onClose();
    };

    // -- Edge Actions --
    const handleDeleteEdge = () => {
        if (!edgeId) return;
        setEdges(edges.filter(e => e.id !== edgeId));
        onClose();
    };

    const handleToggleAnimation = () => {
        if (!edgeId) return;
        setEdges(edges.map(e => e.id === edgeId ? { ...e, animated: !e.animated } : e));
        onClose();
    };

    // -- Pane Actions --
    const handleFitView = () => {
        fitView({ duration: 800, padding: 0.2 });
        onClose();
    };

    const handleClearCanvas = () => {
        const rootNodes = nodes.filter(n => n.type === 'customUser' || n.id === 'supervisor' || n.type === 'triggerNode');
        setNodes(rootNodes);
        setEdges([]);
        setSelectedNode(null);
        onClose();
    };

    const handleAddNode = (nodeType: string, defaultLabel: string) => {
        const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
        if (!reactFlowBounds) { onClose(); return; }

        const position = project({
            x: x - reactFlowBounds.left,
            y: y - reactFlowBounds.top
        });

        const newNodeId = `${nodeType}_${Date.now()}`;
        const newNode = {
            id: newNodeId,
            type: nodeType,
            position,
            data: {
                label: defaultLabel,
                description: '',
                systemPrompt: '',
                tools: [],
                condition: ''
            }
        };

        setNodes([...nodes, newNode]);
        onClose();
    };

    const handlePasteNode = () => {
        if (!clipboardNode) { onClose(); return; }
        const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
        if (!reactFlowBounds) { onClose(); return; }

        const position = project({
            x: x - reactFlowBounds.left,
            y: y - reactFlowBounds.top
        });

        const newNodeId = `${clipboardNode.id}_pasted_${Date.now()}`;
        const newNode = {
            ...clipboardNode,
            id: newNodeId,
            position,
            selected: false,
            data: { ...clipboardNode.data, label: `${clipboardNode.data.label} (Copy)` }
        };

        setNodes([...nodes, newNode]);
        onClose();
    };

    return (
        <div
            className="absolute z-50 w-56 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl overflow-hidden font-sans text-sm animate-in fade-in zoom-in-95 duration-100"
            style={{ top: y, left: x }}
            onMouseLeave={onClose}
        >
            {type === 'node' && (
                <div className="flex flex-col py-1">
                    <button onClick={handleEditDetails} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Settings size={14} className="text-zinc-500" /> Edit Details
                    </button>
                    <button onClick={handleRenameNode} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Edit3 size={14} className="text-zinc-500" /> Rename Node
                    </button>
                    <div className="h-px bg-zinc-800 my-1 mx-2" />
                    <button onClick={handleCopyNode} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Copy size={14} className="text-zinc-500" /> Copy Node
                    </button>
                    <button onClick={handleDuplicateNode} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <PlusSquare size={14} className="text-zinc-500" /> Duplicate Node
                    </button>
                    <button onClick={handleCopyId} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <ClipboardCopy size={14} className="text-zinc-500" /> Copy Node ID
                    </button>
                    <div className="h-px bg-zinc-800 my-1 mx-2" />
                    <button onClick={handleToggleColor} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Palette size={14} className="text-zinc-500" /> Toggle Highlight
                    </button>
                    <button onClick={handleDisconnectEdges} className="flex items-center gap-2 px-3 py-2 text-orange-400 hover:bg-orange-500/10 transition-colors w-full text-left">
                        <Unplug size={14} className="text-orange-500" /> Disconnect Edges
                    </button>
                    <button onClick={handleDeleteNode} className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">
                        <Trash2 size={14} className="text-red-500" /> Delete Node
                    </button>
                </div>
            )}

            {type === 'edge' && (
                <div className="flex flex-col py-1">
                    <button onClick={handleToggleAnimation} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Activity size={14} className="text-zinc-500" /> Toggle Flow Animation
                    </button>
                    <div className="h-px bg-zinc-800 my-1 mx-2" />
                    <button onClick={handleDeleteEdge} className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">
                        <Trash2 size={14} className="text-red-500" /> Delete Edge
                    </button>
                </div>
            )}

            {type === 'pane' && (
                <div className="flex flex-col py-1">
                    <button onClick={() => handleAddNode('customAgent', 'New Agent')} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Bot size={14} className="text-zinc-500" /> Add Agent Node
                    </button>
                    <button onClick={() => handleAddNode('conditionalNode', 'Condition')} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Unplug size={14} className="text-zinc-500" /> Add Condition Node
                    </button>
                    {clipboardNode && (
                        <>
                            <div className="h-px bg-zinc-800 my-1 mx-2" />
                            <button onClick={handlePasteNode} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                                <ClipboardPaste size={14} className="text-zinc-500" /> Paste Node
                            </button>
                        </>
                    )}
                    <div className="h-px bg-zinc-800 my-1 mx-2" />
                    <button onClick={handleFitView} className="flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors w-full text-left">
                        <Maximize size={14} className="text-zinc-500" /> Reset View
                    </button>
                    <button onClick={handleClearCanvas} className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors w-full text-left">
                        <XCircle size={14} className="text-red-500" /> Clear Canvas
                    </button>
                </div>
            )}
        </div>
    );
}
