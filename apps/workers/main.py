import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import admin, auth, chat, integrations

app = FastAPI(title="Tessera OS Worker Engine")

CORS_ORIGIN = os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(integrations.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tessera-os-engine"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)