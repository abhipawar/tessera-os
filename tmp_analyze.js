const fs = require('fs');
const data = JSON.parse(fs.readFileSync('tmp_templates.json', 'utf8'));

const analysis = data.map(d => {
    let g;
    try {
        g = typeof d.graph_json === 'string' ? JSON.parse(d.graph_json) : (d.graph_json || { nodes: [], edges: [] });
    } catch (e) { g = { nodes: [], edges: [] }; }

    const nodes = g.nodes || [];
    const edges = g.edges || [];
    return `=== ${d.name} ===\nDesc: ${d.description}\nNodes: ${nodes.length} | Edges: ${edges.length}\nTypes: ${[...new Set(nodes.map(n => n.type))].join(', ')}\nAgent Labels: ${nodes.filter(n => n.type === 'customAgent' || n.type === 'agent').map(n => n.data?.label).join(', ')}`;
});

fs.writeFileSync('clean_analysis.txt', analysis.join('\n\n'), 'utf8');
