import React, { useRef, useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, Panel } from 'reactflow';
import { Maximize, Minimize } from 'lucide-react';
import 'reactflow/dist/style.css';
import AgentNode from '@/components/AgentNode';
import TriggerNode from '@/components/TriggerNode';
import ApprovalNode from '@/components/ApprovalNode';
import ConditionalNode from '@/components/ConditionalNode';
import StartNode from '@/components/StartNode';
import EndNode from '@/components/EndNode';
import { useStudioStore, GlobalAgent, ChartItem } from '@/store/studioStore';
import CanvasContextMenu from './CanvasContextMenu';
import ExecutionInspector from './ExecutionInspector';
import CanvasToolbox from './CanvasToolbox';
import ToolNode from '../ToolNode';

const nodeTypes = {
    customAgent: AgentNode,
    triggerNode: TriggerNode,
    approvalNode: ApprovalNode,
    conditionalNode: ConditionalNode,
    startNode: StartNode,
    endNode: EndNode,
    toolNode: ToolNode
};

export default function StudioCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes, edges, selectedNode, runningNodes,
        onNodesChange, onEdgesChange, onConnect,
        setNodes, setSelectedNode, setIsTeamPanelOpen,
        isCanvasMaximized, setIsCanvasMaximized
    } = useStudioStore();
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [menuState, setMenuState] = useState<{ show: boolean, x: number, y: number, type: 'pane' | 'node' | 'edge', nodeId?: string, edgeId?: string }>({
        show: false, x: 0, y: 0, type: 'pane'
    });

    // Inspector Toggle State (only show if explicitly requested or let the component handle it)
    const [showInspector, setShowInspector] = useState(false);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            if (!reactFlowWrapper.current || !reactFlowInstance) return;
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const payloadString = event.dataTransfer.getData('application/reactflow');
            if (!payloadString) return;

            const payload = JSON.parse(payloadString);
            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNode = {
                id: `agent_${Date.now()} `,
                type: payload.type,
                position,
                data: {
                    label: payload.label,
                    description: payload.description,
                    systemPrompt: payload.systemPrompt || '',
                    tools: payload.tools || [],
                    condition: payload.condition || ''
                },
            };

            setNodes((nds: any[]) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onNodeClick = React.useCallback((_: React.MouseEvent, node: any) => {
        setSelectedNode(node);
        setIsTeamPanelOpen(false);
        setMenuState(prev => ({ ...prev, show: false }));
    }, [setSelectedNode, setIsTeamPanelOpen]);

    const onPaneClick = React.useCallback(() => {
        setSelectedNode(null);
        setMenuState(prev => ({ ...prev, show: false }));
    }, [setSelectedNode]);

    const onNodeContextMenu = React.useCallback((event: React.MouseEvent, node: any) => {
        event.preventDefault();
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;
        setMenuState({
            show: true,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
            type: 'node',
            nodeId: node.id
        });
    }, []);

    const onPaneContextMenu = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;
        setMenuState({
            show: true,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
            type: 'pane'
        });
    }, []);

    const onEdgeContextMenu = React.useCallback((event: React.MouseEvent, edge: any) => {
        event.preventDefault();
        const bounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!bounds) return;
        setMenuState({
            show: true,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
            type: 'edge',
            edgeId: edge.id
        });
    }, []);

    return (
        <div className="flex-1 h-full relative overflow-hidden bg-zinc-950" ref={reactFlowWrapper}>
            {/* Ambient Canvas Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

            {/* Unified Node Toolbox Overlay */}
            {!isCanvasMaximized && <CanvasToolbox />}

            <ReactFlow
                nodes={nodes}
                edges={edges.map(e => ({
                    ...e,
                    animated: runningNodes.includes(e.source) || runningNodes.includes(e.target) || e.animated
                }))}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={(e, node) => {
                    onNodeClick(e, node);
                    setShowInspector(true);
                }}
                onPaneClick={() => {
                    onPaneClick();
                    setShowInspector(false);
                }}
                onNodeContextMenu={onNodeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ maxZoom: 0.85 }}
                className="bg-transparent z-10"
            >
                <Panel position="top-left" className="m-4 z-50">
                    <button
                        onClick={() => setIsCanvasMaximized(!isCanvasMaximized)}
                        className="p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all flex items-center justify-center group"
                        title={isCanvasMaximized ? "Minimize Canvas" : "Maximize Canvas"}
                    >
                        {isCanvasMaximized ? <Minimize size={18} className="group-hover:scale-110 transition-transform" /> : <Maximize size={18} className="group-hover:scale-110 transition-transform" />}
                    </button>
                </Panel>

                {/* Execution Inspector */}
                {showInspector && selectedNode && (
                    <ExecutionInspector onClose={() => setShowInspector(false)} />
                )}

                <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
                <MiniMap
                    className="bg-zinc-900 border-zinc-800 rounded-lg"
                    maskColor="rgba(0, 0, 0, 0.4)"
                    nodeColor="#3b82f6"
                />
                <Background color="#27272a" gap={16} size={2} />
                {menuState.show && (
                    <CanvasContextMenu
                        x={menuState.x}
                        y={menuState.y}
                        type={menuState.type}
                        nodeId={menuState.nodeId}
                        edgeId={menuState.edgeId}
                        onClose={() => setMenuState(prev => ({ ...prev, show: false }))}
                    />
                )}
            </ReactFlow>
        </div>
    );
}
