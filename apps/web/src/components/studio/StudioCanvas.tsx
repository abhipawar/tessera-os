import React, { useRef } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from '@/components/AgentNode';
import { useStudioStore, GlobalAgent } from '@/store/studioStore';

const nodeTypes = { customAgent: AgentNode };

export default function StudioCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const {
        nodes, edges,
        onNodesChange, onEdgesChange, onConnect,
        setNodes, setSelectedNode, setIsTeamPanelOpen
    } = useStudioStore();
    const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

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
                    tools: payload.tools || []
                },
            };

            setNodes((nds: any[]) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const onNodeClick = React.useCallback((_: React.MouseEvent, node: any) => {
        setSelectedNode(node);
        setIsTeamPanelOpen(false);
    }, [setSelectedNode, setIsTeamPanelOpen]);

    const onPaneClick = React.useCallback(() => setSelectedNode(null), [setSelectedNode]);

    return (
        <div className="flex-1 h-full relative overflow-hidden" ref={reactFlowWrapper}>
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
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ maxZoom: 0.85 }}
                className="bg-zinc-950"
            >
                <Controls className="bg-zinc-900 border-zinc-800 fill-zinc-400" />
                <MiniMap
                    className="bg-zinc-900 border-zinc-800 rounded-lg"
                    maskColor="rgba(0, 0, 0, 0.4)"
                    nodeColor="#3b82f6"
                />
                <Background color="#27272a" gap={16} size={2} />
            </ReactFlow>
        </div>
    );
}
