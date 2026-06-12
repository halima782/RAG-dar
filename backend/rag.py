import os
import random
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

# Weaviate cosine distance: lower = more similar. CIS questions ~0.02–0.20; off-topic ~0.45+.
RELEVANCE_DISTANCE_THRESHOLD = 0.38

UNKNOWN_ANSWER = "I don't know."


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
    if "cybersecurity" in q or "security posture" in q or "help enterprises" in q:
        return f"{question} CIS Controls safeguards benefits enterprise security"
    if "safeguard" in q or "prioritize" in q:
        return f"{question} CIS Controls safeguards implementation priority"
    return question


def _top_distance(docs) -> float | None:
    if not docs:
        return None
    metadata = getattr(docs[0], "metadata", None)
    return getattr(metadata, "distance", None) if metadata else None


def is_retrieval_relevant(question: str, docs) -> bool:
    if not docs:
        return False

    distance = _top_distance(docs)
    if distance is not None and distance > RELEVANCE_DISTANCE_THRESHOLD:
        return False

    keywords = _question_keywords(question)
    if not keywords:
        return distance is None or distance <= RELEVANCE_DISTANCE_THRESHOLD

    combined_text = " ".join(
        doc.properties.get("text", "").lower() for doc in docs[:5]
    )
    matches = sum(1 for keyword in keywords if keyword in combined_text)
    if matches == 0:
        return False

    if distance is not None and distance > 0.22 and matches < 2:
        return False

    return True


def get_rag_data(question: str, k: int = 5, regenerate: bool = False):
    if "implementation group" in question.lower():
        k = max(k, 8)

    fetch_k = k + 6 if regenerate else k
    docs = retrieve(expand_query(question), k=fetch_k)

    if not docs:
        return "", [], "no_documents"

    if not is_retrieval_relevant(question, docs):
        return "", [], "out_of_scope"

    if regenerate and len(docs) > k:
        offset = random.randint(0, min(3, len(docs) - k))
        docs = docs[offset : offset + k]
    else:
        docs = docs[:k]

    chunks = []
    citations = []

    for i, doc in enumerate(docs, 1):
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
    return context, citations, "ok"


def get_context(question: str, k: int = 5) -> str:
    context, _, _ = get_rag_data(question, k=k)
    return context


def no_context_message(retrieval_status: str) -> str:
    return UNKNOWN_ANSWER


def ensure_inline_citation_suffix(answer: str, citations: list) -> str:
    if not citations or is_weak_answer(answer) or re.search(r"\[\d+\]", answer):
        return ""
    return "".join(f" [{cite['id']}]" for cite in citations)


def format_citations(citations: list) -> str:
    if not citations:
        return ""

    lines = ["\n\n**Sources:**"]
    for cite in citations:
        page_str = f", p. {cite['page']}" if cite.get("page") else ""
        lines.append(f"- [{cite['id']}] {cite['source']}{page_str}")

    return "\n".join(lines)


def build_prompt(question: str, context: str, regenerate: bool = False) -> str:
    variation = (
        "Provide a fresh alternative answer with different wording than before. "
        if regenerate
        else ""
    )

    if wants_list(question):
        prefix = (
            f"{variation}"
            "Read the context and answer the question as a bullet list. "
            "Each item must start with a dash (-). "
            "Include all relevant items from the context.\n\n"
            "Context:\n"
        )
    else:
        prefix = (
            f"{variation}"
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


def build_list_from_context(context: str, question: str, shuffle: bool = False) -> str:
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

    selected = bullets[:12]
    if shuffle and len(selected) > 1:
        random.shuffle(selected)
    return "\n".join(selected)


def has_bullet_list(text: str) -> bool:
    return text.strip().startswith("-") or "\n-" in text or text.count("\n- ") >= 1


def needs_list_fallback(question: str, answer: str) -> bool:
    if not wants_list(question):
        return False

    text = answer.strip()
    if len(text) < 25:
        return True

    return not has_bullet_list(text)


WEAK_ANSWERS = {".", "-", "...", "n/a", "na", "none", "unknown", "yes", "no"}


def is_weak_answer(answer: str) -> bool:
    text = answer.strip().lower()
    if not text:
        return True
    if text in WEAK_ANSWERS:
        return True
    if len(text) < 25:
        return True
    return False


def _question_keywords(question: str) -> list[str]:
    stopwords = {
        "what", "which", "when", "where", "does", "help", "about", "from",
        "with", "that", "this", "their", "your", "into", "through", "using",
        "give", "tell", "show", "list", "name", "please", "should", "would",
        "could", "have", "been", "being", "were", "they", "them", "than",
        "then", "also", "just", "only", "very", "more", "most", "some",
        "such", "many", "much", "like", "make", "made",
    }
    return [
        word
        for word in re.findall(r"[a-z0-9]{4,}", question.lower())
        if word not in stopwords
    ]


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text)
    return [part.strip() for part in parts if len(part.strip()) > 30]


