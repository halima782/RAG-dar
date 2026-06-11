const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function streamChat(
  conversationId,
  question,
  { regenerate = false, replaceMessageId = null, onThinking, onToken, onCitations, onDone, onError } = {}
) {
  let response;

  try {
    response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        question,
        regenerate,
        replace_message_id: replaceMessageId,
      }),
    });
  } catch (error) {
    onError?.(error);
    return;
  }

  if (!response.ok) {
    onError?.(new Error(`Request failed (${response.status})`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = JSON.parse(line.slice(6));

        if (data.error) {
          onError?.(new Error(data.error));
          return;
        }

        if (data.status === "thinking") {
          onThinking?.();
        } else if (data.token) {
          onToken?.(data.token);
        } else if (data.citations) {
          onCitations?.(data.citations);
        } else if (data.done) {
          onDone?.({
            messageId: data.messageId,
            versions: data.versions,
            activeVersionIndex: data.activeVersionIndex,
          });
        }
      }
    }
  } catch (error) {
    onError?.(error);
  }
}
