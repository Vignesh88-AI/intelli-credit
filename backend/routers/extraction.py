from fastapi import APIRouter, HTTPException, Form
import os
import pdfplumber
import json
from groq import Groq
from typing import List, Dict, Any

router = APIRouter(prefix="/api")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
                user_msg = f"""Extract critical financial metrics from this document. 
                Focus on these specific fields if present:
                - revenue (current and previous year)
                - pat (profit after tax)
                - ebitda
                - total_debt
                - net_worth
                - total_assets
                - gnpa_percent (Gross NPA %)
                - car_percent (Capital Adequacy Ratio)
                - promoter_holding (percentage)
                - debt_to_equity (ratio)

                Return JSON in this exact format:
                {{
                  "document_type": "Annual Report|ALM|Shareholding|Borrowing|Portfolio",
                  "fields": {{
                    "revenue": "value in numeric/string",
                    "pat": "value",
                    "total_debt": "value",
                    "net_worth": "value",
                    "gnpa_percent": "value",
                    "car_percent": "value",
                    "debt_to_equity": "value",
                    "ebitda": "value",
                    "promoter_holding": "value",
                    "other_metrics": {{}}
                  }}
                }}

                If a field is not found, omit it or set to null. 
                Document text (truncated):
                {text[:15000]}"""

                # Call Groq
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg}
                    ],
                    max_tokens=2000,
                    temperature=0.1
                )
                
                response_text = response.choices[0].message.content

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
