import os, json, sys, traceback
from dotenv import load_dotenv
load_dotenv()
sys.path.append(os.getcwd())

print('Starting script via Poetry...')
import psycopg
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import Command
from supabase import create_client
from compiler import build_dynamic_graph

task_id = '366058c6-0001-4bb0-9825-5f69802b5acb'
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase_client = create_client(supabase_url, supabase_key)

print('Fetching task...')
task_resp = supabase_client.table('agent_tasks').select('*').eq('id', task_id).execute()
if not task_resp.data:
    print('Task not found!')
    sys.exit(1)
task = task_resp.data[0]
workspace_id = task['workspace_id']
thread_id = task['thread_id']

print('Fetching workspace...', workspace_id)
response = supabase_client.table('workspaces').select('nodes, edges').eq('id', workspace_id).execute()
chart_data = response.data[0]
nodes = json.loads(chart_data['nodes']) if isinstance(chart_data['nodes'], str) else chart_data['nodes']
edges = json.loads(chart_data['edges']) if isinstance(chart_data['edges'], str) else chart_data['edges']

user_node = next((n for n in nodes if n.get('type') in ['triggerNode', 'userNode', 'customUser']), None)
if not user_node: user_node = nodes[0]

config = {'configurable': {'thread_id': thread_id}}
DB_URI = os.environ.get('DATABASE_URL')

print('Connecting to PG...')
try:
    with psycopg.connect(DB_URI, prepare_threshold=None) as conn:
        print('Connected to PG. Setting up memory...')
        memory = PostgresSaver(conn)
        memory.setup()
        
        print('Building dynamic graph...')
        compiled_graph = build_dynamic_graph(nodes, edges, user_node_id=user_node.get('id'), memory=memory, workspace_id=workspace_id)
        
        print('Streaming compiled graph...')
        events = compiled_graph.stream(Command(resume={'action': 'approve'}), config=config)
        
        for event in events:
            print('Event:', dict(event))
            if '__interrupt__' in event:
                print('INTERRUPT FOUND!')
                break
        print('Finished loop.')
except Exception as e:
    traceback.print_exc()
print('DONE.')
