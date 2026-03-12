from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from routers import upload, extraction, report

app = FastAPI(title="VERIDEX API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://intelli-credit-nu.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(extraction.router)
app.include_router(report.router)

@app.get("/")
async def root():
    return {"message": "Welcome to VERIDEX API"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
