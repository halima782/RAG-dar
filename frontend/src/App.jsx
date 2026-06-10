import { useCallback, useEffect, useState } from "react";
import {
  createConversation,
  deleteConversation,
  fetchConversations,
} from "./api/conversations";
import ChatBox from "./ChatBox";
import ConversationSidebar from "./components/ConversationSidebar";
import Header from "./Header";

function truncateTitle(text, max = 50) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}...`;
}

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const loadConversations = useCallback(async () => {
    const data = await fetchConversations();
    setConversations(data);
    return data;
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoadingList(true);

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
      } finally {
        setIsLoadingList(false);
      }
    }

    init();
  }, [loadConversations]);

  const handleNewChat = async () => {
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
  };

  const handleDelete = async (id) => {
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
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          isLoading={isLoadingList}
          onSelect={handleSelect}
          onNew={handleNewChat}
          onDelete={handleDelete}
        />
        <ChatBox
          key={activeId}
          conversationId={activeId}
          onTitleUpdate={handleTitleUpdate}
        />
      </div>
    </div>
  );
}
