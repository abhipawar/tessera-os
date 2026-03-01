'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@supabase/ssr'
import { Bot, User, AlertCircle, Send, TerminalSquare } from 'lucide-react'
import AuditLogsSidebar from '@/components/chat/AuditLogsSidebar'

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

  // Chat Selection State
  const [chats, setChats] = useState<{ id: string, name: string }[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string>("")

  // Audit Logs State
  const [showLogs, setShowLogs] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch saved Chats on load
  useEffect(() => {
    const fetchChats = async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .order('updated_at', { ascending: false })

      if (data && data.length > 0) {
        setChats(data)
        setSelectedChatId(data[0].id)
      }
    }
    fetchChats()
  }, [supabase])

  // Fetch Chat History when Chat changes
  useEffect(() => {
    if (!selectedChatId) return;

    const fetchHistory = async () => {
      setMessages([{ role: 'assistant', content: 'Loading digital twin memory...' }]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/api/tenant-agent/history/${selectedChatId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
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
  }, [selectedChatId, supabase]);

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    if (!selectedChatId) return;
    const { data, error } = await supabase
      .from('agent_execution_logs')
      .select('*')
      .eq('workspace_id', selectedChatId)
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
  }, [showLogs, selectedChatId, supabase]);

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

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/tenant-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: userMessage,
          workspace_id: selectedChatId
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

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 w-full overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center px-6 shrink-0 z-10">
        <div className="flex items-center gap-6">
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
          <div className="h-6 w-px bg-zinc-800"></div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Active Workspace:</label>
            <select
              value={selectedChatId}
              onChange={(e) => setSelectedChatId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
            >
              {chats.length === 0 ? (
                <option value="" disabled>No chats found</option>
              ) : (
                chats.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))
              )}
            </select>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat Area */}
        <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${showLogs ? 'mr-96' : ''}`}>
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
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
        </main>

        {/* Audit Logs Sidebar */}
        <AuditLogsSidebar
          showLogs={showLogs}
          setShowLogs={setShowLogs}
          auditLogs={auditLogs}
        />
      </div>

      {/* Input Area */}
      <footer className="p-6 bg-zinc-950 border-t border-zinc-800 shrink-0">
        <div className="max-w-4xl mx-auto relative">
          <form onSubmit={runTenantAgent} className="flex relative items-center">
            <Input
              placeholder="Assign a task to your digital workforce..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing || !selectedChatId}
              className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl pr-14 py-6 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:opacity-50 text-base"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!prompt.trim() || isProcessing || !selectedChatId}
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
  )
}