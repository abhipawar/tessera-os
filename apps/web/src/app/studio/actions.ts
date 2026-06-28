'use server'

import { createClient, createAdminClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function saveWorkspaceAction(payload: {
    currentChartId: string | null;
    chartName: string;
    nodesJson: string;
    edgesJson: string;
    activeUserNode: string | null;
}) {
    try {
        const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
        return { error: 'Not authenticated or session expired.' }
    }

    if (payload.activeUserNode && payload.activeUserNode !== 'supervisor') {
        return { error: 'Security Lock: Only the Top Supervisor can save structural changes.' }
    }

    const adminDb = await createAdminClient()
    const cookieStore = await cookies();
    const impersonatedTenant = cookieStore.get('tessera_impersonated_tenant')?.value;
    const impersonatedUserId = cookieStore.get('tessera_impersonated_user')?.value;

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_tessera_admin')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.is_tessera_admin || false;

    let tenantId = null;

    if (isSuperAdmin && impersonatedTenant) {
        tenantId = impersonatedTenant;
    } else {
        const { data: tenantData, error: tenantError } = await adminDb
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', user.id)
            .limit(1)

        if (tenantError || !tenantData || tenantData.length === 0) {
            console.error("DEBUG server action tenant fetch error:", tenantError)
            return { error: 'Authentication Error: Could not determine your tenant via the server.' }
        }
        tenantId = tenantData[0].tenant_id;
    }

    // Server-side graph validation warning
    let warningMsg: string | null = null;
    try {
        const parsedNodes = JSON.parse(payload.nodesJson) || [];
        const hasSupervisor = parsedNodes.some((n: any) => n.id === 'supervisor');

        // Count how many actual AI nodes are present (excluding start/end/conditional/triggers)
        const agentNodeCount = parsedNodes.filter((n: any) =>
            !['startNode', 'endNode', 'triggerNode', 'conditionalNode'].includes(n.type)
        ).length;

        if (agentNodeCount > 1 && !hasSupervisor) {
            warningMsg = "Warning: Multi-agent workflows typically require a 'Supervisor Co-pilot' to orchestrate execution correctly. Your workflow might not route appropriately.";
        }
    } catch (e) {
        console.error("DEBUG: Failed to parse nodes for validation", e);
    }

    const parsedNodesForDb = JSON.parse(payload.nodesJson);
    const parsedEdgesForDb = JSON.parse(payload.edgesJson);

    if (payload.currentChartId) {
        const { error } = await adminDb
            .from('workspaces')
            .update({
                name: payload.chartName,
                nodes: parsedNodesForDb,
                edges: parsedEdgesForDb,
                updated_at: new Date().toISOString()
            })
            .eq('id', payload.currentChartId)
            .eq('tenant_id', tenantId)

        if (error) return { error: error.message }
        return { success: true, newChartId: payload.currentChartId, warning: warningMsg }
    } else {
        const { data, error } = await adminDb
            .from('workspaces')
            .insert({
                name: payload.chartName,
                tenant_id: tenantId,
                nodes: parsedNodesForDb,
                edges: parsedEdgesForDb
            })
            .select()

        if (error) return { error: error.message }
        if (data && data.length > 0) {
            const newId = data[0].id

            await adminDb.from('workspace_members').insert({
                workspace_id: newId,
                user_id: (isSuperAdmin && impersonatedUserId) ? impersonatedUserId : user.id,
                assigned_node_id: 'supervisor',
                role_id: null
            })
            return { success: true, newChartId: newId, warning: warningMsg }
        }
        return { error: 'Failed to create new workspace context in the central database.' }
    }
    } catch (e: any) {
        console.error("CRITICAL EXCEPTION IN saveWorkspaceAction SERVER ACTION:", e);
        return { error: `Server exception: ${e.message || String(e)}` };
    }
}

export async function deleteWorkspaceAction(workspace_id: string) {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
        return { error: 'Not authenticated or session expired.' }
    }

    const adminDb = await createAdminClient()
    const cookieStore = await cookies();
    const impersonatedTenant = cookieStore.get('tessera_impersonated_tenant')?.value;

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_tessera_admin')
        .eq('id', user.id)
        .single();

    const isSuperAdmin = profile?.is_tessera_admin || false;

    let tenantId = null;

    if (isSuperAdmin && impersonatedTenant) {
        tenantId = impersonatedTenant;
    } else {
        const { data: tenantData, error: tenantError } = await adminDb
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', user.id)
            .limit(1)

        if (tenantError || !tenantData || tenantData.length === 0) {
            return { error: 'Authentication Error: Could not determine your tenant.' }
        }
        tenantId = tenantData[0].tenant_id;
    }

    const { error } = await adminDb
        .from('workspaces')
        .delete()
        .eq('id', workspace_id)
        .eq('tenant_id', tenantId)

    if (error) return { error: error.message }
    return { success: true }
}
