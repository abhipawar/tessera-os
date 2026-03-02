import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { saveWorkspaceAction, deleteWorkspaceAction } from '@/app/studio/actions';
import { API_URL } from '@/config';
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

export type Template = {
    id: string;
    name: string;
    description: string;
    target_audience: string;
    icon: string;
    prerequisite_tools: string[];
    graph_json: any;
    is_active: boolean;
    created_at: string;
};

interface StudioState {
    // React Flow State
    nodes: Node[];
    edges: Edge[];
    selectedNode: Node | null;
    activeUserNode: string | null;
    clipboardNode: any | null;

    // React Flow Actions
    setNodes: (nodes: Node[] | ((val: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((val: Edge[]) => Edge[])) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    setSelectedNode: (node: Node | null) => void;
    setActiveUserNode: (id: string | null) => void;
    setClipboardNode: (node: any | null) => void;

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
    globalTemplates: Template[];
    currentChartId: string | null;
    chartName: string;
    isSaving: boolean;
    isAdmin: boolean;
    setChartList: (list: ChartItem[]) => void;
    setGlobalTemplates: (templates: Template[]) => void;
    setCurrentChartId: (id: string | null) => void;
    setChartName: (name: string) => void;
    setIsSaving: (saving: boolean) => void;
    setIsAdmin: (isAdmin: boolean) => void;

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
    checkAdminStatus: () => Promise<void>;
    fetchChartList: () => Promise<void>;
    fetchAgentsAndTools: () => Promise<void>;
    fetchGlobalTemplates: () => Promise<void>;
    loadChart: (id: string) => Promise<void>;
    loadTemplate: (id: string) => void;
    saveOrgChart: () => Promise<void>;
    publishGlobalTemplate: (templateData: Partial<Template>) => Promise<{ success: boolean, error?: string }>;
    deleteWorkspace: () => Promise<void>;
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
    clipboardNode: null,

    agents: [],
    configuredTools: [],
    isLoadingAgents: true,
    searchQuery: '',

    chartList: [],
    globalTemplates: [],
    currentChartId: null,
    chartName: 'New Workspace',
    isSaving: false,
    isAdmin: false,

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
    setClipboardNode: (node) => set({ clipboardNode: node }),

    setAgents: (agents) => set({ agents }),
    setConfiguredTools: (tools) => set({ configuredTools: tools }),
    setIsLoadingAgents: (loading) => set({ isLoadingAgents: loading }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    setChartList: (list) => set({ chartList: list }),
    setGlobalTemplates: (templates) => set({ globalTemplates: templates }),
    setCurrentChartId: (id) => set({ currentChartId: id }),
    setChartName: (name) => set({ chartName: name }),
    setIsSaving: (saving) => set({ isSaving: saving }),
    setIsAdmin: (isAdmin) => set({ isAdmin }),

    setIsTeamPanelOpen: (open) => set({ isTeamPanelOpen: open }),
    setNodeAssignments: (assignments) => set({ nodeAssignments: assignments }),
    setInviteEmail: (email) => set({ inviteEmail: email }),
    setInviteRole: (role) => set({ inviteRole: role }),

    // Async Actions
    checkAdminStatus: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_tessera_admin')
                .eq('id', user.id)
                .single();
            set({ isAdmin: !!profile?.is_tessera_admin });
        } catch (error) {
            console.error("Failed to check admin status", error);
        }
    },

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

    fetchGlobalTemplates: async () => {
        try {
            const { data, error } = await supabase
                .from('global_workspace_templates')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (!error && data) {
                set({ globalTemplates: data as Template[] });
            }
        } catch (e) {
            console.error("Failed to load templates", e);
        }
    },

    loadChart: async (id: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: nameData } = await supabase.from('workspaces').select('name').eq('id', id).single();
            const loadedName = nameData ? nameData.name : 'Loaded Workspace';


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

    loadTemplate: (id: string) => {
        const state = get();
        const template = state.globalTemplates.find(t => t.id === id);
        if (!template) return;

        let parsedNodes = [];
        let parsedEdges = [];

        if (template.graph_json) {
            parsedNodes = typeof template.graph_json.nodes === 'string' ? JSON.parse(template.graph_json.nodes) : template.graph_json.nodes;
            parsedEdges = typeof template.graph_json.edges === 'string' ? JSON.parse(template.graph_json.edges) : template.graph_json.edges;
        }

        set({
            currentChartId: null, // It's not saved yet, acts like "New Workspace"
            chartName: template.name,
            selectedNode: null,
            activeUserNode: null,
            isTeamPanelOpen: false,
            nodes: parsedNodes || defaultNodes,
            edges: parsedEdges || [],
            nodeAssignments: {} // Will be requested to set on save
        });
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
        set({ isSaving: true });

        try {
            const strippedNodes = state.nodes.map(n => {
                const { style, ...rest } = n;
                return rest;
            });

            const result = await saveWorkspaceAction({
                currentChartId: state.currentChartId,
                chartName: state.chartName,
                nodesJson: JSON.stringify(strippedNodes),
                edgesJson: JSON.stringify(state.edges),
                activeUserNode: state.activeUserNode
            });

            if (result.error) {
                alert(result.error);
                return;
            }

            if (result.success && result.newChartId) {
                set({ currentChartId: result.newChartId });
            }

            await state.fetchChartList();
            alert('Graph Engine successfully synchronized and compiled.');
        } catch (err: any) {
            console.error(err);
            alert('Failed to save chart: ' + err.message);
        } finally {
            set({ isSaving: false });
        }
    },

    publishGlobalTemplate: async (templateData: Partial<Template>) => {
        const state = get();
        set({ isSaving: true });

        try {
            const strippedNodes = state.nodes.map(n => {
                const { style, ...rest } = n;
                return rest;
            });

            const graphJson = {
                nodes: strippedNodes,
                edges: state.edges
            };

            // Derive prerequisite tools from nodes
            const toolsSet = new Set<string>();
            state.nodes.forEach(n => {
                if (n.data?.tools && Array.isArray(n.data.tools)) {
                    n.data.tools.forEach((t: any) => {
                        if (t.name) toolsSet.add(t.name);
                    });
                }
            });
            const prerequisiteTools = Array.from(toolsSet);

            const payload = {
                name: templateData.name || state.chartName,
                description: templateData.description || "",
                target_audience: templateData.target_audience || "Everyone",
                icon: templateData.icon || "Server",
                prerequisite_tools: prerequisiteTools,
                graph_json: graphJson,
                is_active: true
            };

            // If we're updating an existing template specifically
            if (templateData.id) {
                const { error } = await supabase
                    .from('global_workspace_templates')
                    .update(payload)
                    .eq('id', templateData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('global_workspace_templates')
                    .insert([payload]);
                if (error) throw error;
            }

            await state.fetchGlobalTemplates();
            return { success: true };

        } catch (err: any) {
            console.error("Failed to publish global template:", err);
            return { success: false, error: err.message };
        } finally {
            set({ isSaving: false });
        }
    },

    deleteWorkspace: async () => {
        const state = get();
        if (!state.currentChartId) return;

        const isConfirmed = window.confirm("Are you sure you want to permanently delete this workspace and all its data? This action cannot be undone.");
        if (!isConfirmed) return;

        set({ isSaving: true });

        try {
            const result = await deleteWorkspaceAction(state.currentChartId);

            if (result.error) {
                alert(result.error);
                return;
            }

            state.createNewChart();
            await state.fetchChartList();
            alert('Workspace deleted successfully.');
        } catch (err: any) {
            console.error(err);
            alert('Failed to delete workspace: ' + err.message);
        } finally {
            set({ isSaving: false });
        }
    }
}));
