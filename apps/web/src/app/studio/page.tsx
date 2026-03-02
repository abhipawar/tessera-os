"use client";

import React, { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Loader2, Plus, Save, Users, Trash2, Globe, X } from 'lucide-react';

import StudioCanvas from '@/components/studio/StudioCanvas';
import MarketplaceSidebar from '@/components/studio/MarketplaceSidebar';
import ConfigurationPanel from '@/components/studio/ConfigurationPanel';
import TeamManagementModal from '@/components/studio/TeamManagementModal';

import { useStudioStore } from '@/store/studioStore';

export default function OrgChartCanvas() {
  const {
    chartList,
    currentChartId,
    chartName,
    isSaving,
    isTeamPanelOpen,
    setIsTeamPanelOpen,
    setChartName,
    createNewChart,
    loadChart,
    saveOrgChart,
    fetchChartList,
    fetchAgentsAndTools,
    fetchGlobalTemplates,
    globalTemplates,
    configuredTools,
    isAdmin,
    checkAdminStatus,
    publishGlobalTemplate,
    setSelectedNode,
    deleteWorkspace
  } = useStudioStore();

  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
  const [publishForm, setPublishForm] = React.useState({
    name: chartName,
    description: '',
    target_audience: 'Everyone',
    icon: 'Server'
  });

  useEffect(() => {
    checkAdminStatus();
    fetchChartList();
    fetchAgentsAndTools();
    fetchGlobalTemplates();
  }, [checkAdminStatus, fetchChartList, fetchAgentsAndTools, fetchGlobalTemplates]);

  // Compute if all required tools are configured for a loaded template
  // If currentChartId is null, and chartName matches a template, we are in "template preview" mode
  const isTemplatePreview = !currentChartId && globalTemplates.some(t => t.name === chartName);
  const activeTemplate = isTemplatePreview ? globalTemplates.find(t => t.name === chartName) : null;

  const missingTools = activeTemplate
    ? activeTemplate.prerequisite_tools.filter(tool => !configuredTools.some(ct => ct.global_tools?.name === tool))
    : [];

  const canSave = !activeTemplate || missingTools.length === 0;

  const handlePublishClick = () => {
    setPublishForm({
      name: chartName,
      description: activeTemplate?.description || '',
      target_audience: activeTemplate?.target_audience || 'Everyone',
      icon: activeTemplate?.icon || 'Server'
    });
    setIsPublishModalOpen(true);
  };

  const handlePublishSubmit = async () => {
    const payload = {
      ...publishForm,
      id: activeTemplate?.id // If present, it will update instead of insert
    };
    const res = await publishGlobalTemplate(payload);
    if (res.success) {
      setIsPublishModalOpen(false);
      alert(activeTemplate ? "Global Template Updated!" : "New Global Template Published!");
    } else {
      alert("Publish Failed: " + res.error);
    }
  };

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
              value={currentChartId || (isTemplatePreview ? `template-${activeTemplate?.id}` : 'new')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'new') createNewChart();
                else if (val.startsWith('template-')) {
                  const { loadTemplate } = useStudioStore.getState();
                  loadTemplate(val.replace('template-', ''));
                }
                else loadChart(val);
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 cursor-pointer outline-none"
            >
              <option value="new" className="font-semibold text-blue-400">+ Create New Workspace</option>

              {globalTemplates.length > 0 && (
                <optgroup label="Global Templates">
                  {globalTemplates.map((template) => (
                    <option key={`template-${template.id}`} value={`template-${template.id}`}>
                      {template.name}
                    </option>
                  ))}
                </optgroup>
              )}

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

          {currentChartId && (
            <button
              onClick={deleteWorkspace}
              disabled={isSaving}
              title="Delete Workspace permanently"
              className="flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-zinc-400 py-2 px-3 rounded-lg transition-all disabled:opacity-70"
            >
              <Trash2 size={16} />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={handlePublishClick}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 text-indigo-300 text-sm font-semibold py-2 px-4 rounded-lg transition-all"
            >
              <Globe size={16} />
              {activeTemplate ? 'Update Global Template' : 'Publish Global Template'}
            </button>
          )}

          <button
            onClick={saveOrgChart}
            disabled={isSaving || (!canSave && !isAdmin)}
            title={!canSave ? `Missing Tools: ${missingTools.join(', ')}` : "Save Workspace"}
            className={`flex items-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg transition-all 
               ${(!canSave && !isAdmin || isSaving)
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-dashed border-zinc-700/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {(!canSave && !isAdmin) ? `Missing Integrations (${missingTools.length})` : isSaving ? 'Saving...' : 'Save Workspace'}
          </button>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative flex">
        <MarketplaceSidebar />

        <ReactFlowProvider>
          <StudioCanvas />
          <ConfigurationPanel />
        </ReactFlowProvider>

        <TeamManagementModal />
      </div>

      {/* PUBLISH MODAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsPublishModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe className="text-indigo-400" />
                {activeTemplate ? 'Update Global Template' : 'Publish Global Template'}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                This will save the current canvas topology to the global `workspace_templates` library. All tenants will see this.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Template Name</label>
                <input
                  type="text"
                  value={publishForm.name}
                  onChange={e => setPublishForm({ ...publishForm, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Description</label>
                <textarea
                  value={publishForm.description}
                  onChange={e => setPublishForm({ ...publishForm, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 h-24 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Explain what this topology achieves..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Target Audience</label>
                  <select
                    value={publishForm.target_audience}
                    onChange={e => setPublishForm({ ...publishForm, target_audience: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Founders">Founders</option>
                    <option value="Sales Teams">Sales Teams</option>
                    <option value="HR Teams">HR Teams</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Primary Icon</label>
                  <select
                    value={publishForm.icon}
                    onChange={e => setPublishForm({ ...publishForm, icon: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
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
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50 mt-2">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 bg-transparent text-sm font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishSubmit}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}