export default function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="AI is thinking">
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
