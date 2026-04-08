"use client";

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, RefreshCcw, Activity, FileText, ChevronRight, Video, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { API_URL } from '@/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createBrowserClient(supabaseUrl, supabaseKey);

export default function RecorderDashboard() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayPhase, setReplayPhase] = useState<string>("Initializing secure sandbox...");
  const [replayOutput, setReplayOutput] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    const { data } = await supabase.from('process_recordings').select('*').order('created_at', { ascending: false });
    if (data) setRecordings(data);
  };

  const selectRecording = async (rec: any) => {
    setSelectedRec(rec);
    setReplayOutput(null);
    const { data } = await supabase.from('recording_events').select('*').eq('recording_id', rec.id).order('timestamp', { ascending: true });
    if (data) setEvents(data);
  };

  const synthesizeIntent = async () => {
    if (!selectedRec) return;
    try {
      const res = await fetch(`${API_URL}/api/recordings/${selectedRec.id}/summarize`, { method: 'POST' });
      const data = await res.json();
      if (data.summary) {
        setSelectedRec({ ...selectedRec, llm_summary: data.summary, status: 'summarized' });
        fetchRecordings(); // refresh list
      }
    } catch (e) {
      console.error("Synthesize failed", e);
    }
  };

  const triggerReplay = async () => {
    if (!selectedRec) return;
    setIsReplaying(true);
    setReplayOutput(null);
    setReplayPhase("Spinning up secure E2B container...");
    
    let phaseIdx = 0;
    const phases = [
      "Spinning up secure E2B container...",
      "Installing Chromium dependencies...",
      "Booting Headless Playwright...",
      "Executing sequence steps...",
      "Encoding remote video artifact...",
      "Compressing and returning payload..."
    ];
    
    const ticker = setInterval(() => {
      phaseIdx = (phaseIdx + 1);
      if (phaseIdx < phases.length) {
          setReplayPhase(phases[phaseIdx]);
      }
    }, 4500);

    try {
      const res = await fetch(`${API_URL}/api/recordings/${selectedRec.id}/replicate`, { method: 'POST' });
      const data = await res.json();
      setReplayOutput(data);
    } catch (e) {
      console.error("Replay failed", e);
    } finally {
      clearInterval(ticker);
      setIsReplaying(false);
    }
  };

  const updateRecordingName = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    await supabase.from('process_recordings').update({ name: newName }).eq('id', id);
    if (selectedRec?.id === id) {
        setSelectedRec({ ...selectedRec, name: newName });
    }
    fetchRecordings();
  };

  const deleteRecording = async () => {
    if (!selectedRec) return;
    if (!confirm('Are you sure you want to permanentely delete this recording?')) return;
    
    await supabase.from('process_recordings').delete().eq('id', selectedRec.id);
    setSelectedRec(null);
    fetchRecordings();
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans mt-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Master List */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[85vh]">
          <div className="p-4 border-b border-zinc-500/20 bg-zinc-900/50">
            <h2 className="text-xl font-bold flex items-center gap-2"><Video size={20} className="text-indigo-400"/> Captured Processes</h2>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {recordings.map(rec => (
              <div 
                key={rec.id} 
                onClick={() => selectRecording(rec)}
                className={`p-4 rounded-lg cursor-pointer transition-all border ${selectedRec?.id === rec.id ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-black border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm truncate">{rec.name || 'Untitled SOP'}</h3>
                </div>
                <div className="text-xs text-zinc-500">{new Date(rec.start_time).toLocaleString()}</div>
                {rec.llm_summary && (
                  <div className="mt-2 text-xs text-indigo-300 bg-indigo-900/30 p-2 rounded truncate border border-indigo-500/20">
                    <Activity size={12} className="inline mr-1"/> {rec.llm_summary}
                  </div>
                )}
              </div>
            ))}
            {recordings.length === 0 && (
              <div className="text-center text-zinc-500 p-8 text-sm">No recordings found. Use the Chrome Extension to capture an SOP.</div>
            )}
          </div>
        </div>

        {/* Right Col: Details & Replication */}
        <div className="md:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl flex flex-col h-[85vh] overflow-hidden">
          {selectedRec ? (
            <>
              <div className="p-6 border-b border-zinc-500/20 bg-zinc-900/50 flex justify-between items-start">
                <div>
                  <input 
                    type="text" 
                    defaultValue={selectedRec.name} 
                    onBlur={(e) => updateRecordingName(selectedRec.id, e.target.value)}
                    className="text-2xl font-bold bg-transparent text-white mb-2 border-b border-transparent focus:border-zinc-500 focus:outline-none hover:border-zinc-700 transition-colors w-full" 
                    placeholder="Recording Name..." 
                  />
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full border border-zinc-700">Events: {events.length}</span>
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-full border border-zinc-700">ID: {selectedRec.id.slice(0,8)}...</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={deleteRecording} className="flex items-center justify-center bg-red-900/40 hover:bg-red-800/60 text-red-400 p-2 rounded-lg border border-red-500/20 transition-all">
                    <Trash2 size={18} />
                  </button>
                  {!selectedRec.llm_summary && (
                    <button onClick={synthesizeIntent} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-purple-900/20">
                      <FileText size={16} /> Synthesize Intent
                    </button>
                  )}
                  <button onClick={triggerReplay} disabled={isReplaying} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-900/20">
                    {isReplaying ? <RefreshCcw size={16} className="animate-spin" /> : <Play size={16} />} 
                    EXECUTE REPLAY (E2B)
                  </button>
                </div>
              </div>

              {selectedRec.llm_summary && (
                <div className="m-6 mb-0 p-4 border border-indigo-500/30 bg-indigo-900/10 rounded-xl">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2"><CheckCircle size={14}/> LLM Synthesized Intent</h4>
                  <p className="text-zinc-200 text-sm leading-relaxed">{selectedRec.llm_summary}</p>
                </div>
              )}

              {isReplaying && (
                <div className="m-6 mb-0 p-6 border border-emerald-500/20 bg-emerald-900/10 rounded-xl flex flex-col items-center justify-center py-12">
                   <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                   <h3 className="text-emerald-400 font-bold mb-1 animate-pulse">Running Cloud Execution</h3>
                   <p className="text-sm text-zinc-400">{replayPhase}</p>
                </div>
              )}

              {replayOutput && (
                <div className="m-6 mb-0 p-4 border border-emerald-500/30 bg-emerald-900/10 rounded-xl flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">E2B Execution Results</h4>
                    <pre className="text-[10px] sm:text-xs text-zinc-300 font-mono bg-black p-4 rounded overflow-x-auto whitespace-pre-wrap border border-emerald-500/10">
                      {replayOutput.output}
                      {replayOutput.error && <span className="text-red-400">{replayOutput.error}</span>}
                    </pre>
                  </div>
                  
                  {replayOutput.video_b64 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Video size={14}/> Headless Video Artifact</h4>
                        <div className="w-full rounded-lg overflow-hidden border border-indigo-500/30 shadow-lg shadow-indigo-900/20 bg-black aspect-video flex items-center justify-center p-2">
                            <video 
                                src={`data:video/webm;base64,${replayOutput.video_b64}`} 
                                controls={true}
                                preload="metadata"
                                className="w-full h-full object-contain bg-black rounded"
                            />
                        </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-6 flex-1 overflow-y-auto">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Event Timeline ({events.length})</h4>
                <div className="space-y-4">
                  {events.map((ev, i) => (
                    <div key={ev.id} className="relative pl-6 before:content-[''] before:absolute before:left-[11px] before:top-8 before:bottom-[-20px] last:before:hidden before:w-0.5 before:bg-zinc-800">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">{i+1}</div>
                      <div className="bg-black border border-zinc-800 p-4 rounded-lg">
                        <div className="flex gap-2 items-center mb-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider 
                              ${ev.event_type === 'click' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/20' : 
                                ev.event_type === 'input' ? 'bg-amber-900/30 text-amber-400 border border-amber-500/20' : 
                                'bg-zinc-800 text-zinc-400'}`}>
                             {ev.event_type}
                           </span>
                           <span className="text-xs text-zinc-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="font-mono text-xs text-zinc-300 break-all bg-zinc-950 p-2 rounded mb-2 border border-zinc-800/50">
                          {ev.xpath_selector || 'No selector'}
                        </div>
                        {ev.value && (
                          <div className="text-sm border-l-2 border-amber-500/50 pl-3 py-1 mb-2">
                            Typed: <strong className="text-amber-100">"{ev.value}"</strong>
                          </div>
                        )}
                        {ev.screenshot_path && (
                          <div className="mt-3 relative w-full h-24 rounded overflow-hidden border border-zinc-700 cursor-pointer hover:border-emerald-500 transition-colors group" onClick={() => setSelectedImage(`${supabaseUrl}/storage/v1/object/public/process_screenshots/${ev.screenshot_path}`)}>
                            <img 
                              src={`${supabaseUrl}/storage/v1/object/public/process_screenshots/${ev.screenshot_path}`} 
                              alt="Screenshot"
                              className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-bold drop-shadow-md">Click to Enlarge</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Activity size={48} className="mb-4 opacity-50" />
              <p>Select a recording to view its execution graph.</p>
            </div>
          )}
        </div>
      </div>

      {selectedImage && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
        >
            <img 
                src={selectedImage} 
                className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl border border-zinc-800" 
                alt="Enlarged Screenshot" 
            />
        </div>
      )}
    </div>
  );
}
