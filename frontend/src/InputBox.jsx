import { useState } from "react";

export default function InputBox({ onSend, disabled }) {
  const [text, setText] = useState("");

  const send = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
  };

  return (
    <div data-tour="chat-input" className="flex gap-2 mt-4">
      <input
        className="flex-1 border p-2 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={disabled ? "AI is responding..." : "Ask something..."}
        disabled={disabled}
      />

      <button
        onClick={send}
        disabled={disabled || !text.trim()}
        className="bg-blue-500 text-white px-4 rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        {disabled ? "..." : "Send"}
      </button>
    </div>
  );
}
