import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
  text: "Hello! I am your local AI assistant. Start with a suggested question or type your own.",
  isWelcome: true,
};

function ensureWelcomeMessage(messages) {
  const withoutWelcome = messages.filter((message) => !message.isWelcome);
  return [WELCOME_MESSAGE, ...withoutWelcome];
}

export default function ChatBox({
  conversationId,
  conversationTitle,
  consumeInitialQuestion,
  onTitleUpdate,
  onReady,
}) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(() => Boolean(conversationId));
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);
  const streamTargetRef = useRef(null);
  const sendInFlightRef = useRef(false);
  const autoSendAttemptedRef = useRef(false);

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

        setMessages((prev) => {
          if (prev.some((message) => message.isStreaming || message.isThinking)) {
            return ensureWelcomeMessage(prev.filter((message) => !message.isWelcome));
          }

          if (data.length === 0) {
            const hasLocalMessages = prev.some(
              (message) =>
                message.role === "user" ||
                message.id ||
                message.isStreaming ||
                message.isThinking
            );
            return hasLocalMessages
              ? ensureWelcomeMessage(prev.filter((message) => !message.isWelcome))
              : [WELCOME_MESSAGE];
          }

          return ensureWelcomeMessage(data.map(mapApiMessage));
        });
      } catch {
        if (!cancelled) {
          setMessages(
            ensureWelcomeMessage([
              {
                role: "ai",
                text: "Could not load conversation history. You can still send a new message.",
                isError: true,
              },
            ])
          );
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

  useEffect(() => {
    autoSendAttemptedRef.current = false;
    streamTargetRef.current = null;
    sendInFlightRef.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || isLoadingHistory) return;
    onReady?.();
  }, [conversationId, isLoadingHistory, onReady]);

  const updateStreamTarget = useCallback((updater) => {
    const targetId = streamTargetRef.current;
    if (!targetId) return;

    setMessages((prev) =>
      prev.map((message) => {
        if (message.isWelcome) return message;
        const isTarget =
          message.clientId === targetId ||
          (message.id && message.id === targetId);
        if (!isTarget || message.role !== "ai") return message;
        return updater(message);
      })
    );
  }, []);

  const updateAiMessageAt = (aiIndex, updater) => {
    setMessages((prev) => {
      const next = [...prev];
      const message = next[aiIndex];
      if (
        message &&
        message.role === "ai" &&
        !message.isWelcome
      ) {
        next[aiIndex] = updater(message);
      }
      return next;
    });
  };

  const getPrecedingUserQuestion = (messageList, aiIndex) => {
    for (let i = aiIndex - 1; i >= 0; i -= 1) {
      if (messageList[i].role === "user") return messageList[i].text;
    }
    return null;
  };

  const runStream = async (question, { regenerate = false, replaceMessageId = null } = {}) => {
    await streamChat(conversationId, question, {
      regenerate,
      replaceMessageId,
      onThinking: () => {
        updateStreamTarget((msg) => ({ ...msg, isThinking: true }));
      },
      onToken: (token) => {
        updateStreamTarget((msg) => ({
          ...msg,
          text: msg.text + token,
          isThinking: false,
          isStreaming: true,
          isError: false,
        }));
      },
      onCitations: (citations) => {
        updateStreamTarget((msg) => ({
          ...msg,
          citations,
        }));
      },
      onDone: (meta) => {
        updateStreamTarget((msg) => ({
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
        streamTargetRef.current = null;
        sendInFlightRef.current = false;
        setIsLoading(false);
        if (!regenerate) {
          onTitleUpdate?.(conversationId, question);
        }
      },
      onError: (error) => {
        updateStreamTarget((msg) => ({
          ...msg,
          text: msg.text || `Sorry, something went wrong: ${error.message}`,
          isThinking: false,
          isStreaming: false,
          isError: true,
        }));
        streamTargetRef.current = null;
        sendInFlightRef.current = false;
        setIsLoading(false);
      },
    });
  };

  const handleSend = async (input) => {
    const question = input.trim();
    if (!question || isLoading || sendInFlightRef.current || !conversationId) return;

    enableAutoScroll();

    const streamId = `stream-${Date.now()}`;
    streamTargetRef.current = streamId;
    sendInFlightRef.current = true;

    const userMsg = { role: "user", text: question };
    const aiPlaceholder = {
      role: "ai",
      text: "",
      isThinking: true,
      clientId: streamId,
    };

    flushSync(() => {
      setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    });

    setInputText("");
    setIsEditing(false);
    setIsLoading(true);

    await runStream(question);
  };

  useEffect(() => {
    if (!conversationId || isLoadingHistory || autoSendAttemptedRef.current) return;

    const question = consumeInitialQuestion?.(conversationId);
    if (!question) return;

    autoSendAttemptedRef.current = true;
    handleSend(question);
  }, [conversationId, isLoadingHistory, consumeInitialQuestion]);

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

    streamTargetRef.current = aiMessage.id ?? aiMessage.clientId ?? null;

    setMessages((prev) => {
      const next = [...prev];
      const message = next[aiIndex];
      if (!message || message.isWelcome) return prev;
      next[aiIndex] = {
        ...message,
        text: "",
        citations: [],
        isThinking: true,
        isStreaming: false,
        isError: false,
      };
      return next;
    });

    sendInFlightRef.current = true;

    await runStream(question, {
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
      <div className="flex-1 flex items-center justify-center text-slate-500 chat-surface">
        Select or start a conversation
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 chat-surface lg:rounded-tl-3xl">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 shrink-0 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-slate-800 truncate tracking-tight">
            {conversationTitle || "Chat"}
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">Ask anything about your documents</p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={!canExport || isExporting}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-200/80 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title="Export conversation as PDF"
        >
          <ExportIcon />
          <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export PDF"}</span>
          <span className="sm:hidden">{isExporting ? "..." : "PDF"}</span>
        </button>
      </div>

      {exportError && (
        <p className="text-xs text-red-600 px-4 py-1 shrink-0" role="alert">
          {exportError}
        </p>
      )}

      <div
        ref={containerRef}
        data-tour="chat-area"
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth min-h-0 px-3 sm:px-6 py-4"
      >
        {isLoadingHistory ? (
          <p className="text-sm text-slate-500 text-center py-12 animate-shimmer">Loading messages...</p>
        ) : (
          messages.map((m, i) => (
            <Message
              key={m.id ?? m.clientId ?? i}
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
              isWelcome={m.isWelcome}
              canRegenerate={
                m.role === "ai" &&
                !m.isWelcome &&
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

      <div className="shrink-0 px-3 sm:px-6 pb-3 sm:pb-4 pt-2 bg-gradient-to-t from-slate-100 to-transparent">
        <InputBox
          ref={inputRef}
          value={inputText}
          onChange={setInputText}
          onSend={handleSend}
          disabled={isLoading || isLoadingHistory}
          isEditing={isEditing}
        />
      </div>
    </div>
  );
}
