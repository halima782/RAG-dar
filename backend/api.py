import json
import os
from datetime import datetime

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from bson import ObjectId

# 🔗 MongoDB collections (adjust db.py if needed)
from db import conversations_collection, feedback_collection, messages_collection


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
    regenerate: bool = False
    replace_message_id: str | None = None


class VersionSelectRequest(BaseModel):
    version_index: int


class FeedbackRequest(BaseModel):
    message_id: str
    conversation_id: str
    version_index: int = 0
    rating: str
    reason: str | None = None


NEGATIVE_FEEDBACK_REASONS = {
    "incorrect",
    "incomplete",
    "irrelevant",
    "citations",
    "other",
}


def serialize_version(version: dict) -> dict:
    created_at = version.get("createdAt")
    return {
        "content": version.get("content", ""),
        "citations": version.get("citations", []),
        "createdAt": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
    }


def get_message_versions(message: dict) -> list:
    versions = message.get("versions")
    if versions:
        return versions

    return [{
        "content": message.get("content", ""),
        "citations": message.get("citations", []),
        "createdAt": message.get("timestamp"),
    }]


def serialize_feedback(entry: dict) -> dict:
    created_at = entry.get("createdAt")
    updated_at = entry.get("updatedAt")
    return {
        "id": str(entry["_id"]),
        "messageId": entry["messageId"],
        "conversationId": entry["conversationId"],
        "versionIndex": entry.get("versionIndex", 0),
        "rating": entry["rating"],
        "reason": entry.get("reason"),
        "createdAt": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
        "updatedAt": updated_at.isoformat() if hasattr(updated_at, "isoformat") else updated_at,
    }


def get_feedback_for_message(message_id: str) -> list:
    entries = feedback_collection.find({"messageId": message_id}).sort("versionIndex", 1)
    return [serialize_feedback(entry) for entry in entries]


def serialize_message(m: dict) -> dict:
    versions = get_message_versions(m)
    active_index = m.get("activeVersionIndex", len(versions) - 1)
    active_index = max(0, min(active_index, len(versions) - 1))
    active = versions[active_index]
    message_id = str(m["_id"])

    payload = {
        "id": message_id,
        "conversationId": m["conversationId"],
        "sender": m["sender"],
        "content": active.get("content", m.get("content", "")),
        "citations": active.get("citations", m.get("citations", [])),
        "versions": [serialize_version(v) for v in versions],
        "activeVersionIndex": active_index,
        "timestamp": m["timestamp"],
    }

    if m.get("sender") == "ai":
        feedback_entries = get_feedback_for_message(message_id)
        payload["feedback"] = feedback_entries
        payload["activeFeedback"] = next(
            (entry for entry in feedback_entries if entry["versionIndex"] == active_index),
            None,
        )

    return payload


# =========================
# HEALTH CHECK
# =========================

@router.get("/api/health")
def health():
    return {"status": "ok"}


@router.get("/api/documents/{filename}")
def get_document(filename: str):
    safe_name = os.path.basename(filename)
    path = os.path.join("data", safe_name)

    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Document not found")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=safe_name,
    )


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
    feedback_collection.delete_many({"conversationId": conv_id})

    return {"message": "Conversation deleted"}


# =========================
# MESSAGES
# =========================

@router.get("/api/messages/{conversation_id}")
def get_messages(conversation_id: str):

    msgs = messages_collection.find({"conversationId": conversation_id}).sort("timestamp", 1)

    return [serialize_message(m) for m in msgs]


@router.patch("/api/messages/{message_id}/version")
def set_message_version(message_id: str, request: VersionSelectRequest):
    message = messages_collection.find_one({
        "_id": ObjectId(message_id),
        "sender": "ai",
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    versions = get_message_versions(message)
    version_index = request.version_index

    if version_index < 0 or version_index >= len(versions):
        raise HTTPException(status_code=400, detail="Invalid version index")

    selected = versions[version_index]
    messages_collection.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {
            "content": selected.get("content", ""),
            "citations": selected.get("citations", []),
            "activeVersionIndex": version_index,
        }},
    )

    return {
        "activeVersionIndex": version_index,
        "content": selected.get("content", ""),
        "citations": selected.get("citations", []),
        "versions": [serialize_version(v) for v in versions],
    }


