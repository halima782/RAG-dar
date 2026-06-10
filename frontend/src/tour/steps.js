export const TOUR_STEPS = [
  {
    target: null,
    title: "Welcome!",
    content:
      "This quick tour will walk you through the main features of your local AI chatbot. It only takes a minute.",
  },
  {
    target: '[data-tour="sidebar"]',
    title: "Chat history",
    content:
      "All your past conversations live here. Click any thread to open it and pick up where you left off.",
    placement: "right",
  },
  {
    target: '[data-tour="new-chat"]',
    title: "Start a new chat",
    content: "Use this button to begin a fresh conversation anytime.",
    placement: "right",
  },
  {
    target: '[data-tour="chat-area"]',
    title: "Chat window",
    content:
      "Messages appear here. AI replies stream in real time and support markdown — bold text, lists, and code blocks.",
    placement: "left",
  },
  {
    target: '[data-tour="chat-input"]',
    title: "Ask anything",
    content:
      "Type your question and press Enter or click Send. The AI searches your documents and streams an answer back.",
    placement: "top",
  },
  {
    target: '[data-tour="tour-button"]',
    title: "You're all set!",
    content:
      "You can replay this tour anytime from the header. Happy chatting!",
    placement: "bottom",
  },
];

export const TOUR_STORAGE_KEY = "rag-chatbot-tour-completed";
