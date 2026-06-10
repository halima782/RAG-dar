import os

from pymongo import ASCENDING, DESCENDING, MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "ai_chat_db")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

conversations_collection = db["conversations"]
messages_collection = db["messages"]

conversations_collection.create_index([("createdAt", DESCENDING)])
messages_collection.create_index([("conversationId", ASCENDING), ("timestamp", ASCENDING)])
