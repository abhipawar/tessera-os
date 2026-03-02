"use client"

import React, { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import {
    TrendingUp,
    Server,
    Kanban,
    ShoppingCart,
    Headphones,
    Send,
    UserPlus,
    PenTool,
    BarChart3,
    LucideIcon,
    CheckCircle2,
    AlertTriangle
} from "lucide-react"
import { API_URL } from '@/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

type Template = {
    id: string
    name: string
    description: string
    target_audience: string
    icon: string
    prerequisite_tools: string[]
    graph_json: any
    is_active: boolean
    created_at: string
}

const iconMap: Record<string, LucideIcon> = {
    TrendingUp,
    Server,
    Kanban,
    ShoppingCart,
    Headphones,
    Send,
    UserPlus,
    PenTool,
    BarChart3
}

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [connectedToolNames, setConnectedToolNames] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Templates
                const { data: templatesData, error: templatesError } = await supabase
                    .from("global_workspace_templates")
                    .select("*")
                    .eq("is_active", true)
                    .order("created_at", { ascending: true })

                if (templatesError) {
                    console.error("Error fetching templates:", templatesError)
                } else if (templatesData) {
                    setTemplates(templatesData as Template[])
                }

                // Fetch Tenant's Connected Tools via existing API endpoint (same logic used in integrations/page.tsx or admin)
                // We'll simulate fetching the connected tools joined with global_tools to get their names.
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const res = await fetch(`${API_URL}/api/tenant/tools`, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                    const toolsData = await res.json();

                    if (toolsData.success) {
                        // Map the connected tenant_tools to global_tool names
                        const names = toolsData.tools.map((t: any) => t.global_tools?.name).filter(Boolean);
                        setConnectedToolNames(names);
                    }
                }

            } catch (err) {
                console.error("Failed to fetch data", err)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 md:p-10 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Day 1 Workspace Templates</h1>
                    <p className="text-zinc-400 max-w-2xl">
                        Accelerate your Time-to-Value. Deploy a complete autonomous agent topology instantly.
                    </p>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => {
                            const Icon = iconMap[template.icon] || Server
                            const requiredTools = template.prerequisite_tools || []

                            // Verification Logic
                            const missingTools = requiredTools.filter(tool => !connectedToolNames.includes(tool))
                            const isFullyConfigured = missingTools.length === 0

                            return (
                                <div
                                    key={template.id}
                                    className="group relative flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-zinc-700 hover:bg-zinc-900 shadow-sm"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800">
                                                <Icon className="h-6 w-6 text-zinc-300" />
                                            </div>
                                            <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/20">
                                                {template.target_audience}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-semibold text-zinc-100">{template.name}</h3>
                                            <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                                                {template.description}
                                            </p>
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Required Tools</p>
                                                {!isFullyConfigured ? (
                                                    <span className="text-xs text-orange-400 font-medium">{requiredTools.length - missingTools.length}/{requiredTools.length} Configured</span>
                                                ) : (
                                                    <span className="text-xs text-emerald-400 font-medium">Ready</span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {requiredTools.map((tool) => {
                                                    const isConnected = connectedToolNames.includes(tool);

                                                    return (
                                                        <span
                                                            key={tool}
                                                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isConnected
                                                                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                                                                : 'bg-zinc-800 text-zinc-400 ring-zinc-700/50'
                                                                }`}
                                                        >
                                                            {isConnected ? (
                                                                <CheckCircle2 className="w-3 h-3" />
                                                            ) : (
                                                                <AlertTriangle className="w-3 h-3 text-orange-400/70" />
                                                            )}
                                                            {tool}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-4 border-t border-zinc-800/50">
                                        {isFullyConfigured ? (
                                            <button className="w-full relative inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg bg-zinc-800 hover:bg-zinc-700 hover:text-white overflow-hidden group-hover:ring-1 group-hover:ring-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900">
                                                <span className="relative z-10 flex items-center gap-2">
                                                    Deploy Workspace
                                                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </span>
                                                <div className="absolute inset-0 z-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </button>
                                        ) : (
                                            <button
                                                disabled
                                                className="w-full relative inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold text-zinc-500 transition-all duration-200 rounded-lg bg-zinc-900 border border-dashed border-zinc-700/50 cursor-not-allowed"
                                            >
                                                <span className="flex items-center gap-2">
                                                    Missing Integrations ({missingTools.length})
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

