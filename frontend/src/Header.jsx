import { APP_NAME, APP_TAGLINE } from "./constants/branding";

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function LogoIcon() {
  return (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

export default function Header({
  onStartTour,
  onMenuToggle,
  sidebarOpen,
  activeView,
  onOpenDashboard,
  onOpenChat,
}) {
  return (
    <header className="w-full shrink-0 glass-header safe-area-top">
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden shrink-0 p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={sidebarOpen ? "Close chat history" : "Open chat history"}
            aria-expanded={sidebarOpen}
          >
            <MenuIcon />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <LogoIcon />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-white leading-tight truncate tracking-tight">
              {APP_NAME}
            </h1>
            <p className="hidden sm:block text-xs text-slate-400 truncate">
              {APP_TAGLINE}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeView === "chat" ? (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-200 border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Feedback</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenChat}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-200 border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all"
            >
              <span className="hidden sm:inline">Chat</span>
            </button>
          )}

          <button
            data-tour="tour-button"
            onClick={onStartTour}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-200 border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all"
            title="Take a guided tour"
          >
            <span className="w-5 h-5 rounded-lg bg-indigo-500/80 text-white text-[10px] font-bold flex items-center justify-center">
              ?
            </span>
            <span className="hidden sm:inline">Take Tour</span>
          </button>
        </div>
      </div>
    </header>
  );
}
