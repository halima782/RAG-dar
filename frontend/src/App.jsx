import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  deleteConversation,
  fetchConversations,
} from "./api/conversations";
import ChatBox from "./ChatBox";
import ChatLanding from "./components/ChatLanding";
import ConfirmDialog from "./components/ConfirmDialog";
import ConversationSidebar from "./components/ConversationSidebar";
import FeedbackDashboard from "./components/FeedbackDashboard";
import GuidedTour from "./components/GuidedTour";
import Header from "./Header";
import { useGuidedTour } from "./hooks/useGuidedTour";

function truncateTitle(text, max = 50) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}...`;
}

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("chat");
  const [chatReady, setChatReady] = useState(false);
  const [landingReady, setLandingReady] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const headerRef = useRef(null);
  const sidebarOpenedForTour = useRef(false);
  const autoSentChatsRef = useRef(new Set());

  const handleTourAutoStart = useCallback(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(true);
      sidebarOpenedForTour.current = true;
    }
  }, []);

  const closeTourSidebar = useCallback(() => {
    if (sidebarOpenedForTour.current) {
      setSidebarOpen(false);
      sidebarOpenedForTour.current = false;
    }
  }, []);

  const tourReady = !isLoadingList && !loadError && (activeId ? chatReady : landingReady);

  const { isOpen, startTour, closeTour, completeTour } = useGuidedTour({
    autoStart: true,
    ready: tourReady,
    onAutoStart: handleTourAutoStart,
  });

  const handleCloseTour = () => {
    closeTour();
    closeTourSidebar();
  };

  const handleCompleteTour = () => {
    completeTour();
    closeTourSidebar();
  };

  const loadConversations = useCallback(async () => {
    const data = await fetchConversations();
    setConversations(data);
    return data;
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoadingList(true);
      setLoadError(null);

      try {
        const data = await loadConversations();
        setConversations(data);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        setLoadError(error.message || "Could not connect to the backend.");
      } finally {
        setIsLoadingList(false);
      }
    }

    init();
  }, [loadConversations]);

  const startChatWithQuestion = async (question) => {
    setSidebarOpen(false);
    setIsStartingChat(true);

    try {
      const created = await createConversation();
      const newConv = {
        id: created.conversation_id,
        title: created.title,
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) => [newConv, ...prev]);
      setInitialQuestion(question);
      setActiveId(newConv.id);
    } catch (error) {
      console.error("Failed to start chat:", error);
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleNewChat = async () => {
    setSidebarOpen(false);
    setInitialQuestion(null);

    try {
      const created = await createConversation();
      const newConv = {
        id: created.conversation_id,
        title: created.title,
        createdAt: new Date().toISOString(),
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newConv.id);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleSelect = (id) => {
    setInitialQuestion(null);
    setActiveId(id);
    setSidebarOpen(false);
  };

  useEffect(() => {
    setChatReady(false);
    setLandingReady(false);
  }, [activeId]);

  useEffect(() => {
    const updateHeaderOffset = () => {
      const height = headerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--header-offset", `${height}px`);
    };

    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);

    return () => window.removeEventListener("resize", updateHeaderOffset);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  const handleDeleteRequest = (id) => {
    const conversation = conversations.find((c) => c.id === id);
    setDeleteTarget({
      id,
      title: conversation?.title ?? "this chat",
    });
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    const { id } = deleteTarget;
    setDeleteTarget(null);

    try {
      await deleteConversation(id);

      const remaining = conversations.filter((c) => c.id !== id);

      if (remaining.length === 0) {
        setConversations([]);
        setActiveId(null);
        setInitialQuestion(null);
        return;
      }

      setConversations(remaining);
      if (activeId === id) {
        setInitialQuestion(null);
        setActiveId(remaining[0].id);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const consumeInitialQuestion = useCallback(
    (conversationId) => {
      if (!initialQuestion || !conversationId) return null;
      if (autoSentChatsRef.current.has(conversationId)) return null;

      autoSentChatsRef.current.add(conversationId);
      const question = initialQuestion;
      setInitialQuestion(null);
      return question;
    },
    [initialQuestion]
  );

  const handleTitleUpdate = (conversationId, firstMessage) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== conversationId || conv.title !== "New Chat") {
          return conv;
        }

        return { ...conv, title: truncateTitle(firstMessage) };
      })
    );
  };

  return (
    <div className="app-shell h-screen flex flex-col min-h-0">
      <div ref={headerRef}>
        <Header
          onStartTour={startTour}
          sidebarOpen={sidebarOpen}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
          activeView={activeView}
          onOpenDashboard={() => {
            setSidebarOpen(false);
            setActiveView("dashboard");
          }}
          onOpenChat={() => setActiveView("chat")}
        />
      </div>
      <GuidedTour isOpen={isOpen} onClose={handleCloseTour} onComplete={handleCompleteTour} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This conversation and all its messages will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {activeView === "chat" && sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            style={{ top: "var(--header-offset, 0px)" }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close chat history"
          />
        )}

        {activeView === "chat" && (
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            isLoading={isLoadingList}
            isOpen={sidebarOpen}
            onSelect={handleSelect}
            onNew={handleNewChat}
            onDelete={handleDeleteRequest}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        {activeView === "dashboard" ? (
          <FeedbackDashboard onBackToChat={() => setActiveView("chat")} />
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center min-w-0 chat-surface">
            <div className="glass-panel rounded-2xl border border-white/60 shadow-xl p-8 max-w-md">
              <p className="text-red-600 font-semibold mb-2">Cannot connect to backend</p>
              <p className="text-slate-600 text-sm mb-4">{loadError}</p>
              <p className="text-slate-500 text-sm">
                Start the backend:{" "}
                <code className="block sm:inline mt-2 sm:mt-0 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs sm:text-sm break-all font-mono">
                  uvicorn api:app --reload --port 8000
                </code>
              </p>
            </div>
          </div>
        ) : activeId ? (
          <ChatBox
            key={activeId}
            conversationId={activeId}
            conversationTitle={
              conversations.find((conversation) => conversation.id === activeId)?.title
            }
            consumeInitialQuestion={consumeInitialQuestion}
            onTitleUpdate={handleTitleUpdate}
            onReady={() => setChatReady(true)}
          />
        ) : (
          <ChatLanding
            onSuggestedQuestion={startChatWithQuestion}
            onReady={() => setLandingReady(true)}
            isStarting={isStartingChat}
          />
        )}
      </div>
    </div>
  );
}
