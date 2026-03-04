import uuid
import json

def generate_id(prefix="node"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

def create_agent_node(label, description, system_prompt, x, y):
    return {
        "id": generate_id("agent"),
        "type": "customAgent",
        "position": {"x": x, "y": y},
        "data": {
            "label": label,
            "description": description,
            "systemPrompt": system_prompt
        }
    }

def create_hitl_node(label, description, prompt, x, y):
    return {
        "id": generate_id("hitl"),
        "type": "humanApprovalNode",
        "position": {"x": x, "y": y},
        "data": {
            "label": label,
            "description": description,
            "prompt": prompt
        }
    }

def create_end_node(label, description, x, y):
    return {
        "id": generate_id("end"),
        "type": "endNode",
        "position": {"x": x, "y": y},
        "data": {
            "label": label,
            "description": description
        }
    }

def create_edge(source_id, target_id, animated=False, color="#3b82f6"):
    edge = {
        "id": f"e_{source_id}_{target_id}",
        "source": source_id,
        "target": target_id
    }
    if animated:
        edge["animated"] = True
        edge["style"] = {"stroke": color, "strokeWidth": 2}
    return edge

def build_advanced_graph(theme, agent_labels):
    """
    Takes a theme (e.g. 'IT Support') and builds a dynamic, fully-connected 5-6 node graph
    with parallel execution and a HITL gate.
    """
    nodes = []
    edges = []
    
    # 1. Supervisor
    sup_label = agent_labels[0] if len(agent_labels) > 0 else f"{theme} Lead"
    sup = create_agent_node(
        sup_label, "Executive Orchestrator", 
        f"You are the Lead {theme} Orchestrator. You receive the initial request, break it down, and delegate sub-tasks to the specialists below.", 
        400, 50
    )
    nodes.append(sup)
    
    # 2. Parallel Workers
    w1_label = agent_labels[1] if len(agent_labels) > 1 else "Data Analyst"
    w1 = create_agent_node(
        w1_label, "Specialist Alpha", 
        f"You are a specialized {theme} worker. You execute your specific delegated task perfectly and return structural data without conversational filler.", 
        200, 250
    )
    nodes.append(w1)
    
    w2_label = agent_labels[2] if len(agent_labels) > 2 else "Research Specialist"
    w2 = create_agent_node(
        w2_label, "Specialist Beta", 
        f"You work in parallel checking related {theme} systems or databases to cross-reference constraints before synthesis.", 
        600, 250
    )
    nodes.append(w2)
    
    edges.append(create_edge(sup["id"], w1["id"], True))
    edges.append(create_edge(sup["id"], w2["id"], True))

    # 3. Synchronizing / Synthesis Node
    synth = create_agent_node(
        "Final Synthesizer", "Formatting Engine", 
        "You wait for the raw outputs from Specialist Alpha and Beta. You merge their findings into a comprehensive, highly-polished markdown response.", 
        400, 450
    )
    nodes.append(synth)
    
    edges.append(create_edge(w1["id"], synth["id"]))
    edges.append(create_edge(w2["id"], synth["id"]))

    # 4. Human Gate
    hitl = create_hitl_node(
        "Manager Sign-Off", "Deterministic Pause", 
        f"Please review the synthesized {theme} output. Approve to dispatch the final action.", 
        400, 650
    )
    nodes.append(hitl)
    edges.append(create_edge(synth["id"], hitl["id"], True, "#10b981"))
    
    # 5. End
    end = create_end_node("Dispatch", "Mission Complete", 400, 800)
    nodes.append(end)
    edges.append(create_edge(hitl["id"], end["id"]))
    
    return {"nodes": nodes, "edges": edges}
