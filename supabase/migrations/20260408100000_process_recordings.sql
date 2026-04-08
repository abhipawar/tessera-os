-- 1. Create Process Recordings Table
CREATE TABLE IF NOT EXISTS public.process_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT DEFAULT 'Untitled Recording',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'recording', -- 'recording', 'completed', 'summarized', 'failed'
    llm_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Recording Events Table
CREATE TABLE IF NOT EXISTS public.recording_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES public.process_recordings(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL, -- 'click', 'input', 'navigate'
    url TEXT NOT NULL,
    xpath_selector TEXT,
    value TEXT, -- For input events or text extraction
    client_x INTEGER,
    client_y INTEGER,
    screenshot_path TEXT, -- Reference to the storage bucket path
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.process_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recording_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Process Recordings
DROP POLICY IF EXISTS "Users can insert their own recordings" ON public.process_recordings;
CREATE POLICY "Users can insert their own recordings" ON public.process_recordings
    FOR INSERT 
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view their tenant's recordings" ON public.process_recordings;
CREATE POLICY "Users can view their tenant's recordings" ON public.process_recordings
    FOR SELECT 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their tenant's recordings" ON public.process_recordings;
CREATE POLICY "Users can update their tenant's recordings" ON public.process_recordings
    FOR UPDATE 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their tenant's recordings" ON public.process_recordings;
CREATE POLICY "Users can delete their tenant's recordings" ON public.process_recordings
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
    );

-- 5. RLS Policies for Recording Events
DROP POLICY IF EXISTS "Users can insert events for their tenant's recordings" ON public.recording_events;
CREATE POLICY "Users can insert events for their tenant's recordings" ON public.recording_events
    FOR INSERT 
    WITH CHECK (
        recording_id IN (
            SELECT id FROM public.process_recordings WHERE tenant_id IN (
                SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can view events for their tenant's recordings" ON public.recording_events;
CREATE POLICY "Users can view events for their tenant's recordings" ON public.recording_events
    FOR SELECT 
    USING (
        recording_id IN (
            SELECT id FROM public.process_recordings WHERE tenant_id IN (
                SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
            )
        )
    );

-- 6. Setup Screenshots Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('process_screenshots', 'process_screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload screenshots
DROP POLICY IF EXISTS "Users can upload screenshots" ON storage.objects;
CREATE POLICY "Users can upload screenshots" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'process_screenshots');

-- Allow users to view screenshots
DROP POLICY IF EXISTS "Users can view screenshots" ON storage.objects;
CREATE POLICY "Users can view screenshots" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'process_screenshots');
