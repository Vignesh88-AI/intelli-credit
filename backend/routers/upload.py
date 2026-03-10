from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import shutil
import uuid
from typing import List

router = APIRouter(prefix="/api")

UPLOAD_DIR = "/tmp/uploads"

@router.post("/upload")
async def upload_files(
    entity_id: str = Form(...),
    files: List[UploadFile] = File(...),
    doc_types: List[str] = Form(...)
):
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    
    entity_upload_dir = os.path.join(UPLOAD_DIR, entity_id)
    if not os.path.exists(entity_upload_dir):
        os.makedirs(entity_upload_dir)
    
    response_data = []
    
    # doc_types should correspond to files. If not, we might need a different matching logic or just trust the order.
    # In a real app, we'd probably send one by one or use a more robust mapping.
    # For now, we'll assume the frontend sends them in a way we can match.
    
    for i, file in enumerate(files):
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        saved_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(entity_upload_dir, saved_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        response_data.append({
            "file_id": file_id,
            "filename": file.filename,
            "size": os.path.getsize(file_path),
            "doc_type": doc_types[i] if i < len(doc_types) else "unknown",
            "path": file_path,
            "status": "uploaded"
        })
        
    return response_data
