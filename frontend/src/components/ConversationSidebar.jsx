function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationSidebar({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onNew,
  onDelete,
}) {
  return (
    <aside className="w-72 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNew}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <p className="text-sm text-gray-500 text-center py-4">Loading chats...</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No conversations yet</p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeId;

              return (
                <li key={conv.id} className="group relative">
                  <button
                    onClick={() => onSelect(conv.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-100 text-blue-900"
                        : "hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm font-medium truncate pr-6">{conv.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(conv.createdAt)}
                    </p>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-lg leading-none px-1"
                    aria-label="Delete conversation"
                    title="Delete"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
