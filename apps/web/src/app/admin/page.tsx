'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@supabase/ssr'
import { Trash2, AlertTriangle, Users, Database, Network, RefreshCw, Wrench, CheckCircle2, XCircle, Bot, Settings } from 'lucide-react'
import { API_URL } from '@/config'
import { useNotificationStore } from '@/store/notificationStore'

// Master Data & Types
type MasterCategory = { id: string; slug: string; display_name: string; icon_name: string; }
type MasterType = { id: string; slug: string; display_name: string; }

type GlobalTool = { id: string; name: string; description: string; type_id: string; category_id: string; logo_icon: string; config_schema: any; is_active: boolean; tool_types?: { display_name: string }; tool_categories?: { display_name: string }; }
type GlobalAgent = { id: string; name: string; description: string; system_prompt: string; category_id: string; logo_icon: string; is_active: boolean; tool_categories?: { display_name: string }; }
type Template = { id: string; name: string; description: string; target_audience: string; icon: string; prerequisite_tools: string[]; is_active: boolean; }
type TenantMetric = { id: string; name: string; created_at: string; tier: string; workspace_count: number; user_count: number; }

export default function AdminDashboard() {
  const [workerStatus, setWorkerStatus] = useState("Waiting for ping...")
  const [prompt, setPrompt] = useState("")
  const [graphResult, setGraphResult] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isWiping, setIsWiping] = useState(false)

  // States
  const [tenants, setTenants] = useState<TenantMetric[]>([])
  const [tools, setTools] = useState<GlobalTool[]>([])
  const [agents, setAgents] = useState<GlobalAgent[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<MasterCategory[]>([])
  const [types, setTypes] = useState<MasterType[]>([])
  const [systemSettings, setSystemSettings] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)

  // Tool Modal State
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<GlobalTool | null>(null);
  const [toolForm, setToolForm] = useState({ name: '', description: '', type_id: '', category_id: '', logo_icon: '', config_schema: '{"required": []}', is_active: true });

  // Agent Modal State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<GlobalAgent | null>(null);
  const [agentForm, setAgentForm] = useState({ name: '', description: '', system_prompt: '', category_id: '', logo_icon: '', is_active: true });

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', target_audience: 'Everyone', icon: 'Server', is_active: true });

  // Settings Modal State
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [settingFormValue, setSettingFormValue] = useState("");

  const [supabase] = useState(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [tenantRes, masterRes, toolRes, agentRes, templateRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/tenants`, { headers }),
        fetch(`${API_URL}/api/admin/master-data`, { headers }),
        fetch(`${API_URL}/api/admin/tools`, { headers }),
        fetch(`${API_URL}/api/admin/agents`, { headers }),
        fetch(`/api/admin/templates`),
        fetch(`${API_URL}/api/admin/system-settings`, { headers })
      ]);

      const [tenantData, masterData, toolData, agentData, templateData, settingsData] = await Promise.all([
        tenantRes.json(), masterRes.json(), toolRes.json(), agentRes.json(), templateRes.json(), settingsRes.json()
      ]);

      if (tenantData.success) setTenants(tenantData.tenants);
      if (masterData.success) { setCategories(masterData.categories); setTypes(masterData.types); }
      if (toolData.success) setTools(toolData.tools);
      if (agentData.success) setAgents(agentData.agents);
      if (templateData.success) setTemplates(templateData.templates);
      if (settingsData.success) setSystemSettings(settingsData.settings);
    } catch (error) { console.error("Failed to load dashboard data", error); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { fetchDashboardData(); }, [])

  // --- TOOL CRUD ---
  const openToolModal = (tool?: GlobalTool) => {
    if (tool) {
      setEditingTool(tool);
      setToolForm({ name: tool.name, description: tool.description, type_id: tool.type_id, category_id: tool.category_id, logo_icon: tool.logo_icon || '', config_schema: JSON.stringify(tool.config_schema), is_active: tool.is_active });
    } else {
      setEditingTool(null);
      setToolForm({ name: '', description: '', type_id: types[0]?.id || '', category_id: categories[0]?.id || '', logo_icon: '', config_schema: '{"required": []}', is_active: true });
    }
    setIsToolModalOpen(true);
  };

  const saveTool = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const url = editingTool ? `${API_URL}/api/admin/tools/${editingTool.id}` : `${API_URL}/api/admin/tools`;
      const payload = { ...toolForm, config_schema: JSON.parse(toolForm.config_schema) };
      await fetch(url, { method: editingTool ? 'PUT' : 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setIsToolModalOpen(false);
      fetchDashboardData();
    } catch (e) {
      useNotificationStore.getState().showNotification({
        title: "Save Failed",
        message: "Failed to persist tool changes to the database.",
        type: "error"
      });
    }
  };

  const deleteTool = async (id: string) => {
    if (!window.confirm("Delete this tool?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_URL}/api/admin/tools/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
    fetchDashboardData();
  };

  // --- AGENT CRUD ---
  const openAgentModal = (agent?: GlobalAgent) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentForm({ name: agent.name, description: agent.description, system_prompt: agent.system_prompt, category_id: agent.category_id, logo_icon: agent.logo_icon || '', is_active: agent.is_active });
    } else {
      setEditingAgent(null);
      setAgentForm({ name: '', description: '', system_prompt: '', category_id: categories[0]?.id || '', logo_icon: '', is_active: true });
    }
    setIsAgentModalOpen(true);
  };

  const saveAgent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const url = editingAgent ? `${API_URL}/api/admin/agents/${editingAgent.id}` : `${API_URL}/api/admin/agents`;
      await fetch(url, { method: editingAgent ? 'PUT' : 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(agentForm) });
      setIsAgentModalOpen(false);
      fetchDashboardData();
    } catch (e) {
      useNotificationStore.getState().showNotification({
        title: "Save Failed",
        message: "Failed to save agent to the database.",
        type: "error"
      });
    }
  };

  const deleteAgent = async (id: string) => {
    if (!window.confirm("Delete this agent?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_URL}/api/admin/agents/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
    fetchDashboardData();
  };

  // --- TEMPLATE CRUD ---
  const openTemplateModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({ name: template.name, description: template.description || '', target_audience: template.target_audience || 'Everyone', icon: template.icon || 'Server', is_active: template.is_active });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '', target_audience: 'Everyone', icon: 'Server', is_active: true });
    }
    setIsTemplateModalOpen(true);
  };

  const saveTemplate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = editingTemplate ? `/api/admin/templates/${editingTemplate.id}` : `/api/admin/templates`;
      await fetch(url, { method: editingTemplate ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(templateForm) });
      setIsTemplateModalOpen(false);
      fetchDashboardData();
    } catch (e) {
      useNotificationStore.getState().showNotification({
        title: "Save Failed",
        message: "Failed to save global template.",
        type: "error"
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this global template? Tenants who have already cloned workspaces from this will NOT be affected.")) return;
    await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
    fetchDashboardData();
  };

  // --- SETTINGS CRUD ---
  const openSettingModal = (setting: any) => {
    setEditingSetting(setting);
    setSettingFormValue(setting.value || "");
    setIsSettingModalOpen(true);
  };

  const saveSetting = async () => {
    try {
      if (!editingSetting) return;
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_URL}/api/admin/system-settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editingSetting.key, value: settingFormValue })
      });
      setIsSettingModalOpen(false);
      fetchDashboardData();
    } catch (e) {
      useNotificationStore.getState().showNotification({
        title: "Save Failed",
        message: "Failed to save global setting.",
        type: "error"
      });
    }
  };

  // --- SYSTEM FUNCTIONS ---
  const handleSystemReset = async () => {
    if (!window.confirm("WARNING: This wipes all data. Are you sure?")) return;
    setIsWiping(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_URL}/api/admin/reset-system`, { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
      useNotificationStore.getState().showNotification({
        title: "System Purged",
        message: "System data completely wiped and reset.",
        type: "success"
      });
      fetchDashboardData();
    } catch (e) {
      useNotificationStore.getState().showNotification({
        title: "Reset Failed",
        message: "Database failed to wipe.",
        type: "error"
      });
    } finally { setIsWiping(false); }
  }

  return (
    <div className="p-10 text-white bg-zinc-950 min-h-screen space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tessera Control Plane</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

        {/* Active Organizations */}
        <div className="p-6 border border-zinc-800 rounded-lg bg-zinc-900 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><Database className="text-blue-500" size={20} /><h2 className="text-xl font-semibold">Active Organizations</h2></div>
            <Button onClick={fetchDashboardData} variant="outline" className="h-8 px-3 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"><RefreshCw size={14} className="mr-2" /> Refresh</Button>
          </div>
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
              <tr><th className="px-4 py-3">Tenant Name</th><th className="px-4 py-3">Tier</th><th className="px-4 py-3">Workspaces</th><th className="px-4 py-3">Users</th></tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-3 text-zinc-200">{t.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/20">{t.tier}</span></td>
                  <td className="px-4 py-3">{t.workspace_count}</td>
                  <td className="px-4 py-3">{t.user_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Agent Registry */}
        <div className="p-6 border border-zinc-800 rounded-lg bg-zinc-900 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><Bot className="text-emerald-500" size={20} /><h2 className="text-xl font-semibold">Global Agent Registry</h2></div>
            <Button onClick={() => openAgentModal()} variant="outline" className="h-8 px-3 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white">+ Add Agent</Button>
          </div>
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
              <tr><th className="px-4 py-3">Agent Name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-3"><div className="font-medium text-zinc-200">{agent.name}</div><div className="text-xs text-zinc-500">{agent.description}</div></td>
                  <td className="px-4 py-3">{agent.tool_categories?.display_name || 'Uncategorized'}</td>
                  <td className="px-4 py-3">{agent.is_active ? 'Active' : 'Draft'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button onClick={() => openAgentModal(agent)} variant="outline" className="h-6 px-2 text-xs bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Edit</Button>
                    <Button onClick={() => deleteAgent(agent.id)} variant="outline" className="h-6 px-2 text-xs bg-transparent text-red-500 border-zinc-700 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={12} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Tool Registry */}
        <div className="p-6 border border-zinc-800 rounded-lg bg-zinc-900 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><Wrench className="text-purple-500" size={20} /><h2 className="text-xl font-semibold">Global Tool Registry</h2></div>
            <Button onClick={() => openToolModal()} variant="outline" className="h-8 px-3 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white">+ Add Tool</Button>
          </div>
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
              <tr><th className="px-4 py-3">Tool Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-3"><div className="font-medium text-zinc-200">{tool.name}</div><div className="text-xs text-zinc-500">{tool.description}</div></td>
                  <td className="px-4 py-3">{tool.tool_types?.display_name || 'Unknown'}</td>
                  <td className="px-4 py-3">{tool.is_active ? 'Active' : 'Draft'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button onClick={() => openToolModal(tool)} variant="outline" className="h-6 px-2 text-xs bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Edit</Button>
                    <Button onClick={() => deleteTool(tool.id)} variant="outline" className="h-6 px-2 text-xs bg-transparent text-red-500 border-zinc-700 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={12} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Global Template Registry */}
        <div className="p-6 border border-zinc-800 rounded-lg bg-zinc-900 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><Network className="text-indigo-500" size={20} /><h2 className="text-xl font-semibold">Global Template Registry</h2></div>
            <Button onClick={() => openTemplateModal()} variant="outline" className="h-8 px-3 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white">+ Add Blank Template</Button>
          </div>
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
              <tr><th className="px-4 py-3">Template Name</th><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-3"><div className="font-medium text-zinc-200">{template.name}</div><div className="text-xs text-zinc-500">{template.description}</div></td>
                  <td className="px-4 py-3">{template.target_audience}</td>
                  <td className="px-4 py-3">{template.is_active ? 'Active' : 'Draft'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button onClick={() => openTemplateModal(template)} variant="outline" className="h-6 px-2 text-xs bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Edit</Button>
                    <Button onClick={() => deleteTemplate(template.id)} variant="outline" className="h-6 px-2 text-xs bg-transparent text-red-500 border-zinc-700 hover:bg-red-900/30 hover:text-red-400"><Trash2 size={12} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* System Configuration */}
        <div className="p-6 border border-zinc-800 rounded-lg bg-zinc-900 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><Settings className="text-orange-500" size={20} /><h2 className="text-xl font-semibold">System Variables</h2></div>
          </div>
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
              <tr><th className="px-4 py-3">Variable Key</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody>
              {systemSettings.map((setting) => (
                <tr key={setting.key} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-3"><div className="font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded text-xs inline-block">{setting.key}</div></td>
                  <td className="px-4 py-3 text-zinc-200">
                    {setting.key.includes("password") || setting.key.includes("secret") ? "••••••••" : setting.value}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 leading-relaxed">{setting.description}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button onClick={() => openSettingModal(setting)} variant="outline" className="h-6 px-2 text-xs bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {systemSettings.length === 0 && (
            <div className="text-center py-6 text-zinc-500">
              <p>No system settings found. Please run the migration script.</p>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="p-6 border border-red-900/50 rounded-lg bg-zinc-900">
          <h2 className="text-xl font-semibold text-red-500 mb-4">Danger Zone</h2>
          <Button onClick={handleSystemReset} className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white">Factory Reset Environment</Button>
        </div>

      </div>

      {/* Tool Modal Overlay */}
      {isToolModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">{editingTool ? 'Edit Tool' : 'Add Tool'}</h3>
            <Input placeholder="Name" value={toolForm.name || ''} onChange={e => setToolForm({ ...toolForm, name: e.target.value })} className="bg-zinc-950" />
            {editingTool && editingTool.name !== toolForm.name && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs p-3 rounded-lg flex gap-2 items-start mt-1">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <p><strong>Warning:</strong> Changing the global tool name may break tenant integrations and UI components that rely on specific keywords (e.g. 'LLM' or 'Database').</p>
              </div>
            )}
            <Input placeholder="Description" value={toolForm.description || ''} onChange={e => setToolForm({ ...toolForm, description: e.target.value })} className="bg-zinc-950" />
            <div className="flex gap-4">
              <select value={toolForm.category_id} onChange={e => setToolForm({ ...toolForm, category_id: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-md p-2 flex-1 text-sm text-zinc-300">
                {categories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
              </select>
              <select value={toolForm.type_id} onChange={e => setToolForm({ ...toolForm, type_id: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-md p-2 flex-1 text-sm text-zinc-300">
                {types.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
              </select>
            </div>
            <textarea placeholder='Config Schema' value={toolForm.config_schema} onChange={e => setToolForm({ ...toolForm, config_schema: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 h-24 text-sm font-mono text-emerald-400" />
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setIsToolModalOpen(false)} variant="outline" className="bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Cancel</Button>
              <Button onClick={saveTool} className="bg-blue-600 text-white hover:bg-blue-500">Save Tool</Button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Modal Overlay */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">{editingAgent ? 'Edit Agent' : 'Add Agent'}</h3>
            <Input placeholder="Agent Name (e.g. Data Analyst)" value={agentForm.name || ''} onChange={e => setAgentForm({ ...agentForm, name: e.target.value })} className="bg-zinc-950" />
            <Input placeholder="Short Description" value={agentForm.description || ''} onChange={e => setAgentForm({ ...agentForm, description: e.target.value })} className="bg-zinc-950" />
            <select value={agentForm.category_id || ''} onChange={e => setAgentForm({ ...agentForm, category_id: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-md p-2 w-full text-sm text-zinc-300">
              {categories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
            <textarea placeholder='System Prompt (Instructions)' value={agentForm.system_prompt || ''} onChange={e => setAgentForm({ ...agentForm, system_prompt: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 h-32 text-sm font-mono text-emerald-400" />
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setIsAgentModalOpen(false)} variant="outline" className="bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Cancel</Button>
              <Button onClick={saveAgent} className="bg-emerald-600 text-white hover:bg-emerald-500">Save Agent</Button>
            </div>
          </div>
        </div>
      )}
      {/* Template Modal Overlay */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">{editingTemplate ? 'Edit Template Metadata' : 'Add Blank Template'}</h3>
            {!editingTemplate && (
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs p-3 rounded-lg flex gap-2 items-start mt-1">
                <p><strong>Note:</strong> Creating a template here only configures its metadata. You MUST open it in the Agent Studio to visually build the graph and set its prerequisite tools.</p>
              </div>
            )}
            <Input placeholder="Template Name" value={templateForm.name || ''} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="bg-zinc-950" />
            <textarea placeholder="Description" value={templateForm.description || ''} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 h-20 text-sm text-zinc-200" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Target Audience</label>
                <select value={templateForm.target_audience} onChange={e => setTemplateForm({ ...templateForm, target_audience: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-md p-2 w-full text-sm text-zinc-300">
                  <option value="Everyone">Everyone</option>
                  <option value="Founders">Founders</option>
                  <option value="Sales Teams">Sales Teams</option>
                  <option value="HR Teams">HR Teams</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Primary Icon</label>
                <select value={templateForm.icon} onChange={e => setTemplateForm({ ...templateForm, icon: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-md p-2 w-full text-sm text-zinc-300">
                  <option value="Server">Server</option>
                  <option value="TrendingUp">Trending Up</option>
                  <option value="Rocket">Rocket</option>
                  <option value="Kanban">Kanban</option>
                  <option value="ShoppingCart">Shopping Cart</option>
                  <option value="Headphones">Headphones</option>
                  <option value="Send">Send</option>
                  <option value="UserPlus">User Plus</option>
                  <option value="PenTool">Pen Tool</option>
                  <option value="BarChart3">Bar Chart</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={templateForm.is_active} onChange={e => setTemplateForm({ ...templateForm, is_active: e.target.checked })} className="rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-indigo-500" />
              <span className="text-sm text-zinc-300">Active (Visible to Tenants)</span>
            </label>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setIsTemplateModalOpen(false)} variant="outline" className="bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Cancel</Button>
              <Button onClick={saveTemplate} className="bg-indigo-600 text-white hover:bg-indigo-500">Save Metadata</Button>
            </div>
          </div>
        </div>
      )}
      {/* Settings Modal Overlay */}
      {isSettingModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-xl font-semibold">Edit System Variable</h3>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Variable Key</label>
              <div className="font-mono text-orange-400 bg-orange-500/10 px-3 py-2 rounded text-sm">{editingSetting?.key}</div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Value</label>
              {editingSetting?.key.includes("prompt") ? (
                <textarea
                  placeholder="Value"
                  value={settingFormValue}
                  onChange={e => setSettingFormValue(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 h-64 text-sm font-mono text-emerald-400"
                />
              ) : (
                <Input
                  placeholder="Value"
                  type={(editingSetting?.key.includes("password") || editingSetting?.key.includes("secret")) ? "password" : "text"}
                  value={settingFormValue}
                  onChange={e => setSettingFormValue(e.target.value)}
                  className="bg-zinc-950 font-mono"
                />
              )}
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Description</label>
              <p className="text-sm text-zinc-400">{editingSetting?.description}</p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setIsSettingModalOpen(false)} variant="outline" className="bg-transparent text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white">Cancel</Button>
              <Button onClick={saveSetting} className="bg-orange-600 text-white hover:bg-orange-500">Save Setting</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}