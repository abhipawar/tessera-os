import React from 'react';
import { UserPlus, X } from 'lucide-react';
import { useStudioStore } from '@/store/studioStore';
import { createBrowserClient } from '@supabase/ssr';
import { useNotificationStore } from '@/store/notificationStore';
import { API_URL } from '@/config';

export default function TeamManagementModal() {
    const {
        isTeamPanelOpen,
        setIsTeamPanelOpen,
        nodes,
        nodeAssignments,
        setNodeAssignments,
        inviteEmail,
        setInviteEmail,
        inviteRole,
        setInviteRole,
        currentChartId
    } = useStudioStore();

    if (!isTeamPanelOpen) return null;

    const handleInviteHuman = async (nodeId: string) => {
        if (!inviteEmail || !currentChartId) return;

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
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
                useNotificationStore.getState().showNotification({
                    title: "Invite Failed",
                    message: data.error,
                    type: "error"
                });
                return;
            }

            setNodeAssignments({ ...nodeAssignments, [nodeId]: `${inviteEmail} (${inviteRole})` });
            useNotificationStore.getState().showNotification({
                title: "Teammate Invited",
                message: `Account created for ${inviteEmail}!\n\nTemporary Password: ${data.temp_password}`,
                type: "success"
            });
            setInviteEmail("");
            setInviteRole("member");

        } catch (error) {
            console.error("Invite error:", error);
            useNotificationStore.getState().showNotification({
                title: "Network Error",
                message: "Failed to send invitation.",
                type: "error"
            });
        }
    };

    return (
        <div className="absolute top-4 right-4 w-96 bg-zinc-900 shadow-2xl rounded-xl border border-zinc-800 flex flex-col z-50">
            <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 rounded-t-xl">
                <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Team Matrix Assignments</h2>
                <button onClick={() => setIsTeamPanelOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                    <X size={16} />
                </button>
            </div>

            <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                {nodes.map(node => (
                    <div key={node.id} className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-200">{node.data.label}</h3>
                                <p className="text-xs text-zinc-500">{node.data.description}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider 
                ${nodeAssignments[node.id] ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {nodeAssignments[node.id] ? 'Assigned' : 'Unassigned'}
                            </span>
                        </div>

                        {nodeAssignments[node.id] ? (
                            <div className="flex items-center gap-2 mt-3 bg-blue-500/10 border border-blue-500/20 p-2 rounded text-xs text-blue-400 font-medium">
                                <UserPlus size={14} />
                                {nodeAssignments[node.id]}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 mt-3">
                                <select
                                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'member' | 'tenant_admin')}
                                >
                                    <option value="member">Network Member (View Only)</option>
                                    <option value="tenant_admin">Tenant Admin (Full Access)</option>
                                </select>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="teammate@company.com"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className="flex-1 text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 text-zinc-200"
                                    />
                                    <button
                                        onClick={() => handleInviteHuman(node.id)}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                                    >
                                        Assign
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
