from fastapi import APIRouter, HTTPException, Form
import os
import pdfplumber
import json
import anthropic
# from pydantic import BaseModel # Removed for simplicity in this draft
from typing import List, Dict, Any

router = APIRouter(prefix="/api")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a financial document parser. Extract ALL financial data from this document and return ONLY valid JSON. No explanation, no markdown, just raw JSON."""

@router.post("/extract")
async def extract_data(file_paths: List[str] = Form(...), doc_types: List[str] = Form(...)):
    try:
        results = []
        for i, path in enumerate(file_paths):
            if not os.path.exists(path):
                continue
                
            try:
                # Extract text from PDF
                text = ""
                if path.lower().endswith(".pdf"):
                    with pdfplumber.open(path) as pdf:
                        for page in pdf.pages:
                            text += page.extract_text() or ""
                
                
                if not text.strip():
                    results.append({
                        "file_path": path,
                        "status": "error",
                        "message": "No text content found in document.",
                        "fields": {}
                    })
                    continue

                # Prepare User Prompt
                user_msg = f"""Extract all financial metrics from this document.
Return JSON in this exact format:
{{
  "document_type": "Annual Report|ALM|Shareholding|Borrowing|Portfolio",
  "fields": {{
    "metric_name": "value",
    "metric_name2": "value2"
  }}
}}

Document text:
{text[:20000]}"""

                # Call Claude
                message = client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    max_tokens=2000,
                    system=SYSTEM_PROMPT,
                    messages=[
                        {"role": "user", "content": user_msg}
                    ]
                )
                
                response_text = message.content[0].text

                # Parse JSON response safely
                extracted_json = {}
                try:
                    extracted_json = json.loads(response_text)
                except json.JSONDecodeError:
                    # Attempt to find JSON block if AI included markdown
                    import re
                    match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if match:
                        extracted_json = json.loads(match.group())

                results.append({
                    "file_path": path,
                    "original_type": doc_types[i],
                    "detected_type": extracted_json.get("document_type", "Unknown"),
                    "fields": extracted_json.get("fields", {}),
                    "status": "success"
                })
                
            except Exception as e:
                results.append({
                    "file_path": path,
                    "status": "error",
                    "message": str(e),
                    "fields": {}
                })
                
        return {"extractions": results}
    except Exception as e:
        return {"extractions": [], "error": str(e)}
