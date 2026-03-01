"use client";

import React, { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { Loader2, Plus, Save, Users } from 'lucide-react';

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
    setSelectedNode
  } = useStudioStore();

  useEffect(() => {
    fetchChartList();
    fetchAgentsAndTools();
  }, [fetchChartList, fetchAgentsAndTools]);

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
              value={currentChartId || 'new'}
              onChange={(e) => {
                if (e.target.value === 'new') createNewChart();
                else loadChart(e.target.value);
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 cursor-pointer outline-none"
            >
              <option value="new" className="font-semibold text-blue-400">+ Create New Workspace</option>
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

          <button
            onClick={saveOrgChart}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Workspace'}
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
    </div>
  );
}