import os
import re
from threading import Thread

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, TextIteratorStreamer

from retriever import retrieve

model_name = "google/flan-t5-base"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = model.to(device)

GREETINGS = {
    "hi", "hello", "hey", "hiya", "howdy", "yo", "sup",
    "hi there", "hello there", "hey there",
    "good morning", "good afternoon", "good evening",
}

LIST_TRIGGERS = (
    "list", "enumerate", "what are the", "what are", "name all",
    "types of", "implementation group", "give me", "show me",
)


def is_greeting(question: str) -> bool:
    text = question.strip().lower().rstrip("!.?, ")
    return text in GREETINGS


def wants_list(question: str) -> bool:
    q = question.lower()
    return any(trigger in q for trigger in LIST_TRIGGERS)


def expand_query(question: str) -> str:
    q = question.lower()
    if "implementation group" in q:
        return f"{question} Implementation Group IG1 IG2 IG3 CIS Controls enterprise"
    if wants_list(question):
        return f"{question} list items CIS Controls"
    return question


def get_rag_data(question: str, k: int = 5):
    if "implementation group" in question.lower():
        k = max(k, 8)
    docs = retrieve(expand_query(question), k=k)
    chunks = []
    citations = []

    for i, doc in enumerate(docs[:k], 1):
        props = doc.properties
        text = props.get("text", "").strip()
        if not text:
            continue

        source = props.get("source", "Document")
        page = props.get("page")
        page_num = int(page) + 1 if page is not None else None

        chunks.append(text)
        snippet = text[:280] + ("..." if len(text) > 280 else "")

        title = f"{os.path.splitext(source)[0]} Documentation"
        url = f"/api/documents/{source}"
        if page_num:
            url += f"#page={page_num}"

        citations.append({
            "id": i,
            "source": source,
            "title": title,
            "url": url,
            "page": page_num,
            "snippet": snippet,
            "text": text,
        })

    context = "\n\n".join(chunks)
    return context, citations


def get_context(question: str, k: int = 5) -> str:
    context, _ = get_rag_data(question, k=k)
    return context


def format_citations(citations: list) -> str:
    if not citations:
        return ""

    lines = ["\n\n**Sources:**"]
    for cite in citations:
        page_str = f", p. {cite['page']}" if cite.get("page") else ""
        lines.append(f"- [{cite['id']}] {cite['source']}{page_str}")

    return "\n".join(lines)


def build_prompt(question: str, context: str) -> str:
    if wants_list(question):
        prefix = (
            "Read the context and answer the question as a bullet list. "
            "Each item must start with a dash (-). "
            "Include all relevant items from the context.\n\n"
            "Context:\n"
        )
    else:
        prefix = (
            "Answer the question using only the context below. "
            "Give a clear and complete answer. "
            "Cite sources inline using [1], [2], etc.\n\n"
            "Context:\n"
        )

    suffix = f"\n\nQuestion: {question}\n\nAnswer:"

    reserved_tokens = len(tokenizer.encode(prefix + suffix, add_special_tokens=False))
    max_context_tokens = max(128, 512 - reserved_tokens - 16)

    context_tokens = tokenizer.encode(context, add_special_tokens=False)
    if len(context_tokens) > max_context_tokens:
        context = tokenizer.decode(
            context_tokens[:max_context_tokens],
            skip_special_tokens=True,
        )

    return prefix + context + suffix


def extract_implementation_groups(context: str) -> str:
    bullets = []

    ig1 = re.search(r"An IG1 enterprise[^.]+\.", context, re.I | re.DOTALL)
    ig2 = re.search(r"An IG2 enterprise[^.]+\.", context, re.I | re.DOTALL)
    ig3 = re.search(r"An IG3 enterprise[^.]+\.", context, re.I | re.DOTALL)

    if ig1:
        desc = ig1.group().replace("An IG1 enterprise", "").strip().rstrip(".")
        bullets.append(f"- **IG1 (Implementation Group 1):** {desc}.")

    if ig2:
        desc = ig2.group().replace("An IG2 enterprise", "").strip().rstrip(".")
        bullets.append(f"- **IG2 (Implementation Group 2):** {desc}.")
    elif re.search(r"IG2 includes IG1", context, re.I):
        bullets.append(
            "- **IG2 (Implementation Group 2):** Builds upon IG1 — includes all IG1 "
            "safeguards plus additional controls for enterprises with more IT resources."
        )

    if ig3:
        desc = ig3.group().replace("An IG3 enterprise", "").strip().rstrip(".")
        includes = re.search(r"IG3\s*\(([^)]+)\)", context, re.I)
        label = "IG3 (Implementation Group 3)"
        if includes:
            label += f" — {includes.group(1)}"
        bullets.append(f"- **{label}:** {desc}.")
    elif re.search(r"IG3 includes all CIS|IG3 includes IG1", context, re.I):
        bullets.append(
            "- **IG3 (Implementation Group 3):** Includes all IG1 and IG2 safeguards — "
            "for enterprises with security experts and sensitive or regulated data."
        )

    return "\n".join(bullets)


