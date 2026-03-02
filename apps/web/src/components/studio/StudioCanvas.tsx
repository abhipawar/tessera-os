import React, { useRef } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from '@/components/AgentNode';
import TriggerNode from '@/components/TriggerNode';
import ApprovalNode from '@/components/ApprovalNode';
import ConditionalNode from '@/components/ConditionalNode';
import { useStudioStore, GlobalAgent } from '@/store/studioStore';
import CanvasContextMenu from './CanvasContextMenu';

const nodeTypes = {
    customAgent: AgentNode,
    triggerNode: TriggerNode,
    approvalNode: ApprovalNode,
    conditionalNode: ConditionalNode
};

export default function StudioCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes, edges,
        onNodesChange, onEdgesChange, onConnect,
        setNodes, setSelectedNode, setIsTeamPanelOpen
    } = useStudioStore();
    const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);
    const [menuState, setMenuState] = React.useState<{ show: boolean, x: number, y: number, type: 'node' | 'pane' | 'edge', nodeId?: string, edgeId?: string }>({
        show: false, x: 0, y: 0, type: 'pane'
    });

    const onDragOver = React.useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = React.useCallback(
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
                id: `agent_${Date.now()}`,
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
        setMenuState({
            show: true,
            x: event.clientX,
            y: event.clientY,
            type: 'node',
            nodeId: node.id
        });
    }, []);

    const onPaneContextMenu = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        setMenuState({
            show: true,
            x: event.clientX,
            y: event.clientY,
            type: 'pane'
        });
    }, []);

    const onEdgeContextMenu = React.useCallback((event: React.MouseEvent, edge: any) => {
        event.preventDefault();
        setMenuState({
            show: true,
            x: event.clientX,
            y: event.clientY,
            type: 'edge',
            edgeId: edge.id
        });
    }, []);

    return (
        <div className="flex-1 h-full relative overflow-hidden bg-zinc-950" ref={reactFlowWrapper}>
            {/* Ambient Canvas Glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none z-0" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onNodeContextMenu={onNodeContextMenu}
                onPaneContextMenu={onPaneContextMenu}
                onEdgeContextMenu={onEdgeContextMenu}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ maxZoom: 0.85 }}
                className="bg-transparent z-10"
            >
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
