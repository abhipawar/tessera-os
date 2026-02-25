'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createBrowserClient } from '@supabase/ssr'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  name?: string // Added this so we can eventually show which agent is speaking!
}

export default function WorkspaceDashboard() {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your secure Tenant AI. Select a workspace above, and let me know how I can help you today!' }
  ])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Workspace Selection State
  const [workspaces, setWorkspaces] = useState<{id: string, name: string}[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch saved Workspaces on load
  useEffect(() => {
    const fetchWorkspaces = async () => {
      const { data, error } = await supabase
        .from('tenant_org_charts')
        .select('id, name')
        .order('updated_at', { ascending: false })
      
      if (data && data.length > 0) {
        setWorkspaces(data)
        setSelectedWorkspaceId(data[0].id) // Auto-select the most recent one
      }
    }
    fetchWorkspaces()
  }, [supabase])

  // --- NEW: Fetch Chat History when Workspace changes ---
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    const fetchHistory = async () => {
      // Show a quick loading message while we grab the memory
      setMessages([{ role: 'assistant', content: 'Loading workspace memory...' }]);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/api/tenant-agent/history/${selectedWorkspaceId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await res.json();
        
        if (data.messages && data.messages.length > 0) {
          // If the backend has history, inject it!
          setMessages(data.messages);
        } else {
          // If this is a brand new chat, show the default welcome
          setMessages([
            { role: 'assistant', content: `Hello! I am your secure Tenant AI. You are now connected to the workspace. Let me know how I can help you today!` }
          ]);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
        setMessages([
          { role: 'system', content: 'Failed to load workspace history.' }
        ]);
      }
    };

    fetchHistory();
  }, [selectedWorkspaceId, supabase]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const runTenantAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    const userMessage = prompt
    setPrompt("") // Clear input field immediately
    
    // Add user message to UI
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
          workspace_id: selectedWorkspaceId
        })
      })
      
      const data = await res.json()
      
      // Add the AI's actual text response to the UI
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.result || "Error: No result returned." 
      }])
      
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
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 w-full">
      {/* Header */}
      <header className="p-6 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Workspace</h1>
          <p className="text-sm text-zinc-400">Secure AI Environment</p>
        </div>
        
        {/* Workspace Selector UI */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400 font-medium">Active Team:</label>
          <select 
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
          >
            {workspaces.length === 0 ? (
              <option value="" disabled>No workspaces found</option>
            ) : (
              workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))
            )}
          </select>
        </div>
      </header>

      {/* Chat History Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : msg.role === 'system'
                    ? 'bg-red-900/50 text-red-200 border border-red-800'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex space-x-2 items-center">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-6 bg-zinc-950 border-t border-zinc-800 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={runTenantAgent} className="flex space-x-4">
            <Input 
              placeholder="Ask a question or request database records..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing || !selectedWorkspaceId}
              className="flex-1 border-zinc-700 bg-zinc-900 text-white focus-visible:ring-blue-500 disabled:opacity-50"
            />
            <Button 
              type="submit" 
              disabled={!prompt.trim() || isProcessing || !selectedWorkspaceId} 
              className="bg-blue-600 text-white hover:bg-blue-700 px-8 disabled:opacity-50"
            >
              Send
            </Button>
          </form>
        </div>
      </footer>
    </div>
  )
}