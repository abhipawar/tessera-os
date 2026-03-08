import React, { useState, useEffect } from 'react';
import { X, Code, Save, Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useStudioStore } from '@/store/studioStore';
import { useNotificationStore } from '@/store/notificationStore';
import { API_URL } from '@/config';

interface CustomToolModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CustomToolModal({ isOpen, onClose }: CustomToolModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [code, setCode] = useState('def main():\n    return "Hello from Sandbox"');
    const [isSaving, setIsSaving] = useState(false);
    const [globalToolId, setGlobalToolId] = useState<string | null>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { fetchAgentsAndTools } = useStudioStore();
    const { showNotification } = useNotificationStore();

    useEffect(() => {
        if (!isOpen) return;
        const fetchGlobalTool = async () => {
            const { data } = await supabase.from('global_tools').select('id').eq('name', 'Custom Python Script').single();
            if (data) setGlobalToolId(data.id);
        };
        fetchGlobalTool();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name || !description || !code) {
            showNotification({ title: "Validation Error", message: "Please fill out all fields.", type: "warning" });
            return;
        }
        if (!globalToolId) {
            showNotification({ title: "Setup Error", message: "Custom Python Script tool is missing from the global catalog.", type: "error" });
            return;
        }

        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const payload = {
                tool_id: globalToolId,
                connection_name: name,
                credentials: { code, description }
            };

            const res = await fetch(`${API_URL}/api/tenant/tools`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                showNotification({ title: "Tool Saved", message: "Custom Script deployed to Tenant integrations.", type: "success" });
                await fetchAgentsAndTools(); // Refresh the sidebar/config panel
                onClose();
            } else {
                throw new Error(data.error || "Failed to save tool.");
            }
        } catch (error: any) {
            showNotification({ title: "Save Error", message: error.message, type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center font-sans p-4">
            <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl w-[800px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800/50 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                            <Code size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-100">Air-Gapped Tool SDK</h2>
                            <p className="text-xs text-zinc-400">Write custom Python automation scripts targeting the E2B Sandbox.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Internal Tool Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Data Formatter"
                                className="w-full text-sm p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">AI Instructions (Description)</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="When should the agent use this tool?"
                                className="w-full text-sm p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all text-zinc-100"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Python execution block</label>
                        <div className="border border-zinc-800/50 rounded-xl overflow-hidden focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/50 transition-all">
                            <div className="bg-zinc-900/80 px-4 py-2 text-xs font-mono text-zinc-500 border-b border-zinc-800/50 flex gap-4">
                                <span>main.py</span>
                                <span className="text-orange-500/50"># runs inside BYOK E2B Micro-VM</span>
                            </div>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck="false"
                                className="w-full h-64 p-4 text-sm font-mono bg-zinc-950 text-zinc-300 outline-none resize-none leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-zinc-800/50 bg-zinc-900/30 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Deploy to Integrations
                    </button>
                </div>
            </div>
        </div>
    );
}
