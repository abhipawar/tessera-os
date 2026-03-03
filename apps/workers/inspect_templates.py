import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
c = create_client(url, key)

res = c.table('global_workspace_templates').select('id, name, graph_json').execute()

for t in res.data:
    print(f"Template Name: {t['name']} (ID: {t['id']})")
    gj = t['graph_json']
    if gj:
        if isinstance(gj, str):
            gj = json.loads(gj)
        nodes = gj.get('nodes', [])
        node_types = [n.get('type') for n in nodes]
        print(f"  Nodes: {node_types}")
    else:
        print("  No graph_json")
