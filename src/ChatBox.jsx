import { useState } from "react";
import Message from "./Message";
import InputBox from "./InputBox";

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! I am your local AI 🤖" }
  ]);

  const fakeResponses = [
    "I am thinking...",
    "Interesting question!",
    "Based on local data, yes.",
    "I don't know, but I will learn 😄",
    "TCP is a protocol for network communication."
  ];

  const handleSend = (input) => {
    if (!input) return;

    const userMsg = { role: "user", text: input };

    const aiMsg = {
      role: "ai",
      text: fakeResponses[Math.floor(Math.random() * fakeResponses.length)]
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
  };

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {messages.map((m, i) => (
        <Message key={i} role={m.role} text={m.text} />
      ))}

      <InputBox onSend={handleSend} />
    </div>
  );
}