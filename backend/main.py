from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import httpx
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from routers import upload, extraction, report, quick

async def keep_alive():
    while True:
        await asyncio.sleep(600)  # every 10 minutes
        try:
            BACKEND_URL = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000")
            async with httpx.AsyncClient(timeout=10) as client:
                await client.get(f"{BACKEND_URL}/api/health")
        except:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(keep_alive())
    yield

app = FastAPI(title="VERIDEX API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(extraction.router)
app.include_router(report.router)
app.include_router(quick.router)

@app.get("/")
async def root():
    return {"message": "Welcome to VERIDEX API"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print("✅ Tavily cache active — repeat searches cost 0 credits")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
