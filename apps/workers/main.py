import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import admin, auth, chat, integrations, async_tasks, telemetry
import logging

class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return "OPTIONS" not in record.getMessage()

logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

app = FastAPI(title="Tessera OS Worker Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Chrome extension Origins (chrome-extension://...)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(integrations.router)
app.include_router(async_tasks.router)
app.include_router(telemetry.router)
import psycopg

@app.on_event("startup")
def startup_event():
    db_uri = os.environ.get("DATABASE_URL")
    if db_uri:
        query = """
        CREATE TABLE IF NOT EXISTS public.chats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL DEFAULT 'New Chat',
          is_pinned BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own workspace chats" ON public.chats;
        CREATE POLICY "Users can view their own workspace chats" ON public.chats
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own workspace chats" ON public.chats;
        CREATE POLICY "Users can insert their own workspace chats" ON public.chats
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own workspace chats" ON public.chats;
        CREATE POLICY "Users can update their own workspace chats" ON public.chats
          FOR UPDATE USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own workspace chats" ON public.chats;
        CREATE POLICY "Users can delete their own workspace chats" ON public.chats
          FOR DELETE USING (auth.uid() = user_id);
        """
        try:
            with psycopg.connect(db_uri) as conn:
                with conn.cursor() as cur:
                    cur.execute(query)
                conn.commit()
            print("Successfully bootstrapped 'chats' schema and RLS policies on startup.")
        except Exception as e:
            print(f"Error bootstrapping 'chats' schema: {e}")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tessera-os-engine"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)