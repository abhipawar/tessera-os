import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Resend Inbound Webhook Payload Example:
 * {
 *   "from": "alice@example.com",
 *   "to": "support@tesseraos.ai",
 *   "subject": "Help with my account",
 *   "text": "I can't login.",
 *   "html": "<p>I can't login.</p>"
 * }
 */

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // 1. Extract the specific inbox address the email was sent to
        // If Resend sends multiple 'to' addresses, default to the first
        let toAddress = payload.to;
        if (Array.isArray(toAddress)) toAddress = toAddress[0];

        // Extract the slug: "support@tesseraos.ai" -> "support"
        const emailSlug = toAddress.split('@')[0].toLowerCase().trim();

        // 2. Identify the mapped Workspace
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! // Need service role to bypass RLS in a webhook
        );

        const { data: triggerMap, error: mapErr } = await supabase
            .from('inbound_email_triggers')
            .select('workspace_id, tenant_id')
            .eq('email_slug', emailSlug)
            .eq('is_active', true)
            .single();

        if (mapErr || !triggerMap) {
            console.error(`[Inbound Email Webhook] Unmapped email slug '${emailSlug}'. Ignoring.`);
            return NextResponse.json({ success: false, reason: "Unmapped or inactive slug." }, { status: 404 });
        }

        // 3. Structure the Trigger Payload for the Graph Engine
        // This simulates a standard UI-triggered event, but passes the email details instead
        const targetWorkspaceId = triggerMap.workspace_id;
        const triggerPayload = {
            "source": "email_webhook",
            "from": payload.from,
            "subject": payload.subject,
            "body": payload.text || payload.html || "(No Content)"
        };

        // 4. Dispatch the Graph Execution background job
        // We ping our own internal Railway/Worker execution endpoint
        const engineUrl = process.env.API_URL || "http://localhost:8000";
        const dispatchRes = await fetch(`${engineUrl}/api/graphs/${targetWorkspaceId}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initial_state: {
                    trigger_payload: triggerPayload
                }
            })
        });

        if (!dispatchRes.ok) {
            console.error(`[Inbound Email Webhook] Graph engine failed to boot. Status: ${dispatchRes.status}`);
            return NextResponse.json({ success: false, reason: "Graph computation rejection." }, { status: 500 });
        }

        return NextResponse.json({ success: true, dispatched: true });

    } catch (e: any) {
        console.error("[Inbound Email Webhook Error]", e.message);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
