from rag import ask_llm, get_context


def chat():
    print("\n🤖 Local RAG Chatbot Ready (FULLY LOCAL)\n")

    while True:
        q = input("You: ")

        if q.lower() in ["exit", "quit"]:
            break

        context = get_context(q)
        answer = ask_llm(q, context)

        print("\nAI:", answer)
        print("\n" + "-" * 50)


if __name__ == "__main__":
    chat()
