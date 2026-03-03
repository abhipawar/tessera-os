"use client";

import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Inbox, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { API_URL } from '@/config';

export default function InboxPage() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ));

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // In a real app we'd filter by tenant_id or workspace RBAC via a Postgres function
            // For now we get all pending tasks
            const { data, error } = await supabase
                .from('agent_tasks')
                .select('*, workspaces(name)')
                .eq('status', 'pending_approval')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTasks(data || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (taskId: string, action: 'approve' | 'reject') => {
        setActionLoading(taskId);
        try {
            const res = await fetch(`${API_URL}/api/async/tasks/${taskId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            if (!res.ok) throw new Error('Failed to resolve task');

            // Remove from list
            setTasks(prev => prev.filter(t => t.id !== taskId));

        } catch (error) {
            console.error(`Error ${action}ing task:`, error);
            useNotificationStore.getState().showNotification({
                title: "Action Failed",
                message: `Failed to ${action} task.`,
                type: "error"
            });
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="w-full h-full p-8 bg-zinc-950 text-zinc-100 overflow-y-auto font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center gap-3 pb-6 border-b border-zinc-900">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Inbox size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Command Center</h1>
                        <p className="text-zinc-400 text-sm mt-1">Review and approve pending tasks from autonomous agents.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-zinc-500" size={32} />
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                        <CheckCircle size={48} className="mx-auto text-zinc-600 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300">Inbox Zero</h3>
                        <p className="text-zinc-500 text-sm mt-1">No autonomous agents are waiting for your approval.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {tasks.map(task => (
                            <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg transition-all hover:border-indigo-500/30">
                                <div className="p-5 border-b border-zinc-800/50 flex justify-between items-start bg-zinc-900/50">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                Action Required
                                            </span>
                                            <span className="text-xs text-zinc-500">
                                                Workspace: <strong className="text-zinc-300">{task.workspaces?.name || 'Unknown'}</strong>
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-zinc-100">
                                            Approval requested at node '{task.agent_id}'
                                        </h3>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            Thread ID: <span className="font-mono text-xs">{task.thread_id.split('_')[1]}</span>
                                        </p>
                                    </div>
                                    <div className="text-xs text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                                        {new Date(task.created_at).toLocaleString()}
                                    </div>
                                </div>

                                <div className="p-5 bg-zinc-950">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Context Payload</h4>
                                    <pre className="text-xs font-mono text-zinc-300 bg-black/50 p-4 rounded-lg border border-zinc-800/50 overflow-x-auto">
                                        {JSON.stringify(task.payload, null, 2)}
                                    </pre>
                                </div>

                                <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/50 flex justify-end gap-3">
                                    <button
                                        onClick={() => handleAction(task.id, 'reject')}
                                        disabled={actionLoading === task.id}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-transparent border border-zinc-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 disabled:opacity-50 text-zinc-300 text-sm font-semibold rounded-lg transition-all"
                                    >
                                        <XCircle size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(task.id, 'approve')}
                                        disabled={actionLoading === task.id}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
                                    >
                                        {actionLoading === task.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                        Approve Execution
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
