'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminDashboard() {
  const [workerStatus, setWorkerStatus] = useState<string>("Waiting for ping...")
  const [prompt, setPrompt] = useState("")
  const [graphResult, setGraphResult] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const pingWorkers = async () => {
    try {
      // To this dynamic environment variable:
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/health`)
      const data = await res.json()
      setWorkerStatus(data.message)
    } catch (error) {
      setWorkerStatus("Critical Error: Cannot reach Python workers.")
    }
  }

  const runAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setGraphResult("Graph executing...")

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/agent`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: prompt })
      })
      const data = await res.json()
      
      // We are formatting the JSON state payload from LangGraph so it looks clean
      setGraphResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setGraphResult("Failed to execute graph workflow.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-10 text-white bg-zinc-950 min-h-screen space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tessera Control Plane</h1>
      <p className="text-zinc-400">System Architecture & Worker Management</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        
        {/* System Health Card */}
        <div className="p-6 border border-zinc-800 rounded-lg bg-zinc-900 flex flex-col justify-between">
          <div>
            <h2 className="text-xl mb-4 font-semibold">Execution Engine Status</h2>
            <p className="text-sm text-zinc-400 mb-6">Verify the CORS bridge between Next.js and FastAPI.</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={pingWorkers} variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
              Ping Worker
            </Button>
            <span className={`text-sm ${workerStatus.includes("successful") ? "text-emerald-400" : "text-zinc-500"}`}>
              {workerStatus}
            </span>
          </div>
        </div>

        {/* LangGraph Interface Card */}
        <div className="p-6 border border-zinc-800 rounded-lg bg-zinc-900">
          <h2 className="text-xl mb-4 font-semibold">Test Agent Workflow</h2>
          <form onSubmit={runAgent} className="space-y-4">
            <Input 
              placeholder="Enter a task for the graph..." 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="border-zinc-800 bg-zinc-950 text-white"
            />
            <Button type="submit" disabled={!prompt || isProcessing} className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
              {isProcessing ? "Executing..." : "Run LangGraph"}
            </Button>
          </form>
          
          {graphResult && (
            <pre className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded text-xs text-emerald-400 overflow-x-auto">
              {graphResult}
            </pre>
          )}
        </div>

      </div>
    </div>
  )
}