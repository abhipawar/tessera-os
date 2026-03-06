-- ==========================================
-- Prefix Email Routing Migration 
-- Updates the default workspace trigger to use 'ws-[uuid]' as the semantic prefix
-- to match the new 'agent_*@tesseraos.ai' format.
-- ==========================================

-- 1. Replace the existing trigger function
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
        -- Assign 'ws-' instead of 'agent-' to prevent redundant formatting
        -- New format will look like: agent_ws-123e4567@tesseraos.ai
        default_prefix := 'ws-' || substr(NEW.id::text, 1, 8);
        
        -- Upsert the default route ensuring no duplicates
        INSERT INTO public.inbound_email_routes (workspace_id, node_id, semantic_email_prefix)
        VALUES (NEW.id, 'supervisor', default_prefix) 
        ON CONFLICT (semantic_email_prefix) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;
