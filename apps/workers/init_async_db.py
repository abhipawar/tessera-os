import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DB_URI = os.environ.get("DATABASE_URL")

query = """
CREATE TABLE IF NOT EXISTS public.workspace_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cron', 'webhook')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('pending_approval', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.workspace_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies can be expanded later. For now, we will allow service role to bypass.
DROP POLICY IF EXISTS "Allow all for triggers" ON public.workspace_triggers;
CREATE POLICY "Allow all for triggers" ON public.workspace_triggers FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for tasks" ON public.agent_tasks;
CREATE POLICY "Allow all for tasks" ON public.agent_tasks FOR ALL USING (true);
"""

if __name__ == "__main__":
    if not DB_URI:
        print("DATABASE_URL not found!")
        exit(1)
        
    print("Executing Async & HITL Schema Migration...")
    try:
        with psycopg.connect(DB_URI) as conn:
            with conn.cursor() as cur:
                cur.execute(query)
            conn.commit()
        print("Successfully created 'workspace_triggers' and 'agent_tasks'.")
    except Exception as e:
        print(f"Error bootstrapping schema: {e}")
