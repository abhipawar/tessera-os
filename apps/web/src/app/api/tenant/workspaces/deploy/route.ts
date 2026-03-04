import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { templateId } = body;

        if (!templateId) {
            return NextResponse.json({ success: false, error: 'Missing templateId' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                    set(name: string, value: string, options: CookieOptions) { try { cookieStore.set({ name, value, ...options }); } catch (error) { } },
                    remove(name: string, options: CookieOptions) { try { cookieStore.set({ name, value: '', ...options }); } catch (error) { } }
                }
            }
        );

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const userId = session.user.id;

        // 1. Resolve their Tenant ID
        const { data: memberData, error: memberErr } = await supabase
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (memberErr || !memberData) {
            return NextResponse.json({ success: false, error: 'User is not part of a tenant' }, { status: 403 });
        }
        const tenantId = memberData.tenant_id;

        // 2. Fetch the requested Global Template payload
        const { data: template, error: templateErr } = await supabase
            .from('global_workspace_templates')
            .select('name, graph_json')
            .eq('id', templateId)
            .single();

        if (templateErr || !template) {
            return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
        }

        const graphPayload = template.graph_json || { nodes: [], edges: [] };
        const newWorkspaceName = `${template.name} [Cloned]`;

        // 3. Create the new Workspace carrying the massive graph_json
        const { data: newWs, error: newWsErr } = await supabase
            .from('workspaces')
            .insert({
                tenant_id: tenantId,
                name: newWorkspaceName,
                nodes: graphPayload.nodes || [],
                edges: graphPayload.edges || []
            })
            .select('id')
            .single();

        if (newWsErr) throw newWsErr;

        // 4. Assign the user as an Admin of the new workspace so they can immediately see it
        const { data: roleData } = await supabase.from('workspace_roles').select('id').eq('slug', 'tenant_admin').single();
        if (roleData) {
            // Find the first agent node to make them the human owner
            let firstAgentId = null;
            if (graphPayload.nodes && Array.isArray(graphPayload.nodes) && graphPayload.nodes.length > 0) {
                firstAgentId = graphPayload.nodes[0].id;
            }

            await supabase.from('workspace_members').insert({
                workspace_id: newWs.id,
                user_id: userId,
                role_id: roleData.id,
                assigned_node_id: firstAgentId
            });
        }

        // 5. Return the new UUID so the React frontend can automatically navigate there
        return NextResponse.json({ success: true, workspaceId: newWs.id });

    } catch (err: any) {
        console.error("Workspace Deployment Error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