def build_list_from_context(context: str, question: str) -> str:
    q_lower = question.lower()

    if "implementation group" in q_lower:
        ig_list = extract_implementation_groups(context)
        if ig_list:
            return ig_list

    bullets = []
    seen = set()

    for line in context.split("\n"):
        line = line.strip().lstrip("-• ").strip()
        if len(line) < 10:
            continue

        if re.match(r"^[\d]+\.\s+", line) or re.match(r"^IG[123]\b", line, re.I):
            key = line[:120]
            if key not in seen:
                seen.add(key)
                bullets.append(f"- {line}")

    if not bullets:
        keywords = [
            w for w in re.findall(r"[a-z]{4,}", q_lower)
            if w not in {"list", "give", "what", "tell", "show", "from", "about", "please", "implementation", "groups"}
        ]
        for line in context.split("\n"):
            line = line.strip()
            if len(line) < 20 or len(line) > 200:
                continue
            lower = line.lower()
            if keywords and any(k in lower for k in keywords):
                key = line[:120]
                if key not in seen:
                    seen.add(key)
                    bullets.append(f"- {line}")

    return "\n".join(bullets[:12])


def has_bullet_list(text: str) -> bool:
    return text.strip().startswith("-") or "\n-" in text or text.count("\n- ") >= 1


def needs_list_fallback(question: str, answer: str) -> bool:
    if not wants_list(question):
        return False

    text = answer.strip()
    if len(text) < 25:
        return True

    return not has_bullet_list(text)


def enhance_answer(question: str, answer: str, context: str) -> str:
    answer = answer.strip()

    if needs_list_fallback(question, answer):
        fallback = build_list_from_context(context, question)
        if fallback:
            return fallback

    if not answer and context.strip():
        fallback = build_list_from_context(context, question)
        if fallback:
            return fallback
        sentences = [s.strip() for s in re.split(r"[.!?]\s+", context) if len(s.strip()) > 20]
        if sentences:
            return sentences[0][:400]

    return answer


def generate_answer(prompt: str) -> str:
    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    ).to(device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=300 if "bullet list" in prompt else 256,
        do_sample=False,
        num_beams=1,
    )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def ask_llm(question: str, context: str) -> str:
    if is_greeting(question):
        return "Hi!"

    if not context.strip():
        return (
            "I could not find relevant information in your documents. "
            "Please make sure Weaviate is running and you have ingested a PDF "
            "(run: python ingest.py data/your-file.pdf)."
        )

    raw = generate_answer(build_prompt(question, context))
    return enhance_answer(question, raw, context)


def stream_text(text: str):
    for char in text:
        yield char


def stream_generate_answer(prompt: str):
    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    ).to(device)
    streamer = TextIteratorStreamer(tokenizer, skip_special_tokens=True)

    generation_kwargs = {
        **inputs,
        "max_new_tokens": 300 if "bullet list" in prompt else 256,
        "do_sample": False,
        "num_beams": 1,
        "streamer": streamer,
    }

    thread = Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    for token in streamer:
        yield token

    thread.join()


def stream_ask_llm(question: str, context: str):
    if is_greeting(question):
        yield from stream_text("Hi!")
        return

    if not context.strip():
        yield (
            "I could not find relevant information in your documents. "
            "Please make sure Weaviate is running and you have ingested a PDF "
            "(run: python ingest.py data/your-file.pdf)."
        )
        return

    raw = generate_answer(build_prompt(question, context))
    final = enhance_answer(question, raw, context)
    yield from stream_text(final)
