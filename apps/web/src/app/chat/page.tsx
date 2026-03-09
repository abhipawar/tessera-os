'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@supabase/ssr'
import { Bot, User, AlertCircle, Send, TerminalSquare, Plus, MessageSquare, Trash2, Edit2, Pin, MoreVertical } from 'lucide-react'
import AuditLogsSidebar from '@/components/chat/AuditLogsSidebar'
import { API_URL } from '@/config'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  name?: string // Used to identify which Agent is speaking
}

export default function ChatDashboard() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your secure Tenant AI. Select a team above, and let me know how I can help you today!' }
  ])
  const [isProcessing, setIsProcessing] = useState(false)

  // Workspace & Thread State
  const [workspaces, setWorkspaces] = useState<{ id: string, name: string }[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("")

  const [threads, setThreads] = useState<any[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string>("")
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  // Audit Logs State
  const [showLogs, setShowLogs] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const getImpersonationHeaders = (baseHeaders: Record<string, string> = {}) => {
    if (typeof document === 'undefined') return baseHeaders;
    const value = `; ${document.cookie}`;

    let headers = { ...baseHeaders };

    const tenantParts = value.split(`; tessera_impersonated_tenant=`);
    if (tenantParts.length === 2) {
      const tenantId = tenantParts.pop()?.split(';').shift();
      if (tenantId) headers['X-Impersonated-Tenant-Id'] = tenantId;
    }

    const userParts = value.split(`; tessera_impersonated_user=`);
    if (userParts.length === 2) {
      const userId = userParts.pop()?.split(';').shift();
      if (userId) headers['X-Impersonated-User-Id'] = userId;
    }

    return headers;
  };

  // Fetch Workspaces on load
  useEffect(() => {
    const fetchWorkspaces = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/api/tenant/workspaces`, {
        headers: getImpersonationHeaders({
          'Authorization': `Bearer ${session.access_token}`
        })
      });
      const data = await res.json();

      if (data.success && data.workspaces && data.workspaces.length > 0) {
        setWorkspaces(data.workspaces);
        setSelectedWorkspaceId(data.workspaces[0].id);
      }
    }
    fetchWorkspaces()
  }, [supabase])

  // Fetch Threads when Workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const fetchThreads = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/api/tenant-agent/chats/${selectedWorkspaceId}`, {
        headers: getImpersonationHeaders({ 'Authorization': `Bearer ${session.access_token}` })
      });
      const data = await res.json();
      if (data.chats && data.chats.length > 0) {
        setThreads(data.chats);
        setSelectedThreadId(data.chats[0].id);
      } else {
        setThreads([]);
        setSelectedThreadId("");
        setMessages([{ role: 'assistant', content: 'No active chats found. Create a new chat to begin.', name: 'System Orchestrator' }]);
      }
    };
    fetchThreads();
  }, [selectedWorkspaceId, supabase]);

  // Fetch Chat History when Thread changes
  useEffect(() => {
    if (!selectedThreadId) return;

    const fetchHistory = async () => {
      setMessages([{ role: 'assistant', content: 'Loading digital twin memory...' }]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;


        const res = await fetch(`${API_URL}/api/tenant-agent/history/${selectedThreadId}`, {
          method: 'GET',
          headers: getImpersonationHeaders({
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          })
        });

        const data = await res.json();

        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([
            { role: 'assistant', content: `Memory loaded. I am ready to assist. What would you like to execute?`, name: 'System Orchestrator' }
          ]);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
        setMessages([
          { role: 'system', content: 'Failed to load chat history.' }
        ]);
      }
    };

    fetchHistory();
  }, [selectedThreadId, supabase]);

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    if (!selectedWorkspaceId) return;
    const { data, error } = await supabase
      .from('agent_execution_logs')
      .select('*')
      .eq('workspace_id', selectedWorkspaceId)
      .order('started_at', { ascending: false })
      .limit(50);

    if (data && !error) {
      setAuditLogs(data);
    }
  }

  // Poll for logs if the panel is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showLogs) {
      fetchAuditLogs();
      interval = setInterval(fetchAuditLogs, 3000);
    }
    return () => clearInterval(interval);
  }, [showLogs, selectedWorkspaceId, supabase]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const runTenantAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    const userMessage = prompt
    setPrompt("")

    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token


      const res = await fetch(`${API_URL}/api/tenant-agent`, {
        method: 'POST',
        headers: getImpersonationHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }),
        body: JSON.stringify({
          query: userMessage,
          workspace_id: selectedWorkspaceId,
          chat_id: selectedThreadId
        })
      })

      const data = await res.json()

      if (Array.isArray(data.result)) {
        const newMsgs = data.result.map((r: any) => ({
          role: 'assistant' as const,
          content: r.content,
          name: r.name || 'Agent'
        }));
        setMessages(prev => [...prev, ...newMsgs]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: typeof data.result === 'string' ? data.result : "Task completed.",
          name: "System"
        }])
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: "Critical Error: Could not reach the execution engine."
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  const createNewChat = async () => {
    if (!selectedWorkspaceId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${API_URL}/api/tenant-agent/chats`, {
        method: 'POST',
        headers: getImpersonationHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }),
        body: JSON.stringify({ workspace_id: selectedWorkspaceId })
      });
      const data = await res.json();
      if (data.chat) {
        setThreads([data.chat, ...threads]);
        setSelectedThreadId(data.chat.id);
      }
    } catch (e) { console.error(e) }
  };

  const deleteChat = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`${API_URL}/api/tenant-agent/chats/${id}`, {
        method: 'DELETE',
        headers: getImpersonationHeaders({ 'Authorization': `Bearer ${session?.access_token}` })
      });
      const newThreads = threads.filter(t => t.id !== id);
      setThreads(newThreads);
      if (selectedThreadId === id) {
        setSelectedThreadId(newThreads.length > 0 ? newThreads[0].id : "");
      }
    } catch (e) { console.error(e) }
  };

  const togglePinChat = async (id: string, currentPinStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`${API_URL}/api/tenant-agent/chats/${id}`, {
        method: 'PATCH',
        headers: getImpersonationHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }),
        body: JSON.stringify({ is_pinned: !currentPinStatus })
      });

      setThreads(prev => {
        const updated = prev.map(t => t.id === id ? { ...t, is_pinned: !currentPinStatus } : t);
        return updated.sort((a, b) => {
          if (a.is_pinned === b.is_pinned) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.is_pinned ? -1 : 1;
        });
      });
    } catch (e) { console.error(e) }
  };

  const saveChatTitle = async (id: string) => {
    if (!editTitle.trim() || editTitle.trim() === threads.find(t => t.id === id)?.title) {
      setEditingChatId(null);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`${API_URL}/api/tenant-agent/chats/${id}`, {
        method: 'PATCH',
        headers: getImpersonationHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }),
        body: JSON.stringify({ title: editTitle.trim() })
      });

      setThreads(prev => prev.map(t => t.id === id ? { ...t, title: editTitle.trim() } : t));
      setEditingChatId(null);
      setEditTitle("");
    } catch (e) { console.error(e) }
  };

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 w-full overflow-hidden">

      {/* Threads Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800">
          <label className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2 block">Active Workspace</label>
          <select
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
          >
            {workspaces.length === 0 ? (
              <option value="" disabled>No workspaces</option>
            ) : (
              workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))
            )}
          </select>

          <Button
            onClick={createNewChat}
            disabled={!selectedWorkspaceId}
            className="w-full mt-4 bg-zinc-100 text-zinc-900 hover:bg-white flex items-center gap-2 font-medium"
            size="sm"
          >
            <Plus size={16} /> New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {threads.length === 0 ? (
            <div className="text-xs text-zinc-600 text-center mt-4">No active chats</div>
          ) : (
            threads.map(thread => (
              <div
                key={thread.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group transition-colors ${selectedThreadId === thread.id ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'}`}
                onClick={() => setSelectedThreadId(thread.id)}
              >
                <div className="flex items-center gap-3 truncate">
                  <MessageSquare size={14} className={selectedThreadId === thread.id ? 'text-blue-400 shrink-0' : 'text-zinc-500 shrink-0'} />
                  {editingChatId === thread.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveChatTitle(thread.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveChatTitle(thread.id); if (e.key === 'Escape') setEditingChatId(null); }}
                      className="bg-zinc-900 text-sm text-white px-1 py-0.5 rounded border border-blue-500/50 outline-none w-32"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm truncate">{thread.title}</span>
                  )}
                </div>
                <div className={`${thread.is_pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} flex items-center gap-1 shrink-0`}>
                  <button
                    title={thread.is_pinned ? "Unpin Chat" : "Pin Chat"}
                    onClick={(e) => { e.stopPropagation(); togglePinChat(thread.id, thread.is_pinned); }}
                    className={`p-1 transition-colors ${thread.is_pinned ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Pin size={14} className={thread.is_pinned ? "fill-emerald-400/20" : ""} />
                  </button>
                  <button
                    title="Rename Chat"
                    onClick={(e) => { e.stopPropagation(); setEditTitle(thread.title); setEditingChatId(thread.id); }}
                    className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    title="Delete Chat"
                    onClick={(e) => { e.stopPropagation(); deleteChat(thread.id); }}
                    className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-medium text-zinc-200">{threads.find(t => t.id === selectedThreadId)?.title || "Select a Chat"}</span>
          </div>
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
              className={`text-xs ${showLogs ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <TerminalSquare size={14} className="mr-2" />
              Audit Logs
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <main className={`flex-1 flex overflow-hidden transition-all duration-300`}>
          <div className={`flex-1 flex flex-col relative`}>
            <div className={`flex-1 overflow-y-auto p-6 scroll-smooth ${showLogs ? 'mr-96' : ''}`}>
              <div className="max-w-4xl mx-auto space-y-8 pb-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-sm
                  ${msg.role === 'user' ? 'bg-blue-600 text-white' :
                          msg.role === 'system' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 border border-zinc-700 text-emerald-400'}`}
                      >
                        {msg.role === 'user' ? <User size={18} /> :
                          msg.role === 'system' ? <AlertCircle size={18} /> : <Bot size={18} />}
                      </div>

                      {/* Message Bubble */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        {/* Agent Name Badge */}
                        {msg.name && msg.role === 'assistant' && (
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">
                            {msg.name.replace(/_/g, ' ')}
                          </span>
                        )}

                        <div className={`p-4 shadow-sm text-sm leading-relaxed
                    ${msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                            : msg.role === 'system'
                              ? 'bg-red-950/30 text-red-200 border border-red-900/50 rounded-2xl rounded-tl-sm'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="flex gap-4 max-w-[85%]">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 flex items-center justify-center shrink-0 mt-1">
                        <Bot size={18} />
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm p-4 flex items-center h-[52px]">
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                          <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Audit Logs Sidebar - absolute to stick over chat on right side */}
        <div className="absolute right-0 top-0 h-full">
          <AuditLogsSidebar
            showLogs={showLogs}
            setShowLogs={setShowLogs}
            auditLogs={auditLogs}
          />
        </div>

        {/* Input Area */}
        <footer className={`p-6 bg-zinc-950 border-t border-zinc-800 shrink-0 transition-all duration-300 ${showLogs ? 'mr-96' : ''}`}>
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={runTenantAgent} className="flex relative items-center">
              <Input
                placeholder="Assign a task to your digital workforce..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isProcessing || !selectedThreadId}
                className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-14 py-6 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:opacity-50 text-base shadow-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!prompt.trim() || isProcessing || !selectedThreadId}
                className="absolute right-2 h-10 w-10 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Send size={18} className={prompt.trim() && !isProcessing ? 'ml-1' : ''} />
              </Button>
            </form>
            <div className="text-center mt-3">
              <span className="text-[10px] text-zinc-600 font-medium">Tessera OS Execution Engine</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}