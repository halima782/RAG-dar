import { useEffect } from "react";
import { APP_NAME } from "../constants/branding";
import { SUGGESTED_QUESTIONS } from "../constants/suggestedQuestions";
import InputBox from "../InputBox";

function SparkleIcon() {
  return (
    <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    </svg>
  );
}

export default function ChatLanding({ onSuggestedQuestion, onReady, isStarting }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 chat-surface lg:rounded-tl-3xl">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 shrink-0 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-800 tracking-tight">
            {APP_NAME}
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Ask questions about your CIS documentation
          </p>
        </div>
      </div>

      <div
        data-tour="chat-area"
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-3 sm:px-6 py-6 sm:py-10"
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start gap-3 mb-8">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <SparkleIcon />
            </div>
            <div className="rounded-2xl rounded-bl-md bg-white border border-slate-200/80 shadow-sm px-4 py-3 text-sm text-slate-700 leading-relaxed">
              Hello! I am your local AI assistant. Start with a suggested question below or type
              your own.
            </div>
          </div>

          <div data-tour="suggested-questions">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Suggested questions
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isStarting}
                  onClick={() => onSuggestedQuestion(question)}
                  className="text-left text-sm text-slate-700 bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-900 rounded-xl px-4 py-3 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 sm:px-6 pb-3 sm:pb-4 pt-2 bg-gradient-to-t from-slate-100 to-transparent">
        <InputBox
          value=""
          onChange={() => {}}
          onSend={() => {}}
          disabled
          placeholder="Pick a suggested question to start a new chat"
        />
      </div>
    </div>
  );
}
