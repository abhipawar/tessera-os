from langgraph.graph import StateGraph, START, END
from graphs.nodes import AgentState, create_worker_node, create_supervisor_node
from graphs.tools import build_tenant_tools
import os
from supabase import create_client
from crypto import decrypt_credentials

def build_dynamic_graph(nodes: list, edges: list, user_node_id: str, memory=None, workspace_id: str = None):
    print(f"\n--- [Compiler] Assembling Digital Twin for Node Seat: '{user_node_id}' in Workspace: '{workspace_id}' ---")
    
    builder = StateGraph(AgentState)
    node_id_to_label = {n.get("id"): n.get("data", {}).get("label", "Unknown") for n in nodes}
    node_id_to_type = {n.get("id"): n.get("type") for n in nodes}
    
    manager_to_workers = {}
    worker_to_parent = {} 
    conditional_routes = {}
    
    for edge in edges:
        src = edge.get("source")
        tgt = edge.get("target")
        source_handle = edge.get("sourceHandle")
        
        src_node = next((n for n in nodes if n.get("id") == src), None)
        if src_node and src_node.get("type") == "conditionalNode":
            if src not in conditional_routes:
                conditional_routes[src] = {}
            if source_handle:
                conditional_routes[src][source_handle] = tgt
        else:
            if src not in manager_to_workers:
                manager_to_workers[src] = []
            manager_to_workers[src].append(tgt)
            worker_to_parent[tgt] = src 
        
    # Fetch the AI Compute Engine credentials for the entire workspace environment natively
    global_llm_config = None
    tenant_id = None
    if workspace_id:
        try:
            sb_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
            ws_resp = sb_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
            if ws_resp.data:
                tenant_id = ws_resp.data[0]["tenant_id"]
                tt_res = sb_client.table("tenant_tools").select("id, tool_id, credentials").eq("tenant_id", tenant_id).execute()
                if tt_res.data:
                    g_ids = [row["tool_id"] for row in tt_res.data]
                    gt_res = sb_client.table("global_tools").select("id, name").in_("id", g_ids).execute()
                    gt_map = {row["id"]: row["name"] for row in gt_res.data}
                    
                    for row in tt_res.data:
                        g_name = gt_map.get(row["tool_id"], "").lower()
                        if "llm" in g_name or "ai compute" in g_name:
                            global_llm_config = decrypt_credentials(row["credentials"])
                            break
        except Exception as e:
            print(f"--- [Compiler] Error loading global LLM config: {e} ---")
            
    for node in nodes:
        node_id = node.get("id")
        label = node_id_to_label[node_id]
        sys_prompt = node.get("data", {}).get("systemPrompt", "")
        tool_ids = node.get("data", {}).get("tools", [])

        node_llm_config = global_llm_config 
        explicit_llm_id = node.get("data", {}).get("llm_integration_id")
        
        if explicit_llm_id and workspace_id:
            try:
                sb_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
                ws_resp = sb_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
                if ws_resp.data:
                    tenant_id = ws_resp.data[0]["tenant_id"]
                    tt_res = sb_client.table("tenant_tools").select("credentials").eq("tenant_id", tenant_id).eq("id", explicit_llm_id).execute()
                    if tt_res.data:
                        node_llm_config = decrypt_credentials(tt_res.data[0]["credentials"])
                        print(f"--- [Compiler] '{label}' using Explicit Node LLM Override: {node_llm_config.get('provider', 'Unknown')}! ---")
            except Exception as e:
                print(f"--- [Compiler] Error loading Explicit Node Override LLM config for {label}: {e} ---")
                
        elif tool_ids and workspace_id:
            try:
                sb_client = create_client(os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
                ws_resp = sb_client.table("workspaces").select("tenant_id").eq("id", workspace_id).execute()
                if ws_resp.data:
                    tenant_id = ws_resp.data[0]["tenant_id"]
                    tt_res = sb_client.table("tenant_tools").select("id, tool_id, credentials").eq("tenant_id", tenant_id).in_("id", tool_ids).execute()
                    if tt_res.data:
                        g_ids = [row["tool_id"] for row in tt_res.data]
                        gt_res = sb_client.table("global_tools").select("id, name").in_("id", g_ids).execute()
                        gt_map = {row["id"]: row["name"] for row in gt_res.data}
                        
                        for row in tt_res.data:
                            g_name = gt_map.get(row["tool_id"], "").lower()
                            if "llm" in g_name or "ai compute" in g_name:
                                node_llm_config = decrypt_credentials(row["credentials"])
                                print(f"--- [Compiler] '{label}' using Implicit Tool Array Node LLM Override: {node_llm_config.get('provider', 'Unknown')}! ---")
                                break
            except Exception as e:
                print(f"--- [Compiler] Error loading Node Override LLM config for {label}: {e} ---")

        node_tools = build_tenant_tools(workspace_id, tool_ids) if workspace_id and tool_ids else []
        node_type = node.get("type")
        
        if node_type in ["startNode", "triggerNode"]:
            def create_start_node(node_lbl: str, next_agt: str):
                def app_node(state: AgentState):
                    print(f"\n--- [Execution Engine] Entry Point reached: '{node_lbl}' ---")
                    return {"next_agent": next_agt} if next_agt else {}
                return app_node
            
            start_workers = [node_id_to_label[w] for w in manager_to_workers.get(node_id, [])]
            next_tgt = start_workers[0] if start_workers else None
            node_function = create_start_node(label, next_tgt)
            
        elif node_type == "endNode":
            def create_end_node(node_lbl: str):
                def app_node(state: AgentState):
                    print(f"\n--- [Execution Engine] Terminal Point reached: '{node_lbl}' ---")
                    return {"next_agent": "FINISH"}
                return app_node
            node_function = create_end_node(label)
            
        elif node_type == "approvalNode":
            def create_approval_node(node_lbl: str, next_agt: str):
                import re
                safe_next_agt = re.sub(r'[^a-zA-Z0-9_-]', '_', next_agt)
                
                def app_node(state: AgentState):
                    from langgraph.types import interrupt
                    messages = state.get("messages", [])
                    
                    # If the downstream worker just finished and returned to us, propagate FINISH upwards
                    if messages and hasattr(messages[-1], "name") and messages[-1].name == safe_next_agt:
                        return {"next_agent": "FINISH"}
                        
                    print(f"\n--- [Execution Engine] Pausing at Approval Checkpoint: '{node_lbl}' ---")
                    
                    # We interrupt the execution, sending the current messages back to the caller
                    # The graph will wait here until it is resumed with a command
                    action = interrupt({
                        "type": "approval_request",
                        "node": node_lbl,
                        "messages": [m.content if hasattr(m, "content") else str(m) for m in messages[-3:]] 
                    })
                    
                    print(f"      -> [Approval Result] Received action: {action}")
                    
                    # When resumed, if action is rejected, we inject a 'rejected' message instead of continuing
                    if action == "reject":
                        return {"messages": [{"role": "user", "content": f"The human has REJECTED the previous reasoning at node '{node_lbl}'."}], "next_agent": "FINISH_ROUTING"}
                    
                    return {"messages": [{"role": "user", "content": f"The human has APPROVED the previous reasoning at node '{node_lbl}'."}], "next_agent": next_agt}
                return app_node
                
            approval_workers = [node_id_to_label[w] for w in manager_to_workers.get(node_id, [])]
            next_agent_val = approval_workers[0] if approval_workers else "FINISH"
            node_function = create_approval_node(label, next_agent_val)
        elif node_type == "conditionalNode":
            def create_conditional_evaluator(node_lbl: str, condition_text: str, true_agt: str, false_agt: str):
                def eval_node(state: AgentState):
                    from pydantic import BaseModel, Field
                    print(f"\n--- [Execution Engine] Evaluating Condition at '{node_lbl}' ---")
                    print(f"      -> Rule: {condition_text}")
                    
                    class BooleanEvaluation(BaseModel):
                        thought_process: str = Field(description="Internal reasoning evaluating the condition against the state.")
                        result: bool = Field(description="True if the condition is met, False otherwise.")
                        
                    context_vars = state.get("context_variables", {})
                    
                    # We defer to the LLM to read the condition and examine the state
                    from langchain_core.messages import SystemMessage
                    from graphs.nodes import get_llm, resolve_templates
                    
                    # Resolve any dynamic variables in the condition text
                    resolved_condition = resolve_templates(condition_text, context_vars) if condition_text else "True"
                    
                    llm = get_llm(node_llm_config).with_structured_output(BooleanEvaluation)
                    prompt = SystemMessage(content=f"You are a strict boolean evaluator. Your job is to read the message history and context, and evaluate this condition: '{resolved_condition}'. Return True or False.")
                    messages = state.get("messages", [])
                    
                    try:
                        eval_res = llm.invoke([prompt] + messages[-5:])
                        print(f"      -> Reason: {eval_res.thought_process}")
                        print(f"      -> Evaluated to: {eval_res.result}")
                        is_true = eval_res.result
                    except Exception as e:
                        print(f"      -> [Condition Error] Defaulting to False. Error: {e}")
                        is_true = False
                        
                    next_tgt = true_agt if is_true else false_agt
                    return {"next_agent": next_tgt}
                return eval_node
                
            condition_str = node.get("data", {}).get("condition", "")
            routes = conditional_routes.get(node_id, {})
            true_tgt_id = routes.get("true")
            false_tgt_id = routes.get("false")
            
            true_label = node_id_to_label.get(true_tgt_id, "FINISH_ROUTING") if true_tgt_id else "FINISH_ROUTING"
            false_label = node_id_to_label.get(false_tgt_id, "FINISH_ROUTING") if false_tgt_id else "FINISH_ROUTING"
            
            node_function = create_conditional_evaluator(label, condition_str, true_label, false_label)
        elif node_id in manager_to_workers:
            worker_labels = [node_id_to_label[w_id] for w_id in manager_to_workers[node_id]]
            node_function = create_supervisor_node(label, sys_prompt, worker_labels, node_tools, workspace_id, tenant_id, node_llm_config, node.get("data", {}).get("outputSchema"))
        else:
            node_function = create_worker_node(label, sys_prompt, node_tools, workspace_id, tenant_id, node_llm_config, node.get("data", {}).get("outputSchema"))
            
        builder.add_node(label, node_function)

    starting_label = node_id_to_label.get(user_node_id)
    if not starting_label:
        raise ValueError(f"CRITICAL: User is assigned to node '{user_node_id}', but it does not exist in the studio!")
    
    builder.add_edge(START, starting_label)

    def create_router(allowed_workers):
        def router(state: AgentState) -> str:
            next_agent = state.get("next_agent", "FINISH")
            if next_agent in allowed_workers:
                return next_agent
            return "FINISH_ROUTING"
        return router

    for mgr_id, worker_ids in manager_to_workers.items():
        mgr_label = node_id_to_label[mgr_id]
        worker_labels = [node_id_to_label[w_id] for w_id in worker_ids]
        
        parent_id = worker_to_parent.get(mgr_id)
        if mgr_id == user_node_id:
            finish_target = END
        else:
            finish_target = node_id_to_label[parent_id] if parent_id else END
        
        routing_map = {w: w for w in worker_labels}
        routing_map["FINISH_ROUTING"] = finish_target 
        
        builder.add_conditional_edges(mgr_label, create_router(worker_labels), routing_map)
        
        for w_id in worker_ids:
            w_label = node_id_to_label[w_id]
            if w_id not in manager_to_workers and w_id not in conditional_routes:
                if w_id == user_node_id or node_id_to_type.get(w_id) == "endNode":
                    builder.add_edge(w_label, END)
                else:
                    builder.add_edge(w_label, mgr_label)

    # Attach passthrough dynamic routing edges for Conditional Nodes
    def create_passthrough_router():
        def router(state: AgentState) -> str:
            return state.get("next_agent", "FINISH_ROUTING")
        return router
        
    for cond_id, routes in conditional_routes.items():
        cond_label = node_id_to_label[cond_id]
        true_tgt_id = routes.get("true")
        false_tgt_id = routes.get("false")
        
        true_label = node_id_to_label.get(true_tgt_id, "FINISH_ROUTING") if true_tgt_id else "FINISH_ROUTING"
        false_label = node_id_to_label.get(false_tgt_id, "FINISH_ROUTING") if false_tgt_id else "FINISH_ROUTING"
        
        routing_map = {}
        if true_label != "FINISH_ROUTING": routing_map[true_label] = true_label
        if false_label != "FINISH_ROUTING": routing_map[false_label] = false_label
        routing_map["FINISH_ROUTING"] = END
        
        builder.add_conditional_edges(cond_label, create_passthrough_router(), routing_map)

        # Wire children back to END or parent if they aren't managers themselves
        for handle, child_id in routes.items():
            if child_id and child_id not in manager_to_workers and child_id not in conditional_routes:
                child_label = node_id_to_label[child_id]
                builder.add_edge(child_label, END)

    print("--- [Compiler] Compilation Complete! ---\n")
    return builder.compile(checkpointer=memory)
