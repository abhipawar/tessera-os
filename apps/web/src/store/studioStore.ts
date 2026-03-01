import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { createBrowserClient } from '@supabase/ssr';

export type GlobalAgent = {
    id: string;
    name: string;
    description: string;
    system_prompt: string;
    logo_icon: string;
    tool_categories?: { display_name: string };
};

export type ChartItem = {
    id: string;
    name: string;
};

interface StudioState {
    // React Flow State
    nodes: Node[];
    edges: Edge[];
    selectedNode: Node | null;
    activeUserNode: string | null;

    // React Flow Actions
    setNodes: (nodes: Node[] | ((val: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((val: Edge[]) => Edge[])) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    setSelectedNode: (node: Node | null) => void;
    setActiveUserNode: (id: string | null) => void;

    // Marketplace & Tools
    agents: GlobalAgent[];
    configuredTools: any[];
    isLoadingAgents: boolean;
    searchQuery: string;
    setAgents: (agents: GlobalAgent[]) => void;
    setConfiguredTools: (tools: any[]) => void;
    setIsLoadingAgents: (loading: boolean) => void;
    setSearchQuery: (query: string) => void;

    // Workspace State
    chartList: ChartItem[];
    currentChartId: string | null;
    chartName: string;
    isSaving: boolean;
    setChartList: (list: ChartItem[]) => void;
    setCurrentChartId: (id: string | null) => void;
    setChartName: (name: string) => void;
    setIsSaving: (saving: boolean) => void;

    // Team Management State
    isTeamPanelOpen: boolean;
    nodeAssignments: Record<string, string>;
    inviteEmail: string;
    inviteRole: string;
    setIsTeamPanelOpen: (open: boolean) => void;
    setNodeAssignments: (assignments: Record<string, string>) => void;
    setInviteEmail: (email: string) => void;
    setInviteRole: (role: string) => void;

    // Actions
    fetchChartList: () => Promise<void>;
    fetchAgentsAndTools: () => Promise<void>;
    loadChart: (id: string) => Promise<void>;
    saveOrgChart: () => Promise<void>;
    createNewChart: () => void;
}

const defaultNodes = [
    {
        id: 'supervisor',
        position: { x: 250, y: 50 },
        type: 'customAgent',
        data: { label: 'Supervisor Co-Pilot', description: 'Lead Agent', systemPrompt: 'You are the lead orchestrator.', tools: [] }
    }
];

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const useStudioStore = create<StudioState>((set, get) => ({
    // Initial State
    nodes: defaultNodes,
    edges: [],
    selectedNode: null,
    activeUserNode: null,

    agents: [],
    configuredTools: [],
    isLoadingAgents: true,
    searchQuery: '',

    chartList: [],
    currentChartId: null,
    chartName: 'New Workspace',
    isSaving: false,

    isTeamPanelOpen: false,
    nodeAssignments: {},
    inviteEmail: '',
    inviteRole: 'member',

    // Basic Setters
    setNodes: (nodes) => set((state) => ({ nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes })),
    setEdges: (edges) => set((state) => ({ edges: typeof edges === 'function' ? edges(state.edges) : edges })),
    onNodesChange: (changes: NodeChange[]) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
    onEdgesChange: (changes: EdgeChange[]) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
    onConnect: (connection: Connection) => set((state) => ({ edges: addEdge(connection, state.edges) })),
    setSelectedNode: (node) => set({ selectedNode: node }),
    setActiveUserNode: (id) => set({ activeUserNode: id }),

    setAgents: (agents) => set({ agents }),
    setConfiguredTools: (tools) => set({ configuredTools: tools }),
    setIsLoadingAgents: (loading) => set({ isLoadingAgents: loading }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    setChartList: (list) => set({ chartList: list }),
    setCurrentChartId: (id) => set({ currentChartId: id }),
    setChartName: (name) => set({ chartName: name }),
    setIsSaving: (saving) => set({ isSaving: saving }),

    setIsTeamPanelOpen: (open) => set({ isTeamPanelOpen: open }),
    setNodeAssignments: (assignments) => set({ nodeAssignments: assignments }),
    setInviteEmail: (email) => set({ inviteEmail: email }),
    setInviteRole: (role) => set({ inviteRole: role }),

    // Async Actions
    fetchChartList: async () => {
        const { data, error } = await supabase
            .from('workspaces')
            .select('id, name')
            .order('updated_at', { ascending: false });

        if (!error && data) {
            set({ chartList: data });
            const currentId = get().currentChartId;
            if (data.length > 0 && !currentId) {
                get().loadChart(data[0].id);
            }
        }
    },

    fetchAgentsAndTools: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const headers = { 'Authorization': `Bearer ${session.access_token}` };

            const [agentsRes, toolsRes] = await Promise.all([
                fetch(`${API_URL}/api/tenant/agents`, { headers }),
                fetch(`${API_URL}/api/tenant/configured-tools`, { headers })
            ]);

            const agentsData = await agentsRes.json();
            const toolsData = await toolsRes.json();

            if (agentsData.success) set({ agents: agentsData.agents });
            if (toolsData.success) set({ configuredTools: toolsData.tools });
        } catch (error) {
            console.error("Failed to load catalog:", error);
        } finally {
            set({ isLoadingAgents: false });
        }
    },

    loadChart: async (id: string) => {
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

            set({
                currentChartId: id,
                chartName: loadedName,
                activeUserNode: data.user_node_id,
                selectedNode: null,
                isTeamPanelOpen: false,
                nodes: (typeof data.nodes === 'string' ? JSON.parse(data.nodes) : data.nodes).map((n: Node) => {
                    if (n.id === data.user_node_id) {
                        n.style = { ...n.style, border: '3px solid #3b82f6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' };
                    }
                    return n;
                }),
                edges: typeof data.edges === 'string' ? JSON.parse(data.edges) : data.edges,
                nodeAssignments: { [data.user_node_id]: session.user.email || "founder@company.com" }
            });
        } catch (error) {
            console.error("Failed to load secure chat layout:", error);
            alert("Critical Error: Could not reach the security endpoint.");
        }
    },

    createNewChart: () => {
        set({
            currentChartId: null,
            chartName: 'New Workspace',
            nodes: defaultNodes,
            edges: [],
            selectedNode: null,
            activeUserNode: null,
            isTeamPanelOpen: false,
            nodeAssignments: {}
        });
    },

    saveOrgChart: async () => {
        const state = get();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("You must be logged in to save.");
            return;
        }

        if (state.activeUserNode && state.activeUserNode !== 'supervisor') {
            alert("Security Lock: Only the Top Supervisor can save structural changes to the Studio.");
            return;
        }

        set({ isSaving: true });
        try {
            const { data: tenantData, error: tenantError } = await supabase
                .from('tenant_members')
                .select('tenant_id')
                .eq('user_id', session.user.id)
                .single();

            if (tenantError || !tenantData) {
                alert("Authentication Error: Could not determine your tenant.");
                set({ isSaving: false });
                return;
            }

            const tenantId = tenantData.tenant_id;
            const strippedNodes = state.nodes.map(n => {
                const { style, ...rest } = n;
                return rest;
            });
            const nodesJson = JSON.stringify(strippedNodes);
            const edgesJson = JSON.stringify(state.edges);

            if (state.currentChartId) {
                // Update existing
                const { error } = await supabase
                    .from('workspaces')
                    .update({
                        name: state.chartName,
                        nodes: nodesJson,
                        edges: edgesJson,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', state.currentChartId)
                    .eq('tenant_id', tenantId);

                if (error) throw error;
            } else {
                // Insert new
                const { data, error } = await supabase
                    .from('workspaces')
                    .insert({
                        name: state.chartName,
                        tenant_id: tenantId,
                        nodes: nodesJson,
                        edges: edgesJson
                    })
                    .select();

                if (error) throw error;
                if (data && data.length > 0) {
                    const newId = data[0].id;

                    await supabase.from('workspace_members').insert({
                        workspace_id: newId,
                        user_id: session.user.id,
                        assigned_node_id: 'supervisor',
                        role_id: null
                    });

                    set({ currentChartId: newId });
                }
            }
            await state.fetchChartList();
            alert('Graph Engine successfully synchronized and compiled.');
        } catch (err: any) {
            console.error(err);
            alert('Failed to save chart: ' + err.message);
        } finally {
            set({ isSaving: false });
        }
    }
}));
