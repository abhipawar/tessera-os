const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deploySchema() {
    console.log('Deploying chats schema via REST RPC...');

    const query = `
    CREATE TABLE IF NOT EXISTS public.chats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      is_pinned BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view their own workspace chats" ON public.chats;
    CREATE POLICY "Users can view their own workspace chats" ON public.chats
      FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert their own workspace chats" ON public.chats;
    CREATE POLICY "Users can insert their own workspace chats" ON public.chats
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own workspace chats" ON public.chats;
    CREATE POLICY "Users can update their own workspace chats" ON public.chats
      FOR UPDATE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can delete their own workspace chats" ON public.chats;
    CREATE POLICY "Users can delete their own workspace chats" ON public.chats
      FOR DELETE USING (auth.uid() = user_id);
  `;

    // NOTE: The Supabase JS client doesn't support raw SQL queries. 
    console.log("WAIT. Supabase JS doesn't do raw SQL.");
}

deploySchema();
