import json
from datetime import datetime

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId

from rag import get_context, stream_ask_llm

# 🔗 MongoDB collections (adjust db.py if needed)
from db import conversations_collection, messages_collection


# =========================
# APP + ROUTER SETUP
# =========================

app = FastAPI(title="Local RAG API")
router = APIRouter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# MODELS
# =========================

class ChatRequest(BaseModel):
    conversation_id: str
    question: str


# =========================
# HEALTH CHECK
# =========================

@router.get("/api/health")
def health():
    return {"status": "ok"}


# =========================
# CONVERSATIONS
# =========================

@router.post("/api/conversations")
def create_conversation():
    conv = {
        "title": "New Chat",
        "createdAt": datetime.utcnow()
    }

    result = conversations_collection.insert_one(conv)

    return {
        "conversation_id": str(result.inserted_id),
        "title": conv["title"]
    }


@router.get("/api/conversations")
def get_conversations():
    conversations = []

    for c in conversations_collection.find().sort("createdAt", -1):
        conversations.append({
            "id": str(c["_id"]),
            "title": c["title"],
            "createdAt": c["createdAt"]
        })

    return conversations


@router.delete("/api/conversations/{conv_id}")
def delete_conversation(conv_id: str):

    conversations_collection.delete_one({"_id": ObjectId(conv_id)})
    messages_collection.delete_many({"conversationId": conv_id})

    return {"message": "Conversation deleted"}


# =========================
# MESSAGES
# =========================

@router.get("/api/messages/{conversation_id}")
def get_messages(conversation_id: str):

    msgs = messages_collection.find({"conversationId": conversation_id}).sort("timestamp", 1)

    return [
        {
            "id": str(m["_id"]),
            "conversationId": m["conversationId"],
            "sender": m["sender"],
            "content": m["content"],
            "timestamp": m["timestamp"]
        }
        for m in msgs
    ]


# =========================
# STREAM CHAT (RAG + MEMORY)
# =========================

@router.post("/api/chat/stream")
def chat_stream(request: ChatRequest):

    question = request.question.strip()
    conversation_id = request.conversation_id

    if not question:
        return StreamingResponse(
            iter([f"data: {json.dumps({'error': 'Question is required'})}\n\n"]),
            media_type="text/event-stream",
        )

    # 💾 Save user message
    messages_collection.insert_one({
        "conversationId": conversation_id,
        "sender": "user",
        "content": question,
        "timestamp": datetime.utcnow()
    })

    title = question if len(question) <= 50 else f"{question[:50]}..."
    conversations_collection.update_one(
        {"_id": ObjectId(conversation_id), "title": "New Chat"},
        {"$set": {"title": title}},
    )

    def event_generator():
        yield f"data: {json.dumps({'status': 'thinking'})}\n\n"

        try:
            # 🔍 RAG context retrieval
            context = get_context(question)

            full_answer = ""

            # 🤖 Stream LLM response
            for token in stream_ask_llm(question, context):
                full_answer += token
                yield f"data: {json.dumps({'token': token})}\n\n"

            # 💾 Save AI message
            messages_collection.insert_one({
                "conversationId": conversation_id,
                "sender": "ai",
                "content": full_answer,
                "timestamp": datetime.utcnow()
            })

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# =========================
# CONNECT ROUTER
# =========================

app.include_router(router)