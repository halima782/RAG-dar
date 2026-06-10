import ReactMarkdown from "react-markdown";
import ThinkingDots from "./components/ThinkingDots";

export default function Message({ role, text, isThinking, isStreaming, isError }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`max-w-[70%] p-3 rounded-lg ${
          isUser
            ? "bg-blue-500 text-white"
            : isError
              ? "bg-red-100 text-red-900 border border-red-200"
              : "bg-gray-200 text-black"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : isThinking && !text ? (
          <ThinkingDots />
        ) : (
          <div className="markdown-body text-sm leading-relaxed">
            <ReactMarkdown>{text}</ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-gray-500 animate-pulse align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
