import React, { useState, useEffect } from 'react';
import { Settings, X, Mail, Loader2, Save } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { API_URL } from '@/config';
import { createBrowserClient } from '@supabase/ssr';

export default function WorkspaceSettingsModal({
    isOpen,
    onClose,
    workspaceId
}: {
    isOpen: boolean,
    onClose: () => void,
    workspaceId: string | null
}) {
    const [prefix, setPrefix] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    useEffect(() => {
        if (isOpen && workspaceId) {
            fetchEmailRoute();
        }
    }, [isOpen, workspaceId]);

    const fetchEmailRoute = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${API_URL}/api/tenant/workspaces/${workspaceId}/email-route`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (data.success && data.prefix) {
                setPrefix(data.prefix);
            } else if (data.success && !data.prefix) {
                setPrefix(`agent-${workspaceId?.substring(0, 8)}`);
            }
        } catch (error) {
            console.error("Failed to fetch email route");
        } finally {
            setIsLoading(false);
        }
    }

    const saveEmailRoute = async () => {
        if (!workspaceId) return;
        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch(`${API_URL}/api/tenant/workspaces/${workspaceId}/email-route`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prefix })
            });

            const data = await res.json();
            if (data.success) {
                setPrefix(data.prefix);
                useNotificationStore.getState().showNotification({
                    title: "Route Saved",
                    message: "Autonomous email address updated.",
                    type: "success"
                });
                onClose();
            } else {
                throw new Error(data.error || "Failed to save route");
            }
        } catch (error: any) {
            useNotificationStore.getState().showNotification({
                title: "Error",
                message: error.message,
                type: "error"
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (!isOpen || !workspaceId) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden font-sans text-zinc-100">
                <div className="p-5 border-b border-zinc-800/50 bg-zinc-950/50 flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Settings size={18} className="text-indigo-400" />
                        Workspace Settings
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-zinc-300 mb-1 flex items-center gap-2">
                            <Mail size={16} className="text-blue-400" />
                            Inbound Agent Email Routing
                        </h3>
                        <p className="text-xs text-zinc-500 mb-4">
                            Configure the exact email address users can send messages to to interact with this autonomous workspace.
                        </p>

                        {isLoading ? (
                            <div className="flex justify-center p-4"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Semantic Email Alias</label>
                                <div className="flex items-center">
                                    <div className="p-2.5 bg-zinc-800/80 border border-r-0 border-zinc-700/80 rounded-l-lg text-sm text-zinc-400 select-none font-mono">
                                        agent_
                                    </div>
                                    <input
                                        type="text"
                                        value={prefix}
                                        onChange={(e) => setPrefix(e.target.value)}
                                        className="w-1/2 p-2.5 bg-black border border-zinc-700 text-sm text-zinc-200 outline-none focus:border-blue-500 font-mono text-center flex-1"
                                        placeholder="sales-team"
                                    />
                                    <div className="p-2.5 bg-zinc-800/80 border border-l-0 border-zinc-700/80 rounded-r-lg text-sm text-zinc-400 select-none font-mono">
                                        @tesseraos.ai
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-500 px-1 mt-1">
                                    Only lowercase letters, numbers, and hyphens are permitted. Lookups are exact.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-zinc-950 border-t border-zinc-800/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button
                        onClick={saveEmailRoute}
                        disabled={isSaving || isLoading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg shadow-blue-500/20"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
