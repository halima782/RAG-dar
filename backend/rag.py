from threading import Thread

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, TextIteratorStreamer

from retriever import retrieve

model_name = "google/flan-t5-base"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)


def build_prompt(question: str, context: str) -> str:
    return f"""
Answer ONLY using the context.

Context:
{context}

Question:
{question}

Answer:
"""


def generate_answer(prompt: str) -> str:
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True).to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=200,
        do_sample=True,
        temperature=0.3,
    )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def ask_llm(question: str, context: str) -> str:
    return generate_answer(build_prompt(question, context))


def stream_generate_answer(prompt: str):
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True).to(device)
    streamer = TextIteratorStreamer(tokenizer, skip_special_tokens=True)

    generation_kwargs = {
        **inputs,
        "max_new_tokens": 200,
        "do_sample": True,
        "temperature": 0.3,
        "streamer": streamer,
    }

    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    for token in streamer:
        yield token

    thread.join()


def stream_ask_llm(question: str, context: str):
    yield from stream_generate_answer(build_prompt(question, context))


def get_context(question: str, k: int = 3) -> str:
    docs = retrieve(question)
    return "\n\n".join(d.properties["text"] for d in docs[:k])
