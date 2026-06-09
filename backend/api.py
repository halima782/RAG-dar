import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rag import get_context, stream_ask_llm

app = FastAPI(title="Local RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/chat/stream")
def chat_stream(request: ChatRequest):
    question = request.question.strip()
    if not question:
        return StreamingResponse(
            iter([f"data: {json.dumps({'error': 'Question is required'})}\n\n"]),
            media_type="text/event-stream",
        )

    def event_generator():
        yield f"data: {json.dumps({'status': 'thinking'})}\n\n"

        try:
            context = get_context(question)
            for token in stream_ask_llm(question, context):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
