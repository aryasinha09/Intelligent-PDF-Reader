from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import os
from rag import RAGEngine

app = FastAPI(title="Intelligent PDF Reader API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_engine = RAGEngine()

class QuestionRequest(BaseModel):
    question: str
    session_id: str

class AnswerResponse(BaseModel):
    answer: str
    sources: list[str]

@app.get("/")
def root():
    return {"message": "Intelligent PDF Reader API is running!"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), session_id: str = "default"):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        chunk_count = rag_engine.process_pdf(tmp_path, session_id)
        return {
            "message": f"PDF processed successfully!",
            "filename": file.filename,
            "chunks": chunk_count,
            "session_id": session_id
        }
    finally:
        os.unlink(tmp_path)

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    if not rag_engine.has_session(request.session_id):
        raise HTTPException(status_code=404, detail="No PDF uploaded for this session. Please upload a PDF first.")
    
    result = rag_engine.answer_question(request.question, request.session_id)
    return result

@app.delete("/session/{session_id}")
def clear_session(session_id: str):
    rag_engine.clear_session(session_id)
    return {"message": "Session cleared"}
