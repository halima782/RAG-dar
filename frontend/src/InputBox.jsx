import { forwardRef } from "react";

const InputBox = forwardRef(function InputBox(
  { value, onChange, onSend, disabled, isEditing },
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
      className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4 safe-area-bottom shrink-0"
    >
      <input
        ref={ref}
        className="flex-1 min-w-0 border p-2.5 sm:p-2 rounded-lg text-base sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={
          disabled
            ? "AI is responding..."
            : isEditing
              ? "Edit your message and press Send..."
              : "Ask something..."
        }
        disabled={disabled}
      />

      <button
        onClick={send}
        disabled={disabled || !value.trim()}
        className="w-full sm:w-auto shrink-0 bg-blue-500 text-white px-4 py-2.5 sm:py-2 rounded-lg disabled:bg-blue-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors font-medium text-sm"
      >
        {disabled ? "..." : isEditing ? "Resend" : "Send"}
      </button>
    </div>
  );
});

export default InputBox;
