import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  deleteConversation,
  fetchConversations,
} from "./api/conversations";
import ChatBox from "./ChatBox";
import ConfirmDialog from "./components/ConfirmDialog";
import ConversationSidebar from "./components/ConversationSidebar";
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
  const headerRef = useRef(null);
  const { isOpen, startTour, closeTour, completeTour } = useGuidedTour({
    ready: !isLoadingList,
  });

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
        let data = await loadConversations();

        if (data.length === 0) {
          const created = await createConversation();
          data = [
            {
              id: created.conversation_id,
              title: created.title,
              createdAt: new Date().toISOString(),
            },
          ];
          setConversations(data);
        }

        setActiveId(data[0].id);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        setLoadError(error.message || "Could not connect to the backend.");
      } finally {
        setIsLoadingList(false);
      }
    }

    init();
  }, [loadConversations]);

  const handleNewChat = async () => {
    setSidebarOpen(false);
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
    setActiveId(id);
    setSidebarOpen(false);
  };

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
        const created = await createConversation();
        const newConv = {
          id: created.conversation_id,
          title: created.title,
          createdAt: new Date().toISOString(),
        };
        setConversations([newConv]);
        setActiveId(newConv.id);
        return;
      }

      setConversations(remaining);
      if (activeId === id) {
        setActiveId(remaining[0].id);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

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
        />
      </div>
      <GuidedTour isOpen={isOpen} onClose={closeTour} onComplete={completeTour} />
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
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            style={{ top: "var(--header-offset, 0px)" }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close chat history"
          />
        )}

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
        {loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center min-w-0">
            <p className="text-red-600 font-medium mb-2">Cannot connect to backend</p>
            <p className="text-gray-600 text-sm max-w-md mb-4">{loadError}</p>
            <p className="text-gray-500 text-sm">
              Start the backend:{" "}
              <code className="block sm:inline mt-2 sm:mt-0 bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm break-all">
                uvicorn api:app --reload --port 8000
              </code>
            </p>
          </div>
        ) : (
          <ChatBox
            key={activeId}
            conversationId={activeId}
            conversationTitle={
              conversations.find((conversation) => conversation.id === activeId)?.title
            }
            onTitleUpdate={handleTitleUpdate}
          />
        )}
      </div>
    </div>
  );
}
