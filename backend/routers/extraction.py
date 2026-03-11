from fastapi import APIRouter, HTTPException, Form
import os
import pdfplumber
import json
import anthropic
# from pydantic import BaseModel # Removed for simplicity in this draft
from typing import List, Dict, Any

router = APIRouter(prefix="/api")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a financial document classifier and extractor for Indian corporate 
lending. Given this document text, first identify the document type from: 
[ALM, Shareholding Pattern, Borrowing Profile, Annual Report, Portfolio Data].
Then extract all key financial metrics into structured JSON. 
For Annual Reports extract: revenue, EBITDA, PAT, total debt, networth, 
current ratio, debt-to-equity, interest coverage ratio, for last 3 years.
For ALM extract: maturity buckets, asset-liability gap, liquidity ratios.
For Shareholding: promoter %, FII %, public %, any pledge %.
For Borrowing Profile: total borrowings, lender-wise breakup, repayment schedule.
For Portfolio: NPA %, collection efficiency, portfolio growth rate.
Return ONLY valid JSON, no explanation."""

@router.post("/extract")
async def extract_data(file_paths: List[str] = Form(...), doc_types: List[str] = Form(...)):
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
            else:
                # Handle images or other formats if needed (e.g. OCR)
                # For now, let's assume mostly PDFs as per prompt
                text = "Non-PDF file. Please infer from metadata or basic content if possible."

            # Call Claude
            message = client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": f"Document Type Hint: {doc_types[i]}\n\nDocument Text:\n{text[:15000]}"} # Limit text for token protection
                ]
            )
            
            # Parse JSON response
            extracted_json = json.loads(message.content[0].text)
            
            results.append({
                "file_path": path,
                "original_type": doc_types[i],
                "detected_type": extracted_json.get("document_type", doc_types[i]),
                "data": extracted_json,
                "status": "success"
            })
            
        except Exception as e:
            results.append({
                "file_path": path,
                "status": "error",
                "message": str(e)
            })
            
    return results
