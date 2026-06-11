function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export default function Header({ onStartTour, onMenuToggle, sidebarOpen }) {
  return (
    <header className="w-full shrink-0 bg-white border-b border-gray-200 shadow-sm safe-area-top">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden shrink-0 p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={sidebarOpen ? "Close chat history" : "Open chat history"}
            aria-expanded={sidebarOpen}
          >
            <MenuIcon />
          </button>

          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white text-base sm:text-lg shadow-sm shrink-0">
            🤖
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">
              Local AI Chatbot
            </h1>
            <p className="hidden sm:block text-xs text-gray-500 truncate">
              Ask questions about your documents
            </p>
          </div>
        </div>

        <button
          data-tour="tour-button"
          onClick={onStartTour}
          className="shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full transition-colors"
          title="Take a guided tour"
        >
          <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center">
            ?
          </span>
          <span className="hidden sm:inline">Take Tour</span>
        </button>
      </div>
    </header>
  );
}
