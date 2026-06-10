import weaviate
from weaviate.classes.config import Configure

client = weaviate.connect_to_local()

if not client.collections.exists("Documents"):
    client.collections.create(
        name="Documents",
        vectorizer_config=Configure.Vectorizer.none()
    )

print("Collection ready!")

client.close()