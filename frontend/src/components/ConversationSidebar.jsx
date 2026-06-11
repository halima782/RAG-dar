function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
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
        bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col
        transform transition-transform duration-300 ease-out
        lg:static lg:z-auto lg:w-72 lg:shrink-0 lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      style={{ top: "var(--header-offset, 0px)" }}
    >
      <div className="p-3 sm:p-4">
        <button
          data-tour="new-chat"
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-900/40 text-sm"
        >
          <PlusIcon />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <div className="px-4 pt-1 pb-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Conversations
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
          {isLoading ? (
            <p className="text-sm text-slate-500 text-center py-6">Loading chats...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No conversations yet</p>
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((conv) => {
                const isActive = conv.id === activeId;

                return (
                  <li key={conv.id} className="group relative">
                    <button
                      onClick={() => handleSelect(conv.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                        isActive
                          ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <p className="text-sm font-medium truncate pr-8">{conv.title}</p>
                      <p className={`text-xs mt-0.5 ${isActive ? "text-slate-400" : "text-slate-500"}`}>
                        {formatDate(conv.createdAt)}
                      </p>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-slate-500 hover:text-red-400 text-lg leading-none px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
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
