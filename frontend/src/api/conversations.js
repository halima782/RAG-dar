const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Backend is not responding. Is it running on port 8000?");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchConversations() {
  return request("/api/conversations");
}

export function createConversation() {
  return request("/api/conversations", { method: "POST" });
}

export function deleteConversation(conversationId) {
  return request(`/api/conversations/${conversationId}`, { method: "DELETE" });
}

export function fetchMessages(conversationId) {
  return request(`/api/messages/${conversationId}`);
}

export function mapApiMessage(msg) {
  const versions = msg.versions?.length
    ? msg.versions.map((version) => ({
        content: version.content,
        citations: version.citations ?? [],
        createdAt: version.createdAt,
      }))
    : [{ content: msg.content, citations: msg.citations ?? [] }];

  const activeVersionIndex = msg.activeVersionIndex ?? versions.length - 1;

  return {
    id: msg.id,
    role: msg.sender === "user" ? "user" : "ai",
    text: msg.content,
    citations: msg.citations ?? [],
    versions,
    activeVersionIndex,
    feedback: msg.feedback ?? [],
    activeFeedback: msg.activeFeedback ?? null,
  };
}
