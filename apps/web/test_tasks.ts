import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await supabase
        .from('agent_tasks')
        .select('*, workspaces(name)')
        .eq('status', 'pending_approval')
        .order('created_at', { ascending: false });

    console.log('Result:', data, 'Error:', error);
}
check();
