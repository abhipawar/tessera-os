-- Migration: Create Inbound Email Triggers Table

CREATE TABLE IF NOT EXISTS public.inbound_email_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email_slug VARCHAR(255) NOT NULL, -- e.g., 'sales', 'support'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure a single email address (like support@) isn't registered to multiple different graph execution starting points within the system.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email_slug ON public.inbound_email_triggers(email_slug) WHERE is_active = true;

-- RLS
ALTER TABLE public.inbound_email_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage email triggers in their tenant" ON public.inbound_email_triggers;
CREATE POLICY "Users can manage email triggers in their tenant" ON public.inbound_email_triggers
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    ));
