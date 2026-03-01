from graphs.builder import build_dynamic_graph

# This file now acts as a clean export interface for the `routers/chat.py` file to import from.
# All complex LangGraph logic has been modularized into the `graphs/` directory.

__all__ = ["build_dynamic_graph"]