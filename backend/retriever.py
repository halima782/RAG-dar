import weaviate
from langchain_huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)

client = None
collection = None


def connect_weaviate():
    global client, collection
    if client is None:
        client = weaviate.connect_to_local()
        collection = client.collections.get("Documents")


def retrieve(query, k=5):
    connect_weaviate()  # 🔥 lazy connect

    vector = embedding_model.embed_query(query)

    response = collection.query.near_vector(
        near_vector=vector,
        limit=k
    )

    return response.objects