import { useEffect, useState } from "react";
import { streamChat } from "./api/chat";
import { fetchMessages, mapApiMessage } from "./api/conversations";
import { useAutoScroll } from "./hooks/useAutoScroll";
import Message from "./Message";
import InputBox from "./InputBox";

const WELCOME_MESSAGE = {
  role: "ai",
  text: "Hello! I am your local AI. Ask me anything about your documents.",
};

export default function ChatBox({ conversationId, onTitleUpdate }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { containerRef, handleScroll, enableAutoScroll } = useAutoScroll(
    messages,
    !isLoadingHistory
  );

  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    async function loadHistory() {
      setIsLoadingHistory(true);

      try {
        const data = await fetchMessages(conversationId);
        if (cancelled) return;

        if (data.length === 0) {
          setMessages([WELCOME_MESSAGE]);
        } else {
          setMessages(data.map(mapApiMessage));
        }
      } catch {
        if (!cancelled) {
          setMessages([
            {
              role: "ai",
              text: "Could not load conversation history. You can still send a new message.",
              isError: true,
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const updateLastAiMessage = (updater) => {
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.length - 1;
      if (lastIndex >= 0 && next[lastIndex].role === "ai") {
        next[lastIndex] = updater(next[lastIndex]);
      }
      return next;
    });
  };

  const handleSend = async (input) => {
    const question = input.trim();
    if (!question || isLoading || !conversationId) return;

    enableAutoScroll();

    const userMsg = { role: "user", text: question };
    const aiPlaceholder = { role: "ai", text: "", isThinking: true };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    setIsLoading(true);

    await streamChat(conversationId, question, {
      onThinking: () => {
        updateLastAiMessage((msg) => ({ ...msg, isThinking: true }));
      },
      onToken: (token) => {
        updateLastAiMessage((msg) => ({
          ...msg,
          text: msg.text + token,
          isThinking: false,
          isStreaming: true,
        }));
      },
      onDone: () => {
        updateLastAiMessage((msg) => ({
          ...msg,
          isThinking: false,
          isStreaming: false,
        }));
        setIsLoading(false);
        onTitleUpdate?.(conversationId, question);
      },
      onError: (error) => {
        updateLastAiMessage((msg) => ({
          ...msg,
          text: msg.text || `Sorry, something went wrong: ${error.message}`,
          isThinking: false,
          isStreaming: false,
          isError: true,
        }));
        setIsLoading(false);
      },
    });
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select or start a conversation
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div
        ref={containerRef}
        data-tour="chat-area"
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        {isLoadingHistory ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading messages...</p>
        ) : (
          messages.map((m, i) => (
            <Message
              key={m.id ?? i}
              role={m.role}
              text={m.text}
              isThinking={m.isThinking}
              isStreaming={m.isStreaming}
              isError={m.isError}
            />
          ))
        )}
      </div>

      <InputBox onSend={handleSend} disabled={isLoading || isLoadingHistory} />
    </div>
  );
}
