-- Migration: create_agent_communications
-- Description: Creates a table to log inbound and outbound email interactions for autonomous agents.

CREATE TABLE IF NOT EXISTS public.agent_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster retrieval in the UI (/inbox)
CREATE INDEX IF NOT EXISTS idx_agent_communications_workspace_id ON public.agent_communications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_communications_created_at ON public.agent_communications(created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_communications ENABLE ROW LEVEL SECURITY;
