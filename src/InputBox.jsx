import { useState } from "react";

export default function InputBox({ onSend }) {
  const [text, setText] = useState("");

  const send = () => {
    onSend(text);
    setText("");
  };

  return (
    <div className="flex gap-2 mt-4">
      <input
        className="flex-1 border p-2 rounded"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask something..."
      />

      <button
        onClick={send}
        className="bg-blue-500 text-white px-4 rounded"
      >
        Send
      </button>
    </div>
  );
}