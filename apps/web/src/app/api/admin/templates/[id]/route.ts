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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = await assertAdmin();
        if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

        const body = await request.json();
        const id = params.id;

        const payload = {
            name: body.name,
            description: body.description,
            target_audience: body.target_audience,
            icon: body.icon,
            is_active: body.is_active
        };

        const supabase = auth.supabase;
        if (!supabase) return NextResponse.json({ success: false, error: 'Supabase client error' }, { status: 500 });

        const { data, error } = await supabase
            .from('global_workspace_templates')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, template: data });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = await assertAdmin();
        if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

        const id = params.id;
        const supabase = auth.supabase;
        if (!supabase) return NextResponse.json({ success: false, error: 'Supabase client error' }, { status: 500 });

        const { error } = await supabase
            .from('global_workspace_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
