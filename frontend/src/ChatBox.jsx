import { useRef, useState } from "react";
import { streamChat } from "./api/chat";
import Message from "./Message";
import InputBox from "./InputBox";

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! I am your local AI. Ask me anything about your documents." },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    if (!question || isLoading) return;

    const userMsg = { role: "user", text: question };
    const aiPlaceholder = { role: "ai", text: "", isThinking: true };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    setIsLoading(true);

    await streamChat(question, {
      onThinking: () => {
        updateLastAiMessage((msg) => ({ ...msg, isThinking: true }));
        scrollToBottom();
      },
      onToken: (token) => {
        updateLastAiMessage((msg) => ({
          ...msg,
          text: msg.text + token,
          isThinking: false,
          isStreaming: true,
        }));
        scrollToBottom();
      },
      onDone: () => {
        updateLastAiMessage((msg) => ({
          ...msg,
          isThinking: false,
          isStreaming: false,
        }));
        setIsLoading(false);
        scrollToBottom();
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
        scrollToBottom();
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div className="flex-1 overflow-y-auto">
        {messages.map((m, i) => (
          <Message
            key={i}
            role={m.role}
            text={m.text}
            isThinking={m.isThinking}
            isStreaming={m.isStreaming}
            isError={m.isError}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <InputBox onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
