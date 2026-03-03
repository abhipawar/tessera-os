import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load matching envs for NextJS
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: workspaces, error } = await supabase.from('workspaces').select('id, nodes, edges');
    if (error) {
        console.error("Error fetching workspaces:", error);
        return;
    }

    for (const ws of workspaces) {
        let changed = false;
        let nodes = typeof ws.nodes === 'string' ? JSON.parse(ws.nodes) : ws.nodes;
        let edges = typeof ws.edges === 'string' ? JSON.parse(ws.edges || '[]') : (ws.edges || []);
        if (!nodes) continue;

        const hasStart = nodes.some((n: any) => ['startNode', 'triggerNode'].includes(n.type));
        const hasEnd = nodes.some((n: any) => n.type === 'endNode');

        let startId = '';

        if (!hasStart) {
            startId = `startNode_${Date.now()}_${Math.floor(Math.random() * 100)}`;
            nodes.unshift({
                id: startId,
                type: 'startNode',
                position: { x: 0, y: 0 },
                data: { label: 'Start Entry', description: 'Pipeline starting point' }
            });
            changed = true;

            // Connect to first reasonable target
            if (nodes.length > 1) {
                let firstTarget = null;
                const targets = new Set(edges.map((e: any) => e.target));
                for (const n of nodes) {
                    if (n.id !== startId && !targets.has(n.id)) {
                        firstTarget = n.id;
                        break;
                    }
                }
                if (!firstTarget) firstTarget = nodes[1].id;

                edges.push({
                    id: `reactflow__edge-${startId}-${firstTarget}`,
                    source: startId,
                    target: firstTarget,
                    sourceHandle: null,
                    targetHandle: null
                });
            }
        } else {
            const startNode = nodes.find((n: any) => ['startNode', 'triggerNode'].includes(n.type));
            if (startNode) startId = startNode.id;
        }

        if (!hasEnd) {
            const endId = `endNode_${Date.now()}_${Math.floor(Math.random() * 100)}`;
            nodes.push({
                id: endId,
                type: 'endNode',
                position: { x: 800, y: 0 },
                data: { label: 'End Terminal', description: 'Pipeline ending point' }
            });
            changed = true;

            const sources = new Set(edges.map((e: any) => e.source));
            for (const n of nodes) {
                if (!sources.has(n.id) && n.id !== endId && n.id !== startId && n.type !== 'endNode') {
                    edges.push({
                        id: `reactflow__edge-${n.id}-${endId}`,
                        source: n.id,
                        target: endId,
                        sourceHandle: null,
                        targetHandle: null
                    });
                }
            }
        }

        if (changed) {
            const { error: updateError } = await supabase.from('workspaces').update({
                nodes: JSON.stringify(nodes),
                edges: JSON.stringify(edges)
            }).eq('id', ws.id);

            if (updateError) console.error(`Error updating ws ${ws.id}:`, updateError);
            else console.log(`Successfully migrated workspace ${ws.id}`);
        }
    }
}

run().then(() => console.log('Done migrating workspaces!')).catch(console.error);
