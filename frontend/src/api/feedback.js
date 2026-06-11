const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function submitFeedback({ messageId, conversationId, versionIndex, rating, reason }) {
  return fetch(`${API_BASE}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message_id: messageId,
      conversation_id: conversationId,
      version_index: versionIndex,
      rating,
      reason,
    }),
  }).then(async (response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Failed to submit feedback (${response.status})`);
    }
    return response.json();
  });
}

export function clearFeedback(messageId, versionIndex) {
  return fetch(`${API_BASE}/api/feedback/${messageId}/${versionIndex}`, {
    method: "DELETE",
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to remove feedback (${response.status})`);
    }
    return response.json();
  });
}

export function fetchFeedback({ conversationId, messageId } = {}) {
  const params = new URLSearchParams();
  if (conversationId) params.set("conversation_id", conversationId);
  if (messageId) params.set("message_id", messageId);

  return fetch(`${API_BASE}/api/feedback?${params}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch feedback (${response.status})`);
    }
    return response.json();
  });
}
