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
  isOpen,
  onSelect,
  onNew,
  onDelete,
  onClose,
}) {
  const handleSelect = (id) => {
    onSelect(id);
    onClose?.();
  };

  return (
    <aside
      data-tour="sidebar"
      className={`
        fixed left-0 bottom-0 z-40 w-[min(18rem,88vw)] max-w-full
        border-r border-gray-200 bg-gray-50 flex flex-col
        transform transition-transform duration-200 ease-out
        lg:static lg:z-auto lg:w-72 lg:shrink-0 lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      style={{ top: "var(--header-offset, 0px)" }}
    >
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white">
        <button
          data-tour="new-chat"
          onClick={onNew}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors shadow-sm text-sm sm:text-base"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            History
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
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
                      onClick={() => handleSelect(conv.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-100 text-blue-900"
                          : "hover:bg-gray-200 text-gray-800"
                      }`}
                    >
                      <p className="text-sm font-medium truncate pr-8">{conv.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(conv.createdAt)}
                      </p>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-gray-400 hover:text-red-500 text-lg leading-none px-2 py-1"
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
      </div>
    </aside>
  );
}
