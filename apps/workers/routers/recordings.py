from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import os
import jwt
from datetime import datetime
from supabase import create_client

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from e2b_code_interpreter import Sandbox

import base64
import uuid

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 
supabase_client = create_client(supabase_url, supabase_key)
e2b_api_key = os.environ.get("E2B_API_KEY")

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

class RecordingEvent(BaseModel):
    event_type: str
    url: str
    xpath_selector: Optional[str] = None
    value: Optional[str] = None
    client_x: Optional[int] = None
    client_y: Optional[int] = None
    timestamp: str
    screenshot_b64: Optional[str] = None

class UploadRequest(BaseModel):
    events: List[RecordingEvent]

def get_tenant_id_from_auth(req: Request) -> str:
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Access Denied")
    
    token = auth_header.split(" ")[1]
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_uuid = str(decoded.get("sub"))
        # Using simple resolve for prototype
        profile_resp = supabase_client.table("profiles").select("is_tessera_admin").eq("id", user_uuid).execute()
        is_admin = profile_resp.data and profile_resp.data[0].get("is_tessera_admin")
        impersonated_tenant_id = req.headers.get("X-Impersonated-Tenant-Id")
        if is_admin and impersonated_tenant_id:
            return impersonated_tenant_id
        
        member_resp = supabase_client.table("tenant_members").select("tenant_id").eq("user_id", user_uuid).execute()
        if not member_resp.data:
            raise HTTPException(status_code=403, detail="No tenant")
        return member_resp.data[0]["tenant_id"], user_uuid
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/upload")
def upload_recording(payload: UploadRequest, req: Request):
    """Ingests the stream of events from the Chrome Extension"""
    tenant_id, user_id = get_tenant_id_from_auth(req)
        
    start_time = payload.events[0].timestamp if payload.events else datetime.now().isoformat()
    end_time = payload.events[-1].timestamp if payload.events else start_time

    try:
        # Create recording parent record
        rec_resp = supabase_client.table("process_recordings").insert({
            "tenant_id": tenant_id,
            "user_id": user_id,
            "start_time": start_time,
            "end_time": end_time,
            "status": "completed"
        }).execute()
        
        recording_id = rec_resp.data[0]["id"]
        
        events_to_insert = []
        for e in payload.events:
            screenshot_path = None
            if e.screenshot_b64:
                file_ext = "jpg"
                b64_data = e.screenshot_b64.split(",")[-1]
                image_data = base64.b64decode(b64_data)
                path = f"{tenant_id}/{recording_id}/{uuid.uuid4()}.{file_ext}"
                supabase_client.storage.from_("process_screenshots").upload(
                    path, image_data, {"content-type": "image/jpeg"}
                )
                screenshot_path = path

            events_to_insert.append({
                "recording_id": recording_id,
                "event_type": e.event_type,
                "url": e.url,
                "xpath_selector": e.xpath_selector,
                "value": e.value,
                "client_x": e.client_x,
                "client_y": e.client_y,
                "screenshot_path": screenshot_path,
                "timestamp": e.timestamp
            })
            
        if events_to_insert:
            supabase_client.table("recording_events").insert(events_to_insert).execute()
            
        return {"status": "success", "recording_id": recording_id}
    except Exception as e:
        print(f"Error uploading recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{recording_id}/summarize")
def summarize_recording(recording_id: str, req: Request):
    try:
        events_resp = supabase_client.table("recording_events").select("*").eq("recording_id", recording_id).order("timestamp").execute()
        if not events_resp.data:
            return {"error": "No events found"}
        
        # Build text string of chronological steps
        steps = []
        for i, ev in enumerate(events_resp.data):
            if ev["event_type"] == "click":
                steps.append(f"{i+1}. Navigated out to {ev['url']}. Clicked element [{ev['xpath_selector']}].")
            elif ev["event_type"] == "input":
                steps.append(f"{i+1}. At {ev['url']}, typed '{ev['value']}' into [{ev['xpath_selector']}].")

        sequence_text = "\n".join(steps)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an automated Intent Analyzer. Read these DOM interaction steps and summarize the overall business intent into ONE single concise sentence (e.g. 'User is submitting a payment form on Stripe')."),
            ("human", "Events:\n{events}")
        ])
        
        google_api_key = os.environ.get("GOOGLE_API_KEY", "")
        if not google_api_key:
            return {"error": "GOOGLE_API_KEY is not configured in the environment. Please add it to your .env file."}
            
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", api_key=google_api_key)
        chain = prompt | llm
        
        summary = chain.invoke({"events": sequence_text}).content
        
        supabase_client.table("process_recordings").update({"llm_summary": summary, "status": "summarized", "name": summary[:30] + "..."}).eq("id", recording_id).execute()
        
        return {"status": "success", "summary": summary}
    except Exception as e:
        print(f"Error in summarize: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{recording_id}/replicate")
