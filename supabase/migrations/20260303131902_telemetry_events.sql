CREATE TABLE IF NOT EXISTS public.telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    url TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_element TEXT,
    context_data TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

-- Allow users to insert events for their own tenant
DROP POLICY IF EXISTS "Users can insert telemetry events for their tenant" ON public.telemetry_events;
CREATE POLICY "Users can insert telemetry events for their tenant" ON public.telemetry_events
    FOR INSERT 
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    );

-- Allow users to view events for their own tenant
DROP POLICY IF EXISTS "Users can view telemetry events for their tenant" ON public.telemetry_events;
CREATE POLICY "Users can view telemetry events for their tenant" ON public.telemetry_events
    FOR SELECT 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    );