def build_answer_from_context(context: str, question: str, regenerate: bool = False) -> str:
    keywords = _question_keywords(question)
    sentences = _split_sentences(context)
    if not sentences:
        return ""

    scored = []
    for sentence in sentences:
        lower = sentence.lower()
        score = sum(1 for keyword in keywords if keyword in lower)
        if "cis" in question.lower() and "cis" in lower:
            score += 2
        if score > 0:
            scored.append((score, sentence))

    if not scored:
        scored = [(0, sentence) for sentence in sentences[:6]]

    scored.sort(key=lambda item: item[0], reverse=True)
    selected = [sentence for _, sentence in scored[:4]]

    if regenerate and len(selected) > 1:
        random.shuffle(selected)

    if wants_list(question) or len(selected) > 1:
        return "\n".join(f"- {sentence}" for sentence in selected)

    return selected[0][:500]


def enhance_answer(question: str, answer: str, context: str, regenerate: bool = False) -> str:
    answer = answer.strip()

    if needs_list_fallback(question, answer):
        fallback = build_list_from_context(context, question, shuffle=regenerate)
        if fallback:
            return fallback

    if is_weak_answer(answer) and context.strip():
        fallback = build_answer_from_context(context, question, regenerate)
        if fallback:
            return fallback

        fallback = build_list_from_context(context, question, shuffle=regenerate)
        if fallback:
            return fallback

        sentences = _split_sentences(context)
        if sentences:
            if regenerate and len(sentences) > 1:
                return random.choice(sentences[:5])[:400]
            return sentences[0][:400]

        return UNKNOWN_ANSWER

    if is_weak_answer(answer):
        return UNKNOWN_ANSWER

    return answer


def generate_answer(prompt: str, regenerate: bool = False) -> str:
    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    ).to(device)

    generation_kwargs = {
        **inputs,
        "max_new_tokens": 300 if "bullet list" in prompt else 256,
        "num_beams": 4 if not regenerate else 1,
        "early_stopping": True,
    }

    if regenerate:
        generation_kwargs.update({
            "do_sample": True,
            "temperature": 0.9,
            "top_p": 0.92,
        })
    else:
        generation_kwargs["do_sample"] = False

    outputs = model.generate(**generation_kwargs)

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def ask_llm(question: str, context: str, regenerate: bool = False) -> str:
    if is_greeting(question):
        return "Hi!"

    if not context.strip():
        return no_context_message("no_documents")

    raw = generate_answer(build_prompt(question, context, regenerate), regenerate)
    return enhance_answer(question, raw, context, regenerate)


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


def stream_ask_llm(
    question: str,
    context: str,
    regenerate: bool = False,
    retrieval_status: str = "ok",
):
    if is_greeting(question):
        greeting = random.choice(["Hi!", "Hello!", "Hey there!"]) if regenerate else "Hi!"
        yield from stream_text(greeting)
        return

    if not context.strip():
        yield no_context_message(retrieval_status)
        return

    raw = generate_answer(build_prompt(question, context, regenerate), regenerate)
    final = enhance_answer(question, raw, context, regenerate)
    yield from stream_text(final)
