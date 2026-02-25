"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowInstance,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';

import AgentNode from '@/components/AgentNode';
import Sidebar from '@/components/Sidebar';
import { Settings, X, Save, Loader2, Plus, ChevronDown } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const defaultNodes = [
  { 
    id: 'supervisor', 
    position: { x: 250, y: 50 }, 
    type: 'customAgent', 
    data: { label: 'Supervisor Co-Pilot', description: 'Lead Agent', systemPrompt: 'You are the lead orchestrator.' }
  }
];

function OrgChartCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- NEW: WORKSPACE STATE ---
  const [chartList, setChartList] = useState<{ id: string, name: string }[]>([]);
  const [currentChartId, setCurrentChartId] = useState<string | null>(null);
  const [chartName, setChartName] = useState<string>('New Workspace');

  const nodeTypes = useMemo(() => ({ customAgent: AgentNode }), []);

  // --- NEW: FETCH ALL SAVED CHARTS ON LOAD ---
  useEffect(() => {
    fetchChartList();
  }, []);

  const fetchChartList = async () => {
    const { data, error } = await supabase
      .from('tenant_org_charts')
      .select('id, name')
      .order('updated_at', { ascending: false });
    
    if (!error && data) {
      setChartList(data);
      // Auto-load the most recent chart if one exists and we don't have one loaded
      if (data.length > 0 && !currentChartId) {
        loadChart(data[0].id);
      }
    }
  };

  // --- NEW: LOAD SPECIFIC CHART ---
  const loadChart = async (id: string) => {
    const { data, error } = await supabase
      .from('tenant_org_charts')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      setCurrentChartId(data.id);
      setChartName(data.name);
      setNodes(typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes);
      setEdges(typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges);
      setSelectedNode(null); // Close config panel on switch
    }
  };

  // --- NEW: CREATE BLANK CHART ---
  const createNewChart = () => {
    setCurrentChartId(null);
    setChartName('New Workspace');
    setNodes(defaultNodes);
    setEdges([]);
    setSelectedNode(null);
  };

  // --- UPDATED: SMART SAVE (INSERT OR UPDATE) ---
  const saveOrgChart = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: chartName,
        nodes: nodes,
        edges: edges,
        updated_at: new Date().toISOString()
      };

      if (currentChartId) {
        // Update existing workspace
        const { error } = await supabase
          .from('tenant_org_charts')
          .update(payload)
          .eq('id', currentChartId);
        if (error) throw error;
      } else {
        // Insert new workspace
        const { data, error } = await supabase
          .from('tenant_org_charts')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setCurrentChartId(data.id);
      }
      
      // Refresh the dropdown list to reflect name changes or new additions
      fetchChartList();
    } catch (error: any) {
      console.error('Error saving chart:', error.message);
      alert('Failed to save. Check console.');
    } finally {
      setIsSaving(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

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
        id: `agent_${Date.now()}`,
        type: payload.type,
        position,
        data: { label: payload.label, description: payload.description, systemPrompt: '' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelectedNode(node), []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const updateNodeData = (field: string, value: string) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          node.data = { ...node.data, [field]: value };
        }
        return node;
      })
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [field]: value } } : null);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* HEADER WITH MULTI-WORKSPACE CONTROLS */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-slate-800">Tessera OS</h1>
          </div>

          <div className="h-6 w-px bg-slate-300"></div>

          {/* WORKSPACE SWITCHER */}
          <div className="flex items-center gap-3">
            <select 
              value={currentChartId || ''} 
              onChange={(e) => {
                if(e.target.value === 'new') createNewChart();
                else loadChart(e.target.value);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 cursor-pointer outline-none"
            >
              <option value="new" className="font-semibold text-blue-600">+ Create New Workspace</option>
              <optgroup label="Saved Workspaces">
                {chartList.map((chart) => (
                  <option key={chart.id} value={chart.id}>{chart.name}</option>
                ))}
              </optgroup>
            </select>

            {/* EDITABLE WORKSPACE NAME */}
            <input 
              type="text" 
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              className="text-sm font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5 transition-colors w-48"
              placeholder="Workspace Name"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={createNewChart}
            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 text-sm font-semibold py-2 px-3 transition-colors"
          >
            <Plus size={16} /> New
          </button>
          
          <button 
            onClick={saveOrgChart}
            disabled={isSaving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-70 shadow-sm"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Workspace'}
          </button>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative flex" ref={reactFlowWrapper}>
        <Sidebar />
        
        <div className="flex-1 h-full relative">
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
            className="bg-slate-50"
          >
            <Controls className="bg-white border-slate-200 shadow-lg" />
            <MiniMap className="bg-white border-slate-200 shadow-lg rounded-lg" />
            <Background color="#cbd5e1" gap={16} size={2} />
          </ReactFlow>

          {/* CONFIGURATION PANEL */}
          {selectedNode && (
            <div className="absolute top-4 right-4 w-80 bg-white shadow-2xl rounded-xl border border-slate-200 flex flex-col z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <Settings size={16} /> Agent Configuration
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Agent Name</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.label} 
                    onChange={(e) => updateNodeData('label', e.target.value)}
                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Role Description</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.description} 
                    onChange={(e) => updateNodeData('description', e.target.value)}
                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">System Instructions</label>
                  <textarea 
                    value={selectedNode.data.systemPrompt || ''} 
                    onChange={(e) => updateNodeData('systemPrompt', e.target.value)}
                    placeholder="Define how this agent should behave..."
                    className="w-full text-sm p-2 border border-slate-300 rounded h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden">
      <ReactFlowProvider>
        <OrgChartCanvas />
      </ReactFlowProvider>
    </div>
  );
}