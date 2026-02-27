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
import { Settings, X, Save, Loader2, Plus, Users, Bot, UserPlus, Network, Search, GripVertical } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

// --- TYPES ---
type GlobalAgent = {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  logo_icon: string;
  tool_categories?: { display_name: string };
}

const defaultNodes = [
  {
    id: 'supervisor',
    position: { x: 250, y: 50 },
    type: 'customAgent',
    data: { label: 'Supervisor Co-Pilot', description: 'Lead Agent', systemPrompt: 'You are the lead orchestrator.', tools: [] }
  }
];

function OrgChartCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- MARKETPLACE & TOOLS STATE ---
  const [agents, setAgents] = useState<GlobalAgent[]>([]);
  const [configuredTools, setConfiguredTools] = useState<any[]>([]); // <-- Moved inside component
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- WORKSPACE STATE ---
  const [chartList, setChartList] = useState<{ id: string, name: string }[]>([]);
  const [currentChartId, setCurrentChartId] = useState<string | null>(null);
  const [chartName, setChartName] = useState<string>('New Workspace');
  const [activeUserNode, setActiveUserNode] = useState<string | null>(null);

  // --- TEAM MANAGEMENT STATE ---
  const [isTeamPanelOpen, setIsTeamPanelOpen] = useState(false);
  const [nodeAssignments, setNodeAssignments] = useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const nodeTypes = useMemo(() => ({ customAgent: AgentNode }), []);

  useEffect(() => {
    fetchChartList();
    fetchAgentsAndTools();
  }, []);

  // --- FETCH AGENTS & TOOLS ---
  const fetchAgentsAndTools = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const headers = { 'Authorization': `Bearer ${session.access_token}` };
      
      const [agentsRes, toolsRes] = await Promise.all([
        fetch(`${API_URL}/api/tenant/agents`, { headers }),
        fetch(`${API_URL}/api/tenant/configured-tools`, { headers }) // <-- Pointed to the new endpoint
      ]);

      const agentsData = await agentsRes.json();
      const toolsData = await toolsRes.json();
      
      if (agentsData.success) setAgents(agentsData.agents);
      if (toolsData.success) setConfiguredTools(toolsData.tools);

    } catch (error) {
      console.error("Failed to load catalog:", error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const fetchChartList = async () => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setChartList(data);
      if (data.length > 0 && !currentChartId) {
        loadChart(data[0].id);
      }
    }
  };

  const loadChart = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: nameData } = await supabase.from('workspaces').select('name').eq('id', id).single();
      const loadedName = nameData ? nameData.name : 'Loaded Workspace';

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/chat/${id}/layout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setCurrentChartId(id);
      setChartName(loadedName);

      const parsedNodes = typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes;
      const parsedEdges = typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges;

      const highlightedNodes = parsedNodes.map((n: Node) => {
        if (n.id === data.user_node_id) {
          n.style = { ...n.style, border: '3px solid #3b82f6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' };
        }
        return n;
      });

      setNodes(highlightedNodes);
      setEdges(parsedEdges);
      setActiveUserNode(data.user_node_id);
      setSelectedNode(null);
      setIsTeamPanelOpen(false); 

      setNodeAssignments({ [data.user_node_id]: session.user.email || "founder@company.com" });

    } catch (error) {
      console.error("Failed to load secure chat layout:", error);
      alert("Critical Error: Could not reach the security endpoint.");
    }
  };

  const createNewChart = () => {
    setCurrentChartId(null);
    setChartName('New Workspace');
    setNodes(defaultNodes);
    setEdges([]);
    setSelectedNode(null);
    setActiveUserNode(null);
    setIsTeamPanelOpen(false);
    setNodeAssignments({});
  };

  const saveOrgChart = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("You must be logged in to save.");
      return;
    }

    if (activeUserNode && activeUserNode !== 'supervisor') {
      alert("Security Lock: Only the Top Supervisor can save structural changes to the Studio.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Fetch the user's active Tenant ID directly from the new junction table
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .single();

      if (tenantError || !tenantData) throw new Error("You are not assigned to a company tenant.");

      // 2. Add the tenant_id to the workspace payload!
      const payload = {
        name: chartName,
        nodes: nodes,
        edges: edges,
        updated_at: new Date().toISOString(),
        tenant_id: tenantData.tenant_id 
      };

      if (currentChartId) {
        const { error } = await supabase.from('workspaces').update(payload).eq('id', currentChartId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('workspaces').insert(payload).select().single();
        if (error) throw error;
        
        setCurrentChartId(data.id);

        const { data: roleData, error: roleError } = await supabase
          .from('workspace_roles')
          .select('id')
          .eq('slug', 'tenant_admin')
          .single();

        if (roleError) throw new Error("Could not find tenant_admin role in master data.");

        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: data.id,
            user_id: session.user.id,
            assigned_node_id: 'supervisor',
            role_id: roleData.id 
          });
          
        if (memberError) {
          console.error("Failed to assign creator to workspace:", memberError);
          alert("Workspace saved, but failed to assign admin rights.");
        }
      }

      fetchChartList();
      alert("Workspace structure saved successfully.");
    } catch (error: any) {
      console.error('Error saving chart:', error.message);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteHuman = async (nodeId: string) => {
    if (!inviteEmail || !currentChartId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/chat/${currentChartId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: inviteEmail, node_id: nodeId, workspace_role: inviteRole })
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      setNodeAssignments(prev => ({ ...prev, [nodeId]: `${inviteEmail} (${inviteRole})` }));
      alert(`Account created for ${inviteEmail}!\n\nTemporary Password: ${data.temp_password}`);
      setInviteEmail("");
      setInviteRole("member");

    } catch (error) {
      console.error("Invite error:", error);
      alert("Failed to send invitation.");
    }
  };

  const onDragStart = (event: React.DragEvent, agent: GlobalAgent) => {
    const payload = {
      type: 'customAgent',
      label: agent.name,
      description: agent.description,
      systemPrompt: agent.system_prompt,
      tools: [] // Ensure new nodes have an empty tools array to start
    };
    event.dataTransfer.setData('application/reactflow', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

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
        data: { 
          label: payload.label, 
          description: payload.description, 
          systemPrompt: payload.systemPrompt || '',
          tools: payload.tools || [] 
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsTeamPanelOpen(false); 
  }, []);
  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const updateNodeData = (field: string, value: any) => {
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

  // --- TOOL TOGGLE HANDLER ---
  const toggleToolAssignment = (toolId: string) => {
    if (!selectedNode) return;
    const currentTools = selectedNode.data.tools || [];
    
    // Toggle logic: If it's there, remove it. If it's not, add it.
    const newTools = currentTools.includes(toolId) 
      ? currentTools.filter((id: string) => id !== toolId)
      : [...currentTools, toolId];

    updateNodeData('tools', newTools);
  };

  // --- GROUP AGENTS BY CATEGORY ---
  const groupedAgents = agents.reduce((acc, agent) => {
    const categoryName = agent.tool_categories?.display_name || 'General Agents';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(agent);
    return acc;
  }, {} as Record<string, GlobalAgent[]>);

  const filteredCategories = Object.entries(groupedAgents).map(([category, catAgents]) => ({
    category,
    agents: catAgents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.description.toLowerCase().includes(searchQuery.toLowerCase()))
  })).filter(group => group.agents.length > 0);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100">
      <div className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 z-20 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-zinc-100">Tessera OS</h1>
          </div>

          <div className="h-6 w-px bg-zinc-800"></div>

          <div className="flex items-center gap-3">
            <select
              value={currentChartId || ''}
              onChange={(e) => {
                if (e.target.value === 'new') createNewChart();
                else loadChart(e.target.value);
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 cursor-pointer outline-none"
            >
              <option value="new" className="font-semibold text-blue-400">+ Create New Workspace</option>
              <optgroup label="Saved Workspaces">
                {chartList.map((chart) => (
                  <option key={chart.id} value={chart.id}>{chart.name}</option>
                ))}
              </optgroup>
            </select>

            <input
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              className="text-sm font-semibold text-zinc-100 border-b border-transparent hover:border-zinc-700 focus:border-blue-500 focus:outline-none bg-transparent px-1 py-0.5 transition-colors w-48"
              placeholder="Chat Name"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsTeamPanelOpen(!isTeamPanelOpen);
              setSelectedNode(null); 
            }}
            className={`flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-all border
              ${isTeamPanelOpen ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'}`}
          >
            <Users size={16} /> Manage Team
          </button>

          <button
            onClick={createNewChart}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-blue-400 text-sm font-semibold py-2 px-3 transition-colors ml-2"
          >
            <Plus size={16} /> New
          </button>

          <button
            onClick={saveOrgChart}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Workspace'}
          </button>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative flex" ref={reactFlowWrapper}>
        
        <div className="w-80 flex flex-col border-r border-zinc-800 bg-zinc-950 shrink-0 z-10">
          <div className="p-4 border-b border-zinc-800 space-y-4">
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
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:bg-zinc-800/50 transition-all group"
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

        <div className="flex-1 h-full relative overflow-hidden">
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

          {/* CONFIGURATION PANEL (AGENT SETTINGS) */}
          {selectedNode && !isTeamPanelOpen && (
            <div className="absolute top-4 right-4 w-80 bg-zinc-900 shadow-2xl rounded-xl border border-zinc-800 flex flex-col z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
                  <Settings size={16} /> Agent Configuration
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-zinc-500 hover:text-zinc-300">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)]">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Agent Name</label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData('label', e.target.value)}
                    className="w-full text-sm p-2 bg-zinc-950 border border-zinc-800 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Role Description</label>
                  <input
                    type="text"
                    value={selectedNode.data.description}
                    onChange={(e) => updateNodeData('description', e.target.value)}
                    className="w-full text-sm p-2 bg-zinc-950 border border-zinc-800 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">System Instructions</label>
                  <textarea
                    value={selectedNode.data.systemPrompt || ''}
                    onChange={(e) => updateNodeData('systemPrompt', e.target.value)}
                    placeholder="Define how this agent should behave..."
                    className="w-full text-sm p-2 bg-zinc-950 border border-zinc-800 rounded h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-zinc-100"
                  />
                </div>

                {/* --- TOOL ASSIGNMENT CHECKLIST --- */}
                <div className="mt-6">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">
                    Assigned Tools
                  </label>
                  <div className="space-y-2">
                    {configuredTools.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic">No tools configured in Integrations Hub yet.</p>
                    ) : (
                      configuredTools.map(tool => {
                        const isAssigned = selectedNode.data.tools?.includes(tool.tenant_tool_id);

                        return (
                          <label key={tool.tenant_tool_id} className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 p-3 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={isAssigned || false}
                              onChange={() => toggleToolAssignment(tool.tenant_tool_id)}
                              className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-zinc-950"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-zinc-200">{tool.name}</span>
                              <span className="text-xs text-zinc-500">{tool.connection_name}</span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                {/* ---------------------------------------- */}

              </div>
            </div>
          )}

          {isTeamPanelOpen && (
            <div className="absolute top-0 right-0 w-96 h-full bg-zinc-900 shadow-2xl border-l border-zinc-800 flex flex-col z-50 animate-in slide-in-from-right-8 duration-300">
              <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <Users size={20} className="text-blue-500" /> Team & Access
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">Assign human operators to AI nodes.</p>
                </div>
                <button onClick={() => setIsTeamPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300 bg-zinc-900 rounded-full p-1 border border-zinc-800">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/50">
                {nodes.map((node) => {
                  const assignedEmail = nodeAssignments[node.id];
                  const isAutonomous = !assignedEmail;

                  return (
                    <div key={node.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-zinc-100 text-sm">{node.data.label}</h3>
                          <p className="text-xs text-zinc-400">{node.data.description}</p>
                        </div>
                        {isAutonomous ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider border border-purple-500/20">
                            <Bot size={12} /> Autonomous
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                            <Users size={12} /> Human Co-Pilot
                          </span>
                        )}
                      </div>

                      <div className="pt-3 border-t border-zinc-800">
                        {isAutonomous ? (
                          <div className="flex gap-2">
                            <input
                              type="email"
                              placeholder="Enter email to invite human..."
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="flex-1 text-xs p-2 bg-zinc-900 border border-zinc-800 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-200"
                            />
                            <select
                              value={inviteRole}
                              onChange={(e) => setInviteRole(e.target.value)}
                              className="text-xs p-2 bg-zinc-900 border border-zinc-800 rounded focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-zinc-200"
                            >
                              <option value="member">Member</option>
                              <option value="tenant_admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleInviteHuman(node.id)}
                              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500 transition-colors flex items-center gap-1 text-xs font-semibold"
                            >
                              <UserPlus size={14} /> Assign
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center bg-zinc-900 p-2 rounded border border-zinc-800">
                            <div className="flex items-center gap-2 text-sm text-zinc-200 font-medium">
                              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                                {assignedEmail.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate w-40 text-xs">{assignedEmail}</span>
                            </div>
                            <button
                              onClick={() => {
                                const newAssignments = { ...nodeAssignments };
                                delete newAssignments[node.id];
                                setNodeAssignments(newAssignments);
                              }}
                              className="text-xs text-red-500 hover:text-red-400 font-semibold px-2 py-1"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {nodes.length === 0 && (
                  <div className="text-center p-8 text-sm text-zinc-500">
                    Your canvas is empty. Drag agents onto the canvas to start assigning your team!
                  </div>
                )}
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
    <div className="w-full h-full flex flex-col overflow-hidden bg-zinc-950">
      <ReactFlowProvider>
        <OrgChartCanvas />
      </ReactFlowProvider>
    </div>
  );
}