def replicate_recording(recording_id: str):
    """Headless E2B Execution Engine using Playwright"""
    events_resp = supabase_client.table("recording_events").select("*").eq("recording_id", recording_id).order("timestamp").execute()
    if not events_resp.data:
        raise HTTPException(status_code=404, detail="No events")

    # Generate Playwright Python script dynamically based on recording
    script_lines = [
        "import asyncio, os, base64",
        "from playwright.async_api import async_playwright",
        "",
        "async def run():",
        "    async with async_playwright() as p:",
        "        browser = await p.chromium.launch(headless=True)",
        "        context = await browser.new_context(record_video_dir='/workspace/videos', viewport={'width': 1280, 'height': 720})",
        "        page = await context.new_page()",
    ]

    last_url = None
    for ev in events_resp.data:
        # Only navigate if URL changes
        if ev["url"] != last_url:
            script_lines.append(f"        print('Navigating to {ev['url']}')")
            script_lines.append(f"        await page.goto('{ev['url']}', wait_until='domcontentloaded')")
            last_url = ev["url"]

        if ev["event_type"] == "click" and ev["xpath_selector"]:
            script_lines.append(f"        print('Clicking {ev['xpath_selector']}')")
            # Playwright uses xpath=//div format if it's pure xpath. But our XPath is from JS.
            xpath = ev["xpath_selector"].replace("id(", "//*[@id=").replace('")', '"]') if 'id(' in ev["xpath_selector"] else f"//{ev['xpath_selector']}"
            script_lines.append(f"        try:")
            script_lines.append(f"            await page.locator('xpath={ev['xpath_selector']}').click(timeout=3000)")
            script_lines.append(f"        except Exception as e: print(f'Failed click: {{e}}')")
            
        elif ev["event_type"] == "input" and ev["xpath_selector"]:
            script_lines.append(f"        print('Typing into {ev['xpath_selector']}')")
            script_lines.append(f"        try:")
            script_lines.append(f"            await page.locator('xpath={ev['xpath_selector']}').fill('{ev['value']}')")
            script_lines.append(f"        except Exception as e: print(f'Failed input: {{e}}')")

    script_lines.append("        await context.close() # Ensures video is saved")
    script_lines.append("        await browser.close()")
    script_lines.append("        print('Replication Simulation Complete.')")
    script_lines.append("        # Read video file")
    script_lines.append("        video_files = os.listdir('/workspace/videos')")
    script_lines.append("        if video_files:")
    script_lines.append("            with open(f'/workspace/videos/{video_files[0]}', 'rb') as f:")
    script_lines.append("                video_b64 = base64.b64encode(f.read()).decode('utf-8')")
    script_lines.append("                with open('/workspace/video_out.b64', 'w') as out: out.write(video_b64)")
    script_lines.append("asyncio.run(run())")

    python_script = "\n".join(script_lines)
    
    try:
        with Sandbox.create() as sandbox:
            print("Installing playwright inside E2B sandbox...")
            sandbox.commands.run("pip install playwright && playwright install chromium && playwright install-deps chromium")
            print("Executing Replication automation...")
            
            # Write out file directly to bypass nasty quote stripping from bash
            sandbox.files.write("/workspace/run.py", python_script)
            execution = sandbox.commands.run("python /workspace/run.py")
            
            try:
                video_b64 = sandbox.files.read("/workspace/video_out.b64")
            except:
                video_b64 = None
            
            print(f"Stdout: {execution.stdout}")
            print(f"Stderr: {execution.stderr}")
            
            return {
                "status": "success",
                "output": execution.stdout,
                "error": execution.stderr,
                "video_b64": video_b64,
                "generated_script": python_script
            }
    except Exception as e:
        print(f"E2B execution crash: {str(e)}")
        return {"status": "error", "error": str(e), "generated_script": python_script}
