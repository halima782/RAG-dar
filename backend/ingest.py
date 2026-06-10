import weaviate
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)

client = weaviate.connect_to_local()
collection = client.collections.get("Documents")

pdf_path = "data/CIS.pdf"
loader = PyPDFLoader(pdf_path)
pages = loader.load()

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150
)

chunks = splitter.split_documents(pages)

print(f"Total chunks: {len(chunks)}")

count = 0

for i, chunk in enumerate(chunks):

    text = chunk.page_content
    vector = embedding_model.embed_query(text)

    collection.data.insert(
        properties={
            "text": text,
            "page": float(chunk.metadata.get("page", 0))
        },
        vector=vector
    )

    count += 1

    if i % 10 == 0:
        print(f"Inserted {i} chunks")

print(f"✅ Total inserted: {count}")

client.close()