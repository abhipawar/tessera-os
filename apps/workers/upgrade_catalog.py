import os
import json
import requests
from dotenv import load_dotenv

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from graphs.template_factory import build_advanced_graph, create_agent_node, create_hitl_node, create_end_node, create_edge, generate_id

load_dotenv('.env')
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
headers = { 'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json' }

def apply_upgrades():
    print("Fetching legacy templates...")
    res = requests.get(f"{url}/rest/v1/global_workspace_templates", headers=headers)
    templates = res.json()
    
    # We skip "Global Web Research Syndicate" since it's already perfect
    for t in templates:
        if t["name"] == "Global Web Research Syndicate":
            continue
            
        print(f"Upgrading: {t['name']}")
        
        # Try to extract existing agent labels to preserve the flavor of the template
        labels = []
        try:
            g = json.loads(t.get("graph_json", "{}")) if type(t.get("graph_json")) == str else (t.get("graph_json") or {})
            nodes = g.get("nodes", [])
            labels = [n.get("data", {}).get("label") for n in nodes if n.get("type") in ["customAgent", "agent"] and n.get("data", {}).get("label")]
        except:
            pass
            
        new_graph = build_advanced_graph(t["name"], labels)
        
        # UPDATE the row
        update_res = requests.patch(
            f"{url}/rest/v1/global_workspace_templates?id=eq.{t['id']}", 
            headers=headers,
            json={"graph_json": new_graph}
        )
        if update_res.status_code >= 400:
            print(f"Failed to update {t['name']}: {update_res.text}")
        else:
            print(f"  -> Successfully generated {len(new_graph['nodes'])} nodes and {len(new_graph['edges'])} edges.")

def build_l1_support():
    nodes = []
    edges = []
    
    n1 = create_agent_node("Ticket Triage Router", "Supervisor", "Classify incoming Zendesk ticket (Billing vs Tech).", 400, 50)
    nodes.append(n1)
    
    n2 = create_agent_node("KB Scraper", "Tech Specialist", "Search Confluence for the troubleshooting steps.", 200, 250)
    nodes.append(n2)
    
    n3 = create_agent_node("Customer Intel DB", "Billing Specialist", "Query Postgres DB for user subscription state.", 600, 250)
    nodes.append(n3)
    
    n4 = create_agent_node("Empathy Writer", "Synthesizer", "Write polite, brand-aligned email response.", 400, 450)
    nodes.append(n4)
    
    n5 = create_hitl_node("Human QA Gate", "Management Approval", "Approve the auto-generated empathetic email to the customer.", 400, 650)
    nodes.append(n5)
    
    n6 = create_end_node("Dispatch", "Email Sent", 400, 800)
    nodes.append(n6)
    
    edges.append(create_edge(n1["id"], n2["id"], True))
    edges.append(create_edge(n1["id"], n3["id"], True))
    edges.append(create_edge(n2["id"], n4["id"]))
    edges.append(create_edge(n3["id"], n4["id"]))
    edges.append(create_edge(n4["id"], n5["id"], True, "#10b981"))
    edges.append(create_edge(n5["id"], n6["id"]))
    
    return {"nodes": nodes, "edges": edges}

def build_due_diligence():
    nodes = []
    edges = []
    
    n1 = create_agent_node("Lead Analyst", "Supervisor", "Accept ticker and delegate domains.", 400, 50)
    n2 = create_agent_node("SEC Edgar Scraper", "Raw Data", "Pull 10-K/10-Q text.", 100, 250)
    n3 = create_agent_node("Sentiment Analyzer", "NLP Expert", "Read earnings transcripts for negativity.", 400, 250)
    n4 = create_agent_node("Risk Assessor", "Legal", "Analyze SEC filings for lawsuits.", 700, 250)
    n5 = create_agent_node("Memo Writer", "Synthesizer", "Format findings into PE One-Pager.", 400, 450)
    n6 = create_end_node("Post to Slack", "Complete", 400, 600)
    
    nodes.extend([n1, n2, n3, n4, n5, n6])
    edges.append(create_edge(n1["id"], n2["id"], True))
    edges.append(create_edge(n1["id"], n3["id"], True))
    edges.append(create_edge(n1["id"], n4["id"], True))
    edges.append(create_edge(n2["id"], n5["id"]))
    edges.append(create_edge(n3["id"], n5["id"]))
    edges.append(create_edge(n4["id"], n5["id"]))
    edges.append(create_edge(n5["id"], n6["id"], True, "#3b82f6"))
    
    return {"nodes": nodes, "edges": edges}

def build_auto_remediation():
    nodes = []
    edges = []
    
    n1 = create_agent_node("Sentry Triage", "Supervisor", "Read inbound exception webhook.", 400, 50)
    n2 = create_agent_node("Github Repo Reader", "Specialist", "Lookup failing file and map deps.", 400, 250)
    n3 = create_agent_node("Senior Dev", "Synthesizer", "Write patch code.", 400, 450)
    n4 = create_hitl_node("Human Code Review", "Safety", "Review patch before PR open.", 400, 650)
    n5 = create_end_node("Open PR", "Complete", 400, 800)
    
    nodes.extend([n1, n2, n3, n4, n5])
    edges.append(create_edge(n1["id"], n2["id"], True))
    edges.append(create_edge(n2["id"], n3["id"]))
    edges.append(create_edge(n3["id"], n4["id"], True, "#10b981"))
    edges.append(create_edge(n4["id"], n5["id"]))
    
    return {"nodes": nodes, "edges": edges}

def seed_new_templates():
    print("Seeding new Enterprise jaw-dropping templates...")
    
    new_templates = [
        {
            "name": "L1 Technical Support Deflection Engine",
            "description": "Triages inbound tickets, searches identical Confluence docs, writes an empathetic response, and waits for a Human Manager before emailing.",
            "target_audience": "Enterprise",
            "icon": "Headphones",
            "is_active": True,
            "prerequisite_tools": [],
            "graph_json": build_l1_support()
        },
        {
            "name": "Autonomous Financial Due Diligence",
            "description": "A 6-node Private Equity squad scraping SEC 10-K filings, analyzing risk/legal sentiment, and generating an investment memo.",
            "target_audience": "Enterprise",
            "icon": "TrendingUp",
            "is_active": True,
            "prerequisite_tools": [],
            "graph_json": build_due_diligence()
        },
        {
            "name": "Codebase Auto-Remediation Squad",
            "description": "Reads Sentry crash webhooks, pulls failing GitHub code, writes a patch, and routes to Human Code Review before opening a PR.",
            "target_audience": "Enterprise",
            "icon": "PenTool",
            "is_active": True,
            "prerequisite_tools": [],
            "graph_json": build_auto_remediation()
        }
    ]
    
    for t in new_templates:
        res = requests.post(f"{url}/rest/v1/global_workspace_templates", headers=headers, json=t)
        if res.status_code >= 400:
            print(f"Failed to seed {t['name']}: {res.text}")
        else:
            print(f"  -> Inserted: {t['name']}")

if __name__ == "__main__":
    apply_upgrades()
    seed_new_templates()
    print("Completed catalog lifecycle upgrade.")
