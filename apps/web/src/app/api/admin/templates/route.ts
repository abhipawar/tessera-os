import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper to assert admin privileges
async function assertAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Unauthorized', status: 401 };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_tessera_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_tessera_admin) {
        return { error: 'Forbidden: Admins only', status: 403 };
    }

    return { supabase, user };
}

export async function GET(request: NextRequest) {
    try {
        const auth = await assertAdmin();
        if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

        const supabase = auth.supabase;
        const { data, error } = await supabase
            .from('global_workspace_templates')
            .select('id, name, description, target_audience, icon, prerequisite_tools, is_active, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, templates: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await assertAdmin();
        if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

        const body = await request.json();

        // Ensure defaults for required fields
        const payload = {
            name: body.name || "New Template",
            description: body.description || "",
            target_audience: body.target_audience || "Everyone",
            icon: body.icon || "Server",
            prerequisite_tools: body.prerequisite_tools || [],
            graph_json: body.graph_json || { nodes: [], edges: [] },
            is_active: body.is_active ?? true
        };

        const supabase = auth.supabase;
        const { data, error } = await supabase
            .from('global_workspace_templates')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, template: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
