const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.json();
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
  return {
    id: msg.id,
    role: msg.sender === "user" ? "user" : "ai",
    text: msg.content,
  };
}