# =========================
# FEEDBACK
# =========================

@router.post("/api/feedback")
def submit_feedback(request: FeedbackRequest):
    rating = request.rating.strip().lower()

    if rating not in {"good", "bad"}:
        raise HTTPException(status_code=400, detail="Rating must be 'good' or 'bad'")

    if rating == "bad":
        reason = (request.reason or "").strip().lower()
        if reason not in NEGATIVE_FEEDBACK_REASONS:
            raise HTTPException(
                status_code=400,
                detail="A valid reason is required for negative feedback",
            )
    else:
        reason = None

    message = messages_collection.find_one({
        "_id": ObjectId(request.message_id),
        "conversationId": request.conversation_id,
        "sender": "ai",
    })

    if not message:
        raise HTTPException(status_code=404, detail="AI message not found")

    versions = get_message_versions(message)
    if request.version_index < 0 or request.version_index >= len(versions):
        raise HTTPException(status_code=400, detail="Invalid version index")

    now = datetime.utcnow()
    payload = {
        "messageId": request.message_id,
        "conversationId": request.conversation_id,
        "versionIndex": request.version_index,
        "rating": rating,
        "reason": reason,
        "updatedAt": now,
    }

    result = feedback_collection.update_one(
        {
            "messageId": request.message_id,
            "versionIndex": request.version_index,
        },
        {"$set": payload, "$setOnInsert": {"createdAt": now}},
        upsert=True,
    )

    entry = feedback_collection.find_one({
        "messageId": request.message_id,
        "versionIndex": request.version_index,
    })

    return {
        "feedback": serialize_feedback(entry),
        "created": result.upserted_id is not None,
    }


@router.delete("/api/feedback/{message_id}/{version_index}")
def clear_feedback(message_id: str, version_index: int):
    result = feedback_collection.delete_one({
        "messageId": message_id,
        "versionIndex": version_index,
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return {"message": "Feedback removed"}


@router.get("/api/feedback")
def get_feedback(conversation_id: str | None = None, message_id: str | None = None):
    query = {}

    if conversation_id:
        query["conversationId"] = conversation_id
    if message_id:
        query["messageId"] = message_id

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Provide conversation_id and/or message_id",
        )

    entries = feedback_collection.find(query).sort("createdAt", -1)
    return [serialize_feedback(entry) for entry in entries]


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

    if not request.regenerate:
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
            from rag import get_rag_data, is_greeting, stream_ask_llm

            greeting = is_greeting(question)
            context, citations = ("", []) if greeting else get_rag_data(question)

            full_answer = ""

            for token in stream_ask_llm(question, context):
                full_answer += token
                yield f"data: {json.dumps({'token': token})}\n\n"

            if citations:
                yield f"data: {json.dumps({'citations': citations})}\n\n"

            now = datetime.utcnow()
            new_version = {
                "content": full_answer,
                "citations": citations,
                "createdAt": now,
            }

            versions = [new_version]
            active_index = 0
            message_id = request.replace_message_id

            if request.regenerate and request.replace_message_id:
                existing = messages_collection.find_one({
                    "_id": ObjectId(request.replace_message_id),
                    "conversationId": conversation_id,
                    "sender": "ai",
                })

                if existing:
                    versions = get_message_versions(existing)
                    versions.append(new_version)
                    active_index = len(versions) - 1

                    messages_collection.update_one(
                        {"_id": ObjectId(request.replace_message_id)},
                        {"$set": {
                            "content": full_answer,
                            "citations": citations,
                            "versions": versions,
                            "activeVersionIndex": active_index,
                            "timestamp": now,
                        }},
                    )
            else:
                result = messages_collection.insert_one({
                    "conversationId": conversation_id,
                    "sender": "ai",
                    "content": full_answer,
                    "citations": citations,
                    "versions": versions,
                    "activeVersionIndex": active_index,
                    "timestamp": now,
                })
                message_id = str(result.inserted_id)

            yield f"data: {json.dumps({
                'done': True,
                'messageId': message_id,
                'versions': [serialize_version(v) for v in versions],
                'activeVersionIndex': active_index,
            })}\n\n"

        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# =========================
# CONNECT ROUTER
# =========================

app.include_router(router)