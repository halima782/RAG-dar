import { useEffect, useRef, useState } from "react";
import { streamChat } from "./api/chat";
import { fetchMessages, mapApiMessage } from "./api/conversations";
import { clearFeedback, submitFeedback } from "./api/feedback";
import { setMessageVersion } from "./api/messages";
import { normalizeVersions } from "./utils/messageVersions";
import {
  exportConversationPdf,
  getExportableMessages,
} from "./utils/exportConversationPdf";
import { useAutoScroll } from "./hooks/useAutoScroll";
import Message from "./Message";
import InputBox from "./InputBox";

function ExportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

const WELCOME_MESSAGE = {
  role: "ai",
  text: "Hello! I am your local AI. Ask me anything about your documents.",
};

export default function ChatBox({ conversationId, conversationTitle, onTitleUpdate }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  const exportableCount = getExportableMessages(messages).length;
  const canExport = exportableCount > 0 && !isLoadingHistory && !isLoading;

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

  const updateAiMessageAt = (aiIndex, updater) => {
    setMessages((prev) => {
      const next = [...prev];
      if (aiIndex >= 0 && aiIndex < next.length && next[aiIndex].role === "ai") {
        next[aiIndex] = updater(next[aiIndex]);
      }
      return next;
    });
  };

  const updateLastAiMessage = (updater) => {
    setMessages((prev) => {
      const lastIndex = prev.length - 1;
      if (lastIndex < 0 || prev[lastIndex].role !== "ai") return prev;
      const next = [...prev];
      next[lastIndex] = updater(next[lastIndex]);
      return next;
    });
  };

  const getPrecedingUserQuestion = (messageList, aiIndex) => {
    for (let i = aiIndex - 1; i >= 0; i -= 1) {
      if (messageList[i].role === "user") return messageList[i].text;
    }
    return null;
  };

  const runStream = async (question, aiIndex, { regenerate = false, replaceMessageId = null } = {}) => {
    await streamChat(conversationId, question, {
      regenerate,
      replaceMessageId,
      onThinking: () => {
        updateAiMessageAt(aiIndex, (msg) => ({ ...msg, isThinking: true }));
      },
      onToken: (token) => {
        updateAiMessageAt(aiIndex, (msg) => ({
          ...msg,
          text: msg.text + token,
          isThinking: false,
          isStreaming: true,
          isError: false,
        }));
      },
      onCitations: (citations) => {
        updateAiMessageAt(aiIndex, (msg) => ({
          ...msg,
          citations,
        }));
      },
      onDone: (meta) => {
        updateAiMessageAt(aiIndex, (msg) => ({
          ...msg,
          isThinking: false,
          isStreaming: false,
          ...(meta?.messageId && { id: meta.messageId }),
          ...(meta?.versions && {
            versions: meta.versions.map((version) => ({
              content: version.content,
              citations: version.citations ?? [],
              createdAt: version.createdAt,
            })),
            activeVersionIndex: meta.activeVersionIndex ?? 0,
          }),
        }));
        setIsLoading(false);
        if (!regenerate) {
          onTitleUpdate?.(conversationId, question);
        }
      },
      onError: (error) => {
        updateAiMessageAt(aiIndex, (msg) => ({
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

  const handleSend = async (input) => {
    const question = input.trim();
    if (!question || isLoading || !conversationId) return;

    enableAutoScroll();

    const userMsg = { role: "user", text: question };
    const aiPlaceholder = { role: "ai", text: "", isThinking: true };

    let aiIndex = 0;
    setMessages((prev) => {
      aiIndex = prev.length + 1;
      return [...prev, userMsg, aiPlaceholder];
    });
    setInputText("");
    setIsEditing(false);
    setIsLoading(true);

    await runStream(question, aiIndex);
  };

  const updateMessageFeedback = (messageIndex, feedbackEntry, remove = false) => {
    setMessages((prev) => {
      const next = [...prev];
      const msg = next[messageIndex];
      if (!msg) return prev;

      let feedback = [...(msg.feedback ?? [])];

      if (remove) {
        feedback = feedback.filter(
          (entry) => entry.versionIndex !== feedbackEntry.versionIndex
        );
      } else {
        const existingIndex = feedback.findIndex(
          (entry) => entry.versionIndex === feedbackEntry.versionIndex
        );
        if (existingIndex >= 0) {
          feedback[existingIndex] = feedbackEntry;
        } else {
          feedback.push(feedbackEntry);
        }
      }

      const activeVersionIndex = msg.activeVersionIndex ?? 0;
      const activeFeedback =
        feedback.find((entry) => entry.versionIndex === activeVersionIndex) ?? null;

      next[messageIndex] = {
        ...msg,
        feedback,
        activeFeedback,
      };
      return next;
    });
  };

  const handleFeedbackChange = async (aiIndex, payload) => {
    const msg = messages[aiIndex];
    if (!msg?.id || !conversationId) return;

    if (payload.clear) {
      await clearFeedback(msg.id, payload.versionIndex);
      updateMessageFeedback(aiIndex, { versionIndex: payload.versionIndex }, true);
      return;
    }

    const result = await submitFeedback({
      messageId: msg.id,
      conversationId,
      versionIndex: payload.versionIndex,
      rating: payload.rating,
      reason: payload.reason,
    });

    updateMessageFeedback(aiIndex, result.feedback);
  };

  const handleVersionChange = async (aiIndex, nextIndex) => {
    if (isLoading) return;

    const aiMessage = messages[aiIndex];
    if (!aiMessage?.id) return;

    const { versions } = normalizeVersions(aiMessage);
    if (nextIndex < 0 || nextIndex >= versions.length) return;

    try {
      const data = await setMessageVersion(aiMessage.id, nextIndex);
      updateAiMessageAt(aiIndex, (msg) => {
        const activeFeedback =
          (msg.feedback ?? []).find(
            (entry) => entry.versionIndex === data.activeVersionIndex
          ) ?? null;

        return {
          ...msg,
          text: data.content,
          citations: data.citations ?? [],
          versions: data.versions ?? msg.versions,
          activeVersionIndex: data.activeVersionIndex,
          activeFeedback,
        };
      });
    } catch {
      // Keep current version on failure
    }
  };

  const handleRegenerate = async (aiIndex) => {
    if (isLoading || !conversationId) return;

    const question = getPrecedingUserQuestion(messages, aiIndex);
    const aiMessage = messages[aiIndex];
    if (!question || !aiMessage?.id) return;

    enableAutoScroll();
    setIsLoading(true);

    setMessages((prev) => {
      const next = [...prev];
      next[aiIndex] = {
        ...next[aiIndex],
        text: "",
        citations: [],
        isThinking: true,
        isStreaming: false,
        isError: false,
      };
      return next;
    });

    await runStream(question, aiIndex, {
      regenerate: true,
      replaceMessageId: aiMessage.id,
    });
  };

  const handleEditMessage = (text) => {
    if (isLoading) return;
    setInputText(text);
    setIsEditing(true);
    inputRef.current?.focus();
  };

  const handleExportPdf = async () => {
    if (!canExport || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    try {
      await exportConversationPdf({
        title: conversationTitle || "Chat Conversation",
        messages,
      });
    } catch (error) {
      setExportError(error.message || "Failed to export conversation.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select or start a conversation
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-200 shrink-0">
        <h2 className="text-sm sm:text-base font-semibold text-gray-800 truncate min-w-0">
          {conversationTitle || "Chat"}
        </h2>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={!canExport || isExporting}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Export conversation as PDF"
        >
          <ExportIcon />
          <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export PDF"}</span>
          <span className="sm:hidden">{isExporting ? "..." : "PDF"}</span>
        </button>
      </div>

      {exportError && (
        <p className="text-xs text-red-600 mb-2 shrink-0" role="alert">
          {exportError}
        </p>
      )}

      <div
        ref={containerRef}
        data-tour="chat-area"
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth min-h-0"
      >
        {isLoadingHistory ? (
          <p className="text-sm text-gray-500 text-center py-8">Loading messages...</p>
        ) : (
          messages.map((m, i) => (
            <Message
              key={m.id ?? i}
              role={m.role}
              messageId={m.id}
              text={m.text}
              citations={m.citations}
              versions={m.versions}
              activeVersionIndex={m.activeVersionIndex}
              feedbackList={m.feedback}
              isThinking={m.isThinking}
              isStreaming={m.isStreaming}
              isError={m.isError}
              isLoading={isLoading}
              canRegenerate={
                m.role === "ai" &&
                Boolean(m.id) &&
                Boolean(getPrecedingUserQuestion(messages, i))
              }
              onEdit={m.role === "user" ? handleEditMessage : undefined}
              onRegenerate={
                m.role === "ai" ? () => handleRegenerate(i) : undefined
              }
              onVersionChange={
                m.role === "ai"
                  ? (nextIndex) => handleVersionChange(i, nextIndex)
                  : undefined
              }
              onFeedbackChange={
                m.role === "ai"
                  ? (payload) => handleFeedbackChange(i, payload)
                  : undefined
              }
            />
          ))
        )}
      </div>

      <InputBox
        ref={inputRef}
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
        disabled={isLoading || isLoadingHistory}
        isEditing={isEditing}
      />
    </div>
  );
}
