import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { saveWorkspaceAction, deleteWorkspaceAction } from '@/app/studio/actions';
import { API_URL } from '@/config';
import { createBrowserClient } from '@supabase/ssr';
import { useNotificationStore } from './notificationStore';

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
    isCanvasMaximized: boolean;
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
    inviteRole: 'member' | 'tenant_admin';
    setIsTeamPanelOpen: (open: boolean) => void;

    // Execution History & Visual Feedback
    executionHistory: any[];
    isFetchingHistory: boolean;
    runningNodes: string[];
    setIsCanvasMaximized: (maximized: boolean) => void;
    fetchWorkspaceExecutionHistory: () => Promise<void>;
    testRunWorkspace: () => Promise<void>;
    setNodeAssignments: (assignments: Record<string, string>) => void;
    setInviteEmail: (email: string) => void;
    setInviteRole: (role: 'member' | 'tenant_admin') => void;

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
    isCanvasMaximized: false,

    isTeamPanelOpen: false,
    nodeAssignments: {},

    // Execution Inspector Default State
    executionHistory: [],
    isFetchingHistory: false,
    runningNodes: [],
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
    setIsCanvasMaximized: (maximized) => set({ isCanvasMaximized: maximized }),

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
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${API_URL}/api/tenant/workspaces`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            const data = await res.json();

            if (data.success && data.workspaces) {
                set({ chartList: data.workspaces });
                const currentId = get().currentChartId;
                if (data.workspaces.length > 0 && !currentId && !window.location.pathname.includes('/preview')) {
                    get().loadChart(data.workspaces[0].id);
                }
            }
        } catch (e) {
            console.error("Failed to fetch workspaces:", e);
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
                useNotificationStore.getState().showNotification({
                    title: "Access Denied",
                    message: data.error,
                    type: "error"
                });
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
            useNotificationStore.getState().showNotification({
                title: "Authentication Failed",
                message: "Critical Error: Could not reach the security endpoint.",
                type: "error"
            });
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
                useNotificationStore.getState().showNotification({
                    title: "Sync Failed",
                    message: result.error,
                    type: "error"
                });
                return;
            }

            if (result.success && result.newChartId) {
                set({ currentChartId: result.newChartId });
            }

            await state.fetchChartList();

            if (result.warning) {
                useNotificationStore.getState().showNotification({
                    title: "Architecture Warning",
                    message: result.warning,
                    type: "warning"
                });
            } else {
                useNotificationStore.getState().showNotification({
                    title: "Blueprint Compiled",
                    message: "Graph Engine successfully synchronized and saved.",
                    type: "success"
                });
            }
        } catch (err: any) {
            console.error(err);
            useNotificationStore.getState().showNotification({
                title: "Save Error",
                message: `Failed to save workspace blueprint: ${err.message}`,
                type: "error"
            });
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
        const { currentChartId } = get();
        if (!currentChartId) return;

        try {
            set({ isSaving: true });
            const sessionData = await supabase.auth.getSession();
            const session = sessionData.data.session;
            if (!session) return;

            await fetch(`/api/workspace?id=${currentChartId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            // Clear state and reload list
            set({ currentChartId: null, chartName: 'New Workspace', nodes: [], edges: [] });
            useNotificationStore.getState().showNotification({
                title: "Workspace Deleted",
                message: "The workspace has been completely removed.",
                type: "success"
            });
            await get().fetchChartList();
        } catch (error) {
            console.error("Failed to delete workspace:", error);
            useNotificationStore.getState().showNotification({
                title: "Deletion Failed",
                message: "A critical error occurred while deleting.",
                type: "error"
            });
        } finally {
            set({ isSaving: false });
        }
    },

    fetchWorkspaceExecutionHistory: async () => {
        const { currentChartId } = get();
        if (!currentChartId) return;

        set({ isFetchingHistory: true });
        try {
            const sessionData = await supabase.auth.getSession();
            const session = sessionData.data.session;
            if (!session) return;

            // 1. Fetch latest thread for workspace
            const resChats = await fetch(`http://localhost:8000/api/tenant-agent/chats/${currentChartId}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const chatData = await resChats.json();
            if (!chatData.chats || chatData.chats.length === 0) {
                set({ executionHistory: [], isFetchingHistory: false });
                return;
            }
            const latestThreadId = chatData.chats[0].id;

            // 2. Fetch state history for that thread
            const resHist = await fetch(`http://localhost:8000/api/tenant-agent/chat/${currentChartId}/thread/${latestThreadId}/state-history`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const histData = await resHist.json();

            if (histData.history) {
                set({ executionHistory: histData.history });
            } else {
                set({ executionHistory: [] });
            }
        } catch (e) {
            console.error("Failed to fetch execution history:", e);
            set({ executionHistory: [] });
        } finally {
            set({ isFetchingHistory: false });
        }
    },

    testRunWorkspace: async () => {
        const { currentChartId, nodes } = get();
        if (!currentChartId) return;

        // Find supervisor or first node to give it a test prompt
        const prompt = "Please execute a test run of this workspace and say hello.";

        try {
            set({ runningNodes: [] });
            const sessionData = await supabase.auth.getSession();
            const session = sessionData.data.session;
            if (!session) return;

            // Re-fetch chat ID to run in latest thread or just let the backend create one?
            // Actually, backend needs a chat ID.
            const resChats = await fetch(`${API_URL}/api/tenant-agent/chats/${currentChartId}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const chatData = await resChats.json();
            let chatId = '';
            if (chatData.chats && chatData.chats.length > 0) {
                chatId = chatData.chats[0].id;
            } else {
                // If no chat exists, we can't test stream easily without creating one. 
                // Let's create a temporary chat thread
                const createRes = await fetch(`${API_URL}/api/tenant-agent/chats`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'Studio Test Run', workspace_id: currentChartId })
                });
                const createData = await createRes.json();
                chatId = createData.id;
            }

            useNotificationStore.getState().showNotification({
                title: "Test Run Started",
                message: "Executing the graph from the beginning...",
                type: "success"
            });

            // Listen to SSE
            const res = await fetch(`${API_URL}/api/tenant-agent/stream`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    query: prompt
                })
            });

            if (!res.body) return;

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.event === 'node_stream') {
                                // Light up the node! Find nodes by fuzzy name match since LangGraph replaces spaces
                                set((state) => {
                                    const uiNode = state.nodes.find(n => n.data.label.replace(/[^a-zA-Z0-9_-]/g, '_') === data.node);
                                    if (uiNode && !state.runningNodes.includes(uiNode.id)) {
                                        return { runningNodes: [...state.runningNodes, uiNode.id] };
                                    }
                                    return state;
                                });
                            } else if (data.event === 'node_update') {
                                // Node finished its step, we can briefly leave it glowing or turn it off soon
                                // we will just keep all hit nodes glowing for this demo until finish
                            } else if (data.event === 'finish') {
                                setTimeout(() => set({ runningNodes: [] }), 2000); // clear after 2 seconds
                            } else if (data.event === 'error') {
                                console.error('Stream error:', data.message);
                                set({ runningNodes: [] });
                            }
                        } catch (e) {
                            // parse error, ignore partial chunk
                        }
                    }
                }
            }

        } catch (e) {
            console.error("Failed to run test stream:", e);
            set({ runningNodes: [] });
        }

    }
}));
