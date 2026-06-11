import argparse
import os

import weaviate
from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from weaviate.classes.config import Configure

COLLECTION_NAME = "Documents"

embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)


def clear_collection(client):
    if client.collections.exists(COLLECTION_NAME):
        print("Clearing old documents from Weaviate...")
        client.collections.delete(COLLECTION_NAME)

    client.collections.create(
        name=COLLECTION_NAME,
        vectorizer_config=Configure.Vectorizer.none(),
    )
    print("Collection recreated (empty).")


def ingest_pdf(pdf_path: str, append: bool = False):
    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    client = weaviate.connect_to_local()

    try:
        if append:
            if not client.collections.exists(COLLECTION_NAME):
                client.collections.create(
                    name=COLLECTION_NAME,
                    vectorizer_config=Configure.Vectorizer.none(),
                )
        else:
            clear_collection(client)

        collection = client.collections.get(COLLECTION_NAME)
        source_name = os.path.basename(pdf_path)

        loader = PyPDFLoader(pdf_path)
        pages = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=150,
        )
        chunks = splitter.split_documents(pages)

        print(f"Ingesting: {pdf_path}")
        print(f"Total chunks: {len(chunks)}")

        for i, chunk in enumerate(chunks):
            text = chunk.page_content
            vector = embedding_model.embed_query(text)

            collection.data.insert(
                properties={
                    "text": text,
                    "page": float(chunk.metadata.get("page", 0)),
                    "source": source_name,
                },
                vector=vector,
            )

            if i % 10 == 0:
                print(f"Inserted {i} chunks")

        print(f"Done. Inserted {len(chunks)} chunks from {source_name}")
        if not append:
            print("Old documents were removed. Only this PDF is in the index now.")
    finally:
        client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Ingest a PDF into Weaviate for RAG search."
    )
    parser.add_argument(
        "pdf",
        nargs="?",
        default="data/CIS.pdf",
        help="Path to the PDF file (default: data/CIS.pdf)",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Add to existing data instead of replacing it",
    )
    args = parser.parse_args()

    ingest_pdf(args.pdf, append=args.append)
