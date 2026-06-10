export default function Header({ onStartTour }) {
  return (
    <div className="w-full p-4 bg-black text-white flex items-center justify-between">
      <h1 className="text-xl font-bold">🤖 Local AI Chatbot</h1>

      <button
        data-tour="tour-button"
        onClick={onStartTour}
        className="text-sm font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
        title="Take a guided tour"
      >
        ? Take Tour
      </button>
    </div>
  );
}
