-- Seed an extremely complex 'Jaw-Dropping' Master Template to demonstrate platform power to investors
INSERT INTO public.global_workspace_templates 
(id, name, description, target_audience, icon, prerequisite_tools, is_active, graph_json)
VALUES 
(
  gen_random_uuid(),
  'Global Web Research Syndicate',
  'An advanced 6-node hierarchical network. A Lead Supervisor coordinates parallel web scraper agents, summarizes the unstructured data, and holds the final executive brief with a Human-in-the-Loop approval gate before dispatch.',
  'Enterprise',
  'Network',
  '["tavily_search", "read_webpage"]'::jsonb, -- Uses tools we know exist natively
  true,
  '{
    "nodes": [
      {
        "id": "ceo_supervisor",
        "type": "customAgent",
        "position": { "x": 400, "y": 50 },
        "data": {
          "label": "Chief Research Officer",
          "description": "Executive Orchestrator",
          "systemPrompt": "You are the Chief Research Officer. Your job is to break down broad queries (e.g., \\\"Analyze competitor pricing\\\") and delegate specific sub-tasks to your specialized Scraping Agents below. You synthesize their final reports."
        }
      },
      {
        "id": "deep_scraper_1",
        "type": "customAgent",
        "position": { "x": 100, "y": 250 },
        "data": {
          "label": "Data Miner (Alpha)",
          "description": "Deep Web Analysis",
          "systemPrompt": "You are a specialized worker given narrow web-scraping targets by your Supervisor. You use the Tavily and Webpage Reading tools to aggressively extract exact data points. You do not summarize; you return raw facts."
        }
      },
      {
        "id": "deep_scraper_2",
        "type": "customAgent",
        "position": { "x": 400, "y": 250 },
        "data": {
          "label": "Data Miner (Beta)",
          "description": "Secondary Validation",
          "systemPrompt": "You operate in parallel with Miner Alpha. Your goal is to cross-reference their findings by scraping alternative academic or financial sources. Ensure zero hallucination."
        }
      },
      {
        "id": "synthesizer_node",
        "type": "customAgent",
        "position": { "x": 700, "y": 250 },
        "data": {
          "label": "Content Synthesizer",
          "description": "Formatting Engine",
          "systemPrompt": "You wait for the raw data from Alpha and Beta. You format their JSON output into a stunning markdown executive summary."
        }
      },
      {
        "id": "human_gate",
        "type": "humanApprovalNode",
        "position": { "x": 400, "y": 450 },
        "data": {
          "label": "Executive Sign-Off",
          "description": "Deterministic Pause",
          "prompt": "Review the synthesized web research before allowing the network to broadcast the findings via Email."
        }
      },
      {
        "id": "output_node",
        "type": "endNode",
        "position": { "x": 400, "y": 600 },
        "data": {
          "label": "Final Dispatch",
          "description": "Mission Complete"
        }
      }
    ],
    "edges": [
      {
        "id": "e_ceo_to_a",
        "source": "ceo_supervisor",
        "target": "deep_scraper_1",
        "animated": true,
        "style": { "stroke": "#3b82f6", "strokeWidth": 2 }
      },
      {
        "id": "e_ceo_to_b",
        "source": "ceo_supervisor",
        "target": "deep_scraper_2",
        "animated": true,
        "style": { "stroke": "#3b82f6", "strokeWidth": 2 }
      },
      {
        "id": "e_a_to_synth",
        "source": "deep_scraper_1",
        "target": "synthesizer_node"
      },
      {
        "id": "e_b_to_synth",
        "source": "deep_scraper_2",
        "target": "synthesizer_node"
      },
      {
        "id": "e_synth_to_human",
        "source": "synthesizer_node",
        "target": "human_gate",
        "animated": true,
        "style": { "stroke": "#10b981", "strokeWidth": 2 }
      },
      {
        "id": "e_human_to_out",
        "source": "human_gate",
        "target": "output_node"
      }
    ]
  }'::jsonb
);
