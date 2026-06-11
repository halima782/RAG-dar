import { forwardRef } from "react";
import { APP_NAME } from "./constants/branding";

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

const InputBox = forwardRef(function InputBox(
  { value, onChange, onSend, disabled, isEditing, placeholder },
  ref
) {
  const send = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    onChange("");
  };

  return (
    <div
      data-tour="chat-input"
      className="flex items-end gap-2 safe-area-bottom max-w-3xl mx-auto w-full"
    >
      <div className="flex-1 min-w-0 flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl shadow-lg shadow-slate-200/50 px-4 py-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all">
        <input
          ref={ref}
          className="flex-1 min-w-0 bg-transparent py-2 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            placeholder ??
            (disabled
              ? "AI is responding..."
              : isEditing
                ? "Edit your message and press Send..."
                : `Message ${APP_NAME}...`)
          }
          disabled={disabled}
        />
      </div>

      <button
        onClick={send}
        disabled={disabled || !value.trim()}
        className="shrink-0 w-11 h-11 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
        aria-label={isEditing ? "Resend" : "Send"}
      >
        {disabled ? (
          <span className="text-xs font-medium">...</span>
        ) : (
          <SendIcon />
        )}
      </button>
    </div>
  );
});

export default InputBox;
