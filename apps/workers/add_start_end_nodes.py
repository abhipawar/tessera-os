import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
c = create_client(url, key)

print("Fetching global workspace templates...")
res = c.table('global_workspace_templates').select('id, name, graph_json').execute()

updated_count = 0

for t in res.data:
    gj = t['graph_json']
    if not gj:
        continue
    
    if isinstance(gj, str):
        try:
            gj = json.loads(gj)
        except:
            continue
            
    nodes = gj.get('nodes', [])
    edges = gj.get('edges', [])
    
    # Check if startNode or endNode already exist
    has_start = any(n.get('type') == 'startNode' for n in nodes)
    has_end = any(n.get('type') == 'endNode' for n in nodes)
    
    if has_start and has_end:
        print(f"Template '{t['name']}' already has start and end nodes. Skipping.")
        continue
        
    print(f"Updating template '{t['name']}'...")
    
    # Find min_y and max_y to place the nodes nicely
    y_coords = [n.get('position', {}).get('y', 0) for n in nodes]
    min_y = min(y_coords) if y_coords else 0
    max_y = max(y_coords) if y_coords else 0
    
    if not has_start:
        start_node = {
            "id": f"start_{os.urandom(4).hex()}",
            "type": "startNode",
            "position": {"x": 250, "y": min_y - 150},
            "data": {"label": "Start"}
        }
        nodes.append(start_node)
        
    if not has_end:
        end_node = {
            "id": f"end_{os.urandom(4).hex()}",
            "type": "endNode",
            "position": {"x": 250, "y": max_y + 150},
            "data": {"label": "End"}
        }
        nodes.append(end_node)
        
    # Update back to the dictionary
    gj['nodes'] = nodes
    
    # Update Supabase
    c.table('global_workspace_templates').update({'graph_json': gj}).eq('id', t['id']).execute()
    updated_count += 1
    print(f"  -> Added Start/End nodes to '{t['name']}'.")

print(f"Done. Updated {updated_count} templates.")
