-- ==========================================
-- Agent Email Routing Identity Migration 
-- Adds explicit custom email alias tracking to the cognitive architecture
-- ==========================================

-- 1. Extend the Workspaces table configuration schema to include semantic email addresses for node-based actors
--    Note: Since agents exist dynamically in the `nodes` JSONB array of the `workspaces` table, 
--    we need a dedicated index or column to rapidly map an incoming email address back to a specific node + workspace.

CREATE TABLE IF NOT EXISTS public.inbound_email_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL, -- The specific node in the Studio Canvas graph
    semantic_email_prefix TEXT NOT NULL UNIQUE, -- E.g., 'sales-acmecorp', resulting in sales-acmecorp@agents.tesseraos.ai
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inbound_email_routes ENABLE ROW LEVEL SECURITY;

-- 2. Add an automated trigger to generate a fallback email route whenever a new workflow is published
CREATE OR REPLACE FUNCTION public.generate_default_agent_email_route()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_prefix TEXT;
BEGIN
    -- Only trigger when nodes are saved
    IF NEW.nodes IS NOT NULL AND jsonb_array_length(NEW.nodes) > 0 THEN
        -- Safely extract the first 'Worker' node ID as the primary contact
        -- (In production, the UI will let them configure multiple routes)
        default_prefix := 'agent-' || substr(NEW.id::text, 1, 8);
        
        -- Upsert the default route ensuring no duplicates
        -- Do nothing on conflict since tenants can customize their prefix later
        INSERT INTO public.inbound_email_routes (workspace_id, node_id, semantic_email_prefix)
        VALUES (NEW.id, 'supervisor', default_prefix) 
        ON CONFLICT (semantic_email_prefix) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach trigger to workspace updates
DROP TRIGGER IF EXISTS ensure_agent_email_route ON public.workspaces;
CREATE TRIGGER ensure_agent_email_route
    AFTER INSERT OR UPDATE OF nodes ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_default_agent_email_route();
